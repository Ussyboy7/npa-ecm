"""TDD: Workflow step constraint — fail on mismatch, don't silently bypass."""

import pytest
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from correspondence.models import Correspondence
from workflow.models import WorkflowTemplate, WorkflowStep


class WorkflowRequirementValidationTests(TestCase):
    def _make_template(self, slug, step_levels):
        """
        step_levels: list of required_approval_level strings e.g. ["departmental", "executive"]
        """
        tpl = WorkflowTemplate.objects.create(
            name=f"Template {slug}",
            slug=slug,
            applies_to=WorkflowTemplate.AppliesTo.CORRESPONDENCE,
            is_active=True,
        )
        for idx, level in enumerate(step_levels, start=1):
            WorkflowStep.objects.create(
                template=tpl,
                order=idx,
                title=f"Step {idx} {level or 'blank'}",
                required_approval_level=level,
            )
        return tpl

    def _make_corr(self, level):
        import uuid

        return Correspondence.objects.create(
            reference_number=f"TEST-{uuid.uuid4().hex[:8].upper()}",
            subject=f"Test {level}",
            required_approval_level=level,
        )

    def test_mismatch_fails_corr_executive_workflow_only_departmental(self):
        from correspondence.services import validate_workflow_vs_requirement

        corr = self._make_corr(Correspondence.RequiredApprovalLevel.EXECUTIVE)
        tpl = self._make_template("dept-only", ["departmental", "departmental"])

        with self.assertRaises(ValidationError) as cm:
            validate_workflow_vs_requirement(corr, tpl)
        self.assertIn("Workflow configuration cannot satisfy this correspondence's required approval level.", str(cm.exception))

    def test_executive_workflow_passes(self):
        from correspondence.services import validate_workflow_vs_requirement

        corr = self._make_corr(Correspondence.RequiredApprovalLevel.EXECUTIVE)
        tpl = self._make_template("exec-full", ["departmental", "executive"])

        # should not raise
        try:
            validate_workflow_vs_requirement(corr, tpl)
        except ValidationError as e:
            self.fail(f"Executive workflow should pass but raised {e}")

    def test_departmental_workflow_passes_for_departmental_corr(self):
        from correspondence.services import validate_workflow_vs_requirement

        corr = self._make_corr(Correspondence.RequiredApprovalLevel.DEPARTMENTAL)
        tpl = self._make_template("dept-ok", ["departmental"])

        try:
            validate_workflow_vs_requirement(corr, tpl)
        except ValidationError as e:
            self.fail(f"Departmental workflow should pass for departmental corr but raised {e}")

        # Also NONE should pass with any workflow
        corr_none = self._make_corr(Correspondence.RequiredApprovalLevel.NONE)
        try:
            validate_workflow_vs_requirement(corr_none, tpl)
        except ValidationError as e:
            self.fail(f"NONE should pass but raised {e}")

    def test_direct_md_path_when_flag_false(self):
        from correspondence.services import validate_workflow_vs_requirement

        corr = self._make_corr(Correspondence.RequiredApprovalLevel.EXECUTIVE)

        # Direct MD path: workflow has only executive step, no departmental.
        # Simulate requires_departmental_endorsement=False via inference (no departmental step)
        # OR explicit flag if WorkflowTemplate has the field.
        tpl_direct = self._make_template("direct-md", ["executive"])
        # If model has requires_departmental_endorsement field, set it to False
        if hasattr(tpl_direct, "requires_departmental_endorsement"):
            tpl_direct.requires_departmental_endorsement = False
            tpl_direct.save(update_fields=["requires_departmental_endorsement"])

        try:
            validate_workflow_vs_requirement(corr, tpl_direct)
        except ValidationError as e:
            self.fail(f"Direct MD path should pass when flag false/inferred but raised {e}")

    def test_executive_fails_when_no_executive_step_even_with_divisional(self):
        from correspondence.services import validate_workflow_vs_requirement

        corr = self._make_corr(Correspondence.RequiredApprovalLevel.EXECUTIVE)
        tpl = self._make_template("divisional-only", ["departmental", "divisional"])

        with self.assertRaises(ValidationError):
            validate_workflow_vs_requirement(corr, tpl)

    def test_minutes_view_calls_validation(self):
        """Integration: creating a minute on executive corr with departmental-only template should fail via API."""
        from django.urls import reverse
        from rest_framework.test import APIClient
        from accounts.models import User
        from organization.models import Directorate, Division, Department, Office, OfficeMembership, Role

        client = APIClient()
        directorate = Directorate.objects.create(name="OpsDirValid", code="OPS_VALID")
        div = Division.objects.create(name="FinanceValid", code="FIN_VALID", directorate=directorate)
        dept = Department.objects.create(name="Finance Dept Valid", code="FIN-DEPT-V", division=div)
        office = Office.objects.create(name="Finance Office Valid", code="FIN-O-VALID", division=div, department=dept, directorate=directorate)
        office_md = Office.objects.create(name="MD Office Valid", code="MD-O-VALID", office_type="md")
        role, _ = Role.objects.get_or_create(name="GMValid", defaults={"permissions": {"can_approve": True, "can_minute_correspondence": True, "can_access_approvals": True}})
        role.permissions = {"can_approve": True, "can_minute_correspondence": True, "can_access_approvals": True, "can_view_all_correspondence": True}
        role.save()
        gm = User.objects.create_user(username="gm_valid_test", password="x", grade_level="GMCS", system_role=role, directorate=directorate, division=div, department=dept)
        OfficeMembership.objects.create(user=gm, office=office, assignment_role="principal", is_primary=True, is_active=True, can_approve=True)

        # Create executive correspondence
        corr = Correspondence.objects.create(
            reference_number="NPA/VALID/001",
            subject="Executive valid test",
            created_by=gm,
            owning_office=office,
            current_office=office,
            current_approver=gm,
            status=Correspondence.Status.IN_PROGRESS,
            required_approval_level=Correspondence.RequiredApprovalLevel.EXECUTIVE,
        )

        # Ensure global workflow only has departmental steps (so validation fails via global check OR via specific template)
        # Clean existing templates that might have executive steps from seed
        WorkflowTemplate.objects.all().delete()
        WorkflowStep.objects.all().delete()
        self._make_template("only-dept-global", ["departmental"])

        # Mock: we need to ensure minutes_views calls validate_workflow_vs_requirement
        # It will be called with template=None (global check) or with resolved template
        # Either way should fail for executive corr now that no executive step exists
        url = reverse("api_v1:minute-list")
        client.force_authenticate(user=gm)
        payload = {
            "correspondence": str(corr.id),
            "user_id": str(gm.id),
            "action_type": "approve",
            "minute_text": "Attempt approve executive with dept-only workflow",
            "to_office_id": str(office_md.id),
        }
        resp = client.post(url, payload, format="json")
        # Should be 400 due to workflow mismatch
        self.assertIn(resp.status_code, (400, 403), resp.content)
        # If 400, check message contains our validation text
        if resp.status_code == 400:
            self.assertIn("Workflow configuration cannot satisfy", str(resp.content))

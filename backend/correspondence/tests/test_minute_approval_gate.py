"""TDD: Unified approval gate – departmental vs executive with endorsement."""
import uuid
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from accounts.models import User
from correspondence.models import Correspondence, CorrespondenceDistribution
from organization.models import Directorate, Division, Department, Office, OfficeMembership, Role


class MinuteApprovalGateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Org hierarchy
        self.directorate = Directorate.objects.create(name="OpsDirGate", code="OPS_GATE")
        self.div_finance = Division.objects.create(name="FinanceGate", code="FIN_GATE", directorate=self.directorate)
        self.div_legal = Division.objects.create(name="LegalGate", code="LEG_GATE", directorate=self.directorate)
        self.dept_finance = Department.objects.create(name="Finance Dept Gate", code="FIN-DEPT-G", division=self.div_finance)
        self.dept_legal = Department.objects.create(name="Legal Dept Gate", code="LEG-DEPT-G", division=self.div_legal)

        self.office_fin = Office.objects.create(name="Finance Office Gate", code="FIN-O-GATE", division=self.div_finance, department=self.dept_finance, directorate=self.directorate)
        self.office_legal = Office.objects.create(name="Legal Office Gate", code="LEG-O-GATE", division=self.div_legal, department=self.dept_legal, directorate=self.directorate)
        self.office_md = Office.objects.create(name="MD Office Gate", code="MD-O-GATE", office_type="md")

        # Roles
        md_role, _ = Role.objects.get_or_create(name="Managing DirectorGate", defaults={"permissions": {"can_approve": True, "can_access_approvals": True, "can_minute_correspondence": True, "can_view_all_correspondence": True}})
        md_role.permissions = {"can_approve": True, "can_access_approvals": True, "can_minute_correspondence": True, "can_view_all_correspondence": True}
        md_role.save(update_fields=["permissions"])
        gm_role, _ = Role.objects.get_or_create(name="General ManagerGate", defaults={"permissions": {"can_approve": True, "can_access_approvals": True, "can_minute_correspondence": True}})
        gm_role.permissions = {"can_approve": True, "can_access_approvals": True, "can_minute_correspondence": True}
        gm_role.save(update_fields=["permissions"])
        clerk_role, _ = Role.objects.get_or_create(name="ClerkGateTest", defaults={"permissions": {"can_approve": False, "can_minute_correspondence": True}})
        clerk_role.permissions = {"can_approve": False, "can_minute_correspondence": True}
        clerk_role.save(update_fields=["permissions"])
        self.md_role = md_role
        self.gm_role = gm_role
        self.clerk_role = clerk_role

        # Users
        self.md = User.objects.create_user(username="md_gate_test", password="x", grade_level="MDCS", system_role=md_role, directorate=self.directorate, division=self.div_finance, department=self.dept_finance)
        OfficeMembership.objects.create(user=self.md, office=self.office_md, assignment_role="principal", is_primary=True, is_active=True, can_approve=True)
        OfficeMembership.objects.create(user=self.md, office=self.office_fin, assignment_role="principal", is_primary=False, is_active=True)

        self.gm_fin = User.objects.create_user(username="gm_fin_gate", password="x", grade_level="GMCS", system_role=gm_role, directorate=self.directorate, division=self.div_finance, department=self.dept_finance)
        OfficeMembership.objects.create(user=self.gm_fin, office=self.office_fin, assignment_role="principal", is_primary=True, is_active=True, can_approve=True)

        self.gm_legal = User.objects.create_user(username="gm_legal_gate", password="x", grade_level="GMCS", system_role=gm_role, directorate=self.directorate, division=self.div_legal, department=self.dept_legal)
        OfficeMembership.objects.create(user=self.gm_legal, office=self.office_legal, assignment_role="principal", is_primary=True, is_active=True, can_approve=True)

        self.clerk = User.objects.create_user(username="clerk_gate_test", password="x", grade_level="SSS1", system_role=clerk_role, division=self.div_finance, department=self.dept_finance, directorate=self.directorate)
        OfficeMembership.objects.create(user=self.clerk, office=self.office_fin, assignment_role="staff", is_primary=True, is_active=True)

    def _make_corr(self, required_level="departmental", division=None, department=None, current_approver=None, owning_office=None):
        owning_office = owning_office or self.office_fin
        return Correspondence.objects.create(
            reference_number=f"NPA/GATE/{uuid.uuid4().hex[:8].upper()}",
            subject="Gate test",
            sender_name="Test",
            created_by=self.gm_fin,
            owning_office=owning_office,
            current_office=owning_office,
            current_approver=current_approver,
            status=Correspondence.Status.IN_PROGRESS,
            priority=Correspondence.Priority.MEDIUM,
            division=division,
            department=department,
            required_approval_level=required_level,
            amount=60000000 if required_level == "executive" else 1000000,
            strategic_flag=(required_level == "executive"),
        )

    def _post_minute(self, user, correspondence, minute_text="Approved note", action_type="approve", extra=None):
        self.client.force_authenticate(user=user)
        url = reverse("api_v1:minute-list")
        # Choose a target office different from current_office to avoid self-loop validation
        current_id = str(correspondence.current_office_id) if correspondence.current_office_id else None
        if current_id == str(self.office_fin.id):
            target_office = self.office_legal
        elif current_id == str(self.office_legal.id):
            target_office = self.office_fin
        else:
            target_office = self.office_fin
        payload = {
            "correspondence": str(correspondence.id),
            "user_id": str(user.id),
            "action_type": action_type,
            "minute_text": minute_text,
            "to_office_id": str(target_office.id),
        }
        if extra:
            payload.update(extra)
        return self.client.post(url, payload, format="json")

    def test_md_can_executive_approve(self):
        corr = self._make_corr(required_level="executive", division=self.div_finance, department=self.dept_finance, current_approver=self.md, owning_office=self.office_md)
        resp = self._post_minute(self.md, corr, minute_text="MD final approval")
        self.assertEqual(resp.status_code, 201, resp.content)
        data = resp.json()
        self.assertEqual(data.get("approval_level"), "executive")
        self.assertEqual(data.get("approval_role"), "approval")

    def test_gm_can_departmental_approve(self):
        corr = self._make_corr(required_level="departmental", division=self.div_finance, department=self.dept_finance, current_approver=self.gm_fin)
        resp = self._post_minute(self.gm_fin, corr, minute_text="GM departmental approval")
        self.assertEqual(resp.status_code, 201, resp.content)
        data = resp.json()
        self.assertEqual(data.get("approval_level"), "departmental")
        self.assertEqual(data.get("approval_role"), "approval")

    def test_gm_cannot_executive_approve_403(self):
        corr = self._make_corr(required_level="executive", division=self.div_finance, department=self.dept_finance, current_approver=self.gm_fin)
        resp = self._post_minute(self.gm_fin, corr, minute_text="GM tries executive", extra={"approval_level": "executive", "approval_role": "approval"})
        self.assertEqual(resp.status_code, 403, resp.content)
        low = str(resp.content).lower()
        self.assertTrue("md" in low or "managing director" in low or "only md" in low or "executive" in low)

    def test_gm_can_endorse_executive_track(self):
        corr = self._make_corr(required_level="executive", division=self.div_finance, department=self.dept_finance, current_approver=self.gm_fin)
        resp = self._post_minute(self.gm_fin, corr, minute_text="Reviewed and endorsed")
        self.assertEqual(resp.status_code, 201, resp.content)
        data = resp.json()
        self.assertEqual(data.get("approval_level"), "departmental")
        self.assertEqual(data.get("approval_role"), "endorsement")

    def test_cc_bypass_explicit(self):
        # give clerk can_approve
        self.clerk_role.permissions["can_approve"] = True
        self.clerk_role.save(update_fields=["permissions"])
        corr = self._make_corr(required_level="departmental", division=self.div_finance, department=self.dept_finance, current_approver=self.gm_fin)
        CorrespondenceDistribution.objects.create(correspondence=corr, recipient_type="user", user=self.clerk, purpose="information")
        resp = self._post_minute(self.clerk, corr, minute_text="Clerk CC approval")
        self.assertEqual(resp.status_code, 201, resp.content)
        data = resp.json()
        self.assertEqual(data.get("approval_level"), "departmental")

    def test_scope_check_finance_gm_cannot_approve_legal(self):
        corr = self._make_corr(required_level="departmental", division=self.div_legal, department=self.dept_legal, current_approver=self.gm_fin, owning_office=self.office_legal)
        resp = self._post_minute(self.gm_fin, corr, minute_text="Finance GM tries legal")
        self.assertEqual(resp.status_code, 403, resp.content)
        low = str(resp.content).lower()
        self.assertTrue("scope" in low or "org" in low)

    def test_no_executive_endorsement_for_gm(self):
        corr = self._make_corr(required_level="executive", division=self.div_finance, department=self.dept_finance, current_approver=self.gm_fin)
        resp = self._post_minute(self.gm_fin, corr, minute_text="Try exec endorsement", extra={"approval_level": "executive", "approval_role": "endorsement"})
        self.assertIn(resp.status_code, (400, 403), resp.content)

    def test_minute_text_required_for_approve(self):
        corr = self._make_corr(required_level="departmental", division=self.div_finance, department=self.dept_finance, current_approver=self.gm_fin)
        resp = self._post_minute(self.gm_fin, corr, minute_text="   ")
        self.assertEqual(resp.status_code, 400, resp.content)
        low = str(resp.content).lower()
        self.assertIn("minute_text", low)

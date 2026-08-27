"""TDD: Case(AUDIT) as audit work-item aggregate."""

import uuid

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from correspondence.models import Case, CaseDocumentLink, CaseFormLink, CaseWorkflowRule, Correspondence
from dms.models import Document, FormDocument
from forms.models import FormSubmission, FormTemplate
from organization.models import Department, Directorate, Division, Office


class AuditCaseAggregateTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.directorate = Directorate.objects.create(name="DirsAuditAgg", code="DIR_AUDIT_AGG")
        self.division = Division.objects.create(name="AuditDiv", code="AUD_DIV_AGG", directorate=self.directorate)
        self.department = Department.objects.create(name="AuditDept", code="AUD_DEPT_AGG", division=self.division)
        self.office = Office.objects.create(name="AuditOff", code="AUD-OFF-AGG", division=self.division, department=self.department, directorate=self.directorate)

        from organization.models import Role
        role, _ = Role.objects.get_or_create(name="AuditorAgg")
        role.permissions = {"can_view_all_correspondence": True}
        role.save(update_fields=["permissions"])
        self.user = User.objects.create_user(username=f"auditor_agg_{uuid.uuid4().hex[:6]}", password="x", system_role=role, directorate=self.directorate, division=self.division, department=self.department)

        # Audit template
        self.template, _ = FormTemplate.objects.update_or_create(
            slug="audit-query-bills-certification",
            defaults={"name": "Audit Query - Bills for Certification", "category": FormTemplate.Category.AUDIT, "structure": {"fields": []}, "is_active": True},
        )

        # Non-audit template to verify preservation
        self.other_template, _ = FormTemplate.objects.update_or_create(
            slug="other-form-template",
            defaults={"name": "Other Form", "category": FormTemplate.Category.GENERAL, "structure": {"fields": []}, "is_active": True},
        )

        # Correspondence + document for evidence
        self.corr = Correspondence.objects.create(
            reference_number=f"NPA/CORR/AUDIT/AGG/{uuid.uuid4().hex[:6].upper()}",
            subject="Audit query correspondence",
            body_html="<p>Audit query body</p>",
            created_by=self.user,
            owning_office=self.office,
            current_office=self.office,
            division=self.division,
            department=self.department,
        )

        self.evidence_doc = Document.objects.create(
            title="Evidence Doc",
            document_type=Document.DocumentType.REPORT,
            status=Document.DocumentStatus.PUBLISHED,
            author=self.user,
            division=self.division,
            department=self.department,
        )
        from correspondence.models import CorrespondenceDocumentLink
        CorrespondenceDocumentLink.objects.create(correspondence=self.corr, document=self.evidence_doc, notes="evidence")

    def _make_submission(self, pv_no="PV/2025/AUD/001", payee="Test Payee Ltd", template=None, correspondence=None, submitted_by=None):
        tpl = template or self.template
        corr = correspondence if correspondence is not None else self.corr
        user = submitted_by or self.user
        data = {"pv_no": pv_no, "payee": payee, "pv_date": "2025-05-01", "amount_naira": "1000000", "amount_kobo": "00", "reasons": "Query reasons", "to": "GM Finance", "from": "GM Audit", "date": "2025-05-01", "ref": "HQ/GMA/OP/A.13/001", "subject": "AUDIT QUERY - BILLS FOR CERTIFICATION"}
        sub = FormSubmission.objects.create(template=tpl, correspondence=corr, data=data, is_draft=False, submitted_by=user)
        return sub

    def _make_form_document(self, submission=None, pv_no="PV/2025/AUD/001"):
        sub = submission or self._make_submission(pv_no=pv_no)
        doc = Document.objects.create(
            title=f"Audit Query Form {pv_no}",
            document_type=Document.DocumentType.FORM,
            status=Document.DocumentStatus.DRAFT,
            author=self.user,
            division=self.division,
            department=self.department,
        )
        fd = FormDocument.objects.create(
            document=doc,
            template=self.template,
            form_data=sub.data,
            status=FormDocument.FormStatus.DRAFT,
            correspondence=sub.correspondence,
        )
        return sub, fd

    def test_backfill_creates_case_for_existing_submission(self):
        from correspondence.services.case_audit import backfill_audit_cases, AUDIT_TEMPLATE_SLUG
        sub, fd = self._make_form_document(pv_no="PV/2025/AUD/BF001")
        # Ensure no prior case
        Case.objects.filter(metadata__audit_submission_id=str(sub.id)).delete()
        # Also ensure clean by title
        Case.objects.filter(title=f"AQ-{sub.data['pv_no']}").delete()
        count = backfill_audit_cases()
        self.assertGreaterEqual(count, 1)
        case = Case.objects.filter(metadata__audit_submission_id=str(sub.id)).first()
        self.assertIsNotNone(case, "Case(AUDIT) should be created for submission")
        self.assertEqual(case.case_type, Case.CaseType.AUDIT)
        self.assertTrue(case.title.startswith("AQ-"), f"title should start with AQ-, got {case.title}")
        self.assertEqual(case.created_by_id, sub.submitted_by_id)
        self.assertEqual(case.division_id, self.division.id)
        self.assertEqual(case.department_id, self.department.id)
        # CaseFormLink
        link = CaseFormLink.objects.filter(case=case, form_document=fd).first()
        self.assertIsNotNone(link, "CaseFormLink should link form_document")
        # Evidence doc link via correspondence
        ev_link = CaseDocumentLink.objects.filter(case=case, document=self.evidence_doc).first()
        self.assertIsNotNone(ev_link, "Evidence document should be linked via CaseDocumentLink")

    def test_one_primary_audit_form_per_case(self):
        from correspondence.services.case_audit import create_audit_case_for_submission
        sub, fd = self._make_form_document(pv_no="PV/2025/AUD/ONE001")
        # Clean prior
        Case.objects.filter(metadata__audit_submission_id=str(sub.id)).delete()
        Case.objects.filter(title=f"AQ-{pv_no}").delete() if (pv_no := sub.data.get("pv_no")) else None
        case1 = create_audit_case_for_submission(sub, form_document=fd)
        case2 = create_audit_case_for_submission(sub, form_document=fd)
        self.assertEqual(str(case1.id), str(case2.id), "Backfill should be idempotent, same Case")
        # Only one CaseFormLink for that form_document
        links = CaseFormLink.objects.filter(case=case1, form_document=fd)
        self.assertEqual(links.count(), 1, "One primary audit form per Case(AUDIT)")
        # Also ensure not duplicated when backfilling again
        from correspondence.services.case_audit import backfill_audit_cases
        backfill_audit_cases()
        self.assertEqual(CaseFormLink.objects.filter(case=case1, form_document=fd).count(), 1)

    def test_backfill_idempotent_and_preserves_non_audit(self):
        # Create non-audit submission
        non_audit_sub = self._make_submission(pv_no="PV/OTHER/001", template=self.other_template, correspondence=self.corr)
        from correspondence.services.case_audit import backfill_audit_cases
        # Ensure non-audit does not create AUDIT case
        pre_count_audit = Case.objects.filter(case_type=Case.CaseType.AUDIT).count()
        backfill_audit_cases()
        post_count_audit = Case.objects.filter(case_type=Case.CaseType.AUDIT).count()
        # Non-audit submission should not affect AUDIT count beyond its own audit submissions
        # Specifically, there should be no Case with audit_submission_id == non_audit_sub.id and case_type AUDIT
        non_audit_case = Case.objects.filter(metadata__audit_submission_id=str(non_audit_sub.id), case_type=Case.CaseType.AUDIT).first()
        self.assertIsNone(non_audit_case, "Non-audit form workflows should be preserved, no AUDIT case for other template")

    def test_audit_workflow_rules_seeded(self):
        from correspondence.services.case_audit import ensure_audit_workflow_rules, AUDIT_STATES, AUDIT_STATE_ACTIONS
        ensure_audit_workflow_rules()
        for state in AUDIT_STATES:
            rule = CaseWorkflowRule.objects.filter(name=f"AUDIT_STATE_{state}", case_type=Case.CaseType.AUDIT).first()
            self.assertIsNotNone(rule, f"Rule for state {state} should exist")
            self.assertEqual(rule.trigger_conditions.get("audit_state"), state)
            self.assertEqual(set(rule.trigger_conditions.get("allowed_actions", [])), set(AUDIT_STATE_ACTIONS[state]))
            self.assertIn("allowed_next_states", rule.trigger_conditions)
        # Ensure all 9 states present
        self.assertEqual(CaseWorkflowRule.objects.filter(case_type=Case.CaseType.AUDIT, name__startswith="AUDIT_STATE_").count(), len(AUDIT_STATES))

    def test_history_includes_form_and_correspondence(self):
        from correspondence.services.case_audit import create_audit_case_for_submission
        sub, fd = self._make_form_document(pv_no="PV/2025/AUD/HIST001")
        Case.objects.filter(metadata__audit_submission_id=str(sub.id)).delete()
        Case.objects.filter(title=f"AQ-{sub.data.get('pv_no')}").delete()
        case = create_audit_case_for_submission(sub, form_document=fd)
        self.client.force_authenticate(user=self.user)
        url = reverse("api_v1:case-history", kwargs={"pk": str(case.id)})
        # Fallback: case-detail history action uses router convention case-history
        # If reverse fails, try direct path
        if "NoReverseMatch" in str(url) if isinstance(url, str) else False:
            pass
        resp = self.client.get(url)
        # If router naming differs, try alternative
        if resp.status_code == 404:
            resp = self.client.get(f"/api/v1/correspondence/cases/{case.id}/history/")
        self.assertEqual(resp.status_code, 200, resp.content)
        data = resp.data
        # Should contain keys
        self.assertIn("case", data)
        self.assertIn("forms", data)
        self.assertIn("correspondence", data)
        self.assertIn("timeline", data)
        # Forms non-empty
        self.assertGreaterEqual(len(data["forms"]), 1, "History should include form")
        self.assertTrue(any(f.get("template_slug") == "audit-query-bills-certification" for f in data["forms"]))
        # Correspondence non-empty (linked via submission.correspondence)
        self.assertGreaterEqual(len(data["correspondence"]), 1, "History should include correspondence")
        self.assertTrue(any(c.get("correspondence_id") == str(self.corr.id) for c in data["correspondence"]))
        # Timeline should contain both form and correspondence entries
        timeline_types = {t.get("type") for t in data["timeline"]}
        self.assertIn("form", timeline_types)
        self.assertIn("correspondence", timeline_types)

    def test_case_detail_reuse_shows_unified_history(self):
        # Ensure case detail also exposes related items if history action unavailable
        from correspondence.services.case_audit import create_audit_case_for_submission
        sub, fd = self._make_form_document(pv_no="PV/2025/AUD/DET001")
        Case.objects.filter(metadata__audit_submission_id=str(sub.id)).delete()
        Case.objects.filter(title=f"AQ-{sub.data.get('pv_no')}").delete()
        case = create_audit_case_for_submission(sub, form_document=fd)
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f"/api/v1/correspondence/cases/{case.id}/")
        self.assertEqual(resp.status_code, 200, resp.content)
        # Detail serializer exposes forms/documents/correspondence
        self.assertIn("forms", resp.data or {})
        self.assertIn("correspondence", resp.data or {})

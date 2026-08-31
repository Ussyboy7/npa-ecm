import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from forms.models import FormSubmission, FormTemplate
from forms.signature_models import FormSignature, FormSignatureWorkflow


class FormAccessScopeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username="form-owner", password="x")
        self.other = User.objects.create_user(username="form-other", password="x")
        self.template = FormTemplate.objects.create(
            name="Access Test Form",
            slug=f"access-test-{uuid.uuid4().hex[:8]}",
            created_by=self.owner,
            structure={"fields": []},
        )
        self.submission = FormSubmission.objects.create(
            template=self.template,
            data={"value": "private"},
            is_draft=False,
            submitted_by=self.owner,
        )
        self.workflow = FormSignatureWorkflow.objects.create(
            submission=self.submission,
            initiated_by=self.owner,
            routing_mode="sequential",
            total_steps=1,
        )
        self.signature = FormSignature.objects.create(
            workflow=self.workflow,
            field_name="approval_signature",
            field_label="Approval signature",
            assigned_to_user=self.owner,
            order=1,
        )

    def test_other_user_cannot_read_or_update_submission(self):
        self.client.force_authenticate(user=self.other)

        detail = self.client.get(f"/api/v1/forms/submissions/{self.submission.id}/")
        update = self.client.patch(
            f"/api/v1/forms/submissions/{self.submission.id}/",
            {"data": {"value": "changed"}},
            format="json",
        )

        self.assertEqual(detail.status_code, 404)
        self.assertEqual(update.status_code, 404)

    def test_other_user_cannot_read_signature_workflow(self):
        self.client.force_authenticate(user=self.other)

        response = self.client.get(f"/api/v1/forms/signature-workflows/{self.workflow.id}/")

        self.assertEqual(response.status_code, 404)

    def test_assigned_user_can_read_signature_workflow(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(f"/api/v1/forms/signature-workflows/{self.workflow.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data["submission"]), str(self.submission.id))

    def test_other_user_cannot_create_signature_workflow_for_submission(self):
        self.client.force_authenticate(user=self.other)

        response = self.client.post(
            "/api/v1/forms/signature-workflows/create_workflow/",
            {
                "submission_id": str(self.submission.id),
                "routing_mode": "sequential",
                "signature_assignments": [
                    {"field_name": "approval_signature", "user_id": str(self.other.id)},
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)

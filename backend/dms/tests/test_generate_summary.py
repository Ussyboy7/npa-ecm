from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APITestCase

from dms.models import Document, DocumentVersion
from dms.services import OCRService

User = get_user_model()


class EnsureTextForVersionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="sumuser",
            password="testpass123",
        )
        self.document = Document.objects.create(
            title="Summary Test",
            author=self.user,
            document_type="other",
        )

    def test_returns_existing_ocr_text(self):
        version = DocumentVersion.objects.create(
            document=self.document,
            version_number=1,
            file_name="note.pdf",
            file_type="application/pdf",
            file_size=10,
            file_url="/media/note.pdf",
            ocr_text="Already extracted body text.",
            uploaded_by=self.user,
        )
        with patch.object(OCRService, "extract_text") as extract:
            text = OCRService.ensure_text_for_version(version)
        self.assertEqual(text, "Already extracted body text.")
        extract.assert_not_called()

    def test_extracts_and_persists_when_empty(self):
        version = DocumentVersion.objects.create(
            document=self.document,
            version_number=1,
            file_name="charter.pdf",
            file_type="application/pdf",
            file_size=100,
            file_url="/media/correspondence_attachments/charter.pdf",
            uploaded_by=self.user,
        )
        with (
            patch("dms.services.resolve_media_path", return_value="/tmp/charter.pdf"),
            patch("os.path.isfile", return_value=True),
            patch.object(
                OCRService,
                "extract_text",
                return_value="Project charter for the ECMS programme.",
            ),
        ):
            text = OCRService.ensure_text_for_version(version)

        version.refresh_from_db()
        self.assertEqual(text, "Project charter for the ECMS programme.")
        self.assertEqual(version.ocr_text, "Project charter for the ECMS programme.")


class GenerateSummaryApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="sumapi",
            password="testpass123",
        )
        self.document = Document.objects.create(
            title="08012026-Project-Charter-ECMS-NPA",
            author=self.user,
            document_type="other",
            role=Document.Role.ATTACHMENT,
        )
        self.version = DocumentVersion.objects.create(
            document=self.document,
            version_number=1,
            file_name="08012026-Project-Charter-ECMS-NPA.pdf",
            file_type="application/pdf",
            file_size=1024,
            file_url="/media/correspondence_attachments/charter.pdf",
            uploaded_by=self.user,
        )
        self.client.force_authenticate(user=self.user)

    @patch("dms.views.DocumentSummaryService.generate_summary", return_value="Charter summary.")
    @patch(
        "dms.views.OCRService.ensure_text_for_version",
        return_value="Full project charter text for summarization.",
    )
    def test_generate_summary_extracts_text_when_missing(self, _ensure, _gen):
        response = self.client.post(f"/api/v1/dms/documents/{self.document.id}/generate-summary/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"], "Charter summary.")
        self.version.refresh_from_db()
        self.assertEqual(self.version.summary, "Charter summary.")

    @patch("dms.views.OCRService.ensure_text_for_version", return_value="")
    def test_generate_summary_fails_when_no_text(self, _ensure):
        response = self.client.post(f"/api/v1/dms/documents/{self.document.id}/generate-summary/")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("no text content", str(response.data).lower())

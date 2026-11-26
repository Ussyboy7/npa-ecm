"""Editor-composed versions must be searchable as soon as they are saved."""

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from dms.models import Document, DocumentVersion

MEMO_HTML = (
    "<p><strong>NIGERIAN PORTS AUTHORITY</strong></p>"
    "<p>Departmental Memorandum" + "&nbsp;" * 4 + "To: General Manager ICT"
    + "&nbsp;" * 4 + "Date: 22nd June, 2026</p>"
    "<p>Approved&nbsp;by the General Manager</p>"
)


class EditorVersionContentTextTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="editoruser", password="testpass123")
        self.client.force_authenticate(user=self.user)
        self.doc = Document.objects.create(
            title="Editor Memo",
            author=self.user,
            document_type=Document.DocumentType.MEMO,
        )

    def create_version(self, content_html: str = MEMO_HTML):
        return self.client.post(
            reverse("api_v1:document-version-list"),
            {
                "document": str(self.doc.id),
                "file_name": "memo.html",
                "file_type": "text/html",
                "file_size": len(content_html),
                "content_html": content_html,
            },
            format="json",
        )

    def test_version_saved_from_editor_is_searchable_without_ocr(self):
        response = self.create_version()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        version = DocumentVersion.objects.get(id=response.data["id"])
        self.assertTrue(version.content_text)
        self.assertEqual(version.ocr_text, "")
        # Layout characters must not survive into the searchable text.
        self.assertNotIn("\u00a0", version.content_text)
        self.assertNotIn("&nbsp;", version.content_text)
        # Blocks stay separate words; typed gaps collapse to single spaces.
        self.assertIn("NIGERIAN PORTS AUTHORITY Departmental Memorandum To: General Manager ICT", version.content_text)
        self.assertIn("Approved by the General Manager", version.content_text)

    def test_editing_the_html_refreshes_the_searchable_text(self):
        version_id = self.create_version().data["id"]
        response = self.client.patch(
            reverse("api_v1:document-version-detail", args=[version_id]),
            {"content_html": "<p>Revised wording for the board</p>"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        version = DocumentVersion.objects.get(id=version_id)
        self.assertEqual(version.content_text, "Revised wording for the board")

    def test_ocr_write_does_not_clobber_derived_text(self):
        version = DocumentVersion.objects.get(id=self.create_version().data["id"])
        version.ocr_text = "Scanned page one"
        version.save(update_fields=["ocr_text"])

        version.refresh_from_db()
        self.assertIn("Departmental Memorandum", version.content_text)
        self.assertEqual(version.ocr_text, "Scanned page one")

    def test_version_without_html_keeps_its_explicit_text(self):
        version = DocumentVersion.objects.create(
            document=self.doc,
            version_number=9,
            file_name="scan.txt",
            file_type="text/plain",
            file_size=12,
            content_text="Original issued text",
        )
        version.refresh_from_db()
        self.assertEqual(version.content_text, "Original issued text")

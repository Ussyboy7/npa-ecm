"""The cleanup command rewrites stored layout characters in version text."""

from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from accounts.models import User
from dms.models import Document, DocumentVersion


class CleanVersionTextCommandTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="cleanupuser", password="testpass123")
        self.doc = Document.objects.create(
            title="Legacy Memo",
            author=self.user,
            document_type=Document.DocumentType.MEMO,
        )
        self.dirty = DocumentVersion.objects.create(
            document=self.doc,
            version_number=1,
            file_name="legacy.html",
            file_type="text/html",
            file_size=10,
            content_text="Approved&nbsp;by the General Manager",
            ocr_text="General Manager" + "\u00a0" * 6 + "Date: 22 June 2026",
        )
        self.html_only = DocumentVersion.objects.create(
            document=self.doc,
            version_number=2,
            file_name="composed.html",
            file_type="text/html",
            file_size=10,
            content_html="<p>Departmental Memorandum&nbsp;To: General Manager ICT</p>",
        )
        # Emulate a version written before text was derived on save.
        DocumentVersion.objects.filter(pk=self.html_only.pk).update(content_text="")
        self.html_only.refresh_from_db()

    def run_command(self, **options) -> str:
        out = StringIO()
        call_command("clean_version_text", stdout=out, **options)
        return out.getvalue()

    def test_dry_run_reports_but_writes_nothing(self):
        output = self.run_command()
        self.assertIn("Dry run", output)
        self.assertIn("Would update 2 version(s)", output)

        self.dirty.refresh_from_db()
        self.html_only.refresh_from_db()
        self.assertIn("&nbsp;", self.dirty.content_text)
        self.assertIn("\u00a0", self.dirty.ocr_text)
        self.assertEqual(self.html_only.content_text, "")

    def test_apply_cleans_stored_text_and_backfills_editor_versions(self):
        output = self.run_command(apply=True)
        self.assertIn("Updated 2 version(s)", output)
        self.assertIn("content_text from HTML=1", output)

        self.dirty.refresh_from_db()
        self.html_only.refresh_from_db()
        self.assertEqual(self.dirty.content_text, "Approved by the General Manager")
        self.assertEqual(self.dirty.ocr_text, "General Manager Date: 22 June 2026")
        self.assertEqual(self.html_only.content_text, "Departmental Memorandum To: General Manager ICT")

    def test_second_run_is_a_no_op(self):
        self.run_command(apply=True)
        output = self.run_command(apply=True)
        self.assertIn("Nothing to clean", output)

    def test_document_filter_limits_the_scope(self):
        other_user = User.objects.create_user(username="othermemo", password="testpass123")
        other_doc = Document.objects.create(
            title="Other Memo",
            author=other_user,
            document_type=Document.DocumentType.MEMO,
        )
        other = DocumentVersion.objects.create(
            document=other_doc,
            version_number=1,
            file_name="other.html",
            file_type="text/html",
            file_size=10,
            content_text="Approved&nbsp;elsewhere",
        )

        self.run_command(apply=True, document=str(other_doc.id))

        other.refresh_from_db()
        self.dirty.refresh_from_db()
        self.assertEqual(other.content_text, "Approved elsewhere")
        self.assertIn("&nbsp;", self.dirty.content_text)

"""The deploy-time data migration repairs version text in every environment.

Staging and production only get the repair if it travels with ``migrate``:
running ``clean_version_text --apply`` by hand fixed one database.
"""

import importlib

from django.apps import apps as django_apps
from django.test import TestCase

from accounts.models import User
from dms.models import Document, DocumentVersion


def run_backfill_migration():
    module = importlib.import_module("dms.migrations.0023_backfill_version_text")
    module.backfill_version_text(django_apps, None)


class VersionTextBackfillMigrationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="migrationuser", password="testpass123")
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
            ocr_text="General Manager" + "\u00a0" * 4 + "Date: 22 June 2026",
        )
        self.style_noise = DocumentVersion.objects.create(
            document=self.doc,
            version_number=2,
            file_name="styled.html",
            file_type="text/html",
            file_size=10,
            content_html="<style>.memo{color:#111}</style><p>Memo&nbsp;body</p>",
        )
        # Emulate a version written before text was derived on save.
        DocumentVersion.objects.filter(pk=self.style_noise.pk).update(
            content_text=".memo{color:#111} Memo\u00a0body"
        )

    def test_migration_cleans_spacing_and_derives_editor_text(self):
        run_backfill_migration()

        self.dirty.refresh_from_db()
        self.style_noise.refresh_from_db()
        self.assertEqual(self.dirty.content_text, "Approved by the General Manager")
        self.assertEqual(self.dirty.ocr_text, "General Manager Date: 22 June 2026")
        # CSS from the template's <style> block is not prose.
        self.assertEqual(self.style_noise.content_text, "Memo body")

    def test_migration_is_idempotent(self):
        run_backfill_migration()
        first = list(
            DocumentVersion.objects.order_by("version_number").values_list(
                "content_text", "ocr_text"
            )
        )

        run_backfill_migration()

        second = list(
            DocumentVersion.objects.order_by("version_number").values_list(
                "content_text", "ocr_text"
            )
        )
        self.assertEqual(first, second)

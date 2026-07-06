"""Tests for eDiscovery export bundles."""

import hashlib
import io
import json
import zipfile
from types import SimpleNamespace

from django.test import SimpleTestCase

from records.ediscovery_export import build_ediscovery_bundle


class EDiscoveryExportTests(SimpleTestCase):
    def test_bundle_contains_manifest_and_hashes(self):
        user = SimpleNamespace(
            id="user-1",
            username="counsel",
            email="counsel@example.com",
            get_full_name=lambda: "Counsel User",
        )
        correspondence = SimpleNamespace(
            id="corr-1",
            reference_number="NPA/2026/001",
            subject="Investigation matter",
            status="archived",
            source="internal",
            direction="upward",
            priority="high",
            archive_level="division",
            created_at=None,
            updated_at=None,
            archived_at=None,
            is_on_legal_hold=True,
            owning_office_id="office-1",
            division_id="div-1",
            department_id="dept-1",
        )
        document = SimpleNamespace(
            id="doc-1",
            title="Evidence pack",
            reference_number="DOC-001",
            document_type="report",
            status="published",
            sensitivity="confidential",
            author=user,
            created_at=None,
            updated_at=None,
        )
        hold = SimpleNamespace(
            id="hold-1",
            name="Matter Alpha",
            matter_reference="MAT-2026-01",
            is_active=True,
            correspondence_items=SimpleNamespace(
                select_related=lambda *args, **kwargs: SimpleNamespace(
                    order_by=lambda *a, **k: [correspondence],
                ),
            ),
            documents=SimpleNamespace(
                select_related=lambda *args, **kwargs: SimpleNamespace(
                    order_by=lambda *a, **k: [document],
                ),
            ),
        )

        zip_bytes, manifest = build_ediscovery_bundle(hold, exported_by=user)

        self.assertEqual(manifest["correspondence_count"], 1)
        self.assertEqual(manifest["document_count"], 1)

        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
            corr_bytes = archive.read("correspondence-export.csv")
            doc_bytes = archive.read("documents-export.csv")
            manifest_data = json.loads(archive.read("manifest.json"))

        self.assertEqual(
            manifest_data["file_hashes"]["correspondence-export.csv"],
            hashlib.sha256(corr_bytes).hexdigest(),
        )
        self.assertEqual(
            manifest_data["bundle_sha256"],
            hashlib.sha256(corr_bytes + doc_bytes).hexdigest(),
        )

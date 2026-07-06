"""Tests for tamper-evident audit export."""

import hashlib
import io
import json
import zipfile
from types import SimpleNamespace

from django.test import SimpleTestCase

from audit.export_service import build_compliance_bundle


class ComplianceExportTests(SimpleTestCase):
    def test_bundle_contains_manifest_and_matching_checksum(self):
        user = SimpleNamespace(
            id="user-1",
            username="auditor",
            email="auditor@example.com",
            get_full_name=lambda: "Auditor User",
        )
        log = SimpleNamespace(
            timestamp=None,
            id="log-1",
            action="user_login",
            module="accounts",
            severity="info",
            user_id=user.id,
            user=user,
            description="User logged in",
            object_type="",
            object_id="",
            object_repr="",
            success=True,
            error_message="",
            ip_address="127.0.0.1",
            user_agent="test",
            metadata={"source": "test"},
            get_action_display=lambda: "User Login",
        )

        zip_bytes, manifest = build_compliance_bundle(
            [log],
            exported_by=user,
            filters={"module": "accounts"},
        )

        self.assertEqual(manifest["record_count"], 1)
        self.assertEqual(len(manifest["sha256"]), 64)

        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
            names = set(archive.namelist())
            self.assertEqual(names, {"audit-export.csv", "manifest.json", "checksum.sha256"})
            csv_bytes = archive.read("audit-export.csv")
            manifest_data = json.loads(archive.read("manifest.json"))
            checksum_line = archive.read("checksum.sha256").decode("utf-8")

        digest = hashlib.sha256(csv_bytes).hexdigest()
        self.assertEqual(manifest_data["sha256"], digest)
        self.assertTrue(checksum_line.startswith(digest))

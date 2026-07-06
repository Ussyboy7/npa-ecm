"""Tests for document version diff."""

from types import SimpleNamespace

from django.test import SimpleTestCase

from dms.version_diff import build_version_diff, extract_version_plain_text


class VersionDiffTests(SimpleTestCase):
    def setUp(self):
        self.v1 = SimpleNamespace(
            id="v1",
            version_number=1,
            content_text="Line one\nLine two",
            content_html="",
            ocr_text="",
        )
        self.v2 = SimpleNamespace(
            id="v2",
            version_number=2,
            content_text="Line one\nLine two changed\nLine three",
            content_html="",
            ocr_text="",
        )

    def test_extract_plain_text_prefers_content_text(self):
        self.assertEqual(extract_version_plain_text(self.v1), "Line one\nLine two")

    def test_build_version_diff_reports_changes(self):
        result = build_version_diff(self.v1, self.v2)
        self.assertTrue(result["has_content"])
        self.assertGreater(result["added_lines"], 0)
        self.assertIn("Line two changed", result["unified_diff"])

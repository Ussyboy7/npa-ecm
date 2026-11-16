from django.test import SimpleTestCase, override_settings

from common.media_urls import build_media_url


class BuildMediaUrlTests(SimpleTestCase):
    @override_settings(MEDIA_URL="/media/")
    def test_builds_a_relative_url_under_the_default_prefix(self):
        self.assertEqual(
            build_media_url("correspondence_attachments/file.pdf"),
            "/media/correspondence_attachments/file.pdf",
        )

    @override_settings(MEDIA_URL="/media/")
    def test_does_not_double_slashes_for_a_leading_path_slash(self):
        self.assertEqual(
            build_media_url("/dms_versions/doc/file.pdf"),
            "/media/dms_versions/doc/file.pdf",
        )

    @override_settings(MEDIA_URL="media")
    def test_normalizes_a_prefix_without_leading_or_trailing_slashes(self):
        self.assertEqual(build_media_url("file.pdf"), "/media/file.pdf")

    @override_settings(MEDIA_URL="/static/media/")
    def test_respects_a_custom_media_prefix(self):
        self.assertEqual(build_media_url("file.pdf"), "/static/media/file.pdf")

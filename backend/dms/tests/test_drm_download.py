"""DRM download enforcement, share blocking, and PDF watermark tests."""

from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.urls import reverse
from reportlab.pdfgen import canvas
from rest_framework import status
from rest_framework.test import APITestCase

from dms.models import Document, DocumentAccessLog, DocumentRightsPolicy, DocumentVersion
from dms.watermark import apply_text_watermark, is_pdf_bytes

User = get_user_model()


def _minimal_pdf_bytes(text: str = "Hello DRM") -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(72, 720, text)
    c.showPage()
    c.save()
    return buf.getvalue()


class DrmDownloadTests(APITestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="drm_author",
            email="drm_author@npa.gov.ng",
            password="pass12345",
        )
        self.viewer = User.objects.create_user(
            username="drm_viewer",
            email="drm_viewer@npa.gov.ng",
            password="pass12345",
        )
        self.policy = DocumentRightsPolicy.objects.create(
            name="Confidential — View Only",
            description="View only",
            allow_download=False,
            allow_print=False,
            allow_external_share=False,
            view_only=True,
            watermark_text="CONFIDENTIAL",
        )
        self.document = Document.objects.create(
            title="Protected Report",
            document_type=Document.DocumentType.REPORT,
            status=Document.DocumentStatus.PUBLISHED,
            sensitivity=Document.Sensitivity.CONFIDENTIAL,
            author=self.author,
            drm_policy=self.policy,
        )
        self.version = DocumentVersion.objects.create(
            document=self.document,
            version_number=1,
            file_name="protected-report.html",
            file_type="text/html",
            file_size=32,
            content_html="<p>Secret evaluation</p>",
            uploaded_by=self.author,
        )

    def test_download_blocked_by_view_only_policy(self):
        self.client.force_authenticate(user=self.viewer)
        url = reverse("api_v1:document-version-download", kwargs={"pk": self.version.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(
            DocumentAccessLog.objects.filter(
                document=self.document,
                user=self.viewer,
                action=DocumentAccessLog.AccessAction.ATTEMPTED_DOWNLOAD,
            ).exists()
        )

    def test_download_allowed_without_restrictive_policy(self):
        self.document.drm_policy = None
        self.document.save(update_fields=["drm_policy"])
        self.client.force_authenticate(user=self.viewer)
        url = reverse("api_v1:document-version-download", kwargs={"pk": self.version.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            DocumentAccessLog.objects.filter(
                document=self.document,
                user=self.viewer,
                action=DocumentAccessLog.AccessAction.DOWNLOAD,
            ).exists()
        )

    def test_content_allowed_when_download_blocked(self):
        self.client.force_authenticate(user=self.viewer)
        url = reverse("api_v1:document-version-content", kwargs={"pk": self.version.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(b"Secret evaluation", response.content)
        self.assertTrue(
            DocumentAccessLog.objects.filter(
                document=self.document,
                user=self.viewer,
                action=DocumentAccessLog.AccessAction.VIEW,
            ).exists()
        )

    def test_version_serializer_redacts_file_url_under_policy(self):
        pdf_bytes = _minimal_pdf_bytes()
        stored = default_storage.save("demo/drm-redact.pdf", ContentFile(pdf_bytes))
        version = DocumentVersion.objects.create(
            document=self.document,
            version_number=2,
            file_name="secret.pdf",
            file_type="application/pdf",
            file_size=len(pdf_bytes),
            file_url=f"/media/{stored}",
            uploaded_by=self.author,
        )
        self.client.force_authenticate(user=self.viewer)
        url = reverse("api_v1:document-version-detail", kwargs={"pk": version.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("file_url") or "", "")
        self.assertTrue(response.data.get("has_file"))
        self.assertEqual(response.data.get("drm_delivery"), "api")

    def test_share_blocked_when_external_share_disabled(self):
        self.author.is_superuser = True
        self.author.save(update_fields=["is_superuser"])
        self.client.force_authenticate(user=self.author)
        url = reverse("api_v1:document-permission-list")
        response = self.client.post(
            url,
            {
                "document": str(self.document.id),
                "access": "read",
                "user_ids": [str(self.viewer.id)],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Sharing blocked", str(response.data))


    def test_print_blocked_logs_attempted_print(self):
        self.client.force_authenticate(user=self.viewer)
        url = reverse("api_v1:document-version-print", kwargs={"pk": self.version.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(
            DocumentAccessLog.objects.filter(
                document=self.document,
                user=self.viewer,
                action=DocumentAccessLog.AccessAction.ATTEMPTED_PRINT,
            ).exists()
        )

    def test_print_allowed_logs_print(self):
        self.document.drm_policy = None
        self.document.save(update_fields=["drm_policy"])
        self.client.force_authenticate(user=self.viewer)
        url = reverse("api_v1:document-version-print", kwargs={"pk": self.version.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            DocumentAccessLog.objects.filter(
                document=self.document,
                user=self.viewer,
                action=DocumentAccessLog.AccessAction.PRINT,
            ).exists()
        )
        self.assertFalse(
            DocumentAccessLog.objects.filter(
                document=self.document,
                user=self.viewer,
                action=DocumentAccessLog.AccessAction.VIEW,
            ).exists()
        )


class DrmPdfWatermarkTests(APITestCase):
    def setUp(self):
        self.viewer = User.objects.create_user(
            username="wm_viewer",
            email="wm_viewer@npa.gov.ng",
            password="pass12345",
        )
        self.policy = DocumentRightsPolicy.objects.create(
            name="Internal — Watermarked Download",
            allow_download=True,
            allow_print=True,
            view_only=False,
            watermark_text="INTERNAL USE ONLY",
        )
        self.document = Document.objects.create(
            title="Watermarked PDF",
            document_type=Document.DocumentType.REPORT,
            status=Document.DocumentStatus.PUBLISHED,
            author=self.viewer,
            drm_policy=self.policy,
        )
        pdf_bytes = _minimal_pdf_bytes("Architecture Diagram")
        stored = default_storage.save(
            "demo/drm-watermark-test.pdf",
            ContentFile(pdf_bytes),
        )
        self.version = DocumentVersion.objects.create(
            document=self.document,
            version_number=1,
            file_name="architecture.pdf",
            file_type="application/pdf",
            file_size=len(pdf_bytes),
            file_url=f"/media/{stored}",
            uploaded_by=self.viewer,
        )

    def test_apply_text_watermark_embeds_marker(self):
        original = _minimal_pdf_bytes()
        stamped = apply_text_watermark(original, "CONFIDENTIAL")
        self.assertTrue(is_pdf_bytes(stamped))
        self.assertNotEqual(original, stamped)
        self.assertIn(b"CONFIDENTIAL", stamped)

    def test_download_returns_watermarked_pdf(self):
        self.client.force_authenticate(user=self.viewer)
        url = reverse("api_v1:document-version-download", kwargs={"pk": self.version.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(is_pdf_bytes(response.content))
        self.assertIn(b"INTERNAL USE ONLY", response.content)
        self.assertIn(b"wm\\137viewer", response.content)
        self.assertEqual(response["Content-Disposition"].split(";")[0].strip(), "attachment")

    def test_print_returns_forensic_watermarked_pdf(self):
        self.client.force_authenticate(user=self.viewer)
        url = reverse("api_v1:document-version-print", kwargs={"pk": self.version.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(is_pdf_bytes(response.content))
        self.assertIn(b"INTERNAL USE ONLY", response.content)
        self.assertIn(b"wm\\137viewer", response.content)
        self.assertEqual(response["Content-Disposition"].split(";")[0].strip(), "inline")
        self.assertTrue(
            DocumentAccessLog.objects.filter(
                document=self.document,
                user=self.viewer,
                action=DocumentAccessLog.AccessAction.PRINT,
            ).exists()
        )

    def test_content_returns_watermarked_pdf_inline(self):
        self.client.force_authenticate(user=self.viewer)
        url = reverse("api_v1:document-version-content", kwargs={"pk": self.version.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(b"INTERNAL USE ONLY", response.content)
        # Preview/content does not stamp the user forensic label.
        self.assertNotIn(b"wm\\137viewer", response.content)
        self.assertEqual(response["Content-Disposition"].split(";")[0].strip(), "inline")

    def test_file_url_redacted_when_watermark_policy(self):
        self.client.force_authenticate(user=self.viewer)
        url = reverse("api_v1:document-version-detail", kwargs={"pk": self.version.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("file_url") or "", "")
        self.assertEqual(response.data.get("drm_delivery"), "api")

    def test_view_only_pdf_is_permission_restricted(self):
        from dms.watermark import apply_pdf_access_restrictions

        original = _minimal_pdf_bytes()
        restricted = apply_pdf_access_restrictions(
            original, allow_print=False, allow_extract=False
        )
        self.assertTrue(is_pdf_bytes(restricted))
        self.assertNotEqual(original, restricted)
        # Encrypted PDFs typically include Encrypt dictionary
        self.assertIn(b"/Encrypt", restricted)

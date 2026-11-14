import io
import hashlib
import uuid
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import reverse

from accounts.models import DocumentSeal, ExecutiveSignature
from accounts.services import SealGenerationService
from django.core.files.uploadedfile import SimpleUploadedFile
from correspondence.models import (
    ApprovalSnapshot,
    Correspondence,
    CorrespondenceDocumentLink,
    Minute,
)
from correspondence.services import ExecutiveApprovalPDFService
from correspondence.services.approval_pdf import build_approval_pdf
from correspondence.services.approval_snapshot import get_or_create_approval_snapshot
from dms.models import Document, DocumentPermission, DocumentVersion
from organization.models import Directorate, Division, Role
from PIL import Image, ImageDraw
from pypdf import PdfReader
from reportlab.pdfgen import canvas
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class ApprovalPDFSealTests(TestCase):
    def setUp(self):
        self.approver = User.objects.create_user(
            username="pdf-approver",
            password="testpass123",
            first_name="Amina",
            last_name="Bello",
        )
        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/PDF/{uuid.uuid4().hex[:8].upper()}",
            subject="Approval copy seal",
            sender_name="Test sender",
            created_by=self.approver,
        )
        self.minute = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.approver,
            minute_text="Approved.",
            action_type=Minute.ActionType.APPROVE,
            approval_level=Minute.ApprovalLevel.DEPARTMENTAL,
            approval_role="approval",
            step_number=1,
        )
        self.seal = DocumentSeal.objects.create(
            correspondence=self.correspondence,
            sealed_by=self.approver,
            serial_number=f"NPA-TEST-{uuid.uuid4().hex[:8].upper()}",
            seal_hash="test-hash",
            verification_url="http://localhost:3002/verify/test",
            office_name="NIGERIAN PORTS AUTHORITY",
            office_title="OFFICE OF THE MANAGING DIRECTOR",
        )
        # Simulate a seal whose cached PNG is missing from storage.
        self.assertFalse(self.seal.seal_image)
        DocumentSeal.objects.filter(pk=self.seal.pk).update(
            sealed_at=self.minute.timestamp
        )
        self.seal.refresh_from_db()
        self.minute.seal_applied = self.seal
        self.minute.save(update_fields=["seal_applied"])

    def test_approved_copy_inherits_source_document_permissions(self):
        source = Document.objects.create(
            title="Permission source memo",
            document_type=Document.DocumentType.MEMO,
            author=self.approver,
            role=Document.Role.PRIMARY,
        )
        approved = Document.objects.create(
            title="Permission approved copy",
            document_type=Document.DocumentType.MEMO,
            author=self.approver,
            role=Document.Role.ATTACHMENT,
        )
        permission = DocumentPermission.objects.create(
            document=source,
            access=DocumentPermission.AccessLevel.READ,
            grade_levels=["GMCS"],
        )
        permission.users.add(self.approver)

        ExecutiveApprovalPDFService._inherit_source_permissions(source, approved)

        inherited = approved.permissions.get(access=DocumentPermission.AccessLevel.READ)
        self.assertIn(self.approver, inherited.users.all())
        self.assertEqual(inherited.grade_levels, ["GMCS"])

    def _attach_scan(
        self,
        file_name,
        file_type,
        file_bytes,
        ocr_text="",
        storage_root="dms_versions",
    ):
        document = Document.objects.create(
            title=f"Scanned source {uuid.uuid4().hex[:8]}",
            document_type=Document.DocumentType.MEMO,
            author=self.approver,
        )
        folder = document.id if storage_root == "dms_versions" else self.correspondence.id
        stored_path = default_storage.save(
            f"{storage_root}/{folder}/{file_name}",
            ContentFile(file_bytes),
        )
        self.addCleanup(default_storage.delete, stored_path)
        DocumentVersion.objects.create(
            document=document,
            version_number=1,
            file_name=file_name,
            file_type=file_type,
            file_size=len(file_bytes),
            file_url=f"{(settings.MEDIA_URL or '/media/').rstrip('/')}/{stored_path}",
            content_html="",
            content_text=ocr_text,
            ocr_text=ocr_text,
            uploaded_by=self.approver,
        )
        CorrespondenceDocumentLink.objects.create(
            correspondence=self.correspondence,
            document=document,
        )
        return document

    def test_scan_only_pdf_preserves_pages_and_places_certificate_after(self):
        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=(595, 842))
        pdf.drawString(72, 760, "SCANNED PAGE ONE")
        pdf.showPage()
        pdf.drawString(72, 760, "SCANNED PAGE TWO")
        pdf.showPage()
        pdf.save()
        self._attach_scan(
            "scanned-memo.pdf",
            "application/pdf",
            buffer.getvalue(),
            ocr_text="OCR TEXT SHOULD NOT PRINT",
            storage_root="correspondence_attachments",
        )

        pdf_bytes = ExecutiveApprovalPDFService.generate_approval_pdf(
            minute=self.minute,
            correspondence=self.correspondence,
        )
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]

        self.assertEqual(len(reader.pages), 4)
        self.assertIn("SCANNED PAGE ONE", pages[0])
        self.assertIn("SCANNED PAGE TWO", pages[1])
        self.assertNotIn("OCR TEXT SHOULD NOT PRINT", pages[0])
        self.assertIn("Approval Certificate", pages[2])
        self.assertIn("Approval Record", pages[3])

    def test_scan_only_image_preserves_original_image_as_first_page(self):
        image = Image.new("RGB", (800, 600), "white")
        draw = ImageDraw.Draw(image)
        draw.text((40, 40), "SCANNED IMAGE MEMO", fill="black")
        image_buffer = io.BytesIO()
        image.save(image_buffer, format="PNG")
        self._attach_scan(
            "scanned-memo.png",
            "image/png",
            image_buffer.getvalue(),
            ocr_text="OCR TEXT SHOULD NOT PRINT",
        )

        pdf_bytes = ExecutiveApprovalPDFService.generate_approval_pdf(
            minute=self.minute,
            correspondence=self.correspondence,
        )
        reader = PdfReader(io.BytesIO(pdf_bytes))

        self.assertEqual(len(reader.pages), 3)
        self.assertTrue(reader.pages[0].images)
        self.assertIn((800, 600), [image.image.size for image in reader.pages[0].images])
        self.assertNotIn("OCR TEXT SHOULD NOT PRINT", reader.pages[0].extract_text() or "")
        self.assertIn("Approval Certificate", reader.pages[1].extract_text() or "")

    def test_approval_pdf_links_record_and_embeds_rendered_seal(self):
        pdf_bytes = ExecutiveApprovalPDFService.generate_approval_pdf(
            minute=self.minute,
            correspondence=self.correspondence,
        )
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)

        self.assertIn("APPROVED COPY", text)
        self.assertIn(self.correspondence.reference_number, text)
        self.assertNotIn(str(self.minute.id), text)
        self.assertIn(self.seal.serial_number, text)
        self.assertIn("Approval Certificate", text)
        self.assertIn("Approval Record", text)
        self.assertIn("Digital seal and verification", text)
        self.assertIn("Signed and sealed", text)
        self.assertIn("Authorised signatory", text)
        page_two = reader.pages[1].extract_text() or ""
        self.assertIn("Approved & sealed", page_two)
        self.assertNotIn("Sealed at", page_two)
        self.assertNotIn("Digital Executive Seal Applied", text)
        self.assertNotIn("Approval minute", text)
        self.assertNotIn("Record control", text)
        self.assertNotIn("Original memo unchanged", text)

        seal_images = [
            image
            for page in reader.pages
            for image in page.images
            if image.image.size[0] >= 250 and image.image.size[1] >= 250
        ]
        self.assertTrue(
            seal_images, "Approval PDF should embed the rendered seal image"
        )

    def test_certificate_embeds_signature_image_when_available(self):
        from PIL import Image

        buffer = io.BytesIO()
        Image.new("RGBA", (240, 80), (255, 255, 255, 0)).save(
            buffer, format="PNG"
        )
        signature = ExecutiveSignature.objects.create(
            user=self.approver,
            signature_image=SimpleUploadedFile(
                "signature.png", buffer.getvalue(), content_type="image/png"
            ),
        )
        self.addCleanup(signature.signature_image.delete, save=False)
        self.seal.signature_used = signature
        self.seal.save(update_fields=["signature_used"])

        pdf_bytes = ExecutiveApprovalPDFService.generate_approval_pdf(
            minute=self.minute,
            correspondence=self.correspondence,
        )
        reader = PdfReader(io.BytesIO(pdf_bytes))
        page_two = reader.pages[1]

        self.assertIn("Authorised signature", page_two.extract_text() or "")
        self.assertGreaterEqual(len(page_two.images), 2)
        if self.seal.seal_image:
            self.addCleanup(self.seal.seal_image.delete, save=False)

    def test_certificate_signature_block_shares_left_edge(self):
        pdf_bytes = ExecutiveApprovalPDFService.generate_approval_pdf(
            minute=self.minute,
            correspondence=self.correspondence,
        )
        certificate_page = PdfReader(io.BytesIO(pdf_bytes)).pages[1]
        targets = {
            "Signed and sealed",
            "Authorised signatory",
            "Amina Bello",
            self.seal.office_title,
        }
        left_edges = {}

        def visitor(text, cm, tm, font_dict, font_size):
            clean = text.strip()
            if clean in targets and clean not in left_edges:
                left_edges[clean] = round(cm[4] + tm[4], 2)

        certificate_page.extract_text(visitor_text=visitor)

        self.assertEqual(set(left_edges), targets)
        self.assertLessEqual(
            max(left_edges.values()) - min(left_edges.values()),
            0.01,
            f"Signature block elements are not left-aligned: {left_edges}",
        )

    @override_settings(
        PUBLIC_APP_ORIGIN="",
        FRONTEND_BASE_URL="https://ecm.nigerianports.gov.ng",
    )
    def test_certificate_uses_configured_public_verification_url(self):
        pdf_bytes = ExecutiveApprovalPDFService.generate_approval_pdf(
            minute=self.minute,
            correspondence=self.correspondence,
        )
        page_two = PdfReader(io.BytesIO(pdf_bytes)).pages[1].extract_text() or ""

        self.assertIn(
            f"https://ecm.nigerianports.gov.ng/verify/{self.seal.serial_number}",
            page_two,
        )
        self.assertNotIn("localhost", page_two)
        if self.seal.seal_image:
            self.addCleanup(self.seal.seal_image.delete, save=False)

    @override_settings(
        PUBLIC_APP_ORIGIN="https://certificates.example.gov.ng",
        FRONTEND_BASE_URL="http://localhost:3002",
    )
    def test_certificate_prefers_public_app_origin_over_loopback(self):
        pdf_bytes = ExecutiveApprovalPDFService.generate_approval_pdf(
            minute=self.minute,
            correspondence=self.correspondence,
        )
        page_two = PdfReader(io.BytesIO(pdf_bytes)).pages[1].extract_text() or ""

        self.assertIn(
            f"https://certificates.example.gov.ng/verify/{self.seal.serial_number}",
            page_two,
        )
        self.assertNotIn("localhost", page_two)
        if self.seal.seal_image:
            self.addCleanup(self.seal.seal_image.delete, save=False)

    def test_executive_approval_pdf_certificate_has_executive_heading(self):
        self.correspondence.required_approval_level = (
            Correspondence.RequiredApprovalLevel.EXECUTIVE
        )
        self.minute.approval_level = Minute.ApprovalLevel.EXECUTIVE

        pdf_bytes = ExecutiveApprovalPDFService.generate_approval_pdf(
            minute=self.minute,
            correspondence=self.correspondence,
        )
        reader = PdfReader(io.BytesIO(pdf_bytes))
        first_page_text = reader.pages[0].extract_text() or ""
        certificate_text = reader.pages[1].extract_text() or ""

        self.assertIn("APPROVED COPY", first_page_text)
        self.assertIn("EXECUTIVE APPROVAL", certificate_text)
        self.assertNotIn("DEPARTMENTAL APPROVAL", certificate_text)

    def test_seal_font_scales_with_requested_size(self):
        # ImageFont.load_default() ignores size and would make seal text microscopic.
        font = SealGenerationService._load_font(120, bold=True)
        self.assertEqual(font.size, 120)

    def test_missing_seal_image_is_cached_and_reused(self):
        ExecutiveApprovalPDFService.generate_approval_pdf(
            minute=self.minute,
            correspondence=self.correspondence,
        )
        self.seal.refresh_from_db()
        self.addCleanup(self.seal.seal_image.delete, save=False)
        self.assertTrue(self.seal.seal_image)
        self.assertTrue(default_storage.exists(self.seal.seal_image.name))

        with mock.patch(
            "accounts.services.SealGenerationService._render_seal_png",
            side_effect=AssertionError("cached seal should be reused"),
        ):
            pdf_bytes = ExecutiveApprovalPDFService.generate_approval_pdf(
                minute=self.minute,
                correspondence=self.correspondence,
            )

        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_original_memo_content_is_not_written_by_pdf_generation(self):
        before = self.correspondence.updated_at
        ExecutiveApprovalPDFService.generate_approval_pdf(
            minute=self.minute,
            correspondence=self.correspondence,
        )
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.updated_at, before)


class ApprovalPDFDownloadAPITests(TestCase):
    """Endpoint regression for authenticated approval-PDF downloads."""

    def setUp(self):
        self.directorate = Directorate.objects.create(
            name=f"PDF API Directorate {uuid.uuid4().hex[:6]}",
            code=f"PDFAPI{uuid.uuid4().hex[:6].upper()}",
        )
        self.division = Division.objects.create(
            directorate=self.directorate,
            name=f"PDF API Division {uuid.uuid4().hex[:6]}",
            code=f"PDFAPIDIV{uuid.uuid4().hex[:6].upper()}",
        )
        self.role = Role.objects.create(
            name=f"PDF API Approver {uuid.uuid4().hex[:6]}",
            permissions={"can_access_approvals": True},
        )
        self.approver = User.objects.create_user(
            username=f"pdf-api-{uuid.uuid4().hex[:8]}",
            password="testpass123",
            first_name="Amina",
            last_name="Bello",
            grade_level="MSS1",
            system_role=self.role,
            division=self.division,
        )
        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/PDFAPI/{uuid.uuid4().hex[:8].upper()}",
            subject="Approval copy API download",
            sender_name="Test sender",
            created_by=self.approver,
            division=self.division,
        )
        memo_paragraph = (
            "Request for the allocation of seven units of UPS to the Medical Centre, "
            "Bode Thomas, to ensure reliable power supply to critical ICT equipment and "
            "minimize disruption to clinical and administrative operations. "
        )
        memo_html = (
            '<p style="text-align: center"><strong>NIGERIAN PORTS AUTHORITY</strong></p>'
            '<p><strong>To:</strong> General Manager ICT '
            '<strong>Date:</strong> 19th August, 2026</p>'
            '<p><strong>From:</strong> Asst. General Manager SA&amp;DM '
            '<strong>Ref.:</strong> HQ/AGM/SA&amp;DM/AD/</p>'
            '<p><strong>REQUEST FOR THE ALLOCATION OF SEVEN (7) UNITS OF UPS</strong></p>'
            f"<p>{memo_paragraph}</p>"
        )
        self.memo_html = memo_html
        self.linked_document = Document.objects.create(
            title="Linked UPS allocation memo",
            document_type=Document.DocumentType.MEMO,
            author=self.approver,
            division=self.division,
        )
        DocumentVersion.objects.create(
            document=self.linked_document,
            version_number=1,
            file_name="linked-ups-memo.html",
            file_type="text/html",
            file_size=len(memo_html.encode("utf-8")),
            content_html=memo_html,
            uploaded_by=self.approver,
        )
        CorrespondenceDocumentLink.objects.create(
            correspondence=self.correspondence,
            document=self.linked_document,
        )
        self.minute = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.approver,
            minute_text="Approved as recommended.",
            action_type=Minute.ActionType.APPROVE,
            approval_level=Minute.ApprovalLevel.DEPARTMENTAL,
            approval_role="approval",
            step_number=1,
        )
        self.seal = DocumentSeal.objects.create(
            correspondence=self.correspondence,
            sealed_by=self.approver,
            serial_number=f"NPA-TEST-{uuid.uuid4().hex[:8].upper()}",
            seal_hash="test-hash",
            verification_url="http://localhost:3002/verify/test",
            office_name="NIGERIAN PORTS AUTHORITY",
            office_title="OFFICE OF THE MANAGING DIRECTOR",
        )
        self.minute.seal_applied = self.seal
        self.minute.save(update_fields=["seal_applied"])

        self.client = APIClient()
        access = str(RefreshToken.for_user(self.approver).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.url = reverse("api_v1:minute-approval-pdf", args=[self.minute.id])

    def test_authenticated_download_returns_three_page_certified_pdf_and_caches_seal(
        self,
    ):
        first = self.client.get(self.url)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(first["Content-Type"], "application/pdf")
        first_reader = PdfReader(io.BytesIO(first.content))
        # The certified package is three pages: memo, signed certificate,
        # then the lean approval record.
        self.assertEqual(len(first_reader.pages), 3)
        first_pages = [page.extract_text() or "" for page in first_reader.pages]

        # Page 1 is the source DMS memo, branded as an approved copy.
        self.assertIn("Request for the allocation of seven units", first_pages[0])
        self.assertIn("HQ/AGM/SA&DM/AD/", first_pages[0])
        self.assertIn("APPROVED COPY", first_pages[0])
        self.assertNotIn(self.correspondence.reference_number, first_pages[0])
        self.assertNotIn(self.seal.serial_number, first_pages[0])
        self.assertNotIn("Approval Record", first_pages[0])
        self.assertNotIn("Approval Certificate", first_pages[0])
        self.assertNotIn("Digital seal and verification", first_pages[0])
        self.assertNotIn("Authorised signature", first_pages[0])
        self.assertEqual(len(first_reader.pages[0].images), 1)

        # Page 2 is the signed certificate with the canonical document
        # reference, verification, and signature details.
        self.assertIn("DEPARTMENTAL APPROVAL · APPROVED COPY", first_pages[1])
        self.assertIn("Approval Certificate", first_pages[1])
        self.assertIn("Digital seal and verification", first_pages[1])
        self.assertIn("Document reference", first_pages[1])
        self.assertIn(self.correspondence.reference_number, first_pages[1])
        self.assertNotIn("DMS source reference", first_pages[1])
        self.assertNotIn("Memo reference (printed)", first_pages[1])
        self.linked_document.refresh_from_db()
        self.assertNotIn(self.linked_document.reference_number, first_pages[1])
        self.assertIn(self.seal.serial_number, first_pages[1])
        public_origin = (
            getattr(settings, "PUBLIC_APP_ORIGIN", "")
            or settings.FRONTEND_BASE_URL
        ).rstrip("/")
        expected_verification_url = (
            f"{public_origin}/verify/{self.seal.serial_number}"
        )
        self.assertIn(expected_verification_url, first_pages[1])
        self.assertIn(self.seal.office_title, first_pages[1])
        self.assertIn("Signed and sealed", first_pages[1])
        self.assertIn("Authorised signatory", first_pages[1])
        self.assertIn("Amina Bello", first_pages[1])
        self.assertEqual(first_pages[1].count("Approved & sealed"), 1)
        self.assertNotIn("Approval Record", first_pages[1])
        self.assertNotIn("Decision:", first_pages[1])

        # Page 3 is only the lean approval record; it must not repeat the
        # certificate's seal, verification, or signature details.
        self.assertIn("Approval Record", first_pages[2])
        self.assertIn("APPROVED COPY", first_pages[2])
        self.assertIn("Approved as recommended.", first_pages[2])
        self.assertEqual(first_pages[2].count("Approved as recommended."), 1)
        self.assertNotIn("Decision:", first_pages[2])
        self.assertNotIn(self.minute.timestamp.strftime("%H:%M"), first_pages[2])
        self.assertNotIn("\nApproved.\n", first_pages[2])
        self.assertNotIn("Original memo unchanged", first_pages[2])
        self.assertNotIn("Record control", first_pages[2])
        self.assertNotIn(self.seal.serial_number, first_pages[2])
        self.assertNotIn(expected_verification_url, first_pages[2])
        self.assertNotIn(self.seal.office_title, first_pages[2])
        self.assertNotIn("Approval Certificate", first_pages[2])
        self.assertNotIn("Digital seal and verification", first_pages[2])
        self.assertNotIn("Signed and sealed", first_pages[2])
        self.assertNotIn("Authorised signature", first_pages[2])
        self.assertNotIn("Digital Executive Seal Applied", first_pages[2])

        self.assertEqual(
            len(first_reader.pages[0].images),
            1,
            "The approved memo should carry the seal image",
        )
        self.assertEqual(
            len(first_reader.pages[1].images),
            1,
            "The certificate should carry the seal image",
        )
        self.assertTrue(
            first_reader.pages[1].images[0].image.size[0] >= 250
            and first_reader.pages[1].images[0].image.size[1] >= 250,
            "Page 2 should contain the certificate seal image",
        )
        self.assertFalse(
            any(
                image.image.size[0] >= 250 and image.image.size[1] >= 250
                for image in first_reader.pages[2].images
            ),
            "The lean approval record should not repeat the seal image",
        )

        self.seal.refresh_from_db()
        self.addCleanup(self.seal.seal_image.delete, save=False)
        self.assertTrue(self.seal.seal_image)
        self.assertTrue(default_storage.exists(self.seal.seal_image.name))

        with mock.patch(
            "accounts.services.SealGenerationService._render_seal_png",
            side_effect=AssertionError("cached seal should be reused"),
        ) as render:
            second = self.client.get(self.url)

        self.assertEqual(second.status_code, 200)
        self.assertEqual(second["Content-Type"], "application/pdf")
        self.assertEqual(render.call_count, 0)
        second_reader = PdfReader(io.BytesIO(second.content))
        self.assertEqual(len(second_reader.pages), 3)
        second_pages = [page.extract_text() or "" for page in second_reader.pages]
        self.assertIn(self.seal.serial_number, second_pages[1])
        self.assertNotIn(self.seal.serial_number, second_pages[0])
        self.assertNotIn(self.seal.serial_number, second_pages[2])

        self.assertIn("Authorised signatory", second_pages[1])
        self.assertNotIn("Authorised signature", second_pages[0])
        self.assertNotIn("Authorised signature", second_pages[2])
        self.assertEqual(len(second_reader.pages[0].images), 1)
        self.assertEqual(len(second_reader.pages[1].images), 1)
        self.assertTrue(
            second_reader.pages[1].images[0].image.size[0] >= 250
            and second_reader.pages[1].images[0].image.size[1] >= 250,
            "The cached seal should still be embedded on the certificate",
        )
        self.assertFalse(
            any(
                image.image.size[0] >= 250 and image.image.size[1] >= 250
                for image in second_reader.pages[2].images
            ),
            "The lean approval record should not repeat the seal image",
        )

        # Downloads reuse one linked child document and one version; the
        # source memo's stored HTML is never rewritten.
        approved_documents = Document.objects.filter(
            tags__contains=["approved-copy", f"approval-minute:{self.minute.id}"]
        )
        self.assertEqual(approved_documents.count(), 1)
        approved_document = approved_documents.get()
        self.assertEqual(approved_document.parent_document_id, self.linked_document.id)
        self.assertEqual(approved_document.role, Document.Role.ATTACHMENT)
        self.assertEqual(approved_document.versions.count(), 1)
        self.assertTrue(
            CorrespondenceDocumentLink.objects.filter(
                correspondence=self.correspondence,
                document=approved_document,
            ).exists()
        )
        self.assertEqual(
            DocumentVersion.objects.get(document=self.linked_document).content_html,
            self.memo_html,
        )

    def test_snapshot_freezes_pdf_metadata_and_hash(self):
        first = self.client.get(self.url)
        self.assertEqual(first.status_code, 200)

        snapshot = ApprovalSnapshot.objects.get(minute=self.minute)
        self.addCleanup(snapshot.pdf_file.delete, save=False)
        self.assertEqual(
            snapshot.pdf_sha256,
            hashlib.sha256(first.content).hexdigest(),
        )
        self.assertEqual(snapshot.signer_name, "Amina Bello")
        self.assertEqual(snapshot.seal_serial, self.seal.serial_number)
        self.assertEqual(snapshot.minute_text, "Approved as recommended.")
        self.assertIsNotNone(snapshot.approved_at)
        snapshot.signer_name = "Tampered"
        with self.assertRaises(ValidationError):
            snapshot.save()
        snapshot.refresh_from_db()
        self.assertEqual(snapshot.signer_name, "Amina Bello")

        self.approver.first_name = "Changed"
        self.approver.last_name = "After Approval"
        self.approver.save(update_fields=["first_name", "last_name"])

        second = self.client.get(self.url)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.content, second.content)

    def test_first_render_uses_snapshot_metadata(self):
        snapshot = get_or_create_approval_snapshot(
            minute=self.minute,
            correspondence=self.correspondence,
            seal=self.seal,
        )
        self.approver.first_name = "Changed"
        self.approver.last_name = "After Approval"
        self.approver.save(update_fields=["first_name", "last_name"])

        pdf_bytes = build_approval_pdf(
            minute=self.minute,
            correspondence=self.correspondence,
            snapshot=snapshot,
        )
        pages = [
            page.extract_text() or ""
            for page in PdfReader(io.BytesIO(pdf_bytes)).pages
        ]
        self.assertIn("Amina Bello", pages[1])
        self.assertIn("Amina Bello", pages[2])
        self.assertNotIn("Changed After Approval", "\n".join(pages))

    def test_document_check_detects_modified_pdf(self):
        approved = self.client.get(self.url)
        self.assertEqual(approved.status_code, 200)
        snapshot = ApprovalSnapshot.objects.get(minute=self.minute)
        self.addCleanup(snapshot.pdf_file.delete, save=False)

        check_url = reverse(
            "api_v1:seal_document_check", args=[self.seal.serial_number]
        )
        matches = self.client.post(
            check_url,
            {
                "file": SimpleUploadedFile(
                    "approved-copy.pdf",
                    approved.content,
                    content_type="application/pdf",
                )
            },
            format="multipart",
        )
        self.assertEqual(matches.status_code, 200)
        self.assertTrue(matches.data["matches"])

        tampered = bytearray(approved.content)
        tampered[-1] ^= 1
        altered = self.client.post(
            check_url,
            {
                "file": SimpleUploadedFile(
                    "altered-copy.pdf",
                    bytes(tampered),
                    content_type="application/pdf",
                )
            },
            format="multipart",
        )
        self.assertEqual(altered.status_code, 200)
        self.assertFalse(altered.data["matches"])

    def test_existing_archived_copy_is_frozen_without_regeneration(self):
        first = self.client.get(self.url)
        self.assertEqual(first.status_code, 200)
        old_snapshot = ApprovalSnapshot.objects.get(minute=self.minute)
        old_snapshot.pdf_file.delete(save=False)
        old_snapshot.delete()

        self.approver.first_name = "Changed"
        self.approver.last_name = "After Approval"
        self.approver.save(update_fields=["first_name", "last_name"])

        second = self.client.get(self.url)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.content, second.content)

        snapshot = ApprovalSnapshot.objects.get(minute=self.minute)
        self.addCleanup(snapshot.pdf_file.delete, save=False)
        self.assertEqual(
            snapshot.pdf_sha256,
            hashlib.sha256(first.content).hexdigest(),
        )

    def test_can_approve_only_user_can_download_executive_pdf_in_scope(self):
        self.correspondence.required_approval_level = (
            Correspondence.RequiredApprovalLevel.EXECUTIVE
        )
        self.correspondence.save(update_fields=["required_approval_level"])
        self.minute.approval_level = Minute.ApprovalLevel.EXECUTIVE
        self.minute.save(update_fields=["approval_level"])

        role = Role.objects.create(
            name=f"PDF API Approver Only {uuid.uuid4().hex[:6]}",
            permissions={"can_approve": True},
        )
        user = User.objects.create_user(
            username=f"pdf-api-approver-only-{uuid.uuid4().hex[:8]}",
            password="testpass123",
            grade_level="MSS1",
            system_role=role,
            division=self.division,
        )
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get(self.url)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response["Content-Type"], "application/pdf")
        reader = PdfReader(io.BytesIO(response.content))
        self.assertEqual(len(reader.pages), 3)
        self.assertIn("EXECUTIVE APPROVAL", reader.pages[1].extract_text() or "")
        if self.seal.seal_image:
            self.addCleanup(self.seal.seal_image.delete, save=False)

    def test_can_approve_only_user_cannot_download_out_of_scope_executive_pdf(
        self,
    ):
        self.minute.approval_level = Minute.ApprovalLevel.EXECUTIVE
        self.minute.save(update_fields=["approval_level"])

        other_division = Division.objects.create(
            directorate=self.directorate,
            name=f"PDF API Other Division {uuid.uuid4().hex[:6]}",
            code=f"PDFAPIOTHER{uuid.uuid4().hex[:6].upper()}",
        )
        role = Role.objects.create(
            name=f"PDF API Approver Only Scoped {uuid.uuid4().hex[:6]}",
            permissions={"can_approve": True},
        )
        user = User.objects.create_user(
            username=f"pdf-api-approver-only-scoped-{uuid.uuid4().hex[:8]}",
            password="testpass123",
            grade_level="MSS1",
            system_role=role,
            division=other_division,
        )
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get(self.url)

        self.assertEqual(response.status_code, 404, response.content)

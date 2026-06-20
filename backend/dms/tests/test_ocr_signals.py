from django.contrib.auth import get_user_model
from django.test import TestCase

from capture.models import CaptureJob, OCRResult
from dms.models import Document, DocumentVersion

User = get_user_model()


class OCRSignalTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="ocruser",
            password="testpass123",
        )
        self.document = Document.objects.create(
            title="OCR Test Document",
            author=self.user,
            document_type="other",
        )

    def test_creating_version_with_file_triggers_capture_job(self):
        DocumentVersion.objects.create(
            document=self.document,
            version_number=1,
            file_name="test.pdf",
            file_type="application/pdf",
            file_size=1024,
            file_url="/media/test.pdf",
            uploaded_by=self.user,
        )
        capture_jobs = CaptureJob.objects.filter(
            document=self.document,
            job_type=CaptureJob.JobType.OCR,
        )
        self.assertEqual(capture_jobs.count(), 1)

    def test_creating_version_without_file_does_not_trigger(self):
        DocumentVersion.objects.create(
            document=self.document,
            version_number=1,
            file_name="test.html",
            file_type="text/html",
            file_size=512,
            file_url="",
            uploaded_by=self.user,
        )
        self.assertEqual(
            CaptureJob.objects.filter(document=self.document).count(),
            0,
        )

    def test_creating_version_when_ocr_result_exists_skips(self):
        OCRResult.objects.create(
            document=self.document,
            capture_job=CaptureJob.objects.create(
                job_type=CaptureJob.JobType.OCR,
                status=CaptureJob.JobStatus.COMPLETED,
                document=self.document,
                created_by=self.user,
            ),
            extracted_text="Existing OCR text content",
        )
        DocumentVersion.objects.create(
            document=self.document,
            version_number=1,
            file_name="test.pdf",
            file_type="application/pdf",
            file_size=1024,
            file_url="/media/test.pdf",
            uploaded_by=self.user,
        )
        self.assertEqual(
            CaptureJob.objects.filter(
                document=self.document,
                job_type=CaptureJob.JobType.OCR,
                status=CaptureJob.JobStatus.PENDING,
            ).count(),
            0,
        )

    def test_creating_version_when_pending_job_exists_skips(self):
        CaptureJob.objects.create(
            job_type=CaptureJob.JobType.OCR,
            status=CaptureJob.JobStatus.PENDING,
            document=self.document,
            created_by=self.user,
        )
        DocumentVersion.objects.create(
            document=self.document,
            version_number=1,
            file_name="test.pdf",
            file_type="application/pdf",
            file_size=1024,
            file_url="/media/test.pdf",
            uploaded_by=self.user,
        )
        self.assertEqual(
            CaptureJob.objects.filter(
                document=self.document,
                job_type=CaptureJob.JobType.OCR,
            ).count(),
            1,
        )

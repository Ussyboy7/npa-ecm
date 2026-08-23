from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from capture.models import CaptureJob
from capture.services import queue_ocr_job
from dms.models import Document

User = get_user_model()


class QueueOCRJobTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="captureuser",
            password="testpass123",
        )
        self.document = Document.objects.create(
            title="Dedup Test",
            author=self.user,
            document_type="other",
        )

    @patch("capture.tasks.process_ocr_job.delay")
    def test_queue_ocr_job_deduplicates_active_jobs(self, mock_delay):
        first, created_first = queue_ocr_job(
            document=self.document,
            created_by=self.user,
            config={"language": "eng"},
        )
        second, created_second = queue_ocr_job(
            document=self.document,
            created_by=self.user,
            config={"language": "eng"},
        )

        self.assertTrue(created_first)
        self.assertFalse(created_second)
        self.assertEqual(first.id, second.id)
        self.assertEqual(
            CaptureJob.objects.filter(
                document=self.document,
                job_type=CaptureJob.JobType.OCR,
            ).count(),
            1,
        )
        mock_delay.assert_called_once_with(str(first.id))


class CaptureJobRetryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="retryuser",
            password="testpass123",
        )
        self.document = Document.objects.create(
            title="Retry Test",
            author=self.user,
            document_type="other",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @patch("capture.views.process_ocr_job.delay")
    def test_retry_processing_job_restarts_from_beginning(self, mock_delay):
        job = CaptureJob.objects.create(
            job_type=CaptureJob.JobType.OCR,
            status=CaptureJob.JobStatus.PROCESSING,
            document=self.document,
            created_by=self.user,
            progress_percentage=54,
            processed_items=6,
            total_items=11,
        )

        response = self.client.post(f"/api/v1/capture/jobs/{job.id}/retry/")

        self.assertEqual(response.status_code, 200)
        job.refresh_from_db()
        self.assertEqual(job.status, CaptureJob.JobStatus.PENDING)
        self.assertEqual(job.progress_percentage, 0)
        self.assertEqual(job.processed_items, 0)
        mock_delay.assert_called_once_with(str(job.id))

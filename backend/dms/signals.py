"""Signals for DMS models."""

from __future__ import annotations

from django.contrib.postgres.search import SearchVector
from django.db.models.signals import post_save
from django.dispatch import receiver

from dms.models import Document, DocumentVersion


@receiver(post_save, sender=Document)
def update_document_search_vector(sender, instance, **kwargs):
    """
    Update search vector when document is created or updated.
    """
    search_vector = (
        SearchVector("title", weight="A", config="english")
        + SearchVector("description", weight="B", config="english")
        + SearchVector("reference_number", weight="A", config="english")
        + SearchVector("tags", weight="C", config="english")
    )

    Document.objects.filter(id=instance.id).update(search_vector=search_vector)


@receiver(post_save, sender=DocumentVersion)
def auto_ocr_new_document_version(sender, instance, created, **kwargs):
    """
    Auto-enqueue OCR processing when a new document version with a file is uploaded.
    """
    if not created:
        return
    if not instance.file_url:
        return

    document = instance.document
    if not document:
        return

    # Skip if OCR already exists for this document
    from capture.models import CaptureJob, OCRResult
    if OCRResult.objects.filter(document=document).exists():
        return

    # Skip if a pending or processing OCR job already exists
    if CaptureJob.objects.filter(
        document=document,
        job_type=CaptureJob.JobType.OCR,
        status__in=[CaptureJob.JobStatus.PENDING, CaptureJob.JobStatus.PROCESSING],
    ).exists():
        return

    # Enqueue OCR via Celery
    try:
        from capture.tasks import process_ocr_job

        # Use the document version's system user (or None for anonymous)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        system_user = User.objects.filter(is_superuser=True).first()

        job = CaptureJob.objects.create(
            job_type=CaptureJob.JobType.OCR,
            status=CaptureJob.JobStatus.PENDING,
            document=document,
            config={"auto_triggered": True, "source": "auto_upload_ocr"},
            created_by=system_user,
        )
        process_ocr_job.delay(str(job.id))
    except Exception:
        import logging
        logger = logging.getLogger(__name__)
        logger.exception("Failed to auto-enqueue OCR for document version %s", instance.id)


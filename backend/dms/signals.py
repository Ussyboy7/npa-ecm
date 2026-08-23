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

    from capture.services import queue_ocr_job

    uploaded_by = instance.uploaded_by
    if not uploaded_by:
        from django.contrib.auth import get_user_model
        uploaded_by = get_user_model().objects.filter(is_superuser=True).first()

    try:
        queue_ocr_job(
            document=document,
            created_by=uploaded_by,
            config={
                "auto_triggered": True,
                "source": "auto_upload_ocr",
                "language": "eng",
                "extract_metadata": True,
            },
        )
    except Exception:
        import logging
        logger = logging.getLogger(__name__)
        logger.exception("Failed to auto-enqueue OCR for document version %s", instance.id)


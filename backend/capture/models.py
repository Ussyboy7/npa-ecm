"""Content capture models for OCR, scanning, and batch processing."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel, UUIDModel


class CaptureJob(UUIDModel, TimeStampedModel):
    """Represents a capture job (OCR, scan, or batch processing)."""

    class JobType(models.TextChoices):
        OCR = "ocr", "OCR"
        SCAN = "scan", "Scan"
        BATCH = "batch", "Batch Processing"
        METADATA_EXTRACTION = "metadata", "Metadata Extraction"

    class JobStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    # Job metadata
    job_type = models.CharField(max_length=20, choices=JobType.choices)
    status = models.CharField(
        max_length=20, choices=JobStatus.choices, default=JobStatus.PENDING
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="capture_jobs",
    )

    # Related document (if processing existing document)
    document = models.ForeignKey(
        "dms.Document",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="capture_jobs",
    )

    # Job configuration
    config = models.JSONField(default=dict, blank=True)  # OCR language, scan settings, etc.

    # Results
    result = models.JSONField(null=True, blank=True)  # Extracted text, metadata, etc.
    error_message = models.TextField(null=True, blank=True)
    processing_time_seconds = models.FloatField(null=True, blank=True)

    # Progress tracking
    progress_percentage = models.IntegerField(default=0)
    total_items = models.IntegerField(default=1)
    processed_items = models.IntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["job_type", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_job_type_display()} - {self.get_status_display()}"


class OCRResult(UUIDModel, TimeStampedModel):
    """Stores OCR extraction results for a document."""

    capture_job = models.OneToOneField(
        CaptureJob,
        on_delete=models.CASCADE,
        related_name="ocr_result",
    )
    document = models.ForeignKey(
        "dms.Document",
        on_delete=models.CASCADE,
        related_name="ocr_results",
    )

    # Extracted content
    extracted_text = models.TextField(blank=True)
    full_text = models.TextField(blank=True)  # Complete extracted text with formatting

    # OCR metadata
    confidence_score = models.FloatField(null=True, blank=True)  # Average confidence
    language = models.CharField(max_length=10, default="eng")
    page_count = models.IntegerField(default=0)

    # Per-page results
    page_results = models.JSONField(default=list, blank=True)  # [{page: 1, text: "...", confidence: 0.95}]

    # Processing metadata
    processing_time_seconds = models.FloatField(null=True, blank=True)
    ocr_engine = models.CharField(max_length=50, default="tesseract")  # tesseract, google_vision, etc.

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["document", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"OCR Result for {self.document.title}"


class ScanSession(UUIDModel, TimeStampedModel):
    """Represents a document scanning session."""

    class ScanStatus(models.TextChoices):
        INITIALIZING = "initializing", "Initializing"
        READY = "ready", "Ready"
        SCANNING = "scanning", "Scanning"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    status = models.CharField(
        max_length=20, choices=ScanStatus.choices, default=ScanStatus.INITIALIZING
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="scan_sessions",
    )

    # Scanner configuration
    scanner_name = models.CharField(max_length=255, blank=True)
    scan_settings = models.JSONField(default=dict, blank=True)  # DPI, color mode, etc.

    # Results
    scanned_documents = models.ManyToManyField(
        "dms.Document",
        blank=True,
        related_name="scan_sessions",
    )
    error_message = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Scan Session - {self.get_status_display()}"


class BatchUpload(UUIDModel, TimeStampedModel):
    """Tracks batch document uploads and processing."""

    class BatchStatus(models.TextChoices):
        UPLOADING = "uploading", "Uploading"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        PARTIAL = "partial", "Partially Completed"

    status = models.CharField(
        max_length=20, choices=BatchStatus.choices, default=BatchStatus.UPLOADING
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="batch_uploads",
    )

    # Batch metadata
    total_files = models.IntegerField(default=0)
    processed_files = models.IntegerField(default=0)
    successful_files = models.IntegerField(default=0)
    failed_files = models.IntegerField(default=0)

    # Results
    documents = models.ManyToManyField(
        "dms.Document",
        blank=True,
        related_name="batch_uploads",
    )
    errors = models.JSONField(default=list, blank=True)  # [{file: "name.pdf", error: "..."}]

    # Processing options
    process_ocr = models.BooleanField(default=False)
    extract_metadata = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Batch Upload - {self.total_files} files - {self.get_status_display()}"

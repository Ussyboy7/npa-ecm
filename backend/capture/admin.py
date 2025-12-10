"""Admin configuration for content capture module."""

from django.contrib import admin

from capture.models import BatchUpload, CaptureJob, OCRResult, ScanSession


@admin.register(CaptureJob)
class CaptureJobAdmin(admin.ModelAdmin):
    """Admin interface for CaptureJob."""

    list_display = [
        "id",
        "job_type",
        "status",
        "created_by",
        "document",
        "progress_percentage",
        "created_at",
    ]
    list_filter = ["job_type", "status", "created_at"]
    search_fields = ["id", "document__title"]
    readonly_fields = ["id", "created_at", "updated_at", "processing_time_seconds"]
    date_hierarchy = "created_at"


@admin.register(OCRResult)
class OCRResultAdmin(admin.ModelAdmin):
    """Admin interface for OCRResult."""

    list_display = [
        "id",
        "document",
        "confidence_score",
        "language",
        "page_count",
        "ocr_engine",
        "created_at",
    ]
    list_filter = ["language", "ocr_engine", "created_at"]
    search_fields = ["document__title", "extracted_text"]
    readonly_fields = ["id", "created_at", "updated_at"]
    date_hierarchy = "created_at"


@admin.register(ScanSession)
class ScanSessionAdmin(admin.ModelAdmin):
    """Admin interface for ScanSession."""

    list_display = [
        "id",
        "status",
        "created_by",
        "scanner_name",
        "created_at",
    ]
    list_filter = ["status", "created_at"]
    search_fields = ["scanner_name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    date_hierarchy = "created_at"


@admin.register(BatchUpload)
class BatchUploadAdmin(admin.ModelAdmin):
    """Admin interface for BatchUpload."""

    list_display = [
        "id",
        "status",
        "created_by",
        "total_files",
        "successful_files",
        "failed_files",
        "created_at",
    ]
    list_filter = ["status", "created_at"]
    search_fields = ["id"]
    readonly_fields = ["id", "created_at", "updated_at"]
    date_hierarchy = "created_at"

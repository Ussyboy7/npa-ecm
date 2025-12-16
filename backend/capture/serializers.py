"""Serializers for content capture module."""

from __future__ import annotations

from rest_framework import serializers

from accounts.serializers import UserSerializer
from dms.serializers import DocumentSerializer

from .models import BatchUpload, CaptureJob, OCRResult, ScanSession


class CaptureJobSerializer(serializers.ModelSerializer):
    """Serializer for CaptureJob model."""

    created_by = UserSerializer(read_only=True)
    document = DocumentSerializer(read_only=True)
    document_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = CaptureJob
        fields = [
            "id",
            "job_type",
            "status",
            "created_by",
            "document",
            "document_id",
            "config",
            "result",
            "error_message",
            "processing_time_seconds",
            "progress_percentage",
            "total_items",
            "processed_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "created_by",
            "result",
            "error_message",
            "processing_time_seconds",
            "progress_percentage",
            "total_items",
            "processed_items",
            "created_at",
            "updated_at",
        ]


class OCRResultSerializer(serializers.ModelSerializer):
    """Serializer for OCRResult model."""

    capture_job = CaptureJobSerializer(read_only=True)
    document = DocumentSerializer(read_only=True)

    class Meta:
        model = OCRResult
        fields = [
            "id",
            "capture_job",
            "document",
            "extracted_text",
            "full_text",
            "confidence_score",
            "language",
            "page_count",
            "page_results",
            "processing_time_seconds",
            "ocr_engine",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ScanSessionSerializer(serializers.ModelSerializer):
    """Serializer for ScanSession model."""

    created_by = UserSerializer(read_only=True)
    scanned_documents = DocumentSerializer(many=True, read_only=True)

    class Meta:
        model = ScanSession
        fields = [
            "id",
            "status",
            "created_by",
            "scanner_name",
            "scan_settings",
            "scanned_documents",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "created_by",
            "scanned_documents",
            "error_message",
            "created_at",
            "updated_at",
        ]


class BatchUploadSerializer(serializers.ModelSerializer):
    """Serializer for BatchUpload model."""

    created_by = UserSerializer(read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)

    class Meta:
        model = BatchUpload
        fields = [
            "id",
            "status",
            "created_by",
            "total_files",
            "processed_files",
            "successful_files",
            "failed_files",
            "documents",
            "errors",
            "process_ocr",
            "extract_metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "created_by",
            "processed_files",
            "successful_files",
            "failed_files",
            "documents",
            "errors",
            "created_at",
            "updated_at",
        ]


class OCRRequestSerializer(serializers.Serializer):
    """Serializer for OCR processing request."""

    document_id = serializers.UUIDField(required=True)
    language = serializers.CharField(default="eng", max_length=10, required=False, allow_blank=True)
    auto_detect_language = serializers.BooleanField(default=False)
    extract_metadata = serializers.BooleanField(default=False)
    force_reprocess = serializers.BooleanField(default=False)


class BatchProcessRequestSerializer(serializers.Serializer):
    """Serializer for batch processing request."""

    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=100,
    )
    process_ocr = serializers.BooleanField(default=False)
    extract_metadata = serializers.BooleanField(default=False)
    language = serializers.CharField(default="eng", max_length=10)


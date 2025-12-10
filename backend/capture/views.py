"""Views for content capture module."""

from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from capture.models import BatchUpload, CaptureJob, OCRResult, ScanSession
from capture.serializers import (
    BatchProcessRequestSerializer,
    BatchUploadSerializer,
    CaptureJobSerializer,
    OCRRequestSerializer,
    OCRResultSerializer,
    ScanSessionSerializer,
)
from capture.tasks import process_batch_upload, process_ocr_job


class CaptureJobViewSet(viewsets.ModelViewSet):
    """ViewSet for managing capture jobs."""

    queryset = CaptureJob.objects.all()
    serializer_class = CaptureJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter jobs by current user unless admin."""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(created_by=self.request.user)
        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        """Set the creator when creating a capture job."""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel a pending or processing job."""
        job = self.get_object()
        if job.status in [CaptureJob.JobStatus.PENDING, CaptureJob.JobStatus.PROCESSING]:
            job.status = CaptureJob.JobStatus.CANCELLED
            job.save(update_fields=["status"])
            return Response({"status": "cancelled"})
        return Response(
            {"error": "Job cannot be cancelled in current state"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class OCRResultViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing OCR results."""

    queryset = OCRResult.objects.all()
    serializer_class = OCRResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter results by document access."""
        queryset = super().get_queryset()
        # Add document permission filtering here if needed
        return queryset.order_by("-created_at")


class ScanSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing scan sessions."""

    queryset = ScanSession.objects.all()
    serializer_class = ScanSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter sessions by current user unless admin."""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(created_by=self.request.user)
        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        """Set the creator when creating a scan session."""
        serializer.save(created_by=self.request.user)


class BatchUploadViewSet(viewsets.ModelViewSet):
    """ViewSet for managing batch uploads."""

    queryset = BatchUpload.objects.all()
    serializer_class = BatchUploadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter uploads by current user unless admin."""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(created_by=self.request.user)
        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        """Set the creator when creating a batch upload."""
        serializer.save(created_by=self.request.user)


class CaptureViewSet(viewsets.ViewSet):
    """ViewSet for capture operations (OCR, batch processing)."""

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def process_ocr(self, request):
        """
        Process OCR for a document.

        Request body:
        {
            "document_id": "uuid",
            "language": "eng",
            "extract_metadata": true
        }
        """
        serializer = OCRRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_id = serializer.validated_data["document_id"]
        language = serializer.validated_data.get("language", "eng")
        extract_metadata = serializer.validated_data.get("extract_metadata", False)

        # Create capture job
        from dms.models import Document

        try:
            document = Document.objects.get(id=document_id)
        except Document.DoesNotExist:
            return Response(
                {"error": "Document not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        capture_job = CaptureJob.objects.create(
            job_type=CaptureJob.JobType.OCR,
            status=CaptureJob.JobStatus.PENDING,
            created_by=request.user,
            document=document,
            config={
                "language": language,
                "extract_metadata": extract_metadata,
            },
        )

        # Process asynchronously
        process_ocr_job.delay(str(capture_job.id))

        return Response(
            CaptureJobSerializer(capture_job).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"])
    def batch_process(self, request):
        """
        Process multiple documents in batch.

        Request body:
        {
            "document_ids": ["uuid1", "uuid2", ...],
            "process_ocr": true,
            "extract_metadata": true,
            "language": "eng"
        }
        """
        serializer = BatchProcessRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_ids = serializer.validated_data["document_ids"]
        process_ocr = serializer.validated_data.get("process_ocr", False)
        extract_metadata = serializer.validated_data.get("extract_metadata", False)

        # Create batch upload
        from dms.models import Document

        documents = Document.objects.filter(id__in=document_ids)
        if documents.count() != len(document_ids):
            return Response(
                {"error": "Some documents not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        batch_upload = BatchUpload.objects.create(
            status=BatchUpload.BatchStatus.UPLOADING,
            created_by=request.user,
            total_files=len(document_ids),
            process_ocr=process_ocr,
            extract_metadata=extract_metadata,
        )
        batch_upload.documents.set(documents)

        # Process asynchronously
        process_batch_upload.delay(str(batch_upload.id))

        return Response(
            BatchUploadSerializer(batch_upload).data,
            status=status.HTTP_201_CREATED,
        )

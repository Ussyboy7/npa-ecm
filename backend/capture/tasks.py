"""Celery tasks for async content capture processing."""

from __future__ import annotations

import logging
import time

from celery import shared_task

from capture.models import CaptureJob, OCRResult
from capture.services import MetadataExtractionService, OCRService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_ocr_job(self, capture_job_id: str):
    """
    Process an OCR job asynchronously.

    Args:
        capture_job_id: UUID of the CaptureJob to process
    """
    try:
        capture_job = CaptureJob.objects.get(id=capture_job_id)

        # Update status to processing
        capture_job.status = CaptureJob.JobStatus.PROCESSING
        capture_job.save(update_fields=["status"])

        start_time = time.time()

        # Get configuration
        language = capture_job.config.get("language", "eng")
        extract_metadata = capture_job.config.get("extract_metadata", False)

        # Process document
        if capture_job.document:
            ocr_result_data = OCRService.process_document(str(capture_job.document.id), language)

            # Extract metadata if requested
            metadata = None
            if extract_metadata and ocr_result_data.get("extracted_text"):
                metadata = MetadataExtractionService.extract_metadata(
                    ocr_result_data["extracted_text"]
                )

            # Create OCRResult record
            ocr_result = OCRResult.objects.create(
                capture_job=capture_job,
                document=capture_job.document,
                extracted_text=ocr_result_data.get("extracted_text", ""),
                full_text=ocr_result_data.get("full_text", ""),
                confidence_score=ocr_result_data.get("confidence_score"),
                language=language,
                page_count=ocr_result_data.get("page_count", 0),
                page_results=ocr_result_data.get("page_results", []),
                processing_time_seconds=ocr_result_data.get("processing_time_seconds"),
                ocr_engine="tesseract",
            )

            # Update the latest document version with OCR text
            from dms.models import DocumentVersion
            latest_version = capture_job.document.versions.order_by("-version_number").first()
            if latest_version:
                latest_version.ocr_text = ocr_result.extracted_text
                latest_version.save(update_fields=["ocr_text"])

            # Update capture job with results
            capture_job.result = {
                "ocr_result_id": str(ocr_result.id),
                "text_length": len(ocr_result_data.get("extracted_text", "")),
                "confidence_score": ocr_result_data.get("confidence_score"),
                "page_count": ocr_result_data.get("page_count", 0),
                "metadata": metadata,
            }
            capture_job.status = CaptureJob.JobStatus.COMPLETED
            capture_job.processing_time_seconds = time.time() - start_time
            capture_job.progress_percentage = 100
            capture_job.processed_items = 1
            capture_job.save()

            logger.info(f"OCR job {capture_job_id} completed successfully")

        else:
            raise ValueError("Capture job has no associated document")

    except CaptureJob.DoesNotExist:
        logger.error(f"Capture job {capture_job_id} not found")
        raise
    except Exception as e:
        logger.error(f"OCR job {capture_job_id} failed: {str(e)}")

        # Update job status
        try:
            capture_job = CaptureJob.objects.get(id=capture_job_id)
            capture_job.status = CaptureJob.JobStatus.FAILED
            capture_job.error_message = str(e)
            capture_job.save(update_fields=["status", "error_message"])
        except CaptureJob.DoesNotExist:
            pass

        # Retry if not max retries
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))

        raise


@shared_task
def process_batch_upload(batch_upload_id: str):
    """
    Process a batch upload asynchronously.

    Args:
        batch_upload_id: UUID of the BatchUpload to process
    """
    from capture.models import BatchUpload

    try:
        batch_upload = BatchUpload.objects.get(id=batch_upload_id)
        batch_upload.status = BatchUpload.BatchStatus.PROCESSING
        batch_upload.save(update_fields=["status"])

        # Get documents from batch
        documents = list(batch_upload.documents.all())

        successful = 0
        failed = 0
        errors = []

        for idx, document in enumerate(documents):
            try:
                # Process each document
                if batch_upload.process_ocr:
                    # Create capture job for OCR
                    capture_job = CaptureJob.objects.create(
                        job_type=CaptureJob.JobType.OCR,
                        status=CaptureJob.JobStatus.PENDING,
                        document=document,
                        config={
                            "language": "eng",
                            "extract_metadata": batch_upload.extract_metadata,
                        },
                    )

                    # Process OCR (synchronously for batch, or could be async)
                    process_ocr_job.delay(str(capture_job.id))

                successful += 1
                batch_upload.processed_files = idx + 1
                batch_upload.successful_files = successful
                batch_upload.progress_percentage = int((idx + 1) / len(documents) * 100)
                batch_upload.save(update_fields=["processed_files", "successful_files", "progress_percentage"])

            except Exception as e:
                failed += 1
                error_msg = f"Failed to process {document.title}: {str(e)}"
                errors.append({"file": document.title, "error": error_msg})
                logger.error(error_msg)

        # Update final status
        batch_upload.processed_files = len(documents)
        batch_upload.successful_files = successful
        batch_upload.failed_files = failed
        batch_upload.errors = errors

        if failed == 0:
            batch_upload.status = BatchUpload.BatchStatus.COMPLETED
        elif successful > 0:
            batch_upload.status = BatchUpload.BatchStatus.PARTIAL
        else:
            batch_upload.status = BatchUpload.BatchStatus.FAILED

        batch_upload.save()

        logger.info(f"Batch upload {batch_upload_id} completed: {successful} successful, {failed} failed")

    except BatchUpload.DoesNotExist:
        logger.error(f"Batch upload {batch_upload_id} not found")
        raise
    except Exception as e:
        logger.error(f"Batch upload {batch_upload_id} failed: {str(e)}")
        raise


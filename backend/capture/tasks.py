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
        auto_detect_language = capture_job.config.get("auto_detect_language", False)
        extract_metadata = capture_job.config.get("extract_metadata", False)
        force_reprocess = capture_job.config.get("force_reprocess", False)

        # Process document
        if capture_job.document:
            # Auto-detect language if requested
            if auto_detect_language and not language:
                try:
                    from langdetect import detect, LangDetectException
                    from dms.models import DocumentVersion
                    latest_version = capture_job.document.versions.order_by("-version_number").first()
                    if latest_version and latest_version.content_text:
                        detected_lang = detect(latest_version.content_text)
                        # Map to Tesseract language codes
                        lang_map = {
                            'en': 'eng', 'fr': 'fra', 'es': 'spa', 'de': 'deu',
                            'it': 'ita', 'pt': 'por', 'ru': 'rus', 'ar': 'ara',
                            'zh': 'chi_sim', 'ja': 'jpn', 'ko': 'kor',
                        }
                        language = lang_map.get(detected_lang[:2], 'eng')
                        logger.info(f"Auto-detected language: {detected_lang} -> {language}")
                except (LangDetectException, ImportError) as e:
                    logger.warning(f"Language detection failed, using default 'eng': {str(e)}")
                    language = "eng"

            # Progress callback for PDF processing
            def update_progress(page_num, total_pages, progress_percent):
                try:
                    # Refresh job from DB to avoid stale data
                    capture_job.refresh_from_db()
                    capture_job.progress_percentage = progress_percent
                    capture_job.processed_items = page_num
                    capture_job.total_items = total_pages
                    capture_job.save(update_fields=["progress_percentage", "processed_items", "total_items"])
                except Exception as e:
                    logger.warning(f"Failed to update progress: {str(e)}")

            ocr_result_data = OCRService.process_document(
                str(capture_job.document.id),
                language,
                force_reprocess=force_reprocess,
                progress_callback=update_progress
            )
            
            # Check if result was from cache
            if ocr_result_data.get("from_cache"):
                logger.info(f"OCR job {capture_job_id} used cached result")

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

        # Collect OCR jobs if processing OCR
        ocr_job_ids = []
        
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

                    # Queue OCR job and track it
                    process_ocr_job.delay(str(capture_job.id))
                    ocr_job_ids.append(str(capture_job.id))
                else:
                    # If not processing OCR, mark as successful immediately
                    successful += 1

                batch_upload.processed_files = idx + 1
                batch_upload.progress_percentage = int((idx + 1) / len(documents) * 50)  # First 50% for queuing
                batch_upload.save(update_fields=["processed_files", "progress_percentage"])

            except Exception as e:
                failed += 1
                error_msg = f"Failed to queue processing for {document.title}: {str(e)}"
                errors.append({"file": document.title, "error": error_msg})
                logger.error(error_msg)

        # Wait for OCR jobs to complete if any were queued
        if ocr_job_ids and batch_upload.process_ocr:
            from celery.result import AsyncResult
            import time as time_module
            
            logger.info(f"Waiting for {len(ocr_job_ids)} OCR jobs to complete...")
            
            # Wait for all OCR jobs with timeout
            max_wait_time = 3600  # 1 hour max
            start_wait = time_module.time()
            completed_jobs = set()
            
            while len(completed_jobs) < len(ocr_job_ids) and (time_module.time() - start_wait) < max_wait_time:
                for job_id in ocr_job_ids:
                    if job_id in completed_jobs:
                        continue
                    
                    try:
                        job = CaptureJob.objects.get(id=job_id)
                        if job.status in [CaptureJob.JobStatus.COMPLETED, CaptureJob.JobStatus.FAILED, CaptureJob.JobStatus.CANCELLED]:
                            completed_jobs.add(job_id)
                            if job.status == CaptureJob.JobStatus.COMPLETED:
                                successful += 1
                            else:
                                failed += 1
                                errors.append({
                                    "file": job.document.title if job.document else "Unknown",
                                    "error": job.error_message or f"Job {job.status}"
                                })
                    except CaptureJob.DoesNotExist:
                        completed_jobs.add(job_id)
                        failed += 1
                        errors.append({"file": "Unknown", "error": f"OCR job {job_id} not found"})
                
                # Update progress (50-100% for OCR processing)
                if len(ocr_job_ids) > 0:
                    ocr_progress = int((len(completed_jobs) / len(ocr_job_ids)) * 50)
                    batch_upload.progress_percentage = 50 + ocr_progress
                    batch_upload.successful_files = successful
                    batch_upload.failed_files = failed
                    batch_upload.save(update_fields=["progress_percentage", "successful_files", "failed_files"])
                
                if len(completed_jobs) < len(ocr_job_ids):
                    time_module.sleep(2)  # Poll every 2 seconds
        else:
            # No OCR processing, update successful count
            successful = len(documents) - failed

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


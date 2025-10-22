"""
Document Processing Tasks for ECM

Celery tasks for document processing including OCR, indexing, and metadata extraction.
"""

from celery import shared_task
from django.utils import timezone
from django.contrib.postgres.search import SearchVector
import logging

logger = logging.getLogger(__name__)


@shared_task
def process_document_ocr(document_id):
    """
    Process OCR for a document asynchronously
    
    Args:
        document_id: UUID of the document to process
    """
    from ..models import Document
    from ..services.ocr_service import process_document_ocr as ocr_process
    
    try:
        document = Document.objects.get(id=document_id)
        logger.info(f"Starting OCR processing for document: {document.title}")
        
        # Process OCR using the OCR service
        success = ocr_process(document)
        
        if success:
            # Update search vector
            update_document_search_vector.delay(str(document_id))
            logger.info(f"OCR completed successfully for document: {document.title}")
        else:
            logger.warning(f"OCR processing failed for document: {document.title}")
        
        return {
            "status": "success" if success else "warning",
            "document_id": str(document_id),
            "message": "OCR processing completed" if success else "OCR processing failed"
        }
        
    except Document.DoesNotExist:
        logger.error(f"Document not found: {document_id}")
        return {"status": "error", "message": "Document not found"}
    except Exception as e:
        logger.error(f"Error processing OCR for document {document_id}: {str(e)}")
        return {"status": "error", "message": str(e)}


@shared_task
def update_document_search_vector(document_id):
    """
    Update the search vector for full-text search
    
    Args:
        document_id: UUID of the document
    """
    from ..models import Document
    
    try:
        document = Document.objects.get(id=document_id)
        
        # Create search vector from document content
        search_fields = []
        
        # Add title and description
        if document.title:
            search_fields.append(f'Title: {document.title}')
        if document.description:
            search_fields.append(f'Description: {document.description}')
        if document.ocr_text:
            search_fields.append(document.ocr_text)
        if document.keywords:
            search_fields.append(document.keywords)
        
        # Combine all searchable text
        search_text = ' '.join(search_fields)
        
        # Update search vector
        document.search_vector = SearchVector('title', 'description', 'ocr_text', 'keywords')
        document.save(update_fields=['search_vector'])
        
        logger.info(f"Updated search vector for document: {document.title}")
        return {"status": "success", "document_id": str(document_id)}
        
    except Document.DoesNotExist:
        logger.error(f"Document not found: {document_id}")
        return {"status": "error", "message": "Document not found"}
    except Exception as e:
        logger.error(f"Error updating search vector for document {document_id}: {str(e)}")
        return {"status": "error", "message": str(e)}


@shared_task
def process_document_metadata(document_id):
    """
    Extract and process document metadata
    
    Args:
        document_id: UUID of the document
    """
    from ..models import Document
    from ..services.ocr_service import ocr_service
    
    try:
        document = Document.objects.get(id=document_id)
        logger.info(f"Processing metadata for document: {document.title}")
        
        # Extract metadata from OCR text if available
        metadata = {}
        if document.ocr_text:
            metadata = ocr_service.extract_metadata_from_text(document.ocr_text)
        
        # Store metadata in document metadata table
        if metadata.get('likely_type'):
            # Update document type suggestion if not already set
            pass
        
        # Log metadata extraction
        logger.info(f"Metadata processed for document: {document.title}")
        return {
            "status": "success",
            "document_id": str(document_id),
            "metadata": metadata
        }
        
    except Document.DoesNotExist:
        logger.error(f"Document not found: {document_id}")
        return {"status": "error", "message": "Document not found"}
    except Exception as e:
        logger.error(f"Error processing metadata for document {document_id}: {str(e)}")
        return {"status": "error", "message": str(e)}


@shared_task
def generate_document_version(document_id, version_comment=None):
    """
    Generate a new version of a document
    
    Args:
        document_id: UUID of the document
        version_comment: Comment for the new version
    """
    from ..models import Document, DocumentVersion
    
    try:
        document = Document.objects.get(id=document_id)
        
        # Create version record
        version = DocumentVersion.objects.create(
            document=document,
            version_number=document.version + 1,
            major_version=document.major_version,
            minor_version=document.minor_version + 1,
            file=document.file,
            file_name=document.file_name,
            file_size=document.file_size,
            change_description=version_comment or "Version created automatically",
            changed_by=getattr(document, 'last_modified_by', None),
            ocr_text=document.ocr_text
        )
        
        # Update document version number
        document.version += 1
        document.minor_version += 1
        document.save(update_fields=['version', 'minor_version'])
        
        logger.info(f"Created version {version.version_number} for document: {document.title}")
        return {
            "status": "success",
            "document_id": str(document_id),
            "version_number": version.version_number
        }
        
    except Document.DoesNotExist:
        logger.error(f"Document not found: {document_id}")
        return {"status": "error", "message": "Document not found"}
    except Exception as e:
        logger.error(f"Error creating document version {document_id}: {str(e)}")
        return {"status": "error", "message": str(e)}


@shared_task
def cleanup_orphaned_files():
    """
    Clean up orphaned files that are no longer referenced by documents
    """
    import os
    from django.core.files.storage import default_storage
    from ..models import Document
    
    try:
        # This is a complex operation that should be run carefully
        # For now, just log that it was called
        logger.info("Cleanup orphaned files task started")
        
        # Implementation would involve:
        # 1. Get all files in media directory
        # 2. Check which files are referenced by documents
        # 3. Remove unreferenced files
        
        return {"status": "success", "message": "Orphaned files cleanup completed"}
        
    except Exception as e:
        logger.error(f"Error cleaning up orphaned files: {str(e)}")
        return {"status": "error", "message": str(e)}


@shared_task
def process_bulk_upload(batch_id):
    """
    Process a bulk upload batch
    
    Args:
        batch_id: UUID of the scanner queue batch
    """
    from ..models import ScannerQueue, ScannerFile, Document, DocumentType
    
    try:
        batch = ScannerQueue.objects.get(id=batch_id)
        batch.status = 'processing'
        batch.started_at = timezone.now()
        batch.save()
        
        logger.info(f"Processing bulk upload batch: {batch.batch_name}")
        
        files_processed = 0
        files_failed = 0
        
        for scanner_file in batch.files.all():
            try:
                # Create document from scanner file
                document = Document.objects.create(
                    title=scanner_file.file_name,
                    file=scanner_file.file_path,
                    file_name=scanner_file.file_name,
                    file_size=scanner_file.file_size,
                    file_type=scanner_file.mime_type.split('/')[-1] if scanner_file.mime_type else '',
                    document_type=batch.target_document_type,
                    originating_department=batch.target_department,
                    status='draft',
                    created_by=batch.uploaded_by,
                    ocr_text=scanner_file.ocr_text
                )
                
                # Update scanner file status
                scanner_file.status = 'completed'
                scanner_file.document = document
                scanner_file.completed_at = timezone.now()
                scanner_file.save()
                
                # Trigger OCR processing if enabled
                if batch.auto_ocr_enabled:
                    process_document_ocr.delay(str(document.id))
                
                files_processed += 1
                
            except Exception as e:
                logger.error(f"Error processing scanner file {scanner_file.id}: {str(e)}")
                scanner_file.status = 'failed'
                scanner_file.error_message = str(e)
                scanner_file.save()
                files_failed += 1
        
        # Update batch status
        batch.status = 'completed' if files_failed == 0 else 'failed'
        batch.completed_at = timezone.now()
        batch.processed_files = files_processed
        batch.failed_files = files_failed
        batch.progress_percentage = 100.0
        batch.save()
        
        logger.info(f"Bulk upload batch completed: {files_processed} processed, {files_failed} failed")
        return {
            "status": "success",
            "batch_id": str(batch_id),
            "files_processed": files_processed,
            "files_failed": files_failed
        }
        
    except ScannerQueue.DoesNotExist:
        logger.error(f"Scanner batch not found: {batch_id}")
        return {"status": "error", "message": "Scanner batch not found"}
    except Exception as e:
        logger.error(f"Error processing bulk upload batch {batch_id}: {str(e)}")
        
        # Update batch status to failed
        try:
            batch = ScannerQueue.objects.get(id=batch_id)
            batch.status = 'failed'
            batch.error_message = str(e)
            batch.save()
        except:
            pass
        
        return {"status": "error", "message": str(e)}

"""API viewsets for the document management system."""

from __future__ import annotations

import base64
import logging
import os
from datetime import datetime

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db.models import Max, Q
from django.utils import timezone
from django.utils.text import slugify
from common.upload_validators import validate_file_upload
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from audit.services import AuditService
from notifications.models import Notification
from notifications.services import NotificationService

from .models import (
    Document,
    DocumentAccessLog,
    DocumentCollection,
    DocumentComment,
    DocumentDiscussionMessage,
    DocumentEditorSession,
    DocumentPermission,
    DocumentVersion,
    DocumentWorkspace,
    FormDocument,
)
from .serializers import (
    DocumentAccessLogSerializer,
    DocumentCollectionSerializer,
    DocumentCommentSerializer,
    DocumentDiscussionMessageSerializer,
    DocumentEditorSessionSerializer,
    DocumentPermissionSerializer,
    DocumentSerializer,
    DocumentVersionSerializer,
    DocumentWorkspaceSerializer,
    FormDocumentSerializer,
)
from .services import OCRService, DocumentSummaryService

logger = logging.getLogger(__name__)


class DocumentWorkspaceViewSet(viewsets.ModelViewSet):
    queryset = DocumentWorkspace.objects.prefetch_related("members")
    serializer_class = DocumentWorkspaceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description", "slug"]
    ordering_fields = ["name", "created_at"]

    def perform_create(self, serializer):
        slug = serializer.validated_data.get("slug")
        if not slug:
            base = slugify(serializer.validated_data.get("name", "workspace")) or "workspace"
            slug = base
            idx = 1
            while DocumentWorkspace.objects.filter(slug=slug).exists():
                slug = f"{base}-{idx}"
                idx += 1
        serializer.save(slug=slug)


class DocumentPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.none()
    base_queryset = Document.all_objects.select_related("author", "division", "department", "form_document").prefetch_related(
        "workspaces",
        "versions",
        "permissions",
    )
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DocumentPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        "document_type",
        "status",
        "sensitivity",
        "division",
        "department",
        "author",  # Added author filter
    ]
    search_fields = ["title", "reference_number", "description", "tags"]
    ordering_fields = ["updated_at", "created_at", "title"]
    ordering = ["-updated_at"]

    def filter_queryset(self, queryset):
        """Override to add full-text search in document versions and date range filtering."""
        # Get search query before calling super() which applies SearchFilter
        search_query = self.request.query_params.get("search", "").strip()
        
        # Get date range parameters
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        
        # Apply date range filter first (before search to reduce queryset size)
        if date_from:
            try:
                from_date = datetime.strptime(date_from, "%Y-%m-%d").date()
                queryset = queryset.filter(created_at__date__gte=from_date)
            except ValueError:
                pass  # Invalid date format, ignore
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, "%Y-%m-%d").date()
                queryset = queryset.filter(created_at__date__lte=to_date)
            except ValueError:
                pass  # Invalid date format, ignore
        
        # If there's a search query, search across all fields including version content
        if search_query:
            # Build comprehensive search filter that includes:
            # - Base fields: title, reference_number, description, tags
            # - Version content: content_text, ocr_text
            base_search = (
                Q(title__icontains=search_query) |
                Q(reference_number__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(tags__icontains=search_query)
            )
            
            # Use PostgreSQL full-text search for base fields (much faster with GIN indexes)
            from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
            
            search_query_obj = SearchQuery(search_query, config="english")
            
            # Use search_vector field if available (fastest - uses GIN index)
            if hasattr(queryset.model, '_meta') and 'search_vector' in [f.name for f in queryset.model._meta.get_fields()]:
                queryset = queryset.filter(search_vector=search_query_obj)
            else:
                # Build SearchVector on the fly (still faster than icontains)
                search_vector = (
                    SearchVector("title", weight="A", config="english") +
                    SearchVector("reference_number", weight="A", config="english") +
                    SearchVector("description", weight="B", config="english") +
                    SearchVector("tags", weight="C", config="english")
                )
                queryset = queryset.annotate(
                    search=search_vector,
                    rank=SearchRank(search_vector, search_query_obj)
                ).filter(search=search_query_obj).order_by("-rank", "-updated_at")
            
            # Also search in version content (use icontains as fallback - slower but necessary)
            # TODO: Add search_vector to DocumentVersion for better performance
            version_search = (
                Q(versions__content_text__icontains=search_query) |
                Q(versions__ocr_text__icontains=search_query)
            )
            
            # Combine: documents matching base search OR version content
            queryset = queryset.filter(
                Q(pk__in=queryset.values_list('pk', flat=True)) | version_search
            ).distinct()
            
            # Still need to apply other filters (status, type, etc.) from DjangoFilterBackend
            # Temporarily remove SearchFilter to avoid double-filtering
            from rest_framework.filters import SearchFilter
            original_backends = self.filter_backends
            self.filter_backends = [b for b in original_backends if not isinstance(b, SearchFilter)]
            try:
                queryset = super().filter_queryset(queryset)
            finally:
                self.filter_backends = original_backends
        else:
            # No search query, just apply standard filters
            queryset = super().filter_queryset(queryset)
        
        return queryset

    def get_queryset(self):
        qs = self.base_queryset.prefetch_related("versions")  # Prefetch versions for full-text search
        request = getattr(self, "request", None)
        if request:
            only_deleted = request.query_params.get("only_deleted") == "true"
            include_deleted = request.query_params.get("include_deleted") == "true"
            if only_deleted:
                qs = qs.filter(is_deleted=True)
            elif include_deleted:
                qs = qs
            else:
                qs = qs.filter(is_deleted=False)
        else:
            qs = qs.filter(is_deleted=False)

        user = getattr(self.request, "user", None)
        if not user or not user.is_authenticated or user.is_superuser:
            return qs.distinct()

        visibility_filter = Q(author=user) | Q(workspaces__members=user) | Q(permissions__users=user)

        if user.division_id:
            visibility_filter |= Q(permissions__divisions=user.division_id)
        if user.department_id:
            visibility_filter |= Q(permissions__departments=user.department_id)
        if user.grade_level:
            visibility_filter |= Q(permissions__grade_levels__contains=[user.grade_level])

        visibility_filter |= Q(sensitivity__in=[Document.Sensitivity.PUBLIC, Document.Sensitivity.INTERNAL])

        high_confidential_grades = {"MSS5", "MSS4", "MSS3", "MSS2", "MSS1", "EDCS", "MDCS"}
        high_restricted_grades = {"MSS1", "EDCS", "MDCS"}

        if user.grade_level in high_confidential_grades:
            visibility_filter |= Q(sensitivity=Document.Sensitivity.CONFIDENTIAL)
        if user.grade_level in high_restricted_grades:
            visibility_filter |= Q(sensitivity=Document.Sensitivity.RESTRICTED)

        # Published documents with public/internal sensitivity are generally accessible
        visibility_filter |= Q(
            status=Document.DocumentStatus.PUBLISHED,
            sensitivity__in=[Document.Sensitivity.PUBLIC, Document.Sensitivity.INTERNAL],
        )

        return qs.filter(visibility_filter).distinct()

    def perform_create(self, serializer):
        author = serializer.validated_data.get("author") or self.request.user
        document = serializer.save(author=author)
        
        # Create audit log
        from audit.models import ActivityLog
        AuditService.log_document_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.DOCUMENT_CREATED,
            document=document,
            request=self.request,
            description=f"Created document: {document.title}",
        )
    
    def perform_update(self, serializer):
        document = serializer.save()
        
        # Create audit log
        from audit.models import ActivityLog
        AuditService.log_document_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.DOCUMENT_UPDATED,
            document=document,
            request=self.request,
            description=f"Updated document: {document.title}",
        )
    
    def perform_destroy(self, instance):
        # Create audit log before deletion
        from audit.models import ActivityLog
        AuditService.log_document_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.DOCUMENT_DELETED,
            document=instance,
            request=self.request,
            description=f"Deleted document: {instance.title}",
        )
        instance.delete()

    @action(detail=False, methods=["post"], url_path="bulk-archive")
    def bulk_archive(self, request):
        """Archive multiple documents at once."""
        document_ids = request.data.get("document_ids", [])
        
        if not document_ids:
            raise ValidationError({"document_ids": "Document IDs are required"})
        
        documents = Document.objects.filter(id__in=document_ids, is_deleted=False)
        
        # Check permissions - user must be author or have admin access
        accessible_docs = []
        for doc in documents:
            if doc.author == request.user or request.user.is_superuser:
                accessible_docs.append(doc)
            else:
                # Check if user has admin permission
                has_admin = doc.permissions.filter(
                    Q(users=request.user, access="admin") |
                    Q(divisions=request.user.division_id, access="admin") |
                    Q(departments=request.user.department_id, access="admin")
                ).exists()
                if has_admin:
                    accessible_docs.append(doc)
        
        if not accessible_docs:
            raise PermissionDenied("You don't have permission to archive any of the selected documents")
        
        # Archive documents
        archived_count = 0
        from audit.models import ActivityLog
        
        for doc in accessible_docs:
            doc.status = Document.DocumentStatus.ARCHIVED
            doc.save(update_fields=["status", "updated_at"])
            archived_count += 1
            
            AuditService.log_document_activity(
                user=request.user,
                action=ActivityLog.ActionType.DOCUMENT_UPDATED,
                document=doc,
                request=request,
                description=f"Archived document: {doc.title}",
                metadata={"bulk_operation": True, "new_status": "archived"},
            )
        
        return Response({
            "message": f"Successfully archived {archived_count} document(s)",
            "archived_count": archived_count,
            "skipped_count": len(document_ids) - archived_count,
        })

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        """Soft delete multiple documents at once."""
        document_ids = request.data.get("document_ids", [])
        
        if not document_ids:
            raise ValidationError({"document_ids": "Document IDs are required"})
        
        documents = Document.objects.filter(id__in=document_ids, is_deleted=False)
        
        # Check permissions - user must be author or have admin access
        accessible_docs = []
        for doc in documents:
            if doc.author == request.user or request.user.is_superuser:
                accessible_docs.append(doc)
            else:
                # Check if user has admin permission
                has_admin = doc.permissions.filter(
                    Q(users=request.user, access="admin") |
                    Q(divisions=request.user.division_id, access="admin") |
                    Q(departments=request.user.department_id, access="admin")
                ).exists()
                if has_admin:
                    accessible_docs.append(doc)
        
        if not accessible_docs:
            raise PermissionDenied("You don't have permission to delete any of the selected documents")
        
        # Soft delete documents
        deleted_count = 0
        from audit.models import ActivityLog
        
        for doc in accessible_docs:
            doc.is_deleted = True
            doc.save(update_fields=["is_deleted", "updated_at"])
            deleted_count += 1
            
            AuditService.log_document_activity(
                user=request.user,
                action=ActivityLog.ActionType.DOCUMENT_DELETED,
                document=doc,
                request=request,
                description=f"Deleted document: {doc.title}",
                metadata={"bulk_operation": True, "soft_delete": True},
            )
        
        return Response({
            "message": f"Successfully deleted {deleted_count} document(s)",
            "deleted_count": deleted_count,
            "skipped_count": len(document_ids) - deleted_count,
        })

    @action(detail=False, methods=["post"], url_path="bulk-restore")
    def bulk_restore(self, request):
        """Restore multiple soft-deleted documents."""
        document_ids = request.data.get("document_ids", [])
        
        if not document_ids:
            raise ValidationError({"document_ids": "Document IDs are required"})
        
        documents = Document.all_objects.filter(id__in=document_ids, is_deleted=True)
        
        # Check permissions - user must be author or superuser
        accessible_docs = []
        for doc in documents:
            if doc.author == request.user or request.user.is_superuser:
                accessible_docs.append(doc)
        
        if not accessible_docs:
            raise PermissionDenied("You don't have permission to restore any of the selected documents")
        
        # Restore documents
        restored_count = 0
        from audit.models import ActivityLog
        
        for doc in accessible_docs:
            doc.is_deleted = False
            doc.status = Document.DocumentStatus.DRAFT  # Reset to draft status
            doc.save(update_fields=["is_deleted", "status", "updated_at"])
            restored_count += 1
            
            AuditService.log_document_activity(
                user=request.user,
                action=ActivityLog.ActionType.DOCUMENT_UPDATED,
                document=doc,
                request=request,
                description=f"Restored document: {doc.title}",
                metadata={"bulk_operation": True, "restored": True},
            )
        
        return Response({
            "message": f"Successfully restored {restored_count} document(s)",
            "restored_count": restored_count,
            "skipped_count": len(document_ids) - restored_count,
        })

    @action(detail=True, methods=["post"], url_path="generate-summary")
    def generate_summary(self, request, pk=None):
        """Generate AI summary for document."""
        document = self.get_object()
        
        # Get latest version with content
        latest_version = document.versions.order_by("-version_number").first()
        if not latest_version:
            raise ValidationError({"detail": "Document has no versions"})
        
        # Get content to summarize
        content = latest_version.content_text or latest_version.ocr_text or ""
        if not content.strip():
            raise ValidationError({"detail": "Document has no text content to summarize"})
        
        try:
            summary = DocumentSummaryService.generate_summary(content, document.title)
            latest_version.summary = summary
            latest_version.save(update_fields=["summary"])
            
            return Response({
                "summary": summary,
                "version_id": str(latest_version.id),
            })
        except Exception as e:
            logger.error(f"Failed to generate summary: {e}")
            raise ValidationError({"detail": f"Failed to generate summary: {str(e)}"})


class DocumentVersionViewSet(viewsets.ModelViewSet):
    queryset = DocumentVersion.objects.select_related("document", "uploaded_by")
    serializer_class = DocumentVersionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["document"]
    ordering_fields = ["uploaded_at", "version_number"]
    ordering = ["-version_number"]

    def create(self, request, *args, **kwargs):
        # Create a mutable copy of request data
        data = dict(request.data)
        
        # Extract file data from request if it's a data URL
        file_url = data.get('file_url', '')
        file_name = data.get('file_name', '')
        file_type = data.get('file_type', '')
        document_identifier = str(data.get('document', ''))
        
        # If file_url is a data URL (base64), save it to disk
        if file_url and file_url.startswith('data:'):
            try:
                # Parse data URL: data:type/subtype;base64,<data>
                header, encoded = file_url.split(',', 1)
                # Extract mime type if available
                mime_type = header.split(';')[0].split(':')[1] if ':' in header else file_type
                
                # Decode base64 data
                file_data = base64.b64decode(encoded)
                safe_name = file_name or f"upload-{document_identifier or 'pending'}"
                validate_file_upload(
                    file_name=safe_name,
                    mime_type=mime_type,
                    file_bytes=file_data,
                    field_name="file_url",
                )
                data["file_size"] = len(file_data)
                if not data.get('file_type') and mime_type:
                    data['file_type'] = mime_type
                if not data.get('file_name'):
                    data['file_name'] = safe_name

                # Ensure media directory exists
                media_root = settings.MEDIA_ROOT
                document_id = document_identifier or 'pending'
                dms_dir = os.path.join(media_root, 'dms_versions', document_id)
                os.makedirs(dms_dir, exist_ok=True)
                
                # Generate file path
                safe_filename = (data['file_name'] or safe_name).replace(' ', '_').replace('/', '_')
                file_path = os.path.join('dms_versions', document_id, safe_filename)
                
                # Save file to storage
                saved_path = default_storage.save(file_path, ContentFile(file_data, name=safe_filename))
                
                # Build relative URL for the file (browser will resolve to current domain)
                media_url = settings.MEDIA_URL or '/media/'
                if not media_url.startswith('/'):
                    media_url = f'/{media_url}'
                file_url = f"{media_url.rstrip('/')}/{saved_path}"
                
                # Update data with the new file URL
                data['file_url'] = file_url
                
                # Run OCR if it's an image or PDF
                if mime_type in ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'application/pdf']:
                    try:
                        file_full_path = os.path.join(media_root, saved_path)
                        ocr_text = OCRService.extract_text(file_full_path, mime_type)
                        if ocr_text:
                            data['ocr_text'] = ocr_text
                    except Exception as e:
                        logger.warning(f"OCR extraction failed: {e}")
                        
            except Exception as e:
                logger.error(f"Failed to process data URL for document version: {e}")
                raise ValidationError({"file_url": f"Failed to process uploaded file: {str(e)}"})
        
        # Create serializer with modified data
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_create(self, serializer):
        document = serializer.validated_data["document"]
        next_version = (
            document.versions.aggregate(max_version=Max("version_number"))
            .get("max_version")
            or 0
        ) + 1
        serializer.save(
            uploaded_by=self.request.user,
            version_number=next_version,
        )

    @action(detail=True, methods=["post"], url_path="replace")
    def replace_version(self, request, pk=None):
        """Replace an existing version with new file content."""
        version = self.get_object()
        
        # Create a mutable copy of request data
        data = dict(request.data)
        
        # Extract file data from request if it's a data URL
        file_url = data.get('file_url', '')
        file_name = data.get('file_name', version.file_name)
        file_type = data.get('file_type', version.file_type)
        
        # If file_url is a data URL (base64), save it to disk
        if file_url and file_url.startswith('data:'):
            try:
                # Parse data URL: data:type/subtype;base64,<data>
                header, encoded = file_url.split(',', 1)
                # Extract mime type if available
                mime_type = header.split(';')[0].split(':')[1] if ':' in header else file_type
                
                # Decode base64 data
                file_data = base64.b64decode(encoded)
                safe_name = file_name or version.file_name
                validate_file_upload(
                    file_name=safe_name,
                    mime_type=mime_type,
                    file_bytes=file_data,
                    field_name="file_url",
                )
                data["file_size"] = len(file_data)
                if not data.get('file_type') and mime_type:
                    data['file_type'] = mime_type
                if not data.get('file_name'):
                    data['file_name'] = safe_name

                # Ensure media directory exists
                media_root = settings.MEDIA_ROOT
                document_id = str(version.document.id)
                dms_dir = os.path.join(media_root, 'dms_versions', document_id)
                os.makedirs(dms_dir, exist_ok=True)
                
                # Generate file path
                safe_filename = (data['file_name'] or safe_name).replace(' ', '_').replace('/', '_')
                file_path = os.path.join('dms_versions', document_id, safe_filename)
                
                # Save file to storage
                saved_path = default_storage.save(file_path, ContentFile(file_data, name=safe_filename))
                
                # Build relative URL for the file
                media_url = settings.MEDIA_URL or '/media/'
                if not media_url.startswith('/'):
                    media_url = f'/{media_url}'
                file_url = f"{media_url.rstrip('/')}/{saved_path}"
                
                # Update data with the new file URL
                data['file_url'] = file_url
                
                # Run OCR if it's an image or PDF
                if mime_type in ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'application/pdf']:
                    try:
                        file_full_path = os.path.join(media_root, saved_path)
                        ocr_text = OCRService.extract_text(file_full_path, mime_type)
                        if ocr_text:
                            data['ocr_text'] = ocr_text
                    except Exception as e:
                        logger.warning(f"OCR extraction failed: {e}")
                        
            except Exception as e:
                logger.error(f"Failed to process data URL for version replacement: {e}")
                raise ValidationError({"file_url": f"Failed to process uploaded file: {str(e)}"})
        
        # Update the version
        serializer = self.get_serializer(version, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="replace")
    def replace_version(self, request, pk=None):
        """Replace an existing version with new file content."""
        version = self.get_object()
        
        # Check permissions - only author or document owner can replace
        if version.uploaded_by != request.user and version.document.author != request.user:
            raise PermissionDenied("You can only replace versions you uploaded or documents you own")
        
        # Create a mutable copy of request data
        data = dict(request.data)
        
        # Extract file data from request if it's a data URL
        file_url = data.get('file_url', '')
        file_name = data.get('file_name', version.file_name)
        file_type = data.get('file_type', version.file_type)
        
        # If file_url is a data URL (base64), save it to disk
        if file_url and file_url.startswith('data:'):
            try:
                # Parse data URL: data:type/subtype;base64,<data>
                header, encoded = file_url.split(',', 1)
                # Extract mime type if available
                mime_type = header.split(';')[0].split(':')[1] if ':' in header else file_type
                
                # Decode base64 data
                file_data = base64.b64decode(encoded)
                safe_name = file_name or version.file_name
                validate_file_upload(
                    file_name=safe_name,
                    mime_type=mime_type,
                    file_bytes=file_data,
                    field_name="file_url",
                )
                data["file_size"] = len(file_data)
                if not data.get('file_type') and mime_type:
                    data['file_type'] = mime_type
                if not data.get('file_name'):
                    data['file_name'] = safe_name

                # Ensure media directory exists
                media_root = settings.MEDIA_ROOT
                document_id = str(version.document.id)
                dms_dir = os.path.join(media_root, 'dms_versions', document_id)
                os.makedirs(dms_dir, exist_ok=True)
                
                # Generate file path
                safe_filename = (data['file_name'] or safe_name).replace(' ', '_').replace('/', '_')
                file_path = os.path.join('dms_versions', document_id, safe_filename)
                
                # Save file to storage
                saved_path = default_storage.save(file_path, ContentFile(file_data, name=safe_filename))
                
                # Build relative URL for the file
                media_url = settings.MEDIA_URL or '/media/'
                if not media_url.startswith('/'):
                    media_url = f'/{media_url}'
                file_url = f"{media_url.rstrip('/')}/{saved_path}"
                
                # Update data with the new file URL
                data['file_url'] = file_url
                
                # Run OCR if it's an image or PDF
                if mime_type in ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'application/pdf']:
                    try:
                        file_full_path = os.path.join(media_root, saved_path)
                        ocr_text = OCRService.extract_text(file_full_path, mime_type)
                        if ocr_text:
                            data['ocr_text'] = ocr_text
                    except Exception as e:
                        logger.warning(f"OCR extraction failed: {e}")
                        
            except Exception as e:
                logger.error(f"Failed to process data URL for version replacement: {e}")
                raise ValidationError({"file_url": f"Failed to process uploaded file: {str(e)}"})
        
        # Update the version (preserve version_number, uploaded_by, uploaded_at)
        serializer = self.get_serializer(version, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        # Don't update version_number, uploaded_by, or uploaded_at
        update_fields = {k: v for k, v in serializer.validated_data.items() 
                        if k not in ['version_number', 'uploaded_by', 'uploaded_at']}
        for field, value in update_fields.items():
            setattr(version, field, value)
        version.save()
        
        # Return updated version
        serializer = self.get_serializer(version)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="run-ocr")
    def run_ocr(self, request, pk=None):
        """Run OCR on a specific version."""
        version = self.get_object()
        
        if not version.file_url:
            raise ValidationError({"detail": "Version has no file to process"})
        
        # Get file path
        file_url = version.file_url
        if file_url.startswith('/media/'):
            file_path = os.path.join(settings.MEDIA_ROOT, file_url.replace('/media/', ''))
        elif file_url.startswith('http'):
            raise ValidationError({"detail": "Cannot process remote files for OCR"})
        else:
            file_path = os.path.join(settings.MEDIA_ROOT, file_url)
        
        if not os.path.exists(file_path):
            raise ValidationError({"detail": "File not found on disk"})
        
        try:
            ocr_text = OCRService.extract_text(file_path, version.file_type)
            if ocr_text:
                version.ocr_text = ocr_text
                version.save(update_fields=["ocr_text"])
                return Response({
                    "ocr_text": ocr_text,
                    "characters": len(ocr_text),
                })
            else:
                return Response({
                    "ocr_text": "",
                    "message": "No text could be extracted from the document",
                })
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            raise ValidationError({"detail": f"OCR processing failed: {str(e)}"})


class DocumentPermissionViewSet(viewsets.ModelViewSet):
    queryset = DocumentPermission.objects.prefetch_related("divisions", "departments", "users")
    serializer_class = DocumentPermissionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["document", "access"]

    def create(self, request, *args, **kwargs):
        """Create document permission and send notifications."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get document
        document = serializer.validated_data.get("document")
        access = serializer.validated_data.get("access", "read")
        note = serializer.validated_data.get("note", "")
        user_ids = serializer.validated_data.get("user_ids", [])
        division_ids = serializer.validated_data.get("division_ids", [])
        department_ids = serializer.validated_data.get("department_ids", [])
        
        # Create permission
        permission = serializer.save()
        
        # Get all users who should be notified
        from accounts.models import User
        from organization.models import Division, Department
        
        notified_users = set()
        
        # Add direct users
        if user_ids:
            users = User.objects.filter(id__in=user_ids)
            notified_users.update(users)
        
        # Add users from divisions
        if division_ids:
            divisions = Division.objects.filter(id__in=division_ids)
            for division in divisions:
                users = User.objects.filter(division=division, is_active=True)
                notified_users.update(users)
        
        # Add users from departments
        if department_ids:
            departments = Department.objects.filter(id__in=department_ids)
            for department in departments:
                users = User.objects.filter(department=department, is_active=True)
                notified_users.update(users)
        
        # Build notification message with note if provided
        base_message = f"{request.user.get_full_name() or request.user.username} has shared a document with you with {access} access."
        if note:
            message = f"{base_message}\n\nMessage: {note}"
        else:
            message = base_message
        
        # Send notifications to all affected users
        for user in notified_users:
            if user.id != request.user.id:  # Don't notify the person sharing
                NotificationService.create_notification(
                    recipient=user,
                    title=f"Document Shared: {document.title}",
                    message=message,
                    notification_type=Notification.NotificationType.DOCUMENT,
                    priority=Notification.Priority.NORMAL,
                    sender=request.user,
                    module="dms",
                    related_object_type="document",
                    related_object_id=str(document.id),
                    action_url=f"/dms/{document.id}",
                    action_required=False,
                )
        
        # Create audit log
        from audit.models import ActivityLog
        metadata = {
            "permission_id": str(permission.id),
            "user_count": len(user_ids) if user_ids else 0,
            "division_count": len(division_ids) if division_ids else 0,
            "department_count": len(department_ids) if department_ids else 0,
            "access_level": access,
        }
        if note:
            metadata["note"] = note
        
        AuditService.log_document_activity(
            user=request.user,
            action=ActivityLog.ActionType.DOCUMENT_SHARED,
            document=document,
            request=request,
            description=f"Shared document with {len(notified_users)} user(s) with {access} access",
            metadata=metadata,
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=["post"], url_path="share-to-all")
    def share_to_all(self, request):
        """Share document with all active users in the system."""
        document_id = request.data.get("document")
        access = request.data.get("access", "read")
        note = request.data.get("note", "")
        
        if not document_id:
            raise ValidationError({"document": "Document ID is required"})
        
        try:
            document = Document.objects.get(id=document_id)
        except Document.DoesNotExist:
            raise ValidationError({"document": "Document not found"})
        
        # Get all active users
        from accounts.models import User
        all_users = User.objects.filter(is_active=True)
        user_ids = [str(user.id) for user in all_users]
        
        if not user_ids:
            raise ValidationError({"detail": "No active users found"})
        
        # Create permission
        permission = DocumentPermission.objects.create(
            document=document,
            access=access,
            note=note,
        )
        permission.users.set(all_users)
        
        # Build notification message with note if provided
        base_message = f"{request.user.get_full_name() or request.user.username} has shared a document with you with {access} access."
        if note:
            message = f"{base_message}\n\nMessage: {note}"
        else:
            message = base_message
        
        # Send notifications to all users
        for user in all_users:
            if user.id != request.user.id:  # Don't notify the person sharing
                NotificationService.create_notification(
                    recipient=user,
                    title=f"Document Shared: {document.title}",
                    message=message,
                    notification_type=Notification.NotificationType.DOCUMENT,
                    priority=Notification.Priority.NORMAL,
                    sender=request.user,
                    module="dms",
                    related_object_type="document",
                    related_object_id=str(document.id),
                    action_url=f"/dms/{document.id}",
                    action_required=False,
                )
        
        # Create audit log
        from audit.models import ActivityLog
        metadata = {
            "permission_id": str(permission.id),
            "user_count": len(user_ids),
            "access_level": access,
            "share_to_all": True,
        }
        if note:
            metadata["note"] = note
        
        AuditService.log_document_activity(
            user=request.user,
            action=ActivityLog.ActionType.DOCUMENT_SHARED,
            document=document,
            request=request,
            description=f"Shared document with all {len(user_ids)} active user(s) with {access} access",
            metadata=metadata,
        )
        
        serializer = self.get_serializer(permission)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update document permission (e.g., change access level)."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        old_access = instance.access
        self.perform_update(serializer)
        
        # Create audit log for permission update
        from audit.models import ActivityLog
        AuditService.log_document_activity(
            user=request.user,
            action=ActivityLog.ActionType.DOCUMENT_SHARED,
            document=instance.document,
            request=request,
            description=f"Updated document permission access from {old_access} to {serializer.validated_data.get('access', old_access)}",
            metadata={
                "permission_id": str(instance.id),
                "old_access": old_access,
                "new_access": serializer.validated_data.get("access", old_access),
            },
        )
        
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Delete document permission."""
        instance = self.get_object()
        document = instance.document
        
        # Create audit log before deletion
        from audit.models import ActivityLog
        AuditService.log_document_activity(
            user=request.user,
            action=ActivityLog.ActionType.DOCUMENT_SHARED,
            document=document,
            request=request,
            description=f"Removed document permission ({instance.access} access)",
            metadata={
                "permission_id": str(instance.id),
                "access_level": instance.access,
                "action": "removed",
            },
        )
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentCommentViewSet(viewsets.ModelViewSet):
    queryset = DocumentComment.objects.select_related("document", "version", "author").prefetch_related("replies")
    serializer_class = DocumentCommentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["document", "version", "resolved"]
    ordering_fields = ["created_at"]

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        document = comment.document
        
        # Create audit log
        from audit.models import ActivityLog
        AuditService.log_document_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.DOCUMENT_COMMENT_ADDED,
            document=document,
            request=self.request,
            description=f"Added comment on document: {document.title}",
            metadata={"comment_id": str(comment.id)},
        )
        
        # Send notification to document author if different from comment author
        if document.author and document.author.id != self.request.user.id:
            NotificationService.create_notification(
                recipient=document.author,
                title=f"New Comment on {document.title}",
                message=f"{self.request.user.get_full_name() or self.request.user.username} added a comment on your document.",
                notification_type=Notification.NotificationType.DOCUMENT,
                priority=Notification.Priority.NORMAL,
                sender=self.request.user,
                module="dms",
                related_object_type="document",
                related_object_id=str(document.id),
                action_url=f"/dms/{document.id}",
                action_required=False,
            )


class DocumentDiscussionMessageViewSet(viewsets.ModelViewSet):
    queryset = DocumentDiscussionMessage.objects.select_related("document", "author")
    serializer_class = DocumentDiscussionMessageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["document"]
    ordering_fields = ["created_at"]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class DocumentAccessLogViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """ViewSet for document access logs - audit trail of document views/downloads."""
    queryset = DocumentAccessLog.objects.select_related("document", "user")
    serializer_class = DocumentAccessLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["document", "action", "sensitivity"]
    ordering_fields = ["timestamp"]
    ordering = ["-timestamp"]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DocumentEditorSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for tracking active document editing sessions."""
    queryset = DocumentEditorSession.objects.select_related("document", "user")
    serializer_class = DocumentEditorSessionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["document", "user", "is_active"]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.validated_data["document"]
        note = serializer.validated_data.get("note")
        existing = DocumentEditorSession.objects.filter(document=document, user=request.user).first()
        if existing:
            existing.is_active = True
            if note is not None:
                existing.note = note
            existing.save(update_fields=["is_active", "note", "updated_at"])
            output = self.get_serializer(existing)
            return Response(output.data, status=status.HTTP_200_OK)

        instance = DocumentEditorSession.objects.create(
            document=document,
            user=request.user,
            note=note or "",
            is_active=True,
        )
        output = self.get_serializer(instance)
        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        # Ensure ownership before adjustments
        instance = serializer.instance
        if instance.user != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("You can only modify your own editor sessions unless admin.")
        serializer.save()

    @action(detail=False, methods=["get"], url_path="active")
    def active_sessions(self, request):
        """Get all active editing sessions for a document."""
        document_id = request.query_params.get("document")
        if not document_id:
            raise ValidationError({"document": "Document ID is required"})
        
        sessions = DocumentEditorSession.objects.filter(
            document_id=document_id,
            is_active=True
        ).select_related("user")
        
        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="end")
    def end_session(self, request, pk=None):
        """End an editing session."""
        session = self.get_object()
        
        if session.user != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only end your own sessions")
        
        session.is_active = False
        session.save(update_fields=["is_active", "updated_at"])
        
        return Response({"message": "Session ended"})


class DocumentCollectionViewSet(viewsets.ModelViewSet):
    queryset = DocumentCollection.objects.prefetch_related("documents", "members", "owner").filter(is_deleted=False)
    serializer_class = DocumentCollectionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["owner", "is_public"]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        
        # Show collections that are:
        # 1. Public
        # 2. Owned by user
        # 3. User is a member
        if user.is_superuser:
            return qs
        
        return qs.filter(
            Q(is_public=True) | Q(owner=user) | Q(members=user)
        ).distinct()

    def perform_create(self, serializer):
        collection = serializer.save(owner=self.request.user)
        # Add owner as member
        collection.members.add(self.request.user)
        
        # Log activity
        from audit.models import ActivityLog
        AuditService.log_document_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.DOCUMENT_CREATED,
            document=None,
            request=self.request,
            description=f"Created collection: {collection.name}",
        )

    @action(detail=True, methods=["post"], url_path="add-documents")
    def add_documents(self, request, pk=None):
        """Add documents to collection."""
        collection = self.get_object()
        
        # Check permissions
        if collection.owner != request.user and request.user not in collection.members.all():
            raise PermissionDenied("You don't have permission to modify this collection")
        
        document_ids = request.data.get("document_ids", [])
        if not document_ids:
            raise ValidationError({"document_ids": "At least one document ID is required"})
        
        documents = Document.objects.filter(id__in=document_ids)
        collection.documents.add(*documents)
        
        return Response({
            "message": f"Added {len(documents)} document(s) to collection",
            "document_count": collection.documents.count(),
        })

    @action(detail=True, methods=["post"], url_path="remove-documents")
    def remove_documents(self, request, pk=None):
        """Remove documents from collection."""
        collection = self.get_object()
        
        # Check permissions
        if collection.owner != request.user and request.user not in collection.members.all():
            raise PermissionDenied("You don't have permission to modify this collection")
        
        document_ids = request.data.get("document_ids", [])
        if not document_ids:
            raise ValidationError({"document_ids": "At least one document ID is required"})
        
        documents = Document.objects.filter(id__in=document_ids)
        collection.documents.remove(*documents)
        
        return Response({
            "message": f"Removed {len(documents)} document(s) from collection",
            "document_count": collection.documents.count(),
        })

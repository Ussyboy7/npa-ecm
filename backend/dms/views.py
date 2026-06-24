"""API viewsets for the document management system."""

from __future__ import annotations

import logging
import os
from datetime import timedelta
from datetime import datetime

from django.conf import settings
from django.db import connection
from django.db.models import Count, Max, Q
from django.utils import timezone
from django.utils.text import slugify
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from common.pagination import StandardPageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from audit.services import AuditService
from common.constants import (
    SENSITIVITY_HIGH_CONFIDENTIAL_GRADES,
    SENSITIVITY_HIGH_RESTRICTED_GRADES,
)
from common.storage_utils import resolve_media_path
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
    DocumentTemplate,
    DocumentVersion,
    DocumentWorkspace,
)
from .serializers import (
    DocumentAccessLogSerializer,
    DocumentCollectionSerializer,
    DocumentCommentSerializer,
    DocumentDiscussionMessageSerializer,
    DocumentEditorSessionSerializer,
    DocumentPermissionSerializer,
    DocumentSerializer,
    DocumentTemplateSerializer,
    DocumentVersionSerializer,
    DocumentWorkspaceSerializer,
)
from .services import FileUploadService, OCRService, DocumentSummaryService

logger = logging.getLogger(__name__)


def _document_search_terms(search_query: str) -> list[str]:
    """Split comma-separated search into terms (OR match). Single phrase stays one term."""
    s = (search_query or "").strip()
    if not s:
        return []
    if "," in s:
        return [t.strip() for t in s.split(",") if t.strip()]
    return [s]


def _apply_document_text_search(queryset, terms: list[str]):
    """OR across terms; each term matches title, reference, description, or version OCR/text."""
    combined = Q()
    for term in terms:
        combined |= (
            Q(title__icontains=term)
            | Q(reference_number__icontains=term)
            | Q(description__icontains=term)
            | Q(versions__content_text__icontains=term)
            | Q(versions__ocr_text__icontains=term)
        )
    return queryset.filter(combined)


def _apply_document_tag_search_postgresql(queryset, terms: list[str]):
    """
    Documents where any JSON array tag string matches any term (substring, case-insensitive).
    Requires PostgreSQL (jsonb_array_elements_text).
    """
    if not terms or connection.vendor != "postgresql":
        return queryset.none()
    fragments = [
        "EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE((dms_document.tags)::jsonb, '[]'::jsonb)) AS _tag_el WHERE _tag_el ILIKE %s)"
        for _ in terms
    ]
    where_sql = "(" + " OR ".join(fragments) + ")"
    params = [f"%{t}%" for t in terms]
    return queryset.extra(where=[where_sql], params=params)


class DocumentWorkspaceViewSet(viewsets.ModelViewSet):
    queryset = DocumentWorkspace.objects.prefetch_related("members").annotate(
        document_count=Count("documents", distinct=True),
    )
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


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.none()
    base_queryset = Document.all_objects.select_related("author", "division", "department", "form_document").prefetch_related(
        "workspaces",
        "versions",
        "permissions",
    )
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        "document_type",
        "status",
        "sensitivity",
        "division",
        "department",
        "author",  # Added author filter
        "parent_document",  # Filter by parent document for thread navigation
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
        status_in = self.request.query_params.get("status_in", "").strip()
        document_type_in = self.request.query_params.get("document_type_in", "").strip()
        workspace = self.request.query_params.get("workspace", "").strip()
        
        # Apply date range filter first (before search to reduce queryset size)
        if date_from:
            try:
                from_date = datetime.strptime(date_from, "%Y-%m-%d").date()
                queryset = queryset.filter(created_at__date__gte=from_date)
            except ValueError:
                logger.warning("Invalid date_from format: %s", date_from)
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, "%Y-%m-%d").date()
                queryset = queryset.filter(created_at__date__lte=to_date)
            except ValueError:
                logger.warning("Invalid date_to format: %s", date_to)

        if status_in:
            statuses = [value.strip() for value in status_in.split(",") if value.strip()]
            if statuses:
                queryset = queryset.filter(status__in=statuses)

        if document_type_in:
            document_types = [value.strip() for value in document_type_in.split(",") if value.strip()]
            if document_types:
                queryset = queryset.filter(document_type__in=document_types)

        if workspace:
            queryset = queryset.filter(workspaces__id=workspace)
        
        # If there's a search query, search across fields, version content, and tags (PostgreSQL)
        if search_query:
            terms = _document_search_terms(search_query)
            if not terms:
                # e.g. only commas — no meaningful terms
                queryset = super().filter_queryset(queryset)
            else:
                text_qs = _apply_document_text_search(queryset, terms)
                if connection.vendor == "postgresql":
                    tag_qs = _apply_document_tag_search_postgresql(queryset, terms)
                    combined_pks = set(text_qs.values_list("pk", flat=True)) | set(
                        tag_qs.values_list("pk", flat=True)
                    )
                    queryset = queryset.filter(pk__in=combined_pks) if combined_pks else queryset.none()
                else:
                    queryset = text_qs
            
                # Still need to apply other filters (status, type, etc.) from DjangoFilterBackend
                # Temporarily remove SearchFilter to avoid double-filtering (we handle search manually above)
                from rest_framework.filters import SearchFilter

                original_backends = self.filter_backends
                self.filter_backends = [b for b in original_backends if not isinstance(b, SearchFilter)]
                try:
                    # Apply DjangoFilterBackend filters (status, type, etc.) but NOT SearchFilter
                    queryset = super().filter_queryset(queryset)
                finally:
                    self.filter_backends = original_backends

                # Apply distinct() after all filters to avoid duplicates from version joins
                queryset = queryset.distinct()

                # For longer queries (3+ chars), optionally enhance with full-text search for better ranking
                # But always include icontains results to ensure partial matches are found
                if len(search_query.strip()) >= 3:
                    try:
                        from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector

                        search_query_obj = SearchQuery(search_query, config="english")

                        if hasattr(queryset.model, "_meta") and "search_vector" in [
                            f.name for f in queryset.model._meta.get_fields()
                        ]:
                            full_text_pks = list(
                                queryset.filter(search_vector=search_query_obj).values_list("pk", flat=True)
                            )
                        else:
                            search_vector = (
                                SearchVector("title", weight="A", config="english")
                                + SearchVector("reference_number", weight="A", config="english")
                                + SearchVector("description", weight="B", config="english")
                                + SearchVector("tags", weight="C", config="english")
                            )
                            full_text_pks = list(
                                queryset.annotate(
                                    search=search_vector,
                                    rank=SearchRank(search_vector, search_query_obj),
                                )
                                .filter(search=search_query_obj)
                                .values_list("pk", flat=True)
                            )

                        if full_text_pks:
                            from django.db.models import Case, IntegerField, When

                            queryset = queryset.annotate(
                                search_priority=Case(
                                    When(pk__in=full_text_pks, then=1),
                                    default=2,
                                    output_field=IntegerField(),
                                )
                            ).order_by("search_priority", "-updated_at")
                    except Exception as e:
                        logger.warning("Full-text search enhancement failed: %s", e)
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
        if not user or not user.is_authenticated:
            return qs.distinct()

        shared_with_me = str(self.request.query_params.get("shared_with_me", "")).lower() in {"1", "true", "yes"}
        shared_by_me = str(self.request.query_params.get("shared_by_me", "")).lower() in {"1", "true", "yes"}
        recent_for_me = str(self.request.query_params.get("recent_for_me", "")).lower() in {"1", "true", "yes"}
        awaiting_action = str(self.request.query_params.get("awaiting_action", "")).lower() in {"1", "true", "yes"}

        if awaiting_action:
            from forms.signature_models import FormSignature

            office_ids = list(
                user.office_memberships.filter(is_active=True).values_list("office_id", flat=True)
            )
            assignment_filter = Q(form_document__signature_workflow__signatures__assigned_to_user=user)
            if office_ids:
                assignment_filter |= Q(form_document__signature_workflow__signatures__assigned_to_office_id__in=office_ids)
            if getattr(user, "department_id", None):
                assignment_filter |= Q(form_document__signature_workflow__signatures__assigned_to_department_id=user.department_id)
            if getattr(user, "division_id", None):
                assignment_filter |= Q(form_document__signature_workflow__signatures__assigned_to_division_id=user.division_id)

            pending_signature_filter = (
                Q(form_document__signature_workflow__signatures__status=FormSignature.Status.PENDING)
                & assignment_filter
            )
            qs = qs.filter(pending_signature_filter).distinct()

        if shared_with_me:
            shared_filter = Q(permissions__users=user)
            if user.division_id:
                shared_filter |= Q(permissions__divisions=user.division_id)
            if user.department_id:
                shared_filter |= Q(permissions__departments=user.department_id)
            if user.grade_level:
                shared_filter |= Q(permissions__grade_levels__contains=[user.grade_level])
            qs = qs.filter(shared_filter).exclude(author=user).distinct()

        if shared_by_me:
            shared_by_me_filter = (
                Q(permissions__users__isnull=False)
                | Q(permissions__divisions__isnull=False)
                | Q(permissions__departments__isnull=False)
            )
            qs = qs.filter(author=user).filter(shared_by_me_filter).distinct()

        if recent_for_me:
            recent_days = 30
            raw_recent_days = self.request.query_params.get("recent_days")
            if raw_recent_days:
                try:
                    parsed = int(raw_recent_days)
                    if parsed > 0:
                        recent_days = min(parsed, 365)
                except (TypeError, ValueError):
                    logger.warning("Invalid recent_days value: %s", raw_recent_days)
            cutoff = timezone.now() - timedelta(days=recent_days)
            recent_logs = (
                DocumentAccessLog.objects.filter(user=user, timestamp__gte=cutoff)
                .values("document_id")
                .annotate(last_accessed=Max("timestamp"))
                .order_by("-last_accessed")
            )
            recent_doc_ids = [row["document_id"] for row in recent_logs]
            if not recent_doc_ids:
                return qs.none()
            qs = qs.filter(id__in=recent_doc_ids).annotate(
                last_accessed=Max("access_logs__timestamp", filter=Q(access_logs__user=user))
            )
            if not self.request.query_params.get("ordering"):
                qs = qs.order_by("-last_accessed")

        if user.is_superuser:
            return qs.distinct()

        visibility_filter = Q(author=user) | Q(workspaces__members=user) | Q(permissions__users=user)

        if user.division_id:
            visibility_filter |= Q(permissions__divisions=user.division_id)
        if user.department_id:
            visibility_filter |= Q(permissions__departments=user.department_id)
        if user.grade_level:
            visibility_filter |= Q(permissions__grade_levels__contains=[user.grade_level])

        visibility_filter |= Q(sensitivity__in=[Document.Sensitivity.PUBLIC, Document.Sensitivity.INTERNAL])

        # Visibility rules:
        # - Public: All authenticated users (when published)
        # - Internal: Requires explicit permission (dept/division/directorate/user)
        # - Confidential: Requires grade level + explicit permission
        # - Restricted: Requires top grade + explicit permission
        
        # Public is visible to all authenticated users when published
        visibility_filter |= Q(
            status=Document.DocumentStatus.PUBLISHED,
            sensitivity=Document.Sensitivity.PUBLIC,
        )
        
        # Internal requires explicit permission - shared with specific depts/divs/directorates
        has_internal_permission = (
            Q(permissions__users=user) |
            Q(permissions__divisions=user.division_id) |
            Q(permissions__departments=user.department_id)
        )
        visibility_filter |= (
            Q(sensitivity=Document.Sensitivity.INTERNAL) & has_internal_permission
        )
        
        # Confidential: need grade level AND explicit permission
        has_confidential_permission = (
            Q(permissions__users=user) |
            Q(permissions__divisions=user.division_id) |
            Q(permissions__departments=user.department_id) |
            Q(permissions__grade_levels__contains=[user.grade_level])
        ) if user.grade_level else Q()
        
        if user.grade_level in SENSITIVITY_HIGH_CONFIDENTIAL_GRADES:
            visibility_filter |= (
                Q(sensitivity=Document.Sensitivity.CONFIDENTIAL) & has_confidential_permission
            )

        # Restricted: need top grade AND explicit permission
        if user.grade_level in SENSITIVITY_HIGH_RESTRICTED_GRADES:
            visibility_filter |= (
                Q(sensitivity=Document.Sensitivity.RESTRICTED) & has_confidential_permission
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
            raise ValidationError({"detail": "Failed to generate summary. Please try again or contact support."})

    @action(detail=True, methods=["get"], url_path="related-correspondence")
    def related_correspondence(self, request, pk=None):
        """Return correspondence workflows linked to this document, with minutes."""
        from correspondence.models import CorrespondenceDocumentLink
        from correspondence.serializers import CorrespondenceSerializer, MinuteSerializer

        document = self.get_object()
        links = (
            CorrespondenceDocumentLink.objects.filter(document=document)
            .select_related("correspondence")
            .prefetch_related("correspondence__minutes")
        )

        results = []
        for link in links:
            correspondence = link.correspondence
            if correspondence.is_deleted:
                continue
            minutes = correspondence.minutes.order_by("timestamp")
            results.append(
                {
                    "correspondence": CorrespondenceSerializer(
                        correspondence, context={"request": request}
                    ).data,
                    "minutes": MinuteSerializer(
                        minutes, many=True, context={"request": request}
                    ).data,
                    "link_notes": link.notes or "",
                }
            )

        return Response(results)


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
        
        # If file_url is a data URL (base64), process via shared service
        if file_url and file_url.startswith('data:'):
            try:
                result = FileUploadService.process_data_url(
                    file_url=file_url,
                    file_name=file_name,
                    file_type=file_type,
                    document_identifier=document_identifier,
                )
                data.update(result)
            except Exception as e:
                logger.error("Failed to process data URL for document version: %s", e)
                raise ValidationError({"file_url": "Failed to process uploaded file. Please try again or contact support."})
        
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
        
        # Check permissions - only author or document owner can replace
        if version.uploaded_by != request.user and version.document.author != request.user:
            raise PermissionDenied("You can only replace versions you uploaded or documents you own")
        
        # Create a mutable copy of request data
        data = dict(request.data)
        
        # Extract file data from request if it's a data URL
        file_url = data.get('file_url', '')
        file_name = data.get('file_name', version.file_name)
        file_type = data.get('file_type', version.file_type)
        
        # If file_url is a data URL (base64), process via shared service
        if file_url and file_url.startswith('data:'):
            try:
                result = FileUploadService.process_data_url(
                    file_url=file_url,
                    file_name=file_name or version.file_name,
                    file_type=file_type or version.file_type,
                    document_identifier=str(version.document.id),
                )
                data.update(result)
            except Exception as e:
                logger.error("Failed to process data URL for version replacement: %s", e)
                raise ValidationError({"file_url": "Failed to process uploaded file. Please try again or contact support."})
        
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
        """Run OCR on a specific version, or extract text from HTML content."""
        version = self.get_object()
        
        # If version has HTML content, extract text directly
        # Check both content_html and content_text fields
        has_html_content = (version.content_html and version.content_html.strip()) or (version.content_text and version.content_text.strip())
        if has_html_content:
            try:
                from django.utils.html import strip_tags
                # Extract plain text from HTML or use content_text if available
                source_text = version.content_html if version.content_html else version.content_text
                if version.content_html:
                    extracted_text = strip_tags(version.content_html)
                    # Clean up whitespace
                    extracted_text = ' '.join(extracted_text.split())
                else:
                    # Use content_text directly
                    extracted_text = version.content_text.strip()
                
                if extracted_text:
                    version.ocr_text = extracted_text
                    version.save(update_fields=["ocr_text"])
                    return Response({
                        "ocr_text": extracted_text,
                        "characters": len(extracted_text),
                        "method": "html_extraction",
                    })
                else:
                    return Response({
                        "ocr_text": "",
                        "message": "No text could be extracted from HTML content",
                        "method": "html_extraction",
                    })
            except Exception as e:
                logger.error(f"HTML text extraction failed: {e}")
                raise ValidationError({"detail": "Text extraction failed. Please try again or contact support."})
        
        # For file-based versions, use OCR
        if not version.file_url:
            raise ValidationError({"detail": "Version has no file or HTML content to process"})
        
        # Get file path
        file_url = version.file_url
        logger.info(f"OCR request for version {version.id}: file_url={file_url}, file_type={version.file_type}")
        
        if file_url.startswith('http'):
            raise ValidationError({"detail": "Cannot process remote files for OCR"})
        if file_url.startswith('data:'):
            raise ValidationError({"detail": "File is still in data URL format. Please wait for file processing to complete."})

        file_path = resolve_media_path(file_url)
        logger.info(f"Resolved file path: {file_path}, exists: {os.path.exists(file_path)}")
        
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path} (resolved from {file_url})")
            raise ValidationError({"detail": f"File not found on disk: {file_path}. The file may have been moved or deleted."})
        
        try:
            logger.info(f"Attempting OCR extraction for {version.file_type} at {file_path}")
            ocr_text = OCRService.extract_text(file_path, version.file_type)
            if ocr_text:
                logger.info(f"OCR successful: extracted {len(ocr_text)} characters")
                version.ocr_text = ocr_text
                version.save(update_fields=["ocr_text"])
                return Response({
                    "ocr_text": ocr_text,
                    "characters": len(ocr_text),
                    "method": "ocr",
                })
            else:
                logger.warning(f"OCR returned no text for {file_path}")
                # Check if python-docx is installed for Word documents
                if version.file_type in OCRService.SUPPORTED_DOCX_TYPES:
                    try:
                        from docx import Document as DocxDocument
                    except ImportError:
                        return Response({
                            "ocr_text": "",
                            "message": "python-docx library is not installed. Please install it to extract text from Word documents.",
                            "method": "ocr",
                        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
                return Response({
                    "ocr_text": "",
                    "message": "No text could be extracted from the document. The document may be empty, corrupted, or in an unsupported format.",
                    "method": "ocr",
                })
        except ImportError as e:
            error_msg = str(e)
            if 'docx' in error_msg.lower():
                logger.error("python-docx library not installed")
                raise ValidationError({"detail": "python-docx library is not installed. Please install it to extract text from Word documents."})
            else:
                logger.error(f"Import error during OCR: {e}")
                raise ValidationError({"detail": f"Required library not installed: {error_msg}"})
        except Exception as e:
            logger.error(f"OCR failed for {file_path}: {e}", exc_info=True)
            raise ValidationError({"detail": "OCR processing failed. Please try again or contact support."})


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
    filterset_fields = ["document", "action", "sensitivity", "user"]
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

    def get_queryset(self):
        """Filter out sessions for deleted documents."""
        qs = super().get_queryset()
        # Only show sessions for non-deleted documents
        return qs.filter(document__is_deleted=False)
    
    def filter_queryset(self, queryset):
        """Override to handle document filter gracefully."""
        # Get document filter from query params
        document_id = self.request.query_params.get("document")
        if document_id:
            # Check if document exists and is not deleted
            try:
                document = Document.objects.get(id=document_id, is_deleted=False)
            except Document.DoesNotExist:
                # Document doesn't exist or is deleted - return empty queryset
                return queryset.none()
        
        # Apply standard filters
        return super().filter_queryset(queryset)

    def create(self, request, *args, **kwargs):
        # Allow document to be passed as document_id for compatibility
        data = request.data.copy()
        if 'document_id' in data and 'document' not in data:
            data['document'] = data.pop('document_id')
        
        serializer = self.get_serializer(data=data)
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
        
        # Check if document exists and is not deleted
        try:
            document = Document.objects.get(id=document_id, is_deleted=False)
        except Document.DoesNotExist:
            # Document doesn't exist or is deleted - return empty list
            return Response([])
        
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


class DocumentTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing document templates."""
    queryset = DocumentTemplate.objects.filter(is_active=True).select_related("created_by", "default_division", "default_department")
    serializer_class = DocumentTemplateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["document_type", "is_active", "created_by"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "usage_count", "created_at"]
    ordering = ["-usage_count", "name"]

    def get_queryset(self):
        """Filter templates based on user permissions."""
        qs = super().get_queryset()
        user = self.request.user
        
        # Superusers can see all templates
        if user.is_superuser:
            return qs
        
        # Regular users can see active templates
        return qs.filter(is_active=True)

    def perform_create(self, serializer):
        """Set the creator when creating a template."""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def create_document(self, request, pk=None):
        """Create a document from this template."""
        template = self.get_object()
        
        # Get document data from request
        document_data = request.data.get("document", {})
        file_data = request.data.get("file", {})
        
        # Merge template defaults with provided data
        doc_data = {
            "title": document_data.get("title", ""),
            "description": document_data.get("description", template.description or ""),
            "document_type": document_data.get("document_type", template.document_type),
            "status": document_data.get("status", template.default_status),
            "sensitivity": document_data.get("sensitivity", template.default_sensitivity),
            "division": document_data.get("division", template.default_division.id if template.default_division else None),
            "department": document_data.get("department", template.default_department.id if template.default_department else None),
            "tags": document_data.get("tags", template.default_tags or []),
            "author_id": request.user.id,
        }
        
        # Create document
        document_serializer = DocumentSerializer(data=doc_data)
        document_serializer.is_valid(raise_exception=True)
        document = document_serializer.save()
        
        # If template has content, create initial version
        if template.template_content:
            import re
            # Strip HTML tags to get plain text
            content_text = re.sub(r'<[^>]+>', '', template.template_content)
            
            version_data = {
                "document": document.id,
                "file_name": f"{document.title}.html",
                "file_type": "text/html",
                "file_size": len(template.template_content.encode("utf-8")),
                "content_html": template.template_content,
                "content_text": content_text,
                "uploaded_by_id": request.user.id,
            }
            version_serializer = DocumentVersionSerializer(data=version_data)
            version_serializer.is_valid(raise_exception=True)
            version_serializer.save()
        
        # Increment template usage
        template.increment_usage()
        
        # Log activity
        AuditService.log_document_activity(
            user=request.user,
            action="document_created_from_template",
            document=document,
            request=request,
            description=f"Created document from template: {template.name}",
        )
        
        return Response(
            DocumentSerializer(document, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

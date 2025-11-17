"""API viewsets for the document management system."""

from __future__ import annotations

import base64
import os

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db.models import Max, Q
from django.utils.text import slugify
from common.upload_validators import validate_file_upload
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from audit.services import AuditService
from notifications.models import Notification
from notifications.services import NotificationService

from .models import (
    Document,
    DocumentAccessLog,
    DocumentComment,
    DocumentDiscussionMessage,
    DocumentEditorSession,
    DocumentPermission,
    DocumentVersion,
    DocumentWorkspace,
)
from .serializers import (
    DocumentAccessLogSerializer,
    DocumentCommentSerializer,
    DocumentDiscussionMessageSerializer,
    DocumentEditorSessionSerializer,
    DocumentPermissionSerializer,
    DocumentSerializer,
    DocumentVersionSerializer,
    DocumentWorkspaceSerializer,
)


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
    base_queryset = Document.all_objects.select_related("author", "division", "department").prefetch_related(
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
    ]
    search_fields = ["title", "reference_number", "description", "tags"]
    ordering_fields = ["updated_at", "created_at", "title"]
    ordering = ["-updated_at"]

    def filter_queryset(self, queryset):
        """Override to add full-text search in document versions."""
        # Get search query before calling super() which applies SearchFilter
        search_query = self.request.query_params.get("search", "").strip()
        
        # Call super to apply standard filters (SearchFilter, DjangoFilterBackend, etc.)
        queryset = super().filter_queryset(queryset)
        
        # If there's a search query, also search in document version content
        if search_query:
            from django.db.models import Q
            
            # Add full-text search in document versions (content_text, ocr_text)
            # This extends the base search_fields (title, reference, description, tags)
            version_filter = Q(
                versions__content_text__icontains=search_query
            ) | Q(
                versions__ocr_text__icontains=search_query
            )
            
            # Combine with existing search results using OR
            queryset = queryset.filter(version_filter).distinct()
        
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
                
                # Build full URL for the file
                try:
                    file_url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)
                except Exception:
                    # Fallback if build_absolute_uri fails
                    request_scheme = getattr(request, 'scheme', 'http')
                    request_host = request.get_host() if hasattr(request, 'get_host') else 'localhost:8000'
                    file_url = f"{request_scheme}://{request_host}{settings.MEDIA_URL}{saved_path}"
                
                # Update data with the new file URL (now a short path, not a long data URL)
                data['file_url'] = file_url
            except Exception as e:
                # If decoding fails, log and raise an error
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to process data URL for document version: {e}")
                from rest_framework.exceptions import ValidationError
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
        
        # Send notifications to all affected users
        for user in notified_users:
            if user.id != request.user.id:  # Don't notify the person sharing
                NotificationService.create_notification(
                    recipient=user,
                    title=f"Document Shared: {document.title}",
                    message=f"{request.user.get_full_name() or request.user.username} has shared a document with you with {access} access.",
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
        AuditService.log_document_activity(
            user=request.user,
            action=ActivityLog.ActionType.DOCUMENT_SHARED,
            document=document,
            request=request,
            description=f"Shared document with {len(notified_users)} user(s) with {access} access",
            metadata={
                "permission_id": str(permission.id),
                "user_count": len(user_ids) if user_ids else 0,
                "division_count": len(division_ids) if division_ids else 0,
                "department_count": len(department_ids) if department_ids else 0,
                "access_level": access,
            },
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


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

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class DocumentAccessLogViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
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


    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class DocumentAccessLogViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
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

"""API viewsets for the document management system."""

from __future__ import annotations

import base64
import os

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db.models import Max
from django.utils.text import slugify
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.select_related("author", "division", "department").prefetch_related(
        "workspaces",
        "versions",
        "permissions",
    )
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
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

    def perform_create(self, serializer):
        author = serializer.validated_data.get("author") or self.request.user
        serializer.save(author=author)


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
        
        # If file_url is a data URL (base64), save it to disk
        if file_url and file_url.startswith('data:'):
            try:
                # Parse data URL: data:type/subtype;base64,<data>
                header, encoded = file_url.split(',', 1)
                # Extract mime type if available
                mime_type = header.split(';')[0].split(':')[1] if ':' in header else file_type
                
                # Decode base64 data
                file_data = base64.b64decode(encoded)
                
                # Ensure media directory exists
                media_root = settings.MEDIA_ROOT
                document_id = str(data.get('document', ''))
                dms_dir = os.path.join(media_root, 'dms_versions', document_id)
                os.makedirs(dms_dir, exist_ok=True)
                
                # Generate file path
                safe_filename = file_name.replace(' ', '_').replace('/', '_')
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


class DocumentCommentViewSet(viewsets.ModelViewSet):
    queryset = DocumentComment.objects.select_related("document", "version", "author").prefetch_related("replies")
    serializer_class = DocumentCommentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["document", "version", "resolved"]
    ordering_fields = ["created_at"]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


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

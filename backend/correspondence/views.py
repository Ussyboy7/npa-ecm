"""API endpoints for correspondence and minutes."""

from __future__ import annotations

import os
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.db.models import Prefetch
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Correspondence,
    CorrespondenceAttachment,
    CorrespondenceDistribution,
    CorrespondenceDocumentLink,
    Delegation,
    Minute,
)
from .serializers import (
    CorrespondenceAttachmentSerializer,
    CorrespondenceDistributionSerializer,
    CorrespondenceDocumentLinkSerializer,
    CorrespondenceSerializer,
    DelegationSerializer,
    MinuteSerializer,
)


class CorrespondenceViewSet(viewsets.ModelViewSet):
    queryset = Correspondence.objects.select_related(
        "division",
        "department",
        "created_by",
        "current_approver",
    ).prefetch_related(
        "linked_documents",
        "attachments",
        Prefetch(
            "distribution",
            queryset=CorrespondenceDistribution.objects.select_related(
                "directorate",
                "division",
                "department",
                "added_by",
            ),
        ),
        "minutes",
    )
    serializer_class = CorrespondenceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        "status",
        "priority",
        "source",
        "direction",
        "division",
        "department",
    ]
    search_fields = ["reference_number", "subject", "summary", "tags"]
    ordering_fields = ["created_at", "updated_at", "received_date"]
    ordering = ["-created_at"]

    def create(self, request, *args, **kwargs):
        # Extract file attachments from request (before serializer processes data)
        attachments = request.FILES.getlist('attachments', [])
        
        # Create serializer with request data
        # The serializer will automatically ignore fields not in the model
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get validated data
        validated_data = serializer.validated_data
        creator = validated_data.get("created_by") or request.user
        priority = validated_data.get("priority") or Correspondence.Priority.MEDIUM

        if not validated_data.get("reference_number"):
            count = Correspondence.objects.count() + 1
            reference_number = f"NPA/REG/{request.user.username.upper()}/{count:04d}"
        else:
            reference_number = validated_data["reference_number"]

        # Create the correspondence instance
        correspondence = serializer.save(
            created_by=creator,
            priority=priority,
            reference_number=reference_number,
        )

        # Handle file uploads
        if attachments:
            # Ensure media directory exists
            media_root = settings.MEDIA_ROOT
            attachments_dir = os.path.join(media_root, 'correspondence_attachments', str(correspondence.id))
            os.makedirs(attachments_dir, exist_ok=True)
            
            for file in attachments:
                # Generate file path
                file_path = os.path.join('correspondence_attachments', str(correspondence.id), file.name)
                
                # Save file to storage
                # Reset file pointer to beginning in case it was read before
                if hasattr(file, 'seek'):
                    file.seek(0)
                saved_path = default_storage.save(file_path, file)
                
                # Build full URL for the file
                # Use request.build_absolute_uri for proper URL construction
                try:
                    file_url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)
                except Exception:
                    # Fallback if build_absolute_uri fails
                    request_scheme = getattr(request, 'scheme', 'http')
                    request_host = request.get_host() if hasattr(request, 'get_host') else 'localhost:8000'
                    file_url = f"{request_scheme}://{request_host}{settings.MEDIA_URL}{saved_path}"
                
                # Create attachment record
                CorrespondenceAttachment.objects.create(
                    correspondence=correspondence,
                    file_name=file.name,
                    file_type=file.content_type or 'application/octet-stream',
                    file_size=file.size,
                    file_url=file_url,
                )

        # Return the created correspondence with attachments
        output_serializer = self.get_serializer(correspondence)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class CorrespondenceAttachmentViewSet(viewsets.ModelViewSet):
    queryset = CorrespondenceAttachment.objects.select_related("correspondence")
    serializer_class = CorrespondenceAttachmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["correspondence"]
    ordering_fields = ["created_at"]


class CorrespondenceDistributionViewSet(viewsets.ModelViewSet):
    queryset = CorrespondenceDistribution.objects.select_related(
        "correspondence",
        "directorate",
        "division",
        "department",
        "added_by",
    )
    serializer_class = CorrespondenceDistributionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["correspondence", "recipient_type", "purpose"]

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)


class CorrespondenceDocumentLinkViewSet(viewsets.ModelViewSet):
    queryset = CorrespondenceDocumentLink.objects.select_related("correspondence", "document")
    serializer_class = CorrespondenceDocumentLinkSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["correspondence", "document"]


class MinuteViewSet(viewsets.ModelViewSet):
    queryset = Minute.objects.select_related("correspondence", "user")
    serializer_class = MinuteSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["correspondence", "user", "action_type", "direction"]
    ordering_fields = ["timestamp", "step_number"]
    ordering = ["timestamp"]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DelegationViewSet(viewsets.ModelViewSet):
    queryset = Delegation.objects.select_related("principal", "assistant")
    serializer_class = DelegationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["principal", "assistant", "active"]

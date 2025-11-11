"""API endpoints for correspondence and minutes."""

from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

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
        "distribution",
        "minutes",
    )
    serializer_class = CorrespondenceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
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

    def perform_create(self, serializer):
        data = serializer.validated_data
        creator = data.get("created_by") or self.request.user
        priority = data.get("priority") or Correspondence.Priority.MEDIUM

        if not data.get("reference_number"):
            count = Correspondence.objects.count() + 1
            reference_number = f"NPA/REG/{self.request.user.username.upper()}/{count:04d}"
        else:
            reference_number = data["reference_number"]

        serializer.save(
            created_by=creator,
            priority=priority,
            reference_number=reference_number,
        )


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

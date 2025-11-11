"""Support content viewsets."""

from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import FaqEntry, HelpGuide, SupportTicket
from .serializers import FaqEntrySerializer, HelpGuideSerializer, SupportTicketSerializer


class HelpGuideViewSet(viewsets.ModelViewSet):
    queryset = HelpGuide.objects.all()
    serializer_class = HelpGuideSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["category", "is_published"]
    search_fields = ["title", "summary", "content", "tags"]


class FaqEntryViewSet(viewsets.ModelViewSet):
    queryset = FaqEntry.objects.all()
    serializer_class = FaqEntrySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "is_active"]
    search_fields = ["question", "answer", "tags"]
    ordering_fields = ["order", "created_at"]
    ordering = ["order"]


class SupportTicketViewSet(viewsets.ModelViewSet):
    queryset = SupportTicket.objects.select_related("created_by", "assigned_to")
    serializer_class = SupportTicketSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "priority", "created_by", "assigned_to"]
    search_fields = ["subject", "description"]
    ordering_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        creator = serializer.validated_data.get("created_by") or self.request.user
        serializer.save(created_by=creator)

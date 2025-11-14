"""Support content viewsets."""

from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ClientLogEntry, FaqEntry, HelpGuide, SupportTicket
from .serializers import ClientLogBatchSerializer, FaqEntrySerializer, HelpGuideSerializer, SupportTicketSerializer


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


class ClientLogIngestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ClientLogBatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entries_to_create = []
        for entry in serializer.validated_data['entries']:
            args = entry.get('args') or []
            message = entry.get('message') or next((str(arg) for arg in args if isinstance(arg, str)), '')
            metadata = entry.get('context') or {}
            entries_to_create.append(
                ClientLogEntry(
                    level=entry['level'],
                    message=message[:500],
                    payload=args,
                    metadata=metadata,
                    user=request.user if request.user.is_authenticated else None,
                    user_agent=request.headers.get('User-Agent', '')[:255],
                    request_path=request.headers.get('Referer', '')[:255],
                )
            )

        if entries_to_create:
            ClientLogEntry.objects.bulk_create(entries_to_create)
        return Response({'created': len(entries_to_create)}, status=status.HTTP_201_CREATED)

"""Analytics endpoints."""

from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import ReportSnapshot, UsageMetric
from .serializers import ReportSnapshotSerializer, UsageMetricSerializer


class ReportSnapshotViewSet(viewsets.ModelViewSet):
    queryset = ReportSnapshot.objects.select_related("generated_for")
    serializer_class = ReportSnapshotSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["slug", "generated_for"]
    search_fields = ["title", "description", "slug"]
    ordering_fields = ["generated_at", "created_at"]
    ordering = ["-generated_at"]

    def perform_create(self, serializer):
        owner = serializer.validated_data.get("generated_for") or self.request.user
        serializer.save(generated_for=owner)


class UsageMetricViewSet(viewsets.ModelViewSet):
    queryset = UsageMetric.objects.all()
    serializer_class = UsageMetricSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["metric"]
    ordering_fields = ["recorded_at", "value"]
    ordering = ["-recorded_at"]

"""Analytics endpoints."""

from __future__ import annotations

import csv
import io
from typing import Any, Iterable, Sequence

from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ReportSnapshot, UsageMetric
from .serializers import ReportSnapshotSerializer, UsageMetricSerializer
from .services import AnalyticsService


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


class PerformanceAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        range_days = int(request.query_params.get("range", 30))
        data = AnalyticsService.build_performance_payload(range_days=range_days)
        return Response(data)


class ExecutiveAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        range_days = int(request.query_params.get("range", 30))
        data = AnalyticsService.build_executive_payload(range_days=range_days)
        return Response(data)


class ReportsAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        range_days = int(request.query_params.get("range", 30))
        division_id = request.query_params.get("divisionId")
        data = AnalyticsService.build_reports_payload(range_days=range_days, division_id=division_id)
        return Response(data)


class AnalyticsExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        export_type = request.query_params.get("type", "executive").lower()
        export_format = request.query_params.get("format", "csv").lower()
        range_days = int(request.query_params.get("range", 30))
        division_id = request.query_params.get("divisionId")

        dataset = self._build_dataset(export_type, range_days, division_id)
        filename = f"analytics-{export_type}-{range_days}d"

        if export_format == "csv":
            return self._csv_response(filename + ".csv", dataset["headers"], dataset["rows"])
        if export_format == "pdf":
            return self._pdf_response(filename + ".pdf", dataset["title"], dataset["headers"], dataset["rows"])

        raise ValidationError({"format": "Unsupported export format"})

    def _build_dataset(self, export_type: str, range_days: int, division_id: str | None) -> dict[str, Any]:
        if export_type == "performance":
            payload = AnalyticsService.build_performance_payload(range_days=range_days)
            headers = ["Division", "Workload", "Completed", "Completion Rate", "Avg Turnaround"]
            rows = [
                [
                    entry.get("fullName") or entry["name"],
                    entry["workload"],
                    entry["completed"],
                    f"{entry['completionRate']}%",
                    entry["avgTurnaround"],
                ]
                for entry in payload["divisionSummary"]
            ]
            title = f"Performance Summary - Last {range_days} days"
        elif export_type == "reports":
            payload = AnalyticsService.build_reports_payload(range_days=range_days, division_id=division_id)
            headers = ["Division", "Total", "Completed", "Pending", "Completion Rate"]
            rows = [
                [entry["name"], entry["total"], entry["completed"], entry["pending"], f"{entry['rate']}%"]
                for entry in payload["divisionPerformance"]
            ]
            title = f"Correspondence Reports - Last {range_days} days"
        elif export_type == "executive":
            payload = AnalyticsService.build_executive_payload(range_days=range_days)
            headers = ["Division", "Documents", "Avg Turnaround", "High Priority", "Backlog"]
            rows = [
                [
                    entry.get("fullName") or entry["name"],
                    entry["workload"],
                    entry["avgTurnaround"],
                    entry.get("highPriority", 0),
                    entry.get("backlog", 0),
                ]
                for entry in payload["divisionMetrics"]
            ]
            title = f"Executive Dashboard Snapshot - Last {range_days} days"
        else:
            raise ValidationError({"type": "Unsupported export type"})

        return {"headers": headers, "rows": rows, "title": title}

    def _csv_response(self, filename: str, headers: Sequence[str], rows: Iterable[Sequence[Any]]) -> HttpResponse:
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    def _pdf_response(self, filename: str, title: str, headers: Sequence[str], rows: Iterable[Sequence[Any]]) -> HttpResponse:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        text_object = c.beginText(40, height - 50)
        text_object.setFont("Helvetica-Bold", 14)
        text_object.textLine(title)
        text_object.moveCursor(0, 20)
        text_object.setFont("Helvetica", 11)
        text_object.textLine(", ".join(headers))
        text_object.moveCursor(0, 10)

        for row in rows:
            text_object.textLine(", ".join(str(value) for value in row))
            if text_object.getY() <= 40:
                c.drawText(text_object)
                c.showPage()
                text_object = c.beginText(40, height - 50)
                text_object.setFont("Helvetica", 11)

        c.drawText(text_object)
        c.showPage()
        c.save()
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

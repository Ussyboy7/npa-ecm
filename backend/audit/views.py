"""API views for audit logs."""

from django.http import HttpResponse
from django.utils.dateparse import parse_datetime
from common.pagination import StandardPageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .export_service import build_compliance_bundle
from .models import ActivityLog
from .serializers import ActivityLogSerializer


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for audit logs."""

    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["user", "action", "object_type", "object_id", "module", "severity", "success"]
    search_fields = ["description", "object_repr", "user__username", "user__email"]
    ordering_fields = ["timestamp"]
    ordering = ["-timestamp"]

    @staticmethod
    def _normalized_role_name(user) -> str:
        role = getattr(user, "system_role", None)
        role_name = getattr(role, "name", "") if role else ""
        return (role_name or "").strip().lower()

    def get_queryset(self):
        """Return audit logs based on user permissions — now strictly scoped."""
        from organization.permission_utils import user_has_permission

        user = self.request.user
        queryset = ActivityLog.objects.all().select_related("user")

        if user.is_superuser:
            return queryset

        if user_has_permission(user, "can_access_audit_compliance"):
            role_name = (getattr(getattr(user, "system_role", None), "name", "") or "").lower()
            if role_name == "managing director":
                return queryset
            dept_id = getattr(user, "department_id", None)
            if dept_id:
                return queryset.filter(Q(user__department_id=dept_id) | Q(user=user))
            div_id = getattr(user, "division_id", None)
            if div_id:
                return queryset.filter(Q(user__division_id=div_id) | Q(user=user))
            dir_id = getattr(user, "directorate_id", None)
            if dir_id:
                return queryset.filter(Q(user__directorate_id=dir_id) | Q(user=user))
            return queryset.filter(user=user)

        if user_has_permission(user, "can_access_administration"):
            dept_id = getattr(user, "department_id", None)
            if dept_id:
                return queryset.filter(Q(user__department_id=dept_id) | Q(user=user))
            div_id = getattr(user, "division_id", None)
            if div_id:
                return queryset.filter(Q(user__division_id=div_id) | Q(user=user))
            dir_id = getattr(user, "directorate_id", None)
            if dir_id:
                return queryset.filter(Q(user__directorate_id=dir_id) | Q(user=user))
            return queryset.filter(user=user)

        if user_has_permission(user, "can_manage_org_structure"):
            division_id = getattr(user, "division_id", None)
            if division_id:
                return queryset.filter(Q(user__division_id=division_id) | Q(user=user))
            return queryset.filter(user=user)

        # Regular users: own logs, or case-scoped when requested
        object_type = self.request.query_params.get("object_type")
        object_id = self.request.query_params.get("object_id")

        if object_type and object_id and object_type == "case":
            return queryset.filter(object_type=object_type, object_id=object_id)

        return queryset.filter(user=user)

    def _apply_export_filters(self, queryset):
        """Apply list filters including optional date range for exports."""
        params = self.request.query_params
        if params.get("action"):
            queryset = queryset.filter(action=params.get("action"))
        if params.get("module"):
            queryset = queryset.filter(module=params.get("module"))
        if params.get("severity"):
            queryset = queryset.filter(severity=params.get("severity"))
        if params.get("success") in {"true", "false"}:
            queryset = queryset.filter(success=params.get("success") == "true")
        search = params.get("search")
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search)
                | Q(object_repr__icontains=search)
                | Q(user__username__icontains=search)
                | Q(user__email__icontains=search)
            )
        from_date = params.get("from_date")
        to_date = params.get("to_date")
        if from_date:
            parsed = parse_datetime(from_date) or parse_datetime(f"{from_date}T00:00:00")
            if parsed:
                queryset = queryset.filter(timestamp__gte=parsed)
        if to_date:
            parsed = parse_datetime(to_date) or parse_datetime(f"{to_date}T23:59:59")
            if parsed:
                queryset = queryset.filter(timestamp__lte=parsed)
        ordering = params.get("ordering", "-timestamp")
        return queryset.order_by(ordering)

    def _ensure_compliance_export_permission(self):
        from organization.permission_utils import require_permission

        require_permission(self.request.user, "can_access_audit_compliance")

    @action(detail=False, methods=["get"], url_path="compliance-export")
    def compliance_export(self, request):
        """Download tamper-evident audit bundle (CSV + manifest + SHA-256 checksum)."""
        self._ensure_compliance_export_permission()
        queryset = self._apply_export_filters(self.get_queryset())
        max_rows = int(request.query_params.get("max_rows", "10000"))
        logs = list(queryset[:max_rows])

        filters_meta = {
            key: request.query_params.get(key)
            for key in ("action", "module", "severity", "success", "search", "from_date", "to_date")
            if request.query_params.get(key)
        }

        zip_bytes, manifest = build_compliance_bundle(
            logs,
            exported_by=request.user,
            filters=filters_meta,
        )

        response = HttpResponse(zip_bytes, content_type="application/zip")
        stamp = manifest["exported_at"][:10]
        response["Content-Disposition"] = f'attachment; filename="audit-compliance-{stamp}.zip"'
        response["X-Audit-Record-Count"] = str(manifest["record_count"])
        response["X-Audit-SHA256"] = manifest["sha256"]
        return response

    @action(detail=False, methods=["get"], url_path="compliance-manifest")
    def compliance_manifest_preview(self, request):
        """Preview manifest metadata for the current filter set (no download)."""
        self._ensure_compliance_export_permission()
        queryset = self._apply_export_filters(self.get_queryset())
        count = queryset.count()
        return Response(
            {
                "record_count": count,
                "max_export_rows": int(request.query_params.get("max_rows", "10000")),
                "filters": {
                    key: request.query_params.get(key)
                    for key in ("action", "module", "severity", "success", "search", "from_date", "to_date")
                    if request.query_params.get(key)
                },
            }
        )

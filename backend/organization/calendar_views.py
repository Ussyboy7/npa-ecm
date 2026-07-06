"""API views for executive calendar events."""

from __future__ import annotations

from django.utils.dateparse import parse_datetime
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated

from common.pagination import CatalogPageNumberPagination
from correspondence.models import Delegation

from .calendar_serializers import ExecutiveCalendarEventSerializer
from .models import ExecutiveCalendarEvent


def user_can_access_executive_calendar(user, executive_id) -> bool:
    if user.is_superuser or str(user.id) == str(executive_id):
        return True
    role = getattr(user, "system_role", None)
    perms = getattr(role, "permissions", {}) if role else {}
    if isinstance(perms, dict) and perms.get("can_access_administration"):
        return True
    return Delegation.objects.filter(
        principal_id=executive_id,
        assistant=user,
        active=True,
    ).exists()


class ExecutiveCalendarEventViewSet(viewsets.ModelViewSet):
    queryset = ExecutiveCalendarEvent.objects.select_related(
        "executive", "created_by", "correspondence"
    )
    serializer_class = ExecutiveCalendarEventSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        executive_id = self.request.query_params.get("executive")

        if executive_id:
            if not user_can_access_executive_calendar(user, executive_id):
                raise PermissionDenied("You cannot view this executive's calendar.")
            qs = qs.filter(executive_id=executive_id)
        elif not user.is_superuser:
            delegated_executive_ids = Delegation.objects.filter(
                assistant=user,
                active=True,
            ).values_list("principal_id", flat=True)
            qs = qs.filter(executive_id__in=list(delegated_executive_ids) + [user.id])

        from_date = self.request.query_params.get("from")
        to_date = self.request.query_params.get("to")
        if from_date:
            parsed = parse_datetime(from_date) or parse_datetime(f"{from_date}T00:00:00")
            if parsed:
                qs = qs.filter(ends_at__gte=parsed)
        if to_date:
            parsed = parse_datetime(to_date) or parse_datetime(f"{to_date}T23:59:59")
            if parsed:
                qs = qs.filter(starts_at__lte=parsed)

        return qs.order_by("starts_at")

    def perform_create(self, serializer):
        executive = serializer.validated_data.get("executive")
        if not user_can_access_executive_calendar(self.request.user, executive.id):
            raise PermissionDenied("You cannot create events for this executive.")
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        executive = serializer.instance.executive
        if not user_can_access_executive_calendar(self.request.user, executive.id):
            raise PermissionDenied("You cannot update this calendar event.")
        serializer.save()

    def perform_destroy(self, instance):
        if not user_can_access_executive_calendar(self.request.user, instance.executive_id):
            raise PermissionDenied("You cannot delete this calendar event.")
        instance.delete()

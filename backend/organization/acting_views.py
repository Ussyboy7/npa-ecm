"""API for office acting appointments (seat succession) and Plan C requests."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils.dateparse import parse_datetime
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.pagination import CatalogPageNumberPagination

from .acting_services import (
    appoint_acting,
    create_acting_request,
    dismiss_acting_request,
    eligible_acting_candidates,
    end_acting,
    get_active_appointments_for_acting_user,
    user_can_manage_acting,
    user_can_resolve_acting_requests,
    user_is_office_member,
)
from .models import ActingAppointment, ActingRequest, Office, OfficeMembership
from .serializers import ActingAppointmentSerializer, ActingRequestSerializer

User = get_user_model()


class ActingAppointmentViewSet(viewsets.ReadOnlyModelViewSet):
    """List/retrieve acting appointments; create via appoint; end via end action."""

    serializer_class = ActingAppointmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["office", "principal", "acting_user", "is_active"]
    ordering_fields = ["starts_at", "ends_at", "created_at"]
    ordering = ["-starts_at"]

    def get_queryset(self):
        user = self.request.user
        qs = ActingAppointment.objects.select_related(
            "office",
            "principal",
            "acting_user",
            "appointed_by",
            "ended_by",
            "membership",
        )
        if getattr(user, "is_superuser", False):
            return qs
        from organization.permission_utils import user_has_permission

        if user_has_permission(user, "can_manage_org_structure") or user_has_permission(
            user, "can_manage_users"
        ):
            return qs
        return qs.filter(
            Q(principal=user) | Q(acting_user=user) | Q(appointed_by=user)
        )

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request):
        """Active appointments where the current user is the acting officer."""
        appointments = get_active_appointments_for_acting_user(request.user)
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="my-principal")
    def my_principal(self, request):
        """Active appointments where the current user is the absent principal."""
        qs = (
            self.get_queryset()
            .filter(principal=request.user, is_active=True)
            .order_by("-starts_at")
        )
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="eligible")
    def eligible(self, request):
        """List eligible acting candidates for an office."""
        office_id = request.query_params.get("office")
        principal_id = request.query_params.get("principal")
        if not office_id:
            raise ValidationError({"office": "office query parameter is required."})
        try:
            office = Office.objects.get(id=office_id, is_active=True)
        except Office.DoesNotExist as exc:
            raise ValidationError({"office": "Office not found."}) from exc

        principal = None
        if principal_id:
            try:
                principal = User.objects.get(id=principal_id)
            except User.DoesNotExist as exc:
                raise ValidationError({"principal": "Principal not found."}) from exc
        else:
            principal_membership = (
                OfficeMembership.objects.filter(
                    office=office,
                    assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
                    is_active=True,
                )
                .select_related("user")
                .first()
            )
            principal = principal_membership.user if principal_membership else None

        can_view = user_can_manage_acting(
            request.user, office=office, principal=principal
        ) or user_is_office_member(request.user, office)
        if not can_view:
            return Response(
                {"detail": "You do not have permission to view eligible candidates."},
                status=status.HTTP_403_FORBIDDEN,
            )

        users = eligible_acting_candidates(office, exclude_user=principal)
        return Response(
            [
                {
                    "id": str(u.id),
                    "username": u.username,
                    "name": u.get_full_name() or u.username,
                    "email": u.email,
                    "grade_level": getattr(u, "grade_level", "") or "",
                }
                for u in users
            ]
        )

    @action(detail=False, methods=["post"], url_path="appoint")
    def appoint(self, request):
        office_id = request.data.get("office")
        principal_id = request.data.get("principal")
        acting_user_id = request.data.get("acting_user")
        starts_at_raw = request.data.get("starts_at")
        ends_at_raw = request.data.get("ends_at")
        reason = request.data.get("reason") or ""

        if not office_id or not acting_user_id:
            raise ValidationError(
                {"detail": "office and acting_user are required."}
            )

        try:
            office = Office.objects.get(id=office_id)
        except Office.DoesNotExist as exc:
            raise ValidationError({"office": "Office not found."}) from exc

        if principal_id:
            try:
                principal = User.objects.get(id=principal_id)
            except User.DoesNotExist as exc:
                raise ValidationError({"principal": "Principal not found."}) from exc
        else:
            principal_membership = (
                OfficeMembership.objects.filter(
                    office=office,
                    assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
                    is_active=True,
                )
                .select_related("user")
                .first()
            )
            if not principal_membership:
                raise ValidationError(
                    {"principal": "No active principal membership for this office."}
                )
            principal = principal_membership.user

        try:
            acting_user = User.objects.get(id=acting_user_id)
        except User.DoesNotExist as exc:
            raise ValidationError({"acting_user": "Acting user not found."}) from exc

        starts_at = parse_datetime(starts_at_raw) if starts_at_raw else None
        ends_at = parse_datetime(ends_at_raw) if ends_at_raw else None
        if starts_at_raw and starts_at is None:
            raise ValidationError({"starts_at": "Invalid datetime format."})
        if ends_at_raw and ends_at is None:
            raise ValidationError({"ends_at": "Invalid datetime format."})

        appointment = appoint_acting(
            office=office,
            principal=principal,
            acting_user=acting_user,
            appointed_by=request.user,
            starts_at=starts_at,
            ends_at=ends_at,
            reason=reason,
        )
        return Response(
            self.get_serializer(appointment).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="end")
    def end(self, request, pk=None):
        appointment = self.get_object()
        reason = request.data.get("reason") or ""
        ended = end_acting(appointment, ended_by=request.user, reason=reason)
        return Response(self.get_serializer(ended).data)


class ActingRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """Plan C: office members request acting appointments; admins resolve them."""

    serializer_class = ActingRequestSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["office", "status", "principal", "requested_by"]
    ordering_fields = ["created_at", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = ActingRequest.objects.select_related(
            "office",
            "principal",
            "requested_by",
            "suggested_acting_user",
            "resolved_by",
            "appointment",
        )
        if user_can_resolve_acting_requests(user):
            return qs
        member_office_ids = OfficeMembership.objects.filter(
            user=user, is_active=True
        ).values_list("office_id", flat=True)
        return qs.filter(
            Q(requested_by=user)
            | Q(principal=user)
            | Q(office_id__in=member_office_ids)
        )

    @action(detail=False, methods=["post"], url_path="request")
    def request_acting(self, request):
        office_id = request.data.get("office")
        principal_id = request.data.get("principal")
        suggested_id = request.data.get("suggested_acting_user")
        reason = request.data.get("reason") or ""

        if not office_id:
            raise ValidationError({"office": "office is required."})
        try:
            office = Office.objects.get(id=office_id)
        except Office.DoesNotExist as exc:
            raise ValidationError({"office": "Office not found."}) from exc

        principal = None
        if principal_id:
            try:
                principal = User.objects.get(id=principal_id)
            except User.DoesNotExist as exc:
                raise ValidationError({"principal": "Principal not found."}) from exc

        suggested = None
        if suggested_id:
            try:
                suggested = User.objects.get(id=suggested_id)
            except User.DoesNotExist as exc:
                raise ValidationError(
                    {"suggested_acting_user": "Suggested user not found."}
                ) from exc

        row = create_acting_request(
            office=office,
            requested_by=request.user,
            reason=reason,
            principal=principal,
            suggested_acting_user=suggested,
        )
        return Response(self.get_serializer(row).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="dismiss")
    def dismiss(self, request, pk=None):
        row = self.get_object()
        note = request.data.get("resolution_note") or request.data.get("note") or ""
        updated = dismiss_acting_request(row, resolved_by=request.user, note=note)
        return Response(self.get_serializer(updated).data)

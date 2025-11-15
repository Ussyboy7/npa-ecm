"""Viewsets for organizational hierarchy resources."""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Department, Directorate, Division, Office, OfficeMembership, Role
from .serializers import (
    DepartmentSerializer,
    DirectorateSerializer,
    DivisionSerializer,
    OfficeMembershipSerializer,
    OfficeSerializer,
    RoleSerializer,
)


class DirectorateViewSet(viewsets.ModelViewSet):
    queryset = Directorate.objects.all().select_related("executive_director")
    serializer_class = DirectorateSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "code", "description"]
    ordering_fields = ["name", "code", "created_at"]


class DivisionViewSet(viewsets.ModelViewSet):
    queryset = Division.objects.select_related("directorate", "general_manager")
    serializer_class = DivisionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["directorate", "is_active"]
    search_fields = ["name", "code", "directorate__name"]
    ordering_fields = ["name", "code", "created_at"]


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related("division", "division__directorate", "head_of_department")
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["division", "division__directorate", "is_active"]
    search_fields = ["name", "code", "division__name", "division__directorate__name"]
    ordering_fields = ["name", "code", "created_at"]


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.prefetch_related("users")
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]


class OfficeViewSet(viewsets.ModelViewSet):
    queryset = Office.objects.select_related("directorate", "division", "department", "parent")
    serializer_class = OfficeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        "office_type",
        "directorate",
        "division",
        "department",
        "is_active",
        "allow_external_intake",
        "allow_lateral_routing",
    ]
    search_fields = ["name", "code", "description"]
    ordering_fields = ["name", "code", "created_at"]


class OfficeMembershipViewSet(viewsets.ModelViewSet):
    queryset = OfficeMembership.objects.select_related("office", "user")
    serializer_class = OfficeMembershipSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["office", "user", "assignment_role", "is_primary", "is_active"]
    search_fields = ["user__username", "user__first_name", "user__last_name", "office__name", "office__code"]
    ordering_fields = ["created_at", "starts_at", "ends_at"]

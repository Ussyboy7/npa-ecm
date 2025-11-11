"""Viewsets for organizational hierarchy resources."""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Department, Directorate, Division
from .serializers import DepartmentSerializer, DirectorateSerializer, DivisionSerializer


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

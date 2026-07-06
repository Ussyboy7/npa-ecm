"""API endpoints for the external entity directory."""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from audit.services import AuditService
from common.pagination import CatalogPageNumberPagination

from .models import ExternalEntity
from .external_entity_serializers import ExternalEntitySerializer


class ExternalEntityViewSet(viewsets.ModelViewSet):
    queryset = ExternalEntity.objects.all()
    serializer_class = ExternalEntitySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["entity_type", "is_active"]
    search_fields = ["name", "acronym", "contact_email"]
    ordering_fields = ["name", "entity_type", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in {"list", "retrieve"}:
            active_only = self.request.query_params.get("active_only")
            if active_only == "true":
                qs = qs.filter(is_active=True)
            return qs
        return qs

    def _ensure_can_manage(self):
        from organization.permission_utils import require_any_permission

        require_any_permission(
            self.request.user,
            "can_access_administration",
            "can_manage_org_structure",
            "can_register_correspondence",
        )

    def perform_create(self, serializer):
        self._ensure_can_manage()
        entity = serializer.save()
        AuditService.log(
            user=self.request.user,
            action="create",
            module="correspondence",
            object_type="external_entity",
            object_id=str(entity.id),
            object_repr=entity.name,
            description=f"Created external entity: {entity.name}",
        )

    def perform_update(self, serializer):
        self._ensure_can_manage()
        entity = serializer.save()
        AuditService.log(
            user=self.request.user,
            action="update",
            module="correspondence",
            object_type="external_entity",
            object_id=str(entity.id),
            object_repr=entity.name,
            description=f"Updated external entity: {entity.name}",
        )

    def perform_destroy(self, instance):
        self._ensure_can_manage()
        AuditService.log(
            user=self.request.user,
            action="delete",
            module="correspondence",
            object_type="external_entity",
            object_id=str(instance.id),
            object_repr=instance.name,
            description=f"Deleted external entity: {instance.name}",
        )
        instance.delete()

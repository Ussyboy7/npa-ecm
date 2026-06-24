"""Viewsets for organizational hierarchy resources."""

from datetime import datetime

from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from audit.services import AuditService
from common.pagination import CatalogPageNumberPagination
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
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "code", "description"]
    ordering_fields = ["name", "code", "created_at"]

    def perform_create(self, serializer):
        instance = serializer.save()
        from audit.models import ActivityLog
        AuditService.log_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.ORGANIZATION_UPDATED,
            object_type="directorate",
            object_id=str(instance.id),
            object_repr=instance.name,
            module="organization",
            description=f"Created directorate: {instance.name}",
            request=self.request,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        from audit.models import ActivityLog
        AuditService.log_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.ORGANIZATION_UPDATED,
            object_type="directorate",
            object_id=str(instance.id),
            object_repr=instance.name,
            module="organization",
            description=f"Updated directorate: {instance.name}",
            request=self.request,
        )

    def perform_destroy(self, instance):
        from audit.models import ActivityLog
        AuditService.log_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.ORGANIZATION_DELETED,
            object_type="directorate",
            object_id=str(instance.id),
            object_repr=instance.name,
            module="organization",
            description=f"Deleted directorate: {instance.name}",
            request=self.request,
        )
        super().perform_destroy(instance)


class DivisionViewSet(viewsets.ModelViewSet):
    queryset = Division.objects.select_related("directorate", "general_manager")
    serializer_class = DivisionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["directorate", "is_active"]
    search_fields = ["name", "code", "directorate__name"]
    ordering_fields = ["name", "code", "created_at"]

    def filter_queryset(self, queryset):
        """Add backend filtering for date ranges and additional filters."""
        queryset = super().filter_queryset(queryset)
        
        # Filter by directorate name (if provided as search)
        directorate_name = self.request.query_params.get("directorate_name")
        if directorate_name:
            queryset = queryset.filter(directorate__name__icontains=directorate_name)
        
        return queryset


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related("division", "division__directorate", "head_of_department")
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["division", "division__directorate", "is_active"]
    search_fields = ["name", "code", "division__name", "division__directorate__name"]
    ordering_fields = ["name", "code", "created_at"]

    def filter_queryset(self, queryset):
        """Add backend filtering for additional filters."""
        queryset = super().filter_queryset(queryset)
        
        # Filter by division name
        division_name = self.request.query_params.get("division_name")
        if division_name:
            queryset = queryset.filter(division__name__icontains=division_name)
        
        # Filter by directorate name
        directorate_name = self.request.query_params.get("directorate_name")
        if directorate_name:
            queryset = queryset.filter(division__directorate__name__icontains=directorate_name)
        
        return queryset


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.annotate(user_count=Count("users")).prefetch_related("users")
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    def _ensure_super_admin(self):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only super administrators may modify roles.")

    def perform_create(self, serializer):
        self._ensure_super_admin()
        instance = serializer.save()
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.ROLE_CREATED,
            object_type="role",
            object_id=str(instance.id),
            object_repr=instance.name,
            module="organization",
            description=f"Created role: {instance.name}",
            request=self.request,
        )

    def perform_update(self, serializer):
        self._ensure_super_admin()
        instance = serializer.save()
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.ROLE_UPDATED,
            object_type="role",
            object_id=str(instance.id),
            object_repr=instance.name,
            module="organization",
            description=f"Updated role: {instance.name}",
            request=self.request,
            metadata={"changes": serializer.validated_data},
        )

    def perform_destroy(self, instance):
        self._ensure_super_admin()
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.ROLE_DELETED,
            object_type="role",
            object_id=str(instance.id),
            object_repr=instance.name,
            module="organization",
            description=f"Deleted role: {instance.name}",
            request=self.request,
        )
        
        super().perform_destroy(instance)

    @action(detail=False, methods=["post"], url_path="bulk-assign")
    def bulk_assign(self, request):
        """Assign a role to multiple users at once."""
        self._ensure_super_admin()
        
        role_id = request.data.get("role_id")
        user_ids = request.data.get("user_ids", [])
        
        if not role_id:
            raise ValidationError({"role_id": "Role ID is required"})
        if not user_ids:
            raise ValidationError({"user_ids": "User IDs are required"})
        
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            raise ValidationError({"role_id": "Role not found"})
        
        from accounts.models import User
        users = User.objects.filter(id__in=user_ids)
        updated_count = users.update(system_role=role)
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_activity(
            user=request.user,
            action=ActivityLog.ActionType.ROLE_UPDATED,
            object_type="role",
            object_id=str(role.id),
            object_repr=role.name,
            module="organization",
            description=f"Bulk assigned role '{role.name}' to {updated_count} user(s)",
            request=request,
            metadata={"user_ids": user_ids, "count": updated_count},
        )
        
        return Response({
            "message": f"Successfully assigned role '{role.name}' to {updated_count} user(s)",
            "assigned_count": updated_count,
        })

    @action(detail=True, methods=["post"], url_path="clone")
    def clone_role(self, request, pk=None):
        """Clone an existing role with a new name."""
        self._ensure_super_admin()
        
        source_role = self.get_object()
        new_name = request.data.get("name")
        
        if not new_name:
            raise ValidationError({"name": "New role name is required"})
        
        if Role.objects.filter(name=new_name).exists():
            raise ValidationError({"name": f"Role '{new_name}' already exists"})
        
        # Clone the role
        new_role = Role.objects.create(
            name=new_name,
            description=request.data.get("description", f"Cloned from {source_role.name}"),
            permissions=source_role.permissions.copy() if source_role.permissions else {},
            is_active=request.data.get("is_active", True),
        )
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_activity(
            user=request.user,
            action=ActivityLog.ActionType.ROLE_CREATED,
            object_type="role",
            object_id=str(new_role.id),
            object_repr=new_role.name,
            module="organization",
            description=f"Cloned role '{source_role.name}' to '{new_role.name}'",
            request=request,
            metadata={"source_role_id": str(source_role.id), "source_role_name": source_role.name},
        )
        
        serializer = self.get_serializer(new_role)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="templates")
    def role_templates(self, request):
        """Get predefined role templates."""
        templates = [
            {
                "name": "Super Admin",
                "description": "Full system access with all permissions",
                "permissions": {
                    "users": ["create", "read", "update", "delete"],
                    "roles": ["create", "read", "update", "delete"],
                    "organization": ["create", "read", "update", "delete"],
                    "correspondence": ["create", "read", "update", "delete", "approve"],
                    "documents": ["create", "read", "update", "delete", "approve"],
                    "analytics": ["read"],
                    "audit": ["read"],
                },
            },
            {
                "name": "Executive",
                "description": "Executive level access with approval rights",
                "permissions": {
                    "correspondence": ["create", "read", "update", "approve"],
                    "documents": ["create", "read", "update", "approve"],
                    "analytics": ["read"],
                    "users": ["read"],
                },
            },
            {
                "name": "Manager",
                "description": "Department/Division manager with team oversight",
                "permissions": {
                    "correspondence": ["create", "read", "update", "route"],
                    "documents": ["create", "read", "update"],
                    "analytics": ["read"],
                    "users": ["read"],
                },
            },
            {
                "name": "Staff Officer",
                "description": "Standard staff member with basic access",
                "permissions": {
                    "correspondence": ["create", "read", "update"],
                    "documents": ["create", "read", "update"],
                },
            },
            {
                "name": "Registry Officer",
                "description": "Registry staff for correspondence registration",
                "permissions": {
                    "correspondence": ["create", "read", "register", "route"],
                    "documents": ["read"],
                },
            },
            {
                "name": "Read Only",
                "description": "View-only access for observers",
                "permissions": {
                    "correspondence": ["read"],
                    "documents": ["read"],
                    "analytics": ["read"],
                },
            },
        ]
        
        return Response({"templates": templates})

    @action(detail=False, methods=["post"], url_path="create-from-template")
    def create_from_template(self, request):
        """Create a role from a predefined template."""
        self._ensure_super_admin()
        
        template_name = request.data.get("template_name")
        custom_name = request.data.get("name")
        
        if not template_name:
            raise ValidationError({"template_name": "Template name is required"})
        
        # Get templates
        templates_response = self.role_templates(request)
        templates = templates_response.data["templates"]
        
        # Find template
        template = next((t for t in templates if t["name"] == template_name), None)
        if not template:
            raise ValidationError({"template_name": f"Template '{template_name}' not found"})
        
        # Use custom name or template name
        role_name = custom_name or template["name"]
        
        if Role.objects.filter(name=role_name).exists():
            raise ValidationError({"name": f"Role '{role_name}' already exists"})
        
        # Create role from template
        new_role = Role.objects.create(
            name=role_name,
            description=template["description"],
            permissions=template["permissions"],
            is_active=True,
        )
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_activity(
            user=request.user,
            action=ActivityLog.ActionType.ROLE_CREATED,
            object_type="role",
            object_id=str(new_role.id),
            object_repr=new_role.name,
            module="organization",
            description=f"Created role '{new_role.name}' from template '{template_name}'",
            request=request,
            metadata={"template_name": template_name},
        )
        
        serializer = self.get_serializer(new_role)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OfficeViewSet(viewsets.ModelViewSet):
    queryset = Office.objects.select_related("directorate", "division", "department", "parent")
    serializer_class = OfficeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
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
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["office", "user", "assignment_role", "is_primary", "is_active"]
    search_fields = ["user__username", "user__first_name", "user__last_name", "office__name", "office__code"]
    ordering_fields = ["created_at", "starts_at", "ends_at"]

    def _ensure_super_admin(self):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only super administrators may modify office memberships.")

    def perform_create(self, serializer):
        self._ensure_super_admin()
        serializer.save()

    def perform_update(self, serializer):
        self._ensure_super_admin()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_super_admin()
        super().perform_destroy(instance)

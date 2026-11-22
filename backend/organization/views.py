"""Viewsets for organizational hierarchy resources."""

from collections import defaultdict

from django.db import transaction
from django.db.models import Count, OuterRef, Q, Subquery
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from audit.services import AuditService
from common.pagination import CatalogPageNumberPagination
from common.permissions import CanAccessAdministration
from .models import (
    Department,
    Directorate,
    Division,
    Office,
    OfficeMembership,
    ReferenceAllocation,
    ReferenceScheme,
    Role,
)
from .serializers import (
    DepartmentSerializer,
    DirectorateSerializer,
    DivisionSerializer,
    OfficeMembershipSerializer,
    OfficeSerializer,
    ReferenceAllocationSerializer,
    ReferenceSchemeSerializer,
    RoleSerializer,
)


def _user_can_read_full_org_hierarchy(user):
    from organization.permission_utils import user_can_read_full_org_hierarchy

    return user_can_read_full_org_hierarchy(user)


def _scope_hierarchy_queryset(queryset, user, level):
    if _user_can_read_full_org_hierarchy(user):
        return queryset
    if not user or not getattr(user, "is_authenticated", False):
        return queryset.none()
    unit_id = getattr(user, f"{level}_id", None)
    if not unit_id:
        return queryset.none()
    return queryset.filter(pk=unit_id)


def _scope_office_queryset(queryset, user):
    if _user_can_read_full_org_hierarchy(user):
        return queryset
    if not user or not getattr(user, "is_authenticated", False):
        return queryset.none()
    visible = Q(memberships__user=user, memberships__is_active=True)
    if getattr(user, "department_id", None):
        visible |= Q(department_id=user.department_id)
    if getattr(user, "division_id", None):
        visible |= Q(division_id=user.division_id)
    if getattr(user, "directorate_id", None):
        visible |= Q(directorate_id=user.directorate_id)
    return queryset.filter(visible).distinct()


class OrgHierarchyReadScopeMixin:
    """Non-administrative users only read the hierarchy units they belong to."""

    hierarchy_level = ""

    def get_queryset(self):
        return _scope_hierarchy_queryset(
            super().get_queryset(), self.request.user, self.hierarchy_level
        )


class OrgStructureAdminMixin:
    """Writes to org hierarchy require can_manage_org_structure."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            from organization.permission_utils import require_permission

            require_permission(request.user, "can_manage_org_structure")


class DirectorateViewSet(OrgHierarchyReadScopeMixin, OrgStructureAdminMixin, viewsets.ModelViewSet):
    hierarchy_level = "directorate"
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


class DivisionViewSet(OrgHierarchyReadScopeMixin, OrgStructureAdminMixin, viewsets.ModelViewSet):
    hierarchy_level = "division"
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


class DepartmentViewSet(OrgHierarchyReadScopeMixin, OrgStructureAdminMixin, viewsets.ModelViewSet):
    hierarchy_level = "department"
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
    queryset = Role.objects.annotate(
        user_count=Count("users"),
        active_user_count=Count("users", filter=Q(users__is_active=True)),
    ).prefetch_related("users")
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    def _ensure_can_manage_roles(self):
        from organization.permission_utils import require_permission

        require_permission(self.request.user, "can_manage_roles")

    def _ensure_super_admin(self):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only super administrators may perform this action.")

    def _ensure_can_change_privileged_permissions(self, current, updates):
        """Administrative permission grants and revocations are superuser-only."""
        from organization.permissions_catalog import privileged_permission_changes

        if self.request.user.is_superuser:
            return
        changed = privileged_permission_changes(current, updates)
        if changed:
            raise PermissionDenied(
                "Only a super administrator can change administrative permissions: "
                + ", ".join(changed)
            )

    def perform_create(self, serializer):
        self._ensure_can_manage_roles()
        self._ensure_can_change_privileged_permissions(
            {}, serializer.validated_data.get("permissions")
        )
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
        self._ensure_can_manage_roles()
        target = self.get_object()
        if target.is_system:
            if "name" in serializer.validated_data and serializer.validated_data["name"] != target.name:
                raise ValidationError({"name": "System roles cannot be renamed."})
            if "is_active" in serializer.validated_data and not serializer.validated_data["is_active"]:
                raise ValidationError({"is_active": "System roles cannot be deactivated."})
        self._ensure_can_change_privileged_permissions(
            target.permissions, serializer.validated_data.get("permissions")
        )
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
        self._ensure_can_manage_roles()
        if instance.is_system:
            raise ValidationError({"detail": "System roles cannot be deleted."})
        
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

    @action(detail=False, methods=["get"], url_path="permission-catalog")
    def permission_catalog(self, request):
        """Return canonical permission keys for the role admin matrix."""
        from organization.permissions_catalog import get_permission_catalog

        return Response({"permissions": get_permission_catalog()})

    @action(detail=False, methods=["post"], url_path="bulk-assign")
    def bulk_assign(self, request):
        """Assign a role to multiple users at once."""
        from organization.permission_utils import require_any_permission

        # Role administration is organisation-wide; people managers may assign
        # within their own division or department only.
        require_any_permission(request.user, "can_manage_roles", "can_manage_users")
        
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
        from organization.org_scope import (
            scoped_people_admin_boundary,
            target_within_people_admin_boundary,
        )
        from organization.permissions_catalog import role_has_privileged_permissions

        if role_has_privileged_permissions(role) and not request.user.is_superuser:
            raise PermissionDenied("Only a super administrator can assign an administrative role.")

        boundary = scoped_people_admin_boundary(request.user)
        with transaction.atomic():
            targets = list(
                User.objects.select_for_update(of=("self",))
                .filter(id__in=user_ids)
                .select_related("department", "system_role")
            )
            if not request.user.is_superuser:
                for target in targets:
                    if getattr(target, "is_superuser", False) or role_has_privileged_permissions(
                        getattr(target, "system_role", None)
                    ):
                        raise PermissionDenied(
                            "Only a super administrator can change another administrative account."
                        )
                    if not target_within_people_admin_boundary(boundary, target):
                        raise PermissionDenied(
                            "You can only assign roles to users within your own organisational unit."
                        )
            updated_count = User.objects.filter(pk__in=[user.pk for user in targets]).update(
                system_role=role
            )

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

    @action(detail=True, methods=["patch"], url_path=r"permissions/(?P<permission_id>[^/.]+)")
    def update_permission(self, request, pk=None, permission_id=None):
        """Toggle one permission atomically so concurrent edits do not clobber peers."""
        self._ensure_can_manage_roles()
        from organization.permissions_catalog import PERMISSION_KEYS, normalize_permissions

        if permission_id not in PERMISSION_KEYS:
            raise ValidationError({"permission": "Unknown permission key."})
        if "enabled" not in request.data:
            raise ValidationError({"enabled": "A boolean enabled value is required."})

        enabled = request.data.get("enabled")
        if not isinstance(enabled, bool):
            raise ValidationError({"enabled": "A boolean enabled value is required."})
        with transaction.atomic():
            try:
                role = Role.objects.select_for_update().get(pk=pk)
            except Role.DoesNotExist:
                raise ValidationError({"role": "Role not found."})
            permissions = normalize_permissions(role.permissions or {})
            self._ensure_can_change_privileged_permissions(
                permissions, {permission_id: enabled}
            )
            permissions[permission_id] = enabled
            role.permissions = permissions
            role.save(update_fields=["permissions", "updated_at"])

        from audit.models import ActivityLog
        AuditService.log_activity(
            user=request.user,
            action=ActivityLog.ActionType.ROLE_UPDATED,
            object_type="role",
            object_id=str(role.id),
            object_repr=role.name,
            module="organization",
            description=f"{'Granted' if enabled else 'Revoked'} {permission_id} for role: {role.name}",
            request=request,
            metadata={"permission": permission_id, "enabled": enabled},
        )
        response_role = self.get_queryset().get(pk=role.pk)
        return Response(self.get_serializer(response_role).data)

    @action(detail=True, methods=["patch"], url_path="permissions")
    def update_permissions(self, request, pk=None):
        """Merge a batch of permission changes under one row lock."""
        self._ensure_can_manage_roles()
        from organization.permissions_catalog import PERMISSION_KEYS, normalize_permissions

        updates = request.data.get("permissions")
        if not isinstance(updates, dict) or not updates:
            raise ValidationError({"permissions": "A non-empty permission map is required."})
        unknown = sorted(set(updates) - set(PERMISSION_KEYS))
        if unknown:
            raise ValidationError({"permissions": f"Unknown permission key(s): {', '.join(unknown)}"})
        if any(not isinstance(value, bool) for value in updates.values()):
            raise ValidationError({"permissions": "Permission values must be booleans."})

        with transaction.atomic():
            try:
                role = Role.objects.select_for_update().get(pk=pk)
            except Role.DoesNotExist:
                raise ValidationError({"role": "Role not found."})
            permissions = normalize_permissions(role.permissions or {})
            self._ensure_can_change_privileged_permissions(permissions, updates)
            permissions.update(updates)
            role.permissions = permissions
            role.save(update_fields=["permissions", "updated_at"])

        from audit.models import ActivityLog
        AuditService.log_activity(
            user=request.user,
            action=ActivityLog.ActionType.ROLE_UPDATED,
            object_type="role",
            object_id=str(role.id),
            object_repr=role.name,
            module="organization",
            description=f"Updated {len(updates)} permission(s) for role: {role.name}",
            request=request,
            metadata={"permissions": updates},
        )
        response_role = self.get_queryset().get(pk=role.pk)
        return Response(self.get_serializer(response_role).data)

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
            is_system=False,
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
            is_system=False,
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


class OfficeViewSet(OrgStructureAdminMixin, viewsets.ModelViewSet):
    queryset = Office.objects.select_related("directorate", "division", "department", "parent", "location")
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

    def get_queryset(self):
        from django.db.models import CharField, IntegerField, Value
        from django.db.models.functions import Coalesce, Concat, NullIf, Trim

        active_memberships = OfficeMembership.objects.filter(
            office_id=OuterRef("pk"),
            is_active=True,
        )
        principal_memberships = active_memberships.filter(
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL
        ).order_by("-is_primary", "user__last_name", "user__first_name", "user__username")
        principal_name = principal_memberships.annotate(
            display_name=NullIf(
                Trim(
                    Concat(
                        "user__first_name",
                        Value(" "),
                        "user__last_name",
                        output_field=CharField(),
                    )
                ),
                Value(""),
            )
        ).values("display_name")[:1]
        principal_username = principal_memberships.values("user__username")[:1]
        queryset = super().get_queryset().annotate(
            active_member_count=Coalesce(
                active_memberships.values("office_id")
                .annotate(total=Count("user_id", distinct=True))
                .values("total")[:1],
                Value(0),
                output_field=IntegerField(),
            ),
            active_principal_name=Coalesce(
                Subquery(principal_name),
                Subquery(principal_username),
                output_field=CharField(),
            ),
        )
        return _scope_office_queryset(queryset, self.request.user)


class OfficeMembershipViewSet(viewsets.ModelViewSet):
    queryset = OfficeMembership.objects.select_related("office", "user")
    serializer_class = OfficeMembershipSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["office", "user", "assignment_role", "is_primary", "is_active"]
    search_fields = ["user__username", "user__first_name", "user__last_name", "office__name", "office__code"]
    ordering_fields = ["created_at", "starts_at", "ends_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if _user_can_read_full_org_hierarchy(self.request.user):
            return queryset
        if not self.request.user or not self.request.user.is_authenticated:
            return queryset.none()
        return queryset.filter(user=self.request.user)

    def _ensure_membership_admin(self):
        from organization.permission_utils import require_any_permission

        require_any_permission(
            self.request.user,
            "can_manage_org_structure",
            "can_manage_users",
        )

    @action(detail=False, methods=["get"], url_path="quality")
    def quality(self, request):
        """Summarize actionable conflicts among active office memberships."""
        self._ensure_membership_admin()
        active = OfficeMembership.objects.filter(is_active=True).select_related("office", "user")

        def group_detail_rows(queryset, group_key):
            """Collect bounded membership details without querying once per group."""
            grouped = defaultdict(list)
            for membership in queryset:
                bucket = grouped[group_key(membership)]
                if len(bucket) >= 50:
                    continue
                bucket.append({
                    "id": str(membership.id),
                    "officeId": str(membership.office_id),
                    "officeName": membership.office.name,
                    "userId": str(membership.user_id),
                    "userName": membership.user.get_full_name() or membership.user.username,
                    "role": membership.assignment_role,
                    "isPrimary": membership.is_primary,
                })
            return grouped

        principal_groups = list(
            active.filter(assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL)
            .values("office_id", "office__name")
            .annotate(total=Count("user_id", distinct=True))
            .filter(total__gt=1)
            .order_by("office__name")
        )
        principal_page = principal_groups[:100]
        principal_details = group_detail_rows(
            active.filter(
                assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
                office_id__in=[group["office_id"] for group in principal_page],
            ).order_by("office__name", "user__last_name", "user__first_name", "user__username"),
            lambda membership: membership.office_id,
        ) if principal_page else {}
        principal_conflicts = [
            {
                "officeId": str(group["office_id"]),
                "officeName": group["office__name"],
                "count": group["total"],
                "memberships": principal_details.get(group["office_id"], []),
            }
            for group in principal_page
        ]

        primary_groups = list(
            active.filter(is_primary=True)
            .values("user_id", "user__first_name", "user__last_name", "user__username")
            .annotate(total=Count("office_id", distinct=True))
            .filter(total__gt=1)
            .order_by("user__last_name", "user__first_name", "user__username")
        )
        primary_page = primary_groups[:100]
        primary_details = group_detail_rows(
            active.filter(
                is_primary=True,
                user_id__in=[group["user_id"] for group in primary_page],
            ).order_by("user__last_name", "user__first_name", "office__name"),
            lambda membership: membership.user_id,
        ) if primary_page else {}
        primary_conflicts = [
            {
                "userId": str(group["user_id"]),
                "userName": " ".join(
                    part for part in (group["user__first_name"], group["user__last_name"]) if part
                ) or group["user__username"],
                "count": group["total"],
                "memberships": primary_details.get(group["user_id"], []),
            }
            for group in primary_page
        ]

        duplicate_groups = list(
            active.values("office_id", "office__name", "user_id", "user__first_name", "user__last_name", "user__username")
            .annotate(total=Count("id"))
            .filter(total__gt=1)
            .order_by("office__name", "user__last_name", "user__first_name", "user__username")
        )
        duplicate_page = duplicate_groups[:100]
        duplicate_details = group_detail_rows(
            active.filter(
                user_id__in=[group["user_id"] for group in duplicate_page],
                office_id__in=[group["office_id"] for group in duplicate_page],
            ).order_by("user__last_name", "user__first_name", "office__name", "assignment_role"),
            lambda membership: (membership.office_id, membership.user_id),
        ) if duplicate_page else {}
        duplicate_conflicts = [
            {
                "officeId": str(group["office_id"]),
                "officeName": group["office__name"],
                "userId": str(group["user_id"]),
                "userName": " ".join(
                    part for part in (group["user__first_name"], group["user__last_name"]) if part
                ) or group["user__username"],
                "count": group["total"],
                "memberships": duplicate_details.get(
                    (group["office_id"], group["user_id"]),
                    [],
                ),
            }
            for group in duplicate_page
        ]

        return Response({
            "counts": {
                "multipleActivePrincipals": len(principal_groups),
                "multiplePrimaryAssignments": len(primary_groups),
                "duplicateOfficeAssignments": len(duplicate_groups),
            },
            "multipleActivePrincipals": principal_conflicts,
            "multiplePrimaryAssignments": primary_conflicts,
            "duplicateOfficeAssignments": duplicate_conflicts,
        })

    def _ensure_membership_in_scope(self, office, user):
        """Scoped people managers may only seat users inside their own unit."""
        from organization.org_scope import (
            office_within_people_admin_boundary,
            scoped_people_admin_boundary,
            target_within_people_admin_boundary,
        )

        boundary = scoped_people_admin_boundary(self.request.user)
        if boundary is None:
            return
        if not target_within_people_admin_boundary(boundary, user):
            raise PermissionDenied(
                "You can only manage office access for users within your own organisational unit."
            )
        if not office_within_people_admin_boundary(boundary, office):
            raise PermissionDenied(
                "You can only manage office access for offices within your own organisational unit."
            )

    def perform_create(self, serializer):
        self._ensure_membership_admin()
        self._ensure_membership_in_scope(
            serializer.validated_data.get("office"),
            serializer.validated_data.get("user"),
        )
        serializer.save()

    def perform_update(self, serializer):
        self._ensure_membership_admin()
        self._ensure_membership_in_scope(
            serializer.validated_data.get("office", serializer.instance.office),
            serializer.validated_data.get("user", serializer.instance.user),
        )
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_membership_admin()
        self._ensure_membership_in_scope(instance.office, instance.user)
        super().perform_destroy(instance)


class ReferenceSchemeViewSet(OrgStructureAdminMixin, viewsets.ModelViewSet):
    """Reference-number schemes per directorate/division/department."""

    serializer_class = ReferenceSchemeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["scope_type", "is_active"]
    search_fields = [
        "unit_code",
        "authority_code",
        "description",
        "directorate__name",
        "division__name",
        "department__name",
    ]
    ordering_fields = ["scope_type", "unit_code", "created_at", "updated_at"]
    ordering = ["scope_type", "unit_code"]

    def get_queryset(self):
        return (
            ReferenceScheme.objects.select_related(
                "directorate", "division__directorate", "department__division__directorate"
            )
            .prefetch_related("classifications")
            .all()
        )

    def _log(self, instance, description):
        from audit.models import ActivityLog

        AuditService.log_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.ORGANIZATION_UPDATED,
            object_type="reference_scheme",
            object_id=str(instance.id),
            object_repr=str(instance),
            module="organization",
            description=description,
            request=self.request,
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log(instance, f"Created reference scheme: {instance}")

    def perform_update(self, serializer):
        instance = serializer.save()
        self._log(instance, f"Updated reference scheme: {instance}")

    def perform_destroy(self, instance):
        from audit.models import ActivityLog

        AuditService.log_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.ORGANIZATION_DELETED,
            object_type="reference_scheme",
            object_id=str(instance.id),
            object_repr=str(instance),
            module="organization",
            description=f"Deleted reference scheme: {instance}",
            request=self.request,
        )
        super().perform_destroy(instance)

    @action(detail=False, methods=["get"], url_path="resolve")
    def resolve(self, request):
        """Resolve the active scheme for an office/division/department (registration form)."""
        from organization.models import Department, Division, Office
        from organization.reference_services import (
            resolve_reference_scheme,
            scheme_context,
        )

        office = None
        office_id = request.query_params.get("office") or request.query_params.get("owning_office")
        if office_id:
            office = Office.objects.filter(id=office_id).first()
        division = None
        if request.query_params.get("division"):
            division = Division.objects.filter(id=request.query_params["division"]).first()
        department = None
        if request.query_params.get("department"):
            department = Department.objects.filter(id=request.query_params["department"]).first()

        scheme = resolve_reference_scheme(
            office=office, division=division, department=department
        )
        if scheme is None:
            return Response({"scheme": None, "classifications": []})
        return Response({"scheme": scheme_context(scheme)})


class ReferenceAllocationViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin audit ledger of reference numbers already issued."""

    serializer_class = ReferenceAllocationSerializer
    permission_classes = [IsAuthenticated, CanAccessAdministration]
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["scope_type", "classification_code"]
    search_fields = [
        "reference_number",
        "unit_code",
        "classification_code",
        "classification__label",
        "correspondence__reference_number",
        "correspondence__subject",
        "scheme__directorate__name",
        "scheme__division__name",
        "scheme__department__name",
    ]
    ordering_fields = ["created_at", "reference_number", "serial"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return ReferenceAllocation.objects.select_related(
            "classification",
            "correspondence",
            "created_by",
            "scheme__directorate",
            "scheme__division__directorate",
            "scheme__department__division__directorate",
        ).all()

"""Serializers for organizational structure models."""

from rest_framework import serializers

from .models import ActingAppointment, ActingRequest, Department, Directorate, Division, Office, OfficeMembership, Role


class DirectorateSerializer(serializers.ModelSerializer):
    executive_director_name = serializers.CharField(source="executive_director.get_full_name", read_only=True)

    class Meta:
        model = Directorate
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "executive_director",
            "executive_director_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class DivisionSerializer(serializers.ModelSerializer):
    directorate_name = serializers.CharField(source="directorate.name", read_only=True)
    general_manager_name = serializers.CharField(source="general_manager.get_full_name", read_only=True)

    class Meta:
        model = Division
        fields = [
            "id",
            "directorate",
            "directorate_name",
            "name",
            "code",
            "is_active",
            "general_manager",
            "general_manager_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class DepartmentSerializer(serializers.ModelSerializer):
    division_name = serializers.CharField(source="division.name", read_only=True)
    directorate = serializers.UUIDField(source="division.directorate_id", read_only=True)
    directorate_name = serializers.CharField(source="division.directorate.name", read_only=True)
    head_of_department_name = serializers.CharField(source="head_of_department.get_full_name", read_only=True)

    class Meta:
        model = Department
        fields = [
            "id",
            "division",
            "division_name",
            "directorate",
            "directorate_name",
            "name",
            "code",
            "is_active",
            "head_of_department",
            "head_of_department_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "directorate", "directorate_name"]


class RoleSerializer(serializers.ModelSerializer):
    user_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "permissions",
            "user_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "user_count"]


class OfficeSerializer(serializers.ModelSerializer):
    directorate_name = serializers.CharField(source="directorate.name", read_only=True)
    division_name = serializers.CharField(source="division.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    location_name = serializers.CharField(source="location.display_name", read_only=True)

    class Meta:
        model = Office
        fields = [
            "id",
            "name",
            "code",
            "office_type",
            "directorate",
            "directorate_name",
            "division",
            "division_name",
            "department",
            "department_name",
            "parent",
            "parent_name",
            "location",
            "location_name",
            "description",
            "is_active",
            "allow_external_intake",
            "allow_lateral_routing",
            # =============================================================================
            # DELEGATION FIELDS - COMMENTED OUT FOR FUTURE USE
            # Uncomment these fields and run migrations to enable office delegation
            # =============================================================================
            # "is_away",
            # "away_start_date",
            # "away_end_date",
            # "delegate_user",
            # "delegate_role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_parent(self, value):
        """Prevent circular references in office hierarchy."""
        if value and self.instance:
            # Check if setting this parent would create a cycle
            current = value
            visited = {self.instance.id}
            while current:
                if current.id in visited:
                    raise serializers.ValidationError(
                        "Setting this parent would create a circular reference in the office hierarchy."
                    )
                visited.add(current.id)
                current = current.parent
        return value

    def validate(self, attrs):
        """Validate organization hierarchy consistency."""
        division = attrs.get("division") or (self.instance.division if self.instance else None)
        department = attrs.get("department") or (self.instance.department if self.instance else None)
        directorate = attrs.get("directorate") or (self.instance.directorate if self.instance else None)

        # If department is set, division must match department's division
        if department and division:
            if department.division != division:
                raise serializers.ValidationError(
                    {"department": "Department must belong to the specified division."}
                )

        # If division is set, directorate must match division's directorate
        if division and directorate:
            if division.directorate != directorate:
                raise serializers.ValidationError(
                    {"division": "Division must belong to the specified directorate."}
                )

        return attrs


class OfficeMembershipSerializer(serializers.ModelSerializer):
    office_name = serializers.CharField(source="office.name", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = OfficeMembership
        fields = [
            "id",
            "office",
            "office_name",
            "user",
            "user_name",
            "user_username",
            "assignment_role",
            "is_primary",
            "can_register",
            "can_route",
            "can_approve",
            "starts_at",
            "ends_at",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ActingAppointmentSerializer(serializers.ModelSerializer):
    office_name = serializers.CharField(source="office.name", read_only=True)
    office_code = serializers.CharField(source="office.code", read_only=True)
    principal_name = serializers.SerializerMethodField()
    acting_user_name = serializers.SerializerMethodField()
    appointed_by_name = serializers.SerializerMethodField()
    ended_by_name = serializers.SerializerMethodField()
    is_currently_effective = serializers.SerializerMethodField()

    class Meta:
        model = ActingAppointment
        fields = [
            "id",
            "office",
            "office_name",
            "office_code",
            "principal",
            "principal_name",
            "acting_user",
            "acting_user_name",
            "starts_at",
            "ends_at",
            "is_active",
            "is_currently_effective",
            "reason",
            "appointed_by",
            "appointed_by_name",
            "ended_at",
            "ended_by",
            "ended_by_name",
            "membership",
            "items_transferred",
            "items_reclaimed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_active",
            "appointed_by",
            "ended_at",
            "ended_by",
            "membership",
            "items_transferred",
            "items_reclaimed",
            "created_at",
            "updated_at",
        ]

    def _user_name(self, user) -> str:
        if not user:
            return ""
        return user.get_full_name() or user.username

    def get_principal_name(self, obj) -> str:
        return self._user_name(obj.principal)

    def get_acting_user_name(self, obj) -> str:
        return self._user_name(obj.acting_user)

    def get_appointed_by_name(self, obj) -> str:
        return self._user_name(obj.appointed_by)

    def get_ended_by_name(self, obj) -> str:
        return self._user_name(obj.ended_by)

    def get_is_currently_effective(self, obj) -> bool:
        return obj.is_currently_effective()


class ActingRequestSerializer(serializers.ModelSerializer):
    office_name = serializers.CharField(source="office.name", read_only=True)
    office_code = serializers.CharField(source="office.code", read_only=True)
    principal_name = serializers.SerializerMethodField()
    requested_by_name = serializers.SerializerMethodField()
    suggested_acting_user_name = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ActingRequest
        fields = [
            "id",
            "office",
            "office_name",
            "office_code",
            "principal",
            "principal_name",
            "requested_by",
            "requested_by_name",
            "suggested_acting_user",
            "suggested_acting_user_name",
            "reason",
            "pending_item_count",
            "status",
            "resolved_by",
            "resolved_by_name",
            "resolved_at",
            "resolution_note",
            "appointment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "requested_by",
            "pending_item_count",
            "status",
            "resolved_by",
            "resolved_at",
            "resolution_note",
            "appointment",
            "created_at",
            "updated_at",
        ]

    def _user_name(self, user) -> str:
        if not user:
            return ""
        return user.get_full_name() or user.username

    def get_principal_name(self, obj) -> str:
        return self._user_name(obj.principal)

    def get_requested_by_name(self, obj) -> str:
        return self._user_name(obj.requested_by)

    def get_suggested_acting_user_name(self, obj) -> str:
        return self._user_name(obj.suggested_acting_user)

    def get_resolved_by_name(self, obj) -> str:
        return self._user_name(obj.resolved_by)


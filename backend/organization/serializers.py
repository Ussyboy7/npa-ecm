"""Serializers for organizational structure models."""

from rest_framework import serializers

from .models import Department, Directorate, Division, Office, OfficeMembership, Role


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
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "user_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "user_count"]

    def get_user_count(self, obj):
        """Return the number of users assigned to this role."""
        return obj.users.count()


class OfficeSerializer(serializers.ModelSerializer):
    directorate_name = serializers.CharField(source="directorate.name", read_only=True)
    division_name = serializers.CharField(source="division.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    parent_name = serializers.CharField(source="parent.name", read_only=True)

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
            "description",
            "is_active",
            "allow_external_intake",
            "allow_lateral_routing",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


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


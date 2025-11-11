"""Serializers for organizational structure models."""

from rest_framework import serializers

from .models import Department, Directorate, Division


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


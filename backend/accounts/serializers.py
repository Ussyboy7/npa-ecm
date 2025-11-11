"""Serializers for the accounts application."""

from rest_framework import serializers

from organization.models import Department, Directorate, Division

from .models import User


class UserSerializer(serializers.ModelSerializer):
    directorate = serializers.PrimaryKeyRelatedField(
        queryset=Directorate.objects.all(), allow_null=True, required=False
    )
    division = serializers.PrimaryKeyRelatedField(
        queryset=Division.objects.select_related("directorate"), allow_null=True, required=False
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.select_related("division", "division__directorate"), allow_null=True, required=False
    )
    directorate_name = serializers.CharField(source="directorate.name", read_only=True)
    division_name = serializers.CharField(source="division.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_superuser",
            "is_staff",
            "is_management",
            "grade_level",
            "system_role",
            "employee_id",
            "directorate",
            "division",
            "department",
            "directorate_name",
            "division_name",
            "department_name",
            "last_login",
            "date_joined",
        ]
        read_only_fields = ["id", "last_login", "date_joined"]

    def validate(self, attrs):
        directorate = attrs.get("directorate") or getattr(self.instance, "directorate", None)
        division = attrs.get("division") or getattr(self.instance, "division", None)
        department = attrs.get("department") or getattr(self.instance, "department", None)

        if division and directorate and division.directorate_id != directorate.id:
            raise serializers.ValidationError(
                {"division": "Selected division does not belong to the chosen directorate."}
            )

        if department and division and department.division_id != division.id:
            raise serializers.ValidationError(
                {"department": "Selected department does not belong to the chosen division."}
            )

        if department and not division:
            raise serializers.ValidationError(
                {"department": "Assign a division before selecting a department."}
            )

        if division and not directorate:
            raise serializers.ValidationError(
                {"division": "Assign a directorate before selecting a division."}
            )

        return attrs


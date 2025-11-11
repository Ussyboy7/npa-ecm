"""Admin configuration for the accounts app."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "NPA Details",
            {
                "fields": (
                    "grade_level",
                    "system_role",
                    "employee_id",
                    "is_management",
                    "directorate",
                    "division",
                    "department",
                )
            },
        ),
    )
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "system_role",
        "grade_level",
        "is_active",
        "is_management",
    )
    list_filter = ("is_active", "is_staff", "is_superuser", "is_management", "grade_level")
    search_fields = ("username", "email", "first_name", "last_name", "employee_id")

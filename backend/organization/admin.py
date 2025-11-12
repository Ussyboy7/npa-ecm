"""Admin configuration for organization models."""

from django.contrib import admin

from .models import Department, Directorate, Division, Role


@admin.register(Directorate)
class DirectorateAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "executive_director")
    search_fields = ("name", "code")


@admin.register(Division)
class DivisionAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "directorate", "general_manager")
    list_filter = ("directorate",)
    search_fields = ("name", "code")


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "division", "head_of_department")
    list_filter = ("division",)
    search_fields = ("name", "code")


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "description")

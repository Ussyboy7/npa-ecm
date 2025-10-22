from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Department, Port, Document, DocumentType, 
    WorkflowTemplate, WorkflowInstance, WorkflowStep,
    ApprovalAction, ArchiveRecord, RetentionPolicy, AuditLog
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'department', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'department']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'department', 'phone_number', 'avatar')}),
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'parent_department', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code', 'description']


@admin.register(Port)
class PortAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'port_type', 'is_active', 'created_at']
    list_filter = ['port_type', 'is_active', 'created_at']
    search_fields = ['name', 'code', 'location']


@admin.register(DocumentType)
class DocumentTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'department', 'requires_approval', 'is_active']
    list_filter = ['requires_approval', 'is_active', 'department']
    search_fields = ['name', 'code', 'description']


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'document_type', 'status', 'access_level', 'version', 'created_by', 'created_at']
    list_filter = ['status', 'access_level', 'document_type', 'created_at']
    search_fields = ['title', 'description', 'keywords']


@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'document_type', 'is_active', 'created_at']
    list_filter = ['is_active', 'document_type', 'created_at']
    search_fields = ['name', 'description']


@admin.register(WorkflowInstance)
class WorkflowInstanceAdmin(admin.ModelAdmin):
    list_display = ['workflow_template', 'document', 'current_step', 'status', 'initiated_by', 'started_at']
    list_filter = ['status', 'started_at', 'workflow_template']
    search_fields = ['workflow_template__name', 'document__title']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action_type', 'ip_address', 'created_at']
    list_filter = ['action_type', 'created_at']
    search_fields = ['user__username', 'description']
    readonly_fields = ['user', 'action_type', 'ip_address', 'created_at']



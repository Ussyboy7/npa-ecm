"""Admin registrations for DMS models."""

from django.contrib import admin

from .models import (
    Document,
    DocumentAccessLog,
    DocumentComment,
    DocumentDiscussionMessage,
    DocumentEditorSession,
    DocumentPermission,
    DocumentVersion,
    DocumentWorkspace,
)


@admin.register(DocumentWorkspace)
class DocumentWorkspaceAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "color")
    search_fields = ("name", "slug")


class DocumentPermissionInline(admin.TabularInline):
    model = DocumentPermission
    extra = 1
    autocomplete_fields = ("divisions", "departments", "users")


class DocumentVersionInline(admin.TabularInline):
    model = DocumentVersion
    extra = 0
    readonly_fields = ("version_number", "uploaded_by", "uploaded_at")


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "document_type", "status", "sensitivity", "author", "updated_at")
    list_filter = ("document_type", "status", "sensitivity", "division", "department")
    search_fields = ("title", "reference_number", "description")
    inlines = [DocumentVersionInline, DocumentPermissionInline]
    filter_horizontal = ("workspaces",)


@admin.register(DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    list_display = ("document", "version_number", "file_name", "uploaded_by", "uploaded_at")
    search_fields = ("document__title", "file_name")
    list_filter = ("file_type",)


@admin.register(DocumentPermission)
class DocumentPermissionAdmin(admin.ModelAdmin):
    list_display = ("document", "access")
    list_filter = ("access",)
    autocomplete_fields = ("divisions", "departments", "users")


@admin.register(DocumentComment)
class DocumentCommentAdmin(admin.ModelAdmin):
    list_display = ("document", "author", "created_at", "resolved")
    list_filter = ("resolved",)
    search_fields = ("content",)


@admin.register(DocumentDiscussionMessage)
class DocumentDiscussionMessageAdmin(admin.ModelAdmin):
    list_display = ("document", "author", "created_at")
    search_fields = ("message",)


@admin.register(DocumentAccessLog)
class DocumentAccessLogAdmin(admin.ModelAdmin):
    list_display = ("document", "user", "action", "sensitivity", "timestamp")
    list_filter = ("action", "sensitivity")


@admin.register(DocumentEditorSession)
class DocumentEditorSessionAdmin(admin.ModelAdmin):
    list_display = ("document", "user", "since", "is_active")
    list_filter = ("is_active",)

"""Document management system models."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import SoftDeleteModel, TimeStampedModel, UUIDModel


class DocumentWorkspace(UUIDModel, TimeStampedModel):
    """Collaborative workspace grouping documents and members."""

    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=16, default="#2563eb")
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="document_workspaces",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Document(UUIDModel, SoftDeleteModel, TimeStampedModel):
    """Primary document metadata."""

    class DocumentType(models.TextChoices):
        LETTER = "letter", "Letter"
        MEMO = "memo", "Memo"
        CIRCULAR = "circular", "Circular"
        POLICY = "policy", "Policy"
        REPORT = "report", "Report"
        OTHER = "other", "Other"

    class DocumentStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    class Sensitivity(models.TextChoices):
        PUBLIC = "public", "Public"
        INTERNAL = "internal", "Internal"
        CONFIDENTIAL = "confidential", "Confidential"
        RESTRICTED = "restricted", "Restricted"

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    document_type = models.CharField(max_length=32, choices=DocumentType.choices)
    reference_number = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=32, choices=DocumentStatus.choices, default=DocumentStatus.DRAFT)
    sensitivity = models.CharField(max_length=32, choices=Sensitivity.choices, default=Sensitivity.INTERNAL)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="documents_authored",
    )
    division = models.ForeignKey(
        "organization.Division",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )
    department = models.ForeignKey(
        "organization.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )
    tags = models.JSONField(default=list, blank=True)
    workspaces = models.ManyToManyField(DocumentWorkspace, blank=True, related_name="documents")

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return self.title


class DocumentVersion(UUIDModel, TimeStampedModel):
    """Stored revision of document content or uploads."""

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField(help_text="Size in bytes")
    file_url = models.CharField(max_length=2000, blank=True)
    content_html = models.TextField(blank=True)
    content_json = models.JSONField(blank=True, null=True)
    content_text = models.TextField(blank=True)
    ocr_text = models.TextField(blank=True)
    summary = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="document_versions_uploaded",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-uploaded_at"]
        unique_together = ("document", "version_number")

    def __str__(self) -> str:
        return f"{self.document.title} v{self.version_number}"


class DocumentPermission(UUIDModel, TimeStampedModel):
    """Fine-grained access rules for a document."""

    class AccessLevel(models.TextChoices):
        READ = "read", "Read"
        WRITE = "write", "Write"
        ADMIN = "admin", "Admin"

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="permissions")
    access = models.CharField(max_length=16, choices=AccessLevel.choices)
    divisions = models.ManyToManyField(
        "organization.Division",
        blank=True,
        related_name="document_permissions",
    )
    departments = models.ManyToManyField(
        "organization.Department",
        blank=True,
        related_name="document_permissions",
    )
    grade_levels = models.JSONField(default=list, blank=True)
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="document_permissions")

    class Meta:
        verbose_name = "Document permission"
        verbose_name_plural = "Document permissions"

    def __str__(self) -> str:
        return f"{self.document.title} ({self.access})"


class DocumentComment(UUIDModel, TimeStampedModel):
    """Threaded inline comments for a document or version."""

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="comments")
    version = models.ForeignKey(
        DocumentVersion,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="comments",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_comments",
    )
    content = models.TextField()
    resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Comment by {self.author}"


class DocumentDiscussionMessage(UUIDModel, TimeStampedModel):
    """Lightweight discussion messages linked to a document."""

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="discussion_messages")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_discussions",
    )
    message = models.TextField()

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Discussion message for {self.document_id}"


class DocumentAccessLog(UUIDModel):
    """Audit log of document access attempts."""

    class AccessAction(models.TextChoices):
        VIEW = "view", "View"
        DOWNLOAD = "download", "Download"
        ATTEMPTED_DOWNLOAD = "attempted-download", "Attempted Download"

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="access_logs")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="document_access_logs",
    )
    action = models.CharField(max_length=32, choices=AccessAction.choices)
    sensitivity = models.CharField(max_length=32, choices=Document.Sensitivity.choices)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]


class DocumentEditorSession(UUIDModel, TimeStampedModel):
    """Tracks users actively editing a document within the app."""

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="editor_sessions")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_editor_sessions",
    )
    since = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("document", "user")

    def __str__(self) -> str:
        return f"{self.user} editing {self.document}"

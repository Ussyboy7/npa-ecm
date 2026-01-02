"""Document management system models."""

from __future__ import annotations

from django.conf import settings
from django.contrib.postgres.search import SearchVectorField
from django.db import models
from django.db.models import Q

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
        FORM = "form", "Form"
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
    # Parent document for document threading (response documents)
    parent_document = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="response_documents",
        help_text="Parent document this is responding to (for document threads)",
    )
    
    # Full-text search vector (updated via signals or management command)
    search_vector = SearchVectorField(null=True, editable=False)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["-updated_at"]),
            models.Index(fields=["status", "-updated_at"]),
            models.Index(fields=["document_type", "-updated_at"]),
            models.Index(fields=["author", "-updated_at"]),
            models.Index(fields=["division", "status"]),
            models.Index(fields=["created_at"]),
            # GIN index for full-text search (created via migration)
        ]

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
        indexes = [
            models.Index(fields=["document", "-uploaded_at"]),
            # Note: Full-text search indexes on content_text and ocr_text should be added via migration
            # using PostgreSQL GIN indexes for better performance
        ]

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
    note = models.TextField(blank=True, help_text="Optional message/context included when sharing")
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


class DocumentCollection(UUIDModel, TimeStampedModel, SoftDeleteModel):
    """Collection of related documents for project-based workflows."""
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="document_collections_owned",
    )
    documents = models.ManyToManyField(
        Document,
        blank=True,
        related_name="collections",
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="document_collections",
    )
    is_public = models.BooleanField(default=False, help_text="If true, all users can view this collection")
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Document Collection"
        verbose_name_plural = "Document Collections"
    
    def __str__(self) -> str:
        return self.name


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


class FormDocument(UUIDModel, TimeStampedModel):
    """Form-specific document that extends DMS Document for form management."""

    class FormStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_PROGRESS = "in_progress", "In Progress"
        AWAITING_SIGNATURES = "awaiting_signatures", "Awaiting Signatures"
        COMPLETED = "completed", "Completed"

    document = models.OneToOneField(
        Document,
        on_delete=models.CASCADE,
        related_name="form_document",
        help_text="The DMS document this form is associated with",
    )
    template = models.ForeignKey(
        "forms.FormTemplate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="form_documents",
        help_text="The form template used for this form",
    )
    form_data = models.JSONField(
        default=dict,
        help_text="The form field data (JSON structure matching template fields)",
    )
    status = models.CharField(
        max_length=32,
        choices=FormStatus.choices,
        default=FormStatus.DRAFT,
    )
    signature_workflow = models.ForeignKey(
        "forms.FormSignatureWorkflow",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="form_documents",
        help_text="Active signature workflow for this form",
    )
    correspondence = models.ForeignKey(
        "correspondence.Correspondence",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="form_documents",
        help_text="Correspondence this form is linked to (if any)",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["document", "status"]),
            models.Index(fields=["template", "status"]),
            models.Index(fields=["correspondence"]),
        ]

    def __str__(self) -> str:
        return f"Form: {self.document.title} ({self.get_status_display()})"

    def get_signature_workflow(self):
        """Get the active signature workflow for this form."""
        return self.signature_workflow


class DocumentTemplate(UUIDModel, TimeStampedModel):
    """Template for creating documents with predefined metadata and structure."""

    name = models.CharField(max_length=255, help_text="Template name")
    description = models.TextField(blank=True, help_text="Template description")
    document_type = models.CharField(
        max_length=32,
        choices=Document.DocumentType.choices,
        help_text="Default document type for this template",
    )
    default_status = models.CharField(
        max_length=32,
        choices=Document.DocumentStatus.choices,
        default=Document.DocumentStatus.DRAFT,
        help_text="Default status for documents created from this template",
    )
    default_sensitivity = models.CharField(
        max_length=32,
        choices=Document.Sensitivity.choices,
        default=Document.Sensitivity.INTERNAL,
        help_text="Default sensitivity level for documents created from this template",
    )
    default_division = models.ForeignKey(
        "organization.Division",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Default division for documents created from this template",
    )
    default_department = models.ForeignKey(
        "organization.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Default department for documents created from this template",
    )
    default_tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Default tags to apply to documents created from this template",
    )
    template_content = models.TextField(
        blank=True,
        help_text="Template content/structure (can be HTML, markdown, or plain text)",
    )
    template_metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional template metadata (custom fields, placeholders, etc.)",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this template is active and available for use",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="document_templates_created",
        help_text="User who created this template",
    )
    usage_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times this template has been used",
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active", "document_type"]),
            models.Index(fields=["created_by"]),
        ]

    def __str__(self) -> str:
        return self.name

    def increment_usage(self):
        """Increment the usage count for this template."""
        self.usage_count = models.F("usage_count") + 1
        self.save(update_fields=["usage_count"])
        if self.signature_workflow:
            return self.signature_workflow
        # Try to get from template if workflow exists
        return None

    def requires_signatures(self):
        """Check if this form template requires signatures."""
        if not self.template:
            return False
        structure = self.template.structure or {}
        fields = structure.get("fields", [])
        return any(
            field.get("type") == "file" and "signature" in field.get("name", "").lower()
            for field in fields
        )

    def mark_completed(self):
        """Mark the form as completed."""
        self.status = self.FormStatus.COMPLETED
        self.save()
        # Also update document status if needed
        if self.document.status != Document.DocumentStatus.PUBLISHED:
            self.document.status = Document.DocumentStatus.PUBLISHED
            self.document.save()

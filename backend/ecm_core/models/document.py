"""
Core Document Models for ECM

This module defines the core document management models:
- Document: Main document model with versioning, metadata, OCR text
- DocumentVersion: Version history tracking
- DocumentMetadata: Extended searchable metadata fields  
- Attachment: Supporting files for documents
"""

from django.db import models
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.core.validators import FileExtensionValidator
import uuid
import os


class Document(models.Model):
    """Core document model with versioning, metadata, and OCR support"""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_review', 'Pending Review'),
        ('in_review', 'In Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('published', 'Published'),
        ('archived', 'Archived'),
        ('deleted', 'Deleted'),
    ]
    
    ACCESS_LEVEL_CHOICES = [
        ('public', 'Public'),
        ('internal', 'Internal'),
        ('confidential', 'Confidential'),
        ('restricted', 'Restricted'),
        ('top_secret', 'Top Secret'),
    ]
    
    SECURITY_CLASSIFICATION = [
        ('unclassified', 'Unclassified'),
        ('internal', 'Internal Use Only'),
        ('confidential', 'Confidential'),
        ('secret', 'Secret'),
        ('top_secret', 'Top Secret'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic document information
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    document_number = models.CharField(max_length=100, unique=True, blank=True, null=True)
    
    # File information
    file = models.FileField(
        upload_to='documents/%Y/%m/%d/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp'])]
    )
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    file_size = models.BigIntegerField()  # Size in bytes
    mime_type = models.CharField(max_length=100, blank=True)
    
    # Document classification and status
    document_type = models.ForeignKey('DocumentType', on_delete=models.SET_NULL, null=True, related_name='documents')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    access_level = models.CharField(max_length=20, choices=ACCESS_LEVEL_CHOICES, default='internal')
    security_classification = models.CharField(max_length=20, choices=SECURITY_CLASSIFICATION, default='unclassified')
    
    # Version information
    version = models.IntegerField(default=1)
    major_version = models.IntegerField(default=1)
    minor_version = models.IntegerField(default=0)
    parent_document = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='versions')
    
    # Content and search
    ocr_text = models.TextField(blank=True, help_text="Extracted text from OCR processing")
    search_vector = SearchVectorField(null=True, blank=True)  # Full-text search
    keywords = models.TextField(blank=True, help_text="Comma-separated keywords for search")
    
    # Organizational context
    originating_department = models.ForeignKey('Department', on_delete=models.SET_NULL, null=True, related_name='documents')
    originating_port = models.ForeignKey('Port', on_delete=models.SET_NULL, null=True, blank=True, related_name='documents')
    originating_unit = models.ForeignKey('OrganizationalUnit', on_delete=models.SET_NULL, null=True, blank=True, related_name='documents')
    
    # Ownership and lifecycle
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='created_documents')
    last_modified_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='modified_documents')
    
    # Approval workflow
    approved_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_documents')
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Dates and lifecycle
    effective_date = models.DateField(null=True, blank=True, help_text="When this document becomes effective")
    expiry_date = models.DateField(null=True, blank=True, help_text="When this document expires")
    
    # Usage tracking
    download_count = models.IntegerField(default=0)
    view_count = models.IntegerField(default=0)
    
    # Retention and archival
    retention_policy = models.ForeignKey('RetentionPolicy', on_delete=models.SET_NULL, null=True, blank=True, related_name='documents')
    archive_date = models.DateTimeField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    
    # Soft delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_documents')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'access_level']),
            models.Index(fields=['document_type', 'status']),
            models.Index(fields=['originating_department', 'status']),
            models.Index(fields=['created_by', '-created_at']),
            models.Index(fields=['effective_date']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['is_archived', 'archive_date']),
            models.Index(fields=['is_deleted', 'deleted_at']),
            # Full-text search index
            GinIndex(fields=['search_vector']),
            # Document number index
            models.Index(fields=['document_number']),
        ]
    
    def __str__(self):
        return f"{self.title} (v{self.major_version}.{self.minor_version})"
    
    def get_version_string(self):
        """Get formatted version string"""
        return f"{self.major_version}.{self.minor_version}"
    
    def get_file_extension(self):
        """Get file extension"""
        return os.path.splitext(self.file_name)[1].lower()
    
    def get_file_size_display(self):
        """Get human-readable file size"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    
    def can_be_viewed_by(self, user):
        """Check if user can view this document based on access level and permissions"""
        if user.role == 'admin':
            return True
        
        # Check access level
        if self.access_level in ['restricted', 'top_secret']:
            return user.role in ['manager', 'supervisor', 'admin']
        
        # Check department access
        if self.originating_department and not user.can_access_department(self.originating_department):
            return False
        
        return True
    
    def save(self, *args, **kwargs):
        # Generate document number if not provided
        if not self.document_number:
            self.document_number = self.generate_document_number()
        
        # Set file metadata
        if self.file:
            self.file_name = os.path.basename(self.file.name)
            self.file_type = self.get_file_extension().replace('.', '').upper()
            self.file_size = self.file.size
        
        super().save(*args, **kwargs)
    
    def generate_document_number(self):
        """Generate unique document number"""
        import datetime
        from django.db.models import Count
        
        current_year = datetime.datetime.now().year
        dept_code = self.originating_department.code if self.originating_department else 'GEN'
        
        # Get count of documents for this year and department
        count = Document.objects.filter(
            created_at__year=current_year,
            originating_department=self.originating_department
        ).count() + 1
        
        return f"NPA/{dept_code}/{current_year}/{count:04d}"


class DocumentVersion(models.Model):
    """Version history tracking for documents"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='version_history')
    
    # Version information
    version_number = models.IntegerField()
    major_version = models.IntegerField()
    minor_version = models.IntegerField()
    
    # File information for this version
    file = models.FileField(upload_to='documents/versions/%Y/%m/')
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    
    # Version metadata
    change_description = models.TextField(blank=True)
    changed_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='document_versions')
    
    # OCR and content (for historical tracking)
    ocr_text = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'document_versions'
        ordering = ['-version_number']
        unique_together = ['document', 'version_number']
        indexes = [
            models.Index(fields=['document', '-version_number']),
            models.Index(fields=['changed_by', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.document.title} v{self.version_number}"


class DocumentMetadata(models.Model):
    """Extended searchable metadata fields for documents"""
    
    FIELD_TYPES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('date', 'Date'),
        ('boolean', 'Boolean'),
        ('choice', 'Choice'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='metadata')
    
    # Field definition
    field_name = models.CharField(max_length=100)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES, default='text')
    field_label = models.CharField(max_length=200)
    
    # Field values (stored as text, can be parsed based on field_type)
    text_value = models.TextField(blank=True)
    number_value = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    date_value = models.DateField(null=True, blank=True)
    boolean_value = models.BooleanField(null=True, blank=True)
    
    # For choice fields, store the selected option
    choice_value = models.CharField(max_length=200, blank=True)
    
    # Additional metadata
    is_required = models.BooleanField(default=False)
    is_searchable = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'document_metadata'
        unique_together = ['document', 'field_name']
        indexes = [
            models.Index(fields=['document', 'field_name']),
            models.Index(fields=['field_name', 'field_type']),
            models.Index(fields=['text_value']),
            models.Index(fields=['date_value']),
            models.Index(fields=['number_value']),
        ]
    
    def __str__(self):
        return f"{self.document.title} - {self.field_label}: {self.get_display_value()}"
    
    def get_display_value(self):
        """Get the appropriate display value based on field type"""
        if self.field_type == 'text':
            return self.text_value
        elif self.field_type == 'number':
            return str(self.number_value) if self.number_value is not None else ''
        elif self.field_type == 'date':
            return str(self.date_value) if self.date_value else ''
        elif self.field_type == 'boolean':
            return str(self.boolean_value) if self.boolean_value is not None else ''
        elif self.field_type == 'choice':
            return self.choice_value
        return ''


class Attachment(models.Model):
    """Supporting files for documents"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='attachments')
    
    # Attachment information
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # File information
    file = models.FileField(upload_to='attachments/%Y/%m/%d/')
    file_size = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)
    
    # Metadata
    uploaded_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='uploaded_attachments')
    is_required = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'attachments'
        ordering = ['name']
        indexes = [
            models.Index(fields=['document', '-created_at']),
            models.Index(fields=['uploaded_by', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} (attached to {self.document.title})"

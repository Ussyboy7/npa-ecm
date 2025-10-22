"""
Document Type Models for ECM

This module defines document type configurations:
- DocumentType: Configurable document types with metadata schemas, workflow templates, and retention policies
"""

from django.db import models
from django.core.validators import RegexValidator
import uuid


class DocumentType(models.Model):
    """Configurable document types with metadata schemas and rules"""
    
    CATEGORY_CHOICES = [
        ('office', 'Office Documents'),
        ('operational', 'Operational Documents'), 
        ('hr', 'Human Resources'),
        ('financial', 'Financial Documents'),
        ('legal', 'Legal Documents'),
        ('policy', 'Policy Documents'),
        ('correspondence', 'Correspondence'),
        ('reports', 'Reports'),
        ('forms', 'Forms & Applications'),
        ('technical', 'Technical Documentation'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic information
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(
        max_length=50, 
        unique=True,
        validators=[RegexValidator(r'^[A-Z0-9_]+$', 'Only uppercase letters, numbers and underscores allowed.')]
    )
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='office')
    
    # Document numbering scheme
    number_prefix = models.CharField(
        max_length=20, 
        default='DOC',
        help_text="Prefix for document numbers (e.g., 'MEMO', 'REP', 'POL')"
    )
    number_format = models.CharField(
        max_length=50,
        default='{prefix}/{dept}/{year}/{sequence:04d}',
        help_text="Format string for document numbers. Available variables: prefix, dept, year, sequence"
    )
    auto_number = models.BooleanField(default=True, help_text="Automatically generate document numbers")
    
    # Metadata schema definition (JSON field)
    metadata_schema = models.JSONField(
        default=list,
        blank=True,
        help_text="JSON schema defining required and optional metadata fields"
    )
    
    # Template and formatting
    template_file = models.FileField(
        upload_to='templates/',
        blank=True,
        null=True,
        help_text="Optional template file for this document type"
    )
    watermark_text = models.CharField(max_length=200, blank=True)
    
    # Workflow and approval
    default_workflow = models.ForeignKey(
        'WorkflowTemplate', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='applied_to_types',
        help_text="Default workflow template for this document type"
    )
    requires_approval = models.BooleanField(default=True)
    approval_levels = models.IntegerField(default=1, help_text="Number of approval levels required")
    
    # Access control
    default_access_level = models.CharField(
        max_length=20,
        choices=[
            ('public', 'Public'),
            ('internal', 'Internal'),
            ('confidential', 'Confidential'),
            ('restricted', 'Restricted'),
        ],
        default='internal'
    )
    
    default_retention_years = models.IntegerField(default=7)
    
    # File handling
    allowed_file_types = models.JSONField(
        default=list,
        help_text="List of allowed file extensions (e.g., ['pdf', 'docx', 'doc'])"
    )
    max_file_size = models.BigIntegerField(
        default=52428800,  # 50MB
        help_text="Maximum file size in bytes"
    )
    
    # Processing settings
    auto_ocr = models.BooleanField(default=True, help_text="Automatically perform OCR on uploaded files")
    require_keywords = models.BooleanField(default=False)
    
    # Department restrictions
    allowed_departments = models.ManyToManyField(
        'Department',
        blank=True,
        related_name='allowed_document_types',
        help_text="Departments that can create this document type (empty = all departments)"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_system_defined = models.BooleanField(default=False, help_text="System-defined types cannot be deleted")
    
    # Audit
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='created_document_types')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'document_types'
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['code']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def get_display_name(self):
        """Get full display name with category"""
        return f"{self.get_category_display()}: {self.name}"
    
    def is_file_type_allowed(self, file_extension):
        """Check if file type is allowed for this document type"""
        if not self.allowed_file_types:
            return True  # No restrictions
        return file_extension.lower() in [ext.lower().replace('.', '') for ext in self.allowed_file_types]
    
    def is_size_allowed(self, file_size):
        """Check if file size is allowed"""
        return file_size <= self.max_file_size
    
    def can_be_created_by_department(self, department):
        """Check if department can create this document type"""
        if not self.allowed_departments.exists():
            return True  # No restrictions
        return self.allowed_departments.filter(id=department.id).exists()
    
    def get_metadata_fields(self):
        """Get list of metadata fields defined in schema"""
        fields = []
        for field_def in self.metadata_schema:
            fields.append({
                'name': field_def.get('name'),
                'label': field_def.get('label', field_def.get('name')),
                'type': field_def.get('type', 'text'),
                'required': field_def.get('required', False),
                'options': field_def.get('options', []),
                'help_text': field_def.get('help_text', ''),
            })
        return fields
    
    def generate_document_number(self, department=None, year=None):
        """Generate document number according to format"""
        import datetime
        
        if year is None:
            year = datetime.datetime.now().year
        
        dept_code = department.code if department else 'GEN'
        
        # Get next sequence number
        from django.db.models import Count
        count = self.documents.filter(
            created_at__year=year,
            originating_department=department
        ).count() + 1
        
        return self.number_format.format(
            prefix=self.number_prefix,
            dept=dept_code,
            year=year,
            sequence=count
        )

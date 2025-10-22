"""
Archive Models for ECM

This module defines retention policies and archival:
- RetentionPolicy: Document retention rules by type/department
- ArchiveRecord: Archived documents with compliance metadata
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class RetentionPolicy(models.Model):
    """Document retention rules by type, department, or category"""
    
    RETENTION_TRIGGERS = [
        ('creation', 'Document Creation Date'),
        ('approval', 'Document Approval Date'),
        ('publication', 'Document Publication Date'),
        ('last_access', 'Last Access Date'),
        ('expiry', 'Document Expiry Date'),
    ]
    
    ACTION_ON_EXPIRY = [
        ('archive', 'Archive Document'),
        ('delete', 'Delete Document'),
        ('review', 'Flag for Review'),
        ('extend', 'Request Extension'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic information
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    
    # Retention rules
    retention_years = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Number of years to retain documents"
    )
    retention_month = models.IntegerField(
        default=12,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        help_text="Month when retention period ends (1-12)"
    )
    retention_day = models.IntegerField(
        default=31,
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        help_text="Day when retention period ends (1-31)"
    )
    
    # Trigger configuration
    retention_trigger = models.CharField(
        max_length=20, 
        choices=RETENTION_TRIGGERS, 
        default='approval',
        help_text="What date to use as the starting point for retention calculation"
    )
    
    # Action configuration
    action_on_expiry = models.CharField(
        max_length=20, 
        choices=ACTION_ON_EXPIRY, 
        default='review',
        help_text="What to do when retention period expires"
    )
    
    # Legal hold settings
    can_be_placed_on_hold = models.BooleanField(
        default=True,
        help_text="Documents under this policy can be placed on legal hold"
    )
    legal_hold_overrides_retention = models.BooleanField(
        default=True,
        help_text="Legal hold takes precedence over retention expiry"
    )
    
    # Scope of application
    applicable_document_types = models.ManyToManyField(
        'DocumentType',
        blank=True,
        related_name='retention_policies',
        help_text="Document types this policy applies to (empty = all types)"
    )
    applicable_departments = models.ManyToManyField(
        'Department',
        blank=True,
        related_name='retention_policies',
        help_text="Departments this policy applies to (empty = all departments)"
    )
    applicable_access_levels = models.JSONField(
        default=list,
        blank=True,
        help_text="List of access levels this policy applies to"
    )
    
    # Automatic enforcement
    auto_enforce = models.BooleanField(
        default=True,
        help_text="Automatically enforce this retention policy"
    )
    check_frequency_days = models.IntegerField(
        default=30,
        validators=[MinValueValidator(1), MaxValueValidator(365)],
        help_text="How often to check for documents that need to be archived (in days)"
    )
    
    # Notification settings
    notify_before_expiry_days = models.IntegerField(
        default=30,
        validators=[MinValueValidator(0), MaxValueValidator(365)],
        help_text="Days before expiry to send notifications"
    )
    notify_users = models.ManyToManyField(
        'User',
        blank=True,
        related_name='retention_notifications',
        help_text="Users to notify when retention actions are taken"
    )
    
    # Status and metadata
    is_active = models.BooleanField(default=True)
    is_system_policy = models.BooleanField(
        default=False,
        help_text="System-defined policies cannot be deleted"
    )
    
    # Audit
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='created_retention_policies')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'retention_policies'
        ordering = ['name']
        verbose_name_plural = 'Retention Policies'
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_active', 'auto_enforce']),
            models.Index(fields=['retention_years']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.retention_years} years)"
    
    def applies_to_document(self, document):
        """Check if this retention policy applies to a document"""
        # Check document type
        if self.applicable_document_types.exists():
            if not self.applicable_document_types.filter(id=document.document_type.id).exists():
                return False
        
        # Check department
        if self.applicable_departments.exists():
            if not self.applicable_departments.filter(id=document.originating_department.id).exists():
                return False
        
        # Check access level
        if self.applicable_access_levels:
            if document.access_level not in self.applicable_access_levels:
                return False
        
        return True
    
    def calculate_expiry_date(self, document):
        """Calculate when a document should expire based on this policy"""
        from datetime import datetime, timedelta
        
        # Get the trigger date
        if self.retention_trigger == 'creation':
            trigger_date = document.created_at.date()
        elif self.retention_trigger == 'approval' and document.approved_at:
            trigger_date = document.approved_at.date()
        elif self.retention_trigger == 'publication':
            trigger_date = document.updated_at.date()  # Fallback
        elif self.retention_trigger == 'expiry' and document.expiry_date:
            trigger_date = document.expiry_date
        else:
            trigger_date = document.created_at.date()  # Default fallback
        
        # Calculate expiry date
        expiry_year = trigger_date.year + self.retention_years
        expiry_date = datetime(expiry_year, self.retention_month, min(self.retention_day, 28)).date()
        
        # Handle leap year for February 29
        if self.retention_month == 2 and self.retention_day == 29:
            if expiry_year % 4 != 0 or (expiry_year % 100 == 0 and expiry_year % 400 != 0):
                expiry_date = datetime(expiry_year, 2, 28).date()
        
        return expiry_date


class ArchiveRecord(models.Model):
    """Archived documents with compliance metadata"""
    
    ARCHIVE_TYPES = [
        ('retention', 'Retention Policy'),
        ('manual', 'Manual Archive'),
        ('legal_hold', 'Legal Hold'),
        ('disaster_recovery', 'Disaster Recovery'),
        ('compliance', 'Compliance Archive'),
    ]
    
    ARCHIVE_STATUS = [
        ('active', 'Active Archive'),
        ('inactive', 'Inactive Archive'),
        ('restored', 'Restored'),
        ('destroyed', 'Destroyed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Associated document
    document = models.ForeignKey('Document', on_delete=models.CASCADE, related_name='archive_records')
    
    # Archive information
    archive_type = models.CharField(max_length=20, choices=ARCHIVE_TYPES, default='retention')
    archive_status = models.CharField(max_length=20, choices=ARCHIVE_STATUS, default='active')
    
    # Retention policy reference
    retention_policy = models.ForeignKey(
        RetentionPolicy, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='archive_records'
    )
    
    # Archive location and format
    archive_location = models.CharField(
        max_length=500,
        help_text="Physical or digital location where document is archived"
    )
    archive_format = models.CharField(
        max_length=50,
        default='original',
        help_text="Archive format (original, compressed, microfilm, etc.)"
    )
    
    # Dates
    archived_at = models.DateTimeField(auto_now_add=True)
    retention_expiry_date = models.DateField(null=True, blank=True)
    scheduled_destruction_date = models.DateField(null=True, blank=True)
    
    # Compliance metadata
    legal_hold_reason = models.TextField(blank=True)
    compliance_notes = models.TextField(blank=True)
    audit_trail = models.JSONField(default=list, blank=True, help_text="Archive-related audit trail")
    
    # Responsible parties
    archived_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='archived_documents')
    authorized_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='authorized_archives')
    
    # Restoration tracking
    restored_at = models.DateTimeField(null=True, blank=True)
    restored_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='restored_archives')
    restore_reason = models.TextField(blank=True)
    
    # Destruction tracking
    destroyed_at = models.DateTimeField(null=True, blank=True)
    destroyed_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='destroyed_archives')
    destruction_certificate = models.CharField(max_length=200, blank=True)
    
    # Metadata
    archive_size_bytes = models.BigIntegerField(null=True, blank=True)
    checksum = models.CharField(max_length=128, blank=True, help_text="File integrity checksum")
    metadata_backup = models.JSONField(default=dict, blank=True, help_text="Backup of document metadata")
    
    class Meta:
        db_table = 'archive_records'
        ordering = ['-archived_at']
        indexes = [
            models.Index(fields=['document', '-archived_at']),
            models.Index(fields=['archive_type', 'archive_status']),
            models.Index(fields=['retention_expiry_date']),
            models.Index(fields=['scheduled_destruction_date']),
            models.Index(fields=['archived_by', '-archived_at']),
        ]
    
    def __str__(self):
        return f"Archive: {self.document.title} ({self.get_archive_type_display()})"
    
    def is_legal_hold(self):
        """Check if this is a legal hold archive"""
        return self.archive_type == 'legal_hold' or bool(self.legal_hold_reason)
    
    def can_be_destroyed(self):
        """Check if document can be destroyed according to retention policy"""
        if self.archive_status in ['destroyed', 'restored']:
            return False
        
        if self.is_legal_hold():
            return False
        
        if self.scheduled_destruction_date:
            from django.utils import timezone
            return timezone.now().date() >= self.scheduled_destruction_date
        
        return False
    
    def mark_for_destruction(self, scheduled_date, user):
        """Mark archive record for future destruction"""
        self.scheduled_destruction_date = scheduled_date
        self.save()
        
        # Add to audit trail
        from django.utils import timezone
        audit_entry = {
            'action': 'marked_for_destruction',
            'date': str(scheduled_date),
            'user': user.username if user else 'System',
            'timestamp': timezone.now().isoformat()
        }
        
        current_trail = self.audit_trail or []
        current_trail.append(audit_entry)
        self.audit_trail = current_trail
        self.save()


class LegalHold(models.Model):
    """Legal hold management for documents"""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('released', 'Released'),
        ('expired', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Legal hold information
    case_number = models.CharField(max_length=100, unique=True)
    case_name = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    
    # Legal details
    legal_authority = models.CharField(max_length=200, blank=True)
    court_case = models.CharField(max_length=200, blank=True)
    lawsuit_identifier = models.CharField(max_length=200, blank=True)
    
    # Scope
    keywords = models.TextField(blank=True, help_text="Keywords to match documents")
    date_range_start = models.DateField(null=True, blank=True)
    date_range_end = models.DateField(null=True, blank=True)
    
    # Documents under hold
    documents = models.ManyToManyField('Document', related_name='legal_holds', blank=True)
    
    # Status and dates
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    effective_date = models.DateField()
    release_date = models.DateField(null=True, blank=True)
    
    # Responsible parties
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='created_legal_holds')
    legal_counsel = models.CharField(max_length=200, blank=True)
    
    class Meta:
        db_table = 'legal_holds'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['case_number']),
            models.Index(fields=['status', 'effective_date']),
            models.Index(fields=['created_by', '-created_at']),
        ]
    
    def __str__(self):
        return f"Legal Hold: {self.case_name} ({self.case_number})"
    
    def is_active(self):
        """Check if legal hold is currently active"""
        from django.utils import timezone
        today = timezone.now().date()
        
        return (
            self.status == 'active' and
            self.effective_date <= today and
            (not self.release_date or self.release_date > today)
        )

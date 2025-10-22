"""
Integration Models for ECM

This module defines external integration models:
- EmailIntegration: Email-to-ECM configuration
- ScannerQueue: Bulk scanner uploads queue
- APIAccessToken: Third-party API integrations
"""

from django.db import models
from django.core.validators import RegexValidator
import uuid


class EmailIntegration(models.Model):
    """Email-to-ECM integration configuration"""
    
    INTEGRATION_TYPES = [
        ('imap', 'IMAP Email'),
        ('smtp', 'SMTP Processing'),
        ('exchange', 'Microsoft Exchange'),
        ('gmail', 'Gmail API'),
        ('outlook', 'Outlook API'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('error', 'Error'),
        ('disabled', 'Disabled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic configuration
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    integration_type = models.CharField(max_length=20, choices=INTEGRATION_TYPES, default='imap')
    
    # Email server settings
    server_host = models.CharField(max_length=255)
    server_port = models.IntegerField()
    use_ssl = models.BooleanField(default=True)
    use_tls = models.BooleanField(default=False)
    
    # Authentication
    username = models.CharField(max_length=255)
    password = models.CharField(max_length=255, help_text="Encrypted password")
    
    # Email filtering
    email_address = models.EmailField(unique=True, help_text="Email address to monitor")
    subject_patterns = models.JSONField(
        default=list,
        blank=True,
        help_text="Regex patterns for email subjects to process"
    )
    sender_patterns = models.JSONField(
        default=list,
        blank=True,
        help_text="Regex patterns for email senders to accept"
    )
    
    # Processing rules
    target_department = models.ForeignKey(
        'Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_integrations'
    )
    target_document_type = models.ForeignKey(
        'DocumentType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_integrations'
    )
    default_workflow = models.ForeignKey(
        'WorkflowTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_integrations'
    )
    
    # Automation settings
    auto_create_documents = models.BooleanField(default=True)
    auto_extract_metadata = models.BooleanField(default=True)
    auto_ocr_attachments = models.BooleanField(default=True)
    
    # Processing schedule
    check_interval_minutes = models.IntegerField(default=5, help_text="Minutes between email checks")
    max_emails_per_check = models.IntegerField(default=50)
    
    # Status and monitoring
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inactive')
    last_check_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    emails_processed = models.IntegerField(default=0)
    
    # Configuration
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='created_email_integrations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'email_integrations'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['status', 'is_active']),
            models.Index(fields=['email_address']),
            models.Index(fields=['target_department', 'is_active']),
        ]
    
    def __str__(self):
        return f"Email Integration: {self.name} ({self.email_address})"


class ScannerQueue(models.Model):
    """Bulk scanner uploads queue for batch processing"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Queue information
    batch_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Source information
    scanner_device_id = models.CharField(max_length=100, blank=True)
    scan_batch_number = models.CharField(max_length=50, blank=True)
    total_files = models.IntegerField(default=0)
    processed_files = models.IntegerField(default=0)
    failed_files = models.IntegerField(default=0)
    
    # Destination settings
    target_department = models.ForeignKey(
        'Department',
        on_delete=models.SET_NULL,
        null=True,
        related_name='scanner_queues'
    )
    target_document_type = models.ForeignKey(
        'DocumentType',
        on_delete=models.SET_NULL,
        null=True,
        related_name='scanner_queues'
    )
    
    # Batch settings
    default_keywords = models.TextField(blank=True)
    default_metadata = models.JSONField(default=dict, blank=True)
    auto_ocr_enabled = models.BooleanField(default=True)
    auto_classification = models.BooleanField(default=False)
    
    # Status and progress
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Processing information
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # User tracking
    uploaded_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='scanner_uploads')
    processed_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_scanner_queues')
    
    # File tracking
    files_metadata = models.JSONField(default=list, blank=True, help_text="Metadata for each file in the batch")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'scanner_queues'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['uploaded_by', '-created_at']),
            models.Index(fields=['target_department', 'status']),
            models.Index(fields=['batch_name']),
        ]
    
    def __str__(self):
        return f"Scanner Batch: {self.batch_name} ({self.total_files} files)"


class ScannerFile(models.Model):
    """Individual files within a scanner queue batch"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Associated queue and document
    scanner_queue = models.ForeignKey(ScannerQueue, on_delete=models.CASCADE, related_name='files')
    document = models.ForeignKey('Document', on_delete=models.SET_NULL, null=True, blank=True, related_name='scanner_files')
    
    # File information
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField()
    mime_type = models.CharField(max_length=100, blank=True)
    
    # Processing status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True)
    
    # Processing metadata
    ocr_text = models.TextField(blank=True)
    extracted_metadata = models.JSONField(default=dict, blank=True)
    classification_confidence = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Timestamps
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'scanner_files'
        ordering = ['file_name']
        indexes = [
            models.Index(fields=['scanner_queue', 'status']),
            models.Index(fields=['status', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.file_name} ({self.get_status_display()})"


class APIAccessToken(models.Model):
    """API access tokens for third-party integrations"""
    
    TOKEN_TYPES = [
        ('api_key', 'API Key'),
        ('bearer', 'Bearer Token'),
        ('oauth2', 'OAuth 2.0'),
        ('jwt', 'JWT Token'),
        ('custom', 'Custom'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('revoked', 'Revoked'),
        ('suspended', 'Suspended'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Token information
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    token_type = models.CharField(max_length=20, choices=TOKEN_TYPES, default='api_key')
    
    # Credentials
    token_value = models.CharField(max_length=1000, help_text="Encrypted token value")
    token_secret = models.CharField(max_length=1000, blank=True, help_text="Additional secret for OAuth")
    
    # Access scope
    allowed_departments = models.ManyToManyField(
        'Department',
        blank=True,
        related_name='api_tokens',
        help_text="Departments this token can access"
    )
    allowed_document_types = models.ManyToManyField(
        'DocumentType',
        blank=True,
        related_name='api_tokens',
        help_text="Document types this token can access"
    )
    
    # Permission restrictions
    read_only = models.BooleanField(default=True)
    allowed_actions = models.JSONField(
        default=list,
        blank=True,
        help_text="List of allowed API actions (create, read, update, delete, etc.)"
    )
    
    # Rate limiting
    rate_limit_per_hour = models.IntegerField(default=1000)
    rate_limit_per_day = models.IntegerField(default=10000)
    
    # Expiration and usage tracking
    expires_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    usage_count = models.IntegerField(default=0)
    
    # Status and metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    is_active = models.BooleanField(default=True)
    
    # User and organization
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='created_api_tokens')
    organization = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField(blank=True)
    
    # Audit tracking
    ip_whitelist = models.JSONField(
        default=list,
        blank=True,
        help_text="Allowed IP addresses/ranges"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'api_access_tokens'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['status', 'is_active']),
            models.Index(fields=['created_by', '-created_at']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"API Token: {self.name} ({self.get_token_type_display()})"
    
    def is_expired(self):
        """Check if token has expired"""
        if not self.expires_at:
            return False
        
        from django.utils import timezone
        return timezone.now() > self.expires_at
    
    def can_access_department(self, department):
        """Check if token can access a specific department"""
        if not self.allowed_departments.exists():
            return True  # No restrictions
        return self.allowed_departments.filter(id=department.id).exists()
    
    def can_perform_action(self, action):
        """Check if token can perform a specific action"""
        if not self.allowed_actions:
            return not self.read_only or action in ['read', 'list']
        
        return action in self.allowed_actions


class APIAccessLog(models.Model):
    """Log API access attempts and usage"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Associated token
    access_token = models.ForeignKey(APIAccessToken, on_delete=models.CASCADE, related_name='access_logs')
    
    # Request information
    endpoint = models.CharField(max_length=500)
    method = models.CharField(max_length=10)
    
    # Response information
    status_code = models.IntegerField()
    response_time_ms = models.IntegerField()
    
    # Request context
    ip_address = models.GenericIPAddressField()
    user_agent = models.CharField(max_length=500, blank=True)
    
    # Error tracking
    error_message = models.TextField(blank=True)
    
    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'api_access_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['access_token', '-timestamp']),
            models.Index(fields=['ip_address', '-timestamp']),
            models.Index(fields=['status_code', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.access_token.name} - {self.method} {self.endpoint} ({self.status_code})"

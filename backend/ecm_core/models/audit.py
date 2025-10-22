"""
Audit Models for ECM

This module defines comprehensive audit trail tracking:
- AuditLog: Comprehensive audit trail for all actions
"""

from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
import uuid


class AuditLog(models.Model):
    """Comprehensive audit trail for all actions in the ECM system"""
    
    ACTION_TYPES = [
        # Document actions
        ('document_create', 'Document Created'),
        ('document_view', 'Document Viewed'),
        ('document_download', 'Document Downloaded'),
        ('document_edit', 'Document Edited'),
        ('document_delete', 'Document Deleted'),
        ('document_restore', 'Document Restored'),
        ('document_archive', 'Document Archived'),
        ('document_share', 'Document Shared'),
        ('document_unshare', 'Document Unshared'),
        ('document_move', 'Document Moved'),
        ('document_copy', 'Document Copied'),
        
        # Workflow actions
        ('workflow_start', 'Workflow Started'),
        ('workflow_approve', 'Workflow Approved'),
        ('workflow_reject', 'Workflow Rejected'),
        ('workflow_escalate', 'Workflow Escalated'),
        ('workflow_delegate', 'Workflow Delegated'),
        ('workflow_complete', 'Workflow Completed'),
        ('workflow_cancel', 'Workflow Cancelled'),
        
        # User and access actions
        ('user_login', 'User Login'),
        ('user_logout', 'User Logout'),
        ('user_permissions_change', 'User Permissions Changed'),
        ('user_profile_update', 'User Profile Updated'),
        ('user_password_change', 'User Password Changed'),
        
        # Administrative actions
        ('admin_config_change', 'System Configuration Changed'),
        ('admin_user_create', 'User Created'),
        ('admin_user_delete', 'User Deleted'),
        ('admin_department_change', 'Department Modified'),
        ('admin_workflow_change', 'Workflow Template Modified'),
        ('admin_policy_change', 'Retention Policy Modified'),
        
        # Integration actions
        ('email_import', 'Email Imported'),
        ('scanner_upload', 'Scanner Upload'),
        ('api_access', 'API Access'),
        ('bulk_import', 'Bulk Import'),
        
        # Security actions
        ('security_violation', 'Security Violation'),
        ('unauthorized_access', 'Unauthorized Access Attempt'),
        ('permission_denied', 'Permission Denied'),
        ('data_export', 'Data Export'),
        
        # System actions
        ('system_backup', 'System Backup'),
        ('system_restore', 'System Restore'),
        ('system_maintenance', 'System Maintenance'),
        ('system_error', 'System Error'),
    ]
    
    SEVERITY_LEVELS = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Action details
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='info')
    
    # Generic foreign key to track any object
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.UUIDField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # User and session information
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    session_key = models.CharField(max_length=40, blank=True)
    
    # Request context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    request_method = models.CharField(max_length=10, blank=True)
    request_path = models.CharField(max_length=500, blank=True)
    
    # Additional metadata
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional context data")
    related_objects = models.JSONField(default=dict, blank=True, help_text="IDs of related objects affected")
    
    # Change tracking (for updates)
    old_values = models.JSONField(default=dict, blank=True, help_text="Previous values for updated fields")
    new_values = models.JSONField(default=dict, blank=True, help_text="New values for updated fields")
    changed_fields = models.JSONField(default=list, blank=True, help_text="List of changed field names")
    
    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Geographic and device information
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    device_type = models.CharField(max_length=50, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['action_type', '-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['content_type', 'object_id', '-timestamp']),
            models.Index(fields=['ip_address', '-timestamp']),
            models.Index(fields=['severity', '-timestamp']),
            models.Index(fields=['-timestamp']),
        ]
    
    def __str__(self):
        user_info = self.user.username if self.user else 'Anonymous'
        return f"{user_info} - {self.get_action_type_display()} - {self.timestamp}"
    
    @classmethod
    def log_action(cls, action_type, description, user=None, content_object=None, 
                   severity='info', metadata=None, request=None, **kwargs):
        """Convenience method to create audit log entries"""
        
        audit_entry = cls(
            action_type=action_type,
            description=description,
            user=user,
            content_object=content_object,
            severity=severity,
            metadata=metadata or {},
            **kwargs
        )
        
        # Extract request information if provided
        if request:
            audit_entry.ip_address = cls._get_client_ip(request)
            audit_entry.user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
            audit_entry.request_method = request.method
            audit_entry.request_path = request.path[:500]
            audit_entry.session_key = request.session.session_key
        
        audit_entry.save()
        return audit_entry
    
    @staticmethod
    def _get_client_ip(request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def get_object_description(self):
        """Get a description of the related object"""
        if self.content_object:
            if hasattr(self.content_object, 'title'):
                return self.content_object.title
            elif hasattr(self.content_object, 'name'):
                return self.content_object.name
            else:
                return str(self.content_object)
        return 'No related object'
    
    def get_change_summary(self):
        """Get a summary of changes made"""
        if not self.changed_fields:
            return 'No changes tracked'
        
        summary = []
        for field in self.changed_fields:
            old_val = self.old_values.get(field, 'None')
            new_val = self.new_values.get(field, 'None')
            summary.append(f"{field}: {old_val} → {new_val}")
        
        return '; '.join(summary)


class AuditLogConfig(models.Model):
    """Configuration for audit logging behavior"""
    
    ACTION_TYPE_CHOICES = [(action, action) for action, _ in AuditLog.ACTION_TYPES]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Configuration scope
    action_type = models.CharField(max_length=50, choices=ACTION_TYPE_CHOICES, unique=True)
    model_name = models.CharField(max_length=100, blank=True, help_text="Django model name if specific to model")
    
    # Logging settings
    enabled = models.BooleanField(default=True)
    log_level = models.CharField(max_length=20, choices=AuditLog.SEVERITY_LEVELS, default='info')
    
    # Data retention
    retain_for_days = models.IntegerField(default=2555, help_text="Number of days to retain log entries")
    auto_cleanup = models.BooleanField(default=True)
    
    # Field tracking
    track_field_changes = models.BooleanField(default=True)
    sensitive_fields = models.JSONField(default=list, blank=True, help_text="Fields to exclude from change tracking")
    
    # Notification settings
    notify_on_error = models.BooleanField(default=True)
    notify_users = models.JSONField(default=list, blank=True, help_text="User IDs to notify on errors")
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'audit_log_configs'
        ordering = ['action_type']
        indexes = [
            models.Index(fields=['action_type']),
            models.Index(fields=['enabled', 'is_active']),
        ]
    
    def __str__(self):
        return f"Audit Config: {self.action_type} ({'Enabled' if self.enabled else 'Disabled'})"

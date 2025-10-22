"""
Approval Models for ECM

This module defines approval action tracking:
- ApprovalAction: User approval/rejection/comment history
"""

from django.db import models
import uuid


class ApprovalAction(models.Model):
    """User approval/rejection/comment history within workflows"""
    
    ACTION_TYPES = [
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('request_changes', 'Request Changes'),
        ('delegate', 'Delegate'),
        ('comment', 'Comment'),
        ('escalate', 'Escalate'),
        ('skip', 'Skip'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Associated objects
    workflow_instance = models.ForeignKey(
        'WorkflowInstance', 
        on_delete=models.CASCADE, 
        related_name='approval_actions'
    )
    workflow_step = models.ForeignKey(
        'WorkflowStep', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='approval_actions'
    )
    document = models.ForeignKey(
        'Document', 
        on_delete=models.CASCADE, 
        related_name='approval_actions'
    )
    
    # Action details
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    comments = models.TextField(blank=True)
    
    # User information
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='approval_actions')
    
    # Delegation information (if action_type is 'delegate')
    delegated_to = models.ForeignKey(
        'User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='delegated_approval_actions'
    )
    delegation_reason = models.TextField(blank=True)
    
    # Action metadata
    action_metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional metadata about the action (e.g., digital signature, etc.)"
    )
    
    # Digital signature info (if applicable)
    has_digital_signature = models.BooleanField(default=False)
    signature_data = models.TextField(blank=True)  # Store signature hash or certificate
    signature_timestamp = models.DateTimeField(null=True, blank=True)
    
    # Priority and timing
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    action_date = models.DateTimeField(auto_now_add=True)
    
    # Response tracking
    response_time_minutes = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Time taken to respond in minutes"
    )
    
    # Device and location info (for audit)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    location_info = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'approval_actions'
        ordering = ['-action_date']
        indexes = [
            models.Index(fields=['workflow_instance', '-action_date']),
            models.Index(fields=['document', 'action_type', '-action_date']),
            models.Index(fields=['user', '-action_date']),
            models.Index(fields=['delegated_to', '-action_date']),
            models.Index(fields=['action_type', '-action_date']),
        ]
    
    def __str__(self):
        return f"{self.user.username if self.user else 'Unknown'} {self.get_action_type_display()} on {self.document.title}"
    
    def get_action_summary(self):
        """Get a summary of the action for display"""
        action_display = self.get_action_type_display()
        
        if self.action_type == 'delegate' and self.delegated_to:
            return f"{action_display} to {self.delegated_to.get_full_name()}"
        
        if self.comments:
            # Truncate long comments
            comment_preview = self.comments[:100] + "..." if len(self.comments) > 100 else self.comments
            return f"{action_display}: {comment_preview}"
        
        return action_display
    
    def calculate_response_time(self):
        """Calculate response time if not already set"""
        if not self.response_time_minutes and self.workflow_step:
            if self.workflow_step.started_at:
                from django.utils import timezone
                delta = self.action_date - self.workflow_step.started_at
                self.response_time_minutes = int(delta.total_seconds() / 60)
                self.save(update_fields=['response_time_minutes'])
    
    def save(self, *args, **kwargs):
        # Calculate response time if not already set
        if not self.response_time_minutes:
            self.calculate_response_time()
        
        super().save(*args, **kwargs)


class ApprovalTemplate(models.Model):
    """Templates for common approval actions with predefined comments and rules"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Template definition
    action_type = models.CharField(max_length=20, choices=ApprovalAction.ACTION_TYPES)
    default_comments = models.TextField(blank=True)
    
    # Conditions for when to use this template
    conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text="JSON conditions for when this template applies"
    )
    
    # Department and document type restrictions
    applicable_departments = models.ManyToManyField(
        'Department',
        blank=True,
        related_name='approval_templates'
    )
    applicable_document_types = models.ManyToManyField(
        'DocumentType',
        blank=True,
        related_name='approval_templates'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    
    # Audit
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='created_approval_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'approval_templates'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['action_type', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_action_type_display()})"
    
    def is_applicable_to(self, document, user):
        """Check if this template is applicable to the given document and user"""
        # Check document type
        if self.applicable_document_types.exists():
            if not self.applicable_document_types.filter(id=document.document_type.id).exists():
                return False
        
        # Check department
        if self.applicable_departments.exists():
            if not self.applicable_departments.filter(id=user.department.id).exists():
                return False
        
        # Check conditions (basic implementation)
        conditions = self.conditions or {}
        # Add more complex condition checking logic here
        
        return True

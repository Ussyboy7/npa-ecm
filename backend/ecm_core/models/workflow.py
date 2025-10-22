"""
Workflow Models for ECM

This module defines the workflow engine models:
- WorkflowTemplate: Reusable approval workflows per document type
- WorkflowInstance: Active workflow for a specific document
- WorkflowStep: Individual approval/review steps
"""

from django.db import models
from django.contrib.postgres.fields import JSONField
import uuid


class WorkflowTemplate(models.Model):
    """Reusable approval workflow templates"""
    
    TEMPLATE_TYPES = [
        ('sequential', 'Sequential Approval'),
        ('parallel', 'Parallel Approval'),
        ('conditional', 'Conditional Routing'),
        ('mixed', 'Mixed Sequential/Parallel'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic information
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPES, default='sequential')
    
    # Workflow definition (JSON)
    steps_definition = models.JSONField(
        default=list,
        help_text="JSON definition of workflow steps, routes, and conditions"
    )
    
    # Default settings
    timeout_days = models.IntegerField(default=7, help_text="Maximum days before workflow times out")
    escalation_days = models.IntegerField(default=3, help_text="Days before escalation kicks in")
    allow_delegate = models.BooleanField(default=True, help_text="Allow approvers to delegate tasks")
    require_all_approvals = models.BooleanField(default=True, help_text="Require all parallel approvals to complete")
    
    # Auto-routing rules
    auto_routing_rules = models.JSONField(
        default=dict,
        blank=True,
        help_text="Rules for automatic routing based on document metadata"
    )
    
    # Notification settings
    send_email_notifications = models.BooleanField(default=True)
    send_sms_notifications = models.BooleanField(default=False)
    notification_template = models.TextField(blank=True)
    
    # Department and document type restrictions
    applicable_departments = models.ManyToManyField(
        'Department',
        blank=True,
        related_name='workflow_templates'
    )
    applicable_document_types = models.ManyToManyField(
        'DocumentType',
        blank=True,
        related_name='workflow_templates'
    )
    
    # Version control
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False, help_text="Default workflow for new documents")
    
    # Audit
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='created_workflow_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'workflow_templates'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_active', 'is_default']),
            models.Index(fields=['created_by', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} (v{self.version})"
    
    def get_steps(self):
        """Parse and return workflow steps"""
        return self.steps_definition or []
    
    def add_step(self, step_definition):
        """Add a new step to the workflow"""
        steps = self.get_steps()
        steps.append(step_definition)
        self.steps_definition = steps
        self.save()
    
    def can_apply_to_document_type(self, document_type):
        """Check if workflow can be applied to a document type"""
        if not self.applicable_document_types.exists():
            return True  # No restrictions
        return self.applicable_document_types.filter(id=document_type.id).exists()
    
    def can_apply_to_department(self, department):
        """Check if workflow can be applied to a department"""
        if not self.applicable_departments.exists():
            return True  # No restrictions
        return self.applicable_departments.filter(id=department.id).exists()


class WorkflowInstance(models.Model):
    """Active workflow instance for a specific document"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Start'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
        ('timeout', 'Timed Out'),
        ('escalated', 'Escalated'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Associated objects
    workflow_template = models.ForeignKey(
        WorkflowTemplate, 
        on_delete=models.CASCADE, 
        related_name='instances'
    )
    document = models.ForeignKey(
        'Document', 
        on_delete=models.CASCADE, 
        related_name='workflow_instances'
    )
    
    # Status and progress
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    current_step = models.IntegerField(default=0)
    total_steps = models.IntegerField(default=0)
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Priority and timing
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    
    # Context and metadata
    context_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional context data for the workflow instance"
    )
    notes = models.TextField(blank=True)
    
    # User tracking
    initiated_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='initiated_workflows')
    approved_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_workflows')
    rejected_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='rejected_workflows')
    
    # Escalation tracking
    is_escalated = models.BooleanField(default=False)
    escalated_at = models.DateTimeField(null=True, blank=True)
    escalated_to = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='escalated_workflows')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'workflow_instances'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['document', '-created_at']),
            models.Index(fields=['initiated_by', '-created_at']),
            models.Index(fields=['due_date']),
            models.Index(fields=['is_escalated', 'escalated_at']),
            models.Index(fields=['workflow_template', 'status']),
        ]
    
    def __str__(self):
        return f"{self.workflow_template.name} - {self.document.title}"
    
    def get_current_step_definition(self):
        """Get the current step definition from the template"""
        steps = self.workflow_template.get_steps()
        if 0 <= self.current_step < len(steps):
            return steps[self.current_step]
        return None
    
    def get_current_approvers(self):
        """Get current step approvers"""
        current_step = self.get_current_step_definition()
        if not current_step:
            return []
        
        approvers = []
        for approver_def in current_step.get('approvers', []):
            if approver_def.get('type') == 'user':
                from .organization import User
                try:
                    approver = User.objects.get(id=approver_def['user_id'])
                    approvers.append({
                        'user': approver,
                        'required': approver_def.get('required', True)
                    })
                except User.DoesNotExist:
                    pass
            elif approver_def.get('type') == 'role':
                # Get users by role and department
                from .organization import User, Department
                role = approver_def['role']
                dept_id = approver_def.get('department_id')
                
                user_query = User.objects.filter(role=role, is_active=True)
                if dept_id:
                    try:
                        department = Department.objects.get(id=dept_id)
                        user_query = user_query.filter(department=department)
                    except Department.DoesNotExist:
                        continue
                
                for user in user_query:
                    approvers.append({
                        'user': user,
                        'required': approver_def.get('required', True)
                    })
        
        return approvers
    
    def advance_to_next_step(self):
        """Advance to the next step of the workflow"""
        steps = self.workflow_template.get_steps()
        
        if self.current_step < len(steps) - 1:
            self.current_step += 1
            self.progress_percentage = (self.current_step / len(steps)) * 100
            self.save()
            return True
        
        # Workflow completed
        self.status = 'completed'
        self.completed_at = models.DateTimeField(auto_now=True)
        self.progress_percentage = 100.00
        self.save()
        return False
    
    def is_overdue(self):
        """Check if workflow is overdue"""
        if self.due_date and not self.is_completed():
            from django.utils import timezone
            return timezone.now() > self.due_date
        return False
    
    def is_completed(self):
        """Check if workflow is completed"""
        return self.status in ['completed', 'approved', 'rejected', 'cancelled']


class WorkflowStep(models.Model):
    """Individual approval/review steps within a workflow instance"""
    
    STEP_TYPES = [
        ('approval', 'Approval'),
        ('review', 'Review'),
        ('notification', 'Notification'),
        ('condition', 'Condition'),
        ('parallel', 'Parallel Step'),
        ('sequential', 'Sequential Step'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('skipped', 'Skipped'),
        ('timeout', 'Timed Out'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Associated workflow instance
    workflow_instance = models.ForeignKey(
        WorkflowInstance, 
        on_delete=models.CASCADE, 
        related_name='workflow_steps'
    )
    
    # Step definition
    step_number = models.IntegerField()
    step_name = models.CharField(max_length=200)
    step_type = models.CharField(max_length=20, choices=STEP_TYPES, default='approval')
    step_description = models.TextField(blank=True)
    
    # Step configuration
    step_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Step-specific configuration (approvers, conditions, etc.)"
    )
    
    # Status and timing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    
    # Step result
    result = models.CharField(max_length=50, blank=True)  # 'approved', 'rejected', etc.
    comments = models.TextField(blank=True)
    decision_metadata = models.JSONField(default=dict, blank=True)
    
    # Who handled this step
    assigned_to = models.ForeignKey(
        'User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_workflow_steps'
    )
    handled_by = models.ForeignKey(
        'User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='handled_workflow_steps'
    )
    
    # Escalation
    is_escalated = models.BooleanField(default=False)
    escalated_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'workflow_steps'
        ordering = ['step_number']
        unique_together = ['workflow_instance', 'step_number']
        indexes = [
            models.Index(fields=['workflow_instance', 'step_number']),
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['handled_by', '-completed_at']),
        ]
    
    def __str__(self):
        return f"{self.workflow_instance} - Step {self.step_number}: {self.step_name}"
    
    def can_be_handled_by(self, user):
        """Check if user can handle this step"""
        # Check if assigned to user
        if self.assigned_to == user:
            return True
        
        # Check role-based permissions
        if self.step_config.get('require_role'):
            required_role = self.step_config['require_role']
            if user.role == required_role:
                return True
        
        # Check department permissions
        if self.step_config.get('require_department'):
            dept_id = self.step_config['require_department']
            if user.department_id == dept_id:
                return True
        
        return False
    
    def is_overdue(self):
        """Check if step is overdue"""
        if self.due_date and self.status in ['pending', 'in_progress']:
            from django.utils import timezone
            return timezone.now() > self.due_date
        return False
    
    def mark_completed(self, handled_by, result, comments=''):
        """Mark step as completed"""
        from django.utils import timezone
        
        self.status = 'completed'
        self.handled_by = handled_by
        self.result = result
        self.comments = comments
        self.completed_at = timezone.now()
        self.save()
        
        # Update workflow instance
        workflow = self.workflow_instance
        
        # Check if all required steps are completed
        required_steps = workflow.workflow_steps.filter(
            status='pending',
            step_config__contains={'required': True}
        )
        
        if not required_steps.exists():
            # Advance workflow or mark as completed
            if workflow.current_step >= workflow.total_steps - 1:
                workflow.status = 'completed'
                workflow.completed_at = timezone.now()
            else:
                workflow.advance_to_next_step()
            workflow.save()

"""
Workflow Engine Service

This service handles the execution and routing of document approval workflows,
including multi-level approvals, escalation, and delegation.
"""

from django.db import transaction
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from typing import List, Dict, Optional, Any
import logging

from ..models import (
    WorkflowTemplate, WorkflowInstance, WorkflowStep, ApprovalAction,
    Document, User, Department
)

logger = logging.getLogger(__name__)


class WorkflowEngine:
    """Engine for executing document approval workflows"""
    
    def __init__(self):
        self.logger = logger
    
    def start_workflow(self, document: Document, workflow_template: WorkflowTemplate, 
                      initiated_by: User, context: Dict[str, Any] = None) -> WorkflowInstance:
        """Start a new workflow instance for a document"""
        
        try:
            with transaction.atomic():
                # Create workflow instance
                workflow_instance = WorkflowInstance.objects.create(
                    workflow_template=workflow_template,
                    document=document,
                    initiated_by=initiated_by,
                    context_data=context or {},
                    status='pending',
                    total_steps=len(workflow_template.get_steps()),
                    started_at=timezone.now()
                )
                
                # Create workflow steps
                self._create_workflow_steps(workflow_instance)
                
                # Start the first step
                self._start_next_step(workflow_instance)
                
                # Update document status
                document.status = 'pending_review'
                document.save(update_fields=['status'])
                
                self.logger.info(f"Started workflow {workflow_instance.id} for document {document.id}")
                
                return workflow_instance
                
        except Exception as e:
            self.logger.error(f"Error starting workflow: {e}")
            raise
    
    def _create_workflow_steps(self, workflow_instance: WorkflowInstance):
        """Create individual workflow steps from template"""
        
        steps_definition = workflow_instance.workflow_template.get_steps()
        
        for step_index, step_def in enumerate(steps_definition):
            WorkflowStep.objects.create(
                workflow_instance=workflow_instance,
                step_number=step_index,
                step_name=step_def.get('name', f'Step {step_index + 1}'),
                step_type=step_def.get('type', 'approval'),
                step_description=step_def.get('description', ''),
                step_config=step_def,
                status='pending',
                due_date=self._calculate_due_date(step_def)
            )
    
    def _calculate_due_date(self, step_config: Dict[str, Any]) -> Optional[timezone.datetime]:
        """Calculate due date for a workflow step"""
        
        timeout_days = step_config.get('timeout_days', 
                                     self._get_default_timeout_days())
        if timeout_days:
            return timezone.now() + timezone.timedelta(days=timeout_days)
        return None
    
    def _get_default_timeout_days(self) -> int:
        """Get default timeout from settings"""
        return getattr(settings, 'WORKFLOW_TIMEOUT_DAYS', 7)
    
    def _start_next_step(self, workflow_instance: WorkflowInstance):
        """Start the next pending step in the workflow"""
        
        try:
            # Get the current step
            current_step = workflow_instance.workflow_steps.filter(
                step_number=workflow_instance.current_step,
                status='pending'
            ).first()
            
            if not current_step:
                self.logger.warning(f"No pending step found for workflow {workflow_instance.id}")
                return
            
            # Start the step
            current_step.status = 'in_progress'
            current_step.started_at = timezone.now()
            current_step.save()
            
            # Update workflow instance
            workflow_instance.status = 'in_progress'
            workflow_instance.save()
            
            # Assign step to approvers
            self._assign_step_to_approvers(current_step)
            
            # Send notifications
            self._send_step_notifications(current_step)
            
            self.logger.info(f"Started step {current_step.step_number} of workflow {workflow_instance.id}")
            
        except Exception as e:
            self.logger.error(f"Error starting next step: {e}")
            raise
    
    def _assign_step_to_approvers(self, workflow_step: WorkflowStep):
        """Assign workflow step to appropriate approvers"""
        
        step_config = workflow_step.step_config
        approver_definitions = step_config.get('approvers', [])
        
        for approver_def in approver_definitions:
            approvers = self._resolve_approvers(approver_def, workflow_step.workflow_instance.document)
            
            for approver in approvers:
                workflow_step.assigned_to = approver['user']
                workflow_step.save()
                break  # Assign to first available approver for now
        
        # If no specific approver assigned, use department head logic
        if not workflow_step.assigned_to:
            self._assign_by_department_logic(workflow_step)
    
    def _resolve_approvers(self, approver_def: Dict[str, Any], document: Document) -> List[Dict]:
        """Resolve approver definitions to actual users"""
        
        approvers = []
        approver_type = approver_def.get('type')
        
        if approver_type == 'user':
            # Specific user
            user_id = approver_def.get('user_id')
            if user_id:
                try:
                    user = User.objects.get(id=user_id, is_active=True)
                    approvers.append({
                        'user': user,
                        'required': approver_def.get('required', True)
                    })
                except User.DoesNotExist:
                    pass
        
        elif approver_type == 'role':
            # Users with specific role
            role = approver_def.get('role')
            department_id = approver_def.get('department_id')
            
            user_query = User.objects.filter(role=role, is_active=True)
            
            if department_id:
                user_query = user_query.filter(department_id=department_id)
            elif document.originating_department:
                user_query = user_query.filter(department=document.originating_department)
            
            for user in user_query:
                approvers.append({
                    'user': user,
                    'required': approver_def.get('required', True)
                })
        
        elif approver_type == 'department_head':
            # Department head
            if document.originating_department:
                dept_head = User.objects.filter(
                    department=document.originating_department,
                    role__in=['manager', 'supervisor'],
                    is_active=True
                ).first()
                
                if dept_head:
                    approvers.append({
                        'user': dept_head,
                        'required': approver_def.get('required', True)
                    })
        
        return approvers
    
    def _assign_by_department_logic(self, workflow_step: WorkflowStep):
        """Assign step using default department logic"""
        
        document = workflow_step.workflow_instance.document
        
        if document.originating_department:
            # Find department head or senior staff
            approver = User.objects.filter(
                department=document.originating_department,
                role__in=['manager', 'supervisor'],
                is_active=True
            ).first()
            
            if approver:
                workflow_step.assigned_to = approver
                workflow_step.save()
    
    def _send_step_notifications(self, workflow_step: WorkflowStep):
        """Send notifications for workflow step"""
        
        if workflow_step.assigned_to:
            # Send email notification (implement based on your email setup)
            try:
                send_mail(
                    subject=f'Workflow Approval Required: {workflow_step.document.title}',
                    message=self._generate_notification_message(workflow_step),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[workflow_step.assigned_to.email],
                    fail_silently=True
                )
            except Exception as e:
                self.logger.error(f"Failed to send notification email: {e}")
    
    def _generate_notification_message(self, workflow_step: WorkflowStep) -> str:
        """Generate notification message for workflow step"""
        
        document = workflow_step.workflow_instance.document
        approver = workflow_step.assigned_to
        
        message = f"""
Dear {approver.get_full_name()},

A document requires your approval:
        
Document: {document.title}
Type: {document.document_type.name if document.document_type else 'Unknown'}
Step: {workflow_step.step_name}
        
Please log into the ECM system to review and approve this document.

Due Date: {workflow_step.due_date.strftime('%Y-%m-%d %H:%M') if workflow_step.due_date else 'Not specified'}

Best regards,
NPA ECM System
        """
        
        return message.strip()
    
    def process_approval(self, workflow_step: WorkflowStep, user: User, 
                        action: str, comments: str = '') -> bool:
        """Process approval action on a workflow step"""
        
        try:
            with transaction.atomic():
                # Validate user can approve this step
                if not self._can_user_approve_step(workflow_step, user):
                    raise PermissionError("User cannot approve this workflow step")
                
                # Create approval action record
                ApprovalAction.objects.create(
                    workflow_instance=workflow_step.workflow_instance,
                    workflow_step=workflow_step,
                    document=workflow_step.workflow_instance.document,
                    action_type=action,
                    comments=comments,
                    user=user
                )
                
                # Update step status
                workflow_step.status = 'completed'
                workflow_step.result = action
                workflow_step.comments = comments
                workflow_step.handled_by = user
                workflow_step.completed_at = timezone.now()
                workflow_step.save()
                
                # Handle step completion
                if action == 'approve':
                    return self._handle_step_approval(workflow_step)
                elif action == 'reject':
                    return self._handle_step_rejection(workflow_step)
                else:
                    return self._handle_step_completion(workflow_step)
                
        except Exception as e:
            self.logger.error(f"Error processing approval: {e}")
            raise
    
    def _can_user_approve_step(self, workflow_step: WorkflowStep, user: User) -> bool:
        """Check if user can approve the workflow step"""
        
        # Check if user is assigned to this step
        if workflow_step.assigned_to == user:
            return True
        
        # Check role-based permissions
        if user.role in ['admin']:
            return True
        
        # Check if user is workflow initiator and step allows it
        if (workflow_step.workflow_instance.initiated_by == user and 
            workflow_step.step_config.get('allow_self_approval', False)):
            return True
        
        return False
    
    def _handle_step_approval(self, workflow_step: WorkflowStep) -> bool:
        """Handle step approval - advance to next step or complete workflow"""
        
        workflow_instance = workflow_step.workflow_instance
        
        # Check if this is the last step
        if workflow_instance.current_step >= workflow_instance.total_steps - 1:
            # Workflow completed
            workflow_instance.status = 'completed'
            workflow_instance.completed_at = timezone.now()
            workflow_instance.save()
            
            # Update document status
            document = workflow_instance.document
            document.status = 'approved'
            document.approved_by = workflow_step.handled_by
            document.approved_at = timezone.now()
            document.save()
            
            self.logger.info(f"Workflow {workflow_instance.id} completed with approval")
            return True
        else:
            # Advance to next step
            workflow_instance.current_step += 1
            workflow_instance.progress_percentage = (
                workflow_instance.current_step / workflow_instance.total_steps * 100
            )
            workflow_instance.save()
            
            # Start next step
            self._start_next_step(workflow_instance)
            return False
    
    def _handle_step_rejection(self, workflow_step: WorkflowStep) -> bool:
        """Handle step rejection - stop workflow"""
        
        workflow_instance = workflow_step.workflow_instance
        workflow_instance.status = 'rejected'
        workflow_instance.completed_at = timezone.now()
        workflow_instance.save()
        
        # Update document status
        document = workflow_instance.document
        document.status = 'rejected'
        document.save()
        
        self.logger.info(f"Workflow {workflow_instance.id} rejected")
        return True
    
    def _handle_step_completion(self, workflow_step: WorkflowStep) -> bool:
        """Handle general step completion"""
        
        return self._handle_step_approval(workflow_step)  # Default to approval logic
    
    def escalate_workflow(self, workflow_instance: WorkflowInstance, 
                         escalated_by: User, reason: str = '') -> bool:
        """Escalate an overdue workflow"""
        
        try:
            current_step = workflow_instance.workflow_steps.filter(
                step_number=workflow_instance.current_step,
                status='in_progress'
            ).first()
            
            if not current_step:
                return False
            
            # Find escalation approver
            escalation_config = workflow_instance.workflow_template.steps_definition[
                workflow_instance.current_step
            ].get('escalation', {})
            
            escalation_user_id = escalation_config.get('user_id')
            if escalation_user_id:
                try:
                    escalation_user = User.objects.get(id=escalation_user_id)
                    current_step.assigned_to = escalation_user
                    current_step.is_escalated = True
                    current_step.escalated_at = timezone.now()
                    current_step.save()
                    
                    # Log escalation action
                    ApprovalAction.objects.create(
                        workflow_instance=workflow_instance,
                        workflow_step=current_step,
                        document=workflow_instance.document,
                        action_type='escalate',
                        comments=reason,
                        user=escalated_by
                    )
                    
                    workflow_instance.is_escalated = True
                    workflow_instance.escalated_at = timezone.now()
                    workflow_instance.escalated_to = escalation_user
                    workflow_instance.save()
                    
                    self.logger.info(f"Escalated workflow {workflow_instance.id}")
                    return True
                    
                except User.DoesNotExist:
                    pass
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error escalating workflow: {e}")
            return False
    
    def get_user_workflow_tasks(self, user: User, status: str = 'in_progress') -> List[WorkflowStep]:
        """Get workflow tasks assigned to or available to a user"""
        
        tasks = WorkflowStep.objects.filter(
            assigned_to=user,
            status=status,
            workflow_instance__status='in_progress'
        ).select_related('workflow_instance', 'workflow_instance__document')
        
        # Add role-based tasks if user is admin or manager
        if user.role in ['admin', 'manager']:
            additional_tasks = WorkflowStep.objects.filter(
                workflow_instance__document__originating_department=user.department,
                status=status,
                workflow_instance__status='in_progress'
            ).exclude(id__in=tasks.values_list('id', flat=True))
            
            tasks = tasks.union(additional_tasks)
        
        return tasks.order_by('due_date', 'created_at')

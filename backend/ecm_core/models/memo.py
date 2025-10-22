"""
Memo Model for ECM

Internal memo with hierarchical approval workflow.
"""

import uuid
from django.db import models
from django.utils import timezone

from .organization import User, Department


class Memo(models.Model):
    """Internal memo with hierarchical approval workflow"""

    MEMO_STATUS = [
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('in_review', 'In Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('returned', 'Returned for Correction'),
    ]

    PRIORITY_LEVELS = [
        ('normal', 'Normal'),
        ('urgent', 'Urgent'),
        ('confidential', 'Confidential'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(max_length=50, unique=True, blank=True)
    subject = models.CharField(max_length=500)
    content = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_LEVELS, default='normal')

    # Originator
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='memos_created')
    department = models.ForeignKey(Department, on_delete=models.PROTECT)

    # Approval tracking
    current_approver = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='memos_pending')
    status = models.CharField(max_length=20, choices=MEMO_STATUS, default='draft')
    approval_level = models.IntegerField(default=0)  # Tracks hierarchy level

    # Secretary handling
    secretary_reviewed = models.BooleanField(default=False)
    secretary_notes = models.TextField(blank=True)
    handled_by_secretary = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='memos_handled')

    # Attachments
    attachments = models.ManyToManyField('Attachment', blank=True, related_name='memos')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'memos'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference_number']),
            models.Index(fields=['status']),
            models.Index(fields=['department']),
            models.Index(fields=['created_by']),
            models.Index(fields=['current_approver']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.reference_number or 'Draft'} - {self.subject}"

    def save(self, *args, **kwargs):
        # Generate reference number if not set and not draft
        if not self.reference_number and self.status != 'draft':
            from ..utils.reference_generator import generate_memo_reference
            year = timezone.now().year
            sequence = Memo.objects.filter(
                department=self.department,
                created_at__year=year
            ).exclude(pk=self.pk).count() + 1
            self.reference_number = f"NPA/{self.department.code}/{year}/{sequence:04d}"
        super().save(*args, **kwargs)

    def get_approval_hierarchy(self):
        """Get the approval hierarchy for this memo's department"""
        # This will be implemented based on NPA organizational structure
        # For now, return a basic hierarchy
        return [
            {'level': 1, 'role': 'pm', 'title': 'Principal Manager'},
            {'level': 2, 'role': 'agm', 'title': 'Assistant General Manager'},
            {'level': 3, 'role': 'gm', 'title': 'General Manager'},
            {'level': 4, 'role': 'ed', 'title': 'Executive Director'},
            {'level': 5, 'role': 'md', 'title': 'Managing Director'},
        ]

    def can_be_approved_by(self, user):
        """Check if the given user can approve this memo"""
        if self.status not in ['pending', 'in_review']:
            return False

        hierarchy = self.get_approval_hierarchy()
        current_level_info = hierarchy[self.approval_level] if self.approval_level < len(hierarchy) else None

        if not current_level_info:
            return False

        # Check if user has the required role
        return user.role == current_level_info['role'] or user.role in ['admin', 'md']

    def advance_approval(self, user):
        """Advance the memo to the next approval level"""
        hierarchy = self.get_approval_hierarchy()

        if self.approval_level < len(hierarchy) - 1:
            # Move to next level
            self.approval_level += 1
            next_level = hierarchy[self.approval_level]
            # Find appropriate approver for next level
            # This would need to be implemented based on organizational structure
            self.current_approver = None  # Reset - will be set by workflow logic
            self.save()
        else:
            # Final approval
            self.status = 'approved'
            self.approved_at = timezone.now()
            self.current_approver = None
            self.save()


class MemoComment(models.Model):
    """Comments on memos during approval process"""

    memo = models.ForeignKey(Memo, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    comment = models.TextField()
    is_private = models.BooleanField(default=False)  # Only visible to certain roles

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'memo_comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.get_full_name()} on {self.memo}"


class MemoApprovalHistory(models.Model):
    """Track approval history for audit purposes"""

    APPROVAL_ACTIONS = [
        ('submitted', 'Submitted for Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('returned', 'Returned for Correction'),
        ('secretary_review', 'Secretary Review Added'),
        ('comment_added', 'Comment Added'),
    ]

    memo = models.ForeignKey(Memo, on_delete=models.CASCADE, related_name='approval_history')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=20, choices=APPROVAL_ACTIONS)
    previous_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    approval_level = models.IntegerField()
    comments = models.TextField(blank=True)

    # Secretary tracking
    acted_on_behalf_of = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='behalf_actions')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'memo_approval_history'
        ordering = ['created_at']

    def __str__(self):
        behalf_text = f" on behalf of {self.acted_on_behalf_of.get_full_name()}" if self.acted_on_behalf_of else ""
        return f"{self.user.get_full_name()}{behalf_text} - {self.get_action_display()} - {self.memo}"


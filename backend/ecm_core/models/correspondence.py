"""
Correspondence Model for ECM

External correspondence with minute & forward workflow.
"""

import uuid
from django.db import models
from django.utils import timezone

from .organization import User, Department


class Correspondence(models.Model):
    """External correspondence with minute & forward workflow"""

    CORRESPONDENCE_TYPE = [
        ('incoming', 'Incoming'),
        ('outgoing', 'Outgoing'),
    ]

    PRIORITY_LEVEL = [
        ('normal', 'Normal'),
        ('urgent', 'Urgent'),
        ('confidential', 'Confidential'),
    ]

    STATUS_CHOICES = [
        ('registered', 'Registered'),
        ('minuted', 'Minuted'),
        ('forwarded', 'Forwarded'),
        ('acknowledged', 'Acknowledged'),
        ('closed', 'Closed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(max_length=50, unique=True, blank=True)
    correspondence_type = models.CharField(max_length=20, choices=CORRESPONDENCE_TYPE)

    # External party
    sender = models.CharField(max_length=200, help_text="External sender/organization")
    sender_address = models.TextField(blank=True)
    recipient_external = models.CharField(max_length=200, blank=True, help_text="External recipient for outgoing")

    # Internal recipient (executive)
    recipient_executive = models.ForeignKey(User, on_delete=models.PROTECT, related_name='correspondence_received')

    # Content
    subject = models.CharField(max_length=500)
    body = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_LEVEL, default='normal')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='registered')

    # Secretary processing
    received_by_secretary = models.ForeignKey(User, on_delete=models.PROTECT, related_name='correspondence_registered')
    registered_at = models.DateTimeField(auto_now_add=True)
    secretary_summary = models.TextField(blank=True, help_text="Secretary's summary/notes")

    # Executive action (minuting)
    executive_minute = models.TextField(blank=True, help_text="Executive's minute/decision")
    minuted_at = models.DateTimeField(null=True, blank=True)
    minuted_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='correspondence_minuted')

    # Attachments
    attachments = models.ManyToManyField('Attachment', blank=True, related_name='correspondence')

    # Acknowledgment tracking
    acknowledgment_required = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='correspondence_acknowledged')

    # Archival
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='correspondence_archived')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'correspondence'
        ordering = ['-registered_at']
        indexes = [
            models.Index(fields=['reference_number']),
            models.Index(fields=['correspondence_type']),
            models.Index(fields=['status']),
            models.Index(fields=['recipient_executive']),
            models.Index(fields=['received_by_secretary']),
            models.Index(fields=['priority']),
            models.Index(fields=['registered_at']),
        ]

    def __str__(self):
        return f"{self.reference_number or 'Unregistered'} - {self.subject}"

    def save(self, *args, **kwargs):
        # Generate reference number if not set
        if not self.reference_number:
            from ..utils.reference_generator import generate_correspondence_reference
            type_prefix = 'IN' if self.correspondence_type == 'incoming' else 'OUT'
            year = timezone.now().year
            sequence = Correspondence.objects.filter(
                correspondence_type=self.correspondence_type,
                registered_at__year=year
            ).exclude(pk=self.pk).count() + 1
            self.reference_number = f"NPA/CORR/{type_prefix}/{year}/{sequence:04d}"
        super().save(*args, **kwargs)

    def can_be_minuted_by(self, user):
        """Check if user can minute this correspondence"""
        return (
            self.recipient_executive == user or
            user.role in ['admin', 'md'] or
            (user.is_secretary and user.reports_to == self.recipient_executive and user.can_act_on_behalf)
        )

    def can_be_forwarded_by(self, user):
        """Check if user can forward this correspondence"""
        return (
            self.recipient_executive == user or
            (user.is_secretary and user.reports_to == self.recipient_executive)
        )

    def get_forward_recipients(self):
        """Get all users this correspondence was forwarded to"""
        return [forward.forwarded_to for forward in self.forwards.all()]

    def is_acknowledged_by_all(self):
        """Check if all recipients have acknowledged"""
        forwards = self.forwards.filter(action_required__in=['action', 'information'])
        return all(forward.opened_at is not None for forward in forwards)


class CorrespondenceForward(models.Model):
    """Track who correspondence was forwarded to and by whom"""

    ACTION_TYPES = [
        ('action', 'For Action'),
        ('information', 'For Information'),
        ('comment', 'For Comment'),
    ]

    correspondence = models.ForeignKey(Correspondence, on_delete=models.CASCADE, related_name='forwards')
    forwarded_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='correspondence_forwards_received')
    forwarded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='correspondence_forwards_sent')

    # On behalf of tracking
    forwarded_on_behalf_of = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='correspondence_forwards_on_behalf',
        help_text="If forwarded by secretary on behalf of executive"
    )

    action_required = models.CharField(max_length=20, choices=ACTION_TYPES, default='information')
    forwarding_note = models.TextField(blank=True, help_text="Additional notes from forwarder")

    # Tracking
    forwarded_at = models.DateTimeField(auto_now_add=True)
    opened_at = models.DateTimeField(null=True, blank=True, help_text="When recipient opened/viewed")
    acknowledged_at = models.DateTimeField(null=True, blank=True, help_text="When recipient acknowledged")

    # Response tracking
    response_required = models.BooleanField(default=False)
    responded_at = models.DateTimeField(null=True, blank=True)
    response_summary = models.TextField(blank=True)

    class Meta:
        db_table = 'correspondence_forwards'
        ordering = ['forwarded_at']
        unique_together = ['correspondence', 'forwarded_to']

    def __str__(self):
        behalf_text = f" on behalf of {self.forwarded_on_behalf_of.get_full_name()}" if self.forwarded_on_behalf_of else ""
        return f"{self.correspondence} forwarded to {self.forwarded_to.get_full_name()} by {self.forwarded_by.get_full_name()}{behalf_text}"

    def mark_as_opened(self, user):
        """Mark as opened by recipient"""
        if self.forwarded_to == user and not self.opened_at:
            self.opened_at = timezone.now()
            self.save()

    def acknowledge(self, user, summary=""):
        """Mark as acknowledged by recipient"""
        if self.forwarded_to == user:
            self.acknowledged_at = timezone.now()
            self.response_summary = summary
            self.save()

            # Check if all recipients have acknowledged
            if self.correspondence.is_acknowledged_by_all():
                self.correspondence.status = 'acknowledged'
                self.correspondence.save()


class CorrespondenceComment(models.Model):
    """Comments on correspondence"""

    correspondence = models.ForeignKey(Correspondence, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    comment = models.TextField()
    is_private = models.BooleanField(default=False)

    # Context
    related_forward = models.ForeignKey(CorrespondenceForward, null=True, blank=True, on_delete=models.SET_NULL)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'correspondence_comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.get_full_name()} on {self.correspondence}"


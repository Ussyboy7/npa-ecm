"""Signal handlers for integration webhooks."""

from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from correspondence.models import Correspondence
from dms.models import Document

from integrations.services import WebhookService


@receiver(post_save, sender=Document)
def document_webhook_handler(sender, instance, created, **kwargs):
    """
    Trigger webhook when document is created or updated.
    """
    if created:
        WebhookService.trigger_event(
            "document.created",
            {
                "id": str(instance.id),
                "title": instance.title,
                "document_type": instance.document_type,
                "status": instance.status,
                "author_id": str(instance.author.id) if instance.author else None,
                "created_at": instance.created_at.isoformat(),
            },
        )
    else:
        WebhookService.trigger_event(
            "document.updated",
            {
                "id": str(instance.id),
                "title": instance.title,
                "status": instance.status,
                "updated_at": instance.updated_at.isoformat(),
            },
        )


@receiver(post_save, sender=Correspondence)
def correspondence_webhook_handler(sender, instance, created, **kwargs):
    """
    Trigger webhook when correspondence is created or updated.
    """
    if created:
        WebhookService.trigger_event(
            "correspondence.created",
            {
                "id": str(instance.id),
                "subject": instance.subject,
                "reference_number": instance.reference_number,
                "status": instance.status,
                "priority": instance.priority,
                "created_at": instance.created_at.isoformat(),
            },
        )
    else:
        # Check if status changed to completed
        if instance.status == Correspondence.Status.COMPLETED:
            WebhookService.trigger_event(
                "correspondence.completed",
                {
                    "id": str(instance.id),
                    "subject": instance.subject,
                    "reference_number": instance.reference_number,
                    "completed_at": instance.updated_at.isoformat(),
                },
            )
        else:
            WebhookService.trigger_event(
                "correspondence.updated",
                {
                    "id": str(instance.id),
                    "subject": instance.subject,
                    "status": instance.status,
                    "updated_at": instance.updated_at.isoformat(),
                },
            )


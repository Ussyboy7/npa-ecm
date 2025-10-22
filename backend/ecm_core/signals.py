"""
Signal handlers for document events
"""
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from .models import Document, AuditLog


@receiver(post_save, sender=Document)
def log_document_creation(sender, instance, created, **kwargs):
    """Log document creation"""
    if created:
        AuditLog.objects.create(
            user=instance.uploaded_by,
            document=instance,
            action='create',
            description=f'Document "{instance.title}" was created'
        )


@receiver(pre_delete, sender=Document)
def log_document_deletion(sender, instance, **kwargs):
    """Log document deletion"""
    if instance.deleted_by:
        AuditLog.objects.create(
            user=instance.deleted_by,
            document=instance,
            action='delete',
            description=f'Document "{instance.title}" was deleted'
        )



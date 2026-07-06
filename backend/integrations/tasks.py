"""Celery tasks for integration operations."""

from __future__ import annotations

import logging

from celery import shared_task

from integrations.models import WebhookEvent
from integrations.services import WebhookService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def deliver_webhook(self, webhook_event_id: str):
    """
    Deliver a webhook event asynchronously.

    Args:
        webhook_event_id: UUID of the WebhookEvent to deliver
    """
    try:
        webhook_event = WebhookEvent.objects.get(id=webhook_event_id)
        success = WebhookService.deliver_webhook(webhook_event)

        if not success and webhook_event.attempt_count < webhook_event.webhook.retry_count:
            # Retry with exponential backoff
            delay = 60 * (2 ** webhook_event.attempt_count)  # 2, 4, 8 minutes
            raise self.retry(exc=None, countdown=delay)

    except WebhookEvent.DoesNotExist:
        logger.error(f"Webhook event {webhook_event_id} not found")
        raise
    except Exception as e:
        logger.error(f"Webhook delivery task failed: {str(e)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
        raise


@shared_task(name="integrations.tasks.retry_failed_webhooks")
def retry_failed_webhooks():
    """Periodic task to retry failed webhook deliveries."""
    retried = WebhookService.retry_failed_webhooks()
    logger.info(f"Retried {retried} failed webhook events")
    return {"retried": retried}


@shared_task(name="integrations.tasks.poll_imap_inboxes")
def poll_imap_inboxes():
    """Poll all active IMAP connectors for inbound correspondence."""
    from integrations.imap_service import IMAPIngestionService

    result = IMAPIngestionService.poll_all_active()
    logger.info("IMAP poll complete: %s", result)
    return result


@shared_task(name="integrations.tasks.sync_hrms_connectors")
def sync_hrms_connectors():
    """Sync all HRMS connectors with sync_enabled=True."""
    from integrations.hrms_service import HRMSSyncService
    from integrations.models import HRMSConnector
    from django.utils import timezone

    results = {"synced": 0, "failed": 0, "skipped": 0}
    now = timezone.now()
    from datetime import timedelta

    for connector in HRMSConnector.objects.filter(is_active=True, sync_enabled=True):
        if connector.last_synced_at:
            due = connector.last_synced_at + timedelta(minutes=connector.sync_interval_minutes)
            if now < due:
                results["skipped"] += 1
                continue
        outcome = HRMSSyncService.sync_staff(str(connector.id))
        if outcome.get("success"):
            results["synced"] += 1
        else:
            results["failed"] += 1
    logger.info("HRMS sync batch: %s", results)
    return results


@shared_task(name="integrations.tasks.sync_erp_connectors")
def sync_erp_connectors():
    """Sync all ERP connectors with sync_enabled=True."""
    from integrations.services import ERPConnectorService

    result = ERPConnectorService.sync_all_enabled()
    logger.info("ERP sync batch: %s", result)
    return result


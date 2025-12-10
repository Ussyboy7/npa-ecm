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


@shared_task
def retry_failed_webhooks():
    """Periodic task to retry failed webhook deliveries."""
    retried = WebhookService.retry_failed_webhooks()
    logger.info(f"Retried {retried} failed webhook events")
    return {"retried": retried}


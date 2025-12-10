"""Integration services for webhooks, email, and ERP connectors."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from datetime import timedelta
from typing import Any, Dict, List, Optional

import requests
from django.conf import settings
from django.db import models
from django.utils import timezone

from integrations.models import IntegrationLog, Webhook, WebhookEvent

logger = logging.getLogger(__name__)


class WebhookService:
    """Service for webhook delivery and management."""

    @staticmethod
    def trigger_event(event_type: str, data: Dict[str, Any]) -> List[WebhookEvent]:
        """
        Trigger webhook event for all subscribed webhooks.

        Args:
            event_type: Event type (e.g., 'document.created')
            data: Event payload data

        Returns:
            List of created WebhookEvent instances
        """
        # Find all active webhooks subscribed to this event
        webhooks = Webhook.objects.filter(
            is_active=True,
            events__contains=[event_type],
        )

        events = []
        for webhook in webhooks:
            event = WebhookEvent.objects.create(
                webhook=webhook,
                event_type=event_type,
                payload=data,
                status=WebhookEvent.EventStatus.PENDING,
            )
            events.append(event)

            # Trigger async delivery
            from integrations.tasks import deliver_webhook

            deliver_webhook.delay(str(event.id))

        logger.info(f"Triggered {len(events)} webhook events for {event_type}")

        return events

    @staticmethod
    def deliver_webhook(webhook_event: WebhookEvent) -> bool:
        """
        Deliver a webhook event.

        Args:
            webhook_event: WebhookEvent instance to deliver

        Returns:
            True if successful, False otherwise
        """
        webhook = webhook_event.webhook
        start_time = time.time()

        try:
            # Prepare payload
            payload = {
                "event_type": webhook_event.event_type,
                "timestamp": timezone.now().isoformat(),
                "data": webhook_event.payload,
            }
            payload_json = json.dumps(payload)

            # Generate signature
            signature = webhook.generate_signature(payload_json)

            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "X-Webhook-Signature": f"sha256={signature}",
                "X-Webhook-Event": webhook_event.event_type,
            }
            headers.update(webhook.headers)

            # Send webhook
            response = requests.post(
                webhook.url,
                data=payload_json,
                headers=headers,
                timeout=webhook.timeout_seconds,
            )

            duration_ms = int((time.time() - start_time) * 1000)

            # Update event
            webhook_event.response_code = response.status_code
            webhook_event.response_body = response.text[:1000]  # Limit response body
            webhook_event.attempt_count += 1
            webhook_event.last_attempt_at = timezone.now()

            if response.status_code >= 200 and response.status_code < 300:
                webhook_event.status = WebhookEvent.EventStatus.SENT
                webhook_event.save()

                # Log success
                IntegrationLog.objects.create(
                    log_type=IntegrationLog.LogType.WEBHOOK,
                    integration_id=webhook.id,
                    status=IntegrationLog.LogStatus.SUCCESS,
                    message=f"Webhook delivered successfully",
                    details={
                        "event_type": webhook_event.event_type,
                        "response_code": response.status_code,
                    },
                    duration_ms=duration_ms,
                )

                logger.info(
                    f"Webhook {webhook.id} delivered successfully (status: {response.status_code})"
                )
                return True
            else:
                webhook_event.status = WebhookEvent.EventStatus.FAILED
                webhook_event.error_message = f"HTTP {response.status_code}: {response.text[:200]}"
                webhook_event.save()

                # Log failure
                IntegrationLog.objects.create(
                    log_type=IntegrationLog.LogType.WEBHOOK,
                    integration_id=webhook.id,
                    status=IntegrationLog.LogStatus.FAILED,
                    message=f"Webhook delivery failed",
                    error_message=f"HTTP {response.status_code}",
                    details={
                        "event_type": webhook_event.event_type,
                        "response_code": response.status_code,
                    },
                    duration_ms=duration_ms,
                )

                logger.error(
                    f"Webhook {webhook.id} delivery failed (status: {response.status_code})"
                )
                return False

        except requests.exceptions.Timeout:
            duration_ms = int((time.time() - start_time) * 1000)
            webhook_event.status = WebhookEvent.EventStatus.FAILED
            webhook_event.error_message = "Request timeout"
            webhook_event.attempt_count += 1
            webhook_event.last_attempt_at = timezone.now()
            webhook_event.save()

            IntegrationLog.objects.create(
                log_type=IntegrationLog.LogType.WEBHOOK,
                integration_id=webhook.id,
                status=IntegrationLog.LogStatus.FAILED,
                message="Webhook delivery timeout",
                error_message="Request timeout",
                duration_ms=duration_ms,
            )

            logger.error(f"Webhook {webhook.id} delivery timeout")
            return False

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            error_msg = str(e)
            webhook_event.status = WebhookEvent.EventStatus.FAILED
            webhook_event.error_message = error_msg
            webhook_event.attempt_count += 1
            webhook_event.last_attempt_at = timezone.now()
            webhook_event.save()

            IntegrationLog.objects.create(
                log_type=IntegrationLog.LogType.WEBHOOK,
                integration_id=webhook.id,
                status=IntegrationLog.LogStatus.FAILED,
                message="Webhook delivery error",
                error_message=error_msg,
                duration_ms=duration_ms,
            )

            logger.error(f"Webhook {webhook.id} delivery error: {error_msg}")
            return False

    @staticmethod
    def retry_failed_webhooks():
        """Retry failed webhook deliveries that haven't exceeded retry count."""
        from datetime import timedelta

        failed_events = WebhookEvent.objects.filter(
            status=WebhookEvent.EventStatus.FAILED,
            attempt_count__lt=models.F("webhook__retry_count"),
        ).exclude(
            next_retry_at__gt=timezone.now(),
        )

        retried = 0
        for event in failed_events:
            # Calculate exponential backoff
            delay_minutes = 2 ** event.attempt_count  # 2, 4, 8, 16 minutes
            event.next_retry_at = timezone.now() + timedelta(minutes=delay_minutes)
            event.status = WebhookEvent.EventStatus.RETRYING
            event.save()

            # Trigger async retry
            from integrations.tasks import deliver_webhook

            deliver_webhook.apply_async(
                args=[str(event.id)],
                countdown=delay_minutes * 60,
            )
            retried += 1

        logger.info(f"Retried {retried} failed webhook events")
        return retried


class EmailService:
    """Service for email sending and receiving."""

    @staticmethod
    def send_email(
        to: List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        connector_id: Optional[str] = None,
    ) -> bool:
        """
        Send email via configured email connector.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            body: Plain text body
            html_body: Optional HTML body
            attachments: Optional list of attachments
            connector_id: Optional connector ID (uses default if not provided)

        Returns:
            True if sent successfully
        """
        from integrations.models import EmailConnector

        # Get connector
        if connector_id:
            try:
                connector = EmailConnector.objects.get(id=connector_id, is_active=True)
            except EmailConnector.DoesNotExist:
                logger.error(f"Email connector {connector_id} not found")
                return False
        else:
            connector = EmailConnector.objects.filter(
                is_active=True,
                is_outgoing=True,
                connector_type=EmailConnector.ConnectorType.SMTP,
            ).first()

            if not connector:
                logger.error("No active outgoing email connector configured")
                return False

        try:
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText

            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = connector.username
            msg["To"] = ", ".join(to)

            # Add body
            msg.attach(MIMEText(body, "plain"))
            if html_body:
                msg.attach(MIMEText(html_body, "html"))

            # Send email
            if connector.use_ssl:
                server = smtplib.SMTP_SSL(connector.host, connector.port)
            else:
                server = smtplib.SMTP(connector.host, connector.port)
                if connector.use_tls:
                    server.starttls()

            server.login(connector.username, connector.password)
            server.send_message(msg)
            server.quit()

            # Log success
            IntegrationLog.objects.create(
                log_type=IntegrationLog.LogType.EMAIL,
                integration_id=connector.id,
                status=IntegrationLog.LogStatus.SUCCESS,
                message=f"Email sent to {', '.join(to)}",
                details={"subject": subject, "recipients": to},
            )

            logger.info(f"Email sent successfully to {', '.join(to)}")
            return True

        except Exception as e:
            error_msg = str(e)
            IntegrationLog.objects.create(
                log_type=IntegrationLog.LogType.EMAIL,
                integration_id=connector.id,
                status=IntegrationLog.LogStatus.FAILED,
                message="Email send failed",
                error_message=error_msg,
            )

            logger.error(f"Email send failed: {error_msg}")
            return False


class ERPConnectorService:
    """Service for ERP system integration."""

    @staticmethod
    def sync_documents(connector_id: str) -> Dict[str, Any]:
        """
        Sync documents from ERP system.

        Args:
            connector_id: ERP connector ID

        Returns:
            Sync results dictionary
        """
        from integrations.models import ERPConnector

        try:
            connector = ERPConnector.objects.get(id=connector_id, is_active=True)
        except ERPConnector.DoesNotExist:
            return {"success": False, "error": "Connector not found"}

        start_time = time.time()

        try:
            # Make API request to ERP
            headers = {}
            if connector.api_key:
                headers["X-API-Key"] = connector.api_key
            elif connector.username and connector.password:
                # Use basic auth
                import base64

                auth = base64.b64encode(
                    f"{connector.username}:{connector.password}".encode()
                ).decode()
                headers["Authorization"] = f"Basic {auth}"

            response = requests.get(
                f"{connector.base_url}/documents",
                headers=headers,
                timeout=30,
            )

            duration_ms = int((time.time() - start_time) * 1000)

            if response.status_code == 200:
                data = response.json()
                # Process and sync documents
                # This would typically create/update Document records

                IntegrationLog.objects.create(
                    log_type=IntegrationLog.LogType.ERP,
                    integration_id=connector.id,
                    status=IntegrationLog.LogStatus.SUCCESS,
                    message="ERP sync completed",
                    details={"documents_synced": len(data.get("documents", []))},
                    duration_ms=duration_ms,
                )

                return {
                    "success": True,
                    "documents_synced": len(data.get("documents", [])),
                }
            else:
                IntegrationLog.objects.create(
                    log_type=IntegrationLog.LogType.ERP,
                    integration_id=connector.id,
                    status=IntegrationLog.LogStatus.FAILED,
                    message="ERP sync failed",
                    error_message=f"HTTP {response.status_code}",
                    duration_ms=duration_ms,
                )

                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                }

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            error_msg = str(e)

            IntegrationLog.objects.create(
                log_type=IntegrationLog.LogType.ERP,
                integration_id=connector.id,
                status=IntegrationLog.LogStatus.FAILED,
                message="ERP sync error",
                error_message=error_msg,
                duration_ms=duration_ms,
            )

            return {"success": False, "error": error_msg}


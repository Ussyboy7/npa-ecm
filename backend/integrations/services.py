"""Integration services for webhooks, email, and ERP connectors."""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict, List, Optional

import requests
from django.db import models
from django.utils import timezone

from integrations.models import IntegrationLog, Webhook, WebhookEvent
from common.field_encryption import decrypt_value

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

            server.login(connector.username, decrypt_value(connector.password))
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

    ORACLE_DEFAULT_PATH = "/fscmRestApi/resources/latest/invoices"
    GENERIC_DEFAULT_PATH = "/documents"

    @staticmethod
    def _auth_headers(connector) -> dict[str, str]:
        from integrations.connector_http import build_auth_headers
        from integrations.models import ERPConnector

        extra = {}
        if connector.erp_type == ERPConnector.ERPType.ORACLE:
            extra["Accept"] = "application/json"
        return build_auth_headers(
            api_key=connector.api_key,
            username=connector.username,
            password=connector.password,
            extra_headers=extra,
        )

    @staticmethod
    def _documents_path(connector) -> str:
        from integrations.models import ERPConnector

        mappings = connector.field_mappings or {}
        if mappings.get("api_path"):
            return str(mappings["api_path"])
        if connector.erp_type == ERPConnector.ERPType.ORACLE:
            return ERPConnectorService.ORACLE_DEFAULT_PATH
        return ERPConnectorService.GENERIC_DEFAULT_PATH

    @staticmethod
    def _extract_documents(payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        if isinstance(payload, dict):
            for key in ("documents", "items", "results", "data"):
                value = payload.get(key)
                if isinstance(value, list):
                    return [item for item in value if isinstance(item, dict)]
        return []

    @staticmethod
    def _map_erp_document(item: dict[str, Any], mappings: dict[str, str]) -> dict[str, str]:
        def pick(key: str, *fallbacks: str) -> str:
            source = mappings.get(key, key)
            for candidate in (source, key, *fallbacks):
                value = item.get(candidate)
                if value is not None and str(value).strip():
                    return str(value).strip()
            return ""

        external_id = pick("external_id", "id", "InvoiceId", "DocumentId", "document_id")
        title = pick("title", "name", "InvoiceNumber", "subject", "Description")
        description = pick("description", "summary", "Comments", "body")
        reference = pick("reference_number", "reference", "InvoiceNumber", "DocumentNumber")
        doc_type = pick("document_type", "type", "Category")
        return {
            "external_id": external_id,
            "title": title or f"ERP Document {external_id}",
            "description": description,
            "reference_number": reference,
            "document_type": doc_type.lower() if doc_type else "other",
        }

    @classmethod
    def sync_documents(cls, connector_id: str) -> Dict[str, Any]:
        """Fetch ERP records and create/update ECM documents."""
        from dms.models import Document
        from integrations.models import ERPConnector, ERPSyncRecord

        try:
            connector = ERPConnector.objects.get(id=connector_id, is_active=True)
        except ERPConnector.DoesNotExist:
            return {"success": False, "error": "Connector not found"}

        start_time = time.time()
        path = cls._documents_path(connector)
        url = f"{connector.base_url.rstrip('/')}/{path.lstrip('/')}"
        headers = cls._auth_headers(connector)

        try:
            response = requests.get(url, headers=headers, timeout=60)
            duration_ms = int((time.time() - start_time) * 1000)

            if response.status_code != 200:
                IntegrationLog.objects.create(
                    log_type=IntegrationLog.LogType.ERP,
                    integration_id=connector.id,
                    status=IntegrationLog.LogStatus.FAILED,
                    message="ERP sync failed",
                    error_message=f"HTTP {response.status_code}",
                    duration_ms=duration_ms,
                )
                return {"success": False, "error": f"HTTP {response.status_code}"}

            payload = response.json()
            rows = cls._extract_documents(payload)
            mappings = connector.field_mappings or {}
            created = updated = skipped = 0

            type_map = {
                "letter": Document.DocumentType.LETTER,
                "memo": Document.DocumentType.MEMO,
                "report": Document.DocumentType.REPORT,
                "policy": Document.DocumentType.POLICY,
                "form": Document.DocumentType.FORM,
            }

            for item in rows:
                mapped = cls._map_erp_document(item, mappings)
                external_id = mapped["external_id"]
                if not external_id:
                    skipped += 1
                    continue

                sync_record = ERPSyncRecord.objects.filter(
                    connector=connector,
                    external_id=external_id,
                ).select_related("document").first()

                document_type = type_map.get(
                    mapped["document_type"],
                    Document.DocumentType.OTHER,
                )

                if sync_record and sync_record.document_id:
                    document = sync_record.document
                    document.title = mapped["title"][:500]
                    document.description = mapped["description"][:5000]
                    if mapped["reference_number"]:
                        document.reference_number = mapped["reference_number"][:100]
                    document.save(
                        update_fields=["title", "description", "reference_number", "updated_at"]
                    )
                    sync_record.payload_snapshot = item
                    sync_record.save(update_fields=["payload_snapshot", "last_synced_at", "updated_at"])
                    updated += 1
                else:
                    document = Document.objects.create(
                        title=mapped["title"][:500],
                        description=mapped["description"][:5000],
                        document_type=document_type,
                        reference_number=(mapped["reference_number"] or external_id)[:100],
                        status=Document.DocumentStatus.DRAFT,
                        sensitivity=Document.Sensitivity.INTERNAL,
                        tags=["erp-sync", connector.erp_type],
                    )
                    ERPSyncRecord.objects.update_or_create(
                        connector=connector,
                        external_id=external_id,
                        defaults={
                            "document": document,
                            "payload_snapshot": item,
                        },
                    )
                    created += 1

                    try:
                        WebhookService.trigger_event(
                            "document.created",
                            {
                                "document_id": str(document.id),
                                "title": document.title,
                                "source": "erp_sync",
                                "connector_id": str(connector.id),
                                "external_id": external_id,
                            },
                        )
                    except Exception as webhook_error:
                        logger.warning("ERP sync webhook trigger failed: %s", webhook_error)

            connector.last_synced_at = timezone.now()
            connector.save(update_fields=["last_synced_at", "updated_at"])

            result = {
                "success": True,
                "documents_synced": created + updated,
                "documents_created": created,
                "documents_updated": updated,
                "documents_skipped": skipped,
            }
            IntegrationLog.objects.create(
                log_type=IntegrationLog.LogType.ERP,
                integration_id=connector.id,
                status=IntegrationLog.LogStatus.SUCCESS,
                message="ERP sync completed",
                details=result,
                duration_ms=duration_ms,
            )
            return result

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

    @classmethod
    def sync_all_enabled(cls) -> dict[str, int]:
        from datetime import timedelta

        from integrations.models import ERPConnector

        connectors = ERPConnector.objects.filter(is_active=True, sync_enabled=True)
        synced = skipped = 0
        now = timezone.now()
        for connector in connectors:
            if connector.last_synced_at:
                due = connector.last_synced_at + timedelta(minutes=connector.sync_interval_minutes)
                if now < due:
                    skipped += 1
                    continue
            result = cls.sync_documents(str(connector.id))
            if result.get("success"):
                synced += 1
        return {"connectors": connectors.count(), "synced": synced, "skipped": skipped}


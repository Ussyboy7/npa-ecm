"""IMAP inbound email ingestion into correspondence."""

from __future__ import annotations

import email
import imaplib
import logging
import time
import uuid
from email.header import decode_header
from typing import Any

from django.utils import timezone

from common.field_encryption import decrypt_value
from integrations.models import EmailConnector, IntegrationLog

logger = logging.getLogger(__name__)


def _decode_header_value(value: str | None) -> str:
    if not value:
        return ""
    parts = []
    for chunk, charset in decode_header(value):
        if isinstance(chunk, bytes):
            parts.append(chunk.decode(charset or "utf-8", errors="replace"))
        else:
            parts.append(str(chunk))
    return "".join(parts)


def _extract_body(msg: email.message.Message) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace")
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace")
        return ""
    payload = msg.get_payload(decode=True)
    if not payload:
        return ""
    charset = msg.get_content_charset() or "utf-8"
    return payload.decode(charset, errors="replace")


class IMAPIngestionService:
    """Poll IMAP mailboxes and optionally create correspondence from inbound mail."""

    @staticmethod
    def _processed_ids(connector: EmailConnector) -> set[str]:
        state = connector.sync_state or {}
        ids = state.get("processed_message_ids", [])
        return set(str(x) for x in ids)

    @staticmethod
    def _remember_message_id(connector: EmailConnector, message_id: str) -> None:
        state = dict(connector.sync_state or {})
        ids = list(state.get("processed_message_ids", []))
        if message_id not in ids:
            ids.append(message_id)
        state["processed_message_ids"] = ids[-500:]
        state["last_poll_at"] = timezone.now().isoformat()
        connector.sync_state = state

    @classmethod
    def poll_connector(cls, connector_id: str) -> dict[str, Any]:
        from correspondence.models import Correspondence
        from organization.models import Department, Division

        start = time.time()
        try:
            connector = EmailConnector.objects.get(id=connector_id, is_active=True)
        except EmailConnector.DoesNotExist:
            return {"success": False, "error": "Email connector not found"}

        if connector.connector_type != EmailConnector.ConnectorType.IMAP:
            return {"success": False, "error": "Connector is not IMAP"}
        if not connector.is_incoming:
            return {"success": False, "error": "Connector is not configured for incoming mail"}

        processed_ids = cls._processed_ids(connector)
        created = skipped = failed = 0
        max_uid = connector.last_synced_uid

        try:
            if connector.use_ssl:
                client = imaplib.IMAP4_SSL(connector.host, connector.port)
            else:
                client = imaplib.IMAP4(connector.host, connector.port)
                if connector.use_tls:
                    client.starttls()

            client.login(connector.username, decrypt_value(connector.password))
            folder = connector.imap_folder or "INBOX"
            client.select(folder)

            # Fetch messages with UID greater than last synced
            search_criteria = f"UID {connector.last_synced_uid + 1}:*"
            status, data = client.uid("search", None, search_criteria)
            if status != "OK":
                raise ValueError(f"IMAP search failed: {status}")

            uid_list = data[0].split() if data and data[0] else []
            division = None
            department = None
            if connector.default_division_id:
                division = Division.objects.filter(id=connector.default_division_id).first()
            if connector.default_department_id:
                department = Department.objects.filter(id=connector.default_department_id).first()

            for uid_bytes in uid_list:
                uid = int(uid_bytes)
                max_uid = max(max_uid, uid)
                status, msg_data = client.uid("fetch", uid_bytes, "(RFC822)")
                if status != "OK" or not msg_data or not msg_data[0]:
                    failed += 1
                    continue

                raw = msg_data[0][1]
                msg = email.message_from_bytes(raw)
                message_id = (msg.get("Message-ID") or f"uid-{uid}").strip()
                if message_id in processed_ids:
                    skipped += 1
                    client.uid("store", uid_bytes, "+FLAGS", "(\\Seen)")
                    continue

                subject = _decode_header_value(msg.get("Subject")) or "(No subject)"
                from_header = _decode_header_value(msg.get("From"))
                sender_name = from_header
                sender_org = ""
                if "<" in from_header:
                    sender_name = from_header.split("<")[0].strip().strip('"')
                    sender_org = from_header.split("<")[-1].rstrip(">").strip()

                body = _extract_body(msg)
                received = msg.get("Date")

                if connector.auto_create_correspondence:
                    ref = f"NPA/EMAIL/{timezone.now().strftime('%Y%m%d')}/{uuid.uuid4().hex[:6].upper()}"
                    Correspondence.objects.create(
                        reference_number=ref,
                        subject=subject[:500],
                        body_html=body[:50000],
                        source=Correspondence.Source.EXTERNAL,
                        direction=Correspondence.Direction.UPWARD,
                        status=Correspondence.Status.PENDING,
                        sender_name=sender_name[:255],
                        sender_organization=(sender_org or sender_name)[:255],
                        received_date=timezone.now().date(),
                        division=division,
                        department=department,
                    )
                    created += 1

                cls._remember_message_id(connector, message_id)
                processed_ids.add(message_id)
                client.uid("store", uid_bytes, "+FLAGS", "(\\Seen)")

            client.logout()

            connector.last_synced_uid = max_uid
            connector.save(update_fields=["last_synced_uid", "sync_state", "updated_at"])

            duration_ms = int((time.time() - start) * 1000)
            result = {
                "success": True,
                "messages_processed": len(uid_list),
                "correspondence_created": created,
                "skipped": skipped,
                "failed": failed,
                "last_uid": max_uid,
            }
            IntegrationLog.objects.create(
                log_type=IntegrationLog.LogType.EMAIL,
                integration_id=connector.id,
                status=IntegrationLog.LogStatus.SUCCESS,
                message="IMAP poll completed",
                details=result,
                duration_ms=duration_ms,
            )
            return result

        except Exception as exc:
            duration_ms = int((time.time() - start) * 1000)
            error_msg = str(exc)
            IntegrationLog.objects.create(
                log_type=IntegrationLog.LogType.EMAIL,
                integration_id=connector.id,
                status=IntegrationLog.LogStatus.FAILED,
                message="IMAP poll failed",
                error_message=error_msg,
                duration_ms=duration_ms,
            )
            logger.error("IMAP poll failed for %s: %s", connector_id, error_msg)
            return {"success": False, "error": error_msg}

    @classmethod
    def poll_all_active(cls) -> dict[str, int]:
        connectors = EmailConnector.objects.filter(
            is_active=True,
            is_incoming=True,
            connector_type=EmailConnector.ConnectorType.IMAP,
        )
        polled = succeeded = 0
        for connector in connectors:
            polled += 1
            result = cls.poll_connector(str(connector.id))
            if result.get("success"):
                succeeded += 1
        return {"polled": polled, "succeeded": succeeded}

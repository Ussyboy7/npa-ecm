"""Audit trail service for logging system activities."""

from __future__ import annotations

import logging
from typing import Any, Optional

from django.contrib.auth import get_user_model
from django.db.models import Model, QuerySet
from django.utils import timezone

from .models import ActivityLog

User = get_user_model()
logger = logging.getLogger(__name__)


class AuditService:
    """Service for creating audit log entries."""

    @staticmethod
    def _to_jsonable(value: Any, *, depth: int = 0) -> Any:
        if depth > 6:
            return str(value)

        if value is None or isinstance(value, (str, int, float, bool)):
            return value

        if isinstance(value, (list, tuple, set)):
            return [AuditService._to_jsonable(v, depth=depth + 1) for v in value]

        if isinstance(value, dict):
            return {
                str(k): AuditService._to_jsonable(v, depth=depth + 1)
                for k, v in value.items()
            }

        if isinstance(value, QuerySet):
            return [str(obj.pk) for obj in value]

        if isinstance(value, Model):
            return {"id": str(value.pk), "repr": str(value)}

        if hasattr(value, "isoformat"):
            try:
                return value.isoformat()
            except Exception:
                return str(value)

        return str(value)

    @staticmethod
    def sanitize_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
        if not metadata:
            return {}
        return AuditService._to_jsonable(metadata)

    @staticmethod
    def get_client_ip(request) -> Optional[str]:
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip

    @staticmethod
    def get_user_agent(request) -> str:
        """Extract user agent from request."""
        return request.META.get("HTTP_USER_AGENT", "")[:500]

    @staticmethod
    def log_activity(
        user=None,
        action: str = "",
        object_type: str = "",
        object_id: str = "",
        object_repr: str = "",
        module: str = "",
        description: str = "",
        metadata: dict[str, Any] | None = None,
        severity: str = ActivityLog.Severity.INFO,
        success: bool = True,
        error_message: str = "",
        request=None,
    ) -> ActivityLog:
        """
        Create an audit log entry.

        Args:
            user: User performing the action (None for system actions)
            action: Action type (from ActivityLog.ActionType)
            object_type: Type of object being acted upon
            object_id: ID of object being acted upon
            object_repr: Human-readable representation of object
            module: Module name (dms, correspondence, etc.)
            description: Detailed description
            metadata: Additional context data
            severity: Severity level
            success: Whether action was successful
            error_message: Error message if action failed
            request: Django request object (for IP and user agent)
        """
        ip_address = None
        user_agent = ""

        if request:
            ip_address = AuditService.get_client_ip(request)
            user_agent = AuditService.get_user_agent(request)

        log_entry = ActivityLog.objects.create(
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            action=action,
            severity=severity,
            object_type=object_type,
            object_id=object_id,
            object_repr=object_repr,
            module=module,
            description=description,
            metadata=AuditService.sanitize_metadata(metadata),
            success=success,
            error_message=error_message,
        )

        logger.info(f"Audit log created: {action} by {user} on {object_type}:{object_id}")
        return log_entry

    @staticmethod
    def log_document_activity(
        user,
        action: str,
        document,
        request=None,
        description: str = "",
        metadata: dict[str, Any] | None = None,
        success: bool = True,
    ):
        """Log document-related activity."""
        return AuditService.log_activity(
            user=user,
            action=action,
            object_type="document",
            object_id=str(document.id),
            object_repr=document.title,
            module="dms",
            description=description or f"{action.replace('_', ' ').title()} for document: {document.title}",
            metadata=metadata,
            request=request,
            success=success,
        )

    @staticmethod
    def log_correspondence_activity(
        user,
        action: str,
        correspondence,
        request=None,
        description: str = "",
        metadata: dict[str, Any] | None = None,
        success: bool = True,
    ):
        """Log correspondence-related activity."""
        return AuditService.log_activity(
            user=user,
            action=action,
            object_type="correspondence",
            object_id=str(correspondence.id),
            object_repr=correspondence.reference_number or correspondence.subject,
            module="correspondence",
            description=description or f"{action.replace('_', ' ').title()} for correspondence: {correspondence.reference_number}",
            metadata=metadata,
            request=request,
            success=success,
        )

    @staticmethod
    def log_user_activity(
        user,
        action: str,
        target_user=None,
        request=None,
        description: str = "",
        metadata: dict[str, Any] | None = None,
        success: bool = True,
        error_message: str = "",
    ):
        """Log user-related activity."""
        # Handle case where user might be None (e.g., during login before authentication)
        if not user and not target_user:
            # Cannot log without a user
            return None
        
        object_id = str(target_user.id) if target_user else str(user.id)
        object_repr = target_user.username if target_user else user.username
        return AuditService.log_activity(
            user=user,
            action=action,
            object_type="user",
            object_id=object_id,
            object_repr=object_repr,
            module="accounts",
            description=description or f"{action.replace('_', ' ').title()} for user: {object_repr}",
            metadata=metadata,
            request=request,
            success=success,
            error_message=error_message,
        )

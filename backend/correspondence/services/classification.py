"""Classification service for correspondence approval levels."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.utils import timezone
from rest_framework.exceptions import ValidationError

EXECUTIVE_THRESHOLD = Decimal("50000000")


def classify_required_level(amount: Decimal | None, strategic_flag: bool) -> str:
    """Return required approval level based on amount and strategic flag.

    - EXECUTIVE if amount >= 50_000_000 OR strategic_flag True
    - else DEPARTMENTAL

    Returns lowercase strings matching Correspondence.RequiredApprovalLevel values.
    """
    # Lazy import to avoid circular
    from correspondence.models import Correspondence

    if strategic_flag:
        return Correspondence.RequiredApprovalLevel.EXECUTIVE
    if amount is not None:
        try:
            amt = Decimal(amount)
        except (InvalidOperation, TypeError, ValueError):
            amt = Decimal("0")
        if amt >= EXECUTIVE_THRESHOLD:
            return Correspondence.RequiredApprovalLevel.EXECUTIVE
    return Correspondence.RequiredApprovalLevel.DEPARTMENTAL


def escalate(correspondence, user, reason: str) -> None:
    """Escalate correspondence to EXECUTIVE level.

    Checks can_classify_approval permission, sets required_approval_level,
    classified_by/at/reason, and creates audit entry.
    """
    from organization.permission_utils import require_permission

    require_permission(user, "can_classify_approval")

    from correspondence.models import Correspondence
    from audit.models import ActivityLog
    from audit.services import AuditService

    correspondence.required_approval_level = Correspondence.RequiredApprovalLevel.EXECUTIVE
    correspondence.classified_by = user
    correspondence.classified_at = timezone.now()
    correspondence.classification_reason = reason or ""
    correspondence.save(
        update_fields=[
            "required_approval_level",
            "classified_by",
            "classified_at",
            "classification_reason",
            "updated_at",
        ]
    )

    AuditService.log_correspondence_activity(
        user=user,
        action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
        correspondence=correspondence,
        description=f"Escalated to executive approval: {reason}",
        metadata={"action": "escalate", "reason": reason, "level": "executive"},
    )


def downgrade_with_reason(correspondence, user, reason: str) -> None:
    """Downgrade auto-EXECUTIVE correspondence to DEPARTMENTAL with explicit reason.

    Requires non-empty reason and can_classify_approval permission. Audited.
    Raises ValidationError if reason empty.
    """
    if not reason or not str(reason).strip():
        raise ValidationError({"reason": "Reason is required for downgrade."})

    from organization.permission_utils import require_permission

    require_permission(user, "can_classify_approval")

    from correspondence.models import Correspondence
    from audit.models import ActivityLog
    from audit.services import AuditService

    correspondence.required_approval_level = Correspondence.RequiredApprovalLevel.DEPARTMENTAL
    correspondence.classified_by = user
    correspondence.classified_at = timezone.now()
    correspondence.classification_reason = reason
    correspondence.save(
        update_fields=[
            "required_approval_level",
            "classified_by",
            "classified_at",
            "classification_reason",
            "updated_at",
        ]
    )

    AuditService.log_correspondence_activity(
        user=user,
        action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
        correspondence=correspondence,
        description=f"Downgraded to departmental approval: {reason}",
        metadata={"action": "downgrade", "reason": reason, "level": "departmental"},
    )

"""Celery tasks for organization / acting appointments."""

from __future__ import annotations

import logging
from typing import Any

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="organization.expire_acting_appointments")
def expire_acting_appointments() -> dict[str, Any]:
    """Activate due transfers and end expired acting appointments."""
    from organization.acting_services import activate_due_transfers, expire_due_appointments

    activated = activate_due_transfers()
    expired = expire_due_appointments()
    result = {"activated": activated, "expired": expired}
    logger.info("Acting appointment maintenance: %s", result)
    return result

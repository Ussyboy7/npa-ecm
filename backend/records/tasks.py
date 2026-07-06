"""Celery tasks for records governance automation."""

from __future__ import annotations

import logging
from typing import Any

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="records.generate_due_disposals")
def generate_due_disposals() -> dict[str, Any]:
    """Create disposal requests for archived correspondence past retention."""
    from records.models import DisposalRequest
    from records.services import correspondence_due_for_disposal, find_retention_schedule

    created = 0
    skipped = 0

    for corr in correspondence_due_for_disposal().iterator(chunk_size=100):
        exists = DisposalRequest.objects.filter(
            correspondence=corr,
            status__in=[
                DisposalRequest.Status.PENDING,
                DisposalRequest.Status.APPROVED,
            ],
        ).exists()
        if exists:
            skipped += 1
            continue

        DisposalRequest.objects.create(
            correspondence=corr,
            retention_schedule=find_retention_schedule(corr),
            reason="Auto-generated: retention period elapsed",
        )
        created += 1

    result = {"created": created, "skipped": skipped}
    logger.info("Records due disposal generation: %s", result)
    return result

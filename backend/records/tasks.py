"""Celery tasks for records management."""

from __future__ import annotations

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from correspondence.models import Correspondence
from dms.models import Document

from records.models import Disposition, RetentionSchedule
from records.services import DispositionService, RetentionService

logger = logging.getLogger(__name__)


@shared_task
def check_retention_schedules():
    """
    Daily task to check retention schedules and create dispositions.

    This task should run daily (e.g., via celery-beat) to:
    1. Find schedules where disposition_date has passed
    2. Create Disposition records for those schedules
    3. Check for legal holds that might block disposition
    """
    logger.info("Starting retention schedule check")

    now = timezone.now()
    # Check schedules where disposition date has passed or is within next 7 days
    upcoming_schedules = RetentionSchedule.objects.filter(
        is_active=True,
        disposition_created=False,
        disposition_date__lte=now + timedelta(days=7),
    )

    created_count = 0
    blocked_count = 0

    for schedule in upcoming_schedules:
        try:
            disposition = DispositionService.create_disposition_from_schedule(schedule)
            if disposition:
                if disposition.blocked_by_legal_hold:
                    blocked_count += 1
                    logger.info(
                        f"Disposition blocked by legal hold for {schedule.record_type} {schedule.record_id}"
                    )
                else:
                    created_count += 1
                    logger.info(
                        f"Created disposition for {schedule.record_type} {schedule.record_id}"
                    )
        except Exception as e:
            logger.error(
                f"Error creating disposition for schedule {schedule.id}: {str(e)}"
            )

    logger.info(
        f"Retention schedule check complete: {created_count} dispositions created, {blocked_count} blocked"
    )

    return {
        "created": created_count,
        "blocked": blocked_count,
        "total_checked": upcoming_schedules.count(),
    }


@shared_task
def apply_retention_policies_to_existing_records():
    """
    Task to apply retention policies to existing records that don't have schedules.

    This is useful for:
    1. Initial setup when policies are created
    2. Applying new policies to existing records
    """
    logger.info("Applying retention policies to existing records")

    from records.models import RetentionPolicy

    active_policies = RetentionPolicy.objects.filter(is_active=True)

    applied_count = 0

    for policy in active_policies:
        # Apply to documents
        if policy.applies_to in [
            RetentionPolicy.AppliesTo.DOCUMENT,
            RetentionPolicy.AppliesTo.ALL,
        ]:
            documents = Document.objects.all()
            for doc in documents:
                if RetentionService.policy_applies_to_record(policy, doc):
                    schedule = RetentionService.apply_policy_to_record(policy, doc)
                    if schedule:
                        applied_count += 1

        # Apply to correspondence
        if policy.applies_to in [
            RetentionPolicy.AppliesTo.CORRESPONDENCE,
            RetentionPolicy.AppliesTo.ALL,
        ]:
            correspondences = Correspondence.objects.all()
            for corr in correspondences:
                if RetentionService.policy_applies_to_record(policy, corr):
                    schedule = RetentionService.apply_policy_to_record(policy, corr)
                    if schedule:
                        applied_count += 1

    logger.info(f"Applied retention policies: {applied_count} schedules created")

    return {"applied": applied_count}


@shared_task
def process_pending_dispositions():
    """
    Task to process pending dispositions that are ready for execution.

    This task should run periodically to:
    1. Find dispositions that are approved and scheduled
    2. Execute them if they're not blocked
    """
    logger.info("Processing pending dispositions")

    now = timezone.now()
    pending_dispositions = Disposition.objects.filter(
        status=Disposition.DispositionStatus.APPROVED,
        scheduled_date__lte=now,
        blocked_by_legal_hold=False,
    )

    executed_count = 0
    failed_count = 0

    for disposition in pending_dispositions:
        try:
            # Re-check for legal holds
            if disposition.record_type == Disposition.RecordType.DOCUMENT:
                record = Document.objects.get(id=disposition.record_id)
            else:
                record = Correspondence.objects.get(id=disposition.record_id)

            from records.services import LegalHoldService

            legal_holds = LegalHoldService.check_legal_hold(record)
            if legal_holds:
                disposition.blocked_by_legal_hold = True
                disposition.status = Disposition.DispositionStatus.BLOCKED
                disposition.blocking_legal_holds.set(legal_holds)
                disposition.save()
                logger.info(f"Disposition {disposition.id} blocked by legal hold")
                continue

            # Execute disposition
            # Note: executed_by should be a system user or admin
            # For now, we'll use None and mark as system-executed
            success = DispositionService.execute_disposition(
                disposition, executed_by=None, notes="Automated execution"
            )

            if success:
                executed_count += 1
            else:
                failed_count += 1

        except Exception as e:
            logger.error(f"Error executing disposition {disposition.id}: {str(e)}")
            failed_count += 1

    logger.info(
        f"Processed dispositions: {executed_count} executed, {failed_count} failed"
    )

    return {
        "executed": executed_count,
        "failed": failed_count,
        "total": pending_dispositions.count(),
    }


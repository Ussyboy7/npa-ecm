"""Records management services for retention policies, legal holds, and disposition."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import List, Optional

from django.db import transaction
from django.utils import timezone

from correspondence.models import Correspondence
from dms.models import Document

from .models import Disposition, LegalHold, RetentionPolicy, RetentionSchedule

logger = logging.getLogger(__name__)


class RetentionService:
    """Service for managing retention policies and schedules."""

    @staticmethod
    def calculate_retention_dates(
        policy: RetentionPolicy,
        trigger_date: timezone.datetime,
    ) -> dict:
        """
        Calculate retention end date and disposition date based on policy.

        Args:
            policy: RetentionPolicy instance
            trigger_date: Date when retention period starts

        Returns:
            Dictionary with retention_end_date and disposition_date
        """
        retention_end_date = trigger_date + timedelta(days=policy.retention_period_days)
        # Disposition happens immediately after retention period ends
        disposition_date = retention_end_date

        return {
            "retention_start_date": trigger_date,
            "retention_end_date": retention_end_date,
            "disposition_date": disposition_date,
        }

    @staticmethod
    def get_trigger_date(
        policy: RetentionPolicy,
        record: Document | Correspondence,
    ) -> timezone.datetime:
        """
        Get the trigger date for a record based on policy trigger event.

        Args:
            policy: RetentionPolicy instance
            record: Document or Correspondence instance

        Returns:
            Trigger date
        """
        if policy.trigger_event == RetentionPolicy.TriggerEvent.CREATION:
            return record.created_at
        elif policy.trigger_event == RetentionPolicy.TriggerEvent.COMPLETION:
            # For correspondence, use completed_at if available
            if isinstance(record, Correspondence) and hasattr(record, "completed_at"):
                return record.completed_at or record.created_at
            return record.created_at
        elif policy.trigger_event == RetentionPolicy.TriggerEvent.LAST_ACCESS:
            # Use updated_at as proxy for last access
            return record.updated_at
        elif policy.trigger_event == RetentionPolicy.TriggerEvent.LAST_MODIFIED:
            return record.updated_at
        else:
            return record.created_at

    @staticmethod
    def policy_applies_to_record(
        policy: RetentionPolicy,
        record: Document | Correspondence,
    ) -> bool:
        """
        Check if a retention policy applies to a record.

        Args:
            policy: RetentionPolicy instance
            record: Document or Correspondence instance

        Returns:
            True if policy applies
        """
        # Check applies_to
        if policy.applies_to == RetentionPolicy.AppliesTo.DOCUMENT:
            if not isinstance(record, Document):
                return False
        elif policy.applies_to == RetentionPolicy.AppliesTo.CORRESPONDENCE:
            if not isinstance(record, Correspondence):
                return False

        # Check document type filter
        if isinstance(record, Document) and policy.document_types:
            if record.document_type not in policy.document_types:
                return False

        # Check sensitivity filter
        if isinstance(record, Document) and policy.sensitivity_levels:
            if record.sensitivity not in policy.sensitivity_levels:
                return False

        # Check division filter
        if policy.division_ids:
            record_division = None
            if isinstance(record, Document) and record.division_id:
                record_division = record.division_id
            elif isinstance(record, Correspondence) and record.division_id:
                record_division = record.division_id

            if not record_division or str(record_division) not in policy.division_ids:
                return False

        return True

    @staticmethod
    @transaction.atomic
    def apply_policy_to_record(
        policy: RetentionPolicy,
        record: Document | Correspondence,
    ) -> Optional[RetentionSchedule]:
        """
        Apply a retention policy to a record and create a retention schedule.

        Args:
            policy: RetentionPolicy instance
            record: Document or Correspondence instance

        Returns:
            Created RetentionSchedule or None if policy doesn't apply
        """
        if not RetentionService.policy_applies_to_record(policy, record):
            return None

        # Get trigger date
        trigger_date = RetentionService.get_trigger_date(policy, record)

        # Calculate dates
        dates = RetentionService.calculate_retention_dates(policy, trigger_date)

        # Determine record type
        if isinstance(record, Document):
            record_type = RetentionSchedule.RecordType.DOCUMENT
        else:
            record_type = RetentionSchedule.RecordType.CORRESPONDENCE

        # Create or update retention schedule
        schedule, created = RetentionSchedule.objects.update_or_create(
            record_type=record_type,
            record_id=record.id,
            policy=policy,
            defaults={
                "retention_start_date": dates["retention_start_date"],
                "retention_end_date": dates["retention_end_date"],
                "disposition_date": dates["disposition_date"],
                "is_active": True,
            },
        )

        logger.info(
            f"Applied retention policy {policy.name} to {record_type} {record.id}"
        )

        return schedule

    @staticmethod
    def get_applicable_policies(record: Document | Correspondence) -> List[RetentionPolicy]:
        """
        Get all active retention policies that apply to a record.

        Args:
            record: Document or Correspondence instance

        Returns:
            List of applicable RetentionPolicy instances
        """
        policies = RetentionPolicy.objects.filter(is_active=True)

        applicable = []
        for policy in policies:
            if RetentionService.policy_applies_to_record(policy, record):
                applicable.append(policy)

        return applicable


class LegalHoldService:
    """Service for managing legal holds."""

    @staticmethod
    def check_legal_hold(record: Document | Correspondence) -> List[LegalHold]:
        """
        Check if a record is subject to any active legal holds.

        Args:
            record: Document or Correspondence instance

        Returns:
            List of active LegalHold instances
        """
        if isinstance(record, Document):
            holds = record.legal_holds.filter(is_active=True)
        else:
            holds = record.legal_holds.filter(is_active=True)

        # Filter by date range
        now = timezone.now()
        active_holds = []
        for hold in holds:
            if hold.is_currently_active():
                active_holds.append(hold)

        return active_holds

    @staticmethod
    def can_delete(record: Document | Correspondence) -> bool:
        """
        Check if a record can be deleted (not on legal hold).

        Args:
            record: Document or Correspondence instance

        Returns:
            True if record can be deleted
        """
        holds = LegalHoldService.check_legal_hold(record)
        return len(holds) == 0

    @staticmethod
    def can_archive(record: Document | Correspondence) -> bool:
        """
        Check if a record can be archived (not on legal hold).

        Args:
            record: Document or Correspondence instance

        Returns:
            True if record can be archived
        """
        holds = LegalHoldService.check_legal_hold(record)
        return len(holds) == 0


class DispositionService:
    """Service for managing disposition workflows."""

    @staticmethod
    @transaction.atomic
    def create_disposition_from_schedule(schedule: RetentionSchedule) -> Optional[Disposition]:
        """
        Create a disposition record from a retention schedule.

        Args:
            schedule: RetentionSchedule instance

        Returns:
            Created Disposition or None if blocked
        """
        # Check if disposition already exists
        existing = Disposition.objects.filter(
            record_type=schedule.record_type,
            record_id=schedule.record_id,
            policy=schedule.policy,
            status__in=[
                Disposition.DispositionStatus.PENDING,
                Disposition.DispositionStatus.SCHEDULED,
                Disposition.DispositionStatus.APPROVED,
            ],
        ).first()

        if existing:
            return existing

        # Check for legal holds
        if schedule.record_type == RetentionSchedule.RecordType.DOCUMENT:
            try:
                record = Document.objects.get(id=schedule.record_id)
            except Document.DoesNotExist:
                logger.warning(f"Document {schedule.record_id} not found for disposition")
                return None
        else:
            try:
                record = Correspondence.objects.get(id=schedule.record_id)
            except Correspondence.DoesNotExist:
                logger.warning(
                    f"Correspondence {schedule.record_id} not found for disposition"
                )
                return None

        legal_holds = LegalHoldService.check_legal_hold(record)

        # Create disposition
        disposition = Disposition.objects.create(
            record_type=schedule.record_type,
            record_id=schedule.record_id,
            policy=schedule.policy,
            action=schedule.policy.disposition_action,
            retention_start_date=schedule.retention_start_date,
            scheduled_date=schedule.disposition_date,
            requires_approval=schedule.policy.requires_approval,
            blocked_by_legal_hold=len(legal_holds) > 0,
            status=Disposition.DispositionStatus.BLOCKED
            if legal_holds
            else Disposition.DispositionStatus.SCHEDULED,
        )

        if legal_holds:
            disposition.blocking_legal_holds.set(legal_holds)

        # Mark schedule as having disposition created
        schedule.disposition_created = True
        schedule.save(update_fields=["disposition_created"])

        logger.info(
            f"Created disposition for {schedule.record_type} {schedule.record_id}"
        )

        return disposition

    @staticmethod
    @transaction.atomic
    def execute_disposition(disposition: Disposition, executed_by, notes: str = "") -> bool:
        """
        Execute a disposition action.

        Args:
            disposition: Disposition instance
            executed_by: User executing the disposition
            notes: Execution notes

        Returns:
            True if executed successfully
        """
        if not disposition.can_execute():
            logger.warning(f"Disposition {disposition.id} cannot be executed")
            return False

        # Get the record
        if disposition.record_type == Disposition.RecordType.DOCUMENT:
            try:
                record = Document.objects.get(id=disposition.record_id)
            except Document.DoesNotExist:
                logger.error(f"Document {disposition.record_id} not found")
                return False
        else:
            try:
                record = Correspondence.objects.get(id=disposition.record_id)
            except Correspondence.DoesNotExist:
                logger.error(f"Correspondence {disposition.record_id} not found")
                return False

        # Execute action
        if disposition.action == Disposition.DispositionAction.ARCHIVE:
            record.status = "archived" if hasattr(record, "status") else None
            record.save()
        elif disposition.action == Disposition.DispositionAction.DELETE:
            record.delete()  # Soft delete if SoftDeleteModel
        elif disposition.action == Disposition.DispositionAction.REVIEW:
            # Mark for review - no automatic action
            pass
        elif disposition.action == Disposition.DispositionAction.TRANSFER:
            # Transfer to archive - similar to archive
            record.status = "archived" if hasattr(record, "status") else None
            record.save()

        # Update disposition
        disposition.status = Disposition.DispositionStatus.COMPLETED
        disposition.executed_by = executed_by
        disposition.execution_notes = notes
        disposition.completed_date = timezone.now()
        disposition.save()

        logger.info(f"Executed disposition {disposition.id}")

        return True


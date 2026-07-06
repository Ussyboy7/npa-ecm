"""Records governance business logic."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from django.db.models import Q, QuerySet
from django.utils import timezone

from correspondence.models import Correspondence

from .models import DisposalRequest, LegalHold, RetentionSchedule


def correspondence_under_legal_hold(correspondence: Correspondence) -> bool:
    if getattr(correspondence, "is_on_legal_hold", False):
        return True
    return LegalHold.objects.filter(
        is_active=True,
        correspondence_items=correspondence,
    ).exists()


def assert_not_on_legal_hold(correspondence: Correspondence) -> None:
    from rest_framework.exceptions import ValidationError

    if correspondence_under_legal_hold(correspondence):
        raise ValidationError(
            {
                "detail": "This record is on legal hold and cannot be disposed.",
                "code": "legal_hold_active",
            }
        )


def find_retention_schedule(correspondence: Correspondence) -> Optional[RetentionSchedule]:
    if correspondence.retention_schedule_id:
        return correspondence.retention_schedule

    qs = RetentionSchedule.objects.filter(is_active=True).filter(
        Q(record_type=RetentionSchedule.RecordType.CORRESPONDENCE)
        | Q(record_type=RetentionSchedule.RecordType.ALL)
    )

    if correspondence.division_id:
        match = qs.filter(division_id=correspondence.division_id).first()
        if match:
            return match
        if correspondence.division and correspondence.division.directorate_id:
            match = qs.filter(directorate_id=correspondence.division.directorate_id).first()
            if match:
                return match

    if correspondence.archive_level:
        match = qs.filter(archive_level=correspondence.archive_level).first()
        if match:
            return match

    return qs.filter(division__isnull=True, directorate__isnull=True, archive_level="").first()


def calculate_disposal_due(correspondence: Correspondence) -> Optional[datetime]:
    schedule = find_retention_schedule(correspondence)
    if not schedule or not correspondence.archived_at:
        return None
    return correspondence.archived_at + timedelta(days=schedule.retention_days)


def sync_correspondence_legal_hold_flag(correspondence_id) -> None:
    active = LegalHold.objects.filter(
        is_active=True,
        correspondence_items__id=correspondence_id,
    ).exists()
    Correspondence.all_objects.filter(pk=correspondence_id).update(is_on_legal_hold=active)


def refresh_legal_hold_flags_for_hold(legal_hold: LegalHold) -> None:
    for corr_id in legal_hold.correspondence_items.values_list("id", flat=True):
        sync_correspondence_legal_hold_flag(corr_id)


def correspondence_due_for_disposal() -> QuerySet[Correspondence]:
    now = timezone.now()
    qs = Correspondence.objects.filter(
        status=Correspondence.Status.ARCHIVED,
        is_on_legal_hold=False,
        archived_at__isnull=False,
        disposed_at__isnull=True,
    )
    due_ids = []
    for corr in qs.iterator(chunk_size=200):
        due = calculate_disposal_due(corr)
        if due and due <= now:
            due_ids.append(corr.id)
    return Correspondence.objects.filter(id__in=due_ids)


def complete_disposal(disposal: DisposalRequest, reviewer) -> DisposalRequest:
    disposal.status = DisposalRequest.Status.COMPLETED
    disposal.reviewed_by = reviewer
    disposal.reviewed_at = timezone.now()
    disposal.completed_at = timezone.now()
    disposal.save(
        update_fields=["status", "reviewed_by", "reviewed_at", "completed_at", "updated_at"]
    )

    if disposal.correspondence_id:
        corr = disposal.correspondence
        corr.disposed_at = timezone.now()
        corr.is_deleted = True
        corr.save(update_fields=["disposed_at", "is_deleted", "updated_at"])

    return disposal

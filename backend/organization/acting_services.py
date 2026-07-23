"""Office acting appointment: appoint, reassign seat, reclaim, expire."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from audit.services import AuditService
from notifications.models import Notification
from notifications.services import NotificationService

from .models import ActingAppointment, ActingRequest, Office, OfficeMembership
from .permission_utils import user_has_permission

User = get_user_model()
logger = logging.getLogger(__name__)


def get_active_appointment_for_office(office) -> Optional[ActingAppointment]:
    if office is None:
        return None
    office_id = getattr(office, "id", office)
    now = timezone.now()
    return (
        ActingAppointment.objects.filter(
            office_id=office_id,
            is_active=True,
            starts_at__lte=now,
        )
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now))
        .select_related("acting_user", "principal", "office")
        .order_by("-starts_at")
        .first()
    )


def get_active_appointments_for_acting_user(user) -> list[ActingAppointment]:
    now = timezone.now()
    return list(
        ActingAppointment.objects.filter(
            acting_user=user,
            is_active=True,
            starts_at__lte=now,
        )
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now))
        .select_related("acting_user", "principal", "office")
        .order_by("-starts_at")
    )


def user_can_manage_acting(user, office: Optional[Office] = None, principal=None) -> bool:
    if getattr(user, "is_superuser", False):
        return True
    if user_has_permission(user, "can_manage_org_structure"):
        return True
    if user_has_permission(user, "can_manage_users"):
        return True
    if principal is not None and user.id == getattr(principal, "id", principal):
        return True
    if office is not None:
        return OfficeMembership.objects.filter(
            office=office,
            user=user,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
            is_active=True,
        ).exists()
    return False


def eligible_acting_candidates(office: Office, exclude_user=None):
    """Active office members eligible to act (excluding principal by default)."""
    qs = (
        OfficeMembership.objects.filter(office=office, is_active=True)
        .exclude(assignment_role=OfficeMembership.AssignmentRole.ACTING)
        .select_related("user")
        .order_by("-is_primary", "user__last_name", "user__first_name")
    )
    if exclude_user is not None:
        qs = qs.exclude(user_id=getattr(exclude_user, "id", exclude_user))
    seen = set()
    users = []
    for m in qs:
        if m.user_id in seen:
            continue
        seen.add(m.user_id)
        users.append(m.user)
    return users


def _open_seat_items_queryset(principal, office: Office):
    from correspondence.models import Correspondence

    return Correspondence.objects.filter(
        is_deleted=False,
        current_approver=principal,
    ).filter(
        Q(current_office=office) | Q(owning_office=office)
    ).exclude(
        status=Correspondence.Status.COMPLETED,
    )


def _ensure_acting_membership(office: Office, acting_user, starts_at, ends_at) -> OfficeMembership:
    membership, created = OfficeMembership.objects.get_or_create(
        office=office,
        user=acting_user,
        assignment_role=OfficeMembership.AssignmentRole.ACTING,
        defaults={
            "is_active": True,
            "can_route": True,
            "can_approve": True,
            "starts_at": starts_at.date() if hasattr(starts_at, "date") else starts_at,
            "ends_at": ends_at.date() if ends_at and hasattr(ends_at, "date") else ends_at,
        },
    )
    if not created:
        membership.is_active = True
        membership.can_route = True
        membership.can_approve = True
        if starts_at:
            membership.starts_at = starts_at.date() if hasattr(starts_at, "date") else starts_at
        if ends_at:
            membership.ends_at = ends_at.date() if hasattr(ends_at, "date") else ends_at
        membership.save(
            update_fields=[
                "is_active",
                "can_route",
                "can_approve",
                "starts_at",
                "ends_at",
                "updated_at",
            ]
        )
    return membership


def _transfer_seat_items(appointment: ActingAppointment) -> int:
    from correspondence.models import Correspondence

    qs = _open_seat_items_queryset(appointment.principal, appointment.office)
    ids = list(qs.values_list("id", flat=True))
    if not ids:
        return 0
    updated = Correspondence.objects.filter(id__in=ids).update(
        current_approver=appointment.acting_user,
        acting_appointment=appointment,
        acting_original_approver=appointment.principal,
        updated_at=timezone.now(),
    )
    return updated


def _reclaim_seat_items(appointment: ActingAppointment) -> int:
    from correspondence.models import Correspondence

    qs = Correspondence.objects.filter(
        is_deleted=False,
        acting_appointment=appointment,
        current_approver=appointment.acting_user,
    ).exclude(status=Correspondence.Status.COMPLETED)
    ids = list(qs.values_list("id", flat=True))
    if not ids:
        return 0
    updated = Correspondence.objects.filter(id__in=ids).update(
        current_approver=appointment.principal,
        acting_appointment=None,
        acting_original_approver=None,
        updated_at=timezone.now(),
    )
    return updated


def apply_acting_markers_if_needed(correspondence, recipient_user, office=None) -> bool:
    """Tag a newly routed item when it lands on an active acting seat."""
    target_office = office or getattr(correspondence, "current_office", None)
    appointment = get_active_appointment_for_office(target_office)
    if not appointment or recipient_user is None:
        return False
    if recipient_user.id != appointment.acting_user_id:
        return False
    correspondence.acting_appointment = appointment
    correspondence.acting_original_approver = appointment.principal
    return True


@transaction.atomic
def appoint_acting(
    *,
    office: Office,
    principal,
    acting_user,
    appointed_by,
    starts_at: Optional[datetime] = None,
    ends_at: Optional[datetime] = None,
    reason: str = "",
) -> ActingAppointment:
    if principal.id == acting_user.id:
        raise ValidationError({"acting_user": "Acting officer cannot be the same as the principal."})

    if not user_can_manage_acting(appointed_by, office=office, principal=principal):
        raise PermissionDenied("You do not have permission to create an acting appointment.")

    if not OfficeMembership.objects.filter(office=office, user=acting_user, is_active=True).exists():
        raise ValidationError(
            {"acting_user": "Acting officer must be an active member of this office."}
        )

    existing = ActingAppointment.objects.filter(office=office, is_active=True).first()
    if existing:
        raise ValidationError(
            {
                "office": (
                    f"Office already has an active acting appointment "
                    f"({existing.acting_user.get_full_name() or existing.acting_user.username}). "
                    "End it before creating another."
                )
            }
        )

    now = timezone.now()
    starts = starts_at or now
    if ends_at and ends_at <= starts:
        raise ValidationError({"ends_at": "End date must be after the start date."})

    membership = _ensure_acting_membership(office, acting_user, starts, ends_at)

    appointment = ActingAppointment.objects.create(
        office=office,
        principal=principal,
        acting_user=acting_user,
        starts_at=starts,
        ends_at=ends_at,
        is_active=True,
        reason=reason or "",
        appointed_by=appointed_by,
        membership=membership,
    )

    transferred = 0
    transfer_applied = starts <= now
    if transfer_applied:
        transferred = _transfer_seat_items(appointment)
        appointment.items_transferred = transferred
        appointment.transfer_applied = True
        appointment.save(update_fields=["items_transferred", "transfer_applied", "updated_at"])

    AuditService.log_activity(
        user=appointed_by,
        action="system_config_changed",
        object_type="ActingAppointment",
        object_id=str(appointment.id),
        object_repr=str(appointment),
        module="organization",
        description=(
            f"Appointed {acting_user.get_full_name() or acting_user.username} "
            f"as acting for {principal.get_full_name() or principal.username} "
            f"at {office.name} ({transferred} items transferred)"
        ),
        metadata={
            "office_id": str(office.id),
            "principal_id": str(principal.id),
            "acting_user_id": str(acting_user.id),
            "items_transferred": transferred,
            "starts_at": starts.isoformat(),
            "ends_at": ends_at.isoformat() if ends_at else None,
            "reason": reason,
        },
    )

    office_name = office.name
    principal_name = principal.get_full_name() or principal.username
    acting_name = acting_user.get_full_name() or acting_user.username
    end_label = ends_at.strftime("%d %b %Y") if ends_at else "further notice"

    NotificationService.create_notification(
        recipient=acting_user,
        title=f"Acting appointment — {office_name}",
        message=(
            f"You have been appointed acting for {principal_name} at {office_name} "
            f"until {end_label}. {transferred} open seat item(s) were moved to your My Inbox."
        ),
        notification_type=Notification.NotificationType.SYSTEM,
        priority=Notification.Priority.HIGH,
        sender=appointed_by,
        module="organization",
        related_object_type="ActingAppointment",
        related_object_id=str(appointment.id),
        action_url="/inbox",
        action_required=True,
    )
    if principal.id != appointed_by.id:
        NotificationService.create_notification(
            recipient=principal,
            title=f"Acting officer appointed — {office_name}",
            message=(
                f"{acting_name} is now acting for your seat at {office_name} until {end_label}."
            ),
            notification_type=Notification.NotificationType.SYSTEM,
            priority=Notification.Priority.NORMAL,
            sender=appointed_by,
            module="organization",
            related_object_type="ActingAppointment",
            related_object_id=str(appointment.id),
            action_url="/admin/acting-appointments",
        )

    logger.info(
        "Acting appointment %s created: %s → %s @ %s (%s items)",
        appointment.id,
        principal_name,
        acting_name,
        office_name,
        transferred,
    )
    mark_acting_requests_fulfilled(appointment, resolved_by=appointed_by)
    return appointment


@transaction.atomic
def end_acting(
    appointment: ActingAppointment,
    *,
    ended_by=None,
    reason: str = "",
) -> ActingAppointment:
    if not appointment.is_active:
        return appointment

    if ended_by is not None and not user_can_manage_acting(
        ended_by, office=appointment.office, principal=appointment.principal
    ):
        raise PermissionDenied("You do not have permission to end this acting appointment.")

    reclaimed = _reclaim_seat_items(appointment)

    if appointment.membership_id:
        OfficeMembership.objects.filter(id=appointment.membership_id).update(
            is_active=False,
            updated_at=timezone.now(),
        )

    appointment.is_active = False
    appointment.ended_at = timezone.now()
    appointment.ended_by = ended_by
    appointment.items_reclaimed = reclaimed
    if reason:
        appointment.reason = (
            f"{appointment.reason}\n[Ended] {reason}".strip()
            if appointment.reason
            else f"[Ended] {reason}"
        )
    appointment.save(
        update_fields=[
            "is_active",
            "ended_at",
            "ended_by",
            "items_reclaimed",
            "reason",
            "updated_at",
        ]
    )

    AuditService.log_activity(
        user=ended_by,
        action="system_config_changed",
        object_type="ActingAppointment",
        object_id=str(appointment.id),
        object_repr=str(appointment),
        module="organization",
        description=(
            f"Ended acting appointment for {appointment.office.name}: "
            f"{reclaimed} open item(s) returned to principal"
        ),
        metadata={
            "office_id": str(appointment.office_id),
            "principal_id": str(appointment.principal_id),
            "acting_user_id": str(appointment.acting_user_id),
            "items_reclaimed": reclaimed,
            "reason": reason,
        },
    )

    office_name = appointment.office.name
    principal_name = appointment.principal.get_full_name() or appointment.principal.username
    acting_name = appointment.acting_user.get_full_name() or appointment.acting_user.username

    NotificationService.create_notification(
        recipient=appointment.acting_user,
        title=f"Acting appointment ended — {office_name}",
        message=(
            f"Your acting appointment for {principal_name} at {office_name} has ended. "
            f"{reclaimed} remaining open item(s) were returned to the principal."
        ),
        notification_type=Notification.NotificationType.SYSTEM,
        priority=Notification.Priority.NORMAL,
        sender=ended_by,
        module="organization",
        related_object_type="ActingAppointment",
        related_object_id=str(appointment.id),
        action_url="/inbox",
    )
    NotificationService.create_notification(
        recipient=appointment.principal,
        title=f"Seat returned — {office_name}",
        message=(
            f"Acting appointment for {acting_name} at {office_name} has ended. "
            f"{reclaimed} open item(s) are back in your My Inbox."
        ),
        notification_type=Notification.NotificationType.SYSTEM,
        priority=Notification.Priority.HIGH,
        sender=ended_by,
        module="organization",
        related_object_type="ActingAppointment",
        related_object_id=str(appointment.id),
        action_url="/inbox",
        action_required=True,
    )

    logger.info(
        "Acting appointment %s ended: reclaimed %s items to %s",
        appointment.id,
        reclaimed,
        principal_name,
    )
    return appointment


def expire_due_appointments() -> dict:
    """End appointments whose ends_at has passed. Intended for Celery beat."""
    now = timezone.now()
    due = list(
        ActingAppointment.objects.filter(is_active=True, ends_at__isnull=False, ends_at__lt=now)
        .select_related("office", "principal", "acting_user", "membership")
    )
    ended = 0
    for appointment in due:
        try:
            end_acting(appointment, ended_by=None, reason="Auto-ended on scheduled end date")
            ended += 1
        except Exception:
            logger.exception("Failed to expire acting appointment %s", appointment.id)
    return {"checked": len(due), "ended": ended}


def activate_due_transfers() -> dict:
    """Transfer seat items for appointments that just became effective (future starts_at)."""
    now = timezone.now()
    pending = list(
        ActingAppointment.objects.filter(
            is_active=True,
            transfer_applied=False,
            starts_at__lte=now,
        )
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now))
        .select_related("office", "principal", "acting_user")
    )
    activated = 0
    for appointment in pending:
        transferred = _transfer_seat_items(appointment)
        appointment.items_transferred = transferred
        appointment.transfer_applied = True
        appointment.save(update_fields=["items_transferred", "transfer_applied", "updated_at"])
        activated += 1
    return {"checked": len(pending), "activated": activated}


def user_is_office_member(user, office: Office) -> bool:
    return OfficeMembership.objects.filter(
        office=office, user=user, is_active=True
    ).exists()


def user_can_resolve_acting_requests(user) -> bool:
    if getattr(user, "is_superuser", False):
        return True
    return user_has_permission(user, "can_manage_org_structure") or user_has_permission(
        user, "can_manage_users"
    )


def _notify_acting_admins(*, title: str, message: str, sender, related_id: str, action_url: str):
    admins = User.objects.filter(is_active=True, is_superuser=True)
    for admin in admins:
        if sender is not None and admin.id == getattr(sender, "id", None):
            continue
        NotificationService.create_notification(
            recipient=admin,
            title=title,
            message=message,
            notification_type=Notification.NotificationType.SYSTEM,
            priority=Notification.Priority.HIGH,
            sender=sender,
            module="organization",
            related_object_type="ActingRequest",
            related_object_id=related_id,
            action_url=action_url,
            action_required=True,
        )


@transaction.atomic
def create_acting_request(
    *,
    office: Office,
    requested_by,
    reason: str,
    principal=None,
    suggested_acting_user=None,
) -> ActingRequest:
    reason = (reason or "").strip()
    if not reason:
        raise ValidationError({"reason": "Please explain why an acting appointment is needed."})

    if not user_is_office_member(requested_by, office):
        raise PermissionDenied("Only members of this office can request an acting appointment.")

    if get_active_appointment_for_office(office):
        raise ValidationError(
            {"office": "This office already has an active acting appointment."}
        )

    if ActingRequest.objects.filter(office=office, status=ActingRequest.Status.PENDING).exists():
        raise ValidationError(
            {"office": "There is already a pending acting request for this office."}
        )

    if principal is None:
        principal_membership = (
            OfficeMembership.objects.filter(
                office=office,
                assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
                is_active=True,
            )
            .select_related("user")
            .first()
        )
        if not principal_membership:
            raise ValidationError({"principal": "No active principal found for this office."})
        principal = principal_membership.user

    if suggested_acting_user is not None:
        if suggested_acting_user.id == principal.id:
            raise ValidationError(
                {"suggested_acting_user": "Suggested acting officer cannot be the principal."}
            )
        if not user_is_office_member(suggested_acting_user, office):
            raise ValidationError(
                {"suggested_acting_user": "Suggested acting officer must be an office member."}
            )

    pending_count = _open_seat_items_queryset(principal, office).count()

    request_row = ActingRequest.objects.create(
        office=office,
        principal=principal,
        requested_by=requested_by,
        suggested_acting_user=suggested_acting_user,
        reason=reason,
        pending_item_count=pending_count,
        status=ActingRequest.Status.PENDING,
    )

    AuditService.log_activity(
        user=requested_by,
        action="system_config_changed",
        object_type="ActingRequest",
        object_id=str(request_row.id),
        object_repr=str(request_row),
        module="organization",
        description=(
            f"Acting appointment requested for {office.name} "
            f"({pending_count} open seat items)"
        ),
        metadata={
            "office_id": str(office.id),
            "principal_id": str(principal.id),
            "pending_item_count": pending_count,
            "reason": reason,
        },
    )

    principal_name = principal.get_full_name() or principal.username
    requester_name = requested_by.get_full_name() or requested_by.username
    _notify_acting_admins(
        title=f"Acting appointment requested — {office.name}",
        message=(
            f"{requester_name} requested an acting appointment for {principal_name} "
            f"at {office.name}. {pending_count} open seat item(s). Reason: {reason}"
        ),
        sender=requested_by,
        related_id=str(request_row.id),
        action_url="/admin/acting-appointments",
    )

    return request_row


@transaction.atomic
def dismiss_acting_request(
    request_row: ActingRequest,
    *,
    resolved_by,
    note: str = "",
) -> ActingRequest:
    if not user_can_resolve_acting_requests(resolved_by):
        raise PermissionDenied("You do not have permission to dismiss acting requests.")
    if request_row.status != ActingRequest.Status.PENDING:
        raise ValidationError({"status": "Only pending requests can be dismissed."})

    request_row.status = ActingRequest.Status.DISMISSED
    request_row.resolved_by = resolved_by
    request_row.resolved_at = timezone.now()
    request_row.resolution_note = note or ""
    request_row.save(
        update_fields=["status", "resolved_by", "resolved_at", "resolution_note", "updated_at"]
    )

    NotificationService.create_notification(
        recipient=request_row.requested_by,
        title=f"Acting request dismissed — {request_row.office.name}",
        message=note or "Your acting appointment request was reviewed and dismissed.",
        notification_type=Notification.NotificationType.SYSTEM,
        priority=Notification.Priority.NORMAL,
        sender=resolved_by,
        module="organization",
        related_object_type="ActingRequest",
        related_object_id=str(request_row.id),
        action_url="/acting",
    )
    return request_row


def mark_acting_requests_fulfilled(appointment: ActingAppointment, resolved_by=None) -> int:
    """Mark pending requests for this office as fulfilled when an appointment is created."""
    pending = list(
        ActingRequest.objects.filter(
            office=appointment.office,
            status=ActingRequest.Status.PENDING,
        )
    )
    if not pending:
        return 0
    now = timezone.now()
    for row in pending:
        row.status = ActingRequest.Status.FULFILLED
        row.resolved_by = resolved_by or appointment.appointed_by
        row.resolved_at = now
        row.appointment = appointment
        row.resolution_note = "Fulfilled by acting appointment"
        row.save(
            update_fields=[
                "status",
                "resolved_by",
                "resolved_at",
                "appointment",
                "resolution_note",
                "updated_at",
            ]
        )
        NotificationService.create_notification(
            recipient=row.requested_by,
            title=f"Acting appointment created — {appointment.office.name}",
            message=(
                f"{appointment.acting_user.get_full_name() or appointment.acting_user.username} "
                f"was appointed acting for "
                f"{appointment.principal.get_full_name() or appointment.principal.username}."
            ),
            notification_type=Notification.NotificationType.SYSTEM,
            priority=Notification.Priority.NORMAL,
            sender=resolved_by or appointment.appointed_by,
            module="organization",
            related_object_type="ActingAppointment",
            related_object_id=str(appointment.id),
            action_url="/acting",
        )
    return len(pending)


def return_item_to_principal(correspondence, *, returned_by, reason: str = "") -> dict:
    """Manually return a single acting-seat item to the original principal."""
    from correspondence.models import Correspondence

    if correspondence.status == Correspondence.Status.COMPLETED:
        raise ValidationError({"detail": "Completed correspondence cannot be returned."})

    appointment = correspondence.acting_appointment
    original = correspondence.acting_original_approver
    if not appointment and not original:
        raise ValidationError(
            {"detail": "This item is not tagged as an acting seat transfer."}
        )

    principal = original or (appointment.principal if appointment else None)
    if principal is None:
        raise ValidationError({"detail": "Original principal could not be determined."})

    can_return = (
        user_can_resolve_acting_requests(returned_by)
        or (appointment and returned_by.id == appointment.acting_user_id)
        or (appointment and returned_by.id == appointment.principal_id)
        or returned_by.id == principal.id
        or (appointment and user_can_manage_acting(returned_by, office=appointment.office, principal=principal))
    )
    if not can_return:
        raise PermissionDenied("You do not have permission to return this item to the principal.")

    previous_approver_id = correspondence.current_approver_id
    correspondence.current_approver = principal
    correspondence.acting_appointment = None
    correspondence.acting_original_approver = None
    correspondence.save(
        update_fields=[
            "current_approver",
            "acting_appointment",
            "acting_original_approver",
            "updated_at",
        ]
    )

    AuditService.log_activity(
        user=returned_by,
        action="correspondence_routed",
        object_type="Correspondence",
        object_id=str(correspondence.id),
        object_repr=correspondence.reference_number or str(correspondence.id),
        module="correspondence",
        description="Returned acting-seat item to principal",
        metadata={
            "reason": reason,
            "previous_approver": str(previous_approver_id) if previous_approver_id else None,
            "principal_id": str(principal.id),
            "appointment_id": str(appointment.id) if appointment else None,
        },
    )

    NotificationService.create_notification(
        recipient=principal,
        title=f"Item returned — {correspondence.reference_number}",
        message=(
            f"{returned_by.get_full_name() or returned_by.username} returned "
            f"{correspondence.reference_number} to your My Inbox."
            + (f" Reason: {reason}" if reason else "")
        ),
        notification_type=Notification.NotificationType.CORRESPONDENCE,
        priority=Notification.Priority.NORMAL,
        sender=returned_by,
        module="correspondence",
        related_object_type="correspondence",
        related_object_id=str(correspondence.id),
        action_url=f"/correspondence/{correspondence.id}",
        action_required=True,
    )

    return {
        "id": str(correspondence.id),
        "current_approver_id": str(principal.id),
        "returned": True,
    }


"""Escalate overdue parallel branches (non-response handling).

Flags / notifies branches that have passed their ``response_deadline`` and,
optionally, force-completes branches that are far beyond their deadline.

Examples
--------
    # Dry run: report overdue branches without notifying
    python manage.py escalate_parallel_branches --dry-run

    # Send escalation notices for branches past their deadline
    python manage.py escalate_parallel_branches

    # Also force-complete branches older than 3x their SLA deadline
    python manage.py escalate_parallel_branches --auto-force --grace-multiplier 3
"""
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from correspondence.models import Correspondence, Minute, ParallelRoutingGroup
from organization.models import OfficeMembership
from notifications.models import Notification
from notifications.services import NotificationService


def _branch_status(minute, member_ids, now, completed_states):
    if minute.branch_completed_at:
        return "force_completed"
    if minute.id in completed_states:
        return "completed"
    if minute.response_deadline and minute.response_deadline < now:
        return "overdue"
    return "pending"


class Command(BaseCommand):
    help = "Escalate overdue parallel branches (non-response handling)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would happen without sending notifications or force-completing.",
        )
        parser.add_argument(
            "--auto-force",
            action="store_true",
            help="Force-complete branches past the grace deadline.",
        )
        parser.add_argument(
            "--grace-multiplier",
            type=float,
            default=3.0,
            help="Force-complete once past grace_multiplier * (deadline - created_at).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        auto_force = options["auto_force"]
        grace_multiplier = options["grace_multiplier"]
        now = timezone.now()

        # In-flight parallel groups (not yet merged).
        groups = ParallelRoutingGroup.objects.filter(
            is_complete=False,
            correspondence__status__in=[
                Correspondence.Status.PENDING,
                Correspondence.Status.IN_PROGRESS,
            ],
        ).select_related("correspondence", "created_by")

        escalated = 0
        force_completed = 0

        for group in groups:
            correspondence = group.correspondence
            minutes = (
                Minute.objects.filter(
                    parallel_group_id=group.id, is_parallel_branch=True
                )
                .select_related("to_office", "to_user", "branch_originator")
                .order_by("timestamp")
            )

            # Resolve top-level branches (one per distinct target).
            top_level = []
            seen = set()
            for m in minutes:
                target = m.to_office_id or m.to_user_id
                if not target or target in seen:
                    continue
                seen.add(target)
                top_level.append(m)

            # Determine which branches are already completed.
            completed_states = set()
            for minute in top_level:
                if minute.to_user_id:
                    acted = Minute.objects.filter(
                        correspondence=correspondence,
                        user_id=minute.to_user_id,
                        timestamp__gt=minute.timestamp,
                    ).exists()
                    if acted:
                        completed_states.add(minute.id)
                elif minute.to_office_id:
                    member_ids = list(
                        OfficeMembership.objects.filter(
                            office=minute.to_office, is_active=True
                        ).values_list("user_id", flat=True)
                    )
                    if member_ids and Minute.objects.filter(
                        correspondence=correspondence,
                        user_id__in=member_ids,
                        timestamp__gt=minute.timestamp,
                    ).exists():
                        completed_states.add(minute.id)

            for minute in top_level:
                status = _branch_status(minute, None, now, completed_states)
                if status in ("completed", "force_completed"):
                    continue
                if status != "overdue":
                    continue

                escalated += 1
                ref = correspondence.reference_number or str(correspondence.id)
                target_label = (
                    minute.to_office.name
                    if minute.to_office
                    else (minute.to_user.get_full_name() if minute.to_user else "Unknown")
                )
                message = (
                    f"Escalation: parallel branch to {target_label} for {correspondence.subject} "
                    f"({ref}) is overdue (deadline {minute.response_deadline})."
                )

                # Notify branch originator (office principal) + owning office head.
                notify_users = set()
                if minute.branch_originator_id:
                    notify_users.add(minute.branch_originator_id)
                if correspondence.owning_office_id:
                    head = OfficeMembership.objects.filter(
                        office_id=correspondence.owning_office_id,
                        assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
                        is_active=True,
                    ).values_list("user_id", flat=True).first()
                    if head:
                        notify_users.add(head)

                if dry_run:
                    self.stdout.write(
                        f"[dry-run] Would escalate branch {minute.id} -> {target_label} "
                        f"(notify {sorted(notify_users)})"
                    )
                else:
                    for uid in notify_users:
                        from accounts.models import User as _User

                        recipient = _User.objects.filter(id=uid).first()
                        if not recipient:
                            continue
                        NotificationService.create_notification(
                            recipient=recipient,
                            title=f"Overdue branch — {ref}",
                            message=message,
                            notification_type=Notification.NotificationType.CORRESPONDENCE,
                            priority=Notification.Priority.HIGH,
                            sender=group.created_by,
                            module="correspondence",
                            related_object_type="correspondence",
                            related_object_id=str(correspondence.id),
                            action_url=f"/correspondence/{correspondence.id}",
                            action_required=True,
                        )

                # Auto force-complete if far beyond deadline.
                if auto_force and minute.response_deadline:
                    created = minute.created_at or minute.timestamp
                    grace_cutoff = minute.response_deadline + (
                        minute.response_deadline - created
                    ) * max(0.0, grace_multiplier - 1.0)
                    if now >= grace_cutoff:
                        force_completed += 1
                        if not dry_run:
                            minute.branch_completed_at = now
                            minute.save(update_fields=["branch_completed_at"])
                            group.check_and_update_completion()

        verb = "Would escalate" if dry_run else "Escalated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{verb} {escalated} overdue branch(es); force-completed {force_completed}."
            )
        )

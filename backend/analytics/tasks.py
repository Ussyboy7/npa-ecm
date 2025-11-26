"""
Celery tasks for analytics and escalation processing.

These tasks handle:
- SLA monitoring and breach detection
- Escalation rule evaluation and triggering
- Performance snapshot generation
- Email notifications (when configured)
"""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.template import Context, Template
from django.utils import timezone

logger = logging.getLogger(__name__)


# =============================================================================
# Escalation Engine Tasks
# =============================================================================


@shared_task(name="analytics.check_sla_and_escalate")
def check_sla_and_escalate() -> dict[str, Any]:
    """
    Main escalation engine task.
    Runs periodically to check for SLA breaches and trigger escalations.
    
    Returns:
        Summary of escalations triggered
    """
    from correspondence.models import Correspondence
    from .models import Escalation, EscalationRule, SLAConfiguration
    
    now = timezone.now()
    results = {
        "checked": 0,
        "sla_warnings": 0,
        "sla_breaches": 0,
        "escalations_created": 0,
        "notifications_sent": 0,
        "errors": [],
    }
    
    # Get active escalation rules
    active_rules = list(EscalationRule.objects.filter(is_active=True).order_by("priority_order"))
    
    if not active_rules:
        logger.info("No active escalation rules found")
        return results
    
    # Get pending correspondence items
    pending_items = Correspondence.objects.filter(
        status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS],
        is_deleted=False,
    ).select_related("division", "current_approver")
    
    for item in pending_items:
        results["checked"] += 1
        
        try:
            # Get SLA target for this item
            sla_config = SLAConfiguration.get_sla_for_correspondence(
                item.priority,
                division_id=str(item.division_id) if item.division_id else None,
            )
            
            if not sla_config:
                # Use default SLA
                target_days = SLAConfiguration.get_default_sla_targets().get(item.priority, 5)
                warning_threshold = 0.75
                critical_threshold = 0.90
            else:
                target_days = sla_config.target_days
                warning_threshold = sla_config.warning_threshold_percent / 100
                critical_threshold = sla_config.critical_threshold_percent / 100
            
            # Calculate days open
            if not item.received_date:
                continue
            
            days_open = (now.date() - item.received_date).days
            
            # Determine SLA status
            sla_status = None
            if days_open > target_days:
                sla_status = "breach"
                results["sla_breaches"] += 1
            elif days_open >= target_days * critical_threshold:
                sla_status = "critical"
            elif days_open >= target_days * warning_threshold:
                sla_status = "warning"
                results["sla_warnings"] += 1
            
            if not sla_status:
                continue
            
            # Check each rule for matches
            for rule in active_rules:
                # Check if this rule type matches the SLA status
                trigger_matches = False
                if rule.trigger_type == "sla_warning" and sla_status == "warning":
                    trigger_matches = True
                elif rule.trigger_type == "sla_breach" and sla_status == "breach":
                    trigger_matches = True
                elif rule.trigger_type == "sla_critical" and sla_status == "critical":
                    trigger_matches = True
                elif rule.trigger_type == "priority_urgent" and item.priority == Correspondence.Priority.URGENT:
                    trigger_matches = True
                
                if not trigger_matches:
                    continue
                
                # Check if rule matches correspondence filters
                if not rule.matches_correspondence(item):
                    continue
                
                # Check cooldown
                recent_escalation = Escalation.objects.filter(
                    correspondence=item,
                    rule=rule,
                    triggered_at__gte=now - timedelta(hours=rule.cooldown_hours),
                ).exists()
                
                if recent_escalation:
                    continue
                
                # Create escalation
                escalation = _create_escalation(item, rule, sla_status, days_open, target_days)
                results["escalations_created"] += 1
                
                # Execute action
                notification_sent = _execute_escalation_action(escalation, item, rule)
                if notification_sent:
                    results["notifications_sent"] += 1
                
        except Exception as e:
            logger.error(f"Error processing item {item.id}: {e}")
            results["errors"].append(str(e))
    
    logger.info(f"Escalation check complete: {results}")
    return results


def _create_escalation(correspondence, rule, sla_status: str, days_open: int, target_days: int):
    """Create an escalation record."""
    from .models import Escalation
    
    trigger_reason = f"{sla_status.upper()}: Item has been pending for {days_open} days (SLA target: {target_days} days)"
    
    escalation = Escalation.objects.create(
        correspondence=correspondence,
        rule=rule,
        trigger_reason=trigger_reason,
        action_taken=rule.action_type,
        status=Escalation.Status.PENDING,
    )
    
    return escalation


def _execute_escalation_action(escalation, correspondence, rule) -> bool:
    """
    Execute the action defined in the escalation rule.
    Returns True if notification was sent.
    """
    from .models import Escalation
    
    try:
        if rule.action_type == "notification":
            # In-app notification (handled by frontend polling)
            escalation.status = Escalation.Status.SENT
            escalation.save(update_fields=["status", "updated_at"])
            return True
        
        elif rule.action_type.startswith("email"):
            # Email notification
            recipients = _get_email_recipients(correspondence, rule)
            if recipients:
                _send_escalation_email(escalation, correspondence, rule, recipients)
                escalation.notified_emails = recipients
                escalation.status = Escalation.Status.SENT
                escalation.save(update_fields=["notified_emails", "status", "updated_at"])
                return True
        
        elif rule.action_type == "auto_escalate":
            # Auto-escalate to manager (future implementation)
            escalation.status = Escalation.Status.SENT
            escalation.action_details = {"auto_escalated": True}
            escalation.save(update_fields=["status", "action_details", "updated_at"])
            return True
        
        elif rule.action_type == "daily_digest":
            # Mark for inclusion in daily digest
            escalation.status = Escalation.Status.PENDING
            escalation.action_details = {"include_in_digest": True}
            escalation.save(update_fields=["action_details", "updated_at"])
            return False
        
    except Exception as e:
        logger.error(f"Failed to execute escalation action: {e}")
        escalation.status = Escalation.Status.FAILED
        escalation.error_message = str(e)
        escalation.save(update_fields=["status", "error_message", "updated_at"])
    
    return False


def _get_email_recipients(correspondence, rule) -> list[str]:
    """Get email recipients based on action type."""
    recipients = []
    
    if rule.action_type == "email_assignee":
        if correspondence.current_approver and correspondence.current_approver.email:
            recipients.append(correspondence.current_approver.email)
    
    elif rule.action_type == "email_manager":
        # Get manager from user profile (if implemented)
        if correspondence.current_approver:
            manager = getattr(correspondence.current_approver, "manager", None)
            if manager and manager.email:
                recipients.append(manager.email)
    
    elif rule.action_type == "email_division_head":
        # Get division head
        if correspondence.division:
            head = getattr(correspondence.division, "head", None)
            if head and head.email:
                recipients.append(head.email)
    
    elif rule.action_type == "email_custom":
        # Get custom recipients from action_config
        custom_recipients = rule.action_config.get("recipients", [])
        recipients.extend(custom_recipients)
    
    return list(set(recipients))  # Remove duplicates


def _send_escalation_email(escalation, correspondence, rule, recipients: list[str]):
    """Send escalation email notification."""
    # Prepare template context
    context = {
        "priority": correspondence.priority,
        "subject": correspondence.subject,
        "reference": correspondence.reference_number,
        "days_pending": (timezone.now().date() - correspondence.received_date).days if correspondence.received_date else 0,
        "sla_target": "N/A",  # Would be populated from SLA config
        "link": f"{settings.FRONTEND_URL}/correspondence/{correspondence.id}",
    }
    
    # Render subject
    subject_template = Template(rule.email_subject_template or "[{priority}] SLA Alert: {subject}")
    subject = subject_template.render(Context(context))
    
    # Render body
    if rule.email_body_template:
        body_template = Template(rule.email_body_template)
        body = body_template.render(Context(context))
    else:
        body = f"""
        <p>An SLA alert has been triggered for the following correspondence:</p>
        <ul>
            <li><strong>Reference:</strong> {context['reference']}</li>
            <li><strong>Subject:</strong> {context['subject']}</li>
            <li><strong>Priority:</strong> {context['priority']}</li>
            <li><strong>Days Pending:</strong> {context['days_pending']}</li>
        </ul>
        <p><a href="{context['link']}">View Correspondence</a></p>
        """
    
    # Send email
    try:
        send_mail(
            subject=subject,
            message="",  # Plain text version
            html_message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=False,
        )
        logger.info(f"Sent escalation email to {recipients}")
    except Exception as e:
        logger.error(f"Failed to send escalation email: {e}")
        raise


# =============================================================================
# Performance Snapshot Tasks
# =============================================================================


@shared_task(name="analytics.generate_daily_snapshots")
def generate_daily_snapshots() -> dict[str, Any]:
    """
    Generate daily performance snapshots for all divisions.
    Should run once per day (e.g., at midnight).
    """
    from correspondence.models import Correspondence
    from organization.models import Division
    from .models import DivisionPerformanceSnapshot, SLAConfiguration
    from .services import AnalyticsService
    
    today = timezone.now().date()
    results = {"divisions_processed": 0, "snapshots_created": 0, "errors": []}
    
    # Get all divisions
    divisions = Division.objects.filter(is_active=True)
    sla_targets = SLAConfiguration.get_default_sla_targets()
    
    for division in divisions:
        try:
            # Get correspondence for this division
            items = Correspondence.objects.filter(
                division=division,
                is_deleted=False,
            )
            
            total_items = items.count()
            completed_items = items.filter(status=Correspondence.Status.COMPLETED).count()
            pending_items = items.filter(status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS]).count()
            new_items = items.filter(received_date=today).count()
            
            # SLA metrics
            sla_compliant = 0
            sla_breached = 0
            sla_at_risk = 0
            turnaround_values = []
            
            now = timezone.now()
            for item in items:
                target = sla_targets.get(item.priority, 5)
                days = AnalyticsService._turnaround_days(item, now)
                
                if item.status == Correspondence.Status.COMPLETED:
                    turnaround_values.append(days)
                    if days <= target:
                        sla_compliant += 1
                    else:
                        sla_breached += 1
                else:
                    if days > target:
                        sla_breached += 1
                    elif days >= target * 0.75:
                        sla_at_risk += 1
                    else:
                        sla_compliant += 1
            
            # Calculate turnaround percentiles
            if turnaround_values:
                sorted_values = sorted(turnaround_values)
                n = len(sorted_values)
                avg_turnaround = sum(sorted_values) / n
                min_turnaround = sorted_values[0]
                max_turnaround = sorted_values[-1]
                p50_turnaround = sorted_values[int(n * 0.5)]
                p90_turnaround = sorted_values[min(int(n * 0.9), n - 1)]
            else:
                avg_turnaround = min_turnaround = max_turnaround = p50_turnaround = p90_turnaround = 0.0
            
            # Calculate efficiency
            sla_compliance_rate = (sla_compliant / total_items) * 100 if total_items else 0.0
            efficiency_score = (sla_compliance_rate / (avg_turnaround or 1)) * 10 if sla_compliance_rate else 0.0
            throughput = completed_items / 30  # Items per day over 30 days
            
            # Priority breakdown
            urgent_count = items.filter(priority=Correspondence.Priority.URGENT).count()
            high_count = items.filter(priority=Correspondence.Priority.HIGH).count()
            medium_count = items.filter(priority=Correspondence.Priority.MEDIUM).count()
            low_count = items.filter(priority=Correspondence.Priority.LOW).count()
            
            # Create or update snapshot
            snapshot, created = DivisionPerformanceSnapshot.objects.update_or_create(
                division=division,
                snapshot_date=today,
                defaults={
                    "total_items": total_items,
                    "completed_items": completed_items,
                    "pending_items": pending_items,
                    "new_items": new_items,
                    "sla_compliant": sla_compliant,
                    "sla_breached": sla_breached,
                    "sla_at_risk": sla_at_risk,
                    "sla_compliance_rate": round(sla_compliance_rate, 2),
                    "avg_turnaround_days": round(avg_turnaround, 2),
                    "min_turnaround_days": round(min_turnaround, 2),
                    "max_turnaround_days": round(max_turnaround, 2),
                    "p50_turnaround_days": round(p50_turnaround, 2),
                    "p90_turnaround_days": round(p90_turnaround, 2),
                    "efficiency_score": round(efficiency_score, 2),
                    "throughput": round(throughput, 2),
                    "urgent_count": urgent_count,
                    "high_count": high_count,
                    "medium_count": medium_count,
                    "low_count": low_count,
                },
            )
            
            results["divisions_processed"] += 1
            if created:
                results["snapshots_created"] += 1
                
        except Exception as e:
            logger.error(f"Error generating snapshot for division {division.id}: {e}")
            results["errors"].append(f"{division.name}: {str(e)}")
    
    logger.info(f"Daily snapshots generated: {results}")
    return results


@shared_task(name="analytics.generate_weekly_staff_snapshots")
def generate_weekly_staff_snapshots() -> dict[str, Any]:
    """
    Generate weekly performance snapshots for all staff.
    Should run once per week (e.g., Sunday midnight).
    """
    from accounts.models import User
    from correspondence.models import Correspondence, Minute
    from .models import StaffPerformanceSnapshot, SLAConfiguration
    
    now = timezone.now()
    week_end = now.date()
    week_start = week_end - timedelta(days=7)
    
    results = {"staff_processed": 0, "snapshots_created": 0, "errors": []}
    
    # Get all active users
    users = User.objects.filter(is_active=True)
    sla_targets = SLAConfiguration.get_default_sla_targets()
    
    for user in users:
        try:
            # Get minutes where this user acted
            user_minutes = Minute.objects.filter(
                author=user,
                timestamp__date__gte=week_start,
                timestamp__date__lte=week_end,
            ).select_related("correspondence")
            
            items_handled = user_minutes.values("correspondence").distinct().count()
            
            # Get correspondence where user is current approver and was completed this week
            completed_items = Correspondence.objects.filter(
                current_approver=user,
                status=Correspondence.Status.COMPLETED,
                completed_at__date__gte=week_start,
                completed_at__date__lte=week_end,
            ).count()
            
            # Get forwarded and returned items
            forwarded = user_minutes.filter(action_type="forward").count()
            returned = user_minutes.filter(action_type="return").count()
            
            # SLA metrics
            sla_breaches = 0
            total_for_sla = 0
            
            for minute in user_minutes:
                corr = minute.correspondence
                target = sla_targets.get(corr.priority, 5)
                if corr.received_date:
                    days = (minute.timestamp.date() - corr.received_date).days
                    total_for_sla += 1
                    if days > target:
                        sla_breaches += 1
            
            sla_compliance_rate = ((total_for_sla - sla_breaches) / total_for_sla) * 100 if total_for_sla else 100.0
            
            # Create snapshot
            snapshot, created = StaffPerformanceSnapshot.objects.update_or_create(
                user=user,
                week_start=week_start,
                defaults={
                    "week_end": week_end,
                    "items_handled": items_handled,
                    "items_completed": completed_items,
                    "items_forwarded": forwarded,
                    "items_returned": returned,
                    "sla_compliance_rate": round(sla_compliance_rate, 2),
                    "sla_breaches": sla_breaches,
                },
            )
            
            results["staff_processed"] += 1
            if created:
                results["snapshots_created"] += 1
                
        except Exception as e:
            logger.error(f"Error generating snapshot for user {user.id}: {e}")
            results["errors"].append(f"{user.username}: {str(e)}")
    
    logger.info(f"Weekly staff snapshots generated: {results}")
    return results


@shared_task(name="analytics.send_daily_digest")
def send_daily_digest() -> dict[str, Any]:
    """
    Send daily digest email with pending escalations.
    Should run once per day (e.g., 8 AM).
    """
    from .models import Escalation
    
    results = {"digests_sent": 0, "errors": []}
    
    # Get pending escalations marked for digest
    pending_escalations = Escalation.objects.filter(
        status__in=[Escalation.Status.PENDING, Escalation.Status.SENT],
        action_details__include_in_digest=True,
    ).select_related("correspondence", "rule")
    
    if not pending_escalations.exists():
        logger.info("No pending escalations for daily digest")
        return results
    
    # Group by user (would need to implement recipient logic)
    # For now, this is a placeholder for future implementation
    logger.info(f"Daily digest: {pending_escalations.count()} pending escalations")
    
    return results


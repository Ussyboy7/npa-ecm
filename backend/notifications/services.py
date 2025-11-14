"""Notification service for creating and sending notifications."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from .models import Notification, NotificationPreferences

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications."""

    @staticmethod
    def get_or_create_preferences(user) -> NotificationPreferences:
        """Get or create notification preferences for a user."""
        preferences, _ = NotificationPreferences.objects.get_or_create(user=user)
        return preferences

    @staticmethod
    def should_send_notification(
        user,
        notification_type: str,
        priority: str,
        module: str = "",
    ) -> tuple[bool, bool]:
        """
        Check if notification should be sent based on user preferences.
        Returns (should_send_in_app, should_send_email)
        """
        preferences = NotificationService.get_or_create_preferences(user)

        # Check quiet hours
        if preferences.quiet_hours_enabled:
            now = timezone.now().time()
            start = preferences.quiet_hours_start
            end = preferences.quiet_hours_end
            if start and end:
                if start <= end:
                    # Normal case: 22:00 to 07:00
                    in_quiet_hours = start <= now <= end
                else:
                    # Overnight: 22:00 to 07:00 (wraps midnight)
                    in_quiet_hours = now >= start or now <= end

                if in_quiet_hours and priority != Notification.Priority.URGENT:
                    return False, False

        # Check module filter
        module_field = f"module_{module.lower()}" if module else None
        if module_field and hasattr(preferences, module_field):
            if not getattr(preferences, module_field, True):
                return False, False

        # Check priority filter
        priority_field = f"priority_{priority.lower()}"
        if hasattr(preferences, priority_field):
            if not getattr(preferences, priority_field, True):
                return False, False

        # Check type filter
        type_field = f"type_{notification_type.lower()}"
        if hasattr(preferences, type_field):
            if not getattr(preferences, type_field, True):
                return False, False

        # Check in-app settings
        should_in_app = preferences.in_app_enabled
        if preferences.in_app_urgent_only and priority != Notification.Priority.URGENT:
            should_in_app = False

        # Check email settings
        should_email = preferences.email_enabled
        if preferences.email_urgent_only and priority != Notification.Priority.URGENT:
            should_email = False

        return should_in_app, should_email

    @staticmethod
    def create_notification(
        recipient,
        title: str,
        message: str,
        notification_type: str = Notification.NotificationType.SYSTEM,
        priority: str = Notification.Priority.NORMAL,
        sender=None,
        module: str = "",
        related_object_type: str = "",
        related_object_id: str = "",
        action_url: str = "",
        action_required: bool = False,
        expires_in_hours: Optional[int] = None,
    ) -> Optional[Notification]:
        """Create a notification and send email if configured."""
        should_in_app, should_email = NotificationService.should_send_notification(
            recipient, notification_type, priority, module
        )

        if not should_in_app and not should_email:
            logger.debug(f"Notification suppressed for {recipient} based on preferences")
            return None

        expires_at = None
        if expires_in_hours:
            expires_at = timezone.now() + timedelta(hours=expires_in_hours)

        notification = Notification.objects.create(
            recipient=recipient,
            sender=sender,
            title=title,
            message=message,
            notification_type=notification_type,
            priority=priority,
            module=module,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            action_url=action_url,
            action_required=action_required,
            expires_at=expires_at,
        )

        # Send email if configured
        if should_email:
            NotificationService.send_email_notification(notification)

        # Send via WebSocket if available (async, but called from sync context)
        try:
            from asgiref.sync import async_to_sync
            from .consumers import send_notification_to_user, send_unread_count_update
            from .serializers import NotificationSerializer
            
            # Serialize notification for WebSocket
            serializer = NotificationSerializer(notification)
            notification_data = serializer.data
            
            # Send to user's WebSocket group (async function called from sync context)
            async_to_sync(send_notification_to_user)(str(recipient.id), notification_data)
            
            # Update unread count
            unread_count = Notification.objects.filter(
                recipient=recipient,
                status=Notification.Status.UNREAD
            ).count()
            async_to_sync(send_unread_count_update)(str(recipient.id), unread_count)
        except Exception as e:
            logger.warning(f"Failed to send notification via WebSocket: {e}")

        return notification

    @staticmethod
    def send_email_notification(notification: Notification) -> bool:
        """Send email notification."""
        try:
            # Check if already sent
            if notification.email_sent:
                return True

            recipient = notification.recipient
            if not recipient.email:
                logger.warning(f"No email address for user {recipient}")
                return False

            # Prepare email context
            context = {
                "notification": notification,
                "recipient": recipient,
                "site_url": settings.ALLOWED_HOSTS[0] if settings.ALLOWED_HOSTS else "localhost",
            }

            # Render email template
            try:
                html_message = render_to_string(
                    "notifications/emails/notification.html",
                    context,
                )
                plain_message = render_to_string(
                    "notifications/emails/notification.txt",
                    context,
                )
            except Exception as e:
                logger.warning(f"Email template not found, using plain text: {e}")
                html_message = None
                plain_message = notification.message

            # Send email
            send_mail(
                subject=f"[NPA ECM] {notification.title}",
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                html_message=html_message,
                fail_silently=False,
            )

            # Mark as sent
            notification.email_sent = True
            notification.email_sent_at = timezone.now()
            notification.save(update_fields=["email_sent", "email_sent_at"])

            logger.info(f"Email notification sent to {recipient.email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email notification: {e}", exc_info=True)
            return False

    @staticmethod
    def mark_as_read(notification_id: str, user) -> bool:
        """Mark notification as read."""
        try:
            notification = Notification.objects.get(id=notification_id, recipient=user)
            notification.mark_as_read()
            return True
        except Notification.DoesNotExist:
            return False

    @staticmethod
    def mark_all_as_read(user) -> int:
        """Mark all unread notifications as read for a user."""
        count = Notification.objects.filter(recipient=user, status=Notification.Status.UNREAD).update(
            status=Notification.Status.READ,
            read_at=timezone.now(),
        )
        return count

    @staticmethod
    def archive_old_notifications(days: int = 30) -> int:
        """Archive notifications older than specified days."""
        cutoff_date = timezone.now() - timedelta(days=days)
        count = Notification.objects.filter(
            created_at__lt=cutoff_date,
            status__in=[Notification.Status.READ, Notification.Status.UNREAD],
        ).update(status=Notification.Status.ARCHIVED)
        return count


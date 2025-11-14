"""WebSocket consumer for real-time notifications."""

from __future__ import annotations

import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

from .models import Notification
from .serializers import NotificationSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time notifications."""

    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope["user"]
        
        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        # Create user-specific channel group
        self.group_name = f"notifications_{self.user.id}"

        # Join group
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        await self.accept()
        logger.info(f"WebSocket connected for user {self.user.id}")

        # Send current unread count on connect
        unread_count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            "type": "unread_count",
            "count": unread_count,
        }))

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f"WebSocket disconnected for user {self.user.id if hasattr(self, 'user') else 'unknown'}")

    async def receive(self, text_data):
        """Handle messages from WebSocket client."""
        try:
            data = json.loads(text_data)
            message_type = data.get("type")

            if message_type == "ping":
                # Respond to ping with pong
                await self.send(text_data=json.dumps({"type": "pong"}))
            elif message_type == "mark_read":
                # Mark notification as read
                notification_id = data.get("notification_id")
                if notification_id:
                    await self.mark_notification_read(notification_id)
            elif message_type == "get_unread_count":
                # Send unread count
                unread_count = await self.get_unread_count()
                await self.send(text_data=json.dumps({
                    "type": "unread_count",
                    "count": unread_count,
                }))

        except json.JSONDecodeError:
            logger.error("Invalid JSON received from WebSocket")
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {e}")

    async def notification_created(self, event):
        """Handle notification created event."""
        notification_data = event["notification"]
        await self.send(text_data=json.dumps({
            "type": "notification",
            "notification": notification_data,
        }))

    async def notification_updated(self, event):
        """Handle notification updated event."""
        notification_data = event["notification"]
        await self.send(text_data=json.dumps({
            "type": "notification_updated",
            "notification": notification_data,
        }))

    async def unread_count_changed(self, event):
        """Handle unread count changed event."""
        count = event["count"]
        await self.send(text_data=json.dumps({
            "type": "unread_count",
            "count": count,
        }))

    @database_sync_to_async
    def get_unread_count(self):
        """Get unread notification count for user."""
        return Notification.objects.filter(
            recipient=self.user,
            status=Notification.Status.UNREAD
        ).count()

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark notification as read."""
        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient=self.user
            )
            notification.mark_as_read()
            return True
        except Notification.DoesNotExist:
            return False


async def send_notification_to_user(user_id, notification_data):
    """Helper function to send notification via WebSocket."""
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    
    if channel_layer:
        group_name = f"notifications_{user_id}"
        await channel_layer.group_send(
            group_name,
            {
                "type": "notification_created",
                "notification": notification_data,
            }
        )


async def send_unread_count_update(user_id, count):
    """Helper function to send unread count update via WebSocket."""
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    
    if channel_layer:
        group_name = f"notifications_{user_id}"
        await channel_layer.group_send(
            group_name,
            {
                "type": "unread_count_changed",
                "count": count,
            }
        )


"""WebSocket consumers for real-time document collaboration."""

from __future__ import annotations

import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone

logger = logging.getLogger(__name__)


class DocumentEditorConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time document editing collaboration.
    
    Handles:
    - Editor presence (who is currently viewing/editing)
    - Cursor positions
    - Real-time content updates
    - Editor session management
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.document_id = self.scope["url_route"]["kwargs"]["document_id"]
        self.room_group_name = f"document_{self.document_id}"
        self.user = self.scope.get("user")
        
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        
        # Join document room
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Create or update editor session
        await self.create_editor_session()
        
        # Notify others that user joined
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_joined",
                "user_id": str(self.user.id),
                "username": self.user.get_full_name() or self.user.username,
                "timestamp": timezone.now().isoformat(),
            }
        )
        
        # Send current active editors to the joining user
        editors = await self.get_active_editors()
        await self.send_json({
            "type": "active_editors",
            "editors": editors,
        })
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'user') and self.user and self.user.is_authenticated:
            # End editor session
            await self.end_editor_session()
            
            # Notify others that user left
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "user_left",
                    "user_id": str(self.user.id),
                    "username": self.user.get_full_name() or self.user.username,
                    "timestamp": timezone.now().isoformat(),
                }
            )
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive_json(self, content):
        """Handle incoming WebSocket messages."""
        message_type = content.get("type")
        
        if message_type == "cursor_move":
            # Broadcast cursor position to other editors
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "cursor_update",
                    "user_id": str(self.user.id),
                    "username": self.user.get_full_name() or self.user.username,
                    "position": content.get("position", {}),
                    "selection": content.get("selection"),
                }
            )
        
        elif message_type == "content_change":
            # Broadcast content changes (for collaborative editing)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "content_update",
                    "user_id": str(self.user.id),
                    "username": self.user.get_full_name() or self.user.username,
                    "changes": content.get("changes", []),
                    "version": content.get("version"),
                    "timestamp": timezone.now().isoformat(),
                }
            )
        
        elif message_type == "ping":
            # Keep-alive ping
            await self.update_session_activity()
            await self.send_json({"type": "pong"})
        
        elif message_type == "typing_start":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "typing_indicator",
                    "user_id": str(self.user.id),
                    "username": self.user.get_full_name() or self.user.username,
                    "is_typing": True,
                }
            )
        
        elif message_type == "typing_stop":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "typing_indicator",
                    "user_id": str(self.user.id),
                    "username": self.user.get_full_name() or self.user.username,
                    "is_typing": False,
                }
            )
        
        elif message_type == "request_sync":
            # Request latest document state from server
            document_state = await self.get_document_state()
            await self.send_json({
                "type": "sync_response",
                "state": document_state,
            })
    
    # Event handlers for group messages
    
    async def user_joined(self, event):
        """Handle user joined event."""
        # Don't send to self
        if event["user_id"] != str(self.user.id):
            await self.send_json({
                "type": "user_joined",
                "user_id": event["user_id"],
                "username": event["username"],
                "timestamp": event["timestamp"],
            })
    
    async def user_left(self, event):
        """Handle user left event."""
        if event["user_id"] != str(self.user.id):
            await self.send_json({
                "type": "user_left",
                "user_id": event["user_id"],
                "username": event["username"],
                "timestamp": event["timestamp"],
            })
    
    async def cursor_update(self, event):
        """Handle cursor position update."""
        if event["user_id"] != str(self.user.id):
            await self.send_json({
                "type": "cursor_update",
                "user_id": event["user_id"],
                "username": event["username"],
                "position": event["position"],
                "selection": event.get("selection"),
            })
    
    async def content_update(self, event):
        """Handle content update."""
        if event["user_id"] != str(self.user.id):
            await self.send_json({
                "type": "content_update",
                "user_id": event["user_id"],
                "username": event["username"],
                "changes": event["changes"],
                "version": event.get("version"),
                "timestamp": event["timestamp"],
            })
    
    async def typing_indicator(self, event):
        """Handle typing indicator."""
        if event["user_id"] != str(self.user.id):
            await self.send_json({
                "type": "typing_indicator",
                "user_id": event["user_id"],
                "username": event["username"],
                "is_typing": event["is_typing"],
            })
    
    # Database operations
    
    @database_sync_to_async
    def create_editor_session(self):
        """Create or update editor session in database."""
        from .models import DocumentEditorSession, Document
        
        try:
            document = Document.objects.get(id=self.document_id)
            session, created = DocumentEditorSession.objects.update_or_create(
                document=document,
                user=self.user,
                defaults={
                    "is_active": True,
                    "note": "Connected via WebSocket",
                }
            )
            return session
        except Document.DoesNotExist:
            logger.warning(f"Document {self.document_id} not found")
            return None
    
    @database_sync_to_async
    def end_editor_session(self):
        """End editor session in database."""
        from .models import DocumentEditorSession
        
        DocumentEditorSession.objects.filter(
            document_id=self.document_id,
            user=self.user
        ).update(is_active=False)
    
    @database_sync_to_async
    def update_session_activity(self):
        """Update session last activity timestamp."""
        from .models import DocumentEditorSession
        
        DocumentEditorSession.objects.filter(
            document_id=self.document_id,
            user=self.user,
            is_active=True
        ).update(updated_at=timezone.now())
    
    @database_sync_to_async
    def get_active_editors(self) -> list:
        """Get list of active editors for this document."""
        from .models import DocumentEditorSession
        from datetime import timedelta
        
        # Consider sessions active if updated within last 5 minutes
        cutoff = timezone.now() - timedelta(minutes=5)
        
        sessions = DocumentEditorSession.objects.filter(
            document_id=self.document_id,
            is_active=True,
            updated_at__gte=cutoff
        ).select_related("user")
        
        return [
            {
                "user_id": str(session.user.id),
                "username": session.user.get_full_name() or session.user.username,
                "since": session.since.isoformat() if session.since else None,
            }
            for session in sessions
        ]
    
    @database_sync_to_async
    def get_document_state(self) -> dict:
        """Get current document state for synchronization."""
        from .models import Document
        
        try:
            document = Document.objects.prefetch_related("versions").get(id=self.document_id)
            latest_version = document.versions.order_by("-version_number").first()
            
            return {
                "document_id": str(document.id),
                "title": document.title,
                "status": document.status,
                "latest_version": {
                    "id": str(latest_version.id) if latest_version else None,
                    "version_number": latest_version.version_number if latest_version else 0,
                    "content_html": latest_version.content_html if latest_version else "",
                    "updated_at": latest_version.updated_at.isoformat() if latest_version else None,
                } if latest_version else None,
            }
        except Document.DoesNotExist:
            return {"error": "Document not found"}


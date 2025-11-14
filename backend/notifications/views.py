"""API views for notifications."""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification, NotificationPreferences
from .serializers import NotificationPreferencesSerializer, NotificationSerializer
from .services import NotificationService


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for user notifications."""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "notification_type", "priority", "module"]
    search_fields = ["title", "message"]
    ordering_fields = ["created_at", "priority"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Return notifications for the current user."""
        return Notification.objects.filter(recipient=self.request.user).select_related("sender", "recipient")

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        if notification.recipient != request.user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        notification.mark_as_read()
        return Response({"status": "marked as read"})

    @action(detail=True, methods=["post"])
    def mark_archived(self, request, pk=None):
        """Mark a notification as archived."""
        notification = self.get_object()
        if notification.recipient != request.user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        notification.mark_as_archived()
        return Response({"status": "archived"})

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        count = NotificationService.mark_all_as_read(request.user)
        return Response({"count": count, "status": "all marked as read"})

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = self.get_queryset().filter(status=Notification.Status.UNREAD).count()
        return Response({"count": count})


class NotificationPreferencesViewSet(viewsets.ModelViewSet):
    """ViewSet for notification preferences."""

    serializer_class = NotificationPreferencesSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return preferences for the current user."""
        return NotificationPreferences.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        """Get or create preferences for the current user."""
        preferences, _ = NotificationPreferences.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(preferences)
        return Response(serializer.data)

    def perform_create(self, serializer):
        """Create preferences for the current user."""
        serializer.save(user=self.request.user)

    def get_object(self):
        """Get or create preferences for the current user."""
        preferences, _ = NotificationPreferences.objects.get_or_create(user=self.request.user)
        return preferences

"""API views for audit logs."""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import ActivityLog
from .serializers import ActivityLogSerializer


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for audit logs."""

    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["user", "action", "object_type", "module", "severity", "success"]
    search_fields = ["description", "object_repr", "user__username", "user__email"]
    ordering_fields = ["timestamp"]
    ordering = ["-timestamp"]

    def get_queryset(self):
        """Return audit logs based on user permissions."""
        user = self.request.user

        # Super admins can see all logs
        if user.is_superuser:
            return ActivityLog.objects.all().select_related("user")

        # Regular users can only see their own logs
        return ActivityLog.objects.filter(user=user).select_related("user")

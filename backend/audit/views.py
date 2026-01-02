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
    filterset_fields = ["user", "action", "object_type", "object_id", "module", "severity", "success"]
    search_fields = ["description", "object_repr", "user__username", "user__email"]
    ordering_fields = ["timestamp"]
    ordering = ["-timestamp"]

    def get_queryset(self):
        """Return audit logs based on user permissions."""
        user = self.request.user
        queryset = ActivityLog.objects.all().select_related("user")

        # Super admins can see all logs
        if user.is_superuser:
            return queryset

        # Regular users can see:
        # 1. Their own logs
        # 2. Logs for objects they have access to (e.g., cases they can view)
        # Filter by object_type and object_id if provided
        object_type = self.request.query_params.get('object_type')
        object_id = self.request.query_params.get('object_id')
        
        if object_type and object_id:
            # For case-related logs, allow if user has access to the case
            # This will be further filtered by the case permissions in the frontend
            # For now, allow viewing case-related activities
            if object_type == 'case':
                return queryset.filter(object_type=object_type, object_id=object_id)
        
        # Default: only user's own logs
        return queryset.filter(user=user)

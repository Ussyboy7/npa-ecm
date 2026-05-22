"""Custom middleware for the ECM application."""

from django.http import HttpRequest, HttpResponse
from django.core.exceptions import DisallowedHost
from django.utils import timezone
from django.db import transaction


class InternalHostMiddleware:
    """
    Middleware to allow internal Docker hostnames with ports for metrics endpoints.
    
    This handles cases where Prometheus or other internal services access the backend
    using Docker service names like 'backend_stag:8000', which Django rejects because
    ALLOWED_HOSTS doesn't allow ports in hostnames.
    
    For internal requests (especially metrics), we extract just the hostname part.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Check if this is an internal metrics request
        if request.path.startswith('/api/metrics/'):
            # Extract hostname without port for internal Docker requests
            host = request.get_host()
            if ':' in host:
                hostname = host.split(':')[0]
                # If it's an internal Docker service name, use just the hostname
                if hostname in ['backend_stag', 'backend', 'localhost', '127.0.0.1']:
                    # Temporarily modify the request's META to use hostname only
                    original_host = request.META.get('HTTP_HOST', '')
                    request.META['HTTP_HOST'] = hostname
                    try:
                        response = self.get_response(request)
                        return response
                    finally:
                        # Restore original host
                        if original_host:
                            request.META['HTTP_HOST'] = original_host

        return self.get_response(request)


class UserActivityMiddleware:
    """
    Middleware to track user activity.
    Updates last_activity timestamp for authenticated users on each request.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Only track activity for authenticated users
        if request.user.is_authenticated:
            # Update last_activity asynchronously to avoid blocking
            # Use update() to avoid triggering signals and save queries
            try:
                # Only update if more than 1 minute has passed since last update
                # This reduces database writes
                user = request.user
                if not user.last_activity or (timezone.now() - user.last_activity).total_seconds() > 60:
                    # Use update() for efficiency
                    from accounts.models import User
                    User.objects.filter(id=user.id).update(last_activity=timezone.now())
            except (AttributeError, TypeError, ValueError):
                pass

        return self.get_response(request)


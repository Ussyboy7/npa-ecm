"""Common views and utilities."""

from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.core.cache import cache


@require_http_methods(["GET"])
def health_check(request):
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        - 200 OK: All services are healthy
        - 503 Service Unavailable: One or more services are unhealthy
    """
    status = {
        "status": "healthy",
        "services": {},
    }
    overall_healthy = True

    # Check database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        status["services"]["database"] = "healthy"
    except Exception as e:
        status["services"]["database"] = f"unhealthy: {str(e)}"
        overall_healthy = False

    # Check cache (Redis) connectivity
    try:
        cache.set("health_check", "ok", 10)
        cache.get("health_check")
        status["services"]["cache"] = "healthy"
    except Exception as e:
        status["services"]["cache"] = f"unhealthy: {str(e)}"
        overall_healthy = False

    # Determine HTTP status code
    http_status = 200 if overall_healthy else 503
    if not overall_healthy:
        status["status"] = "unhealthy"

    return JsonResponse(status, status=http_status)

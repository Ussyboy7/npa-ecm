"""Root URL configuration for the ECM backend."""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from common.metrics import prometheus_metrics
from common.views import health_check, health_live


api_v1_patterns = [
    path('health/live/', health_live, name='health_live'),
    path('health/', health_check, name='health_check'),
    path('metrics/', prometheus_metrics, name='prometheus_metrics'),
    path('accounts/', include('accounts.urls')),
    path('organization/', include('organization.urls')),
    path('correspondence/', include('correspondence.urls')),
    path('dms/', include('dms.urls')),
    path('workflow/', include('workflow.urls')),
    path('analytics/', include('analytics.urls')),
    path('support/', include('support.urls')),
    path('notifications/', include('notifications.urls')),
    path('audit/', include('audit.urls')),
    path('forms/', include('forms.urls')),
    path('capture/', include('capture.urls')),
    path('search/', include('search.urls')),
    path('integrations/', include('integrations.urls')),
    path('records/', include('records.urls')),
    path('platform/', include('common.urls')),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/live/', health_live, name='health_live_short'),
    path('health/', health_check, name='health_check_short'),
    path('api/metrics/', prometheus_metrics, name='prometheus_metrics_short'),

    # OpenAPI schema & docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Versioned application endpoints
    path('api/v1/', include((api_v1_patterns, 'api'), namespace='api_v1')),

    # Legacy alias to keep existing clients working temporarily
    path('api/', include((api_v1_patterns, 'api'), namespace='api_legacy')),
]

# Public /media/ is intentionally not mounted. Document bytes go through DRM APIs;
# allowlisted signature/seal assets use /api/v1/platform/protected-media/.

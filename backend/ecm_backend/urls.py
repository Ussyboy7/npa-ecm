"""Root URL configuration for the ECM backend."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from common.views import health_check


api_v1_patterns = [
    path('health/', health_check, name='health_check'),
    path('accounts/', include('accounts.urls')),
    path('organization/', include('organization.urls')),
    path('correspondence/', include('correspondence.urls')),
    path('dms/', include('dms.urls')),
    path('workflow/', include('workflow.urls')),
    path('analytics/', include('analytics.urls')),
    path('support/', include('support.urls')),
    path('notifications/', include('notifications.urls')),
    path('audit/', include('audit.urls')),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check_short'),

    # OpenAPI schema & docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Versioned application endpoints
    path('api/v1/', include((api_v1_patterns, 'api'), namespace='api_v1')),

    # Legacy alias to keep existing clients working temporarily
    path('api/', include((api_v1_patterns, 'api'), namespace='api_legacy')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

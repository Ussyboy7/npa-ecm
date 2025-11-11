"""Root URL configuration for the ECM backend."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView


urlpatterns = [
    path("admin/", admin.site.urls),

    # OpenAPI schema & docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # Application endpoints
    path("api/accounts/", include("accounts.urls")),
    path("api/organization/", include("organization.urls")),
    path("api/correspondence/", include("correspondence.urls")),
    path("api/dms/", include("dms.urls")),
    path("api/workflow/", include("workflow.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/support/", include("support.urls")),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

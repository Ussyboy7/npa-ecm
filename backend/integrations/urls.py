"""URL configuration for integrations module."""

from rest_framework.routers import DefaultRouter

from integrations.views import (
    ERPConnectorViewSet,
    EmailConnectorViewSet,
    HRMSConnectorViewSet,
    IntegrationLogViewSet,
    WebhookEventViewSet,
    WebhookViewSet,
)

router = DefaultRouter()
router.register(r"webhooks", WebhookViewSet, basename="webhook")
router.register(r"webhook-events", WebhookEventViewSet, basename="webhook-event")
router.register(r"email-connectors", EmailConnectorViewSet, basename="email-connector")
router.register(r"erp-connectors", ERPConnectorViewSet, basename="erp-connector")
router.register(r"hrms-connectors", HRMSConnectorViewSet, basename="hrms-connector")
router.register(r"logs", IntegrationLogViewSet, basename="integration-log")

urlpatterns = router.urls


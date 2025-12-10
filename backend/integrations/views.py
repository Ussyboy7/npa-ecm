"""Views for integrations module."""

from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from integrations.models import (
    EmailConnector,
    ERPConnector,
    IntegrationLog,
    Webhook,
    WebhookEvent,
)
from integrations.serializers import (
    EmailConnectorSerializer,
    ERPConnectorSerializer,
    ERPSyncRequestSerializer,
    IntegrationLogSerializer,
    SendEmailRequestSerializer,
    WebhookEventSerializer,
    WebhookSerializer,
)
from integrations.services import EmailService, ERPConnectorService, WebhookService


class WebhookViewSet(viewsets.ModelViewSet):
    """ViewSet for managing webhooks."""

    queryset = Webhook.objects.all()
    serializer_class = WebhookSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter webhooks."""
        queryset = super().get_queryset()
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        return queryset.order_by("name")

    def perform_create(self, serializer):
        """Set the creator when creating a webhook."""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def test(self, request, pk=None):
        """Test webhook delivery."""
        webhook = self.get_object()

        # Create a test event
        test_event = WebhookEvent.objects.create(
            webhook=webhook,
            event_type="test",
            payload={"message": "Test webhook delivery"},
            status=WebhookEvent.EventStatus.PENDING,
        )

        # Deliver immediately
        success = WebhookService.deliver_webhook(test_event)

        if success:
            return Response(
                {
                    "status": "success",
                    "message": "Webhook test delivered successfully",
                    "event_id": str(test_event.id),
                }
            )
        else:
            return Response(
                {
                    "status": "failed",
                    "message": "Webhook test failed",
                    "error": test_event.error_message,
                    "event_id": str(test_event.id),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class WebhookEventViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing webhook events."""

    queryset = WebhookEvent.objects.all()
    serializer_class = WebhookEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter events."""
        queryset = super().get_queryset()
        webhook_id = self.request.query_params.get("webhook")
        status_filter = self.request.query_params.get("status")
        if webhook_id:
            queryset = queryset.filter(webhook_id=webhook_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset.order_by("-created_at")


class EmailConnectorViewSet(viewsets.ModelViewSet):
    """ViewSet for managing email connectors."""

    queryset = EmailConnector.objects.all()
    serializer_class = EmailConnectorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter connectors."""
        queryset = super().get_queryset()
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        return queryset.order_by("name")

    @action(detail=False, methods=["post"])
    def send_email(self, request):
        """Send email via connector."""
        serializer = SendEmailRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        success = EmailService.send_email(
            to=serializer.validated_data["to"],
            subject=serializer.validated_data["subject"],
            body=serializer.validated_data["body"],
            html_body=serializer.validated_data.get("html_body"),
            connector_id=str(serializer.validated_data.get("connector_id"))
            if serializer.validated_data.get("connector_id")
            else None,
        )

        if success:
            return Response({"status": "success", "message": "Email sent successfully"})
        else:
            return Response(
                {"status": "failed", "message": "Email send failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ERPConnectorViewSet(viewsets.ModelViewSet):
    """ViewSet for managing ERP connectors."""

    queryset = ERPConnector.objects.all()
    serializer_class = ERPConnectorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter connectors."""
        queryset = super().get_queryset()
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        return queryset.order_by("name")

    @action(detail=False, methods=["post"])
    def sync(self, request):
        """Sync documents from ERP."""
        serializer = ERPSyncRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = ERPConnectorService.sync_documents(
            str(serializer.validated_data["connector_id"])
        )

        if result.get("success"):
            return Response(result)
        else:
            return Response(
                result,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class IntegrationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing integration logs."""

    queryset = IntegrationLog.objects.all()
    serializer_class = IntegrationLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter logs."""
        queryset = super().get_queryset()
        log_type = self.request.query_params.get("log_type")
        status_filter = self.request.query_params.get("status")
        integration_id = self.request.query_params.get("integration_id")
        if log_type:
            queryset = queryset.filter(log_type=log_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if integration_id:
            queryset = queryset.filter(integration_id=integration_id)
        return queryset.order_by("-created_at")[:100]  # Last 100 logs

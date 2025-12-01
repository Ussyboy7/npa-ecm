"""WebSocket URL routing for DMS."""

from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(
        r"ws/documents/(?P<document_id>[0-9a-f-]+)/edit/$",
        consumers.DocumentEditorConsumer.as_asgi(),
    ),
]


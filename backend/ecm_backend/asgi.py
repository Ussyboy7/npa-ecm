"""
ASGI config for the ECM backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecm_backend.settings')

# Initialize Django ASGI application early
django_asgi_app = get_asgi_application()

# Import WebSocket routing and custom JWT middleware
from notifications.routing import websocket_urlpatterns
from notifications.middleware import JWTAuthMiddlewareStack

# ASGI application with WebSocket support
# Use JWT middleware for WebSocket authentication (supports token in query string)
# Falls back to session auth if no token provided
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})

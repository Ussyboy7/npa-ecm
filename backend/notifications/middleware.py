"""Custom middleware for WebSocket JWT authentication."""

from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_string):
    """Get user from JWT token."""
    try:
        # Validate token
        UntypedToken(token_string)
    except (InvalidToken, TokenError) as e:
        return AnonymousUser()
    
    # Decode token to get user ID
    from rest_framework_simplejwt.tokens import AccessToken
    try:
        access_token = AccessToken(token_string)
        user_id = access_token.get('user_id')
        if user_id:
            try:
                return User.objects.get(id=user_id)
            except User.DoesNotExist:
                return AnonymousUser()
    except Exception:
        return AnonymousUser()
    
    return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """JWT authentication middleware for WebSocket connections."""

    async def __call__(self, scope, receive, send):
        # Close old database connections
        close_old_connections()

        # Get token from query string or headers
        query_string = parse_qs(scope.get("query_string", b"").decode())
        token = query_string.get("token", [None])[0]
        
        # If no token in query, try Authorization header
        if not token:
            headers = dict(scope.get("headers", []))
            auth_header = headers.get(b"authorization", b"").decode()
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]

        # Authenticate user
        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """Stack JWT auth middleware on top of the inner application."""
    return JWTAuthMiddleware(inner)


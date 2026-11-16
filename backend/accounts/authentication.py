"""JWT authentication that accepts httpOnly browser cookies with CSRF checks."""

from __future__ import annotations

from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication

from .auth_cookies import csrf_token_is_valid, get_access_token_from_cookies

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class CookieJWTAuthentication(JWTAuthentication):
    """Authenticate header-based API clients or same-site browser cookies."""

    def authenticate(self, request):
        header = self.get_header(request)
        raw_token = self.get_raw_token(header) if header else None
        used_cookie = False

        if raw_token is None:
            raw_token = get_access_token_from_cookies(request)
            used_cookie = bool(raw_token)

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)

        # Cookie authentication is ambient, so state-changing requests need a
        # matching token that only same-origin JavaScript can read. Header-based
        # API clients are not susceptible to browser CSRF and remain unchanged.
        if used_cookie and request.method in UNSAFE_METHODS and not csrf_token_is_valid(request):
            raise PermissionDenied("CSRF verification failed.")

        return user, validated_token
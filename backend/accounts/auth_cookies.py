"""Canonical browser session cookies for JWT authentication."""

from __future__ import annotations

import secrets

from django.conf import settings

AUTH_ACCESS_COOKIE_NAME = "npa_ecm_access_token"
AUTH_REFRESH_COOKIE_NAME = "npa_ecm_refresh_token"
AUTH_CSRF_COOKIE_NAME = "npa_ecm_csrf_token"
AUTH_SESSION_COOKIE_NAME = "npa_ecm_session"
AUTH_IMPERSONATING_COOKIE_NAME = "npa_ecm_impersonating"
AUTH_ORIGINAL_REFRESH_COOKIE_NAME = "npa_ecm_original_refresh_token"
AUTH_ORIGINAL_USER_COOKIE_NAME = "npa_ecm_original_user_id"


def use_secure_auth_cookies(request=None) -> bool:
    frontend_base_url = getattr(settings, "FRONTEND_BASE_URL", "")
    frontend_uses_https = str(frontend_base_url).startswith("https://")
    return bool((request and request.is_secure()) or frontend_uses_https)


def _set_cookie(response, request, name, value, max_age, *, http_only):
    response.set_cookie(
        name,
        value,
        max_age=max_age,
        secure=use_secure_auth_cookies(request),
        httponly=http_only,
        samesite="Lax",
        path="/",
    )


def _delete_cookie(response, request, name):
    response.set_cookie(
        name,
        "",
        max_age=0,
        expires="Thu, 01 Jan 1970 00:00:00 GMT",
        path="/",
        secure=use_secure_auth_cookies(request),
        httponly=True,
        samesite="Lax",
    )


def set_auth_token_cookies(response, access_token: str, refresh_token: str, request=None) -> str:
    """Set httpOnly JWTs and return the readable CSRF token for the client."""
    access_lifetime = settings.SIMPLE_JWT.get("ACCESS_TOKEN_LIFETIME")
    refresh_lifetime = settings.SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME")
    access_max_age = int(access_lifetime.total_seconds()) if access_lifetime else 3600
    refresh_max_age = int(refresh_lifetime.total_seconds()) if refresh_lifetime else 7 * 24 * 60 * 60

    csrf_token = secrets.token_urlsafe(32)
    _set_cookie(response, request, AUTH_ACCESS_COOKIE_NAME, access_token, access_max_age, http_only=True)
    _set_cookie(response, request, AUTH_REFRESH_COOKIE_NAME, refresh_token, refresh_max_age, http_only=True)
    _set_cookie(response, request, AUTH_CSRF_COOKIE_NAME, csrf_token, refresh_max_age, http_only=False)
    _set_cookie(response, request, AUTH_SESSION_COOKIE_NAME, "1", refresh_max_age, http_only=False)
    return csrf_token


def set_impersonation_cookies(response, request, original_refresh: str, original_user_id: str):
    refresh_lifetime = settings.SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME")
    max_age = int(refresh_lifetime.total_seconds()) if refresh_lifetime else 7 * 24 * 60 * 60
    _set_cookie(response, request, AUTH_ORIGINAL_REFRESH_COOKIE_NAME, original_refresh, max_age, http_only=True)
    _set_cookie(response, request, AUTH_IMPERSONATING_COOKIE_NAME, "1", max_age, http_only=False)
    _set_cookie(response, request, AUTH_ORIGINAL_USER_COOKIE_NAME, str(original_user_id), max_age, http_only=False)


def clear_impersonation_cookies(response, request=None):
    for name in (
        AUTH_ORIGINAL_REFRESH_COOKIE_NAME,
        AUTH_IMPERSONATING_COOKIE_NAME,
        AUTH_ORIGINAL_USER_COOKIE_NAME,
    ):
        _delete_cookie(response, request, name)


def clear_auth_token_cookies(response, request=None):
    for name in (
        AUTH_ACCESS_COOKIE_NAME,
        AUTH_REFRESH_COOKIE_NAME,
        AUTH_CSRF_COOKIE_NAME,
        AUTH_SESSION_COOKIE_NAME,
        AUTH_ORIGINAL_REFRESH_COOKIE_NAME,
        AUTH_IMPERSONATING_COOKIE_NAME,
        AUTH_ORIGINAL_USER_COOKIE_NAME,
    ):
        _delete_cookie(response, request, name)


def get_access_token_from_cookies(request) -> str | None:
    return request.COOKIES.get(AUTH_ACCESS_COOKIE_NAME) or request.COOKIES.get("access_token")


def get_refresh_token_from_cookies(request) -> str | None:
    return request.COOKIES.get(AUTH_REFRESH_COOKIE_NAME) or request.COOKIES.get("refresh_token")


def csrf_token_is_valid(request) -> bool:
    expected = request.COOKIES.get(AUTH_CSRF_COOKIE_NAME)
    supplied = request.headers.get("X-CSRF-Token")
    return bool(expected and supplied and secrets.compare_digest(expected, supplied))
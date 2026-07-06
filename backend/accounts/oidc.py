"""OIDC / OpenID Connect helpers for enterprise SSO."""

from __future__ import annotations

import secrets
from typing import Any
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.core.cache import cache


def oidc_enabled() -> bool:
    return bool(
        getattr(settings, "OIDC_ENABLED", False)
        and getattr(settings, "OIDC_CLIENT_ID", "")
        and getattr(settings, "OIDC_CLIENT_SECRET", "")
        and getattr(settings, "OIDC_ISSUER_URL", "")
    )


def _oidc_setting(name: str, default: str = "") -> str:
    return getattr(settings, name, default) or default


def build_authorization_url(state: str, nonce: str) -> str:
    issuer = _oidc_setting("OIDC_ISSUER_URL").rstrip("/")
    authorize = _oidc_setting("OIDC_AUTHORIZATION_ENDPOINT", f"{issuer}/authorize")
    redirect_uri = _oidc_setting("OIDC_REDIRECT_URI")
    params = {
        "client_id": _oidc_setting("OIDC_CLIENT_ID"),
        "response_type": "code",
        "scope": _oidc_setting("OIDC_SCOPES", "openid profile email"),
        "redirect_uri": redirect_uri,
        "state": state,
        "nonce": nonce,
    }
    return f"{authorize}?{urlencode(params)}"


def create_oidc_state() -> tuple[str, str]:
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    cache.set(f"oidc_state:{state}", {"nonce": nonce}, timeout=600)
    return state, nonce


def pop_oidc_state(state: str) -> dict[str, Any] | None:
    key = f"oidc_state:{state}"
    payload = cache.get(key)
    if payload:
        cache.delete(key)
    return payload


def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    issuer = _oidc_setting("OIDC_ISSUER_URL").rstrip("/")
    token_url = _oidc_setting("OIDC_TOKEN_ENDPOINT", f"{issuer}/token")
    redirect_uri = _oidc_setting("OIDC_REDIRECT_URI")
    response = requests.post(
        token_url,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": _oidc_setting("OIDC_CLIENT_ID"),
            "client_secret": _oidc_setting("OIDC_CLIENT_SECRET"),
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def fetch_userinfo(access_token: str) -> dict[str, Any]:
    issuer = _oidc_setting("OIDC_ISSUER_URL").rstrip("/")
    userinfo_url = _oidc_setting("OIDC_USERINFO_ENDPOINT", f"{issuer}/userinfo")
    response = requests.get(
        userinfo_url,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def resolve_username_from_claims(claims: dict[str, Any]) -> str:
    preferred = (
        claims.get("preferred_username")
        or claims.get("email")
        or claims.get("upn")
        or claims.get("sub")
    )
    if not preferred:
        raise ValueError("OIDC userinfo missing identifiable username claim")
    base = str(preferred).split("@")[0].lower().replace(" ", "_")
    return base[:150]

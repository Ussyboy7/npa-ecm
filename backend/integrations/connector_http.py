"""Shared HTTP auth helpers for integration connectors."""

from __future__ import annotations

import base64
from typing import Any

import requests
from common.field_encryption import decrypt_value


def build_auth_headers(
    *,
    api_key: str = "",
    username: str = "",
    password: str = "",
    extra_headers: dict[str, str] | None = None,
) -> dict[str, str]:
    headers = dict(extra_headers or {})
    if api_key:
        headers["X-API-Key"] = decrypt_value(api_key)
    elif username and password:
        auth = base64.b64encode(
            f"{username}:{decrypt_value(password)}".encode()
        ).decode()
        headers["Authorization"] = f"Basic {auth}"
    return headers


def get_json(url: str, headers: dict[str, str], timeout: int = 30) -> tuple[int, Any]:
    response = requests.get(url, headers=headers, timeout=timeout)
    try:
        return response.status_code, response.json()
    except ValueError:
        return response.status_code, response.text

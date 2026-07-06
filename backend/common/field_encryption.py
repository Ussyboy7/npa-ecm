"""Symmetric encryption for integration credentials at rest."""

from __future__ import annotations

import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger(__name__)

ENC_PREFIX = "enc:"


def _derive_fernet_key() -> bytes:
    explicit = getattr(settings, "INTEGRATION_ENCRYPTION_KEY", "") or ""
    if explicit:
        return explicit.encode("utf-8") if isinstance(explicit, str) else explicit
    digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _get_fernet() -> Fernet:
    return Fernet(_derive_fernet_key())


def encrypt_value(plain: str | None) -> str:
    if not plain:
        return ""
    if plain.startswith(ENC_PREFIX):
        return plain
    token = _get_fernet().encrypt(plain.encode("utf-8")).decode("utf-8")
    return f"{ENC_PREFIX}{token}"


def decrypt_value(stored: str | None) -> str:
    if not stored:
        return ""
    if not stored.startswith(ENC_PREFIX):
        return stored
    try:
        return _get_fernet().decrypt(stored[len(ENC_PREFIX) :].encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError) as exc:
        logger.error("Failed to decrypt integration credential: %s", exc)
        return ""

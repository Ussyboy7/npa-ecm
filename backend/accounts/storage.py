"""Private, encrypted-at-rest storage for executive signature images."""

from __future__ import annotations

import base64
import hashlib
import os
import uuid

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage


def _derive_key() -> bytes:
    explicit = getattr(settings, "SIGNATURE_ENCRYPTION_KEY", "") or ""
    if explicit:
        return explicit.encode("utf-8") if isinstance(explicit, str) else explicit
    digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


class EncryptedSignatureStorage(FileSystemStorage):
    """Encrypt signature bytes before writing them to private media storage."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("base_url", None)
        super().__init__(*args, **kwargs)
        self._fernet = Fernet(_derive_key())

    def encrypt_bytes(self, raw: bytes) -> bytes:
        return self._fernet.encrypt(raw)

    def decrypt_bytes(self, raw: bytes) -> bytes:
        return self._fernet.decrypt(raw)

    def is_encrypted(self, raw: bytes) -> bool:
        try:
            self.decrypt_bytes(raw)
        except InvalidToken:
            return False
        return True

    def encrypt_in_place(self, name: str) -> bool:
        """Encrypt an existing file atomically, returning whether it changed."""
        path = self.path(name)
        with open(path, "rb") as source:
            raw = source.read()
        if self.is_encrypted(raw):
            return False

        temporary = f"{path}.{uuid.uuid4().hex}.tmp"
        try:
            with open(temporary, "wb") as target:
                target.write(self.encrypt_bytes(raw))
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.remove(temporary)
        return True

    def _save(self, name, content):
        raw = content.read()
        if isinstance(raw, str):
            raw = raw.encode("utf-8")
        return super()._save(name, ContentFile(self.encrypt_bytes(raw), name=name))

    def _open(self, name, mode="rb"):
        stored = super()._open(name, mode)
        if "r" not in mode:
            return stored
        try:
            raw = stored.read()
        finally:
            stored.close()
        try:
            payload = self.decrypt_bytes(raw)
        except InvalidToken:
            # Files written before encryption was introduced, or restored from
            # a pre-encryption backup, are still plain images. Serve them as-is
            # instead of hiding an existing signature.
            payload = raw
        return ContentFile(payload, name=name)

    def url(self, name):
        raise ValueError("Signature images do not have a public URL")


signature_storage = EncryptedSignatureStorage()

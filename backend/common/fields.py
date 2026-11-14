"""Encrypted model fields for short secrets stored in the database."""

from __future__ import annotations

from django.db import models

from .field_encryption import decrypt_value, encrypt_value


class EncryptedCharField(models.CharField):
    """A CharField that decrypts on read and encrypts on write.

    Existing plaintext values remain readable so migrations can encrypt them
    in place without a flag day. Fernet ciphertext is longer than the source
    value, so columns using this field need a larger max_length.
    """

    description = "Encrypted text"

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        return decrypt_value(value)

    def to_python(self, value):
        if value is None:
            return value
        return decrypt_value(str(value))

    def get_prep_value(self, value):
        if value is None:
            return value
        return encrypt_value(str(value))
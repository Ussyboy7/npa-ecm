"""Canonical user identity helpers for org-chart seed IDs vs login usernames.

Org chart JSON uses ids like ``user-gm-procurement``. Login / demo accounts use
short usernames like ``gmprocurement``. These helpers keep one person = one user.
"""

from __future__ import annotations

import re

# Explicit overrides when strip(user-)+drop-hyphens is wrong.
USERNAME_ALIASES: dict[str, str] = {
    "user-super-admin": "superadmin",
}

_SEED_EMAIL_TAG = re.compile(r"\+seed-[^@]*", re.IGNORECASE)
_SEED_EMPLOYEE_TAG = re.compile(r"-SEED-.+$", re.IGNORECASE)


def canonical_username(source_key: str) -> str:
    """Map org-chart / seed ids to the login username.

    ``user-gm-procurement`` → ``gmprocurement``
    ``user-ed-fa`` → ``edfa``
    ``gmprocurement`` → ``gmprocurement``
    """
    key = (source_key or "").strip()
    if not key:
        return key
    if key in USERNAME_ALIASES:
        return USERNAME_ALIASES[key]
    if key.startswith("user-"):
        return key[len("user-") :].replace("-", "")
    return key


def canonical_email(email: str) -> str:
    """Strip ``+seed-…`` tags inserted when email uniqueness collided."""
    value = (email or "").strip().lower()
    if not value:
        return value
    return _SEED_EMAIL_TAG.sub("", value)


def canonical_employee_id(employee_id: str) -> str:
    """Strip ``-SEED-…`` suffixes inserted on employee_id collisions."""
    value = (employee_id or "").strip()
    if not value:
        return value
    return _SEED_EMPLOYEE_TAG.sub("", value)


def is_seed_shell_username(username: str) -> bool:
    return (username or "").startswith("user-")


def is_seed_email(email: str) -> bool:
    return "+seed-" in (email or "").lower()

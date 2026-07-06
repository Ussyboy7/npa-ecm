"""Login MFA challenge and verification helpers."""

from __future__ import annotations

import uuid
from typing import Any

import pyotp
from django.conf import settings
from django.core.cache import cache

from accounts.models import LoginSecuritySettings, SealOTP, User


MFA_CHALLENGE_TTL = 300  # 5 minutes


def get_or_create_login_security(user: User) -> LoginSecuritySettings:
    settings_obj, _ = LoginSecuritySettings.objects.get_or_create(user=user)
    return settings_obj


def login_mfa_globally_required() -> bool:
    return getattr(settings, "LOGIN_MFA_REQUIRED", False)


def user_requires_login_mfa(user: User, security: LoginSecuritySettings | None = None) -> bool:
    if not user.is_active:
        return False
    if login_mfa_globally_required():
        return True
    security = security or get_or_create_login_security(user)
    return security.mfa_required or security.mfa_enabled


def available_login_mfa_methods(user: User, security: LoginSecuritySettings) -> list[str]:
    methods: list[str] = []
    if user.email:
        methods.append("email")
    if security.totp_secret and security.totp_confirmed:
        methods.append("totp")
    return methods


def create_mfa_challenge(user: User) -> dict[str, Any]:
    challenge_id = str(uuid.uuid4())
    cache.set(
        f"login_mfa:{challenge_id}",
        {"user_id": str(user.id)},
        timeout=MFA_CHALLENGE_TTL,
    )
    security = get_or_create_login_security(user)
    return {
        "challenge_id": challenge_id,
        "methods": available_login_mfa_methods(user, security),
        "expires_in": MFA_CHALLENGE_TTL,
    }


def get_challenge_user(challenge_id: str) -> User | None:
    payload = cache.get(f"login_mfa:{challenge_id}")
    if not payload:
        return None
    try:
        return User.objects.get(pk=payload["user_id"], is_active=True)
    except User.DoesNotExist:
        return None


def clear_mfa_challenge(challenge_id: str) -> None:
    cache.delete(f"login_mfa:{challenge_id}")


def verify_login_mfa_code(user: User, method: str, code: str) -> bool:
    security = get_or_create_login_security(user)
    if method == "totp":
        if not security.totp_secret or not security.totp_confirmed:
            return False
        totp = pyotp.TOTP(security.totp_secret)
        return totp.verify(code, valid_window=1)
    if method == "email":
        otp = (
            SealOTP.objects.filter(user=user, purpose="login", is_used=False)
            .order_by("-created_at")
            .first()
        )
        if not otp:
            return False
        return otp.verify(code)
    return False


def send_login_email_otp(user: User) -> str:
    if not user.email:
        raise ValueError("User has no email address for login OTP")

    from django.core.mail import send_mail

    otp = SealOTP.create_for_user(user=user, purpose="login", validity_minutes=10)
    send_mail(
        subject=f"NPA ECM - Login Verification Code: {otp.code}",
        message=(
            f"Your NPA ECM login verification code is:\n\n{otp.code}\n\n"
            "This code expires in 10 minutes.\n\n"
            "If you did not attempt to sign in, contact ICT immediately."
        ),
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@npa.gov.ng"),
        recipient_list=[user.email],
        fail_silently=True,
    )
    email = user.email
    masked = email[:2] + "***" + email[email.index("@") :]
    return masked

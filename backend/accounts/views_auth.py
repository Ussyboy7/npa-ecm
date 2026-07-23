"""Authentication extensions: login MFA, OIDC SSO, permission checks."""

from __future__ import annotations

import base64
import logging
from io import BytesIO

from django.conf import settings
from django.http import HttpResponseRedirect
import pyotp
import qrcode
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from audit.services import AuditService
from accounts.login_mfa import (
    available_login_mfa_methods,
    clear_mfa_challenge,
    create_mfa_challenge,
    get_challenge_user,
    get_or_create_login_security,
    send_login_email_otp,
    user_requires_login_mfa,
    verify_login_mfa_code,
)
from accounts.models import LoginSecuritySettings, User
from accounts.oidc import (
    build_authorization_url,
    create_oidc_state,
    exchange_code_for_tokens,
    fetch_userinfo,
    oidc_enabled,
    pop_oidc_state,
    resolve_username_from_claims,
)
from accounts.views import set_auth_token_cookies
from organization.permission_utils import explain_access_context, explain_permission_denial
from organization.permissions_catalog import get_permission_catalog

logger = logging.getLogger(__name__)


def issue_tokens_for_user(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class PermissionCheckView(APIView):
    """Explain whether the current user has a given permission."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        permission = request.query_params.get("permission", "").strip()
        if not permission:
            raise ValidationError({"permission": "Query parameter 'permission' is required."})
        payload = explain_permission_denial(request.user, permission)
        return Response(payload)


class AccessExplainView(APIView):
    """Explain why a resource detail view may be blocked (404/403 on correspondence/DMS detail)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        context = request.query_params.get("context", "").strip()
        if not context:
            raise ValidationError({"context": "Query parameter 'context' is required."})
        try:
            payload = explain_access_context(request.user, context)
        except ValueError as exc:
            raise ValidationError({"context": str(exc)}) from exc
        return Response(payload)


class PermissionCatalogView(APIView):
    """Return the canonical permission key catalog for admin UI."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"permissions": get_permission_catalog()})


class LoginMFAStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        security = get_or_create_login_security(request.user)
        return Response(
            {
                "mfa_enabled": security.mfa_enabled,
                "mfa_required": security.mfa_required,
                "totp_confirmed": security.totp_confirmed,
                "preferred_method": security.preferred_method,
                "available_methods": available_login_mfa_methods(request.user, security),
                "email": request.user.email,
            }
        )


class LoginMFAEnableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        security = get_or_create_login_security(request.user)
        security.mfa_enabled = True
        security.save(update_fields=["mfa_enabled", "updated_at"])
        return Response({"mfa_enabled": True})


class LoginMFADisableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        security = get_or_create_login_security(request.user)
        if security.mfa_required:
            raise ValidationError({"detail": "MFA is required for your account and cannot be disabled."})
        security.mfa_enabled = False
        security.totp_secret = ""
        security.totp_confirmed = False
        security.save(
            update_fields=["mfa_enabled", "totp_secret", "totp_confirmed", "updated_at"]
        )
        return Response({"mfa_enabled": False})


class LoginTOTPSetupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        security = get_or_create_login_security(request.user)
        force = bool(request.data.get("force_regenerate", False))
        if not security.totp_secret or force:
            security.totp_secret = pyotp.random_base32()
            security.totp_confirmed = False
            security.mfa_enabled = True
            security.save(
                update_fields=["totp_secret", "totp_confirmed", "mfa_enabled", "updated_at"]
            )

        totp = pyotp.TOTP(security.totp_secret)
        uri = totp.provisioning_uri(
            name=request.user.email or request.user.username,
            issuer_name="NPA ECM",
        )
        qr = qrcode.make(uri, image_factory=qrcode.image.pil.PilImage)
        buffer = BytesIO()
        qr.save(buffer, format="PNG")
        qr_b64 = base64.b64encode(buffer.getvalue()).decode("ascii")

        return Response(
            {
                "secret": security.totp_secret,
                "provisioning_uri": uri,
                "qr_code": f"data:image/png;base64,{qr_b64}",
            }
        )


class LoginTOTPVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = str(request.data.get("code", "")).strip()
        if not code:
            raise ValidationError({"code": "Verification code is required."})

        security = get_or_create_login_security(request.user)
        if not security.totp_secret:
            raise ValidationError({"detail": "TOTP is not set up."})

        totp = pyotp.TOTP(security.totp_secret)
        if not totp.verify(code, valid_window=1):
            raise ValidationError({"detail": "Invalid verification code."})

        security.totp_confirmed = True
        security.mfa_enabled = True
        security.preferred_method = LoginSecuritySettings.PreferredMethod.TOTP
        security.save(
            update_fields=["totp_confirmed", "mfa_enabled", "preferred_method", "updated_at"]
        )
        return Response({"totp_confirmed": True, "mfa_enabled": True})


class LoginMFAVerifyView(APIView):
    """Complete login after password step when MFA is required."""

    permission_classes = [AllowAny]

    def post(self, request):
        challenge_id = request.data.get("challenge_id")
        code = str(request.data.get("code", "")).strip()
        method = str(request.data.get("method", "email")).strip().lower()

        if not challenge_id or not code:
            raise ValidationError({"detail": "challenge_id and code are required."})

        user = get_challenge_user(challenge_id)
        if not user:
            raise AuthenticationFailed("MFA challenge expired or invalid. Please sign in again.")

        if method not in available_login_mfa_methods(
            user, get_or_create_login_security(user)
        ):
            raise ValidationError({"method": f"Method '{method}' is not available."})

        if not verify_login_mfa_code(user, method, code):
            raise AuthenticationFailed("Invalid verification code.")

        clear_mfa_challenge(challenge_id)
        tokens = issue_tokens_for_user(user)

        try:
            from audit.models import ActivityLog

            AuditService.log_user_activity(
                user=user,
                action=ActivityLog.ActionType.USER_LOGIN,
                target_user=None,
                request=request,
                description="User logged in successfully (MFA verified)",
            )
        except Exception as exc:
            logger.warning("Failed to audit MFA login: %s", exc)

        response = Response(tokens)
        set_auth_token_cookies(response, tokens["access"], tokens["refresh"], request=request)
        return response


class LoginMFARequestEmailView(APIView):
    """Send login email OTP during MFA challenge (unauthenticated)."""

    permission_classes = [AllowAny]

    def post(self, request):
        challenge_id = request.data.get("challenge_id")
        user = get_challenge_user(challenge_id)
        if not user:
            raise AuthenticationFailed("MFA challenge expired or invalid.")
        if not user.email:
            raise ValidationError({"detail": "No email on file for this account."})
        masked = send_login_email_otp(user)
        return Response({"message": f"Verification code sent to {masked}", "expires_in": 600})


class OIDCStatusView(APIView):
    """Report whether enterprise SSO is configured (for login UI)."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"enabled": oidc_enabled()})


class OIDCLoginView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not oidc_enabled():
            raise ValidationError(
                {"detail": "OIDC SSO is not configured. Set OIDC_ENABLED and related env vars."}
            )
        state, nonce = create_oidc_state()
        url = build_authorization_url(state, nonce)
        return HttpResponseRedirect(url)


class OIDCCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not oidc_enabled():
            raise ValidationError({"detail": "OIDC SSO is not configured."})

        error = request.query_params.get("error")
        if error:
            frontend = settings.FRONTEND_BASE_URL.rstrip("/")
            return HttpResponseRedirect(f"{frontend}/login?sso_error={error}")

        code = request.query_params.get("code")
        state = request.query_params.get("state")
        if not code or not state:
            raise ValidationError({"detail": "Missing OIDC code or state."})

        state_payload = pop_oidc_state(state)
        if not state_payload:
            raise AuthenticationFailed("Invalid or expired OIDC state.")

        token_data = exchange_code_for_tokens(code)
        access_token = token_data.get("access_token")
        if not access_token:
            raise AuthenticationFailed("OIDC token response missing access_token.")

        claims = fetch_userinfo(access_token)
        subject = str(claims.get("sub", ""))
        username = resolve_username_from_claims(claims)
        email = claims.get("email", "")

        user = User.objects.filter(external_auth_subject=subject).first()
        if not user and email:
            user = User.objects.filter(email__iexact=email).first()
        if not user:
            user = User.objects.filter(username__iexact=username).first()

        if not user:
            user = User.objects.create(
                username=username,
                email=email or "",
                first_name=claims.get("given_name", "") or "",
                last_name=claims.get("family_name", "") or "",
                auth_provider="oidc",
                external_auth_subject=subject,
                is_active=True,
            )
        else:
            user.auth_provider = "oidc"
            user.external_auth_subject = subject or user.external_auth_subject
            if email and not user.email:
                user.email = email
            user.save(update_fields=["auth_provider", "external_auth_subject", "email"])

        tokens = issue_tokens_for_user(user)
        frontend = settings.FRONTEND_BASE_URL.rstrip("/")
        response = HttpResponseRedirect(f"{frontend}/auth/callback")
        set_auth_token_cookies(response, tokens["access"], tokens["refresh"], request=request)
        return response

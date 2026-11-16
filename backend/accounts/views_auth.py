"""Authentication extensions: login MFA, OIDC SSO, permission checks."""

from __future__ import annotations

import logging

from django.conf import settings
from django.http import HttpResponseRedirect
import pyotp
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from audit.services import AuditService
from common.throttles import OTPRateThrottle, PasswordChangeRateThrottle, TotpSetupRateThrottle
from accounts.login_mfa import (
    available_login_mfa_methods,
    clear_mfa_challenge,
    create_mfa_challenge,
    get_challenge_user,
    get_or_create_login_security,
    record_mfa_failure,
    MFA_MAX_ATTEMPTS,
    send_login_email_otp,
    user_requires_login_mfa,
    verify_login_mfa_code,
)
from accounts.services import (
    BackupCodeService,
    StepUpService,
    TotpProvisioningService,
    TotpVerificationService,
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
from accounts.views import clear_impersonation_cookies, set_auth_token_cookies
from organization.permission_utils import explain_access_context, explain_permission_denial
from organization.permission_utils import resolve_page_access
from organization.permissions_catalog import get_permission_catalog, get_permission_presets

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


class PageAccessView(APIView):
    """Return the authenticated user's resolved page access from backend rules."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"pages": resolve_page_access(request.user)})


class PermissionCatalogView(APIView):
    """Return the canonical permission key catalog for admin UI."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "permissions": get_permission_catalog(),
                "presets": get_permission_presets(),
            }
        )


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
                "backup_codes_remaining": BackupCodeService.remaining(request.user),
                "email": request.user.email,
            }
        )


class LoginMFAEnableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        security = get_or_create_login_security(request.user)
        available = available_login_mfa_methods(request.user, security)
        if not {"email", "totp"}.intersection(available):
            raise ValidationError(
                {
                    "detail": (
                        "Add an email or confirm an authenticator app before enabling "
                        "login MFA. Backup codes are not a primary sign-in method."
                    )
                }
            )
        security.mfa_enabled = True
        security.save(update_fields=["mfa_enabled", "updated_at"])
        from audit.models import ActivityLog

        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_UPDATED,
            request=request,
            description="Enabled login MFA",
        )
        return Response({"mfa_enabled": True})


class LoginMFADisableView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [PasswordChangeRateThrottle]

    def post(self, request):
        security = get_or_create_login_security(request.user)
        if security.mfa_required:
            raise ValidationError({"detail": "MFA is required for your account and cannot be disabled."})
        StepUpService.assert_verified(
            request,
            password=request.data.get("current_password"),
            code=request.data.get("code"),
        )
        security.mfa_enabled = False
        security.totp_secret = ""
        security.totp_confirmed = False
        security.totp_last_used_step = 0
        security.save(
            update_fields=[
                "mfa_enabled",
                "totp_secret",
                "totp_confirmed",
                "totp_last_used_step",
                "updated_at",
            ]
        )
        from audit.models import ActivityLog

        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_UPDATED,
            request=request,
            description="Disabled login MFA",
        )
        return Response({"mfa_enabled": False})


class LoginTOTPSetupView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [TotpSetupRateThrottle]

    def post(self, request):
        security = get_or_create_login_security(request.user)
        force = bool(request.data.get("force_regenerate", False))
        if security.totp_secret or force:
            StepUpService.assert_verified(
                request,
                password=request.data.get("current_password"),
                code=request.data.get("code"),
            )
        if force and not request.user.email:
            if security.mfa_required:
                raise ValidationError(
                    {"detail": "Add an email fallback before replacing a required authenticator."}
                )
        if not security.totp_secret or force:
            security.totp_secret = pyotp.random_base32()
            security.totp_confirmed = False
            security.totp_last_used_step = 0
            if not request.user.email and not security.mfa_required:
                security.mfa_enabled = False
            security.save(
                update_fields=[
                    "totp_secret",
                    "totp_confirmed",
                    "totp_last_used_step",
                    "mfa_enabled",
                    "updated_at",
                ]
            )

        return Response(
            TotpProvisioningService.build_payload(security.totp_secret, request.user)
        )


class LoginTOTPVerifyView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        code = str(request.data.get("code", "")).strip()
        if not code:
            raise ValidationError({"code": "Verification code is required."})

        security = get_or_create_login_security(request.user)
        if not security.totp_secret:
            raise ValidationError({"detail": "TOTP is not set up."})

        if not TotpVerificationService.verify_and_consume(security, code):
            raise ValidationError({"detail": "Invalid verification code."})

        security.totp_confirmed = True
        security.mfa_enabled = True
        security.preferred_method = LoginSecuritySettings.PreferredMethod.TOTP
        security.save(
            update_fields=["totp_confirmed", "mfa_enabled", "preferred_method", "updated_at"]
        )
        backup_codes = BackupCodeService.generate(request.user)

        from audit.models import ActivityLog

        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_UPDATED,
            request=request,
            description="Confirmed login authenticator app",
        )
        return Response(
            {
                "totp_confirmed": True,
                "mfa_enabled": True,
                "backup_codes": backup_codes,
            }
        )


class LoginMFAVerifyView(APIView):
    """Complete login after password step when MFA is required."""

    permission_classes = [AllowAny]
    # A stale session cookie must not block completion of a new login.
    authentication_classes = []
    throttle_classes = [OTPRateThrottle]

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
            attempts = record_mfa_failure(challenge_id)
            if attempts >= MFA_MAX_ATTEMPTS:
                clear_mfa_challenge(challenge_id)
                raise AuthenticationFailed(
                    "Too many failed verification attempts. Please sign in again."
                )
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

        response = Response({"detail": "MFA verified."})
        clear_impersonation_cookies(response, request=request)
        set_auth_token_cookies(response, tokens["access"], tokens["refresh"], request=request)
        return response


class LoginMFARequestEmailView(APIView):
    """Send login email OTP during MFA challenge (unauthenticated)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [OTPRateThrottle]

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
        clear_impersonation_cookies(response, request=request)
        set_auth_token_cookies(response, tokens["access"], tokens["refresh"], request=request)
        return response

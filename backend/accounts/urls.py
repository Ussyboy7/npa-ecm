"""URL routes for the accounts app."""

from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenRefreshView,
    TokenVerifyView,
)

from .views import (
    ApplySealView,
    AuthImpersonateView,
    AuthTokenObtainPairView,
    ChangePasswordView,
    CurrentUserView,
    DisableTOTPView,
    ExecutiveSignatureView,
    RequestEmailOTPView,
    SealImageUploadView,
    SealSignatureImageView,
    SealVerificationView,
    SetupTOTPView,
    SignatureTemplateViewSet,
    TwoFactorStatusView,
    UpdatePreferred2FAView,
    UserSignaturePreferencesViewSet,
    UserViewSet,
    VerifyEmailOTPView,
    VerifyTOTPView,
)
from .views_auth import (
    AccessExplainView,
    LoginMFADisableView,
    LoginMFAEnableView,
    LoginMFARequestEmailView,
    LoginMFAStatusView,
    LoginMFAVerifyView,
    LoginTOTPSetupView,
    LoginTOTPVerifyView,
    OIDCCallbackView,
    OIDCLoginView,
    OIDCStatusView,
    PermissionCatalogView,
    PermissionCheckView,
)


router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"signature-templates", SignatureTemplateViewSet, basename="signature-template")
router.register(r"signature-preferences", UserSignaturePreferencesViewSet, basename="signature-preferences")


urlpatterns = [
    # Auth endpoints
    path("auth/token/", AuthTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/mfa/", LoginMFAVerifyView.as_view(), name="token_mfa_verify"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("auth/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("auth/impersonate/", AuthImpersonateView.as_view(), name="token_impersonate"),
    path("auth/me/", CurrentUserView.as_view(), name="current_user"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("auth/permissions/check/", PermissionCheckView.as_view(), name="permission_check"),
    path("auth/permissions/explain-access/", AccessExplainView.as_view(), name="access_explain"),
    path("auth/permissions/catalog/", PermissionCatalogView.as_view(), name="permission_catalog"),
    # OIDC SSO
    path("auth/oidc/status/", OIDCStatusView.as_view(), name="oidc_status"),
    path("auth/oidc/login/", OIDCLoginView.as_view(), name="oidc_login"),
    path("auth/oidc/callback/", OIDCCallbackView.as_view(), name="oidc_callback"),
    # Login MFA management
    path("auth/login-mfa/status/", LoginMFAStatusView.as_view(), name="login_mfa_status"),
    path("auth/login-mfa/enable/", LoginMFAEnableView.as_view(), name="login_mfa_enable"),
    path("auth/login-mfa/disable/", LoginMFADisableView.as_view(), name="login_mfa_disable"),
    path("auth/login-mfa/totp/setup/", LoginTOTPSetupView.as_view(), name="login_mfa_totp_setup"),
    path("auth/login-mfa/totp/verify/", LoginTOTPVerifyView.as_view(), name="login_mfa_totp_verify"),
    path("auth/login-mfa/email/request/", LoginMFARequestEmailView.as_view(), name="login_mfa_email_request"),
    # Executive Signature endpoints
    path("signature/", ExecutiveSignatureView.as_view(), name="executive_signature"),
    # Seal endpoints
    path("seal/apply/", ApplySealView.as_view(), name="seal_apply"),
    path("seal/signature-image/<str:serial_number>/", SealSignatureImageView.as_view(), name="seal_signature_image"),
    path("seal/image/<str:serial_number>/", SealImageUploadView.as_view(), name="seal_image_upload"),
    path("seal/verify/<str:serial_number>/", SealVerificationView.as_view(), name="seal_verify"),
    # Seal 2FA endpoints
    path("2fa/status/", TwoFactorStatusView.as_view(), name="2fa_status"),
    path("2fa/email/request/", RequestEmailOTPView.as_view(), name="2fa_email_request"),
    path("2fa/email/verify/", VerifyEmailOTPView.as_view(), name="2fa_email_verify"),
    path("2fa/totp/setup/", SetupTOTPView.as_view(), name="2fa_totp_setup"),
    path("2fa/totp/verify/", VerifyTOTPView.as_view(), name="2fa_totp_verify"),
    path("2fa/totp/disable/", DisableTOTPView.as_view(), name="2fa_totp_disable"),
    path("2fa/preferred/", UpdatePreferred2FAView.as_view(), name="2fa_preferred"),
]

urlpatterns += router.urls

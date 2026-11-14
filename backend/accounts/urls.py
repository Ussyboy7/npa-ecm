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
    BackupCodeStatusView,
    ChangePasswordView,
    CurrentUserPhotoView,
    CurrentUserView,
    DisableEmailOTPView,
    DisableTOTPView,
    GenerateBackupCodesView,
    ExecutiveSignatureView,
    InitialPasswordSetView,
    RequestEmailOTPView,
    SealImageView,
    SealDocumentCheckView,
    SealSignatureImageView,
    SealVerificationView,
    SetupTOTPView,
    SignatureTemplateViewSet,
    TwoFactorStatusView,
    UpdatePreferred2FAView,
    UserSignaturePreferencesViewSet,
    UserViewSet,
    VerifyBackupCodeView,
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
    PageAccessView,
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
    path("auth/me/photo/", CurrentUserPhotoView.as_view(), name="current_user_photo"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change_password"),
    path(
        "auth/initial-password/",
        InitialPasswordSetView.as_view(),
        name="initial_password_set",
    ),
    path("auth/permissions/check/", PermissionCheckView.as_view(), name="permission_check"),
    path("auth/permissions/explain-access/", AccessExplainView.as_view(), name="access_explain"),
    path("auth/permissions/catalog/", PermissionCatalogView.as_view(), name="permission_catalog"),
    path("auth/permissions/pages/", PageAccessView.as_view(), name="page_access"),
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
    path("seal/image/<str:serial_number>/", SealImageView.as_view(), name="seal_image"),
    path("seal/verify/<str:serial_number>/", SealVerificationView.as_view(), name="seal_verify"),
    path(
        "seal/document-check/<str:serial_number>/",
        SealDocumentCheckView.as_view(),
        name="seal_document_check",
    ),
    # Seal 2FA endpoints
    path("2fa/status/", TwoFactorStatusView.as_view(), name="2fa_status"),
    path("2fa/email/request/", RequestEmailOTPView.as_view(), name="2fa_email_request"),
    path("2fa/email/verify/", VerifyEmailOTPView.as_view(), name="2fa_email_verify"),
    path("2fa/email/disable/", DisableEmailOTPView.as_view(), name="2fa_email_disable"),
    path("2fa/totp/setup/", SetupTOTPView.as_view(), name="2fa_totp_setup"),
    path("2fa/totp/verify/", VerifyTOTPView.as_view(), name="2fa_totp_verify"),
    path("2fa/totp/disable/", DisableTOTPView.as_view(), name="2fa_totp_disable"),
    path("2fa/preferred/", UpdatePreferred2FAView.as_view(), name="2fa_preferred"),
    path("2fa/backup-codes/status/", BackupCodeStatusView.as_view(), name="backup_code_status"),
    path("2fa/backup-codes/generate/", GenerateBackupCodesView.as_view(), name="backup_code_generate"),
    path("2fa/backup-codes/verify/", VerifyBackupCodeView.as_view(), name="backup_code_verify"),
]

urlpatterns += router.urls

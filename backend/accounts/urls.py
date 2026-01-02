"""URL routes for the accounts app."""

from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenRefreshView,
    TokenVerifyView,
)

from .views import (
    AuthImpersonateView, 
    AuthTokenObtainPairView, 
    ChangePasswordView, 
    CurrentUserView, 
    UserViewSet,
    ExecutiveSignatureView,
    SealVerificationView,
    ApplySealView,
    SignatureTemplateViewSet,
    UserSignaturePreferencesViewSet,
    # 2FA views
    TwoFactorStatusView,
    RequestEmailOTPView,
    VerifyEmailOTPView,
    SetupTOTPView,
    VerifyTOTPView,
    DisableTOTPView,
    UpdatePreferred2FAView,
)


router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"signature-templates", SignatureTemplateViewSet, basename="signature-template")
router.register(r"signature-preferences", UserSignaturePreferencesViewSet, basename="signature-preferences")


urlpatterns = [
    # Auth endpoints
    path("auth/token/", AuthTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("auth/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("auth/impersonate/", AuthImpersonateView.as_view(), name="token_impersonate"),
    path("auth/me/", CurrentUserView.as_view(), name="current_user"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change_password"),
    
    # Executive Signature endpoints
    path("signature/", ExecutiveSignatureView.as_view(), name="executive_signature"),
    
    # Seal endpoints
    path("seal/apply/", ApplySealView.as_view(), name="seal_apply"),
    path("seal/verify/<str:serial_number>/", SealVerificationView.as_view(), name="seal_verify"),
    
    # 2FA endpoints
    path("2fa/status/", TwoFactorStatusView.as_view(), name="2fa_status"),
    path("2fa/email/request/", RequestEmailOTPView.as_view(), name="2fa_email_request"),
    path("2fa/email/verify/", VerifyEmailOTPView.as_view(), name="2fa_email_verify"),
    path("2fa/totp/setup/", SetupTOTPView.as_view(), name="2fa_totp_setup"),
    path("2fa/totp/verify/", VerifyTOTPView.as_view(), name="2fa_totp_verify"),
    path("2fa/totp/disable/", DisableTOTPView.as_view(), name="2fa_totp_disable"),
    path("2fa/preferred/", UpdatePreferred2FAView.as_view(), name="2fa_preferred"),
]

urlpatterns += router.urls

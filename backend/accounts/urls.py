"""URL routes for the accounts app."""

from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenRefreshView,
    TokenVerifyView,
)

from .views import AuthImpersonateView, AuthTokenObtainPairView, ChangePasswordView, CurrentUserView, UserViewSet


router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")


urlpatterns = [
    path("auth/token/", AuthTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("auth/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("auth/impersonate/", AuthImpersonateView.as_view(), name="token_impersonate"),
    path("auth/me/", CurrentUserView.as_view(), name="current_user"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change_password"),
]

urlpatterns += router.urls

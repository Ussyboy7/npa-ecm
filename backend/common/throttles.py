"""Custom DRF throttle classes for rate limiting."""

from rest_framework.throttling import UserRateThrottle


class LoginRateThrottle(UserRateThrottle):
    scope = "login"


class OTPRateThrottle(UserRateThrottle):
    scope = "otp"


class PasswordChangeRateThrottle(UserRateThrottle):
    scope = "password_change"

"""Custom DRF throttle classes for rate limiting."""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(UserRateThrottle):
    scope = "login"


class OTPRateThrottle(UserRateThrottle):
    scope = "otp"


class PasswordChangeRateThrottle(UserRateThrottle):
    scope = "password_change"


class TotpSetupRateThrottle(UserRateThrottle):
    scope = "totp_setup"


class AnonSealImageThrottle(AnonRateThrottle):
    """IP-scoped limit for the public seal-image route."""

    scope = "seal_image"


class AnonSealVerifyThrottle(AnonRateThrottle):
    """IP-scoped limit for the public seal verification lookup."""

    scope = "seal_verify"

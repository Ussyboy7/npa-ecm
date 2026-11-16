from drf_spectacular.extensions import OpenApiAuthenticationExtension

from .auth_cookies import AUTH_ACCESS_COOKIE_NAME


class CookieJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "accounts.authentication.CookieJWTAuthentication"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": AUTH_ACCESS_COOKIE_NAME,
            "description": (
                "httpOnly access-token cookie. Unsafe methods also require the "
                "X-CSRF-Token header."
            ),
        }

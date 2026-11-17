from django.test import SimpleTestCase

from accounts.auth_cookies import AUTH_ACCESS_COOKIE_NAME
from accounts.schema import CookieJWTAuthenticationScheme


class CookieJWTAuthenticationSchemeTests(SimpleTestCase):
    def test_documents_the_http_only_access_cookie(self):
        definition = CookieJWTAuthenticationScheme(None).get_security_definition(None)

        self.assertEqual(definition["type"], "apiKey")
        self.assertEqual(definition["in"], "cookie")
        self.assertEqual(definition["name"], AUTH_ACCESS_COOKIE_NAME)

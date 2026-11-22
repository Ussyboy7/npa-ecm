from types import SimpleNamespace

import pyotp
from django.test import SimpleTestCase

from accounts.services import TotpProvisioningService


class TotpProvisioningServiceTests(SimpleTestCase):
    # 32 base32 characters = 160 bits, above pyotp's 112-bit minimum.
    SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"

    def test_builds_authenticator_payload_from_one_secret(self):
        user = SimpleNamespace(email="officer@npa.gov.ng", username="officer")
        secret = self.SECRET

        payload = TotpProvisioningService.build_payload(secret, user)

        self.assertEqual(payload["secret"], secret)
        parsed = pyotp.parse_uri(payload["provisioning_uri"])
        self.assertEqual(parsed.secret, secret)
        self.assertIn("NPA%20ECM", payload["provisioning_uri"])
        self.assertIn("officer%40npa.gov.ng", payload["provisioning_uri"])
        self.assertTrue(payload["qr_code"].startswith("data:image/png;base64,"))

    def test_falls_back_to_username_without_email(self):
        user = SimpleNamespace(email="", username="officer")

        payload = TotpProvisioningService.build_payload(self.SECRET, user)

        self.assertIn("officer", payload["provisioning_uri"])

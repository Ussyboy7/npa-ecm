from types import SimpleNamespace

import pyotp
from django.test import SimpleTestCase

from accounts.services import TotpProvisioningService


class TotpProvisioningServiceTests(SimpleTestCase):
    def test_builds_authenticator_payload_from_one_secret(self):
        user = SimpleNamespace(email="officer@npa.gov.ng", username="officer")
        secret = "JBSWY3DPEHPK3PXP"

        payload = TotpProvisioningService.build_payload(secret, user)

        self.assertEqual(payload["secret"], secret)
        parsed = pyotp.parse_uri(payload["provisioning_uri"])
        self.assertEqual(parsed.secret, secret)
        self.assertIn("NPA%20ECM", payload["provisioning_uri"])
        self.assertIn("officer%40npa.gov.ng", payload["provisioning_uri"])
        self.assertTrue(payload["qr_code"].startswith("data:image/png;base64,"))

    def test_falls_back_to_username_without_email(self):
        user = SimpleNamespace(email="", username="officer")

        payload = TotpProvisioningService.build_payload(
            "JBSWY3DPEHPK3PXP", user
        )

        self.assertIn("officer", payload["provisioning_uri"])

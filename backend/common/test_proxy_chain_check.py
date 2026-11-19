from django.test import SimpleTestCase, override_settings

from common.checks import throttle_proxy_chain_check


class ThrottleProxyChainCheckTests(SimpleTestCase):
    @override_settings(
        DJANGO_ENV="prod",
        THROTTLE_NUM_PROXIES_SET=False,
        REST_FRAMEWORK={"NUM_PROXIES": 1},
    )
    def test_warns_when_hop_count_is_not_configured_outside_local(self):
        messages = throttle_proxy_chain_check(None)

        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0].id, "ecm.W001")
        self.assertIn("THROTTLE_NUM_PROXIES", messages[0].hint)

    @override_settings(
        DJANGO_ENV="prod",
        THROTTLE_NUM_PROXIES_SET=True,
        REST_FRAMEWORK={"NUM_PROXIES": 2},
    )
    def test_passes_when_hop_count_is_explicit(self):
        self.assertEqual(throttle_proxy_chain_check(None), [])

    @override_settings(
        DJANGO_ENV="local",
        THROTTLE_NUM_PROXIES_SET=False,
        REST_FRAMEWORK={"NUM_PROXIES": 1},
    )
    def test_local_development_does_not_warn(self):
        self.assertEqual(throttle_proxy_chain_check(None), [])

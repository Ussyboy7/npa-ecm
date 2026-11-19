"""Deployment checks for settings that must match the real proxy chain."""

from django.conf import settings
from django.core.checks import Tags, Warning, register


@register(Tags.security)
def throttle_proxy_chain_check(app_configs, **kwargs):
    """Warn when the trusted-proxy hop count was never configured explicitly.

    DRF resolves throttled clients from ``X-Forwarded-For`` using this hop
    count. A value that is too low keys every client on the proxy address, so
    one bucket exhausts for everyone; a value that is too high lets clients
    choose their own throttle key by injecting header entries.
    """
    if getattr(settings, "DJANGO_ENV", "local") == "local":
        return []
    if getattr(settings, "THROTTLE_NUM_PROXIES_SET", False):
        return []

    configured = settings.REST_FRAMEWORK.get("NUM_PROXIES")
    return [
        Warning(
            "THROTTLE_NUM_PROXIES is not set for this non-local environment.",
            hint=(
                f"DRF is trusting {configured} proxy hop(s) by default. Set "
                "THROTTLE_NUM_PROXIES to the exact number of proxies that append "
                "to X-Forwarded-For in front of Django (nginx, plus any "
                "TLS-terminating load balancer or CDN). Too low buckets every "
                "client behind the proxy; too high allows X-Forwarded-For "
                "spoofing. See docs/ops/proxy-chain.md."
            ),
            id="ecm.W001",
        )
    ]

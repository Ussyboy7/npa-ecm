"""Detect configuration drift across deployments (roles, beat tasks, env vars)."""

from __future__ import annotations

import os

from django.conf import settings
from django.core.management.base import BaseCommand

from ecm_backend.beat_schedules import CELERY_BEAT_SCHEDULE
from organization.models import Role
from organization.permissions_catalog import PERMISSION_KEYS, ROLE_PERMISSION_PRESETS, normalize_permissions


REQUIRED_STRICT_ENV_VARS: tuple[str, ...] = (
    "DJANGO_SECRET_KEY",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "DB_HOST",
    "CORS_ALLOWED_ORIGINS",
    "CELERY_BROKER_URL",
)

FORBIDDEN_STRICT_VALUES: dict[str, tuple[str, ...]] = {
    "DJANGO_SECRET_KEY": (
        "dev-secret-key-change-in-production",
        "replace-with-strong-production-secret",
        "ci-test-secret-key-not-for-production",
    ),
}


class Command(BaseCommand):
    help = "Check role permissions, Celery beat tasks, and required environment variables for drift."

    def add_arguments(self, parser):
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Exit with code 1 when any issue is found.",
        )
        parser.add_argument(
            "--skip-env",
            action="store_true",
            help="Skip environment variable checks (useful in CI before secrets are injected).",
        )

    def handle(self, *args, **options):
        strict = options["strict"]
        skip_env = options["skip_env"]
        issues: list[str] = []
        warnings: list[str] = []

        if not skip_env:
            issues.extend(self._check_env_vars())
            warnings.extend(self._check_security_warnings())

        issues.extend(self._check_role_permissions())
        issues.extend(self._check_celery_beat_tasks())

        for warning in warnings:
            self.stdout.write(self.style.WARNING(f"WARN: {warning}"))

        for issue in issues:
            self.stdout.write(self.style.ERROR(f"FAIL: {issue}"))

        if not issues and not warnings:
            self.stdout.write(self.style.SUCCESS("Environment parity check passed."))
            return

        if issues:
            self.stdout.write(
                self.style.ERROR(f"Parity check failed with {len(issues)} issue(s).")
            )
            if strict:
                raise SystemExit(1)
        elif strict and warnings:
            self.stdout.write(
                self.style.WARNING(f"Parity check passed with {len(warnings)} warning(s).")
            )

    def _check_env_vars(self) -> list[str]:
        issues: list[str] = []
        django_env = os.environ.get("DJANGO_ENV", "local")
        is_strict = django_env != "local"

        if not is_strict:
            return issues

        for var in REQUIRED_STRICT_ENV_VARS:
            value = os.environ.get(var, "").strip()
            if not value:
                issues.append(f"Missing required environment variable: {var}")
                continue
            forbidden = FORBIDDEN_STRICT_VALUES.get(var, ())
            if value in forbidden:
                issues.append(f"{var} is still set to a placeholder value")

        if getattr(settings, "DEBUG", False):
            issues.append("DJANGO_DEBUG must be False in non-local environments")

        return issues

    def _check_security_warnings(self) -> list[str]:
        warnings: list[str] = []
        django_env = os.environ.get("DJANGO_ENV", "local")
        if django_env == "local":
            return warnings

        if not getattr(settings, "CLAMAV_SCAN_ENABLED", False):
            warnings.append(
                "CLAMAV_SCAN_ENABLED=false — enable virus scanning in production "
                "(install clamav, set CLAMAV_SCAN_ENABLED=true, verify CLAMAV_BINARY_PATH)"
            )

        if not getattr(settings, "SECURE_SSL_REDIRECT", False):
            warnings.append("SECURE_SSL_REDIRECT is disabled — ensure TLS terminates at the reverse proxy")

        return warnings

    def _check_role_permissions(self) -> list[str]:
        issues: list[str] = []

        for role in Role.objects.filter(is_active=True):
            preset = ROLE_PERMISSION_PRESETS.get(role.name)
            if preset is None:
                continue

            current = role.permissions if isinstance(role.permissions, dict) else {}
            normalized_current = normalize_permissions(current)
            normalized_preset = normalize_permissions(preset)

            missing_keys = [
                key
                for key in PERMISSION_KEYS
                if key in normalized_preset
                and normalized_preset[key]
                and not normalized_current.get(key)
            ]
            if missing_keys and not current:
                issues.append(
                    f"Role '{role.name}' has no permissions seeded "
                    f"(missing {len(missing_keys)} preset keys) — run setup_role_permissions"
                )
            elif missing_keys:
                issues.append(
                    f"Role '{role.name}' is missing preset permissions: {', '.join(missing_keys[:5])}"
                    + ("…" if len(missing_keys) > 5 else "")
                )

        return issues

    def _check_celery_beat_tasks(self) -> list[str]:
        issues: list[str] = []

        try:
            from django_celery_beat.models import PeriodicTask
        except Exception as exc:
            issues.append(f"Cannot import django_celery_beat: {exc}")
            return issues

        expected: dict[str, str] = {
            name: entry["task"] for name, entry in CELERY_BEAT_SCHEDULE.items()
        }
        tasks = {task.name: task for task in PeriodicTask.objects.all()}

        for name, task_path in expected.items():
            periodic = tasks.get(name)
            if periodic is None:
                issues.append(f"Missing Celery beat task '{name}' — run setup_celery_beat")
                continue
            if periodic.task != task_path:
                issues.append(
                    f"Celery beat task '{name}' points to '{periodic.task}' "
                    f"but expected '{task_path}'"
                )
            if not periodic.enabled:
                issues.append(f"Celery beat task '{name}' is disabled")

        return issues

"""Seed canonical role permissions for all NPA system roles."""

from __future__ import annotations

from django.core.management.base import BaseCommand

from organization.models import Role
from organization.permissions_catalog import ROLE_PERMISSION_PRESETS, normalize_permissions


class Command(BaseCommand):
    help = "Apply default permission presets to known system roles (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite existing permissions even when role already has keys set.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        updated = 0
        skipped = 0

        for role in Role.objects.all():
            preset = ROLE_PERMISSION_PRESETS.get(role.name)
            if preset is None:
                self.stdout.write(self.style.WARNING(f"No preset for role '{role.name}' — skipped"))
                skipped += 1
                continue

            current = role.permissions if isinstance(role.permissions, dict) else {}
            if current and not force and any(current.get(k) for k in preset):
                self.stdout.write(f"Role '{role.name}' already has permissions — skipped (use --force)")
                skipped += 1
                continue

            merged = normalize_permissions({**preset, **(current if not force else {})})
            if force:
                merged = normalize_permissions(preset)

            role.permissions = merged
            role.save(update_fields=["permissions", "updated_at"])
            self.stdout.write(self.style.SUCCESS(f"Updated permissions for role '{role.name}'"))
            updated += 1

        self.stdout.write(self.style.SUCCESS(f"Done. Updated={updated}, skipped={skipped}"))

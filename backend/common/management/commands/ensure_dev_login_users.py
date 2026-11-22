"""Ensure the superadmin break-glass account exists (idempotent).

Real staff accounts come from the NPA nominal roll (``seed_demo_data`` or
``import_nominal_roll``). This command only provisions the single break-glass
administrator used to bootstrap a new environment.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from organization.models import Role

User = get_user_model()

SUPERADMIN = {
    "username": "superadmin",
    "email": "superadmin@npa.gov.ng",
    "first_name": "Super",
    "last_name": "Admin",
    "grade_level": "MDCS",
}

DEFAULT_PASSWORD = "ChangeMe123!"


class Command(BaseCommand):
    help = "Create or repair the superadmin break-glass login (no demo staff accounts)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=DEFAULT_PASSWORD,
            help=f"Password to set when the account is new or has no usable password (default: {DEFAULT_PASSWORD})",
        )
        parser.add_argument(
            "--force-password",
            action="store_true",
            help="Reset the password even if one is already set.",
        )

    def handle(self, *args, **options):
        username = SUPERADMIN["username"]
        password = options["password"]
        force_password = options["force_password"]

        role, _ = Role.objects.get_or_create(
            name="Super Admin",
            defaults={
                "description": "Super Administrator with full system access",
                "is_system": True,
            },
        )

        existing = User.objects.filter(username=username).first()

        # Never resurrect an account that was deliberately deactivated: this
        # command runs on every container start.
        if existing is not None and not existing.is_active:
            self.stdout.write(f"Skipped {username} (deactivated)")
            return

        if existing is not None:
            # Own credentials and admin flags only; leave the stored profile alone.
            user = existing
            user.is_staff = True
            user.is_superuser = True
            user.save(update_fields=["is_staff", "is_superuser"])
            created = False
        else:
            email = SUPERADMIN["email"]
            if User.objects.filter(email__iexact=email).exists():
                email = ""
            user, created = User.objects.update_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": SUPERADMIN["first_name"],
                    "last_name": SUPERADMIN["last_name"],
                    "grade_level": SUPERADMIN["grade_level"],
                    "system_role": role,
                    "is_active": True,
                    "is_staff": True,
                    "is_superuser": True,
                },
            )

        if force_password or created or not user.has_usable_password():
            user.set_password(password)
            user.save(update_fields=["password"])

        action = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} {user.username}. Sign in with the configured password."
            )
        )

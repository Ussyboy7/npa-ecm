"""Ensure default development login accounts exist (idempotent)."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from organization.models import Role

User = get_user_model()

DEV_USERS = (
    {
        "username": "superadmin",
        "email": "superadmin@npa.gov.ng",
        "first_name": "Super",
        "last_name": "Admin",
        "role_name": "Super Admin",
        "is_superuser": True,
        "is_staff": True,
        "grade_level": "MDCS",
    },
    {
        "username": "md",
        "email": "md@npa.gov.ng",
        "first_name": "Managing",
        "last_name": "Director",
        "role_name": "Managing Director",
        "grade_level": "MDCS",
    },
    {
        "username": "edfa",
        "email": "edfa@npa.gov.ng",
        "first_name": "Executive",
        "last_name": "Director FA",
        "role_name": "Executive Director",
        "grade_level": "EDCS",
    },
    {
        "username": "gmict",
        "email": "gmict@npa.gov.ng",
        "first_name": "General",
        "last_name": "Manager ICT",
        "role_name": "General Manager",
        "grade_level": "MSS1",
    },
    {
        "username": "pamd",
        "email": "pamd@npa.gov.ng",
        "first_name": "Grace",
        "last_name": "Nnaji",
        "role_name": "Personal Assistant",
        "grade_level": "SSS2",
    },
)

DEFAULT_PASSWORD = "ChangeMe123!"


class Command(BaseCommand):
    help = "Create or repair local dev login users (superadmin, md, edfa, gmict, pamd)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=DEFAULT_PASSWORD,
            help=f"Password to set when user is new or has no usable password (default: {DEFAULT_PASSWORD})",
        )
        parser.add_argument(
            "--force-password",
            action="store_true",
            help="Reset password for all dev users even if one already exists.",
        )

    def handle(self, *args, **options):
        password = options["password"]
        force_password = options["force_password"]
        created = updated = 0

        for spec in DEV_USERS:
            role, _ = Role.objects.get_or_create(
                name=spec["role_name"],
                defaults={"description": f"{spec['role_name']} (dev)"},
            )
            defaults = {
                "email": spec["email"],
                "first_name": spec["first_name"],
                "last_name": spec["last_name"],
                "system_role": role,
                "grade_level": spec.get("grade_level", ""),
                "is_active": True,
                "is_staff": spec.get("is_staff", False),
                "is_superuser": spec.get("is_superuser", False),
            }
            user, was_created = User.objects.update_or_create(
                username=spec["username"],
                defaults=defaults,
            )
            if was_created:
                created += 1
            else:
                updated += 1

            if was_created or not user.has_usable_password() or force_password:
                user.set_password(password)
                user.save(update_fields=["password"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Dev login users ready ({created} created, {updated} updated). "
                f"Try superadmin / {password}"
            )
        )

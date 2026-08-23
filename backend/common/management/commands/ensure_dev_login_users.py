"""Ensure default development login accounts exist (idempotent)."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from organization.models import Directorate, Division, Department, Office, Role

User = get_user_model()


def _resolve_id(model, name):
    """Look up an org unit by name. Returns None if not found."""
    if not name:
        return None
    obj = model.objects.filter(name=name).first()
    return obj.id if obj else None

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
        "directorate_name": "Office of the Managing Director",
        "division_name": None,
        "department_name": None,
    },
    {
        "username": "md",
        "email": "md@npa.gov.ng",
        "first_name": "Abubakar",
        "last_name": "Dantsoho",
        "role_name": "Managing Director",
        "grade_level": "MDCS",
        "directorate_name": "Office of the Managing Director",
        "division_name": None,
        "department_name": None,
    },
    {
        "username": "edfa",
        "email": "edfa@npa.gov.ng",
        "first_name": "Vivian",
        "last_name": "Richard-Edet",
        "role_name": "Executive Director",
        "grade_level": "EDCS",
        "directorate_name": "Finance & Administration",
        "division_name": None,
        "department_name": None,
    },
    {
        "username": "gmict",
        "email": "gmict@npa.gov.ng",
        "first_name": "Babatunde",
        "last_name": "Gbotolorun",
        "role_name": "General Manager",
        "grade_level": "MSS1",
        "directorate_name": "Office of the Managing Director",
        "division_name": "Information & Communication Technology",
        "department_name": "ICT Systems",
    },
    {
        "username": "agmict",
        "email": "agmict@npa.gov.ng",
        "first_name": "Kayode",
        "last_name": "Ejiro",
        "role_name": "Assistant General Manager",
        "grade_level": "MSS2",
        "directorate_name": "Office of the Managing Director",
        "division_name": "Information & Communication Technology",
        "department_name": None,
    },
    {
        "username": "pamd",
        "email": "pamd@npa.gov.ng",
        "first_name": "Grace",
        "last_name": "Nnaji",
        "role_name": "Personal Assistant",
        "grade_level": "SSS2",
        "directorate_name": "Office of the Managing Director",
        "division_name": None,
        "department_name": None,
    },
    {
        "username": "officer1",
        "email": "officer1@npa.gov.ng",
        "first_name": "James",
        "last_name": "Okafor",
        "role_name": "Officer I",
        "grade_level": "SSS3",
        "directorate_name": "Office of the Managing Director",
        "division_name": "Information & Communication Technology",
        "department_name": "ICT Applications",
    },
    {
        "username": "officer2",
        "email": "officer2@npa.gov.ng",
        "first_name": "Aisha",
        "last_name": "Mohammed",
        "role_name": "Officer II",
        "grade_level": "SSS4",
        "directorate_name": "Finance & Administration",
        "division_name": "Finance",
        "department_name": "Tariff & Revenue",
    },
    {
        "username": "staff1",
        "email": "staff1@npa.gov.ng",
        "first_name": "Peter",
        "last_name": "Nwosu",
        "role_name": "Staff I",
        "grade_level": "JSS1",
        "directorate_name": "Engineering & Technical Services",
        "division_name": "Engineering",
        "department_name": "Civil Engineering",
    },
    {
        "username": "staff2",
        "email": "staff2@npa.gov.ng",
        "first_name": "Fatima",
        "last_name": "Abubakar",
        "role_name": "Staff II",
        "grade_level": "JSS2",
        "directorate_name": "Marine & Operations",
        "division_name": "Marine",
        "department_name": "Vessel Management",
    },
    {
        "username": "staff3",
        "email": "staff3@npa.gov.ng",
        "first_name": "Chidi",
        "last_name": "Eze",
        "role_name": "Staff III",
        "grade_level": "JSS3",
        "directorate_name": "Office of the Managing Director",
        "division_name": "Administration",
        "department_name": "Administration",
    },
    {
        "username": "officer_i",
        "email": "officeri@npa.gov.ng",
        "first_name": "Tunde",
        "last_name": "Adeyemi",
        "role_name": "Officer I",
        "grade_level": "SSS3",
        "directorate_name": "Engineering & Technical Services",
        "division_name": "Engineering",
        "department_name": "Port & Marine Infrastructure",
    },
    {
        "username": "officer_ii",
        "email": "officerii@npa.gov.ng",
        "first_name": "Kemi",
        "last_name": "Ogunleye",
        "role_name": "Officer II",
        "grade_level": "SSS4",
        "directorate_name": "Finance & Administration",
        "division_name": "Human Resource Management",
        "department_name": "Learning & Development",
    },
    {
        "username": "staff_i",
        "email": "staffi@npa.gov.ng",
        "first_name": "Bola",
        "last_name": "Adebayo",
        "role_name": "Staff I",
        "grade_level": "JSS1",
        "directorate_name": "Marine & Operations",
        "division_name": "Marine",
        "department_name": "Vessel Management",
    },
    {
        "username": "staff_ii",
        "email": "staffii@npa.gov.ng",
        "first_name": "Emeka",
        "last_name": "Okafor",
        "role_name": "Staff II",
        "grade_level": "JSS2",
        "directorate_name": "Office of the Managing Director",
        "division_name": "Internal Audit",
        "department_name": "Audit Systems",
    },
    {
        "username": "staff_iii",
        "email": "staffiii@npa.gov.ng",
        "first_name": "Zainab",
        "last_name": "Mohammed",
        "role_name": "Staff III",
        "grade_level": "JSS3",
        "directorate_name": "Finance & Administration",
        "division_name": "Administration",
        "department_name": "Facility Management",
    },
    {
        "username": "asst_mgr",
        "email": "asstmgr@npa.gov.ng",
        "first_name": "Femi",
        "last_name": "Adesina",
        "role_name": "Assistant Manager",
        "grade_level": "SSS1",
        "directorate_name": "Finance & Administration",
        "division_name": "Human Resource Management",
        "department_name": "HR Management",
    },
    {
        "username": "mgr",
        "email": "mgr@npa.gov.ng",
        "first_name": "Seun",
        "last_name": "Bakare",
        "role_name": "Manager",
        "grade_level": "MSS5",
        "directorate_name": "Engineering & Technical Services",
        "division_name": "Engineering",
        "department_name": "Civil Engineering",
    },
    {
        "username": "pmgr",
        "email": "pmgr@npa.gov.ng",
        "first_name": "Ngozi",
        "last_name": "Eze",
        "role_name": "Principal Manager",
        "grade_level": "MSS3",
        "directorate_name": "Finance & Administration",
        "division_name": "Finance",
        "department_name": "Tariff & Revenue",
    },
    {
        "username": "smgr2",
        "email": "smgr2@npa.gov.ng",
        "first_name": "Hassan",
        "last_name": "Yusuf",
        "role_name": "Senior Manager",
        "grade_level": "MSS4",
        "directorate_name": "Office of the Managing Director",
        "division_name": "Information & Communication Technology",
        "department_name": "ICT Systems",
    },
    {
        "username": "sofficer",
        "email": "sofficer@npa.gov.ng",
        "first_name": "Rashida",
        "last_name": "Bello",
        "role_name": "Senior Officer",
        "grade_level": "SSS2",
        "directorate_name": "Engineering & Technical Services",
        "division_name": "Engineering",
        "department_name": "Civil Engineering",
    },
    {
        "username": "sec_md",
        "email": "secmd@npa.gov.ng",
        "first_name": "Tolulope",
        "last_name": "Okafor",
        "role_name": "Secretary",
        "grade_level": "SSS2",
        "directorate_name": "Office of the Managing Director",
        "division_name": None,
        "department_name": None,
    },
    {
        "username": "asst3",
        "email": "asst3@npa.gov.ng",
        "first_name": "Ibrahim",
        "last_name": "Lawal",
        "role_name": "Assistant",
        "grade_level": "JSS3",
        "directorate_name": "Marine & Operations",
        "division_name": "Marine",
        "department_name": "Vessel Management",
    },
)

# Usernames that also exist in organization_data.json MOCK_USERS.
# For these, ensure_dev_login_users owns only credentials (password + is_active),
# not profile (names/emails/roles/org) — to avoid boot-order drift.
OVERLAP_USERNAMES = frozenset({"superadmin", "md", "edfa", "gmict"})

DEFAULT_PASSWORD = "ChangeMe123!"


class Command(BaseCommand):
    help = "Create or repair local dev login users (superadmin, md, edfa, gmict, pamd, and supporting staff)."

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

        for raw_spec in DEV_USERS:
            # Work on a shallow copy so the DEV_USERS tuple stays immutable across
            # repeated calls (management command may be invoked twice per boot).
            spec = dict(raw_spec)
            role_name = spec.pop("role_name")
            role = Role.objects.filter(name=role_name).first()
            if not role:
                self.stderr.write(f"Role '{role_name}' not found, skipping {spec['username']}")
                continue

            username = spec["username"]
            directorate_name = spec.pop("directorate_name", None)
            division_name = spec.pop("division_name", None)
            department_name = spec.pop("department_name", None)

            directorate_id = _resolve_id(Directorate, directorate_name)
            division_id = _resolve_id(Division, division_name)
            department_id = _resolve_id(Department, department_name)

            defaults = {
                "email": spec["email"],
                "first_name": spec["first_name"],
                "last_name": spec["last_name"],
                "grade_level": spec["grade_level"],
                "system_role": role,
                "directorate_id": directorate_id,
                "division_id": division_id,
                "department_id": department_id,
                "is_active": True,
                "is_staff": spec.get("is_staff", False),
                "is_superuser": spec.get("is_superuser", False),
            }

            # For users that also live in organization_data.json, never clobber
            # profile/org fields if the row was already seeded — own only creds.
            if username in OVERLAP_USERNAMES and User.objects.filter(username=username).exists():
                user = User.objects.get(username=username)
                was_created = False
                # No profile overwrite; credentials only.
            else:
                user, was_created = User.objects.update_or_create(
                    username=username,
                    defaults=defaults,
                )

            if force_password or was_created or not user.has_usable_password():
                user.set_password(password)
                user.save(update_fields=["password"])

            if was_created:
                created += 1
                self.stdout.write(f"Created {user.username}")
            else:
                updated += 1
                self.stdout.write(f"Updated {user.username}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Dev login users ready ({created} created, {updated} updated). Try superadmin / {password}!"
            )
        )
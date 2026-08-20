"""Ensure default development login accounts exist (idempotent)."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from organization.models import Role

User = get_user_model()

# Organizational unit UUIDs from the database
ORG_UNITS = {
    # Directorates
    "MD_DIRECTORATE": "2437ecb6-31fa-4126-863a-afc3679c221b",
    "ED_FINANCE_DIRECTORATE": "3b26f93d-1e24-4d4d-80f8-c8f861800085",
    "ED_ENG_DIRECTORATE": "daf00574-f45d-443f-9adb-54a9afc190b5",
    "ED_MARINE_DIRECTORATE": "57e027d4-155a-4b61-8cb0-0a8d701925fd",
    # Divisions
    "ICT_DIVISION": "1625c04a-2629-4c5c-b9b5-079475ddd66a",
    "FINANCE_DEPT": "3f06e575-e2ff-4b0e-ac84-950e44edc5eb",
    "HR_DEPT": "5439bcce-7846-4b8a-a1c4-0f0174a71cf2",
    "ENG_DIVISION": "ff27ef41-44c2-4ef7-b6f1-257e14dbb38c",
    "MARINE_DIVISION": "f306c907-e640-4a50-8014-aeccfc677193",
    "ADMIN_DIVISION": "a1487a7a-043b-4742-9b02-3d64bfd1cb36",
    "AUDIT_DIVISION": "871009ed-614b-42ed-8309-bca725519935",
    # Departments
    "ICT_DEPT_SYSTEMS": "ea614ca6-6751-4046-9bd6-ef9f82a254a7",
    "ICT_DEPT_APPS": "63add8a9-2d36-4036-a489-ec26afa881d7",
    "ICT_DEPT_SOFTWARE": "a0c840df-3898-4881-908c-4b9f8be3cb3d",
    "ENG_DEPT_CIVIL": "01c5bbe3-f374-4962-af86-49bae9c91b9a",
    "FINANCE_DEPT_TARIFF": "90319915-a013-4848-88f3-46e582615b39",
    "ADMIN_DEPT": "9a4e9154-07ba-4eb2-ba04-b455813b449d",
    "ADMIN_FACILITY_DEPT": "02300955-ed7a-4146-9b48-d20c2622aa7d",
    "ENG_DEPT_PORTS": "23755e41-3e76-41aa-b4d4-89c6ca1dae8d",
    "VESSEL_DEPT": "f1cba731-3924-408a-baba-c9daa79c40ab",
    "HR_MGT_DEPT": "2cb7500f-a828-47cd-81e8-a75afaaa8408",
    "HR_DEPT_LD": "c0abeb56-c6d6-4641-839b-3be367172c04",
    "AUDIT_SYSTEMS_DEPT": "9d3564b8-ce41-42fc-a9d5-c06fead052b2",
}

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
        "directorate_id": ORG_UNITS["MD_DIRECTORATE"],
        "division_id": None,
        "department_id": None,
    },
    {
        "username": "md",
        "email": "md@npa.gov.ng",
        "first_name": "Abubakar",
        "last_name": "Dantsoho",
        "role_name": "Managing Director",
        "grade_level": "MDCS",
        "directorate_id": ORG_UNITS["MD_DIRECTORATE"],
        "division_id": None,
        "department_id": None,
    },
    {
        "username": "edfa",
        "email": "edfa@npa.gov.ng",
        "first_name": "Vivian",
        "last_name": "Richard-Edet",
        "role_name": "Executive Director",
        "grade_level": "EDCS",
        "directorate_id": ORG_UNITS["ED_FINANCE_DIRECTORATE"],
        "division_id": None,
        "department_id": None,
    },
    {
        "username": "gmict",
        "email": "gmict@npa.gov.ng",
        "first_name": "Babatunde",
        "last_name": "Gbotolorun",
        "role_name": "General Manager",
        "grade_level": "MSS1",
        "directorate_id": ORG_UNITS["MD_DIRECTORATE"],
        "division_id": ORG_UNITS["ICT_DIVISION"],
        "department_id": ORG_UNITS["ICT_DEPT_SYSTEMS"],
    },
    {
        "username": "agmict",
        "email": "agmict@npa.gov.ng",
        "first_name": "Kayode",
        "last_name": "Ejiro",
        "role_name": "Assistant General Manager",
        "grade_level": "MSS2",
        "directorate_id": ORG_UNITS["MD_DIRECTORATE"],
        "division_id": ORG_UNITS["ICT_DIVISION"],
        "department_id": None,
    },
    {
        "username": "pamd",
        "email": "pamd@npa.gov.ng",
        "first_name": "Grace",
        "last_name": "Nnaji",
        "role_name": "Personal Assistant",
        "grade_level": "SSS2",
        "directorate_id": ORG_UNITS["MD_DIRECTORATE"],
        "division_id": None,
        "department_id": None,
    },
    # Lower-level staff roles (previously missing)
    {
        "username": "officer1",
        "email": "officer1@npa.gov.ng",
        "first_name": "James",
        "last_name": "Okafor",
        "role_name": "Officer I",
        "grade_level": "SSS3",
        "directorate_id": ORG_UNITS["MD_DIRECTORATE"],
        "division_id": ORG_UNITS["ICT_DIVISION"],
        "department_id": ORG_UNITS["ICT_DEPT_APPS"],
    },
    {
        "username": "officer2",
        "email": "officer2@npa.gov.ng",
        "first_name": "Aisha",
        "last_name": "Mohammed",
        "role_name": "Officer II",
        "grade_level": "SSS4",
        "directorate_id": ORG_UNITS["ED_FINANCE_DIRECTORATE"],
        "division_id": ORG_UNITS["FINANCE_DEPT"],
        "department_id": ORG_UNITS["FINANCE_DEPT_TARIFF"],
    },
    {
        "username": "staff1",
        "email": "staff1@npa.gov.ng",
        "first_name": "Peter",
        "last_name": "Nwosu",
        "role_name": "Staff I",
        "grade_level": "JSS1",
        "directorate_id": ORG_UNITS["ED_ENG_DIRECTORATE"],
        "division_id": ORG_UNITS["ENG_DIVISION"],
        "department_id": ORG_UNITS["ENG_DEPT_CIVIL"],
    },
    {
        "username": "staff2",
        "email": "staff2@npa.gov.ng",
        "first_name": "Fatima",
        "last_name": "Abubakar",
        "role_name": "Staff II",
        "grade_level": "JSS2",
        "directorate_id": ORG_UNITS["ED_MARINE_DIRECTORATE"],
        "division_id": ORG_UNITS["MARINE_DIVISION"],
        "department_id": ORG_UNITS["VESSEL_DEPT"],
    },
    {
        "username": "staff3",
        "email": "staff3@npa.gov.ng",
        "first_name": "Chidi",
        "last_name": "Eze",
        "role_name": "Staff III",
        "grade_level": "JSS3",
        "directorate_id": ORG_UNITS["MD_DIRECTORATE"],
        "division_id": ORG_UNITS["ADMIN_DIVISION"],
        "department_id": ORG_UNITS["ADMIN_DEPT"],
    },
    # Additional Officer I/II for the previously empty roles
    {
        "username": "officer_i",
        "email": "officeri@npa.gov.ng",
        "first_name": "Tunde",
        "last_name": "Adeyemi",
        "role_name": "Officer I",
        "grade_level": "SSS3",
        "directorate_id": ORG_UNITS["ED_ENG_DIRECTORATE"],
        "division_id": ORG_UNITS["ENG_DIVISION"],
        "department_id": ORG_UNITS["ENG_DEPT_PORTS"],
    },
    {
        "username": "officer_ii",
        "email": "officerii@npa.gov.ng",
        "first_name": "Kemi",
        "last_name": "Ogunleye",
        "role_name": "Officer II",
        "grade_level": "SSS4",
        "directorate_id": ORG_UNITS["ED_FINANCE_DIRECTORATE"],
        "division_id": ORG_UNITS["HR_DEPT"],
        "department_id": ORG_UNITS["HR_DEPT_LD"],
    },
    # Additional Staff I/II/III
    {
        "username": "staff_i",
        "email": "staffi@npa.gov.ng",
        "first_name": "Bola",
        "last_name": "Adebayo",
        "role_name": "Staff I",
        "grade_level": "JSS1",
        "directorate_id": ORG_UNITS["ED_MARINE_DIRECTORATE"],
        "division_id": ORG_UNITS["MARINE_DIVISION"],
        "department_id": ORG_UNITS["VESSEL_DEPT"],
    },
    {
        "username": "staff_ii",
        "email": "staffii@npa.gov.ng",
        "first_name": "Emeka",
        "last_name": "Okafor",
        "role_name": "Staff II",
        "grade_level": "JSS2",
        "directorate_id": ORG_UNITS["MD_DIRECTORATE"],
        "division_id": ORG_UNITS["AUDIT_DIVISION"],
        "department_id": ORG_UNITS["AUDIT_SYSTEMS_DEPT"],
    },
    {
        "username": "staff_iii",
        "email": "staffiii@npa.gov.ng",
        "first_name": "Zainab",
        "last_name": "Mohammed",
        "role_name": "Staff III",
        "grade_level": "JSS3",
        "directorate_id": ORG_UNITS["ED_FINANCE_DIRECTORATE"],
        "division_id": ORG_UNITS["ADMIN_DIVISION"],
        "department_id": ORG_UNITS["ADMIN_FACILITY_DEPT"],
    },
    # Assistant Manager (single user role)
    {
        "username": "asst_mgr",
        "email": "asstmgr@npa.gov.ng",
        "first_name": "Femi",
        "last_name": "Adesina",
        "role_name": "Assistant Manager",
        "grade_level": "SSS1",
        "directorate_id": ORG_UNITS["ED_FINANCE_DIRECTORATE"],
        "division_id": ORG_UNITS["HR_DEPT"],
        "department_id": ORG_UNITS["HR_MGT_DEPT"],
    },
    # Manager (single user role)
    {
        "username": "mgr",
        "email": "mgr@npa.gov.ng",
        "first_name": "Seun",
        "last_name": "Bakare",
        "role_name": "Manager",
        "grade_level": "MSS5",
        "directorate_id": ORG_UNITS["ED_ENG_DIRECTORATE"],
        "division_id": ORG_UNITS["ENG_DIVISION"],
        "department_id": ORG_UNITS["ENG_DEPT_CIVIL"],
    },
    # Principal Manager (single user role)
    {
        "username": "pmgr",
        "email": "pmgr@npa.gov.ng",
        "first_name": "Ngozi",
        "last_name": "Eze",
        "role_name": "Principal Manager",
        "grade_level": "MSS3",
        "directorate_id": ORG_UNITS["ED_FINANCE_DIRECTORATE"],
        "division_id": ORG_UNITS["FINANCE_DEPT"],
        "department_id": ORG_UNITS["FINANCE_DEPT_TARIFF"],
    },
    # Senior Manager (2 users already, add one more for balance)
    {
        "username": "smgr2",
        "email": "smgr2@npa.gov.ng",
        "first_name": "Hassan",
        "last_name": "Yusuf",
        "role_name": "Senior Manager",
        "grade_level": "MSS4",
        "directorate_id": ORG_UNITS["MD_DIRECTORATE"],
        "division_id": ORG_UNITS["ICT_DIVISION"],
        "department_id": ORG_UNITS["ICT_DEPT_SYSTEMS"],
    },
    # Senior Officer (single user)
    {
        "username": "sofficer",
        "email": "sofficer@npa.gov.ng",
        "first_name": "Rashida",
        "last_name": "Bello",
        "role_name": "Senior Officer",
        "grade_level": "SSS2",
        "directorate_id": ORG_UNITS["ED_ENG_DIRECTORATE"],
        "division_id": ORG_UNITS["ENG_DIVISION"],
        "department_id": ORG_UNITS["ENG_DEPT_CIVIL"],
    },
    # Secretary (2 users already, add one for MD)
    {
        "username": "sec_md",
        "email": "secmd@npa.gov.ng",
        "first_name": "Tolulope",
        "last_name": "Okafor",
        "role_name": "Secretary",
        "grade_level": "SSS2",
        "directorate_id": ORG_UNITS["MD_DIRECTORATE"],
        "division_id": None,
        "department_id": None,
    },
    # Assistant (2 users, add one more)
    {
        "username": "asst3",
        "email": "asst3@npa.gov.ng",
        "first_name": "Ibrahim",
        "last_name": "Lawal",
        "role_name": "Assistant",
        "grade_level": "JSS3",
        "directorate_id": ORG_UNITS["ED_MARINE_DIRECTORATE"],
        "division_id": ORG_UNITS["MARINE_DIVISION"],
        "department_id": ORG_UNITS["VESSEL_DEPT"],
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
            directorate_id = spec.pop("directorate_id", None)
            division_id = spec.pop("division_id", None)
            department_id = spec.pop("department_id", None)

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
"""Seed the database with demo data matching the frontend mocks."""

from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from analytics.models import ReportSnapshot, UsageMetric
from common.grade_utils import MANAGEMENT_GRADES
from common.user_identity import canonical_email, canonical_employee_id, canonical_username
from correspondence.models import (
    Case,
    CaseCorrespondenceLink,
    CaseDocumentLink,
    CaseFormLink,
    CaseTemplate,
    Correspondence,
    CorrespondenceAttachment,
    CorrespondenceDistribution,
    CorrespondenceDocumentLink,
    Delegation,
    DispatchRecord,
    Location,
    Minute,
    PhysicalDocument,
    CheckOutEvent,
)
from correspondence.foia_models import FOIARequest, FOIANote, FOIARequestDocument
from dms.models import (
    Document,
    DocumentAccessLog,
    DocumentPermission,
    DocumentRightsPolicy,
    DocumentVersion,
    FormDocument,
)
from organization.models import Department, Directorate, Division, Office, OfficeMembership, Role
from support.models import FaqEntry, HelpGuide, SupportTicket
from workflow.models import ApprovalTask, TaskAction, WorkflowStep, WorkflowTemplate


User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo data for development environments."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Purge existing organization structure before seeding",
        )
        parser.add_argument(
            "--skip-users",
            action="store_true",
            help="Skip creating mock users (only seed organization structure)",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Starting demo data seeding"))

        data = self._load_structure_data()

        with transaction.atomic():
            if options.get("reset"):
                self._reset_organization_units()
            directorates, divisions, departments = self._ensure_organization_units(data)
            offices = self._ensure_offices(data, directorates, divisions, departments)
            
            # Only create users if not skipped
            if options.get("skip_users"):
                self.stdout.write(self.style.WARNING("Skipping mock user creation (--skip-users flag set)"))
                users = {u.username: u for u in User.objects.filter(is_active=True)}
                self.stdout.write(self.style.SUCCESS(f"Using {len(users)} existing active users"))
            else:
                users = self._ensure_users(data.get("MOCK_USERS", []), directorates, divisions, departments)
            
            # Only assign leadership and create demo data if users were created
            if users:
                self._assign_org_leadership(data, directorates, divisions, departments, users)
                self._ensure_office_memberships(data, offices, users)
                self._ensure_leadership_office_memberships(directorates, divisions, departments)
                documents = self._ensure_documents(users, divisions, departments)
                correspondence_items = self._ensure_correspondence(users, divisions, departments, documents, offices)
                self._ensure_workflows(users, correspondence_items)
                self._ensure_support_content(users)
                self._ensure_analytics(users)
                self._ensure_physical_tracking(users, correspondence_items, documents)
                self._ensure_drm_policies()
                self._ensure_case_templates(users)
                self._ensure_correspondence_templates()
                self._ensure_audit_form_templates()
                self._ensure_project_cases(users, divisions, departments, offices)
            else:
                self.stdout.write(self.style.WARNING("Skipping demo data creation (no users available)"))
                
        # Collapse any leftover user-* shells into login usernames (idempotent).
        if not options.get("skip_users"):
            from django.core.management import call_command

            self.stdout.write("Canonicalizing user identities…")
            call_command("canonicalize_users", stdout=self.stdout, stderr=self.stderr)

        # Set up role permissions
        self._setup_role_permissions()

        self.stdout.write(self.style.SUCCESS("Demo data seeding complete."))

    def _load_structure_data(self) -> dict:
        data_path = Path(__file__).resolve().parents[3] / "scripts" / "organization_data.json"
        if not data_path.exists():
            raise FileNotFoundError("Expected organization_data.json to seed organization structure")
        
        # Read file content
        content = data_path.read_text()
        
        # Strip section header comments (standalone lines like "MD", "ED F&A", etc.)
        # These are organizational markers but not valid JSON
        import re
        lines = content.split('\n')
        cleaned_lines = []
        for line in lines:
            stripped = line.strip()
            # Skip lines that are just uppercase text (section headers)
            # Pattern: standalone uppercase text, possibly with spaces, &, parentheses
            if re.match(r'^[A-Z][A-Z\s&()]+$', stripped) and not any(c in stripped for c in ['{', '}', '[', ']', '"', ',', ':']):
                continue  # Skip this comment line
            cleaned_lines.append(line)
        
        cleaned_content = '\n'.join(cleaned_lines)
        
        # Ensure file starts with { if it doesn't
        if not cleaned_content.strip().startswith('{'):
            cleaned_content = '{' + cleaned_content
        
        # Parse JSON
        data = json.loads(cleaned_content)
        return data

    def _reset_organization_units(self) -> None:
        self.stdout.write("Purging existing organization hierarchy…")
        Department.objects.all().delete()
        Division.objects.all().delete()
        Directorate.objects.all().delete()
        self.stdout.write(self.style.WARNING("Existing directorates, divisions, and departments removed."))

    def _ensure_organization_units(self, data: dict):
        directorate_map: dict[str, Directorate] = {}
        division_map: dict[str, Division] = {}
        department_map: dict[str, Department] = {}

        for directorate_data in data.get("DIRECTORATES", []):
            directorate, _ = Directorate.objects.update_or_create(
                code=directorate_data.get("code", ""),
                defaults={
                    "name": directorate_data.get("name", ""),
                    "description": directorate_data.get("description", ""),
                    "is_active": directorate_data.get("active", True),
                },
            )
            directorate_map[directorate_data["id"]] = directorate

        for division_data in data.get("DIVISIONS", []):
            directorate = directorate_map.get(division_data.get("directorateId"))
            if not directorate:
                continue
            division, _ = Division.objects.update_or_create(
                code=division_data.get("code", ""),
                directorate=directorate,
                defaults={
                    "name": division_data.get("name", ""),
                    "is_active": division_data.get("active", True),
                },
            )
            division_map[division_data["id"]] = division

        for department_data in data.get("DEPARTMENTS", []):
            division = division_map.get(department_data.get("divisionId"))
            
            # Handle departments directly under directorate (no division)
            if not division and department_data.get("directorateId"):
                directorate = directorate_map.get(department_data.get("directorateId"))
                if directorate:
                    # Create or get a placeholder division for direct-report departments
                    placeholder_name = f"{directorate.name} - Direct Reports"
                    placeholder_code = f"{directorate.code}_DIRECT"
                    division, _ = Division.objects.get_or_create(
                        code=placeholder_code,
                        directorate=directorate,
                        defaults={
                            "name": placeholder_name,
                            "is_active": True,
                        },
                    )
                    # Add to division_map to avoid recreating for other departments
                    placeholder_key = f"placeholder-{directorate.code}"
                    if placeholder_key not in division_map:
                        division_map[placeholder_key] = division
                else:
                    continue
            elif not division:
                continue
                
            department, _ = Department.objects.update_or_create(
                code=department_data.get("code", ""),
                division=division,
                defaults={
                    "name": department_data.get("name", ""),
                    "is_active": department_data.get("active", True),
                },
            )
            department_map[department_data["id"]] = department

        self.stdout.write(self.style.SUCCESS(
            f"Organization units ensured ({len(directorate_map)} directorates, "
            f"{len(division_map)} divisions, {len(department_map)} departments)."
        ))
        return directorate_map, division_map, department_map

    def _ensure_offices(
        self,
        data: dict,
        directorates: dict[str, Directorate],
        divisions: dict[str, Division],
        departments: dict[str, Department],
    ) -> dict[str, Office]:
        office_map: dict[str, Office] = {}
        pending_parent_links: list[tuple[Office, str]] = []
        directorate_offices: dict[str, Office] = {}
        division_offices: dict[str, Office] = {}
        department_offices: dict[str, Office] = {}

        def _remove_duplicate_office_suffix(name: str) -> str:
            """Remove duplicate 'Office' suffix from office names.
            
            Examples:
                "Managing Director Office" -> "Managing Director"
                "Managing Director Office Office" -> "Managing Director Office"
                "Finance Division" -> "Finance Division"
            """
            name = name.strip()
            # Remove trailing "Office" if it exists
            if name.endswith(" Office"):
                name = name[:-7]  # Remove " Office" (7 characters)
            return name

        def register_office_mappings(office: Office):
            if office.department_id:
                department_offices[office.department_id] = office
            elif office.division_id:
                division_offices[office.division_id] = office
            elif office.directorate_id:
                directorate_offices[office.directorate_id] = office

        for office_data in data.get("OFFICES", []):
            code = office_data.get("code")
            if not code:
                continue

            directorate = directorates.get(office_data.get("directorateId"))
            division = divisions.get(office_data.get("divisionId"))
            department = departments.get(office_data.get("departmentId"))

            office_defaults = {
                "name": office_data.get("name", code),
                "office_type": office_data.get("officeType", Office.OfficeTier.CUSTOM),
                "directorate": directorate,
                "division": division,
                "department": department,
                "description": office_data.get("description", ""),
                "is_active": office_data.get("isActive", True),
                "allow_external_intake": office_data.get("allowExternalIntake", True),
                "allow_lateral_routing": office_data.get("allowLateralRouting", True),
            }

            office, _ = Office.objects.update_or_create(
                code=code,
                defaults=office_defaults,
            )
            office_map[office_data["id"]] = office
            register_office_mappings(office)

            parent_id = office_data.get("parentId")
            if parent_id:
                pending_parent_links.append((office, parent_id))

        for office, parent_id in pending_parent_links:
            parent = office_map.get(parent_id)
            if parent:
                office.parent = parent
                office.save(update_fields=["parent"])

        # Auto-generate offices for every directorate/division/department to ensure routing coverage
        md_office = Office.objects.filter(office_type=Office.OfficeTier.MANAGING_DIRECTOR).first()

        for directorate_id, directorate in directorates.items():
            existing = directorate_offices.get(directorate.pk)
            if existing:
                continue
            code = f"OFF_DIR_{directorate.code.upper()}"
            base_name = _remove_duplicate_office_suffix(directorate.name)
            defaults = {
                "name": f"{base_name} Directorate Office",
                "office_type": Office.OfficeTier.DIRECTORATE,
                "directorate": directorate,
                "description": f"Inbox for {directorate.name}",
                "is_active": True,
                "allow_external_intake": True,
                "allow_lateral_routing": True,
                "parent": md_office if md_office and directorate != md_office.directorate else None,
            }
            office, _ = Office.objects.get_or_create(code=code, defaults=defaults)
            if defaults["parent"] and office.parent_id != defaults["parent"].id:
                office.parent = defaults["parent"]
                office.save(update_fields=["parent"])
            register_office_mappings(office)

        for division_id, division in divisions.items():
            existing = division_offices.get(division.pk)
            if existing:
                continue
            parent_office = directorate_offices.get(division.directorate_id) or Office.objects.filter(
                directorate=division.directorate, division__isnull=True, department__isnull=True
            ).first()
            code = f"OFF_DIV_{division.code.upper()}"
            base_name = _remove_duplicate_office_suffix(division.name)
            defaults = {
                "name": f"{base_name} Division Office",
                "office_type": Office.OfficeTier.GENERAL_MANAGER,
                "directorate": division.directorate,
                "division": division,
                "description": f"GM queue for {division.name}",
                "is_active": True,
                "allow_external_intake": True,
                "allow_lateral_routing": True,
                "parent": parent_office,
            }
            office, _ = Office.objects.get_or_create(code=code, defaults=defaults)
            if defaults["parent"] and office.parent_id != defaults["parent"].id:
                office.parent = defaults["parent"]
                office.save(update_fields=["parent"])
            register_office_mappings(office)

        for department_id, department in departments.items():
            existing = department_offices.get(department.pk)
            if existing:
                continue
            parent_office = division_offices.get(department.division_id) or Office.objects.filter(
                division=department.division, department__isnull=True
            ).first()
            code = f"OFF_DEPT_{department.code.upper()}"
            base_name = _remove_duplicate_office_suffix(department.name)
            defaults = {
                "name": f"{base_name} Department Office",
                "office_type": Office.OfficeTier.ASSISTANT_GENERAL_MANAGER,
                "directorate": department.division.directorate if department.division else None,
                "division": department.division,
                "department": department,
                "description": f"AGM queue for {department.name}",
                "is_active": True,
                "allow_external_intake": False,
                "allow_lateral_routing": False,
                "parent": parent_office,
            }
            office, _ = Office.objects.get_or_create(code=code, defaults=defaults)
            if defaults["parent"] and office.parent_id != defaults["parent"].id:
                office.parent = defaults["parent"]
                office.save(update_fields=["parent"])
            register_office_mappings(office)

        if office_map:
            self.stdout.write(self.style.SUCCESS(f"Ensured {len(office_map)} offices."))
        else:
            self.stdout.write(self.style.WARNING("No offices defined in organization_data.json"))
        return office_map

    def _ensure_office_memberships(
        self,
        data: dict,
        offices: dict[str, Office],
        users: dict[str, User],
    ) -> None:
        created = 0
        for entry in data.get("OFFICE_MEMBERSHIPS", []):
            office = offices.get(entry.get("officeId"))
            if not office:
                continue
            user = users.get(entry.get("userId")) or users.get((entry.get("userId") or "").replace("user-", ""))
            if not user:
                continue

            defaults = {
                "assignment_role": entry.get("assignmentRole", OfficeMembership.AssignmentRole.STAFF),
                "is_primary": entry.get("isPrimary", False),
                "can_register": entry.get("canRegister", False),
                "can_route": entry.get("canRoute", True),
                "can_approve": entry.get("canApprove", False),
                "is_active": entry.get("isActive", True),
            }

            OfficeMembership.objects.update_or_create(
                office=office,
                user=user,
                defaults=defaults,
            )
            created += 1

        if created:
            self.stdout.write(self.style.SUCCESS(f"Ensured {created} office memberships."))

    def _ensure_leadership_office_memberships(
        self,
        directorates: dict[str, Directorate],
        divisions: dict[str, Division],
        departments: dict[str, Department],
    ) -> None:
        created = 0

        def ensure_membership(office: Office | None, user, role: str):
            nonlocal created
            if not office or not user:
                return
            defaults = {
                "assignment_role": role,
                "is_primary": True,
                "can_register": True,
                "can_route": True,
                "can_approve": True,
                "is_active": True,
            }
            _, was_created = OfficeMembership.objects.update_or_create(
                office=office,
                user=user,
                defaults=defaults,
            )
            if was_created:
                created += 1

        for directorate in directorates.values():
            office = Office.objects.filter(
                directorate=directorate, division__isnull=True, department__isnull=True
            ).order_by("-created_at").first()
            ensure_membership(office, directorate.executive_director, OfficeMembership.AssignmentRole.PRINCIPAL)

        for division in divisions.values():
            office = Office.objects.filter(division=division, department__isnull=True).order_by("-created_at").first()
            ensure_membership(office, division.general_manager, OfficeMembership.AssignmentRole.PRINCIPAL)

        for department in departments.values():
            office = Office.objects.filter(department=department).order_by("-created_at").first()
            ensure_membership(office, department.head_of_department, OfficeMembership.AssignmentRole.PRINCIPAL)

        if created:
            self.stdout.write(self.style.SUCCESS(f"Ensured {created} leadership office memberships."))

    def _ensure_users(
        self,
        users_data: list[dict],
        directorates: dict[str, Directorate],
        divisions: dict[str, Division],
        departments: dict[str, Department],
    ) -> dict[str, User]:
        created_users: dict[str, User] = {}
        pending_assignments: list[tuple[str, str | None, str | None, str | None]] = []

        management_grades = MANAGEMENT_GRADES

        def resolve_email(desired_email: str, username: str) -> str | None:
            """Return canonical email if free (or already owned by username); else None."""
            email = canonical_email(desired_email or f"{username}@npa.gov.ng")
            if not email:
                return None
            conflict = User.objects.filter(email__iexact=email).exclude(username=username).first()
            if conflict:
                return None
            return email

        def resolve_employee_id(desired_employee_id: str, username: str) -> str | None:
            employee_id = canonical_employee_id(desired_employee_id or "")
            if not employee_id:
                return None
            conflict = (
                User.objects.filter(employee_id=employee_id).exclude(username=username).first()
            )
            if conflict:
                return None
            return employee_id

        for entry in users_data:
            source_key = entry.get("id") or entry.get("username")
            if not source_key:
                continue
            username = canonical_username(source_key)

            name = (entry.get("name") or "").strip()
            name_parts = name.split()
            first_name = name_parts[0] if name_parts else username
            last_name = name_parts[-1] if len(name_parts) > 1 else ""

            # Look up or create Role object by name
            system_role = None
            system_role_name = entry.get("systemRole", "").strip()
            if system_role_name:
                system_role, _ = Role.objects.get_or_create(
                    name=system_role_name,
                    defaults={"description": f"System role: {system_role_name}"}
                )

            defaults = {
                "first_name": first_name,
                "last_name": last_name,
                "system_role": system_role,
                "grade_level": entry.get("gradeLevel", ""),
                "is_management": entry.get("gradeLevel", "") in management_grades,
            }
            email = resolve_email(entry.get("email") or f"{username}@npa.gov.ng", username)
            if email:
                defaults["email"] = email
            employee_id = resolve_employee_id(entry.get("employeeId", ""), username)
            if employee_id:
                defaults["employee_id"] = employee_id

            user, created = User.objects.update_or_create(
                username=username,
                defaults=defaults,
            )
            if created and not user.email:
                # Last-resort unique placeholder so NOT NULL constraints pass.
                placeholder = f"{username}@npa.gov.ng"
                if not User.objects.filter(email__iexact=placeholder).exclude(pk=user.pk).exists():
                    user.email = placeholder
                    user.save(update_fields=["email"])
            if created or not user.has_usable_password():
                user.set_password("ChangeMe123!")
                user.save(update_fields=["password"])

            created_users[source_key] = user
            created_users[username] = user
            pending_assignments.append(
                (source_key, entry.get("directorate"), entry.get("division"), entry.get("department"))
            )

        # Ensure super admin account
        superadmin_role, _ = Role.objects.get_or_create(
            name="Super Admin",
            defaults={"description": "Super Administrator with full system access"}
        )
        superadmin_defaults = {
            "first_name": "Super",
            "last_name": "Admin",
            "is_staff": True,
            "is_superuser": True,
            "system_role": superadmin_role,
            "grade_level": "MDCS",
            "is_management": True,
        }
        email = resolve_email("superadmin@npa.gov.ng", "superadmin")
        if email:
            superadmin_defaults["email"] = email
        superadmin, created = User.objects.update_or_create(
            username="superadmin",
            defaults=superadmin_defaults,
        )
        if created or not superadmin.has_usable_password():
            superadmin.set_password("ChangeMe123!")
            superadmin.save(update_fields=["password"])
        # Assign superadmin to MD's directorate
        directorate_md = directorates.get("dir-md")
        if directorate_md:
            superadmin.directorate = directorate_md
            superadmin.division = None
            superadmin.department = None
            superadmin.save(update_fields=["directorate", "division", "department"])
        created_users["superadmin"] = superadmin

        # Apply organizational placement
        for username, directorate_id, division_id, department_id in pending_assignments:
            user = created_users.get(username)
            if not user:
                continue
            division = divisions.get(division_id)
            department = departments.get(department_id)
            directorate = directorates.get(directorate_id) if directorate_id else None
            if not directorate:
                if department and department.division:
                    directorate = department.division.directorate
                elif division:
                    directorate = division.directorate
            user.division = division
            user.department = department
            user.directorate = directorate
            user.save(update_fields=["division", "department", "directorate"])

        # Ensure personal assistant demo account exists even if missing from source data
        pa_source_key = "user-pa-md"
        pa_username = canonical_username(pa_source_key)
        if pa_username not in created_users and pa_source_key not in created_users:
            pa_role, _ = Role.objects.get_or_create(
                name="Personal Assistant",
                defaults={"description": "Personal Assistant role"}
            )
            pamd_defaults = {
                "first_name": "Grace",
                "last_name": "Nnaji",
                "system_role": pa_role,
                "grade_level": "SSS2",
                "is_management": False,
            }
            email = resolve_email("pa.md@npa.gov.ng", pa_username)
            if email:
                pamd_defaults["email"] = email
            employee_id = resolve_employee_id("NPA-PA-001", pa_username)
            if employee_id:
                pamd_defaults["employee_id"] = employee_id
            pamd_user, created = User.objects.update_or_create(
                username=pa_username,
                defaults=pamd_defaults,
            )
            if created or not pamd_user.has_usable_password():
                pamd_user.set_password("ChangeMe123!")
                pamd_user.save(update_fields=["password"])
            directorate_md = directorates.get("dir-md")
            if directorate_md:
                pamd_user.directorate = directorate_md
                pamd_user.division = None
                pamd_user.department = None
                pamd_user.save(update_fields=["directorate", "division", "department"])
            created_users[pa_source_key] = pamd_user
            created_users[pa_username] = pamd_user

        # Remove stale debug superuser that has been observed in local DBs
        # (blank email, no org, is_superuser=True) — safe to never seed.
        removed_debug, _ = User.objects.filter(username="debug").delete()
        if removed_debug:
            self.stdout.write(self.style.WARNING(f"Removed stale debug user ({removed_debug} row(s))."))

        self.stdout.write(self.style.SUCCESS(f"Ensured {len(created_users)} users."))
        return created_users

    def _assign_org_leadership(
        self,
        data: dict,
        directorates: dict[str, Directorate],
        divisions: dict[str, Division],
        departments: dict[str, Department],
        users: dict[str, User],
    ) -> None:
        for directorate_data in data.get("DIRECTORATES", []):
            exec_id = directorate_data.get("executiveDirectorId")
            directorate = directorates.get(directorate_data["id"])
            if directorate and exec_id:
                exec_user = users.get(exec_id) or users.get(exec_id.replace("user-", ""))
                if exec_user:
                    directorate.executive_director = exec_user
                    directorate.save(update_fields=["executive_director"])

        for division_data in data.get("DIVISIONS", []):
            gm_id = division_data.get("generalManagerId")
            division = divisions.get(division_data["id"])
            if division and gm_id:
                gm_user = users.get(gm_id) or users.get(gm_id.replace("user-", ""))
                if gm_user:
                    division.general_manager = gm_user
                    division.save(update_fields=["general_manager"])

        for department_data in data.get("DEPARTMENTS", []):
            hod_id = department_data.get("assistantGeneralManagerId")
            department = departments.get(department_data["id"])
            if department and hod_id:
                hod_user = users.get(hod_id) or users.get(hod_id.replace("user-", ""))
                if hod_user:
                    department.head_of_department = hod_user
                    department.save(update_fields=["head_of_department"])

    def _ensure_documents(
        self,
        users: dict[str, User],
        divisions: dict[str, Division],
        departments: dict[str, Department],
    ):
        division = divisions.get("div-ict")
        department = departments.get("dept-ict-software")

        document, _ = Document.objects.update_or_create(
            reference_number="NPA/ICT/2025/001",
            defaults={
                "title": "Enterprise ECM Rollout Plan",
                "description": "High-level rollout plan for ECM implementation",
                "document_type": Document.DocumentType.POLICY,
                "status": Document.DocumentStatus.PUBLISHED,
                "sensitivity": Document.Sensitivity.INTERNAL,
                "author": users.get("gmict") or users.get("user-gm-ict"),
                "division": division,
                "department": department,
                "tags": ["ecm", "strategy"],
            },
        )

        DocumentVersion.objects.update_or_create(
            document=document,
            version_number=1,
            defaults={
                "file_name": "ecm-rollout-plan-v1.docx",
                "file_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "file_size": 102400,
                "content_html": "<h1>ECM Rollout Plan</h1><p>Initial roadmap.</p>",
                "content_text": "ECM Rollout Plan - Initial roadmap.",
                "summary": "Initial roadmap for the ECM rollout.",
                "uploaded_by": users.get("gmict") or users.get("user-gm-ict"),
            },
        )

        DocumentPermission.objects.update_or_create(
            document=document,
            access=DocumentPermission.AccessLevel.ADMIN,
            defaults={},
        )

        if not DocumentAccessLog.objects.filter(
            document=document,
            user=users.get("md") or users.get("user-md"),
            action=DocumentAccessLog.AccessAction.VIEW,
        ).exists():
            DocumentAccessLog.objects.create(
                document=document,
                user=users.get("md") or users.get("user-md"),
                action=DocumentAccessLog.AccessAction.VIEW,
                sensitivity=document.sensitivity,
            )

        self.stdout.write(self.style.SUCCESS("Documents and related records ensured."))
        return {"primary": document}

    def _ensure_correspondence(
        self,
        users: dict[str, User],
        divisions: dict[str, Division],
        departments: dict[str, Department],
        documents,
        offices: dict[str, Office],
    ):
        division = divisions.get("div-ict")
        department = departments.get("dept-ict-software")
        owning_office = offices.get("office-md")

        correspondence, _ = Correspondence.objects.update_or_create(
            reference_number="NPA/CORR/2025/015",
            defaults={
                "subject": "Request for ECM Implementation Update",
                "body_html": "<p><strong>Update requested by Managing Director</strong></p><p>Please provide an update on the ECM rollout milestones.</p>",
                "source": Correspondence.Source.INTERNAL,
                "priority": Correspondence.Priority.HIGH,
                "direction": Correspondence.Direction.UPWARD,
                "status": Correspondence.Status.IN_PROGRESS,
                "division": division,
                "department": department,
                "tags": ["ecm", "update"],
                "created_by": users.get("gmict") or users.get("user-gm-ict"),
                "current_approver": users.get("md") or users.get("user-md"),
                "owning_office": owning_office,
                "current_office": owning_office,
                "received_date": date.today(),
            },
        )

        CorrespondenceAttachment.objects.update_or_create(
            correspondence=correspondence,
            file_name="RolloutStatus.pdf",
            defaults={
                "file_type": "application/pdf",
                "file_size": 204800,
                "file_url": "",
            },
        )

        CorrespondenceDistribution.objects.update_or_create(
            correspondence=correspondence,
            recipient_type=CorrespondenceDistribution.RecipientType.DIVISION,
            division=division,
            defaults={
                "added_by": users.get("gmict") or users.get("user-gm-ict"),
                "purpose": CorrespondenceDistribution.Purpose.ACTION,
            },
        )

        CorrespondenceDocumentLink.objects.update_or_create(
            correspondence=correspondence,
            document=documents["primary"],
            defaults={"notes": "Reference rollout plan"},
        )

        Minute.objects.update_or_create(
            correspondence=correspondence,
            user=users.get("md") or users.get("user-md"),
            step_number=1,
            defaults={
                "minute_text": "Please escalate timeline issues to EDFA and revert in 48 hours.",
                "action_type": Minute.ActionType.FORWARD,
                "direction": Minute.Direction.DOWNWARD,
                "grade_level": "EDCS",
                "acted_by_secretary": False,
                "acted_by_assistant": True,
                "from_office": owning_office,
            },
        )

        Delegation.objects.update_or_create(
            principal=users.get("md") or users.get("user-md"),
            assistant=users.get("pamd") or users.get("user-pa-md"),
            defaults={
                "can_approve": True,
                "can_minute": True,
                "can_forward": True,
                "active": True,
            },
        )

        edfa = users.get("edfa") or users.get("user-ed-fa")
        edfa_office = offices.get("office-dir-edfa")
        edfa_division = divisions.get("div-edfa-direct")
        gm = users.get("gmict") or users.get("user-gm-ict")

        if edfa:
            edfa_correspondence, _ = Correspondence.objects.update_or_create(
                reference_number="NPA/CORR/2025/016",
                defaults={
                    "subject": "FY2025 Capital Expenditure Review — Finance & Administration",
                    "body_html": (
                        "<div style='font-family: Georgia, serif; max-width: 720px; margin: 0 auto;'>"
                        "<p style='text-align:right;color:#555;font-size:13px;'>Internal Memo</p>"
                        "<h2 style='color:#1a3a5c;margin:12px 0 4px;'>FY2025 Capital Expenditure Review</h2>"
                        "<p style='color:#666;margin:0 0 20px;'>Finance &amp; Administration Directorate</p>"
                        "<p><strong>To:</strong> Executive Director, Finance &amp; Administration</p>"
                        "<p><strong>From:</strong> General Manager, ICT</p>"
                        "<p><strong>Subject:</strong> Capex allocation review ahead of board submission</p>"
                        "<hr style='margin:20px 0;border:none;border-top:1px solid #ddd;'/>"
                        "<p>Please review the proposed capital expenditure allocations for Q3–Q4 "
                        "before submission to the Managing Director and the Board.</p>"
                        "<p><strong>Highlights for review:</strong></p>"
                        "<ul>"
                        "<li>Network infrastructure refresh (Lagos Port Complex)</li>"
                        "<li>Enterprise storage and backup capacity uplift</li>"
                        "<li>Endpoint security licence renewals</li>"
                        "</ul>"
                        "<p>Kindly approve or return with comments so Finance can finalise the pack.</p>"
                        "<p style='margin-top:28px;'>Respectfully,<br/><strong>General Manager, ICT</strong></p>"
                        "</div>"
                    ),
                    "source": Correspondence.Source.INTERNAL,
                    "priority": Correspondence.Priority.URGENT,
                    "direction": Correspondence.Direction.UPWARD,
                    "status": Correspondence.Status.IN_PROGRESS,
                    "division": edfa_division,
                    "department": department,
                    "tags": ["capex", "finance", "approval"],
                    "created_by": gm,
                    "current_approver": edfa,
                    "owning_office": edfa_office or owning_office,
                    "current_office": edfa_office or owning_office,
                    "received_date": date.today() - timedelta(days=5),
                },
            )

            Minute.objects.update_or_create(
                correspondence=edfa_correspondence,
                user=gm,
                step_number=1,
                defaults={
                    "minute_text": (
                        "Please review and approve the capex allocation before board submission."
                    ),
                    "action_type": Minute.ActionType.FORWARD,
                    "direction": Minute.Direction.UPWARD,
                    "grade_level": "MSS1",
                    "to_user": edfa,
                    "purpose": "approval",
                    "requires_response": True,
                    "response_deadline": timezone.now() + timedelta(days=2),
                    "from_office": offices.get("office-gm-ict") or owning_office,
                },
            )

        self.stdout.write(self.style.SUCCESS("Correspondence records ensured."))
        return {"primary": correspondence}

    def _ensure_workflows(self, users: dict[str, User], correspondence_items):
        """
        Create workflow templates following NPA organizational hierarchy:
        
        📊 DIRECTORATE (4)
           └─ 🏢 ED/MD Office (4)
           └─ 📂 DIVISION (28)
                └─ 👔 GM Office (28)
                └─ 📄 DEPARTMENT (57)
                     └─ 👤 AGM Office (57)
                     └─ 👥 Officers & Staff
        """
        md_user = users.get("md") or users.get("user-md")
        
        # Keep a tight catalog: segment templates that are already covered by a
        # full chain (directorate / executive / parallel / FYI) are omitted.
        WORKFLOW_TEMPLATES = [
            {
                "slug": "upward-approval-full",
                "name": "Standard Upward Approval (Full Chain)",
                "description": "Full approval chain from Officer up to MD. Use for high-priority items requiring MD attention.",
                "steps": [
                    {"order": 1, "title": "AGM Review", "required_role": "Assistant General Manager", "required_grade_level": "MSS2"},
                    {"order": 2, "title": "GM Approval", "required_role": "General Manager", "required_grade_level": "MSS1"},
                    {"order": 3, "title": "ED Approval", "required_role": "Executive Director", "required_grade_level": "EDCS"},
                    {"order": 4, "title": "MD Final Approval", "required_role": "Managing Director", "required_grade_level": "MDCS"},
                ],
            },
            {
                "slug": "departmental-approval",
                "name": "Departmental Approval",
                "description": "Standard approval within a division. Stops at GM level.",
                "steps": [
                    {"order": 1, "title": "AGM Review", "required_role": "Assistant General Manager", "required_grade_level": "MSS2"},
                    {"order": 2, "title": "GM Approval", "required_role": "General Manager", "required_grade_level": "MSS1"},
                ],
            },
            {
                "slug": "downward-assignment",
                "name": "Downward Assignment (Full Chain)",
                "description": "Assignment flow from MD down to AGM level.",
                "steps": [
                    {"order": 1, "title": "MD Assignment", "required_role": "Managing Director", "required_grade_level": "MDCS"},
                    {"order": 2, "title": "ED Assignment", "required_role": "Executive Director", "required_grade_level": "EDCS"},
                    {"order": 3, "title": "GM Assignment", "required_role": "General Manager", "required_grade_level": "MSS1"},
                    {"order": 4, "title": "AGM Treatment", "required_role": "Assistant General Manager", "required_grade_level": "MSS2"},
                ],
            },
            {
                "slug": "urgent-md-action",
                "name": "Urgent MD Action",
                "description": "Direct to MD for immediate attention. Bypasses intermediate levels.",
                "steps": [
                    {"order": 1, "title": "MD Review & Action", "required_role": "Managing Director", "required_grade_level": "MDCS"},
                ],
            },
            {
                "slug": "md-directorate-approval",
                "name": "MD Directorate Approval (AGM → GM → MD)",
                "description": "For divisions under MD Directorate (ICT, Legal, Audit, etc.). Skips ED level since GM reports directly to MD.",
                "steps": [
                    {"order": 1, "title": "AGM Review", "required_role": "Assistant General Manager", "required_grade_level": "MSS2"},
                    {"order": 2, "title": "GM Approval", "required_role": "General Manager", "required_grade_level": "MSS1"},
                    {"order": 3, "title": "MD Approval", "required_role": "Managing Director", "required_grade_level": "MDCS"},
                ],
            },
            {
                "slug": "md-directorate-assignment",
                "name": "MD Directorate Assignment (MD → GM → AGM)",
                "description": "Downward assignment for MD Directorate. MD assigns directly to GM.",
                "steps": [
                    {"order": 1, "title": "MD Assignment", "required_role": "Managing Director", "required_grade_level": "MDCS"},
                    {"order": 2, "title": "GM Assignment", "required_role": "General Manager", "required_grade_level": "MSS1"},
                    {"order": 3, "title": "AGM Treatment", "required_role": "Assistant General Manager", "required_grade_level": "MSS2"},
                ],
            },
        ]

        RETIRED_WORKFLOW_SLUGS = (
            "directorate-approval",
            "executive-approval",
            "parallel-review",
            "for-information-only",
        )
        retired, _ = WorkflowTemplate.objects.filter(slug__in=RETIRED_WORKFLOW_SLUGS).delete()
        if retired:
            self.stdout.write(f"  Retired overlapping workflow templates ({retired} rows)")

        # Create or update each workflow template
        for wf_data in WORKFLOW_TEMPLATES:
            template, created = WorkflowTemplate.objects.update_or_create(
                slug=wf_data["slug"],
                defaults={
                    "name": wf_data["name"],
                    "description": wf_data["description"],
                    "applies_to": WorkflowTemplate.AppliesTo.CORRESPONDENCE,
                    "is_active": True,
                    "created_by": md_user,
                },
            )

            # Create or update steps
            for step_data in wf_data["steps"]:
                WorkflowStep.objects.update_or_create(
                    template=template,
                    order=step_data["order"],
                    defaults={
                        "title": step_data["title"],
                        "required_role": step_data.get("required_role", ""),
                        "required_grade_level": step_data.get("required_grade_level", ""),
                        "requires_all_assistants": step_data.get("requires_all_assistants", False),
                    },
                )

            action = "Created" if created else "Updated"
            self.stdout.write(f"  {action}: {wf_data['name']} ({len(wf_data['steps'])} steps)")

        # Create a sample approval task using MD Directorate workflow
        md_template = WorkflowTemplate.objects.filter(slug="md-directorate-approval").first()
        if md_template and correspondence_items.get("primary"):
            step1 = md_template.steps.first()
            task, _ = ApprovalTask.objects.update_or_create(
                template=md_template,
                step=step1,
                correspondence=correspondence_items["primary"],
                assignee=md_user,
                defaults={
                    "status": ApprovalTask.Status.IN_PROGRESS,
                    "remarks": "Sample task for demonstration",
                },
            )

            TaskAction.objects.update_or_create(
                task=task,
                action=TaskAction.Action.ASSIGNED,
                defaults={
                    "actor": users.get("gmict") or users.get("user-gm-ict"),
                    "notes": "Task created and assigned",
                },
            )

        self.stdout.write(self.style.SUCCESS(f"Workflow templates ensured: {len(WORKFLOW_TEMPLATES)} templates"))

    def _ensure_support_content(self, users: dict[str, User]):
        HelpGuide.objects.update_or_create(
            slug="dms-overview",
            defaults={
                "title": "Understanding the Document Management Workspace",
                "category": "dms",
                "audience": "All Staff",
                "summary": "Learn how to create, search, and collaborate on documents.",
                "content": "## Creating Documents\nUse the New Document button...",
                "tags": ["documents", "collaboration"],
            },
        )

        FaqEntry.objects.update_or_create(
            question="How do I request access to a sensitive document?",
            defaults={
                "answer": "Submit a support ticket with document reference.",
                "category": "dms",
                "order": 1,
                "tags": ["access", "permissions"],
            },
        )

        SupportTicket.objects.update_or_create(
            subject="Can we enable dark mode for the ECM portal?",
            created_by=users.get("gmict") or users.get("user-gm-ict"),
            defaults={
                "description": "Requesting dark theme availability across correspondence module.",
                "priority": SupportTicket.Priority.MEDIUM,
                "status": SupportTicket.Status.OPEN,
                "assigned_to": users.get("pamd") or users.get("user-pa-md"),
            },
        )

        self.stdout.write(self.style.SUCCESS("Support content ensured."))

    def _ensure_analytics(self, users: dict[str, User]):
        ReportSnapshot.objects.update_or_create(
            slug="dms-activity-summary",
            defaults={
                "title": "DMS Activity Summary",
                "description": "Snapshot of document activity for the last 30 days",
                "generated_for": users.get("md") or users.get("user-md"),
                "filters": {"range": "30d"},
                "data": {
                    "documents_created": 18,
                    "documents_published": 7,
                    "top_tags": ["ecm", "strategy"],
                },
            },
        )

        UsageMetric.objects.update_or_create(
            metric="dms.documents.viewed",
            recorded_at=timezone.now(),
            defaults={"value": 125.0, "metadata": {"window": "24h"}},
        )

        self.stdout.write(self.style.SUCCESS("Analytics data ensured."))

    def _ensure_project_cases(
        self,
        users: dict[str, User],
        divisions: dict[str, "Division"],
        departments: dict[str, "Department"],
        offices: dict[str, "Office"],
    ):
        """Create sample project cases with forms, documents, and correspondence."""
        from forms.models import FormTemplate
        from correspondence.models import Correspondence
        from datetime import timedelta

        # Use the seeded NPA Internal Audit forms (see seed_audit_forms).
        monitoring_form = FormTemplate.objects.filter(slug="project-monitoring-report-audit").first()
        deliveries_form = FormTemplate.objects.filter(slug="witnessing-of-deliveries").first()
        bills_form = FormTemplate.objects.filter(slug="audit-query-bills-certification").first()

        if not all([monitoring_form, deliveries_form, bills_form]):
            self.stdout.write(
                self.style.WARNING(
                    "Audit form templates not found. Run seed_audit_forms (or full demo seed) first."
                )
            )
            return

        # Keep legacy local names used by case form attachments below.
        completion_form = monitoring_form
        audit_form = deliveries_form
        payment_form = bills_form

        # Get required divisions and offices
        engineering_division = None
        audit_division = None
        finance_division = None
        procurement_department = None

        for div in divisions.values():
            if "engineering" in div.name.lower() or "marine" in div.name.lower():
                engineering_division = div
            elif "audit" in div.name.lower():
                audit_division = div
            elif "finance" in div.name.lower():
                finance_division = div

        for dept in departments.values():
            if "procurement" in dept.name.lower():
                procurement_department = dept

        # Use first available division/department if specific ones not found
        if not engineering_division:
            engineering_division = list(divisions.values())[0] if divisions else None
        if not audit_division:
            audit_division = list(divisions.values())[0] if divisions else None
        if not finance_division:
            finance_division = list(divisions.values())[0] if divisions else None
        if not procurement_department:
            procurement_department = list(departments.values())[0] if departments else None

        # Get offices
        engineering_office = offices.get("office-engineering") or Office.objects.filter(
            division=engineering_division
        ).first() if engineering_division else None
        audit_office = offices.get("office-audit") or Office.objects.filter(
            division=audit_division
        ).first() if audit_division else None

        # Get users
        engineering_user = users.get("user-gm-engineering") or users.get("gmict") or list(users.values())[0]
        audit_user = users.get("user-gm-audit") or list(users.values())[0]
        finance_user = users.get("user-gm-finance") or list(users.values())[0]

        # Case 1: Wharf Rehabilitation (Lagos Port) - from user's design
        case1, created1 = Case.objects.update_or_create(
            case_number="NPA/PROC/2025/0147",
            defaults={
                "title": "Contract – Wharf Rehabilitation (Lagos Port)",
                "description": "Rehabilitation of wharf infrastructure at Lagos Port. Contract awarded to ABC Marine Ltd.",
                "case_type": Case.CaseType.PROJECT,
                "status": Case.Status.IN_PROGRESS,
                "priority": Correspondence.Priority.HIGH,
                "division": engineering_division,
                "department": procurement_department,
                "owning_office": engineering_office,
                "current_office": audit_office,
                "created_by": engineering_user,
                "assigned_to": audit_user,
                "tags": ["wharf", "rehabilitation", "lagos-port", "infrastructure"],
                "metadata": {
                    "award_date": "2025-02-12",
                    "contractor": "ABC Marine Ltd",
                    "contract_value": 2450000000,
                    "procurement_ref": "NPA/PROC/CON/021",
                },
            },
        )

        if created1:
            # Create documents for case 1
            doc1, _ = Document.objects.update_or_create(
                reference_number="NPA/PROC/CON/021",
                defaults={
                    "title": "Contract Award Letter - Wharf Rehabilitation",
                    "description": "Official contract award letter to ABC Marine Ltd",
                    "document_type": Document.DocumentType.LETTER,
                    "status": Document.DocumentStatus.PUBLISHED,
                    "sensitivity": Document.Sensitivity.INTERNAL,
                    "author": engineering_user,
                    "division": engineering_division,
                    "department": procurement_department,
                    "tags": ["contract", "award"],
                },
            )
            CaseDocumentLink.objects.get_or_create(case=case1, document=doc1)
            
            # Add document version for contract award letter
            DocumentVersion.objects.update_or_create(
                document=doc1,
                version_number=1,
                defaults={
                    "file_name": "Contract-Award-Letter-Wharf-Rehabilitation.pdf",
                    "file_type": "application/pdf",
                    "file_size": 245760,  # ~240 KB
                    "file_url": "",  # In real scenario, this would point to actual file
                    "content_html": """
                    <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
                        <h1 style="text-align: center; color: #1a1a1a;">CONTRACT AWARD LETTER</h1>
                        <p style="text-align: center; color: #666; margin-top: 10px;">Reference: NPA/PROC/CON/021</p>
                        <hr style="margin: 30px 0; border: 1px solid #ddd;">
                        
                        <p><strong>Date:</strong> February 12, 2025</p>
                        
                        <p><strong>To:</strong><br>
                        ABC Marine Ltd<br>
                        Lagos, Nigeria</p>
                        
                        <p style="margin-top: 30px;">Dear Sir/Madam,</p>
                        
                        <p style="margin-top: 20px; line-height: 1.6;">
                        Following the procurement process and evaluation of tenders, I am pleased to inform you that 
                        your company has been awarded the contract for the <strong>Wharf Rehabilitation Project at Lagos Port</strong>.
                        </p>
                        
                        <div style="background: #f5f5f5; padding: 20px; margin: 30px 0; border-left: 4px solid #2563eb;">
                            <h3 style="margin-top: 0;">Contract Details:</h3>
                            <ul style="line-height: 1.8;">
                                <li><strong>Contract Value:</strong> ₦2,450,000,000.00 (Two Billion, Four Hundred and Fifty Million Naira)</li>
                                <li><strong>Project Duration:</strong> 12 months</li>
                                <li><strong>Project Location:</strong> Lagos Port, Apapa</li>
                                <li><strong>Contract Reference:</strong> NPA/PROC/CON/021</li>
                            </ul>
                        </div>
                        
                        <p style="margin-top: 20px; line-height: 1.6;">
                        Please confirm your acceptance of this award within 7 days of receipt of this letter. 
                        The contract documents will be forwarded to you upon confirmation.
                        </p>
                        
                        <p style="margin-top: 30px;">Yours faithfully,</p>
                        
                        <p style="margin-top: 50px;">
                        <strong>General Manager, Procurement</strong><br>
                        Nigerian Ports Authority<br>
                        Lagos, Nigeria
                        </p>
                    </div>
                    """,
                    "content_text": "CONTRACT AWARD LETTER - Reference: NPA/PROC/CON/021. Date: February 12, 2025. To: ABC Marine Ltd. Following the procurement process, your company has been awarded the contract for Wharf Rehabilitation Project at Lagos Port. Contract Value: ₦2,450,000,000.00. Project Duration: 12 months. Project Location: Lagos Port, Apapa.",
                    "summary": "Official contract award letter for Wharf Rehabilitation project to ABC Marine Ltd",
                    "uploaded_by": engineering_user,
                    "notes": "Contract award letter - Wharf Rehabilitation Project",
                },
            )

            doc2, _ = Document.objects.update_or_create(
                reference_number="NPA/ENG/BOQ/2025/001",
                defaults={
                    "title": "BOQ Final - Wharf Rehabilitation",
                    "description": "Final Bill of Quantities for wharf rehabilitation project",
                    "document_type": Document.DocumentType.REPORT,
                    "status": Document.DocumentStatus.PUBLISHED,
                    "sensitivity": Document.Sensitivity.INTERNAL,
                    "author": engineering_user,
                    "division": engineering_division,
                    "tags": ["boq", "engineering"],
                },
            )
            CaseDocumentLink.objects.get_or_create(case=case1, document=doc2)
            
            # Add document version for BOQ
            DocumentVersion.objects.update_or_create(
                document=doc2,
                version_number=1,
                defaults={
                    "file_name": "BOQ-Final-Wharf-Rehabilitation.pdf",
                    "file_type": "application/pdf",
                    "file_size": 512000,  # ~500 KB
                    "file_url": "",
                    "content_html": """
                    <div style="font-family: Arial, sans-serif; padding: 40px;">
                        <h1 style="text-align: center;">BILL OF QUANTITIES (BOQ)</h1>
                        <h2 style="text-align: center; color: #666;">Wharf Rehabilitation Project - Lagos Port</h2>
                        <p style="text-align: center;">Reference: NPA/ENG/BOQ/2025/001</p>
                        <p style="text-align: center;">Date: February 15, 2025</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
                            <thead>
                                <tr style="background: #2563eb; color: white;">
                                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Item No.</th>
                                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Description</th>
                                    <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Quantity</th>
                                    <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Unit</th>
                                    <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Unit Price (₦)</th>
                                    <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Amount (₦)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #ddd;">1</td>
                                    <td style="padding: 10px; border: 1px solid #ddd;">Concrete works - Wharf deck rehabilitation</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">2,500</td>
                                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">m²</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">450,000</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">1,125,000,000</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #ddd;">2</td>
                                    <td style="padding: 10px; border: 1px solid #ddd;">Steel reinforcement works</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">180</td>
                                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">tons</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">2,500,000</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">450,000,000</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #ddd;">3</td>
                                    <td style="padding: 10px; border: 1px solid #ddd;">Marine fender system installation</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">25</td>
                                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">units</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">8,000,000</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">200,000,000</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #ddd;">4</td>
                                    <td style="padding: 10px; border: 1px solid #ddd;">Dredging and excavation works</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">15,000</td>
                                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">m³</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">25,000</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">375,000,000</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #ddd;">5</td>
                                    <td style="padding: 10px; border: 1px solid #ddd;">Electrical and lighting installation</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">1</td>
                                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">lot</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">300,000,000</td>
                                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">300,000,000</td>
                                </tr>
                                <tr style="background: #f5f5f5; font-weight: bold;">
                                    <td colspan="5" style="padding: 15px; text-align: right; border: 1px solid #ddd;">TOTAL CONTRACT SUM:</td>
                                    <td style="padding: 15px; text-align: right; border: 1px solid #ddd;">₦2,450,000,000</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <p style="margin-top: 30px;"><strong>Prepared by:</strong> Engineering Division, NPA</p>
                        <p><strong>Approved by:</strong> General Manager, Engineering</p>
                    </div>
                    """,
                    "content_text": "BILL OF QUANTITIES - Wharf Rehabilitation Project. Item 1: Concrete works - 2,500 m² @ ₦450,000 = ₦1,125,000,000. Item 2: Steel reinforcement - 180 tons @ ₦2,500,000 = ₦450,000,000. Item 3: Marine fenders - 25 units @ ₦8,000,000 = ₦200,000,000. Item 4: Dredging - 15,000 m³ @ ₦25,000 = ₦375,000,000. Item 5: Electrical - 1 lot = ₦300,000,000. TOTAL: ₦2,450,000,000",
                    "summary": "Final Bill of Quantities for wharf rehabilitation project with detailed item breakdown",
                    "uploaded_by": engineering_user,
                    "notes": "Final approved BOQ - Wharf Rehabilitation",
                },
            )

            doc3, _ = Document.objects.update_or_create(
                reference_number="NPA/ENG/COMP/2025/001",
                defaults={
                    "title": "Completion Report - Wharf Rehabilitation",
                    "description": "Project completion report submitted by user department",
                    "document_type": Document.DocumentType.REPORT,
                    "status": Document.DocumentStatus.PUBLISHED,
                    "sensitivity": Document.Sensitivity.INTERNAL,
                    "author": engineering_user,
                    "division": engineering_division,
                    "tags": ["completion", "report"],
                },
            )
            CaseDocumentLink.objects.get_or_create(case=case1, document=doc3)
            
            # Add document version for completion report
            DocumentVersion.objects.update_or_create(
                document=doc3,
                version_number=1,
                defaults={
                    "file_name": "Completion-Report-Wharf-Rehabilitation.pdf",
                    "file_type": "application/pdf",
                    "file_size": 384000,  # ~375 KB
                    "file_url": "",
                    "content_html": """
                    <div style="font-family: Arial, sans-serif; padding: 40px;">
                        <h1 style="text-align: center;">PROJECT COMPLETION REPORT</h1>
                        <h2 style="text-align: center; color: #666;">Wharf Rehabilitation Project - Lagos Port</h2>
                        <p style="text-align: center;">Reference: NPA/ENG/COMP/2025/001</p>
                        <p style="text-align: center;">Date: May 18, 2025</p>
                        
                        <div style="margin-top: 40px;">
                            <h3>1. PROJECT SUMMARY</h3>
                            <p><strong>Project Title:</strong> Wharf Rehabilitation at Lagos Port</p>
                            <p><strong>Contractor:</strong> ABC Marine Ltd</p>
                            <p><strong>Contract Value:</strong> ₦2,450,000,000.00</p>
                            <p><strong>Contract Award Date:</strong> February 12, 2025</p>
                            <p><strong>Project Duration:</strong> 12 months</p>
                            <p><strong>Completion Date:</strong> May 15, 2025</p>
                        </div>
                        
                        <div style="margin-top: 30px;">
                            <h3>2. SCOPE OF WORK COMPLETED</h3>
                            <p>The following works have been fully completed as per contract specifications:</p>
                            <ul style="line-height: 1.8;">
                                <li>Concrete rehabilitation of wharf deck (2,500 m²) - <strong>100% Complete</strong></li>
                                <li>Steel reinforcement works (180 tons) - <strong>100% Complete</strong></li>
                                <li>Marine fender system installation (25 units) - <strong>100% Complete</strong></li>
                                <li>Dredging and excavation works (15,000 m³) - <strong>100% Complete</strong></li>
                                <li>Electrical and lighting installation - <strong>100% Complete</strong></li>
                            </ul>
                        </div>
                        
                        <div style="margin-top: 30px;">
                            <h3>3. PHYSICAL INSPECTION</h3>
                            <p><strong>Inspection Date:</strong> May 15, 2025</p>
                            <p><strong>Inspection Conducted By:</strong> Engineering Division, NPA</p>
                            <p><strong>Findings:</strong> All works completed in accordance with contract specifications. Quality standards met. Site cleared and ready for operations.</p>
                        </div>
                        
                        <div style="margin-top: 30px;">
                            <h3>4. OUTSTANDING ISSUES</h3>
                            <p><strong>Status:</strong> None</p>
                            <p>All contractual obligations have been fulfilled. No outstanding issues.</p>
                        </div>
                        
                        <div style="margin-top: 30px;">
                            <h3>5. SUPPORTING DOCUMENTS</h3>
                            <ul>
                                <li>Site inspection photographs</li>
                                <li>Engineer's confirmation certificate</li>
                                <li>Material test certificates</li>
                                <li>As-built drawings</li>
                            </ul>
                        </div>
                        
                        <div style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-left: 4px solid #22c55e;">
                            <p><strong>DECLARATION:</strong></p>
                            <p>I hereby confirm that the above information is true and accurate. The Wharf Rehabilitation Project has been completed in full accordance with the contract specifications.</p>
                            <p style="margin-top: 30px;">
                            <strong>Isa Umar</strong><br>
                            General Manager, Engineering<br>
                            Nigerian Ports Authority<br>
                            Date: May 18, 2025
                            </p>
                        </div>
                    </div>
                    """,
                    "content_text": "PROJECT COMPLETION REPORT - Wharf Rehabilitation Project. Contractor: ABC Marine Ltd. Contract Value: ₦2,450,000,000. All works completed 100%. Physical inspection conducted May 15, 2025. No outstanding issues. Declaration signed by General Manager, Engineering.",
                    "summary": "Project completion report confirming full completion of wharf rehabilitation works",
                    "uploaded_by": engineering_user,
                    "notes": "Completion report - Wharf Rehabilitation Project",
                },
            )

            doc4, _ = Document.objects.update_or_create(
                reference_number="NPA/FIN/INV/2025/001",
                defaults={
                    "title": "Contractor Invoice (₦2.45bn) - ABC Marine Ltd",
                    "description": "Final invoice for wharf rehabilitation project",
                    "document_type": Document.DocumentType.FORM,
                    "status": Document.DocumentStatus.DRAFT,
                    "sensitivity": Document.Sensitivity.INTERNAL,
                    "author": finance_user,
                    "division": finance_division,
                    "tags": ["invoice", "payment"],
                },
            )
            CaseDocumentLink.objects.get_or_create(case=case1, document=doc4)
            
            # Add document version for invoice
            DocumentVersion.objects.update_or_create(
                document=doc4,
                version_number=1,
                defaults={
                    "file_name": "Invoice-ABC-Marine-Wharf-Rehabilitation.pdf",
                    "file_type": "application/pdf",
                    "file_size": 128000,  # ~125 KB
                    "file_url": "",
                    "content_html": """
                    <div style="font-family: Arial, sans-serif; padding: 40px;">
                        <div style="text-align: center; margin-bottom: 40px;">
                            <h1 style="color: #1a1a1a;">INVOICE</h1>
                            <p style="color: #666;">ABC Marine Ltd</p>
                        </div>
                        
                        <table style="width: 100%; margin-bottom: 30px;">
                            <tr>
                                <td style="width: 50%;">
                                    <p><strong>Invoice Number:</strong> INV/2025/001</p>
                                    <p><strong>Invoice Date:</strong> May 22, 2025</p>
                                    <p><strong>Due Date:</strong> June 22, 2025</p>
                                </td>
                                <td style="width: 50%; text-align: right;">
                                    <p><strong>Bill To:</strong></p>
                                    <p>Nigerian Ports Authority<br>
                                    Lagos, Nigeria</p>
                                </td>
                            </tr>
                        </table>
                        
                        <div style="background: #f5f5f5; padding: 20px; margin: 30px 0;">
                            <h3 style="margin-top: 0;">Project: Wharf Rehabilitation - Lagos Port</h3>
                            <p><strong>Contract Reference:</strong> NPA/PROC/CON/021</p>
                            <p><strong>Contract Award Date:</strong> February 12, 2025</p>
                        </div>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                            <thead>
                                <tr style="background: #2563eb; color: white;">
                                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Description</th>
                                    <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Amount (₦)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #ddd;">Final Payment - Wharf Rehabilitation Project</td>
                                    <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">2,450,000,000.00</td>
                                </tr>
                                <tr style="background: #f5f5f5; font-weight: bold; font-size: 1.1em;">
                                    <td style="padding: 15px; border: 1px solid #ddd;">TOTAL AMOUNT DUE</td>
                                    <td style="padding: 15px; text-align: right; border: 1px solid #ddd;">₦2,450,000,000.00</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div style="margin-top: 40px; padding: 20px; background: #fff3cd; border-left: 4px solid #ffc107;">
                            <p><strong>Payment Terms:</strong> Net 30 days</p>
                            <p><strong>Bank Details:</strong></p>
                            <p>Account Name: ABC Marine Ltd<br>
                            Account Number: 1234567890<br>
                            Bank: First Bank of Nigeria<br>
                            Sort Code: 011</p>
                        </div>
                        
                        <p style="margin-top: 40px; text-align: right;">
                        <strong>For: ABC Marine Ltd</strong><br><br>
                        _________________________<br>
                        Authorized Signatory
                        </p>
                    </div>
                    """,
                    "content_text": "INVOICE - ABC Marine Ltd. Invoice Number: INV/2025/001. Date: May 22, 2025. Project: Wharf Rehabilitation - Lagos Port. Contract Reference: NPA/PROC/CON/021. Final Payment Amount: ₦2,450,000,000.00. Payment Terms: Net 30 days.",
                    "summary": "Final invoice for wharf rehabilitation project completion",
                    "uploaded_by": finance_user,
                    "notes": "Contractor invoice - Wharf Rehabilitation Project",
                },
            )

            # Create form documents
            # 1. Project Completion Validation (Approved)
            completion_doc, _ = Document.objects.update_or_create(
                reference_number="NPA/FORM/COMP/2025/001",
                defaults={
                    "title": "Project Completion Validation Form - Wharf Rehabilitation",
                    "description": "Completion validation form for wharf rehabilitation project",
                    "document_type": Document.DocumentType.FORM,
                    "status": Document.DocumentStatus.PUBLISHED,
                    "sensitivity": Document.Sensitivity.INTERNAL,
                    "author": engineering_user,
                    "division": engineering_division,
                    "department": procurement_department,
                    "tags": ["form", "completion"],
                },
            )
            completion_form_doc, _ = FormDocument.objects.update_or_create(
                document=completion_doc,
                defaults={
                    "template": completion_form,
                    "form_data": {
                        "to": "General Manager, Audit",
                        "from_field": "General Manager, Engineering",
                        "subject": "Project Monitoring Report - Wharf Rehabilitation",
                        "project": "Wharf Rehabilitation (Lagos Port)",
                        "date": "2025-05-15",
                        "our_ref": "NPA/ENG/PMR/2025/001",
                        "location": "Lagos Port, Apapa",
                        "contractor_name": "ABC Marine Ltd",
                        "contractor_address": "Lagos, Nigeria",
                        "contract_sum": 2450000000,
                        "award_ref": "NPA/PROC/CON/021",
                        "project_manager": engineering_user.get_full_name() or engineering_user.username,
                        "audit_assignment": "Routine project monitoring for payment clearance",
                        "attach_boq": True,
                        "check_boq_extent": True,
                        "review_unit_price": True,
                        "attach_working_papers": True,
                        "comments": "Works inspected and found satisfactory.",
                        "observation": "No material variance against BOQ.",
                        "recommendation": "Clear for next payment milestone.",
                    },
                    "status": FormDocument.FormStatus.COMPLETED,
                },
            )
            CaseFormLink.objects.get_or_create(case=case1, form_document=completion_form_doc)
            
            # Add document version for completion form (with form content)
            form_html_content = f"""
            <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto;">
                <h1 style="text-align: center; color: #1a1a1a; border-bottom: 3px solid #2563eb; padding-bottom: 20px;">
                    PROJECT COMPLETION VALIDATION FORM
                </h1>
                <p style="text-align: center; color: #666; margin-top: 10px;">
                    Case: {case1.case_number} - {case1.title}
                </p>
                
                <div style="margin-top: 40px;">
                    <h3 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">1. Scope of Work Completed?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Fully Completed ✓
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">2. Physical Inspection Conducted?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Yes ✓
                    </p>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Inspection Date:</strong> May 15, 2025
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">3. Any Outstanding Issues?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> No ✓
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">4. Supporting Documents Attached</h3>
                    <ul style="font-size: 16px; line-height: 2;">
                        <li>✓ Completion Report</li>
                        <li>✓ Site Photos</li>
                        <li>✓ Engineer's Confirmation</li>
                    </ul>
                </div>
                
                <div style="margin-top: 40px; padding: 25px; background: #f5f5f5; border-left: 4px solid #22c55e;">
                    <h3 style="margin-top: 0; color: #1a1a1a;">DECLARATION</h3>
                    <p style="line-height: 1.8;">
                        I confirm that the above information is true and accurate.
                    </p>
                    <p style="margin-top: 30px;">
                        <strong>Name:</strong> {engineering_user.get_full_name() or engineering_user.username}<br>
                        <strong>Designation:</strong> General Manager, Engineering<br>
                        <strong>Date:</strong> May 18, 2025
                    </p>
                </div>
            </div>
            """
            DocumentVersion.objects.update_or_create(
                document=completion_doc,
                version_number=1,
                defaults={
                    "file_name": "Project-Completion-Validation-Form-Wharf-Rehabilitation.html",
                    "file_type": "text/html",
                    "file_size": len(form_html_content.encode('utf-8')),
                    "file_url": "",
                    "content_html": form_html_content,
                    "content_text": "PROJECT COMPLETION VALIDATION FORM - Wharf Rehabilitation. Scope: Fully Completed. Physical Inspection: Yes (May 15, 2025). Outstanding Issues: None. Supporting Documents: All attached. Declared by: General Manager, Engineering.",
                    "summary": "Project completion validation form for wharf rehabilitation project",
                    "uploaded_by": engineering_user,
                    "notes": "Completed form - Wharf Rehabilitation",
                },
            )

            # 2. Audit Monitoring Form (Pending)
            audit_doc, _ = Document.objects.update_or_create(
                reference_number="NPA/FORM/AUDIT/2025/001",
                defaults={
                    "title": "Audit Monitoring & Clearance Form - Wharf Rehabilitation",
                    "description": "Audit monitoring and clearance form for wharf rehabilitation project",
                    "document_type": Document.DocumentType.FORM,
                    "status": Document.DocumentStatus.DRAFT,
                    "sensitivity": Document.Sensitivity.INTERNAL,
                    "author": audit_user,
                    "division": audit_division,
                    "tags": ["form", "audit"],
                },
            )
            audit_form_doc, _ = FormDocument.objects.update_or_create(
                document=audit_doc,
                defaults={
                    "template": audit_form,
                    "form_data": {
                        "date": "2025-04-10",
                        "location": "Lagos Port, Apapa",
                        "contractor_name": "ABC Marine Ltd",
                        "contractor_address": "Lagos, Nigeria",
                        "award_ref": "NPA/PROC/CON/021",
                        "vehicle_reg": "LAG-452-KJ",
                        "items": [
                            {
                                "sn": 1,
                                "qty": 20,
                                "description": "Reinforcement steel rods",
                                "unit_price": 185000,
                                "amount": 3700000,
                            },
                            {
                                "sn": 2,
                                "qty": 50,
                                "description": "Cement bags (50kg)",
                                "unit_price": 12500,
                                "amount": 625000,
                            },
                        ],
                        "sub_total": 4325000,
                        "vat": 324375,
                        "grand_total": 4649375,
                        "supplier_name": "ABC Marine Ltd",
                        "supplier_date": "2025-04-10",
                    },
                    "status": FormDocument.FormStatus.AWAITING_SIGNATURES,
                },
            )
            CaseFormLink.objects.get_or_create(case=case1, form_document=audit_form_doc)
            
            # Add document version for audit form
            audit_form_html = f"""
            <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto;">
                <h1 style="text-align: center; color: #1a1a1a; border-bottom: 3px solid #dc2626; padding-bottom: 20px;">
                    AUDIT MONITORING & CLEARANCE FORM
                </h1>
                <p style="text-align: center; color: #666; margin-top: 10px;">
                    Case: {case1.case_number} - {case1.title}
                </p>
                
                <div style="margin-top: 40px;">
                    <h3 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">1. Contract Award Compliance Verified?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Yes ✓
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">2. Procurement Process Reviewed?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Yes ✓
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">3. User Department Completion Acknowledgment Attached?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Yes ✓
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">4. Procurement Monitoring Officer Confirmation?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Yes ✓
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">5. Any Audit Observations?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> None ✓
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">6. Risk Level</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Low
                    </p>
                </div>
                
                <div style="margin-top: 30px; padding: 20px; background: #dcfce7; border-left: 4px solid #22c55e;">
                    <h3 style="margin-top: 0; color: #1a1a1a;">AUDIT RECOMMENDATION</h3>
                    <p style="font-size: 18px; font-weight: bold; color: #16a34a;">
                        ✓ Clear for Payment
                    </p>
                </div>
                
                <div style="margin-top: 40px; padding: 25px; background: #f5f5f5; border: 1px solid #ddd;">
                    <h3 style="margin-top: 0;">APPROVALS</h3>
                    <p><strong>Audit Officer:</strong> {audit_user.get_full_name() or audit_user.username}</p>
                    <p style="margin-top: 20px;"><strong>GM Audit Approval:</strong> Pending</p>
                </div>
            </div>
            """
            DocumentVersion.objects.update_or_create(
                document=audit_doc,
                version_number=1,
                defaults={
                    "file_name": "Audit-Monitoring-Clearance-Form-Wharf-Rehabilitation.html",
                    "file_type": "text/html",
                    "file_size": len(audit_form_html.encode('utf-8')),
                    "file_url": "",
                    "content_html": audit_form_html,
                    "content_text": "AUDIT MONITORING & CLEARANCE FORM - Wharf Rehabilitation. All compliance checks verified. Risk Level: Low. Recommendation: Clear for Payment. Pending GM Audit approval.",
                    "summary": "Audit monitoring and clearance form - pending GM approval",
                    "uploaded_by": audit_user,
                    "notes": "Audit clearance form - Wharf Rehabilitation",
                },
            )

            # 3. Payment Certification (Locked - will be created after audit approval)
            # This form is locked until audit form is approved, so we don't create it yet

            # Create correspondence items
            from correspondence.models import Correspondence

            corr1, _ = Correspondence.objects.update_or_create(
                reference_number="NPA/CORR/2025/COMP-001",
                defaults={
                    "subject": "Completion Confirmation – Wharf Rehabilitation Project",
                    "body_html": "<p><em>User department confirms project completion</em></p><p>This is to confirm that the Wharf Rehabilitation project has been fully completed as per contract specifications.</p>",
                    "source": Correspondence.Source.INTERNAL,
                    "priority": Correspondence.Priority.HIGH,
                    "direction": Correspondence.Direction.UPWARD,
                    "status": Correspondence.Status.COMPLETED,
                    "division": engineering_division,
                    "department": procurement_department,
                    "created_by": engineering_user,
                    "current_office": audit_office,
                    "owning_office": engineering_office,
                    "received_date": date.today() - timedelta(days=10),
                },
            )
            CaseCorrespondenceLink.objects.get_or_create(case=case1, correspondence=corr1)

            corr2, _ = Correspondence.objects.update_or_create(
                reference_number="NPA/CORR/2025/INV-001",
                defaults={
                    "subject": "Invoice Submission – Wharf Rehabilitation (₦2.45bn)",
                    "body_html": "<p><em>Contractor submits final invoice for payment</em></p><p>Please find attached the final invoice for the completed wharf rehabilitation project.</p>",
                    "source": Correspondence.Source.EXTERNAL,
                    "priority": Correspondence.Priority.HIGH,
                    "direction": Correspondence.Direction.UPWARD,
                    "status": Correspondence.Status.IN_PROGRESS,
                    "division": finance_division,
                    "created_by": finance_user,
                    "current_office": audit_office,
                    "owning_office": engineering_office,
                    "received_date": date.today() - timedelta(days=3),
                },
            )
            CaseCorrespondenceLink.objects.get_or_create(case=case1, correspondence=corr2)

            self.stdout.write(
                self.style.SUCCESS(f'Created project case: {case1.case_number} - {case1.title}')
            )

        # Case 2: Port Access Road Upgrade (Calabar Port)
        case2, created2 = Case.objects.update_or_create(
            case_number="NPA/PROC/2025/0089",
            defaults={
                "title": "Port Access Road Upgrade (Calabar Port)",
                "description": "Upgrading and expansion of port access road infrastructure at Calabar Port",
                "case_type": Case.CaseType.PROJECT,
                "status": Case.Status.IN_PROGRESS,
                "priority": Correspondence.Priority.MEDIUM,
                "division": engineering_division,
                "department": procurement_department,
                "owning_office": engineering_office,
                "current_office": engineering_office,
                "created_by": engineering_user,
                "assigned_to": engineering_user,
                "tags": ["road", "upgrade", "calabar-port", "infrastructure"],
                "metadata": {
                    "award_date": "2025-01-15",
                    "contractor": "InfraBuild Nigeria Ltd",
                    "contract_value": 1850000000,
                    "procurement_ref": "NPA/PROC/CON/015",
                },
            },
        )

        if created2:
            # Create completion form (in progress)
            completion_doc2, _ = Document.objects.update_or_create(
                reference_number="NPA/FORM/COMP/2025/002",
                defaults={
                    "title": "Project Completion Validation Form - Port Access Road",
                    "description": "Completion validation form for port access road upgrade",
                    "document_type": Document.DocumentType.FORM,
                    "status": Document.DocumentStatus.DRAFT,
                    "sensitivity": Document.Sensitivity.INTERNAL,
                    "author": engineering_user,
                    "division": engineering_division,
                    "tags": ["form", "completion"],
                },
            )
            completion_form_doc2, _ = FormDocument.objects.update_or_create(
                document=completion_doc2,
                defaults={
                    "template": completion_form,
                    "form_data": {
                        "to": "General Manager, Audit",
                        "from_field": "General Manager, Engineering",
                        "subject": "Project Monitoring Report - Access Road",
                        "project": "Access Road Construction",
                        "date": "2025-05-20",
                        "our_ref": "NPA/ENG/PMR/2025/002",
                        "location": "Lagos Port access corridor",
                        "contractor_name": "RoadWorks Nigeria Ltd",
                        "contract_sum": 1800000000,
                        "award_ref": "NPA/PROC/CON/045",
                        "project_manager": engineering_user.get_full_name() or engineering_user.username,
                        "comments": "Final asphalt layer pending due to weather conditions.",
                        "observation": "Partial completion verified on site.",
                        "recommendation": "Hold final payment until asphalt layer is complete.",
                        "attach_boq": True,
                        "check_boq_extent": True,
                    },
                    "status": FormDocument.FormStatus.DRAFT,
                },
            )
            CaseFormLink.objects.get_or_create(case=case2, form_document=completion_form_doc2)
            
            # Add document version for case2 completion form
            form_html_content2 = f"""
            <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto;">
                <h1 style="text-align: center; color: #1a1a1a; border-bottom: 3px solid #2563eb; padding-bottom: 20px;">
                    PROJECT COMPLETION VALIDATION FORM
                </h1>
                <p style="text-align: center; color: #666; margin-top: 10px;">
                    Case: {case2.case_number} - {case2.title}
                </p>
                
                <div style="margin-top: 40px;">
                    <h3 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">1. Scope of Work Completed?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Partially Completed ⚠️
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">2. Physical Inspection Conducted?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Yes ✓
                    </p>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Inspection Date:</strong> May 20, 2025
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">3. Any Outstanding Issues?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Yes ⚠️
                    </p>
                    <p style="font-size: 16px; margin: 15px 0; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107;">
                        <strong>Description:</strong> Final asphalt layer pending due to weather conditions
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">4. Supporting Documents Attached</h3>
                    <ul style="font-size: 16px; line-height: 2;">
                        <li>✓ Completion Report</li>
                        <li>✗ Site Photos</li>
                        <li>✗ Engineer's Confirmation</li>
                    </ul>
                </div>
                
                <div style="margin-top: 40px; padding: 25px; background: #f5f5f5; border-left: 4px solid #f59e0b;">
                    <h3 style="margin-top: 0; color: #1a1a1a;">DECLARATION</h3>
                    <p style="line-height: 1.8;">
                        I confirm that the above information is true and accurate.
                    </p>
                    <p style="margin-top: 30px;">
                        <strong>Name:</strong> {engineering_user.get_full_name() or engineering_user.username}<br>
                        <strong>Designation:</strong> General Manager, Engineering<br>
                        <strong>Date:</strong> May 20, 2025
                    </p>
                </div>
            </div>
            """
            DocumentVersion.objects.update_or_create(
                document=completion_doc2,
                version_number=1,
                defaults={
                    "file_name": "Project-Completion-Validation-Form-Port-Access-Road.html",
                    "file_type": "text/html",
                    "file_size": len(form_html_content2.encode('utf-8')),
                    "file_url": "",
                    "content_html": form_html_content2,
                    "content_text": "PROJECT COMPLETION VALIDATION FORM - Port Access Road. Scope: Partially Completed. Physical Inspection: Yes (May 20, 2025). Outstanding Issues: Yes - Final asphalt layer pending due to weather conditions.",
                    "summary": "Project completion validation form for port access road upgrade - partial completion",
                    "uploaded_by": engineering_user,
                    "notes": "Partial completion form - Port Access Road",
                },
            )

            self.stdout.write(
                self.style.SUCCESS(f'Created project case: {case2.case_number} - {case2.title}')
            )

        # Case 3: Warehouse Renovation (Port Harcourt Port) - Completed
        case3, created3 = Case.objects.update_or_create(
            case_number="NPA/PROC/2024/0234",
            defaults={
                "title": "Warehouse Renovation (Port Harcourt Port)",
                "description": "Complete renovation of warehouse facilities at Port Harcourt Port",
                "case_type": Case.CaseType.PROJECT,
                "status": Case.Status.CLOSED,
                "priority": Correspondence.Priority.MEDIUM,
                "division": engineering_division,
                "department": procurement_department,
                "owning_office": engineering_office,
                "current_office": engineering_office,
                "created_by": engineering_user,
                "assigned_to": engineering_user,
                "tags": ["warehouse", "renovation", "port-harcourt"],
                "metadata": {
                    "award_date": "2024-08-10",
                    "contractor": "BuildTech Solutions Ltd",
                    "contract_value": 950000000,
                    "procurement_ref": "NPA/PROC/CON/089",
                },
                "closed_at": timezone.now() - timedelta(days=30),
            },
        )

        if created3:
            # All forms completed for this closed case
            completion_doc3, _ = Document.objects.update_or_create(
                reference_number="NPA/FORM/COMP/2024/001",
                defaults={
                    "title": "Project Completion Validation Form - Warehouse Renovation",
                    "description": "Completion validation form for warehouse renovation project",
                    "document_type": Document.DocumentType.FORM,
                    "status": Document.DocumentStatus.PUBLISHED,
                    "sensitivity": Document.Sensitivity.INTERNAL,
                    "author": engineering_user,
                    "division": engineering_division,
                    "tags": ["form", "completion"],
                },
            )
            completion_form_doc3, _ = FormDocument.objects.update_or_create(
                document=completion_doc3,
                defaults={
                    "template": completion_form,
                    "form_data": {
                        "to": "General Manager, Audit",
                        "from_field": "General Manager, Engineering",
                        "subject": "Project Monitoring Report - Warehouse Renovation",
                        "project": "Warehouse Renovation",
                        "date": "2024-11-15",
                        "our_ref": "NPA/ENG/PMR/2024/018",
                        "location": "Tin Can Island Port",
                        "contractor_name": "XYZ Construction Ltd",
                        "contract_sum": 950000000,
                        "award_ref": "NPA/PROC/CON/088",
                        "project_manager": engineering_user.get_full_name() or engineering_user.username,
                        "attach_boq": True,
                        "check_boq_extent": True,
                        "review_unit_price": True,
                        "attach_working_papers": True,
                        "comments": "Works completed to specification.",
                        "observation": "No outstanding defects noted.",
                        "recommendation": "Clear for final payment.",
                    },
                    "status": FormDocument.FormStatus.COMPLETED,
                },
            )
            CaseFormLink.objects.get_or_create(case=case3, form_document=completion_form_doc3)

            audit_doc3, _ = Document.objects.update_or_create(
                reference_number="NPA/FORM/AUDIT/2024/001",
                defaults={
                    "title": "Audit Monitoring & Clearance Form - Warehouse Renovation",
                    "description": "Audit monitoring and clearance form for warehouse renovation project",
                    "document_type": Document.DocumentType.FORM,
                    "status": Document.DocumentStatus.PUBLISHED,
                    "sensitivity": Document.Sensitivity.INTERNAL,
                    "author": audit_user,
                    "division": audit_division,
                    "tags": ["form", "audit"],
                },
            )
            audit_form_doc3, _ = FormDocument.objects.update_or_create(
                document=audit_doc3,
                defaults={
                    "template": audit_form,
                    "form_data": {
                        "date": "2024-10-05",
                        "location": "Tin Can Island Port",
                        "contractor_name": "XYZ Construction Ltd",
                        "contractor_address": "Lagos, Nigeria",
                        "award_ref": "NPA/PROC/CON/088",
                        "vehicle_reg": "ABC-901-XY",
                        "items": [
                            {
                                "sn": 1,
                                "qty": 12,
                                "description": "Roofing sheets",
                                "unit_price": 45000,
                                "amount": 540000,
                            }
                        ],
                        "sub_total": 540000,
                        "vat": 40500,
                        "grand_total": 580500,
                        "supplier_name": "XYZ Construction Ltd",
                        "supplier_date": "2024-10-05",
                    },
                    "status": FormDocument.FormStatus.COMPLETED,
                },
            )
            CaseFormLink.objects.get_or_create(case=case3, form_document=audit_form_doc3)
            
            # Add document version for case3 audit form
            audit_form_html3 = f"""
            <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto;">
                <h1 style="text-align: center; color: #1a1a1a; border-bottom: 3px solid #dc2626; padding-bottom: 20px;">
                    AUDIT MONITORING & CLEARANCE FORM
                </h1>
                <p style="text-align: center; color: #666; margin-top: 10px;">
                    Case: {case3.case_number} - {case3.title}
                </p>
                
                <div style="margin-top: 40px;">
                    <h3 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">1. Contract Award Compliance Verified?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Yes ✓
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">2. Procurement Process Reviewed?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Yes ✓
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">3. User Department Completion Acknowledgment Attached?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Yes ✓
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">4. Procurement Monitoring Officer Confirmation?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Yes ✓
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">5. Any Audit Observations?</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> None ✓
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">6. Risk Level</h3>
                    <p style="font-size: 16px; margin: 15px 0;">
                        <strong>Answer:</strong> Low
                    </p>
                </div>
                
                <div style="margin-top: 30px; padding: 20px; background: #dcfce7; border-left: 4px solid #22c55e;">
                    <h3 style="margin-top: 0; color: #1a1a1a;">AUDIT RECOMMENDATION</h3>
                    <p style="font-size: 18px; font-weight: bold; color: #16a34a;">
                        ✓ Clear for Payment
                    </p>
                </div>
                
                <div style="margin-top: 40px; padding: 25px; background: #f5f5f5; border: 1px solid #ddd;">
                    <h3 style="margin-top: 0;">APPROVALS</h3>
                    <p><strong>Audit Officer:</strong> {audit_user.get_full_name() or audit_user.username}</p>
                    <p><strong>GM Audit:</strong> {audit_user.get_full_name() or audit_user.username} ✓</p>
                </div>
            </div>
            """
            DocumentVersion.objects.update_or_create(
                document=audit_doc3,
                version_number=1,
                defaults={
                    "file_name": "Audit-Monitoring-Clearance-Form-Warehouse-Renovation.html",
                    "file_type": "text/html",
                    "file_size": len(audit_form_html3.encode('utf-8')),
                    "file_url": "",
                    "content_html": audit_form_html3,
                    "content_text": "AUDIT MONITORING & CLEARANCE FORM - Warehouse Renovation. All compliance checks verified. Risk Level: Low. Recommendation: Clear for Payment. Approved by GM Audit.",
                    "summary": "Audit monitoring and clearance form - approved",
                    "uploaded_by": audit_user,
                    "notes": "Audit clearance form - Warehouse Renovation",
                },
            )

            payment_doc3, _ = Document.objects.update_or_create(
                reference_number="NPA/FORM/PAY/2024/001",
                defaults={
                    "title": "Payment Certification Form - Warehouse Renovation",
                    "description": "Payment certification form for warehouse renovation project",
                    "document_type": Document.DocumentType.FORM,
                    "status": Document.DocumentStatus.PUBLISHED,
                    "sensitivity": Document.Sensitivity.INTERNAL,
                    "author": finance_user,
                    "division": finance_division,
                    "tags": ["form", "payment"],
                },
            )
            payment_form_doc3, _ = FormDocument.objects.update_or_create(
                document=payment_doc3,
                defaults={
                    "template": payment_form,
                    "form_data": {
                        "to": "General Manager, Finance",
                        "from": "GENERAL MANAGER AUDIT, HQ.",
                        "date": "2024-11-20",
                        "ref": "HQ/GMA/OP/A.13/001",
                        "subject": "AUDIT QUERY - BILLS FOR CERTIFICATION",
                        "payee": "XYZ Construction Ltd",
                        "pv_no": "PV/2024/118",
                        "pv_date": "2024-11-18",
                        "amount_naira": "950000000",
                        "amount_kobo": "00",
                        "reasons": "All documentation verified. Recommended for payment.",
                    },
                    "status": FormDocument.FormStatus.COMPLETED,
                },
            )
            CaseFormLink.objects.get_or_create(case=case3, form_document=payment_form_doc3)

            self.stdout.write(
                self.style.SUCCESS(f'Created project case: {case3.case_number} - {case3.title}')
            )

        total_cases = Case.objects.count()
        self.stdout.write(
            self.style.SUCCESS(f'Project cases ensured. Total cases: {total_cases}')
        )

    def _ensure_physical_tracking(
        self,
        users: dict[str, User],
        correspondence_items: dict,
        documents: dict,
    ):
        md_user = users.get("md") or users.get("user-md")
        gmict_user = users.get("gmict") or users.get("user-gm-ict")
        pamd_user = users.get("pamd") or users.get("user-pa-md")
        superadmin_user = users.get("superadmin")

        loc1, _ = Location.objects.update_or_create(
            building="NPA Headquarters",
            floor="Ground Floor",
            room="Registry",
            defaults={
                "description": "Main registry for active correspondence files",
                "is_active": True,
            },
        )
        loc2, _ = Location.objects.update_or_create(
            building="NPA Headquarters",
            floor="2nd Floor",
            room="Archive Room 201",
            defaults={
                "description": "Archived correspondence and completed case files",
                "is_active": True,
            },
        )
        loc3, _ = Location.objects.update_or_create(
            building="NPA Annex",
            floor="1st Floor",
            room="Executive Office 104",
            defaults={
                "description": "Active documents for executive review",
                "is_active": True,
            },
        )
        self.stdout.write(self.style.SUCCESS("3 Location records ensured."))

        phys1, _ = PhysicalDocument.objects.update_or_create(
            tracking_number="NPA/PHYS/2025/001",
            defaults={
                "barcode": "NPA-BAR-0001",
                "correspondence": correspondence_items.get("primary"),
                "location": loc1,
                "status": PhysicalDocument.Status.FILED,
                "description": "ECM Implementation Contract - Signed Original",
                "notes": "Original signed copy of ECM rollout contract",
            },
        )
        phys2, _ = PhysicalDocument.objects.update_or_create(
            tracking_number="NPA/PHYS/2025/002",
            defaults={
                "barcode": "NPA-BAR-0002",
                "correspondence": correspondence_items.get("primary"),
                "location": loc2,
                "status": PhysicalDocument.Status.FILED,
                "description": "Rollout Status Report - ECM Q1 2025",
                "notes": "Hard copy of quarterly progress report",
            },
        )
        phys3, _ = PhysicalDocument.objects.update_or_create(
            tracking_number="NPA/PHYS/2025/003",
            defaults={
                "barcode": "NPA-BAR-0003",
                "location": loc1,
                "status": PhysicalDocument.Status.CHECKED_OUT,
                "description": "ICT Infrastructure Audit Report 2024",
                "checked_out_to": md_user,
                "checked_out_at": timezone.now() - timezone.timedelta(days=2),
                "expected_return_at": timezone.now() + timezone.timedelta(days=5),
                "notes": "Checked out for MD review",
            },
        )
        phys4, _ = PhysicalDocument.objects.update_or_create(
            tracking_number="NPA/PHYS/2025/004",
            defaults={
                "barcode": "NPA-BAR-0004",
                "location": loc3,
                "status": PhysicalDocument.Status.FILED,
                "description": "Digital Transformation Taskforce Charter",
                "notes": "Original charter signed by MD",
            },
        )
        phys5, _ = PhysicalDocument.objects.update_or_create(
            tracking_number="NPA/PHYS/2025/005",
            defaults={
                "barcode": "NPA-BAR-0005",
                "location": loc3,
                "status": PhysicalDocument.Status.CHECKED_OUT,
                "description": "Procurement Approval - ICT Equipment",
                "checked_out_to": gmict_user,
                "checked_out_at": timezone.now() - timezone.timedelta(days=1),
                "notes": "Taken for procurement review meeting",
            },
        )
        self.stdout.write(self.style.SUCCESS("5 PhysicalDocument records ensured."))

        primary_corr = correspondence_items.get("primary")
        if primary_corr:
            dispatch, _ = DispatchRecord.objects.update_or_create(
                correspondence=primary_corr,
                tracking_number="TRACK-001",
                defaults={
                    "dispatch_mode": DispatchRecord.DispatchMode.EMAIL,
                    "dispatched_date": timezone.now().date(),
                    "dispatched_by": gmict_user,
                    "recipient_name": "Managing Director",
                    "notes": "Dispatched via email for ECM update request",
                },
            )
            self.stdout.write(self.style.SUCCESS(f"DispatchRecord ensured: {dispatch.tracking_number}"))

            dispatch.acknowledged_date = timezone.now().date()
            dispatch.acknowledged_by = md_user or superadmin_user
            dispatch.save(update_fields=["acknowledged_date", "acknowledged_by"])
            self.stdout.write(self.style.SUCCESS(f"DispatchRecord acknowledged: {dispatch.tracking_number}"))

        foia1, _ = FOIARequest.objects.update_or_create(
            request_number="FOIA/2025/001",
            defaults={
                "requester_name": "Chinedu Okeke",
                "requester_email": "chinedu.okeke@example.com",
                "requester_phone": "+234-802-555-0101",
                "organization": "Transparency International Nigeria",
                "description_of_documents": "Request for port concession agreements for Lagos Port Complex (2015-2025)",
                "request_details": "Seeking copies of all concession agreements, amendments, and related correspondence.",
                "format_preference": FOIARequest.FormatPreference.ELECTRONIC,
                "status": FOIARequest.Status.SUBMITTED,
                "received_date": timezone.now().date() - timezone.timedelta(days=5),
                "assigned_to": gmict_user,
            },
        )

        foia2, _ = FOIARequest.objects.update_or_create(
            request_number="FOIA/2025/002",
            defaults={
                "requester_name": "Fatima Usman",
                "requester_email": "fusman@legal-aid.ng",
                "organization": "Legal Aid Council of Nigeria",
                "description_of_documents": "Request for environmental impact assessments for port expansion projects (2020-2024)",
                "request_details": "Requesting EIA reports for Tin Can Island and Onne port expansion projects.",
                "format_preference": FOIARequest.FormatPreference.ELECTRONIC,
                "status": FOIARequest.Status.IN_PROCESSING,
                "received_date": timezone.now().date() - timezone.timedelta(days=3),
                "assigned_to": superadmin_user or gmict_user,
                "acknowledged_date": timezone.now().date() - timezone.timedelta(days=2),
            },
        )

        foia3, _ = FOIARequest.objects.update_or_create(
            request_number="FOIA/2025/003",
            defaults={
                "requester_name": "Daily Trust Newspaper",
                "requester_email": "editorial@dailytrust.ng",
                "requester_phone": "+234-803-200-3000",
                "organization": "Daily Trust Newspapers",
                "description_of_documents": "Request for NPA annual budget performance reports (2023 and 2024)",
                "request_details": "Requesting approved budget performance reports for FY2023 and FY2024.",
                "format_preference": FOIARequest.FormatPreference.ELECTRONIC,
                "status": FOIARequest.Status.RESPONDED,
                "received_date": timezone.now().date() - timezone.timedelta(days=14),
                "assigned_to": pamd_user,
                "acknowledged_date": timezone.now().date() - timezone.timedelta(days=12),
                "response_date": timezone.now().date() - timezone.timedelta(days=1),
            },
        )
        self.stdout.write(self.style.SUCCESS("3 FOIARequest records ensured."))

        FOIANote.objects.update_or_create(
            foia_request=foia1,
            user=gmict_user,
            defaults={
                "note": "This request appears to cover a wide scope. Recommend seeking legal guidance on potential exemptions before releasing documents.",
                "is_internal": True,
            },
        )
        FOIANote.objects.update_or_create(
            foia_request=foia2,
            user=pamd_user,
            defaults={
                "note": "Acknowledged and assigned to environmental compliance unit. Gather EIA reports from Engineering Division.",
                "is_internal": True,
            },
        )
        self.stdout.write(self.style.SUCCESS("2 FOIANote records ensured."))

        dms_doc = documents.get("primary")
        if dms_doc:
            FOIARequestDocument.objects.update_or_create(
                foia_request=foia3,
                document=dms_doc,
                defaults={
                    "is_response": True,
                    "added_by": pamd_user,
                },
            )
            self.stdout.write(self.style.SUCCESS("1 FOIARequestDocument record ensured."))

    def _ensure_drm_policies(self):
        self.stdout.write(self.style.MIGRATE_HEADING("Ensuring DRM policies"))

        policies_data = [
            {
                "name": "Confidential — View Only",
                "description": "Document is view-only; download and print are disabled. A watermark is applied.",
                "allow_download": False,
                "allow_print": False,
                "allow_external_share": False,
                "view_only": True,
                "watermark_text": "CONFIDENTIAL",
                "expires_after_days": None,
            },
            {
                "name": "Internal — Download Allowed",
                "description": "Standard internal document. Download and print allowed; PDF downloads are watermarked.",
                "allow_download": True,
                "allow_print": True,
                "allow_external_share": False,
                "view_only": False,
                "watermark_text": "INTERNAL USE ONLY",
                "expires_after_days": None,
            },
            {
                "name": "External Sharing — Controlled",
                "description": "Download and print allowed, but external sharing is restricted. Expires after 180 days.",
                "allow_download": True,
                "allow_print": True,
                "allow_external_share": False,
                "view_only": False,
                "watermark_text": "",
                "expires_after_days": 180,
            },
            {
                "name": "Strictly Confidential — Time-Limited",
                "description": "Highest restriction. View-only, watermarked, expires after 30 days. After expiry, only the author and superadmin can view.",
                "allow_download": False,
                "allow_print": False,
                "allow_external_share": False,
                "view_only": True,
                "watermark_text": "STRICTLY CONFIDENTIAL",
                "expires_after_days": 30,
            },
            {
                "name": "Public Record",
                "description": "No restrictions. Full download, print, and external sharing permitted.",
                "allow_download": True,
                "allow_print": True,
                "allow_external_share": True,
                "view_only": False,
                "watermark_text": "",
                "expires_after_days": None,
            },
        ]

        for data in policies_data:
            DocumentRightsPolicy.objects.update_or_create(
                name=data["name"],
                defaults=data,
            )

        self.stdout.write(self.style.SUCCESS(f"{len(policies_data)} DRM policies ensured."))

    def _ensure_case_templates(self, users):
        """Seed default case templates."""
        self.stdout.write(self.style.MIGRATE_HEADING("Ensuring case templates"))
        templates = [
            {
                "name": "General Complaint",
                "slug": "general-complaint",
                "description": "Template for handling general complaints from the public or stakeholders.",
                "case_type": "complaint",
                "default_priority": "high",
                "structure": {
                    "default_fields": {
                        "title": "Complaint: ",
                        "description": "",
                        "tags": ["complaint"],
                        "metadata": {"source": "public"},
                    }
                },
            },
            {
                "name": "FOIA Request",
                "slug": "foia-request",
                "description": "Template for processing Freedom of Information Act requests.",
                "case_type": "request",
                "default_priority": "high",
                "structure": {
                    "default_fields": {
                        "title": "FOIA Request: ",
                        "description": "",
                        "tags": ["foia", "public-records"],
                        "metadata": {"category": "public-records"},
                    }
                },
            },
            {
                "name": "Audit Investigation",
                "slug": "audit-investigation",
                "description": "Template for internal audit investigations.",
                "case_type": "audit",
                "default_priority": "medium",
                "structure": {
                    "default_fields": {
                        "title": "Audit: ",
                        "description": "",
                        "tags": ["audit", "compliance"],
                        "metadata": {"audit_type": "internal"},
                    }
                },
            },
            {
                "name": "Procurement Review",
                "slug": "procurement-review",
                "description": "Template for procurement and contract review cases.",
                "case_type": "project",
                "default_priority": "medium",
                "structure": {
                    "default_fields": {
                        "title": "Procurement: ",
                        "description": "",
                        "tags": ["procurement", "contract"],
                        "metadata": {"category": "procurement"},
                    }
                },
            },
            {
                "name": "Legal Inquiry",
                "slug": "legal-inquiry",
                "description": "Template for handling legal inquiries and requests for legal opinion.",
                "case_type": "legal",
                "default_priority": "high",
                "structure": {
                    "default_fields": {
                        "title": "Legal Inquiry: ",
                        "description": "",
                        "tags": ["legal"],
                        "metadata": {"category": "legal-opinion"},
                    }
                },
            },
            {
                "name": "HR Grievance",
                "slug": "hr-grievance",
                "description": "Template for handling employee grievances and workplace complaints. Captures complainant details, nature of grievance, evidence, and resolution steps.",
                "case_type": "complaint",
                "default_priority": "high",
                "structure": {
                    "default_fields": {
                        "title": "HR Grievance: ",
                        "description": "",
                        "tags": ["hr", "grievance", "employee"],
                        "metadata": {"category": "hr"},
                    }
                },
            },
            {
                "name": "Public Enquiry",
                "slug": "public-enquiry",
                "description": "Template for general public enquiries and information requests not covered by FOIA. Captures enquirer contact details, questions, and response tracking.",
                "case_type": "request",
                "default_priority": "medium",
                "structure": {
                    "default_fields": {
                        "title": "Enquiry: ",
                        "description": "",
                        "tags": ["public", "enquiry"],
                        "metadata": {"source": "public"},
                    }
                },
            },
            {
                "name": "Safety Incident Report",
                "slug": "safety-incident-report",
                "description": "Template for reporting workplace safety incidents and near-misses. Tracks incident type, location, injuries, root cause, and corrective actions.",
                "case_type": "audit",
                "default_priority": "urgent",
                "structure": {
                    "default_fields": {
                        "title": "Safety Incident: ",
                        "description": "",
                        "tags": ["safety", "incident", "hse"],
                        "metadata": {"incident_type": "safety"},
                    }
                },
            },
            {
                "name": "Contract Renewal",
                "slug": "contract-renewal",
                "description": "Template for managing contract renewal processes. Tracks current contract details, vendor performance, renewal terms, and approval workflow.",
                "case_type": "project",
                "default_priority": "medium",
                "structure": {
                    "default_fields": {
                        "title": "Contract Renewal: ",
                        "description": "",
                        "tags": ["contract", "renewal", "procurement"],
                        "metadata": {"category": "procurement"},
                    }
                },
            },
            {
                "name": "Policy Amendment Request",
                "slug": "policy-amendment-request",
                "description": "Template for proposing amendments to NPA policies and procedures. Captures policy reference, proposed change, rationale, and stakeholder review.",
                "case_type": "request",
                "default_priority": "medium",
                "structure": {
                    "default_fields": {
                        "title": "Policy Amendment: ",
                        "description": "",
                        "tags": ["policy", "amendment", "governance"],
                        "metadata": {"category": "governance"},
                    }
                },
            },
            {
                "name": "IT Service Request",
                "slug": "it-service-request",
                "description": "Template for IT support requests including hardware provisioning, software access, system access, and infrastructure changes.",
                "case_type": "general",
                "default_priority": "medium",
                "structure": {
                    "default_fields": {
                        "title": "IT Request: ",
                        "description": "",
                        "tags": ["it", "service-request", "support"],
                        "metadata": {"category": "it"},
                    }
                },
            },
            {
                "name": "Stakeholder Engagement",
                "slug": "stakeholder-engagement",
                "description": "Template for planning and tracking stakeholder engagement activities including meetings, consultations, and feedback collection.",
                "case_type": "project",
                "default_priority": "low",
                "structure": {
                    "default_fields": {
                        "title": "Engagement: ",
                        "description": "",
                        "tags": ["stakeholder", "engagement", "communications"],
                        "metadata": {"category": "communications"},
                    }
                },
            },
            {
                "name": "Disciplinary Matter",
                "slug": "disciplinary-matter",
                "description": "Template for handling employee disciplinary proceedings. Tracks allegations, evidence, hearing details, and outcomes with confidentiality controls.",
                "case_type": "legal",
                "default_priority": "urgent",
                "structure": {
                    "default_fields": {
                        "title": "Disciplinary: ",
                        "description": "",
                        "tags": ["disciplinary", "hr", "legal", "confidential"],
                        "metadata": {"sensitivity": "confidential"},
                    }
                },
            },
            {
                "name": "Project Initiation",
                "slug": "project-initiation",
                "description": "Template for initiating new projects. Captures project charter, objectives, scope, stakeholders, budget, timeline, and risk assessment.",
                "case_type": "project",
                "default_priority": "medium",
                "structure": {
                    "default_fields": {
                        "title": "Project: ",
                        "description": "",
                        "tags": ["project", "initiation", "charter"],
                        "metadata": {"category": "project-management"},
                    }
                },
            },
            {
                "name": "Travel Authorization",
                "slug": "travel-authorization",
                "description": "Template for staff travel authorization requests. Captures destination, dates, purpose, estimated costs, and supervisor approval.",
                "case_type": "general",
                "default_priority": "low",
                "structure": {
                    "default_fields": {
                        "title": "Travel Authorization: ",
                        "description": "",
                        "tags": ["travel", "authorization", "staff"],
                        "metadata": {"category": "travel"},
                    }
                },
            },
            {
                "name": "Contract Agreement",
                "slug": "contract-agreement",
                "description": "Template for drafting and reviewing contract agreements with vendors, partners, and service providers. Tracks terms, review cycle, and legal approval.",
                "case_type": "legal",
                "default_priority": "medium",
                "structure": {
                    "default_fields": {
                        "title": "Contract Agreement: ",
                        "description": "",
                        "tags": ["contract", "legal", "agreement"],
                        "metadata": {"category": "legal"},
                    }
                },
            },
            {
                "name": "Budget Request",
                "slug": "budget-request",
                "description": "Template for departmental budget requests and reallocations. Captures fiscal year, cost centre, line items, justification, and approval chain.",
                "case_type": "general",
                "default_priority": "medium",
                "structure": {
                    "default_fields": {
                        "title": "Budget Request: ",
                        "description": "",
                        "tags": ["budget", "finance", "request"],
                        "metadata": {"category": "finance"},
                    }
                },
            },
            {
                "name": "Board Resolution",
                "slug": "board-resolution",
                "description": "Template for drafting board resolutions. Captures resolution number, subject, preamble, operative clauses, and voting record.",
                "case_type": "legal",
                "default_priority": "high",
                "structure": {
                    "default_fields": {
                        "title": "Board Resolution: ",
                        "description": "",
                        "tags": ["board", "resolution", "governance"],
                        "metadata": {"category": "governance"},
                    }
                },
            },
            {
                "name": "Incident Response",
                "slug": "incident-response",
                "description": "Template for responding to security breaches, system outages, and operational incidents. Tracks detection, containment, eradication, recovery, and lessons learned.",
                "case_type": "general",
                "default_priority": "urgent",
                "structure": {
                    "default_fields": {
                        "title": "Incident: ",
                        "description": "",
                        "tags": ["incident", "security", "response"],
                        "metadata": {"category": "security"},
                    }
                },
            },
            {
                "name": "Training Needs Assessment",
                "slug": "training-needs-assessment",
                "description": "Template for identifying and planning staff training and development needs. Captures skill gaps, proposed training, budget, and priority level.",
                "case_type": "general",
                "default_priority": "low",
                "structure": {
                    "default_fields": {
                        "title": "Training Needs: ",
                        "description": "",
                        "tags": ["training", "hr", "development"],
                        "metadata": {"category": "hr"},
                    }
                },
            },
        ]
        try:
            user = User.objects.filter(is_superuser=True).first()
        except Exception:
            user = None
        for data in templates:
            obj, created = CaseTemplate.objects.get_or_create(
                slug=data["slug"],
                defaults={
                    "name": data["name"],
                    "description": data["description"],
                    "case_type": data["case_type"],
                    "default_priority": data["default_priority"],
                    "structure": data["structure"],
                    "is_active": True,
                    "created_by": user,
                },
            )
            self.stdout.write(f"  {'Created' if created else 'Already exists'}: {obj.name}")

    def _ensure_correspondence_templates(self):
        """Ensure NPA memo templates are Verdana 22/18/16, table, no box, spread."""
        self.stdout.write(self.style.MIGRATE_HEADING("Ensuring correspondence templates"))
        from correspondence.models import CorrespondenceTemplate

        dept_html = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 24px 16px;">
  <header style="text-align: center; margin-bottom: 32px;">
    <h1 style="margin: 0; font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-family: Verdana, Geneva, sans-serif;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 18px; font-weight: bold; text-transform: uppercase; font-family: Verdana, Geneva, sans-serif;">{{division.name}}</h2>
    <h3 style="margin: 4px 0 0; font-size: 16px; font-weight: bold; font-family: Verdana, Geneva, sans-serif;">{{department.name}}</h3>
    <h4 style="margin: 4px 0 0; font-size: 18px; font-weight: bold; font-family: Verdana, Geneva, sans-serif;">Departmental Memorandum</h4>
  </header>
  <section style="margin-bottom: 24px;">
    <table style="width: 100%; border: none; border-collapse: collapse; font-size: 14px; font-family: Verdana, Geneva, sans-serif;">
      <tr>
        <td style="padding: 4px 0; width: 50%; border: none;"><strong>To:</strong> {{recipient.name}}</td>
        <td style="padding: 4px 0; width: 50%; text-align: right; border: none;"><strong>Date:</strong> {{date.today}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; border: none;"><strong>From:</strong> {{sender.name}}</td>
        <td style="padding: 4px 0; text-align: right; word-break: break-word; border: none;"><strong>Ref.:</strong> {{document.reference}}</td>
      </tr>
    </table>
  </section>
  <section style="margin-bottom: 24px;">
    <p style="font-size: 14px; font-family: Verdana, Geneva, sans-serif;"><strong>RE: {{document.title}}</strong></p>
  </section>
  <section style="margin-bottom: 32px; font-size: 14px; font-family: Verdana, Geneva, sans-serif;">
    <p><strong>- [SUBTITLE]</strong></p>
    <p>[Insert body content here]</p>
  </section>
</section>"""
        dept_text = """NIGERIAN PORTS AUTHORITY
{{division.name}}
{{department.name}}
Departmental Memorandum

To: {{recipient.name}}\t\tDate: {{date.today}}
From: {{sender.name}}\t\tRef.: {{document.reference}}

RE: {{document.title}}

- [SUBTITLE]
[Insert body content here]"""

        internal_html = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 24px 16px;">
  <header style="text-align: center; margin-bottom: 32px;">
    <h1 style="margin: 0; font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-family: Verdana, Geneva, sans-serif;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 18px; font-weight: bold; text-transform: uppercase; font-family: Verdana, Geneva, sans-serif;">{{division.name}}</h2>
    <h3 style="margin: 4px 0 0; font-size: 18px; font-weight: bold; font-family: Verdana, Geneva, sans-serif;">Internal Memorandum</h3>
  </header>
  <section style="margin-bottom: 24px;">
    <table style="width: 100%; border: none; border-collapse: collapse; font-size: 14px; font-family: Verdana, Geneva, sans-serif;">
      <tr>
        <td style="padding: 4px 0; width: 50%; border: none;"><strong>To:</strong> {{recipient.name}}</td>
        <td style="padding: 4px 0; width: 50%; text-align: right; border: none;"><strong>Date:</strong> {{date.today}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; border: none;"><strong>From:</strong> {{sender.name}}</td>
        <td style="padding: 4px 0; text-align: right; word-break: break-word; border: none;"><strong>Ref.:</strong> {{document.reference}}</td>
      </tr>
    </table>
  </section>
  <section style="margin-bottom: 24px;">
    <p style="font-size: 14px; font-family: Verdana, Geneva, sans-serif;"><strong>RE: {{document.title}}</strong></p>
  </section>
  <section style="margin-bottom: 32px; font-size: 14px; font-family: Verdana, Geneva, sans-serif;">
    <p><strong>- [SUBTITLE]</strong></p>
    <p>[Insert body content here]</p>
  </section>
</section>"""
        internal_text = """NIGERIAN PORTS AUTHORITY
{{division.name}}
Internal Memorandum

To: {{recipient.name}}\t\tDate: {{date.today}}
From: {{sender.name}}\t\tRef.: {{document.reference}}

RE: {{document.title}}

- [SUBTITLE]
[Insert body content here]"""

        for title, html, text in [
            ("NPA Departmental Memorandum", dept_html, dept_text),
            ("NPA Internal Memorandum", internal_html, internal_text),
        ]:
            obj, created = CorrespondenceTemplate.objects.update_or_create(
                title=title,
                scope="organization",
                scope_id=None,
                template_type="document",
                defaults={
                    "description": "Standard template for inter-departmental correspondence within NPA divisions." if "Departmental" in title else "Standard template for internal correspondence within NPA divisions.",
                    "content_html": html,
                    "content_text": text,
                    "is_active": True,
                    "is_default": title == "NPA Departmental Memorandum",
                },
            )
            self.stdout.write(f"  {'Created' if created else 'Updated'}: {title}")

    def _ensure_audit_form_templates(self):
        """Ensure the three NPA Internal Audit Division form templates."""
        self.stdout.write(self.style.MIGRATE_HEADING("Ensuring audit form templates"))
        from django.core.management import call_command
        call_command("seed_audit_forms")

    def _setup_role_permissions(self):
        """Set up default permissions for all system roles."""
        self.stdout.write(self.style.MIGRATE_HEADING("Setting up role permissions"))

        try:
            from organization.management.commands.setup_role_permissions import Command as SetupCommand
            setup_cmd = SetupCommand()
            setup_cmd.stdout = self.stdout
            setup_cmd.handle(force=True)
        except ImportError:
            self.stdout.write(self.style.WARNING("setup_role_permissions command not available; skipping."))

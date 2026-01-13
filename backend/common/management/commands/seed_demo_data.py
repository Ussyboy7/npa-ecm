"""Seed the database with demo data matching the frontend mocks."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from analytics.models import ReportSnapshot, UsageMetric
from correspondence.models import (
    Case,
    CaseCorrespondenceLink,
    CaseDocumentLink,
    CaseFormLink,
    Correspondence,
    CorrespondenceAttachment,
    CorrespondenceDistribution,
    CorrespondenceDocumentLink,
    Delegation,
    Minute,
)
from dms.models import (
    Document,
    DocumentAccessLog,
    DocumentPermission,
    DocumentVersion,
    DocumentWorkspace,
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
                users = {}
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
                self._ensure_project_cases(users, divisions, departments, offices)
            else:
                self.stdout.write(self.style.WARNING("Skipping demo data creation (no users available)"))
                
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
        pending_assignments: list[tuple[str, str | None, str | None]] = []

        management_grades = {"MSS1", "MSS2", "MSS3", "MSS4", "MSS5", "EDCS", "MDCS"}

        for entry in users_data:
            username = entry.get("id") or entry.get("username")
            if not username:
                continue

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
                "email": entry.get("email") or f"{username}@npa.gov.ng",
                "first_name": first_name,
                "last_name": last_name,
                "system_role": system_role,
                "grade_level": entry.get("gradeLevel", ""),
                "employee_id": entry.get("employeeId", ""),
                "is_management": entry.get("gradeLevel", "") in management_grades,
            }

            user, created = User.objects.update_or_create(
                username=username,
                defaults=defaults,
            )
            if created or not user.has_usable_password():
                user.set_password("ChangeMe123!")
                user.save(update_fields=["password"])

            created_users[username] = user
            pending_assignments.append(
                (username, entry.get("division"), entry.get("department"))
            )

        # Ensure super admin account
        superadmin_role, _ = Role.objects.get_or_create(
            name="Super Admin",
            defaults={"description": "Super Administrator with full system access"}
        )
        superadmin_defaults = {
            "email": "superadmin@npa.gov.ng",
            "first_name": "Super",
            "last_name": "Admin",
            "is_staff": True,
            "is_superuser": True,
            "system_role": superadmin_role,
            "grade_level": "MDCS",
            "is_management": True,
        }
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
        for username, division_id, department_id in pending_assignments:
            user = created_users.get(username)
            if not user:
                continue
            division = divisions.get(division_id)
            department = departments.get(department_id)
            directorate = None
            if department and department.division:
                directorate = department.division.directorate
            elif division:
                directorate = division.directorate
            user.division = division
            user.department = department
            user.directorate = directorate
            user.save(update_fields=["division", "department", "directorate"])

        # Ensure personal assistant demo account exists even if missing from source data
        if "user-pa-md" not in created_users:
            pa_role, _ = Role.objects.get_or_create(
                name="Personal Assistant",
                defaults={"description": "Personal Assistant role"}
            )
            pamd_defaults = {
                "email": "pa.md@npa.gov.ng",
                "first_name": "Grace",
                "last_name": "Nnaji",
                "system_role": pa_role,
                "grade_level": "SSS2",
                "employee_id": "NPA-PA-001",
                "is_management": False,
            }
            pamd_user, created = User.objects.update_or_create(
                username="user-pa-md",
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
            created_users["user-pa-md"] = pamd_user

        # Ensure key login accounts exist with friendly usernames
        alias_map = {
            "user-md": "md",
            "user-ed-fa": "edfa",
            "user-ed-mo": "edmo",
            "user-ed-ets": "edets",
            "user-gm-ict": "gmict",
            "user-pa-md": "pamd",
        }

        for source_id, alias_username in alias_map.items():
            source_user = created_users.get(source_id)
            if not source_user:
                continue
            alias_defaults = {
                "email": source_user.email,
                "first_name": source_user.first_name,
                "last_name": source_user.last_name,
                "system_role": source_user.system_role,
                "grade_level": source_user.grade_level,
                "employee_id": source_user.employee_id,
                "is_management": source_user.is_management,
            }
            alias_user, created = User.objects.update_or_create(
                username=alias_username,
                defaults=alias_defaults,
            )
            if created or not alias_user.has_usable_password():
                alias_user.set_password("ChangeMe123!")
                alias_user.save(update_fields=["password"])
            alias_user.directorate = source_user.directorate
            alias_user.division = source_user.division
            alias_user.department = source_user.department
            alias_user.save(update_fields=["directorate", "division", "department"])
            created_users[alias_username] = alias_user

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
        workspace, _ = DocumentWorkspace.objects.update_or_create(
            slug="digital-transformation",
            defaults={
                "name": "Digital Transformation Taskforce",
                "description": "ICT and Procurement initiatives",
                "color": "#2563eb",
            },
        )
        workspace.members.set(
            [
                users.get("gmict") or users.get("user-gm-ict"),
                users.get("md") or users.get("user-md"),
            ]
        )

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
        document.workspaces.set([workspace])

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

        DocumentAccessLog.objects.update_or_create(
            document=document,
            user=users.get("md") or users.get("user-md"),
            action=DocumentAccessLog.AccessAction.VIEW,
            sensitivity=document.sensitivity,
        )

        self.stdout.write(self.style.SUCCESS("Documents and related records ensured."))
        return {"primary": document, "workspace": workspace}

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
                "summary": "Update requested by Managing Director",
                "body_html": "<p>Please provide an update on the ECM rollout milestones.</p>",
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
        from organization.models import Directorate
        
        md_user = users.get("md") or users.get("user-md")
        
        # Define workflow templates following NPA hierarchy
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
                "slug": "directorate-approval",
                "name": "Directorate Approval",
                "description": "Approval within a directorate. From GM to ED level.",
                "steps": [
                    {"order": 1, "title": "GM Review", "required_role": "General Manager", "required_grade_level": "MSS1"},
                    {"order": 2, "title": "ED Approval", "required_role": "Executive Director", "required_grade_level": "EDCS"},
                ],
            },
            {
                "slug": "executive-approval",
                "name": "Executive Approval",
                "description": "High-level approval from ED to MD.",
                "steps": [
                    {"order": 1, "title": "ED Review", "required_role": "Executive Director", "required_grade_level": "EDCS"},
                    {"order": 2, "title": "MD Approval", "required_role": "Managing Director", "required_grade_level": "MDCS"},
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
                "slug": "parallel-review",
                "name": "Parallel Review (Multi-Division)",
                "description": "Send to multiple GMs simultaneously for input before consolidation.",
                "steps": [
                    {"order": 1, "title": "Parallel GM Review", "required_role": "General Manager", "required_grade_level": "MSS1", "requires_all_assistants": True},
                    {"order": 2, "title": "ED Consolidation", "required_role": "Executive Director", "required_grade_level": "EDCS"},
                ],
            },
            {
                "slug": "for-information-only",
                "name": "For Information Only (FYI)",
                "description": "Distribute information without requiring action. Recipients acknowledge receipt.",
                "steps": [
                    {"order": 1, "title": "Acknowledge Receipt", "required_role": "", "required_grade_level": ""},
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

        # Get form templates
        completion_form = FormTemplate.objects.filter(slug="project-completion-validation").first()
        audit_form = FormTemplate.objects.filter(slug="audit-monitoring-clearance").first()
        payment_form = FormTemplate.objects.filter(slug="payment-certification").first()

        if not all([completion_form, audit_form, payment_form]):
            self.stdout.write(self.style.WARNING("Form templates not found. Run seed_form_templates first."))
            return

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
                        "scope_completed": "fully",
                        "physical_inspection": "yes",
                        "inspection_date": "2025-05-15",
                        "outstanding_issues": "no",
                        "outstanding_issues_description": "",  # Empty since no outstanding issues
                        "completion_report_attached": True,
                        "site_photos_attached": True,
                        "engineers_confirmation_attached": True,
                        "declarant_name": engineering_user.get_full_name() or engineering_user.username,
                        "declarant_designation": "General Manager, Engineering",
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
                        "contract_award_compliance": "yes",
                        "procurement_process_reviewed": "yes",
                        "user_dept_completion_attached": "yes",
                        "procurement_monitoring_confirmation": "yes",
                        "audit_observations": "none",
                        "risk_level": "low",
                        "audit_recommendation": "clear",
                        "audit_officer_name": audit_user.get_full_name() or audit_user.username,
                        "gm_audit_name": audit_user.get_full_name() or audit_user.username,
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
                    "summary": "User department confirms project completion",
                    "body_html": "<p>This is to confirm that the Wharf Rehabilitation project has been fully completed as per contract specifications.</p>",
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
                    "summary": "Contractor submits final invoice for payment",
                    "body_html": "<p>Please find attached the final invoice for the completed wharf rehabilitation project.</p>",
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
                        "scope_completed": "partial",
                        "physical_inspection": "yes",
                        "inspection_date": "2025-05-20",
                        "outstanding_issues": "yes",
                        "outstanding_issues_description": "Final asphalt layer pending due to weather conditions",
                        "completion_report_attached": True,
                        "site_photos_attached": False,
                        "engineers_confirmation_attached": False,
                        "declarant_name": engineering_user.get_full_name() or engineering_user.username,
                        "declarant_designation": "General Manager, Engineering",
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
            from dms.models import DocumentVersion
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
                        "scope_completed": "fully",
                        "physical_inspection": "yes",
                        "inspection_date": "2024-11-15",
                        "outstanding_issues": "no",
                        "outstanding_issues_description": "",
                        "completion_report_attached": True,
                        "site_photos_attached": True,
                        "engineers_confirmation_attached": True,
                        "declarant_name": engineering_user.get_full_name() or engineering_user.username,
                        "declarant_designation": "General Manager, Engineering",
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
                        "contract_award_compliance": "yes",
                        "procurement_process_reviewed": "yes",
                        "user_dept_completion_attached": "yes",
                        "procurement_monitoring_confirmation": "yes",
                        "audit_observations": "none",
                        "risk_level": "low",
                        "audit_recommendation": "clear",
                        "audit_officer_name": audit_user.get_full_name() or audit_user.username,
                        "gm_audit_name": audit_user.get_full_name() or audit_user.username,
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
                        "invoice_amount": 950000000,
                        "certified_amount": 950000000,
                        "payment_recommendation": "pay_full",
                        "remarks": "All documentation verified. Payment approved.",
                        "finance_officer_name": finance_user.get_full_name() or finance_user.username,
                        "approver_level": "gm_finance",
                        "final_authorization": False,
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

    def _setup_role_permissions(self):
        """Set up default permissions for all system roles."""
        self.stdout.write(self.style.MIGRATE_HEADING("Setting up role permissions"))

        # Import the setup_role_permissions command and call it
        from organization.management.commands.setup_role_permissions import Command as SetupCommand
        setup_cmd = SetupCommand()
        # Run it with the same stdout
        setup_cmd.stdout = self.stdout
        setup_cmd.handle()

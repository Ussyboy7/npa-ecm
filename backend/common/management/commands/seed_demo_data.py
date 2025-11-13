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
)
from organization.models import Department, Directorate, Division, Role
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
            
            # Only create users if not skipped
            if options.get("skip_users"):
                self.stdout.write(self.style.WARNING("Skipping mock user creation (--skip-users flag set)"))
                users = {}
            else:
                users = self._ensure_users(data.get("MOCK_USERS", []), directorates, divisions, departments)
            
            # Only assign leadership and create demo data if users were created
            if users:
                self._assign_org_leadership(data, directorates, divisions, departments, users)
                documents = self._ensure_documents(users, divisions, departments)
                correspondence_items = self._ensure_correspondence(users, divisions, departments, documents)
                self._ensure_workflows(users, correspondence_items)
                self._ensure_support_content(users)
                self._ensure_analytics(users)
            else:
                self.stdout.write(self.style.WARNING("Skipping demo data creation (no users available)"))
                
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
    ):
        division = divisions.get("div-ict")
        department = departments.get("dept-ict-software")

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
        template, _ = WorkflowTemplate.objects.update_or_create(
            slug="ecm-rollout-approval",
            defaults={
                "name": "ECM Rollout Approval",
                "description": "Approval flow for ECM rollout updates",
                "applies_to": WorkflowTemplate.AppliesTo.CORRESPONDENCE,
                "created_by": users.get("md") or users.get("user-md"),
            },
        )

        step1, _ = WorkflowStep.objects.update_or_create(
            template=template,
            order=1,
            defaults={
                "title": "Review by Managing Director",
                "required_role": "Managing Director",
            },
        )

        task, _ = ApprovalTask.objects.update_or_create(
            template=template,
            step=step1,
            correspondence=correspondence_items["primary"],
            assignee=users.get("md") or users.get("user-md"),
            defaults={
                "status": ApprovalTask.Status.IN_PROGRESS,
                "remarks": "Awaiting update from ICT division",
            },
        )

        TaskAction.objects.update_or_create(
            task=task,
            action=TaskAction.Action.ASSIGNED,
            defaults={
                "actor": users.get("gmict") or users.get("user-gm-ict"),
                "notes": "Task created and assigned to MD",
            },
        )

        self.stdout.write(self.style.SUCCESS("Workflow template and tasks ensured."))

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

"""Management command to set up default permissions for system roles."""

from django.core.management.base import BaseCommand
from django.db import transaction

from ...models import Role


class Command(BaseCommand):
    help = "Set up default permissions for system roles"

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Setting up default role permissions"))

        # Define default permissions for each role
        role_permissions = {
            "Super Admin": {
                "can_register_correspondence": True,
                "can_approve_correspondence": True,
                "can_view_all_correspondence": True,
                "can_manage_users": True,
                "can_manage_roles": True,
                "can_manage_organization": True,
                "can_access_admin": True,
                "can_access_reports": True,
                "can_access_analytics": True,
                "can_manage_documents": True,
            },
            "Managing Director": {
                "can_register_correspondence": True,
                "can_approve_correspondence": True,
                "can_view_all_correspondence": True,
                "can_manage_users": True,
                "can_access_admin": True,
                "can_access_reports": True,
                "can_access_analytics": True,
                "can_manage_documents": True,
            },
            "Executive Director": {
                "can_register_correspondence": True,
                "can_approve_correspondence": True,
                "can_view_all_correspondence": True,
                "can_manage_users": True,
                "can_access_admin": True,
                "can_access_reports": True,
                "can_access_analytics": True,
                "can_manage_documents": True,
            },
            "Secretary": {
                "can_register_correspondence": True,
                "can_approve_correspondence": True,
                "can_view_all_correspondence": True,
                "can_access_reports": True,
                "can_access_analytics": True,
                "can_manage_documents": True,
            },
            "General Manager": {
                "can_register_correspondence": True,
                "can_approve_correspondence": True,
                "can_view_department_correspondence": True,
                "can_manage_users": True,
                "can_access_reports": True,
                "can_manage_documents": True,
            },
            "Assistant General Manager": {
                "can_register_correspondence": True,
                "can_approve_correspondence": True,
                "can_view_department_correspondence": True,
                "can_manage_users": True,
                "can_manage_documents": True,
            },
            "Principal Manager": {
                "can_register_correspondence": True,
                "can_approve_correspondence": True,
                "can_view_department_correspondence": True,
                "can_manage_documents": True,
            },
            "Senior Manager": {
                "can_register_correspondence": True,
                "can_approve_correspondence": True,
                "can_view_department_correspondence": True,
                "can_manage_documents": True,
            },
            "Assistant Manager": {
                "can_register_correspondence": False,
                "can_approve_correspondence": True,
                "can_view_department_correspondence": True,
                "can_manage_documents": True,
            },
            "Manager": {
                "can_register_correspondence": True,
                "can_approve_correspondence": True,
                "can_view_department_correspondence": True,
                "can_manage_documents": True,
            },
            "Senior Officer": {
                "can_register_correspondence": True,
                "can_approve_correspondence": True,
                "can_view_department_correspondence": True,
                "can_manage_documents": True,
            },
            "Officer I": {
                "can_register_correspondence": True,
                "can_approve_correspondence": False,
                "can_view_department_correspondence": True,
                "can_manage_documents": True,
            },
            "Officer II": {
                "can_register_correspondence": True,
                "can_approve_correspondence": False,
                "can_view_department_correspondence": True,
                "can_manage_documents": True,
            },
            "Staff I": {
                "can_register_correspondence": True,
                "can_approve_correspondence": False,
                "can_view_department_correspondence": True,
                "can_manage_documents": True,
            },
            "Staff II": {
                "can_register_correspondence": True,
                "can_approve_correspondence": False,
                "can_view_department_correspondence": True,
                "can_manage_documents": True,
            },
            "Staff III": {
                "can_register_correspondence": True,
                "can_approve_correspondence": False,
                "can_view_department_correspondence": True,
                "can_manage_documents": True,
            },
        }

        with transaction.atomic():
            updated_count = 0
            for role_name, permissions in role_permissions.items():
                try:
                    role = Role.objects.get(name=role_name)
                    if role.permissions != permissions:
                        role.permissions = permissions
                        role.save(update_fields=['permissions'])
                        updated_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f"Updated permissions for role: {role_name}")
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f"Role {role_name} already has correct permissions")
                        )
                except Role.DoesNotExist:
                    # Create the role if it doesn't exist
                    role = Role.objects.create(
                        name=role_name,
                        description=f"System role: {role_name}",
                        permissions=permissions
                    )
                    updated_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"Created role: {role_name}")
                    )

        self.stdout.write(
            self.style.SUCCESS(f"Role permissions setup complete. Updated {updated_count} roles.")
        )

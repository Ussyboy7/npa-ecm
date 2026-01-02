"""Fix duplicate 'Office' suffixes in existing office names."""

from django.core.management.base import BaseCommand
from django.db import transaction

from organization.models import Office


class Command(BaseCommand):
    help = "Remove duplicate 'Office' suffixes from office names in the database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be changed without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))
        else:
            self.stdout.write(self.style.MIGRATE_HEADING("Fixing office names..."))

        def remove_duplicate_office_suffix(name: str) -> str:
            """Remove duplicate 'Office' suffix from office names."""
            name = name.strip()
            if name.endswith(" Office"):
                name = name[:-7]  # Remove " Office" (7 characters)
            return name

        updated_count = 0
        offices_to_fix = []

        # Find all offices with duplicate "Office" suffix
        for office in Office.objects.all():
            original_name = office.name
            # Check if name ends with " Office Office" (double Office)
            if original_name.endswith(" Office Office"):
                fixed_name = remove_duplicate_office_suffix(original_name)
                offices_to_fix.append((office, original_name, fixed_name))
            # Also check for cases where the name already ends with " Office" 
            # and we're appending another " Office" in auto-generation
            # This is more of a preventive check
            elif original_name.count(" Office") > 1:
                # Count occurrences - if more than one, likely has duplicates
                parts = original_name.split(" Office")
                if len(parts) > 2:  # More than one " Office" separator
                    # Reconstruct with single " Office" at the end
                    base = " Office".join(parts[:-1])
                    fixed_name = base + " Office"
                    if fixed_name != original_name:
                        offices_to_fix.append((office, original_name, fixed_name))

        if not offices_to_fix:
            self.stdout.write(self.style.SUCCESS("No offices with duplicate 'Office' suffixes found."))
            return

        self.stdout.write(f"Found {len(offices_to_fix)} office(s) to fix:")

        for office, original_name, fixed_name in offices_to_fix:
            self.stdout.write(
                f"  - {office.code}: '{original_name}' -> '{fixed_name}'"
            )

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN - No changes made. Run without --dry-run to apply changes."))
            return

        # Apply fixes
        with transaction.atomic():
            for office, original_name, fixed_name in offices_to_fix:
                office.name = fixed_name
                office.save(update_fields=["name"])
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(f"\nSuccessfully updated {updated_count} office name(s).")
        )


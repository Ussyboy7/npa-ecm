"""
Management command to fix existing completed correspondence for archive visibility.
"""
import logging
from django.core.management.base import BaseCommand
from django.db.models import Q
from correspondence.models import Correspondence

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fix existing completed correspondence to ensure they appear in archives'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        # Find completed correspondence that might be missing archive_level or organizational associations
        completed_correspondence = Correspondence.objects.filter(
            status=Correspondence.Status.COMPLETED,
            is_deleted=False
        )

        self.stdout.write(f"Found {completed_correspondence.count()} completed correspondence items")

        updated_count = 0

        for corr in completed_correspondence:
            needs_update = False
            update_fields = []

            # Set archive_level if missing
            if not corr.archive_level:
                corr.archive_level = Correspondence.ArchiveLevel.DEPARTMENT
                needs_update = True
                update_fields.append('archive_level')
                self.stdout.write(f"  - Setting archive_level for {corr.reference_number}")

            # Try to set organizational associations based on routing or creator
            if not corr.division:
                # Try to get division from the user who added this correspondence
                if hasattr(corr, 'added_by') and corr.added_by and corr.added_by.division:
                    corr.division = corr.added_by.division
                    needs_update = True
                    update_fields.append('division')
                    self.stdout.write(f"  - Setting division from creator for {corr.reference_number}")
                # Or try to get from routing history
                elif hasattr(corr, 'distribution_set') and corr.distribution_set.exists():
                    # Get the first distribution's recipient's division
                    first_dist = corr.distribution_set.first()
                    if first_dist and hasattr(first_dist, 'recipient_office') and first_dist.recipient_office:
                        office = first_dist.recipient_office
                        if office.division:
                            corr.division = office.division
                            needs_update = True
                            update_fields.append('division')
                            self.stdout.write(f"  - Setting division from routing for {corr.reference_number}")

            if not corr.department and corr.division:
                # Try to get department from the division's general manager or from routing
                if corr.division.general_manager and corr.division.general_manager.department:
                    corr.department = corr.division.general_manager.department
                    needs_update = True
                    update_fields.append('department')
                    self.stdout.write(f"  - Setting department from division GM for {corr.reference_number}")

            # Note: Correspondence model doesn't have directorate field, only division/department

            if needs_update:
                if not dry_run:
                    corr.save(update_fields=update_fields)
                updated_count += 1
                self.stdout.write(f"  ✓ Updated {corr.reference_number} ({', '.join(update_fields)})")

        if dry_run:
            self.stdout.write(f"Dry run complete. Would update {updated_count} correspondence items.")
        else:
            self.stdout.write(f"Successfully updated {updated_count} correspondence items for archive visibility.")

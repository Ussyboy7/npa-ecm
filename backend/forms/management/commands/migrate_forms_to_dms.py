"""
Management command to migrate existing FormSubmission records to DMS FormDocument records.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from forms.models import FormSubmission, FormTemplate
from dms.models import Document, FormDocument
from accounts.models import User


class Command(BaseCommand):
    help = 'Migrate existing FormSubmission records to DMS FormDocument records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run migration without actually creating records',
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip submissions that already have corresponding form documents',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        skip_existing = options['skip_existing']

        self.stdout.write(self.style.SUCCESS('Starting forms to DMS migration...'))

        submissions = FormSubmission.objects.select_related('template', 'submitted_by', 'correspondence').all()
        total = submissions.count()
        migrated = 0
        skipped = 0
        errors = 0

        self.stdout.write(f'Found {total} form submissions to migrate')

        for submission in submissions:
            try:
                # Check if form document already exists
                if skip_existing:
                    existing = FormDocument.objects.filter(
                        template=submission.template,
                        form_data=submission.data,
                    ).first()
                    if existing:
                        self.stdout.write(
                            self.style.WARNING(f'Skipping submission {submission.id} - form document already exists')
                        )
                        skipped += 1
                        continue

                # Create DMS Document
                # Get reference number from correspondence if available
                reference_number = ''
                if submission.correspondence:
                    reference_number = submission.correspondence.reference_number or ''
                
                document_title = f"{submission.template.name}"
                if reference_number:
                    document_title += f" - {reference_number}"
                else:
                    # Use submission ID as fallback
                    short_id = str(submission.id)[:8].upper()
                    document_title += f" - {short_id}"
                
                document_description = f"Migrated from FormSubmission {submission.id}"

                if dry_run:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'[DRY RUN] Would create Document: {document_title}'
                        )
                    )
                    migrated += 1
                    continue

                with transaction.atomic():
                    # Create Document
                    document = Document.objects.create(
                        title=document_title,
                        description=document_description,
                        document_type=Document.DocumentType.FORM,
                        reference_number=reference_number,
                        status=Document.DocumentStatus.PUBLISHED if not submission.is_draft else Document.DocumentStatus.DRAFT,
                        sensitivity=Document.Sensitivity.INTERNAL,
                        author=submission.submitted_by,
                        division=submission.correspondence.division if submission.correspondence else None,
                        department=submission.correspondence.department if submission.correspondence else None,
                    )

                    # Create FormDocument
                    form_document = FormDocument.objects.create(
                        document=document,
                        template=submission.template,
                        form_data=submission.data,
                        status=FormDocument.FormStatus.COMPLETED if not submission.is_draft else FormDocument.FormStatus.DRAFT,
                        correspondence=submission.correspondence,
                    )

                    # Migrate signature workflow if exists
                    signature_workflow = submission.get_signature_workflow()
                    if signature_workflow:
                        form_document.signature_workflow = signature_workflow
                        form_document.status = FormDocument.FormStatus.AWAITING_SIGNATURES
                        form_document.save()

                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Migrated submission {submission.id} -> FormDocument {form_document.id}'
                        )
                    )
                    migrated += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error migrating submission {submission.id}: {str(e)}')
                )
                errors += 1

        self.stdout.write(self.style.SUCCESS('\nMigration Summary:'))
        self.stdout.write(f'  Total: {total}')
        self.stdout.write(f'  Migrated: {migrated}')
        self.stdout.write(f'  Skipped: {skipped}')
        self.stdout.write(f'  Errors: {errors}')

        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a DRY RUN - no records were actually created'))


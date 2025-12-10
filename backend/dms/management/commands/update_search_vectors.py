"""Management command to update search vectors for documents."""

from django.core.management.base import BaseCommand
from django.contrib.postgres.search import SearchVector

from dms.models import Document


class Command(BaseCommand):
    help = "Update search vectors for all documents"

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Number of documents to process in each batch",
        )

    def handle(self, *args, **options):
        batch_size = options["batch_size"]

        self.stdout.write("Updating search vectors for documents...")

        # Build search vector
        search_vector = (
            SearchVector("title", weight="A", config="english")
            + SearchVector("description", weight="B", config="english")
            + SearchVector("reference_number", weight="A", config="english")
            + SearchVector("tags", weight="C", config="english")
        )

        # Update in batches
        total = Document.objects.count()
        updated = 0

        for i in range(0, total, batch_size):
            batch = Document.objects.all()[i : i + batch_size]
            Document.objects.filter(id__in=[doc.id for doc in batch]).update(
                search_vector=search_vector
            )
            updated += len(batch)
            self.stdout.write(f"Updated {updated}/{total} documents...")

        self.stdout.write(
            self.style.SUCCESS(f"Successfully updated search vectors for {updated} documents")
        )


"""Mark incomplete auto-generated form PDFs as superseded."""

from django.core.management.base import BaseCommand

from dms.models import DocumentVersion
from forms.pdf_version_cleanup import COMPLETE_PDF_MIN_BYTES, supersede_incomplete_generated_pdfs


class Command(BaseCommand):
    help = "Supersede tiny incomplete auto-generated form PDFs so the UI ignores them"

    def add_arguments(self, parser):
        parser.add_argument(
            "--document-id",
            type=str,
            default="",
            help="Limit cleanup to one DMS document UUID",
        )

    def handle(self, *args, **options):
        document_id = (options.get("document_id") or "").strip()
        qs = DocumentVersion.objects.filter(
            file_type="application/pdf",
            file_size__lt=COMPLETE_PDF_MIN_BYTES,
        ).select_related("document")
        if document_id:
            qs = qs.filter(document_id=document_id)

        document_ids = list(qs.values_list("document_id", flat=True).distinct())
        total = 0
        for doc_id in document_ids:
            from dms.models import Document

            document = Document.objects.filter(id=doc_id).first()
            if not document:
                continue
            total += supersede_incomplete_generated_pdfs(document)

        self.stdout.write(self.style.SUCCESS(f"Superseded {total} incomplete generated PDF version(s)."))

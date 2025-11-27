"""Form document views for DMS."""

from __future__ import annotations

from django.db.models import Max, Q
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Document, DocumentVersion, FormDocument
from .serializers import DocumentVersionSerializer, FormDocumentSerializer


class FormDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing form documents in DMS."""
    
    queryset = FormDocument.objects.select_related(
        "document",
        "template",
        "signature_workflow",
        "correspondence",
    ).prefetch_related("document__versions", "document__permissions")
    serializer_class = FormDocumentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "template", "correspondence"]
    search_fields = ["document__title", "document__reference_number"]
    ordering_fields = ["created_at", "updated_at", "status"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        """Filter queryset based on user permissions."""
        queryset = super().get_queryset()
        user = self.request.user
        
        # For now, show all form documents to authenticated users
        # Can be refined later with proper permission checks
        # Filter by document permissions
        # Users can see forms they created, have permission to, or are assigned to sign
        queryset = queryset.filter(
            Q(document__author=user) |
            Q(document__permissions__users=user) |
            Q(signature_workflow__signatures__assigned_to_user=user) |
            Q(document__is_deleted=False)  # Only show non-deleted documents
        ).distinct()
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Override create to handle document creation."""
        # Get document_id from request data
        document_id = request.data.get("document_id")
        if not document_id:
            return Response(
                {"error": "document_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            document = Document.objects.get(id=document_id)
        except Document.DoesNotExist:
            return Response(
                {"error": "Document not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Check if FormDocument already exists for this document
        if FormDocument.objects.filter(document=document).exists():
            return Response(
                {"error": "Form document already exists for this document"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Create serializer with document
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Manually set document in validated_data
        serializer.validated_data["document"] = document
        
        form_document = serializer.save()
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"])
    def generate_pdf(self, request, pk=None):
        """Generate PDF for a form document. Can be called when signatures are complete or form is completed."""
        form_doc = self.get_object()
        
        # Check if signatures are complete (if workflow exists)
        signatures_complete = True
        if form_doc.signature_workflow:
            signatures_complete = form_doc.signature_workflow.is_complete()
        
        # Allow PDF generation if form is completed OR all signatures are complete
        if form_doc.status != FormDocument.FormStatus.COMPLETED and not signatures_complete:
            return Response(
                {"error": "Form must be completed or all signatures must be complete before generating PDF"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Check if this is a Project Monitoring Report
        if form_doc.template and form_doc.template.slug == "project-monitoring-report-audit":
            try:
                from forms.pdf_generator import generate_project_monitoring_report_pdf
                
                # Merge form data with signature data
                pdf_data = form_doc.form_data.copy()
                
                # Get signature data from workflow if exists
                if form_doc.signature_workflow:
                    for signature in form_doc.signature_workflow.signatures.filter(
                        status="signed"
                    ):
                        field_prefix = signature.field_name.replace("_signature", "")
                        pdf_data[f"{field_prefix}_name"] = signature.signer_name
                        pdf_data[f"{field_prefix}_pn"] = signature.signer_pn
                        pdf_data[f"{field_prefix}_designation"] = signature.signer_designation
                        pdf_data[f"{field_prefix}_date"] = signature.signed_date.isoformat() if signature.signed_date else ""
                
                pdf_bytes = generate_project_monitoring_report_pdf(pdf_data)
                
                # Create new DocumentVersion with PDF
                latest_version = form_doc.document.versions.aggregate(
                    Max("version_number")
                )["version_number__max"] or 0
                
                version = DocumentVersion.objects.create(
                    document=form_doc.document,
                    version_number=latest_version + 1,
                    file_name=f"{form_doc.document.title.replace(' ', '_')}_final.pdf",
                    file_type="application/pdf",
                    file_size=len(pdf_bytes),
                    uploaded_by=request.user,
                    notes="Generated PDF from completed form",
                )
                
                # Save PDF file
                file_path = f"dms_versions/{form_doc.document.id}/{version.file_name}"
                saved_path = default_storage.save(file_path, ContentFile(pdf_bytes))
                
                # Build relative URL (browser will resolve to current domain)
                media_url = settings.MEDIA_URL or '/media/'
                if not media_url.startswith('/'):
                    media_url = f'/{media_url}'
                version.file_url = f"{media_url.rstrip('/')}/{saved_path}"
                version.save()
                
                serializer = DocumentVersionSerializer(version, context={"request": request})
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response(
                    {"error": f"Failed to generate PDF: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        
        return Response(
            {"error": "PDF generation not supported for this form type"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def mark_completed(self, request, pk=None):
        """Mark form document as completed."""
        form_doc = self.get_object()
        form_doc.mark_completed()
        serializer = self.get_serializer(form_doc)
        return Response(serializer.data)


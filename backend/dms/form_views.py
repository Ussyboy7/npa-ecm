"""Form document views for DMS."""

from __future__ import annotations

from django.db import transaction
from django.db.models import Max, Q
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings
from common.pagination import StandardPageNumberPagination
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
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "template", "correspondence"]
    search_fields = ["document__title", "document__reference_number"]
    ordering_fields = ["created_at", "updated_at", "status"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        """Filter queryset based on user permissions."""
        queryset = super().get_queryset()
        user = self.request.user
        queryset = queryset.filter(document__is_deleted=False)

        if user.is_superuser:
            return queryset.distinct()
        
        # Check if user is a secretary and if executive filter is provided
        role_name = getattr(getattr(user, "system_role", None), "name", "") or ""
        is_secretary = role_name.lower() == "secretary"
        executive_id = self.request.query_params.get("executive")
        
        # Users can see forms they created, forms explicitly shared with them,
        # or forms where they are assigned as a signer.
        base_filter = (
            Q(document__author=user)
            | Q(document__permissions__users=user)
            | Q(signature_workflow__signatures__assigned_to_user=user)
        )
        
        # If secretary is filtering by executive, show forms linked to correspondence
        # where secretary acted on behalf of that executive
        if is_secretary and executive_id:
            from correspondence.models import Minute
            # Get correspondence where secretary acted for this executive
            secretary_correspondence_ids = Minute.objects.filter(
                acted_by_secretary=True,
                performed_by=user,
                user_id=executive_id  # The executive the secretary acted for
            ).values_list('correspondence_id', flat=True).distinct()
            
            # Get forms linked to these correspondence (FormDocument has correspondence FK)
            base_filter |= Q(correspondence_id__in=secretary_correspondence_ids)
        
        queryset = queryset.filter(base_filter).distinct()
        
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
        
        if not form_doc.template:
            return Response(
                {"error": "Form template is required for PDF generation"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            from forms.pdf_generator import (
                generate_project_monitoring_report_pdf,
                generate_project_completion_validation_pdf,
                generate_generic_form_pdf,
            )
            
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
            
            # Generate PDF based on template slug
            template_slug = form_doc.template.slug
            
            if template_slug == "project-monitoring-report-audit":
                pdf_bytes = generate_project_monitoring_report_pdf(pdf_data)
            elif template_slug == "project-completion-validation":
                pdf_bytes = generate_project_completion_validation_pdf(pdf_data)
            else:
                # Use generic PDF generator for other forms
                template_structure = {
                    "name": form_doc.template.name,
                    "structure": form_doc.template.structure,
                }
                pdf_bytes = generate_generic_form_pdf(pdf_data, template_structure)
            
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
            # Log the full error server-side but don't leak to frontend
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"PDF generation failed: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to generate PDF. Please try again or contact support."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def mark_completed(self, request, pk=None):
        """Mark form document as completed."""
        form_doc = self.get_object()
        form_doc.mark_completed()
        serializer = self.get_serializer(form_doc)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def clone(self, request, pk=None):
        """Create a new draft form document cloned from an existing one."""
        source_form = self.get_object()
        source_document = source_form.document

        title = (request.data.get("title") or "").strip()
        if not title:
            title = f"{source_document.title} (Copy)"

        description = request.data.get("description", source_document.description)
        reference_number = (request.data.get("reference_number") or "").strip()

        with transaction.atomic():
            cloned_document = Document.objects.create(
                title=title,
                description=description or "",
                document_type=Document.DocumentType.FORM,
                reference_number=reference_number,
                status=Document.DocumentStatus.DRAFT,
                sensitivity=source_document.sensitivity,
                author=request.user,
                division=source_document.division,
                department=source_document.department,
                tags=source_document.tags or [],
            )

            cloned_form = FormDocument.objects.create(
                document=cloned_document,
                template=source_form.template,
                form_data=source_form.form_data or {},
                status=FormDocument.FormStatus.DRAFT,
            )

        serializer = self.get_serializer(cloned_form)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

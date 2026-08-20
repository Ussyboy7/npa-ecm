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

        pending_my_signature = str(self.request.query_params.get("pending_my_signature", "")).lower() in {
            "1",
            "true",
            "yes",
        }
        if pending_my_signature:
            from forms.signature_models import FormSignature

            # Forms where the current user still has a pending signature assignment.
            return queryset.filter(
                signature_workflow__signatures__assigned_to_user=user,
                signature_workflow__signatures__status=FormSignature.Status.PENDING,
            ).distinct()

        signed_by_me = str(self.request.query_params.get("signed_by_me", "")).lower() in {
            "1",
            "true",
            "yes",
        }
        if signed_by_me:
            from forms.signature_models import FormSignature

            # Forms the current user has already signed (leaves Pending Signatures).
            return queryset.filter(
                signature_workflow__signatures__signed_by=user,
                signature_workflow__signatures__status=FormSignature.Status.SIGNED,
            ).distinct()

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
            from forms.form_serials import ensure_form_serial
            from forms.pdf_generator import (
                generate_project_monitoring_report_pdf,
                generate_witnessing_deliveries_pdf,
                generate_audit_query_pdf,
                generate_generic_form_pdf,
            )
            from forms.pdf_signature_merge import (
                MONITORING_SIGNATURE_ROLES,
                WITNESSING_SIGNATURE_ROLES,
                merge_signatures_into_pdf_data,
            )
            from forms.pdf_version_cleanup import supersede_incomplete_generated_pdfs
            
            # Merge form data with signature data
            pdf_data = form_doc.form_data.copy() if form_doc.form_data else {}
            template_slug = form_doc.template.slug if form_doc.template else ""

            if form_doc.signature_workflow:
                role_order = (
                    WITNESSING_SIGNATURE_ROLES
                    if template_slug == "witnessing-of-deliveries"
                    else MONITORING_SIGNATURE_ROLES
                )
                pdf_data = merge_signatures_into_pdf_data(
                    pdf_data,
                    form_doc.signature_workflow.signatures.filter(status="signed").select_related(
                        "assigned_to_user",
                        "assigned_to_user__division",
                        "assigned_to_user__department",
                        "signed_by",
                    ),
                    role_order=role_order,
                )

            # Auto-issue CHQ / form No. / HQ serial when blank (persisted on form_data)
            pdf_data = ensure_form_serial(form_doc, pdf_data)

            if template_slug == "project-monitoring-report-audit":
                pdf_bytes = generate_project_monitoring_report_pdf(pdf_data)
            elif template_slug == "witnessing-of-deliveries":
                pdf_bytes = generate_witnessing_deliveries_pdf(pdf_data)
            elif template_slug == "audit-query-bills-certification":
                pdf_bytes = generate_audit_query_pdf(pdf_data)
            else:
                # No live paper facsimile for other slugs (incl. unused completion-validation)
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
                notes="Generated PDF from completed form with signatures",
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

            # Mark prior tiny auto-generated stubs so the UI ignores them
            supersede_incomplete_generated_pdfs(
                form_doc.document,
                keep_version_id=version.id,
            )
            
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

    @action(detail=True, methods=["post"])
    def forward(self, request, pk=None):
        """Share a form with users/division/department and notify recipients.

        Signature forwards also create a real signature workflow so recipients
        appear under Pending Signatures and can sign in the form editor.
        """
        from accounts.models import User
        from forms.models import FormSubmission
        from forms.signature_models import FormSignature, FormSignatureWorkflow
        from notifications.models import Notification
        from notifications.services import NotificationService

        from .models import DocumentPermission

        form_doc = self.get_object()
        target_type = (request.data.get("target_type") or "user").strip().lower()
        action_type = (request.data.get("action_type") or "review").strip().lower()
        message = (request.data.get("message") or "").strip()
        user_ids = request.data.get("user_ids") or []
        division_id = request.data.get("division_id") or ""
        department_id = request.data.get("department_id") or ""

        if action_type not in {"review", "input", "signature"}:
            return Response(
                {"error": "action_type must be review, input, or signature"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target_type not in {"user", "division", "department"}:
            return Response(
                {"error": "target_type must be user, division, or department"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        recipients_qs = User.objects.filter(is_active=True).exclude(id=request.user.id)
        recipients_qs = recipients_qs.exclude(email__icontains="+seed-user-").exclude(
            username__iexact="debug"
        )

        if target_type == "user":
            if not isinstance(user_ids, list) or not user_ids:
                return Response(
                    {"error": "user_ids is required when target_type is user"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            recipients = list(recipients_qs.filter(id__in=user_ids))
        elif target_type == "division":
            if not division_id:
                return Response(
                    {"error": "division_id is required when target_type is division"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            recipients = list(recipients_qs.filter(division_id=division_id))
        else:
            if not department_id:
                return Response(
                    {"error": "department_id is required when target_type is department"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            recipients = list(recipients_qs.filter(department_id=department_id))

        if not recipients:
            return Response(
                {"error": "No active recipients found for that selection"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action_type == "signature" and not form_doc.template_id:
            return Response(
                {"error": "Form template is required before requesting signatures"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        action_text = {
            "review": "review",
            "input": "provide input on",
            "signature": "sign",
        }[action_type]
        access = (
            DocumentPermission.AccessLevel.WRITE
            if action_type in {"input", "signature"}
            else DocumentPermission.AccessLevel.READ
        )
        if message:
            notify_message = message
        elif target_type == "user":
            notify_message = f"You have been asked to {action_text} this form."
        else:
            notify_message = f"A form has been forwarded to your {target_type} for {action_text}."

        notification_type = (
            Notification.NotificationType.WORKFLOW
            if action_type == "signature"
            else Notification.NotificationType.DOCUMENT
        )
        action_url = f"/forms/{form_doc.document_id}"

        def template_signature_fields() -> list[dict]:
            if not form_doc.template:
                return []
            structure = form_doc.template.structure or {}
            fields = structure.get("fields") or []
            result: list[dict] = []
            for field in fields:
                if not isinstance(field, dict):
                    continue
                name = str(field.get("name") or "")
                label = str(field.get("label") or "")
                is_file = field.get("type") == "file"
                marked = field.get("is_signature_field") is True
                looks_like_signature = "signature" in name.lower() or "signature" in label.lower()
                if is_file and (marked or looks_like_signature):
                    result.append(field)
            return result

        created_workflow = False
        with transaction.atomic():
            if form_doc.status == FormDocument.FormStatus.DRAFT:
                form_doc.status = FormDocument.FormStatus.IN_PROGRESS
                form_doc.save(update_fields=["status", "updated_at"])

            permission = DocumentPermission.objects.create(
                document=form_doc.document,
                access=access,
                note=notify_message,
            )
            permission.users.set(recipients)
            if target_type == "division" and division_id:
                permission.divisions.set([division_id])
            if target_type == "department" and department_id:
                permission.departments.set([department_id])

            if action_type == "signature" and not form_doc.signature_workflow_id:
                from forms.pdf_signature_merge import (
                    pick_signature_field_for_recipient,
                    signature_fields_for_template,
                )

                sig_fields = signature_fields_for_template(
                    form_doc.template,
                    fallback_fields=template_signature_fields() or None,
                )

                submission = FormSubmission.objects.create(
                    template=form_doc.template,
                    correspondence=form_doc.correspondence,
                    data=form_doc.form_data or {},
                    is_draft=False,
                    submitted_by=request.user,
                )

                workflow = FormSignatureWorkflow.objects.create(
                    submission=submission,
                    routing_mode="parallel",
                    total_steps=0,
                    initiated_by=request.user,
                    notes=notify_message,
                    status=FormSignatureWorkflow.Status.IN_PROGRESS,
                )

                # One signature task per recipient, mapped to the best role slot.
                used_field_names: set[str] = set()
                order = 0
                for recipient in recipients:
                    field = pick_signature_field_for_recipient(
                        recipient, sig_fields, used_field_names
                    )
                    field_name = str(field.get("name") or "approval_signature")
                    used_field_names.add(field_name)
                    order += 1
                    FormSignature.objects.create(
                        workflow=workflow,
                        field_name=field_name,
                        field_label=str(field.get("label") or "Approval Signature"),
                        assigned_to_user=recipient,
                        order=order,
                        status=FormSignature.Status.PENDING,
                    )

                workflow.total_steps = order
                workflow.save(update_fields=["total_steps", "updated_at"])

                form_doc.signature_workflow = workflow
                form_doc.status = FormDocument.FormStatus.AWAITING_SIGNATURES
                form_doc.save(update_fields=["signature_workflow", "status", "updated_at"])
                created_workflow = True

            notified = 0
            for recipient in recipients:
                created = NotificationService.create_notification(
                    recipient=recipient,
                    title=f"Form Forwarded: {form_doc.document.title}",
                    message=notify_message,
                    notification_type=notification_type,
                    priority=Notification.Priority.HIGH,
                    sender=request.user,
                    module="forms",
                    related_object_type="form_document",
                    related_object_id=str(form_doc.document_id),
                    action_url=action_url,
                    action_required=True,
                )
                if created is not None:
                    notified += 1

        serializer = self.get_serializer(form_doc)
        return Response(
            {
                "notified_count": notified,
                "recipient_count": len(recipients),
                "signature_workflow_created": created_workflow,
                "form": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

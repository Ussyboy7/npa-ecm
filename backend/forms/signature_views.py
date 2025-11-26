"""Views for form signature workflow."""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction, models
from django.utils import timezone

from forms.signature_models import FormSignatureWorkflow, FormSignature
from forms.models import FormSubmission
from forms.signature_serializers import (
    FormSignatureWorkflowSerializer,
    FormSignatureSerializer,
    CreateSignatureWorkflowSerializer,
    SignFormSerializer,
)
from organization.models import Office, Department, Division
from notifications.services import NotificationService


class FormSignatureWorkflowViewSet(viewsets.ModelViewSet):
    """ViewSet for managing form signature workflows."""
    
    queryset = FormSignatureWorkflow.objects.select_related(
        "submission", "submission__template", "initiated_by"
    ).prefetch_related("signatures")
    serializer_class = FormSignatureWorkflowSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter workflows based on user permissions."""
        queryset = super().get_queryset()
        
        # Filter by submission if provided
        submission_id = self.request.query_params.get("submission")
        if submission_id:
            queryset = queryset.filter(submission_id=submission_id)
        
        # Filter by status if provided
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    @action(detail=False, methods=["post"])
    def create_workflow(self, request):
        """Create a new signature workflow for a form submission."""
        serializer = CreateSignatureWorkflowSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        submission_id = serializer.validated_data["submission_id"]
        routing_mode = serializer.validated_data["routing_mode"]
        signature_assignments = serializer.validated_data["signature_assignments"]
        notes = serializer.validated_data.get("notes", "")
        
        try:
            submission = FormSubmission.objects.get(id=submission_id)
        except FormSubmission.DoesNotExist:
            return Response(
                {"error": "Submission not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if workflow already exists
        existing_workflow = submission.get_signature_workflow()
        if existing_workflow:
            return Response(
                {"error": "An active signature workflow already exists for this submission"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Create workflow
            workflow = FormSignatureWorkflow.objects.create(
                submission=submission,
                routing_mode=routing_mode,
                total_steps=len(signature_assignments),
                initiated_by=request.user,
                notes=notes,
            )
            
            # Create signature entries
            for order, assignment in enumerate(signature_assignments, start=1):
                field_name = assignment["field_name"]
                field_label = assignment.get("field_label", field_name)
                
                # Get assignment targets
                office_id = assignment.get("office_id")
                department_id = assignment.get("department_id")
                division_id = assignment.get("division_id")
                user_id = assignment.get("user_id")
                
                office = None
                department = None
                division = None
                user = None
                
                if office_id:
                    try:
                        office = Office.objects.get(id=office_id)
                    except Office.DoesNotExist:
                        pass
                
                if department_id:
                    try:
                        department = Department.objects.get(id=department_id)
                    except Department.DoesNotExist:
                        pass
                
                if division_id:
                    try:
                        division = Division.objects.get(id=division_id)
                    except Division.DoesNotExist:
                        pass
                
                if user_id:
                    try:
                        from accounts.models import User
                        user = User.objects.get(id=user_id)
                    except User.DoesNotExist:
                        pass
                
                signature = FormSignature.objects.create(
                    workflow=workflow,
                    field_name=field_name,
                    field_label=field_label,
                    assigned_to_office=office,
                    assigned_to_department=department,
                    assigned_to_division=division,
                    assigned_to_user=user,
                    order=order,
                    status=FormSignature.Status.PENDING,
                )
                
                # Send notification to assigned user/office
                if routing_mode == "parallel" or order == 1:
                    NotificationService.create_notification(
                        user=user if user else None,
                        office=office,
                        department=department,
                        division=division,
                        notification_type="form_signature_required",
                        title=f"Signature Required: {submission.template.name}",
                        message=f"You have been assigned to sign the '{field_label}' field for {submission.template.name}.",
                        module="forms",
                        priority="high",
                        metadata={
                            "submission_id": str(submission.id),
                            "signature_id": str(signature.id),
                            "workflow_id": str(workflow.id),
                        },
                    )
            
            # Update workflow status
            if routing_mode == "sequential":
                workflow.status = FormSignatureWorkflow.Status.IN_PROGRESS
                workflow.current_step = 1
            else:
                workflow.status = FormSignatureWorkflow.Status.IN_PROGRESS
            workflow.save()
        
        serializer = FormSignatureWorkflowSerializer(workflow, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=["get"])
    def signatures(self, request, pk=None):
        """Get all signatures for a workflow."""
        workflow = self.get_object()
        signatures = workflow.signatures.all()
        serializer = FormSignatureSerializer(signatures, many=True, context={"request": request})
        return Response(serializer.data)
    
    @action(detail=True, methods=["post"])
    def sign(self, request, pk=None):
        """Sign a form signature."""
        workflow = self.get_object()
        sign_serializer = SignFormSerializer(data=request.data)
        sign_serializer.is_valid(raise_exception=True)
        
        signature_id = sign_serializer.validated_data["signature_id"]
        
        try:
            signature = workflow.signatures.get(id=signature_id)
        except FormSignature.DoesNotExist:
            return Response(
                {"error": "Signature not found in this workflow"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user has permission to sign
        if not self._can_user_sign(signature, request.user):
            return Response(
                {"error": "You do not have permission to sign this signature"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get user's information from their profile
        user = request.user
        signer_name = sign_serializer.validated_data.get("signer_name") or user.get_full_name() or user.username
        signer_pn = sign_serializer.validated_data.get("signer_pn") or getattr(user, "personnel_number", "") or ""
        
        # Get user's designation from their office membership or profile
        signer_designation = sign_serializer.validated_data.get("signer_designation") or ""
        if not signer_designation:
            from organization.models import OfficeMembership
            user_membership = OfficeMembership.objects.filter(
                user=user, is_active=True, is_primary=True
            ).select_related("office").first()
            if user_membership:
                signer_designation = user_membership.assignment_role or ""
        
        # Sign the form
        signature.sign(
            user=user,
            signature_file=sign_serializer.validated_data.get("signature_file"),
            signer_name=signer_name,
            signer_pn=signer_pn,
            signer_designation=signer_designation,
            signed_date=sign_serializer.validated_data.get("signed_date"),
        )
        
        # Update submission data with signature info and related fields
        submission = workflow.submission
        submission_data = submission.data.copy()
        
        # Get the base field name (e.g., "pm_signature" -> "pm")
        base_field_prefix = signature.field_name.replace("_signature", "")
        
        # Update signature field
        submission_data[signature.field_name] = {
            "signer_name": signature.signer_name,
            "signer_pn": signature.signer_pn,
            "signer_designation": signature.signer_designation,
            "signed_date": str(signature.signed_date) if signature.signed_date else None,
            "signature_file": signature.signature_file.url if signature.signature_file else None,
        }
        
        # Update related fields (name, pn, designation, date) if they exist in the form
        if f"{base_field_prefix}_name" in submission_data:
            submission_data[f"{base_field_prefix}_name"] = signature.signer_name
        if f"{base_field_prefix}_pn" in submission_data:
            submission_data[f"{base_field_prefix}_pn"] = signature.signer_pn
        if f"{base_field_prefix}_designation" in submission_data:
            submission_data[f"{base_field_prefix}_designation"] = signature.signer_designation
        if f"{base_field_prefix}_date" in submission_data and signature.signed_date:
            submission_data[f"{base_field_prefix}_date"] = str(signature.signed_date)
        
        # Also get user's department/division from their office membership
        from organization.models import OfficeMembership
        user_membership = OfficeMembership.objects.filter(
            user=user, is_active=True, is_primary=True
        ).select_related("office", "office__department", "office__division").first()
        
        if user_membership and user_membership.office:
            if user_membership.office.department:
                submission_data[f"{base_field_prefix}_department"] = user_membership.office.department.name
            if user_membership.office.division:
                submission_data[f"{base_field_prefix}_division"] = user_membership.office.division.name
        
        submission.data = submission_data
        submission.save()
        
        # Check if workflow is complete
        if workflow.is_complete():
            workflow.complete()
            
            # Auto-generate PDF for linked FormDocuments
            from dms.models import FormDocument
            form_documents = FormDocument.objects.filter(signature_workflow=workflow)
            for form_doc in form_documents:
                if form_doc.status == FormDocument.FormStatus.AWAITING_SIGNATURES:
                    # Update status to completed
                    form_doc.status = FormDocument.FormStatus.COMPLETED
                    form_doc.save()
                    
                    # Auto-generate PDF if template supports it
                    if form_doc.template and form_doc.template.slug == "project-monitoring-report-audit":
                        try:
                            from forms.pdf_generator import generate_project_monitoring_report_pdf
                            from dms.models import DocumentVersion
                            from django.core.files.storage import default_storage
                            from django.core.files.base import ContentFile
                            from django.db.models import Max
                            
                            # Merge form data with signature data
                            pdf_data = form_doc.form_data.copy()
                            
                            # Get signature data from workflow
                            for signature in workflow.signatures.filter(status="signed"):
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
                                uploaded_by=user,
                                notes="Auto-generated PDF from completed form with all signatures",
                            )
                            
                            # Save PDF file
                            file_path = f"dms_versions/{form_doc.document.id}/{version.file_name}"
                            saved_path = default_storage.save(file_path, ContentFile(pdf_bytes))
                            
                            # Build URL (will be set properly when accessed via API)
                            from django.conf import settings
                            version.file_url = f"/media/{saved_path}"
                            version.save()
                        except Exception as e:
                            # Log error but don't fail the signature process
                            import logging
                            logger = logging.getLogger(__name__)
                            logger.error(f"Failed to auto-generate PDF for form document {form_doc.id}: {str(e)}")
            
            # Notify initiator
            NotificationService.create_notification(
                user=workflow.initiated_by,
                notification_type="form_signature_complete",
                title=f"All Signatures Complete: {submission.template.name}",
                message=f"All signatures have been completed for {submission.template.name}. PDF has been generated.",
                module="forms",
                priority="normal",
                metadata={
                    "submission_id": str(submission.id),
                    "workflow_id": str(workflow.id),
                },
            )
        elif workflow.routing_mode == "sequential":
            # Move to next signature
            next_signature = workflow.get_next_pending_signature()
            if next_signature:
                workflow.current_step += 1
                workflow.save()
                
                # Notify next signer
                NotificationService.create_notification(
                    user=next_signature.assigned_to_user,
                    office=next_signature.assigned_to_office,
                    department=next_signature.assigned_to_department,
                    division=next_signature.assigned_to_division,
                    notification_type="form_signature_required",
                    title=f"Signature Required: {submission.template.name}",
                    message=f"You have been assigned to sign the '{next_signature.field_label}' field for {submission.template.name}.",
                    module="forms",
                    priority="high",
                    metadata={
                        "submission_id": str(submission.id),
                        "signature_id": str(next_signature.id),
                        "workflow_id": str(workflow.id),
                    },
                )
        
        serializer = FormSignatureSerializer(signature, context={"request": request})
        return Response(serializer.data)
    
    def _can_user_sign(self, signature: FormSignature, user) -> bool:
        """Check if user can sign this signature."""
        # If assigned to specific user
        if signature.assigned_to_user:
            return signature.assigned_to_user == user
        
        # Check office membership
        if signature.assigned_to_office:
            from organization.models import OfficeMembership
            return OfficeMembership.objects.filter(
                office=signature.assigned_to_office,
                user=user,
                is_active=True,
            ).exists()
        
        # Check department membership
        if signature.assigned_to_department:
            from organization.models import OfficeMembership
            return OfficeMembership.objects.filter(
                office__department=signature.assigned_to_department,
                user=user,
                is_active=True,
            ).exists()
        
        # Check division membership
        if signature.assigned_to_division:
            from organization.models import OfficeMembership
            return OfficeMembership.objects.filter(
                office__division=signature.assigned_to_division,
                user=user,
                is_active=True,
            ).exists()
        
        return False


class FormSignatureViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing form signatures."""
    
    queryset = FormSignature.objects.select_related(
        "workflow", "workflow__submission", "assigned_to_office",
        "assigned_to_department", "assigned_to_division", "signed_by"
    )
    serializer_class = FormSignatureSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = []
    
    def get_queryset(self):
        """Filter signatures based on user."""
        queryset = super().get_queryset()
        
        # Filter by workflow if provided
        workflow_id = self.request.query_params.get("workflow")
        if workflow_id:
            queryset = queryset.filter(workflow_id=workflow_id)
        
        # Filter by status if provided
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by assigned user/office
        user = self.request.user
        if not user.is_superuser:
            from organization.models import OfficeMembership
            user_offices = OfficeMembership.objects.filter(
                user=user, is_active=True
            ).values_list("office_id", flat=True)
            
            queryset = queryset.filter(
                models.Q(assigned_to_user=user) |
                models.Q(assigned_to_office_id__in=user_offices) |
                models.Q(assigned_to_department__offices__id__in=user_offices) |
                models.Q(assigned_to_division__offices__id__in=user_offices)
            ).distinct()
        
        return queryset


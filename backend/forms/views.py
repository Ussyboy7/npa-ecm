"""Views for forms app."""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.http import HttpResponse

from common.permissions import IsSystemAdminRole
from forms.models import FormTemplate, FormSubmission
from forms.serializers import (
    FormTemplateSerializer,
    FormSubmissionSerializer,
    FormSubmissionListSerializer,
)
from forms.pdf_generator import generate_project_monitoring_report_pdf
from forms.signature_models import FormSignatureWorkflow, FormSignature
from forms.signature_serializers import (
    FormSignatureWorkflowSerializer,
    FormSignatureSerializer,
    CreateSignatureWorkflowSerializer,
    SignFormSerializer,
)


class FormTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing form templates."""

    queryset = FormTemplate.objects.all()
    serializer_class = FormTemplateSerializer
    permission_classes = [IsAuthenticated, IsSystemAdminRole]
    pagination_class = None  # Disable pagination for form templates
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "is_active"]
    search_fields = ["name", "description", "slug"]
    ordering_fields = ["name", "category", "created_at"]
    ordering = ["category", "name"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def clone(self, request, pk=None):
        """Clone a form template."""
        template = self.get_object()
        new_template = FormTemplate.objects.create(
            name=f"Copy of {template.name}",
            slug=f"{template.slug}-copy-{template.id.hex[:8]}",
            description=template.description,
            category=template.category,
            is_active=False,  # Cloned templates start inactive
            structure=template.structure,
            created_by=request.user,
        )
        serializer = self.get_serializer(new_template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FormSubmissionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing form submissions."""

    queryset = FormSubmission.objects.all()
    serializer_class = FormSubmissionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for form submissions
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["template", "correspondence", "is_draft"]
    ordering_fields = ["created_at", "submitted_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return FormSubmissionListSerializer
        return FormSubmissionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by correspondence if provided
        correspondence_id = self.request.query_params.get("correspondence")
        if correspondence_id:
            queryset = queryset.filter(correspondence_id=correspondence_id)
        return queryset

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """Submit a draft form."""
        submission = self.get_object()
        if not submission.is_draft:
            return Response(
                {"error": "Form is already submitted"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        submission.submit(user=request.user)
        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def by_correspondence(self, request):
        """Get all form submissions for a correspondence."""
        correspondence_id = request.query_params.get("correspondence_id")
        if not correspondence_id:
            return Response(
                {"error": "correspondence_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        submissions = FormSubmission.objects.filter(correspondence_id=correspondence_id)
        serializer = self.get_serializer(submissions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=["get"])
    def generate_pdf(self, request, pk=None):
        """Generate PDF for a form submission."""
        submission = self.get_object()
        
        # Check if this is a Project Monitoring Report
        if submission.template.slug == "project-monitoring-report-audit":
            try:
                pdf_bytes = generate_project_monitoring_report_pdf(submission.data)
                
                response = HttpResponse(pdf_bytes, content_type="application/pdf")
                response["Content-Disposition"] = f'inline; filename="project-monitoring-report-{submission.id}.pdf"'
                return response
            except Exception as e:
                return Response(
                    {"error": "Failed to generate PDF. Please try again or contact support."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            return Response(
                {"error": "PDF generation not available for this form template"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=["get"])
    def signature_workflow(self, request, pk=None):
        """Get signature workflow for a submission."""
        submission = self.get_object()
        workflow = submission.get_signature_workflow()
        
        if not workflow:
            return Response(
                {"error": "No active signature workflow found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = FormSignatureWorkflowSerializer(workflow, context={"request": request})
        return Response(serializer.data)

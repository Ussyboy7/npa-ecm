"""Serializers for form signature workflow."""

from rest_framework import serializers
from forms.signature_models import FormSignatureWorkflow, FormSignature
from forms.models import FormSubmission
from organization.models import Office, Department, Division
from accounts.models import User


class FormSignatureSerializer(serializers.ModelSerializer):
    """Serializer for FormSignature."""
    
    assigned_to_office_name = serializers.CharField(source="assigned_to_office.name", read_only=True)
    assigned_to_department_name = serializers.CharField(source="assigned_to_department.name", read_only=True)
    assigned_to_division_name = serializers.CharField(source="assigned_to_division.name", read_only=True)
    signed_by_name = serializers.CharField(source="signed_by.get_full_name", read_only=True)
    signature_file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = FormSignature
        fields = [
            "id",
            "workflow",
            "field_name",
            "field_label",
            "assigned_to_office",
            "assigned_to_office_name",
            "assigned_to_department",
            "assigned_to_department_name",
            "assigned_to_division",
            "assigned_to_division_name",
            "signer_name",
            "signer_pn",
            "signer_designation",
            "signature_file",
            "signature_file_url",
            "signed_date",
            "status",
            "order",
            "assigned_to_user",
            "signed_by",
            "signed_by_name",
            "signed_at",
            "notes",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "signed_at",
            "signed_by",
        ]
    
    def get_signature_file_url(self, obj):
        """Get the URL for the signature file."""
        if obj.signature_file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.signature_file.url)
            return obj.signature_file.url
        return None


class FormSignatureWorkflowSerializer(serializers.ModelSerializer):
    """Serializer for FormSignatureWorkflow."""
    
    submission_template_name = serializers.CharField(source="submission.template.name", read_only=True)
    submission_reference = serializers.CharField(source="submission.correspondence.reference_number", read_only=True)
    initiated_by_name = serializers.CharField(source="initiated_by.get_full_name", read_only=True)
    signatures = FormSignatureSerializer(many=True, read_only=True)
    pending_signatures_count = serializers.SerializerMethodField()
    completed_signatures_count = serializers.SerializerMethodField()
    
    class Meta:
        model = FormSignatureWorkflow
        fields = [
            "id",
            "submission",
            "submission_template_name",
            "submission_reference",
            "status",
            "current_step",
            "total_steps",
            "routing_mode",
            "initiated_by",
            "initiated_by_name",
            "completed_at",
            "notes",
            "signatures",
            "pending_signatures_count",
            "completed_signatures_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "completed_at",
        ]
    
    def get_pending_signatures_count(self, obj):
        """Get count of pending signatures."""
        return obj.signatures.filter(status=FormSignature.Status.PENDING).count()
    
    def get_completed_signatures_count(self, obj):
        """Get count of completed signatures."""
        return obj.signatures.filter(status=FormSignature.Status.SIGNED).count()


class CreateSignatureWorkflowSerializer(serializers.Serializer):
    """Serializer for creating a signature workflow."""
    
    submission_id = serializers.UUIDField()
    routing_mode = serializers.ChoiceField(
        choices=FormSignatureWorkflow.routing_mode.field.choices,
        default="sequential",
    )
    signature_assignments = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of signature field assignments with office/department/division",
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_submission_id(self, value):
        """Validate that submission exists and is submitted."""
        try:
            submission = FormSubmission.objects.get(id=value)
            if submission.is_draft:
                raise serializers.ValidationError("Cannot create workflow for draft submission")
            return value
        except FormSubmission.DoesNotExist:
            raise serializers.ValidationError("Submission not found")
    
    def validate_signature_assignments(self, value):
        """Validate signature assignments."""
        if not value:
            raise serializers.ValidationError("At least one signature assignment is required")
        
        for assignment in value:
            if "field_name" not in assignment:
                raise serializers.ValidationError("Each assignment must have 'field_name'")
            
            # At least one assignment target must be specified
            has_target = any(
                assignment.get(key) for key in ["office_id", "department_id", "division_id"]
            )
            if not has_target:
                raise serializers.ValidationError(
                    "Each assignment must specify at least one: office_id, department_id, or division_id"
                )
        
        return value


class SignFormSerializer(serializers.Serializer):
    """Serializer for signing a form."""
    
    signature_id = serializers.UUIDField()
    signature_file = serializers.FileField(required=False)
    signer_name = serializers.CharField(required=False, allow_blank=True)
    signer_pn = serializers.CharField(required=False, allow_blank=True)
    signer_designation = serializers.CharField(required=False, allow_blank=True)
    signed_date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_signature_id(self, value):
        """Validate that signature exists and is pending."""
        try:
            signature = FormSignature.objects.get(id=value)
            if signature.status != FormSignature.Status.PENDING:
                raise serializers.ValidationError("Signature is not pending")
            return value
        except FormSignature.DoesNotExist:
            raise serializers.ValidationError("Signature not found")


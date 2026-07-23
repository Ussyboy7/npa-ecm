"""Serializers for correspondence workflows."""

from __future__ import annotations

from rest_framework import serializers
from django.contrib.auth import get_user_model

from accounts.serializers import UserSerializer

User = get_user_model()
from organization.models import Department, Division, Directorate, Office

from .models import (
    Case,
    CaseComment,
    CaseCorrespondenceLink,
    CaseDocumentLink,
    CaseFormLink,
    CaseSLA,
    CaseTemplate,
    CaseWorkflowRule,
    Correspondence,
    CorrespondenceAttachment,
    CorrespondenceDelegation,
    CorrespondenceDraft,
    CorrespondenceDistribution,
    CorrespondenceDocumentLink,
    CorrespondenceTemplate,
    Delegation,
    DispatchRecord,
    Minute,
    ParallelRoutingGroup,
)
from .physical_serializers import PhysicalDocumentSerializer


class CorrespondenceDocumentLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrespondenceDocumentLink
        fields = ["id", "correspondence", "document", "notes", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class CorrespondenceAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrespondenceAttachment
        fields = [
            "id",
            "correspondence",
            "file_name",
            "file_type",
            "file_size",
            "file_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
    
    def to_representation(self, instance):
        """Convert relative file URLs to absolute URLs when serializing."""
        data = super().to_representation(instance)
        if data.get('file_url') and not data['file_url'].startswith(('http://', 'https://', 'data:')):
            # If it's a relative path, convert to absolute URL
            from django.conf import settings
            request = self.context.get('request')
            file_url = data['file_url']
            
            # Ensure the path starts with /media/ (it should already, but handle edge cases)
            if not file_url.startswith('/media/'):
                # If it doesn't start with /media/, prepend MEDIA_URL
                media_path = file_url.lstrip('/')
                if not media_path.startswith('media/'):
                    media_path = f"media/{media_path}"
                file_url = f"{settings.MEDIA_URL.rstrip('/')}/{media_path}"
            
            # Priority 1: Use MEDIA_BASE_URL if set (for staging/production)
            if hasattr(settings, 'MEDIA_BASE_URL') and settings.MEDIA_BASE_URL:
                # Ensure file_url starts with /media/ (not /api/media/)
                if file_url.startswith('/api/media/'):
                    file_url = file_url.replace('/api/media/', '/media/')
                data['file_url'] = f"{settings.MEDIA_BASE_URL.rstrip('/')}{file_url}"
            elif request:
                try:
                    # Build absolute URL manually to avoid request path prefix issues
                    # request.build_absolute_uri might include /api/ prefix if request came through API
                    scheme = getattr(request, 'scheme', 'http')
                    host = request.get_host() if hasattr(request, 'get_host') else 'localhost:8002'
                    # Ensure file_url starts with /media/ (not /api/media/)
                    if file_url.startswith('/api/media/'):
                        file_url = file_url.replace('/api/media/', '/media/')
                    # Build URL directly without using build_absolute_uri to avoid path prefix issues
                    data['file_url'] = f"{scheme}://{host}{file_url}"
                except Exception:
                    # Fallback: use the request host directly
                    scheme = getattr(request, 'scheme', 'http')
                    host = request.get_host() if hasattr(request, 'get_host') else 'localhost:8002'
                    if file_url.startswith('/api/media/'):
                        file_url = file_url.replace('/api/media/', '/media/')
                    data['file_url'] = f"{scheme}://{host}{file_url}"
        return data


class CorrespondenceDistributionSerializer(serializers.ModelSerializer):
    directorate = serializers.PrimaryKeyRelatedField(
        queryset=Directorate.objects.all(), allow_null=True, required=False
    )
    office = serializers.PrimaryKeyRelatedField(
        queryset=Office.objects.all(), allow_null=True, required=False
    )
    division = serializers.PrimaryKeyRelatedField(queryset=Division.objects.all(), allow_null=True, required=False)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), allow_null=True, required=False)
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), allow_null=True, required=False
    )
    added_by = UserSerializer(read_only=True)
    directorate_name = serializers.CharField(source="directorate.name", read_only=True, allow_null=True, required=False)
    office_name = serializers.CharField(source="office.name", read_only=True, allow_null=True, required=False)
    division_name = serializers.CharField(source="division.name", read_only=True, allow_null=True, required=False)
    department_name = serializers.CharField(source="department.name", read_only=True, allow_null=True, required=False)
    user_name = serializers.CharField(source="user.name", read_only=True, allow_null=True, required=False)
    read_at = serializers.DateTimeField(read_only=True)
    read_by = UserSerializer(read_only=True)
    read_by_id = serializers.PrimaryKeyRelatedField(
        source="read_by",
        read_only=True,
    )
    added_by_id = serializers.PrimaryKeyRelatedField(
        source="added_by",
        queryset=CorrespondenceDistribution._meta.get_field("added_by").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    minute_id = serializers.PrimaryKeyRelatedField(
        source="minute",
        queryset=CorrespondenceDistribution._meta.get_field("minute").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    # Explicitly define is_active with default to ensure it's always set
    # This works better with DRF than relying on model defaults
    is_active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = CorrespondenceDistribution
        fields = [
            "id",
            "correspondence",
            "recipient_type",
            "directorate",
            "office",
            "division",
            "department",
            "user",
            "added_by",
            "added_by_id",
            "minute",
            "minute_id",
            "is_active",
            "purpose",
            "directorate_name",
            "office_name",
            "division_name",
            "department_name",
            "user_name",
            "read_at",
            "read_by",
            "read_by_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "added_by", "created_at", "updated_at", "read_at", "read_by"]


class MinuteSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=Minute._meta.get_field("user").remote_field.model.objects.all(),
        write_only=True,
    )
    mentions = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Minute._meta.get_field("mentions").remote_field.model.objects.all(),
        required=False,
    )

    from_office = serializers.PrimaryKeyRelatedField(read_only=True)
    from_office_id = serializers.PrimaryKeyRelatedField(
        source="from_office",
        queryset=Office.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    from_office_name = serializers.CharField(source="from_office.name", read_only=True)
    to_office = serializers.PrimaryKeyRelatedField(read_only=True)
    to_office_id = serializers.PrimaryKeyRelatedField(
        source="to_office",
        queryset=Office.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    to_office_name = serializers.CharField(source="to_office.name", read_only=True)
    to_user = serializers.PrimaryKeyRelatedField(read_only=True)
    to_user_id = serializers.PrimaryKeyRelatedField(
        source="to_user",
        queryset=Minute._meta.get_field("to_user").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    to_user_name = serializers.SerializerMethodField()
    
    # Delegation audit trail - who actually performed the action
    performed_by = UserSerializer(read_only=True)
    performed_by_name = serializers.SerializerMethodField()

    can_be_edited = serializers.SerializerMethodField()
    can_be_recalled = serializers.SerializerMethodField()
    is_dispatched = serializers.SerializerMethodField()
    is_acknowledged = serializers.SerializerMethodField()
    seal_data = serializers.SerializerMethodField()
    parent_minute_id = serializers.PrimaryKeyRelatedField(
        source="parent_minute",
        queryset=Minute.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    relates_to_minute_id = serializers.PrimaryKeyRelatedField(
        source="relates_to_minute",
        queryset=Minute.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    correspondence_details = serializers.SerializerMethodField()

    class Meta:
        model = Minute
        fields = [
            "id",
            "correspondence",
            "user",
            "user_id",
            "grade_level",
            "action_type",
            "minute_text",
            "direction",
            "step_number",
            "timestamp",
            "acted_by_secretary",
            "acted_by_assistant",
            "assistant_type",
            "performed_by",
            "performed_by_name",
            "read_at",
            "mentions",
            "signature_payload",
            "from_office",
            "from_office_id",
            "from_office_name",
            "to_office",
            "to_office_id",
            "to_office_name",
            "to_user",
            "to_user_id",
            "to_user_name",
            # Recall/Edit fields
            "is_edited",
            "edited_at",
            "edit_window_expires_at",
            "is_opened",
            "opened_at",
            "original_minute_text",
            "edit_history",
            "can_be_edited",
            "is_recalled",
            "recalled_at",
            "recall_reason",
            "can_be_recalled",
            # Per-minute dispatch/acknowledge lifecycle
            "is_dispatched",
            "dispatched_at",
            "is_acknowledged",
            "acknowledged_at",
            # Purpose-based routing
            "purpose",
            "requires_response",
            "response_deadline",
            # Parallel routing fields
            "routing_type",
            "parallel_group_id",
            "is_parallel_branch",
            "parent_minute",
            "parent_minute_id",
            "merge_strategy",
            "branch_originator",
            "branch_originator_id",
            "branch_originator_name",
            # Consultation routing fields
            "is_consultation",
            "consultation_from_branch",
            "consultation_from_branch_id",
            "consultation_to_branch",
            "consultation_to_branch_id",
            # Additional minutes/instructions
            "minute_type",
            "is_additional",
            "relates_to_minute",
            "relates_to_minute_id",
            # Digital seal (for executive approvals)
            "seal_applied",
            "seal_data",
            "correspondence_details",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "timestamp",
            "created_at",
            "updated_at",
            "from_office",
            "from_office_name",
            "to_office",
            "to_office_name",
            "to_user",
            "to_user_name",
            "is_edited",
            "edited_at",
            "edit_window_expires_at",
            "is_opened",
            "opened_at",
            "original_minute_text",
            "edit_history",
            "can_be_edited",
            "parent_minute",
            "relates_to_minute",
            "branch_originator",
            "consultation_from_branch",
            "consultation_to_branch",
            "seal_applied",
            "dispatched_at",
            "acknowledged_at",
        ]

    def get_can_be_edited(self, obj):
        """Check if minute can still be edited."""
        return obj.can_be_edited()

    def get_can_be_recalled(self, obj):
        """Check if minute can still be recalled."""
        return obj.can_be_recalled()

    def get_is_dispatched(self, obj):
        """Check if minute has been dispatched."""
        return obj.is_dispatched

    def get_is_acknowledged(self, obj):
        """Check if minute has been acknowledged."""
        return obj.is_acknowledged

    def get_to_user_name(self, obj):
        """Get the recipient user's name."""
        if obj.to_user:
            return obj.to_user.get_full_name() or obj.to_user.username
        return None
    
    def get_performed_by_name(self, obj):
        """Get the name of who actually performed this action (for delegation audit)."""
        if obj.performed_by:
            return obj.performed_by.get_full_name() or obj.performed_by.username
        return None
    
    branch_originator_name = serializers.SerializerMethodField()
    branch_originator_id = serializers.UUIDField(source="branch_originator.id", read_only=True, allow_null=True)
    consultation_from_branch_id = serializers.UUIDField(source="consultation_from_branch.id", read_only=True, allow_null=True)
    consultation_to_branch_id = serializers.UUIDField(source="consultation_to_branch.id", read_only=True, allow_null=True)
    
    def get_branch_originator_name(self, obj):
        """Get the branch originator's name."""
        if obj.branch_originator:
            return obj.branch_originator.get_full_name() or obj.branch_originator.username
        return None

    def get_correspondence_details(self, obj):
        """Get nested correspondence details for this minute."""
        if not obj.correspondence:
            return None
        correspondence = obj.correspondence
        return {
            "id": str(correspondence.id),
            "reference_number": correspondence.reference_number,
            "subject": correspondence.subject,
            "sender_name": correspondence.sender_name,
            "sender_organization": correspondence.sender_organization,
            "received_date": correspondence.received_date.isoformat() if correspondence.received_date else None,
            "priority": correspondence.priority,
            "status": correspondence.status,
        }

    def to_representation(self, instance):
        """Override to ensure signature_payload is preserved with full base64 data."""
        data = super().to_representation(instance)
        # Ensure signature_payload is returned as-is from the database (no URL conversion)
        if hasattr(instance, 'signature_payload') and instance.signature_payload:
            data['signature_payload'] = instance.signature_payload
        return data

    def get_seal_data(self, obj):
        """Get digital seal data if this minute has an executive seal applied."""
        if not obj.seal_applied:
            return None
        seal = obj.seal_applied
        request = self.context.get('request')
        
        # Get seal image URL (if generated and saved)
        seal_image_url = None
        if seal.seal_image:
            if request:
                seal_image_url = request.build_absolute_uri(seal.seal_image.url)
            else:
                from django.conf import settings
                base_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:8002')
                seal_image_url = f"{base_url}{seal.seal_image.url}"
        
        # Signature image: use proxy URL so it loads cross-origin (CORS-safe)
        signature_image_url = None
        if seal.signature_used and getattr(seal.signature_used, 'signature_image', None) and seal.signature_used.signature_image and request:
            signature_image_url = request.build_absolute_uri(
                f"/api/v1/accounts/seal/signature-image/{seal.serial_number}/"
            )
        
        return {
            "id": str(seal.id),
            "serial_number": seal.serial_number,
            "verification_url": seal.verification_url,
            "sealed_by": seal.sealed_by.get_full_name() or seal.sealed_by.username,
            "office_name": seal.office_name,
            "office_title": seal.office_title,
            "sealed_at": seal.sealed_at.isoformat() if seal.sealed_at else None,
            "is_valid": seal.is_valid,
            "seal_image_url": seal_image_url,
            "signature_image_url": signature_image_url,
        }


class DispatchRecordSerializer(serializers.ModelSerializer):
    dispatched_by = UserSerializer(read_only=True)
    dispatched_by_id = serializers.PrimaryKeyRelatedField(
        source="dispatched_by",
        queryset=User.objects.all(),
        write_only=True,
        required=False,
    )
    acknowledged_by = UserSerializer(read_only=True)
    acknowledged_by_id = serializers.PrimaryKeyRelatedField(
        source="acknowledged_by",
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = DispatchRecord
        fields = [
            "id",
            "correspondence",
            "dispatch_mode",
            "dispatched_date",
            "dispatched_by",
            "dispatched_by_id",
            "tracking_number",
            "courier_name",
            "recipient_name",
            "recipient_address",
            "acknowledged_date",
            "acknowledged_by",
            "acknowledged_by_id",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "correspondence", "dispatched_by", "acknowledged_by", "created_at"]


class CorrespondenceSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    created_by_id = serializers.PrimaryKeyRelatedField(
        source="created_by",
        queryset=Correspondence._meta.get_field("created_by").remote_field.model.objects.all(),
        write_only=True,
        required=False,
    )
    current_approver = UserSerializer(read_only=True)
    current_approver_id = serializers.PrimaryKeyRelatedField(
        source="current_approver",
        queryset=Correspondence._meta.get_field("current_approver").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    acting_appointment_id = serializers.PrimaryKeyRelatedField(
        source="acting_appointment", read_only=True
    )
    acting_original_approver_id = serializers.PrimaryKeyRelatedField(
        source="acting_original_approver", read_only=True
    )
    acting_principal_name = serializers.SerializerMethodField()
    is_acting_seat = serializers.SerializerMethodField()
    parent_correspondence = serializers.SerializerMethodField()
    parent_correspondence_id = serializers.PrimaryKeyRelatedField(
        source="parent_correspondence",
        queryset=Correspondence.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    case = serializers.SerializerMethodField()
    case_id = serializers.PrimaryKeyRelatedField(
        source="case",
        queryset=Case.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    division = serializers.PrimaryKeyRelatedField(queryset=Division.objects.all(), allow_null=True, required=False)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), allow_null=True, required=False)
    owning_office = serializers.PrimaryKeyRelatedField(queryset=Office.objects.all(), allow_null=True, required=False)
    current_office = serializers.PrimaryKeyRelatedField(queryset=Office.objects.all(), allow_null=True, required=False)
    owning_office_name = serializers.CharField(source="owning_office.name", read_only=True)
    current_office_name = serializers.CharField(source="current_office.name", read_only=True)
    attachments = CorrespondenceAttachmentSerializer(many=True, read_only=True)
    distribution = CorrespondenceDistributionSerializer(many=True, read_only=True)
    minutes = MinuteSerializer(many=True, read_only=True)
    # physical_documents = PhysicalDocumentSerializer(many=True, read_only=True)
    linked_document_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        source="linked_documents",
        queryset=Correspondence._meta.get_field("linked_documents").remote_field.model.objects.all(),
        required=False,
    )
    completion_package = serializers.SerializerMethodField()
    auto_created_document_id = serializers.SerializerMethodField()
    lifecycle_stages = serializers.SerializerMethodField()
    dispatch_records = DispatchRecordSerializer(many=True, read_only=True)
    # Routing concept metadata
    flow_type = serializers.SerializerMethodField()
    is_inward = serializers.SerializerMethodField()
    is_outward = serializers.SerializerMethodField()
    is_internal = serializers.SerializerMethodField()
    is_external = serializers.SerializerMethodField()
    routing_metadata = serializers.SerializerMethodField()
    parallel_branches = serializers.SerializerMethodField()
    is_read = serializers.BooleanField(read_only=True)

    def validate_reference_number(self, value):
        """
        Skip uniqueness validation for reference_number during creation.
        The view handles duplicate reference numbers by generating a new one.
        """
        # Allow empty or any value - uniqueness is handled in the view
        return value

    def validate_status(self, value):
        """Prevent invalid status transitions at the serializer level."""
        if self.instance and self.instance.status == 'completed' and value != 'completed':
            raise serializers.ValidationError("Cannot change status of a completed correspondence.")
        return value

    def validate(self, attrs):
        """Cross-field validation for correspondence."""
        direction = attrs.get('direction', getattr(self.instance, 'direction', None))
        source = attrs.get('source', getattr(self.instance, 'source', None))
        if direction == 'outward' and not source:
            raise serializers.ValidationError({"source": "Source is required for outward correspondence."})
        return attrs

    class Meta:
        model = Correspondence
        fields = [
            "id",
            "reference_number",
            "subject",
            "treatment_response",
            "body_html",
            "source",
            "received_date",
            "sender_name",
            "sender_organization",
            "sender_reference",
            "status",
            "priority",
            "document_type",
            "direction",
            "archive_level",
            "division",
            "department",
            "owning_office",
            "owning_office_name",
            "current_office",
            "current_office_name",
            "letter_date",
            "dispatch_date",
            "recipient_name",
            "remarks",
            "tags",
            "created_by",
            "created_by_id",
            "current_approver",
            "current_approver_id",
            "acting_appointment_id",
            "acting_original_approver_id",
            "acting_principal_name",
            "is_acting_seat",
            "linked_document_ids",
            "auto_created_document_id",
            "attachments",
            "distribution",
            "minutes",
            "completed_at",
            "acknowledged_date",
            "completion_package",
            "completion_summary_generated_at",
            "lifecycle_stages",
            "dispatch_records",
            # Parallel routing fields
            "workflow_state",
            "active_parallel_branches",
            "completed_parallel_branches",
            "parallel_branches",
            "parent_correspondence",
            "parent_correspondence_id",
            "case",
            "case_id",
            "has_physical_copy",
            # Routing concept metadata
            "flow_type",
            "is_inward",
            "is_outward",
            "is_internal",
            "is_external",
            "routing_metadata",
            "is_read",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "current_approver",
            "acting_appointment_id",
            "acting_original_approver_id",
            "acting_principal_name",
            "is_acting_seat",
            "attachments",
            "distribution",
            "minutes",
            "completed_at",
            "created_at",
            "updated_at",
            "owning_office_name",
            "current_office_name",
            "completion_package",
            "completion_summary_generated_at",
        ]

    def get_acting_principal_name(self, obj) -> str:
        principal = getattr(obj, "acting_original_approver", None)
        if not principal:
            return ""
        return principal.get_full_name() or principal.username

    def get_is_acting_seat(self, obj) -> bool:
        return bool(getattr(obj, "acting_appointment_id", None))

    def get_lifecycle_stages(self, obj):
        """Return lifecycle progress stages for the frontend progress bar."""
        return obj.lifecycle_stages

    def get_auto_created_document_id(self, obj):
        """Get the primary DMS document for this correspondence. Uses annotated value on list views."""
        auto_id = getattr(obj, '_auto_created_document_id', None)
        if auto_id:
            return str(auto_id)
        from correspondence.models import CorrespondenceDocumentLink

        auto_link = (
            CorrespondenceDocumentLink.objects.filter(
                correspondence=obj,
                notes__icontains="Auto-created from correspondence registration",
            )
            .select_related("document")
            .first()
        )
        if auto_link and auto_link.document:
            return str(auto_link.document.id)

        primary_link = (
            CorrespondenceDocumentLink.objects.filter(correspondence=obj)
            .select_related("document")
            .order_by("created_at")
            .first()
        )
        if primary_link and primary_link.document:
            return str(primary_link.document.id)
        return None

    def get_parent_correspondence(self, obj):
        """Return parent correspondence reference if exists."""
        if not obj.parent_correspondence:
            return None
        return {
            "id": str(obj.parent_correspondence.id),
            "reference_number": obj.parent_correspondence.reference_number,
            "subject": obj.parent_correspondence.subject,
        }

    def get_case(self, obj):
        """Return case reference if exists."""
        if not obj.case:
            return None
        return {
            "id": str(obj.case.id),
            "case_number": obj.case.case_number,
            "title": obj.case.title,
            "status": obj.case.status,
        }
    
    def get_completion_package(self, obj):
        document = getattr(obj, "completion_package", None)
        if not document:
            return None
        version = None
        # Check prefetched cache first (avoids N+1 query)
        prefetched = getattr(document, "_prefetched_objects_cache", {}).get("versions")
        if prefetched and len(prefetched) > 0:
            version = prefetched[0]
        # Fallback: check if versions were prefetched via completion_package__versions
        if version is None:
            prefetched_versions = getattr(obj, "_prefetched_objects_cache", {}).get("completion_package__versions")
            if prefetched_versions and len(prefetched_versions) > 0:
                version = prefetched_versions[0]
        # Last resort: query database (should be rare if prefetch is working)
        if version is None:
            version = document.versions.only("id", "file_url", "uploaded_at").order_by("-version_number").first()
        file_url = version.file_url if version else ""
        return {
            "document_id": str(document.id),
            "title": document.title,
            "file_url": file_url,
            "generated_at": (
                getattr(obj, "completion_summary_generated_at", None)
                or (version.uploaded_at if version else None)
            ),
        }
    
    # Routing concept metadata methods
    def get_flow_type(self, obj):
        """
        Get the flow type based on routing concept.
        Returns: 'inward-internal', 'inward-external', 'outward-internal', or 'outward-external'
        """
        return obj.get_flow_type()
    
    def get_is_inward(self, obj):
        """Check if correspondence is INWARD (coming INTO office)."""
        return obj.is_inward()
    
    def get_is_outward(self, obj):
        """Check if correspondence is OUTWARD (going OUT OF office)."""
        return obj.is_outward()
    
    def get_is_internal(self, obj):
        """Check if correspondence is INTERNAL (within NPA)."""
        return obj.is_internal()
    
    def get_is_external(self, obj):
        """Check if correspondence is EXTERNAL (outside NPA)."""
        return obj.is_external()
    
    def get_routing_metadata(self, obj):
        """
        Get routing metadata for the correspondence.
        Includes flow type, location hints, and routing information.
        """
        flow_type = obj.get_flow_type()
        return {
            "flow_type": flow_type,
            "is_inward": obj.is_inward(),
            "is_outward": obj.is_outward(),
            "is_internal": obj.is_internal(),
            "is_external": obj.is_external(),
            "should_appear_in_office_inbox": obj.should_appear_in_office_inbox(),
            "description": self._get_flow_type_description(flow_type),
        }
    
    def _get_flow_type_description(self, flow_type):
        """Get human-readable description of flow type."""
        descriptions = {
            "inward-internal": "Coming INTO office from another NPA office (minuted to you)",
            "inward-external": "Coming INTO office from external organization (physical copy received)",
            "outward-internal": "Going OUT OF office to another NPA office (you minute it out)",
            "outward-external": "Going OUT OF office to external organization (registered, printed, mailed)",
        }
        return descriptions.get(flow_type, "Unknown flow type")

    def get_parallel_branches(self, obj):
        """Detail-only: per-branch status for parallel routing + non-response handling."""
        view = self.context.get("view")
        action = getattr(view, "action", None)
        if action not in ("retrieve", "parallel_branches", "list_parallel_branches"):
            return None
        from django.utils import timezone

        from .models import Minute
        from organization.models import OfficeMembership

        minutes = (
            Minute.objects.filter(correspondence=obj, is_parallel_branch=True)
            .select_related("to_office", "to_user", "branch_originator")
            .order_by("timestamp")
        )

        top_level = []
        seen = set()
        for m in minutes:
            target = m.to_office_id or m.to_user_id
            if not target or target in seen:
                continue
            seen.add(target)
            top_level.append(m)

        now = timezone.now()
        branches = []
        for minute in top_level:
            if minute.to_user_id:
                recipient_acted = Minute.objects.filter(
                    correspondence=obj, user_id=minute.to_user_id, timestamp__gt=minute.timestamp
                ).exists()
                target_label = (
                    minute.to_user.get_full_name() or minute.to_user.username
                    if minute.to_user
                    else "Unknown"
                )
                target_kind = "user"
                target_id = minute.to_user_id
            elif minute.to_office_id:
                member_ids = list(
                    OfficeMembership.objects.filter(
                        office=minute.to_office, is_active=True
                    ).values_list("user_id", flat=True)
                )
                recipient_acted = (
                    Minute.objects.filter(
                        correspondence=obj,
                        user_id__in=member_ids,
                        timestamp__gt=minute.timestamp,
                    ).exists()
                    if member_ids
                    else False
                )
                target_label = minute.to_office.name if minute.to_office else "Unknown"
                target_kind = "office"
                target_id = minute.to_office_id
            else:
                continue

            force_completed = bool(minute.branch_completed_at)
            completed = (
                force_completed
                or recipient_acted
                or obj.status == Correspondence.Status.COMPLETED
            )
            overdue = bool(minute.response_deadline and minute.response_deadline < now and not completed)
            status = (
                "force_completed"
                if force_completed
                else "completed"
                if completed
                else "overdue"
                if overdue
                else "pending"
            )
            branches.append(
                {
                    "minute_id": str(minute.id),
                    "group_id": str(minute.parallel_group_id) if minute.parallel_group_id else None,
                    "target_kind": target_kind,
                    "target_id": target_id,
                    "target_label": target_label,
                    "status": status,
                    "deadline": minute.response_deadline.isoformat() if minute.response_deadline else None,
                    "branch_originator_id": str(minute.branch_originator_id)
                    if minute.branch_originator_id
                    else None,
                }
            )
        return branches



class ParallelRoutingGroupSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    created_by_id = serializers.PrimaryKeyRelatedField(
        source="created_by",
        queryset=ParallelRoutingGroup._meta.get_field("created_by").remote_field.model.objects.all(),
        write_only=True,
    )
    correspondence_id = serializers.PrimaryKeyRelatedField(
        source="correspondence",
        queryset=Correspondence.objects.all(),
        write_only=True,
    )

    class Meta:
        model = ParallelRoutingGroup
        fields = [
            "id",
            "correspondence",
            "correspondence_id",
            "created_by",
            "created_by_id",
            "merge_strategy",
            "is_complete",
            "completed_at",
            "total_branches",
            "completed_branches",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "is_complete",
            "completed_at",
            "created_at",
            "updated_at",
        ]


class DelegationSerializer(serializers.ModelSerializer):
    principal = UserSerializer(read_only=True)
    principal_id = serializers.PrimaryKeyRelatedField(
        source="principal",
        queryset=Delegation._meta.get_field("principal").remote_field.model.objects.all(),
        write_only=True,
    )
    assistant = UserSerializer(read_only=True)
    assistant_id = serializers.PrimaryKeyRelatedField(
        source="assistant",
        queryset=Delegation._meta.get_field("assistant").remote_field.model.objects.all(),
        write_only=True,
    )

    class Meta:
        model = Delegation
        fields = [
            "id",
            "principal",
            "principal_id",
            "assistant",
            "assistant_id",
            "can_approve",
            "can_minute",
            "can_forward",
            "active",
            "starts_at",
            "ends_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "principal", "assistant", "created_at", "updated_at"]


class CorrespondenceDelegationSerializer(serializers.ModelSerializer):
    """Serializer for per-correspondence delegations."""
    
    principal = UserSerializer(read_only=True)
    principal_id = serializers.PrimaryKeyRelatedField(
        source="principal",
        queryset=CorrespondenceDelegation._meta.get_field("principal").remote_field.model.objects.all(),
        write_only=True,
    )
    assistant = UserSerializer(read_only=True)
    assistant_id = serializers.PrimaryKeyRelatedField(
        source="assistant",
        queryset=CorrespondenceDelegation._meta.get_field("assistant").remote_field.model.objects.all(),
        write_only=True,
    )
    correspondence_id = serializers.PrimaryKeyRelatedField(
        source="correspondence",
        queryset=Correspondence.objects.all(),
        write_only=True,
    )
    correspondence = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = CorrespondenceDelegation
        fields = [
            "id",
            "correspondence",
            "correspondence_id",
            "principal",
            "principal_id",
            "assistant",
            "assistant_id",
            "delegation",
            "notes",
            "status",
            "delegated_at",
            "expires_at",
            "completed_at",
            "revoked_at",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "correspondence", "principal", "assistant",
            "delegated_at", "completed_at", "revoked_at",
            "created_at", "updated_at", "is_active",
        ]
        # Disable automatic unique constraint validation - we handle this in the viewset
        # by revoking existing active delegations before creating new ones
        extra_kwargs = {
            "notes": {"required": False, "allow_blank": True},
        }
    
    def get_validators(self):
        """Remove default unique constraint validators - handled in viewset."""
        # Return empty list - we handle uniqueness in the viewset by revoking
        # existing active delegations before creating new ones
        return []
    
    def get_correspondence(self, obj):
        """Return basic correspondence info."""
        return {
            "id": str(obj.correspondence.id),
            "reference_number": obj.correspondence.reference_number,
            "subject": obj.correspondence.subject,
            "status": obj.correspondence.status,
            "priority": obj.correspondence.priority,
        }
    
    def get_is_active(self, obj):
        """Check if delegation is still active."""
        return obj.is_active()


# =============================================================================
# CASE/FILE MANAGEMENT SERIALIZERS
# =============================================================================

class CaseCorrespondenceLinkSerializer(serializers.ModelSerializer):
    correspondence = CorrespondenceSerializer(read_only=True)
    correspondence_id = serializers.PrimaryKeyRelatedField(
        source="correspondence",
        queryset=Correspondence.objects.all(),
        write_only=True,
    )
    
    class Meta:
        model = CaseCorrespondenceLink
        fields = ["id", "case", "correspondence", "correspondence_id", "is_primary", "notes", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class CaseDocumentLinkSerializer(serializers.ModelSerializer):
    document_id = serializers.SerializerMethodField()
    document_title = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseDocumentLink
        fields = ["id", "case", "document_id", "document_title", "notes", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
    
    def get_document_id(self, obj):
        """Get document ID, handling soft-deleted documents."""
        if obj.document:
            return str(obj.document.id)
        return None
    
    def get_document_title(self, obj):
        """Get document title, handling soft-deleted documents."""
        if obj.document:
            return obj.document.title
        return None


class CaseFormLinkSerializer(serializers.ModelSerializer):
    form_document_id = serializers.SerializerMethodField()
    form_title = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseFormLink
        fields = ["id", "case", "form_document_id", "form_title", "notes", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
    
    def get_form_document_id(self, obj):
        """Get form document ID, handling soft-deleted documents."""
        if obj.form_document and obj.form_document.document:
            return str(obj.form_document.document.id)
        return None
    
    def get_form_title(self, obj):
        """Get form title, handling soft-deleted documents."""
        if obj.form_document and obj.form_document.document:
            return obj.form_document.document.title
        return None


class CaseTemplateSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    case_type_display = serializers.CharField(source="get_case_type_display", read_only=True)
    
    class Meta:
        model = CaseTemplate
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "case_type",
            "case_type_display",
            "is_active",
            "default_priority",
            "structure",
            "created_by",
            "usage_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "usage_count", "created_at", "updated_at"]


class CaseCommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    mentions = UserSerializer(many=True, read_only=True)
    resolved_by = UserSerializer(read_only=True)
    replies_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseComment
        fields = [
            "id",
            "case",
            "author",
            "content",
            "parent",
            "mentions",
            "is_resolved",
            "resolved_at",
            "resolved_by",
            "replies_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]
    
    def get_replies_count(self, obj):
        return obj.replies.count()


class CaseSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    created_by_id = serializers.PrimaryKeyRelatedField(
        source="created_by",
        queryset=Case._meta.get_field("created_by").remote_field.model.objects.all(),
        write_only=True,
        required=False,
    )
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=Case._meta.get_field("assigned_to").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    division = serializers.PrimaryKeyRelatedField(queryset=Division.objects.all(), allow_null=True, required=False)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), allow_null=True, required=False)
    owning_office = serializers.PrimaryKeyRelatedField(queryset=Office.objects.all(), allow_null=True, required=False)
    current_office = serializers.PrimaryKeyRelatedField(queryset=Office.objects.all(), allow_null=True, required=False)
    completion_package = serializers.SerializerMethodField()
    
    # Related items (read-only)
    correspondence_count = serializers.SerializerMethodField()
    documents_count = serializers.SerializerMethodField()
    forms_count = serializers.SerializerMethodField()
    activities_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = [
            "id",
            "case_number",
            "title",
            "description",
            "case_type",
            "status",
            "priority",
            "division",
            "department",
            "owning_office",
            "current_office",
            "created_by",
            "created_by_id",
            "assigned_to",
            "assigned_to_id",
            "opened_at",
            "resolved_at",
            "closed_at",
            "tags",
            "metadata",
            "completion_package",
            "completion_package_generated_at",
            "correspondence_count",
            "documents_count",
            "forms_count",
            "activities_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "case_number",
            "created_by",
            "assigned_to",
            "opened_at",
            "resolved_at",
            "closed_at",
            "completion_package",
            "completion_package_generated_at",
            "correspondence_count",
            "documents_count",
            "forms_count",
            "activities_count",
            "created_at",
            "updated_at",
        ]
    
    def get_completion_package(self, obj):
        """Return completion package document info if exists."""
        if not obj.completion_package:
            return None
        return {
            "id": str(obj.completion_package.id),
            "title": obj.completion_package.title,
            "file_url": obj.completion_package.versions.first().file_url if obj.completion_package.versions.exists() else None,
        }
    
    def get_correspondence_count(self, obj):
        """Get count of related correspondence."""
        return obj.correspondence.count()
    
    def get_documents_count(self, obj):
        """Get count of related documents."""
        return obj.document_links.count()
    
    def get_forms_count(self, obj):
        """Get count of related forms."""
        return obj.form_links.count()
    
    def get_activities_count(self, obj):
        """Get count of related activities."""
        return obj.get_all_activities().count()


class CaseDetailSerializer(CaseSerializer):
    """Extended serializer with full related items."""
    correspondence = CaseCorrespondenceLinkSerializer(many=True, read_only=True, source="correspondence_links")
    documents = CaseDocumentLinkSerializer(many=True, read_only=True, source="document_links")
    forms = CaseFormLinkSerializer(many=True, read_only=True, source="form_links")
    activities = serializers.SerializerMethodField()
    
    class Meta(CaseSerializer.Meta):
        fields = CaseSerializer.Meta.fields + ["correspondence", "documents", "forms", "activities"]
    
    def get_activities(self, obj):
        """Get all activities (minutes) related to this case."""
        from correspondence.serializers import MinuteSerializer
        activities = obj.get_all_activities()
        return MinuteSerializer(activities, many=True).data


class CaseWorkflowRuleSerializer(serializers.ModelSerializer):
    case_type_display = serializers.CharField(source="get_case_type_display", read_only=True)
    trigger_type_display = serializers.CharField(source="get_trigger_type_display", read_only=True)
    action_type_display = serializers.CharField(source="get_action_type_display", read_only=True)
    
    class Meta:
        model = CaseWorkflowRule
        fields = [
            "id",
            "name",
            "description",
            "case_type",
            "case_type_display",
            "priority",
            "trigger_type",
            "trigger_type_display",
            "trigger_conditions",
            "action_type",
            "action_type_display",
            "action_config",
            "is_active",
            "priority_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CaseSLASerializer(serializers.ModelSerializer):
    case = CaseSerializer(read_only=True)
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseSLA
        fields = [
            "id",
            "case",
            "target_days",
            "target_date",
            "warning_threshold_percent",
            "critical_threshold_percent",
            "warning_sent",
            "critical_sent",
            "breached",
            "breached_at",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]
    
    def get_status(self, obj):
        return obj.check_status()


class CorrespondenceTemplateSerializer(serializers.ModelSerializer):
    """Serializer for correspondence/minute content templates."""
    
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    
    class Meta:
        model = CorrespondenceTemplate
        fields = [
            "id",
            "title",
            "description",
            "scope",
            "scope_id",
            "template_type",
            "action_type",
            "content_html",
            "content_text",
            "is_default",
            "is_active",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "updated_by", "created_at", "updated_at"]


class CorrespondenceDraftSerializer(serializers.ModelSerializer):
    """Serializer for correspondence drafts."""
    
    user = UserSerializer(read_only=True)
    correspondence_id = serializers.PrimaryKeyRelatedField(
        source="correspondence",
        queryset=Correspondence.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    correspondence = serializers.SerializerMethodField()
    
    class Meta:
        model = CorrespondenceDraft
        fields = [
            "id",
            "correspondence",
            "correspondence_id",
            "user",
            "draft_type",
            "content",
            "subject",
            "form_data",
            "forward_to",
            "on_behalf_of",
            "action_type",
            "files_metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "correspondence", "created_at", "updated_at"]
    
    def get_correspondence(self, obj):
        """Return minimal correspondence info."""
        if obj.correspondence is None:
            return None
        return {
            "id": str(obj.correspondence.id),
            "reference_number": obj.correspondence.reference_number,
            "subject": obj.correspondence.subject,
        }

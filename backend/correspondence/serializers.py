"""Serializers for correspondence workflows."""

from __future__ import annotations

from rest_framework import serializers

from accounts.serializers import UserSerializer
from organization.models import Department, Division, Directorate, Office

from .models import (
    Correspondence,
    CorrespondenceAttachment,
    CorrespondenceDelegation,
    CorrespondenceDistribution,
    CorrespondenceDocumentLink,
    Delegation,
    Minute,
    ParallelRoutingGroup,
)


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
    division = serializers.PrimaryKeyRelatedField(queryset=Division.objects.all(), allow_null=True, required=False)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), allow_null=True, required=False)
    added_by = UserSerializer(read_only=True)
    directorate_name = serializers.CharField(source="directorate.name", read_only=True, allow_null=True, required=False)
    division_name = serializers.CharField(source="division.name", read_only=True, allow_null=True, required=False)
    department_name = serializers.CharField(source="department.name", read_only=True, allow_null=True, required=False)
    added_by_id = serializers.PrimaryKeyRelatedField(
        source="added_by",
        queryset=CorrespondenceDistribution._meta.get_field("added_by").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = CorrespondenceDistribution
        fields = [
            "id",
            "correspondence",
            "recipient_type",
            "directorate",
            "division",
            "department",
            "added_by",
            "added_by_id",
            "purpose",
            "directorate_name",
            "division_name",
            "department_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "added_by", "created_at", "updated_at"]


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
        ]

    def get_can_be_edited(self, obj):
        """Check if minute can still be edited."""
        return obj.can_be_edited()

    def get_can_be_recalled(self, obj):
        """Check if minute can still be recalled."""
        return obj.can_be_recalled()

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
        
        # Get signature image URL from the signature used to create the seal
        signature_image_url = None
        if seal.signature_used and seal.signature_used.signature_image:
            if request:
                signature_image_url = request.build_absolute_uri(seal.signature_used.signature_image.url)
            else:
                from django.conf import settings
                base_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:8002')
                signature_image_url = f"{base_url}{seal.signature_used.signature_image.url}"
        
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
    division = serializers.PrimaryKeyRelatedField(queryset=Division.objects.all(), allow_null=True, required=False)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), allow_null=True, required=False)
    owning_office = serializers.PrimaryKeyRelatedField(queryset=Office.objects.all(), allow_null=True, required=False)
    current_office = serializers.PrimaryKeyRelatedField(queryset=Office.objects.all(), allow_null=True, required=False)
    owning_office_name = serializers.CharField(source="owning_office.name", read_only=True)
    current_office_name = serializers.CharField(source="current_office.name", read_only=True)
    attachments = CorrespondenceAttachmentSerializer(many=True, read_only=True)
    distribution = CorrespondenceDistributionSerializer(many=True, read_only=True)
    minutes = MinuteSerializer(many=True, read_only=True)
    linked_document_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        source="linked_documents",
        queryset=Correspondence._meta.get_field("linked_documents").remote_field.model.objects.all(),
        required=False,
    )
    completion_package = serializers.SerializerMethodField()

    class Meta:
        model = Correspondence
        fields = [
            "id",
            "reference_number",
            "subject",
            "summary",
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
            "linked_document_ids",
            "attachments",
            "distribution",
            "minutes",
            "completed_at",
            "completion_package",
            "completion_summary_generated_at",
            # Parallel routing fields
            "workflow_state",
            "active_parallel_branches",
            "completed_parallel_branches",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "current_approver",
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

    def get_completion_package(self, obj):
        document = getattr(obj, "completion_package", None)
        if not document:
            return None
        version = None
        prefetched = getattr(document, "_prefetched_objects_cache", {}).get("versions")
        if prefetched:
            version = prefetched[0]
        if version is None:
            version = document.versions.order_by("-version_number").first()
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


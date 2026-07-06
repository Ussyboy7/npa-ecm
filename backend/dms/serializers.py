"""Serializers for the document management system."""

from __future__ import annotations

from rest_framework import serializers

from accounts.serializers import UserSerializer
from organization.models import Department, Division

from .models import (
    Document,
    DocumentAccessLog,
    DocumentCollection,
    DocumentComment,
    DocumentDiscussionMessage,
    DocumentEditorSession,
    DocumentPermission,
    DocumentRightsPolicy,
    DocumentTemplate,
    DocumentVersion,
    DocumentWorkspace,
    FormDocument,
)


class DocumentWorkspaceSerializer(serializers.ModelSerializer):
    member_ids = serializers.PrimaryKeyRelatedField(
        source="members",
        many=True,
        queryset=DocumentWorkspace._meta.get_field("members").remote_field.model.objects.all(),
        required=False,
    )
    slug = serializers.SlugField(required=False, allow_blank=True, allow_null=True)
    document_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = DocumentWorkspace
        fields = ["id", "slug", "name", "description", "color", "member_ids", "created_at", "updated_at", "document_count"]
        read_only_fields = ["id", "created_at", "updated_at", "document_count"]


class DocumentVersionSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    uploaded_by_id = serializers.PrimaryKeyRelatedField(
        source="uploaded_by",
        queryset=DocumentVersion._meta.get_field("uploaded_by").remote_field.model.objects.all(),
        write_only=True,
        required=False,
    )
    # Override file_url to allow data URLs (which are longer than 200 chars)
    # The view will convert data URLs to proper file URLs before saving
    file_url = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=None)
    
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
                    host = request.get_host() if hasattr(request, 'get_host') else 'localhost:8000'
                    # Ensure file_url starts with /media/ (not /api/media/)
                    if file_url.startswith('/api/media/'):
                        file_url = file_url.replace('/api/media/', '/media/')
                    # Build URL directly without using build_absolute_uri to avoid path prefix issues
                    data['file_url'] = f"{scheme}://{host}{file_url}"
                except Exception:
                    # Fallback: use the request host directly
                    scheme = getattr(request, 'scheme', 'http')
                    host = request.get_host() if hasattr(request, 'get_host') else 'localhost:8000'
                    if file_url.startswith('/api/media/'):
                        file_url = file_url.replace('/api/media/', '/media/')
                    data['file_url'] = f"{scheme}://{host}{file_url}"
        return data

    class Meta:
        model = DocumentVersion
        fields = [
            "id",
            "document",
            "version_number",
            "file_name",
            "file_type",
            "file_size",
            "file_url",
            "content_html",
            "content_json",
            "content_text",
            "ocr_text",
            "summary",
            "uploaded_by",
            "uploaded_by_id",
            "uploaded_at",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "version_number",
            "uploaded_by",
            "uploaded_at",
            "content_text",
            "summary",
            "created_at",
            "updated_at",
        ]


class DocumentPermissionSerializer(serializers.ModelSerializer):
    division_ids = serializers.PrimaryKeyRelatedField(
        source="divisions",
        many=True,
        queryset=Division.objects.all(),
        required=False,
    )
    department_ids = serializers.PrimaryKeyRelatedField(
        source="departments",
        many=True,
        queryset=Department.objects.all(),
        required=False,
    )
    user_ids = serializers.PrimaryKeyRelatedField(
        source="users",
        many=True,
        queryset=DocumentPermission._meta.get_field("users").remote_field.model.objects.all(),
        required=False,
    )

    class Meta:
        model = DocumentPermission
        fields = [
            "id",
            "document",
            "access",
            "note",
            "division_ids",
            "department_ids",
            "grade_levels",
            "user_ids",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DocumentRightsPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentRightsPolicy
        fields = [
            "id",
            "name",
            "description",
            "allow_download",
            "allow_print",
            "allow_external_share",
            "view_only",
            "watermark_text",
            "expires_after_days",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DocumentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        source="author",
        queryset=Document._meta.get_field("author").remote_field.model.objects.all(),
        write_only=True,
        required=False,
    )
    division = serializers.PrimaryKeyRelatedField(queryset=Division.objects.all(), allow_null=True, required=False)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), allow_null=True, required=False)
    versions = DocumentVersionSerializer(many=True, read_only=True)
    permissions = DocumentPermissionSerializer(many=True, read_only=True)
    workspace_ids = serializers.PrimaryKeyRelatedField(
        source="workspaces",
        many=True,
        queryset=DocumentWorkspace.objects.all(),
        required=False,
        allow_empty=True,
    )
    form_document = serializers.SerializerMethodField()
    case_links = serializers.SerializerMethodField()
    parent_document = serializers.SerializerMethodField()
    parent_document_id = serializers.PrimaryKeyRelatedField(
        source="parent_document",
        queryset=Document.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    drm_policy_id = serializers.PrimaryKeyRelatedField(
        source="drm_policy",
        queryset=DocumentRightsPolicy.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    drm_rights = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "description",
            "document_type",
            "reference_number",
            "status",
            "sensitivity",
            "author",
            "author_id",
            "division",
            "department",
            "tags",
            "workspace_ids",
            "versions",
            "permissions",
            "form_document",
            "case_links",
            "parent_document",
            "parent_document_id",
            "drm_policy_id",
            "drm_rights",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "versions", "permissions", "form_document", "case_links", "parent_document", "drm_rights", "created_at", "updated_at"]

    def get_drm_rights(self, obj):
        from .drm import resolve_document_rights

        request = self.context.get("request")
        user = request.user if request else None
        return resolve_document_rights(obj, user)

    def get_parent_document(self, obj):
        """Get parent document data if this is a response document."""
        if obj.parent_document:
            return {
                "id": str(obj.parent_document.id),
                "title": obj.parent_document.title,
                "reference_number": obj.parent_document.reference_number or "",
            }
        return None

    def get_form_document(self, obj):
        """Get FormDocument data if this is a form document."""
        if hasattr(obj, "form_document") and obj.form_document:
            # Use a minimal serializer to avoid circular reference
            form_doc = obj.form_document
            return {
                "id": str(form_doc.id),
                "template": {
                    "id": str(form_doc.template.id) if form_doc.template else None,
                    "name": form_doc.template.name if form_doc.template else None,
                    "slug": form_doc.template.slug if form_doc.template else None,
                } if form_doc.template else None,
                "form_data": form_doc.form_data,
                "status": form_doc.status,
                "signature_workflow": {
                    "id": str(form_doc.signature_workflow.id),
                    "status": form_doc.signature_workflow.status,
                } if form_doc.signature_workflow else None,
                "correspondence": {
                    "id": str(form_doc.correspondence.id),
                    "reference_number": form_doc.correspondence.reference_number,
                } if form_doc.correspondence else None,
                "created_at": form_doc.created_at.isoformat() if form_doc.created_at else None,
                "updated_at": form_doc.updated_at.isoformat() if form_doc.updated_at else None,
            }
        return None

    def get_case_links(self, obj):
        """Get case links for this document."""
        from correspondence.models import CaseDocumentLink
        links = CaseDocumentLink.objects.filter(document=obj).select_related('case')
        return [
            {
                "id": str(link.id),
                "case": {
                    "id": str(link.case.id),
                    "caseNumber": link.case.case_number,
                    "title": link.case.title,
                    "status": link.case.status,
                },
                "notes": link.notes or "",
            }
            for link in links
        ]


class DocumentCommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        source="author",
        queryset=DocumentComment._meta.get_field("author").remote_field.model.objects.all(),
        write_only=True,
    )

    class Meta:
        model = DocumentComment
        fields = [
            "id",
            "document",
            "version",
            "parent",
            "author",
            "author_id",
            "content",
            "resolved",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]


class DocumentDiscussionMessageSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        source="author",
        queryset=DocumentDiscussionMessage._meta.get_field("author").remote_field.model.objects.all(),
        write_only=True,
    )

    class Meta:
        model = DocumentDiscussionMessage
        fields = [
            "id",
            "document",
            "author",
            "author_id",
            "message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]


class DocumentAccessLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=DocumentAccessLog._meta.get_field("user").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = DocumentAccessLog
        fields = [
            "id",
            "document",
            "user",
            "user_id",
            "action",
            "sensitivity",
            "timestamp",
        ]
        read_only_fields = ["id", "user", "timestamp"]


class DocumentEditorSessionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=DocumentEditorSession._meta.get_field("user").remote_field.model.objects.all(),
        write_only=True,
        required=False,  # Not required since view uses request.user
    )

    class Meta:
        model = DocumentEditorSession
        fields = [
            "id",
            "document",
            "user",
            "user_id",
            "since",
            "note",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "since", "created_at", "updated_at"]


class FormDocumentSerializer(serializers.ModelSerializer):
    """Serializer for FormDocument - extends DMS Document with form-specific data."""
    
    # Use a minimal document representation to avoid circular reference
    document = serializers.SerializerMethodField()
    document_id = serializers.PrimaryKeyRelatedField(
        source="document",
        queryset=Document.objects.all(),
        write_only=True,
        required=False,
    )
    
    # Use UUIDField to avoid queryset issues with circular imports
    template_id = serializers.UUIDField(
        source="template.id",
        write_only=True,
        required=False,
        allow_null=True,
    )
    signature_workflow_id = serializers.UUIDField(
        source="signature_workflow.id",
        write_only=True,
        required=False,
        allow_null=True,
    )
    correspondence_id = serializers.UUIDField(
        source="correspondence.id",
        write_only=True,
        required=False,
        allow_null=True,
    )
    
    template = serializers.SerializerMethodField()
    signature_workflow = serializers.SerializerMethodField()
    correspondence = serializers.SerializerMethodField()

    def get_document(self, obj):
        """Get document data including versions and case links."""
        if obj.document:
            # Serialize versions using DocumentVersionSerializer
            # Django will use prefetched data if available, otherwise it will query
            versions = obj.document.versions.all()
            version_serializer = DocumentVersionSerializer(versions, many=True, context=self.context)
            
            # Get case links
            from correspondence.models import CaseDocumentLink
            case_links = CaseDocumentLink.objects.filter(document=obj.document).select_related('case')
            case_links_data = [
                {
                    "id": str(link.id),
                    "case": {
                        "id": str(link.case.id),
                        "caseNumber": link.case.case_number,
                        "title": link.case.title,
                        "status": link.case.status,
                    },
                    "notes": link.notes or "",
                }
                for link in case_links
            ]
            
            return {
                "id": str(obj.document.id),
                "title": obj.document.title,
                "description": obj.document.description,
                "document_type": obj.document.document_type,
                "status": obj.document.status,
                "reference_number": obj.document.reference_number,
                "versions": version_serializer.data,  # Always return a list, even if empty
                "case_links": case_links_data,
            }
        return None

    def get_template(self, obj):
        if obj.template:
            return {"id": str(obj.template.id), "name": obj.template.name, "slug": obj.template.slug}
        return None
    
    def get_signature_workflow(self, obj):
        if obj.signature_workflow:
            return {"id": str(obj.signature_workflow.id), "status": obj.signature_workflow.status}
        return None
    
    def get_correspondence(self, obj):
        if obj.correspondence:
            return {"id": str(obj.correspondence.id), "reference_number": obj.correspondence.reference_number}
        return None

    def create(self, validated_data):
        """Create FormDocument with proper foreign key handling."""
        # Get document from validated_data (set by view's create method)
        document = validated_data.get("document")
        if not document:
            # Try to get from document_id if document not set
            document_id = self.initial_data.get("document_id")
            if document_id:
                document = Document.objects.get(id=document_id)
            else:
                raise serializers.ValidationError({"document_id": "Document is required"})
        
        # Handle template_id from initial_data
        template_id = self.initial_data.get("template_id")
        
        # Handle signature_workflow_id
        workflow_id = self.initial_data.get("signature_workflow_id")
        
        # Handle correspondence_id
        correspondence_id = self.initial_data.get("correspondence_id")
        
        # Create FormDocument
        form_doc = FormDocument.objects.create(
            document=document,
            form_data=validated_data.get("form_data", {}),
            status=validated_data.get("status", FormDocument.FormStatus.DRAFT),
        )
        
        # Set foreign keys
        if template_id:
            from forms.models import FormTemplate
            form_doc.template = FormTemplate.objects.get(id=template_id)
        if workflow_id:
            from forms.signature_models import FormSignatureWorkflow
            form_doc.signature_workflow = FormSignatureWorkflow.objects.get(id=workflow_id)
        if correspondence_id:
            from correspondence.models import Correspondence
            form_doc.correspondence = Correspondence.objects.get(id=correspondence_id)
        
        form_doc.save()
        return form_doc
    
    def update(self, instance, validated_data):
        """Update FormDocument with proper foreign key handling."""
        # Handle template_id
        if "template_id" in self.initial_data:
            template_id = self.initial_data.get("template_id")
            if template_id:
                from forms.models import FormTemplate
                instance.template = FormTemplate.objects.get(id=template_id)
            else:
                instance.template = None
        
        # Handle signature_workflow_id
        if "signature_workflow_id" in self.initial_data:
            workflow_id = self.initial_data.get("signature_workflow_id")
            if workflow_id:
                from forms.signature_models import FormSignatureWorkflow
                instance.signature_workflow = FormSignatureWorkflow.objects.get(id=workflow_id)
            else:
                instance.signature_workflow = None
        
        # Handle correspondence_id
        if "correspondence_id" in self.initial_data:
            correspondence_id = self.initial_data.get("correspondence_id")
            if correspondence_id:
                from correspondence.models import Correspondence
                instance.correspondence = Correspondence.objects.get(id=correspondence_id)
            else:
                instance.correspondence = None
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

    class Meta:
        model = FormDocument
        fields = [
            "id",
            "document",
            "document_id",
            "template",
            "template_id",
            "form_data",
            "status",
            "signature_workflow",
            "signature_workflow_id",
            "correspondence",
            "correspondence_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "document", "template", "signature_workflow", "correspondence", "created_at", "updated_at"]


class DocumentCollectionSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    owner_id = serializers.PrimaryKeyRelatedField(
        source="owner",
        queryset=DocumentCollection._meta.get_field("owner").remote_field.model.objects.all(),
        write_only=True,
        required=False,
    )
    document_ids = serializers.PrimaryKeyRelatedField(
        source="documents",
        many=True,
        queryset=Document.objects.all(),
        required=False,
    )
    member_ids = serializers.PrimaryKeyRelatedField(
        source="members",
        many=True,
        queryset=DocumentCollection._meta.get_field("members").remote_field.model.objects.all(),
        required=False,
    )
    documents = DocumentSerializer(many=True, read_only=True)
    document_count = serializers.SerializerMethodField()

    def get_document_count(self, obj):
        return obj.documents.count()

    class Meta:
        model = DocumentCollection
        fields = [
            "id",
            "name",
            "description",
            "owner",
            "owner_id",
            "document_ids",
            "documents",
            "document_count",
            "member_ids",
            "members",
            "is_public",
            "is_deleted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner", "documents", "members", "created_at", "updated_at"]


class DocumentTemplateSerializer(serializers.ModelSerializer):
    """Serializer for document templates."""
    created_by = UserSerializer(read_only=True)
    created_by_id = serializers.PrimaryKeyRelatedField(
        source="created_by",
        queryset=DocumentTemplate._meta.get_field("created_by").remote_field.model.objects.all(),
        write_only=True,
        required=False,
    )
    default_division = serializers.PrimaryKeyRelatedField(
        queryset=Division.objects.all(),
        allow_null=True,
        required=False,
    )
    default_department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = DocumentTemplate
        fields = [
            "id",
            "name",
            "description",
            "document_type",
            "default_status",
            "default_sensitivity",
            "default_division",
            "default_department",
            "default_tags",
            "template_content",
            "template_metadata",
            "is_active",
            "created_by",
            "created_by_id",
            "usage_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "usage_count", "created_at", "updated_at"]

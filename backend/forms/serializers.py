"""Serializers for forms app."""

from rest_framework import serializers
from accounts.serializers import UserSerializer
from forms.models import FormTemplate, FormSubmission


class FormTemplateSerializer(serializers.ModelSerializer):
    """Serializer for FormTemplate."""

    created_by = UserSerializer(read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = FormTemplate
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category",
            "category_display",
            "is_active",
            "structure",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by"]


class FormSubmissionSerializer(serializers.ModelSerializer):
    """Serializer for FormSubmission."""

    template = FormTemplateSerializer(read_only=True)
    template_id = serializers.UUIDField(write_only=True, required=False)
    correspondence_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    submitted_by = UserSerializer(read_only=True)

    class Meta:
        model = FormSubmission
        fields = [
            "id",
            "template",
            "template_id",
            "correspondence",
            "correspondence_id",
            "data",
            "is_draft",
            "submitted_at",
            "submitted_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "submitted_at", "submitted_by"]

    def create(self, validated_data):
        from django.utils import timezone
        
        template_id = validated_data.pop("template_id", None)
        correspondence_id = validated_data.pop("correspondence_id", None)
        
        if template_id:
            validated_data["template_id"] = template_id
        if correspondence_id:
            validated_data["correspondence_id"] = correspondence_id
        
        # Set submitted_by from request user if available
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            validated_data["submitted_by"] = request.user
        
        # If is_draft is False, set submitted_at
        is_draft = validated_data.get("is_draft", True)
        if not is_draft:
            validated_data["submitted_at"] = timezone.now()
        
        return super().create(validated_data)


class FormSubmissionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing form submissions."""

    template_name = serializers.CharField(source="template.name", read_only=True)
    template_category = serializers.CharField(source="template.category", read_only=True)
    submitted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FormSubmission
        fields = [
            "id",
            "template_name",
            "template_category",
            "is_draft",
            "submitted_at",
            "submitted_by_name",
            "created_at",
        ]

    def get_submitted_by_name(self, obj):
        if obj.submitted_by:
            return obj.submitted_by.get_full_name() or obj.submitted_by.email
        return None


"""Serializers for the accounts application."""

from rest_framework import serializers

from organization.models import Department, Directorate, Division, Role

from .models import User, ExecutiveSignature, DocumentSeal


class UserSerializer(serializers.ModelSerializer):
    directorate = serializers.PrimaryKeyRelatedField(
        queryset=Directorate.objects.all(), allow_null=True, required=False
    )
    division = serializers.PrimaryKeyRelatedField(
        queryset=Division.objects.select_related("directorate"), allow_null=True, required=False
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.select_related("division", "division__directorate"), allow_null=True, required=False
    )
    system_role = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(), allow_null=True, required=False
    )
    system_role_name = serializers.SerializerMethodField()
    directorate_name = serializers.SerializerMethodField()
    division_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    
    def get_system_role_name(self, obj):
        return obj.system_role.name if obj.system_role else ""
    
    def get_directorate_name(self, obj):
        return obj.directorate.name if obj.directorate else ""
    
    def get_division_name(self, obj):
        return obj.division.name if obj.division else ""
    
    def get_department_name(self, obj):
        return obj.department.name if obj.department else ""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_superuser",
            "is_staff",
            "is_management",
            "grade_level",
            "system_role",
            "system_role_name",
            "employee_id",
            "directorate",
            "division",
            "department",
            "directorate_name",
            "division_name",
            "department_name",
            "last_login",
            "date_joined",
        ]
        read_only_fields = ["id", "last_login", "date_joined"]

    def validate(self, attrs):
        directorate = attrs.get("directorate") or getattr(self.instance, "directorate", None)
        division = attrs.get("division") or getattr(self.instance, "division", None)
        department = attrs.get("department") or getattr(self.instance, "department", None)

        if division and directorate and division.directorate_id != directorate.id:
            raise serializers.ValidationError(
                {"division": "Selected division does not belong to the chosen directorate."}
            )

        if department and division and department.division_id != division.id:
            raise serializers.ValidationError(
                {"department": "Selected department does not belong to the chosen division."}
            )

        if department and not division:
            raise serializers.ValidationError(
                {"department": "Assign a division before selecting a department."}
            )

        if division and not directorate:
            raise serializers.ValidationError(
                {"division": "Assign a directorate before selecting a division."}
            )

        return attrs


class ExecutiveSignatureSerializer(serializers.ModelSerializer):
    """Serializer for executive signature upload and management."""
    
    user_name = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    signature_url = serializers.SerializerMethodField()
    has_signature = serializers.SerializerMethodField()
    
    class Meta:
        model = ExecutiveSignature
        fields = [
            "id",
            "user",
            "user_name",
            "user_role",
            "signature_image",
            "signature_url",
            "has_signature",
            "original_filename",
            "seal_office_name",
            "seal_office_title",
            "seal_prefix",
            "require_2fa",
            "is_active",
            "last_used_at",
            "times_used",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", 
            "user", 
            "file_hash", 
            "last_used_at", 
            "times_used",
            "created_at",
            "updated_at",
        ]
    
    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    
    def get_user_role(self, obj):
        return obj.user.system_role.name if obj.user.system_role else ""
    
    def get_signature_url(self, obj):
        if obj.signature_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.signature_image.url)
            return obj.signature_image.url
        return None
    
    def get_has_signature(self, obj):
        return bool(obj.signature_image)


class ExecutiveSignatureUploadSerializer(serializers.Serializer):
    """Serializer for uploading a new signature image."""
    
    signature_image = serializers.ImageField(
        help_text="PNG or JPG signature image (max 2MB, transparent background recommended)"
    )
    seal_office_name = serializers.CharField(
        max_length=100, 
        required=False,
        default="NIGERIAN PORTS AUTHORITY"
    )
    seal_office_title = serializers.CharField(
        max_length=100, 
        required=False,
        allow_blank=True
    )
    seal_prefix = serializers.CharField(
        max_length=20, 
        required=False,
        default="NPA"
    )
    require_2fa = serializers.BooleanField(required=False, default=True)

    def validate_signature_image(self, value):
        # Validate file size (max 2MB)
        max_size = 2 * 1024 * 1024  # 2MB
        if value.size > max_size:
            raise serializers.ValidationError("Signature image must be less than 2MB")
        
        # Validate file type
        allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                f"Invalid file type. Allowed: PNG, JPG, SVG. Got: {value.content_type}"
            )
        
        return value


class DocumentSealSerializer(serializers.ModelSerializer):
    """Serializer for document seals (verification records)."""
    
    sealed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentSeal
        fields = [
            "id",
            "document",
            "correspondence",
            "sealed_by",
            "sealed_by_name",
            "serial_number",
            "seal_hash",
            "verification_url",
            "office_name",
            "office_title",
            "sealed_at",
            "is_valid",
            "invalidated_at",
            "invalidated_reason",
        ]
        read_only_fields = fields
    
    def get_sealed_by_name(self, obj):
        return obj.sealed_by.get_full_name() or obj.sealed_by.username


class SealVerificationSerializer(serializers.Serializer):
    """Serializer for seal verification requests."""
    
    serial_number = serializers.CharField(max_length=50)


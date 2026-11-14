"""Serializers for organizational structure models."""

from rest_framework import serializers

from .models import (
    ActingAppointment,
    ActingRequest,
    Department,
    Directorate,
    Division,
    Office,
    OfficeMembership,
    ReferenceAllocation,
    ReferenceClassification,
    ReferenceScheme,
    Role,
)
from .reference_services import (
    default_classification,
    preview_next_reference,
    sanitize_segment,
)


class DirectorateSerializer(serializers.ModelSerializer):
    executive_director_name = serializers.CharField(source="executive_director.get_full_name", read_only=True)

    class Meta:
        model = Directorate
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "executive_director",
            "executive_director_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class DivisionSerializer(serializers.ModelSerializer):
    directorate_name = serializers.CharField(source="directorate.name", read_only=True)
    general_manager_name = serializers.CharField(source="general_manager.get_full_name", read_only=True)

    class Meta:
        model = Division
        fields = [
            "id",
            "directorate",
            "directorate_name",
            "name",
            "code",
            "is_active",
            "general_manager",
            "general_manager_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class DepartmentSerializer(serializers.ModelSerializer):
    division_name = serializers.CharField(source="division.name", read_only=True)
    directorate = serializers.UUIDField(source="division.directorate_id", read_only=True)
    directorate_name = serializers.CharField(source="division.directorate.name", read_only=True)
    head_of_department_name = serializers.CharField(source="head_of_department.get_full_name", read_only=True)

    class Meta:
        model = Department
        fields = [
            "id",
            "division",
            "division_name",
            "directorate",
            "directorate_name",
            "name",
            "code",
            "is_active",
            "head_of_department",
            "head_of_department_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "directorate", "directorate_name"]


class RoleSerializer(serializers.ModelSerializer):
    user_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "permissions",
            "user_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "user_count"]


class OfficeSerializer(serializers.ModelSerializer):
    directorate_name = serializers.CharField(source="directorate.name", read_only=True)
    division_name = serializers.CharField(source="division.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    location_name = serializers.CharField(source="location.display_name", read_only=True)

    class Meta:
        model = Office
        fields = [
            "id",
            "name",
            "code",
            "office_type",
            "directorate",
            "directorate_name",
            "division",
            "division_name",
            "department",
            "department_name",
            "parent",
            "parent_name",
            "location",
            "location_name",
            "description",
            "is_active",
            "allow_external_intake",
            "allow_lateral_routing",
            # =============================================================================
            # DELEGATION FIELDS - COMMENTED OUT FOR FUTURE USE
            # Uncomment these fields and run migrations to enable office delegation
            # =============================================================================
            # "is_away",
            # "away_start_date",
            # "away_end_date",
            # "delegate_user",
            # "delegate_role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_parent(self, value):
        """Prevent circular references in office hierarchy."""
        if value and self.instance:
            # Check if setting this parent would create a cycle
            current = value
            visited = {self.instance.id}
            while current:
                if current.id in visited:
                    raise serializers.ValidationError(
                        "Setting this parent would create a circular reference in the office hierarchy."
                    )
                visited.add(current.id)
                current = current.parent
        return value

    def validate(self, attrs):
        """Validate organization hierarchy consistency."""
        division = attrs.get("division") or (self.instance.division if self.instance else None)
        department = attrs.get("department") or (self.instance.department if self.instance else None)
        directorate = attrs.get("directorate") or (self.instance.directorate if self.instance else None)

        # If department is set, division must match department's division
        if department and division:
            if department.division != division:
                raise serializers.ValidationError(
                    {"department": "Department must belong to the specified division."}
                )

        # If division is set, directorate must match division's directorate
        if division and directorate:
            if division.directorate != directorate:
                raise serializers.ValidationError(
                    {"division": "Division must belong to the specified directorate."}
                )

        return attrs


class OfficeMembershipSerializer(serializers.ModelSerializer):
    office_name = serializers.CharField(source="office.name", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = OfficeMembership
        fields = [
            "id",
            "office",
            "office_name",
            "user",
            "user_name",
            "user_username",
            "assignment_role",
            "is_primary",
            "can_register",
            "can_route",
            "can_approve",
            "starts_at",
            "ends_at",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ActingAppointmentSerializer(serializers.ModelSerializer):
    office_name = serializers.CharField(source="office.name", read_only=True)
    office_code = serializers.CharField(source="office.code", read_only=True)
    principal_name = serializers.SerializerMethodField()
    acting_user_name = serializers.SerializerMethodField()
    appointed_by_name = serializers.SerializerMethodField()
    ended_by_name = serializers.SerializerMethodField()
    is_currently_effective = serializers.SerializerMethodField()

    class Meta:
        model = ActingAppointment
        fields = [
            "id",
            "office",
            "office_name",
            "office_code",
            "principal",
            "principal_name",
            "acting_user",
            "acting_user_name",
            "starts_at",
            "ends_at",
            "is_active",
            "is_currently_effective",
            "reason",
            "appointed_by",
            "appointed_by_name",
            "ended_at",
            "ended_by",
            "ended_by_name",
            "membership",
            "items_transferred",
            "items_reclaimed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_active",
            "appointed_by",
            "ended_at",
            "ended_by",
            "membership",
            "items_transferred",
            "items_reclaimed",
            "created_at",
            "updated_at",
        ]

    def _user_name(self, user) -> str:
        if not user:
            return ""
        return user.get_full_name() or user.username

    def get_principal_name(self, obj) -> str:
        return self._user_name(obj.principal)

    def get_acting_user_name(self, obj) -> str:
        return self._user_name(obj.acting_user)

    def get_appointed_by_name(self, obj) -> str:
        return self._user_name(obj.appointed_by)

    def get_ended_by_name(self, obj) -> str:
        return self._user_name(obj.ended_by)

    def get_is_currently_effective(self, obj) -> bool:
        return obj.is_currently_effective()


class ActingRequestSerializer(serializers.ModelSerializer):
    office_name = serializers.CharField(source="office.name", read_only=True)
    office_code = serializers.CharField(source="office.code", read_only=True)
    principal_name = serializers.SerializerMethodField()
    requested_by_name = serializers.SerializerMethodField()
    suggested_acting_user_name = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ActingRequest
        fields = [
            "id",
            "office",
            "office_name",
            "office_code",
            "principal",
            "principal_name",
            "requested_by",
            "requested_by_name",
            "suggested_acting_user",
            "suggested_acting_user_name",
            "reason",
            "pending_item_count",
            "status",
            "resolved_by",
            "resolved_by_name",
            "resolved_at",
            "resolution_note",
            "appointment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "requested_by",
            "pending_item_count",
            "status",
            "resolved_by",
            "resolved_at",
            "resolution_note",
            "appointment",
            "created_at",
            "updated_at",
        ]

    def _user_name(self, user) -> str:
        if not user:
            return ""
        return user.get_full_name() or user.username

    def get_principal_name(self, obj) -> str:
        return self._user_name(obj.principal)

    def get_requested_by_name(self, obj) -> str:
        return self._user_name(obj.requested_by)

    def get_suggested_acting_user_name(self, obj) -> str:
        return self._user_name(obj.suggested_acting_user)

    def get_resolved_by_name(self, obj) -> str:
        return self._user_name(obj.resolved_by)



DEFAULT_REFERENCE_CLASSIFICATIONS = (
    ("AD", "Administrative"),
    ("OP", "Operations"),
    ("CON", "Confidential"),
)


class ReferenceClassificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferenceClassification
        fields = ["id", "code", "label", "next_serial", "is_active"]

    def validate_code(self, value):
        code = sanitize_segment(value)
        if not code:
            raise serializers.ValidationError("Enter a classification code such as AD, OP or CON.")
        if len(code) > 8:
            raise serializers.ValidationError("Classification codes can be at most 8 characters.")
        return code

    def validate_label(self, value):
        label = (value or "").strip()
        if not label:
            raise serializers.ValidationError("Add a short label for this classification.")
        return label

    def validate_next_serial(self, value):
        if value is None or value < 1:
            raise serializers.ValidationError("Next serial must be 1 or greater.")
        return value


class ReferenceSchemeSerializer(serializers.ModelSerializer):
    classifications = ReferenceClassificationSerializer(many=True, required=False)
    unit_name = serializers.CharField(read_only=True)
    scope_label = serializers.CharField(source="get_scope_type_display", read_only=True)
    reference_preview = serializers.SerializerMethodField()

    class Meta:
        model = ReferenceScheme
        fields = [
            "id",
            "scope_type",
            "scope_label",
            "directorate",
            "division",
            "department",
            "unit_name",
            "location_code",
            "authority_code",
            "unit_code",
            "serial_length",
            "description",
            "is_active",
            "classifications",
            "reference_preview",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_reference_preview(self, obj) -> str:
        classification = default_classification(obj)
        if classification is None:
            return ""
        try:
            return preview_next_reference(obj, classification)
        except ValueError:
            return ""

    def validate(self, attrs):
        scope_type = attrs.get("scope_type", getattr(self.instance, "scope_type", None))
        unit_fields = ("directorate", "division", "department")
        if scope_type not in unit_fields:
            raise serializers.ValidationError({"scope_type": "Choose directorate, division or department."})

        selected = attrs.get(scope_type, getattr(self.instance, scope_type, None))
        if selected is None:
            raise serializers.ValidationError(
                {"scope_type": f"Select the {scope_type} this reference scheme belongs to."}
            )
        for field in unit_fields:
            if field == scope_type:
                continue
            value = attrs.get(field, getattr(self.instance, field, None))
            if value is not None:
                raise serializers.ValidationError(
                    {field: "Clear the other unit before changing the scope type."}
                )

        duplicate = ReferenceScheme.objects.filter(scope_type=scope_type, **{scope_type: selected})
        if self.instance is not None:
            duplicate = duplicate.exclude(pk=self.instance.pk)
        if duplicate.exists():
            raise serializers.ValidationError(
                {"scope_type": f"A reference scheme already exists for this {scope_type}."}
            )

        for field, fallback in (("location_code", "HQ"), ("authority_code", "")):
            raw = attrs.get(field, getattr(self.instance, field, fallback))
            cleaned = sanitize_segment(raw, fallback)
            if not cleaned:
                raise serializers.ValidationError({field: "This segment is required."})
            attrs[field] = cleaned

        # The unit segment is optional so authority-level units such as the MD
        # directorate can issue four-part numbers, e.g. HQ/MD/AD/001.
        if "unit_code" in attrs or self.instance is None:
            attrs["unit_code"] = sanitize_segment(attrs.get("unit_code", ""))

        serial_length = attrs.get(
            "serial_length", getattr(self.instance, "serial_length", 3)
        )
        if serial_length < 2 or serial_length > 6:
            raise serializers.ValidationError(
                {"serial_length": "Serial length must be between 2 and 6 digits."}
            )

        classifications = attrs.get("classifications")
        if classifications is not None:
            codes = [row.get("code") for row in classifications if row.get("code")]
            if len(codes) != len(set(codes)):
                raise serializers.ValidationError(
                    {"classifications": "Classification codes must be unique within a scheme."}
                )
        return attrs

    def create(self, validated_data):
        classifications = validated_data.pop("classifications", None)
        scheme = ReferenceScheme.objects.create(**validated_data)
        rows = classifications if classifications else [
            {"code": code, "label": label, "next_serial": 1, "is_active": True}
            for code, label in DEFAULT_REFERENCE_CLASSIFICATIONS
        ]
        for row in rows:
            row = dict(row)
            row.pop("id", None)
            ReferenceClassification.objects.create(scheme=scheme, **row)
        return scheme

    def update(self, instance, validated_data):
        classifications = validated_data.pop("classifications", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if classifications is not None:
            existing = list(instance.classifications.all())
            by_id = {str(item.id): item for item in existing}
            by_code = {item.code: item for item in existing}
            for row in classifications:
                row = dict(row)
                item_id = row.pop("id", None)
                target = by_id.get(str(item_id)) if item_id else None
                if target is None:
                    target = by_code.get(row.get("code"))
                if target is not None:
                    for field, value in row.items():
                        setattr(target, field, value)
                    target.save()
                else:
                    ReferenceClassification.objects.create(scheme=instance, **row)
        return instance


class ReferenceAllocationSerializer(serializers.ModelSerializer):
    """Read-only audit row for a number issued from a reference scheme."""

    scope_label = serializers.SerializerMethodField()
    unit_name = serializers.SerializerMethodField()
    classification_label = serializers.SerializerMethodField()
    correspondence_reference = serializers.SerializerMethodField()
    correspondence_subject = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ReferenceAllocation
        fields = [
            "id",
            "reference_number",
            "scope_type",
            "scope_label",
            "unit_name",
            "unit_code",
            "classification_code",
            "classification_label",
            "serial",
            "correspondence",
            "correspondence_reference",
            "correspondence_subject",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_scope_label(self, obj) -> str:
        return {
            "directorate": "Directorate",
            "division": "Division",
            "department": "Department",
        }.get(obj.scope_type, obj.scope_type.title() if obj.scope_type else "Unit")

    def get_unit_name(self, obj) -> str:
        if obj.scheme is not None and obj.scheme.unit_name:
            return obj.scheme.unit_name
        return obj.unit_code

    def get_classification_label(self, obj) -> str:
        if obj.classification is not None:
            return obj.classification.label
        return ""

    def get_correspondence_reference(self, obj) -> str:
        return obj.correspondence.reference_number if obj.correspondence is not None else ""

    def get_correspondence_subject(self, obj) -> str:
        return obj.correspondence.subject if obj.correspondence is not None else ""

    def get_created_by_name(self, obj) -> str:
        user = obj.created_by
        if user is None:
            return ""
        return user.get_full_name().strip() or user.username

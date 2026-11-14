"""Serializers for physical document tracking."""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from accounts.serializers import UserSerializer
from organization.models import Office
from .models import Location, PhysicalDocument, PhysicalHandover, CheckOutEvent

User = get_user_model()


def generate_tracking_number():
    today = timezone.now().date()
    count = PhysicalDocument.objects.filter(
        created_at__date=today
    ).count()
    return f"NPA/PHYS/{today.strftime('%Y%m%d')}/{count + 1:04d}"


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = [
            "id",
            "building",
            "floor",
            "room",
            "description",
            "is_active",
            "display_name",
        ]
        read_only_fields = ["id", "display_name"]


class PhysicalDocumentSerializer(serializers.ModelSerializer):
    checked_out_to = UserSerializer(read_only=True)
    checked_out_to_id = serializers.PrimaryKeyRelatedField(
        source="checked_out_to",
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    location_name = serializers.CharField(source="location.display_name", read_only=True)
    correspondence_ref = serializers.CharField(
        source="correspondence.reference_number", read_only=True
    )
    current_office_name = serializers.CharField(source="current_office.name", read_only=True)
    current_office = serializers.PrimaryKeyRelatedField(
        queryset=Office.objects.filter(is_active=True), required=False
    )
    pending_handover_to_office_id = serializers.SerializerMethodField()
    pending_handover_to_office_name = serializers.SerializerMethodField()

    class Meta:
        model = PhysicalDocument
        fields = [
            "id",
            "tracking_number",
            "barcode",
            "correspondence",
            "correspondence_ref",
            "document",
            "location",
            "location_name",
            "current_office",
            "current_office_name",
            "pending_handover_to_office_id",
            "pending_handover_to_office_name",
            "status",
            "description",
            "checked_out_to",
            "checked_out_to_id",
            "checked_out_at",
            "expected_return_at",
            "notes",
            "created_at",
        ]
        read_only_fields = [
            "id", "checked_out_to",
            "checked_out_at", "created_at",
            "location_name", "current_office_name", "correspondence_ref",
        ]

    def get_pending_handover_to_office_id(self, obj):
        pending = obj.handover_events.filter(received_at__isnull=True).select_related("to_office").first()
        return str(pending.to_office_id) if pending else None

    def get_pending_handover_to_office_name(self, obj):
        pending = obj.handover_events.filter(received_at__isnull=True).select_related("to_office").first()
        return pending.to_office.name if pending else None

    def validate(self, attrs):
        location = attrs.get("location")
        office = attrs.get("current_office")
        if self.instance is None:
            if not location:
                raise serializers.ValidationError({"location": "A storage location is required."})
            if not office:
                raise serializers.ValidationError({"current_office": "A custodian office is required."})
        if self.instance is not None and office and office.id != self.instance.current_office_id:
            raise serializers.ValidationError({"current_office": "Custody can only be changed by a confirmed handover."})
        request = self.context.get("request")
        if request and office and not office.memberships.filter(user=request.user, is_active=True).exists():
            raise serializers.ValidationError({"current_office": "You must be an active member of the custodian office."})
        return attrs

    def create(self, validated_data):
        if "tracking_number" not in validated_data or not validated_data.get("tracking_number"):
            validated_data["tracking_number"] = generate_tracking_number()
        return super().create(validated_data)


class PhysicalDocumentDetailSerializer(PhysicalDocumentSerializer):
    checkout_events = serializers.SerializerMethodField()

    class Meta(PhysicalDocumentSerializer.Meta):
        fields = PhysicalDocumentSerializer.Meta.fields + ["checkout_events"]

    def get_checkout_events(self, obj):
        events = obj.checkout_events.select_related("user").order_by("-created_at")[:20]
        return CheckOutEventSerializer(events, many=True).data


class PhysicalHandoverSerializer(serializers.ModelSerializer):
    from_office_name = serializers.CharField(source="from_office.name", read_only=True)
    to_office_name = serializers.CharField(source="to_office.name", read_only=True)
    sent_by_name = serializers.CharField(source="sent_by.get_full_name", read_only=True)
    received_by_name = serializers.CharField(source="received_by.get_full_name", read_only=True)

    class Meta:
        model = PhysicalHandover
        fields = [
            "id",
            "physical_document",
            "from_office",
            "from_office_name",
            "to_office",
            "to_office_name",
            "sent_by",
            "sent_by_name",
            "received_by",
            "received_by_name",
            "sent_at",
            "received_at",
            "notes",
            "receipt_notes",
        ]
        read_only_fields = fields


class CheckOutEventSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = CheckOutEvent
        fields = [
            "id",
            "physical_document",
            "user",
            "user_name",
            "action",
            "purpose",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "user", "created_at"]

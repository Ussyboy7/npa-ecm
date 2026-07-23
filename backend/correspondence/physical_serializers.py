"""Serializers for physical document tracking."""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from accounts.serializers import UserSerializer
from .models import Location, PhysicalDocument, CheckOutEvent

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
            "location_name", "correspondence_ref",
        ]

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

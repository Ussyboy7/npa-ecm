"""Serializers for external entity directory."""

from rest_framework import serializers

from .models import ExternalEntity


class ExternalEntitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalEntity
        fields = [
            "id",
            "name",
            "acronym",
            "entity_type",
            "contact_email",
            "contact_phone",
            "address",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

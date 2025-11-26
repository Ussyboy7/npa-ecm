"""Serializers for analytics data."""

from __future__ import annotations

from rest_framework import serializers

from accounts.serializers import UserSerializer
from organization.models import Division

from .models import (
    DivisionPerformanceSnapshot,
    Escalation,
    EscalationRule,
    ReportSnapshot,
    SLAConfiguration,
    StaffPerformanceSnapshot,
    UsageMetric,
)


class ReportSnapshotSerializer(serializers.ModelSerializer):
    generated_for = UserSerializer(read_only=True)
    generated_for_id = serializers.PrimaryKeyRelatedField(
        source="generated_for",
        queryset=ReportSnapshot._meta.get_field("generated_for").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = ReportSnapshot
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "generated_for",
            "generated_for_id",
            "generated_at",
            "filters",
            "data",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "generated_for", "generated_at", "created_at", "updated_at"]


class UsageMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsageMetric
        fields = ["id", "metric", "value", "recorded_at", "metadata", "created_at", "updated_at"]
        read_only_fields = ["id", "recorded_at", "created_at", "updated_at"]


# =============================================================================
# SLA Configuration Serializers
# =============================================================================


class DivisionMinimalSerializer(serializers.ModelSerializer):
    """Minimal division info for SLA config."""

    class Meta:
        model = Division
        fields = ["id", "name", "code"]


class SLAConfigurationSerializer(serializers.ModelSerializer):
    division_detail = DivisionMinimalSerializer(source="division", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    correspondence_type_display = serializers.CharField(source="get_correspondence_type_display", read_only=True)

    class Meta:
        model = SLAConfiguration
        fields = [
            "id",
            "name",
            "priority",
            "priority_display",
            "correspondence_type",
            "correspondence_type_display",
            "target_days",
            "warning_threshold_percent",
            "critical_threshold_percent",
            "division",
            "division_detail",
            "is_active",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SLAConfigurationCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating SLA configurations."""

    class Meta:
        model = SLAConfiguration
        fields = [
            "id",
            "name",
            "priority",
            "correspondence_type",
            "target_days",
            "warning_threshold_percent",
            "critical_threshold_percent",
            "division",
            "is_active",
            "description",
        ]

    def validate(self, attrs):
        # Check for duplicate SLA config
        priority = attrs.get("priority")
        correspondence_type = attrs.get("correspondence_type", SLAConfiguration.CorrespondenceType.ALL)
        division = attrs.get("division")
        
        qs = SLAConfiguration.objects.filter(
            priority=priority,
            correspondence_type=correspondence_type,
            division=division,
        )
        
        # Exclude current instance if updating
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        
        if qs.exists():
            raise serializers.ValidationError(
                "An SLA configuration with this priority, correspondence type, and division already exists."
            )
        
        return attrs


class SLATargetsSerializer(serializers.Serializer):
    """Serializer for bulk SLA target response."""

    urgent = serializers.IntegerField()
    high = serializers.IntegerField()
    medium = serializers.IntegerField()
    low = serializers.IntegerField()


# =============================================================================
# Escalation Rule Serializers
# =============================================================================


class EscalationRuleSerializer(serializers.ModelSerializer):
    trigger_type_display = serializers.CharField(source="get_trigger_type_display", read_only=True)
    action_type_display = serializers.CharField(source="get_action_type_display", read_only=True)
    divisions_detail = DivisionMinimalSerializer(source="divisions", many=True, read_only=True)
    escalation_count = serializers.SerializerMethodField()

    class Meta:
        model = EscalationRule
        fields = [
            "id",
            "name",
            "description",
            "trigger_type",
            "trigger_type_display",
            "trigger_conditions",
            "action_type",
            "action_type_display",
            "action_config",
            "email_subject_template",
            "email_body_template",
            "is_active",
            "priority_order",
            "cooldown_hours",
            "divisions",
            "divisions_detail",
            "escalation_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_escalation_count(self, obj):
        return obj.escalations.count()


class EscalationRuleCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating escalation rules."""

    divisions = serializers.PrimaryKeyRelatedField(
        queryset=Division.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = EscalationRule
        fields = [
            "id",
            "name",
            "description",
            "trigger_type",
            "trigger_conditions",
            "action_type",
            "action_config",
            "email_subject_template",
            "email_body_template",
            "is_active",
            "priority_order",
            "cooldown_hours",
            "divisions",
        ]


# =============================================================================
# Escalation Serializers
# =============================================================================


class EscalationSerializer(serializers.ModelSerializer):
    correspondence_reference = serializers.CharField(
        source="correspondence.reference_number", read_only=True
    )
    correspondence_subject = serializers.CharField(
        source="correspondence.subject", read_only=True
    )
    rule_name = serializers.CharField(source="rule.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    acknowledged_by_name = serializers.CharField(
        source="acknowledged_by.get_full_name", read_only=True
    )
    resolved_by_name = serializers.CharField(
        source="resolved_by.get_full_name", read_only=True
    )

    class Meta:
        model = Escalation
        fields = [
            "id",
            "correspondence",
            "correspondence_reference",
            "correspondence_subject",
            "rule",
            "rule_name",
            "triggered_at",
            "trigger_reason",
            "action_taken",
            "action_details",
            "notified_emails",
            "status",
            "status_display",
            "acknowledged_at",
            "acknowledged_by",
            "acknowledged_by_name",
            "resolved_at",
            "resolved_by",
            "resolved_by_name",
            "resolution_notes",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "triggered_at",
            "created_at",
            "updated_at",
        ]


class EscalationAcknowledgeSerializer(serializers.Serializer):
    """Serializer for acknowledging an escalation."""
    pass  # No input needed, uses request.user


class EscalationResolveSerializer(serializers.Serializer):
    """Serializer for resolving an escalation."""

    resolution_notes = serializers.CharField(required=False, allow_blank=True)


# =============================================================================
# Performance Snapshot Serializers
# =============================================================================


class DivisionPerformanceSnapshotSerializer(serializers.ModelSerializer):
    division_name = serializers.CharField(source="division.name", read_only=True)
    division_code = serializers.CharField(source="division.code", read_only=True)

    class Meta:
        model = DivisionPerformanceSnapshot
        fields = [
            "id",
            "division",
            "division_name",
            "division_code",
            "snapshot_date",
            "total_items",
            "completed_items",
            "pending_items",
            "new_items",
            "sla_compliant",
            "sla_breached",
            "sla_at_risk",
            "sla_compliance_rate",
            "avg_turnaround_days",
            "min_turnaround_days",
            "max_turnaround_days",
            "p50_turnaround_days",
            "p90_turnaround_days",
            "efficiency_score",
            "throughput",
            "backlog_age_days",
            "urgent_count",
            "high_count",
            "medium_count",
            "low_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class StaffPerformanceSnapshotSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = StaffPerformanceSnapshot
        fields = [
            "id",
            "user",
            "user_name",
            "user_email",
            "week_start",
            "week_end",
            "items_handled",
            "items_completed",
            "items_forwarded",
            "items_returned",
            "avg_response_time_hours",
            "avg_resolution_time_days",
            "sla_compliance_rate",
            "sla_breaches",
            "rework_count",
            "first_touch_resolution_rate",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# =============================================================================
# Summary/Dashboard Serializers
# =============================================================================


class SLASummarySerializer(serializers.Serializer):
    """Summary of current SLA status across the system."""

    total = serializers.IntegerField()
    compliant = serializers.IntegerField()
    breached = serializers.IntegerField()
    at_risk = serializers.IntegerField()
    compliance_rate = serializers.FloatField()
    avg_days_to_breach = serializers.FloatField()


class DivisionPerformanceSummarySerializer(serializers.Serializer):
    """Summary of division performance for dashboards."""

    division_id = serializers.UUIDField()
    division_name = serializers.CharField()
    division_code = serializers.CharField()
    workload = serializers.IntegerField()
    completed = serializers.IntegerField()
    pending = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    avg_turnaround = serializers.FloatField()
    sla_compliance_rate = serializers.FloatField()
    efficiency_score = serializers.FloatField()
    trend = serializers.CharField()  # "up", "down", "stable"
    trend_percent = serializers.FloatField()


class EfficiencyAnalysisSerializer(serializers.Serializer):
    """Efficiency analysis data for dashboards."""

    # Process efficiency
    avg_handoffs = serializers.FloatField()
    first_touch_resolution_rate = serializers.FloatField()
    bottleneck_divisions = serializers.ListField(child=serializers.DictField())
    
    # Time analysis
    avg_processing_time_hours = serializers.FloatField()
    peak_activity_hours = serializers.ListField(child=serializers.IntegerField())
    weekend_activity_percent = serializers.FloatField()
    
    # Staff metrics summary
    top_performers = serializers.ListField(child=serializers.DictField())
    staff_utilization_rate = serializers.FloatField()

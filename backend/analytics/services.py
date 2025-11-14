"""Server-side analytics aggregation helpers."""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from typing import Any, Iterable

from django.db.models import Prefetch, QuerySet
from django.utils import timezone

from accounts.models import User
from correspondence.models import Correspondence, Minute
from dms.models import Document


@dataclass(frozen=True)
class DivisionMetric:
    id: str | None
    name: str
    full_name: str
    workload: int
    completed: int
    avg_turnaround: float
    completion_rate: float
    efficiency: float
    high_priority: int = 0
    backlog: int = 0


class AnalyticsService:
    """Central place for computing analytics payloads consumed by the dashboards."""

    SLA_TARGETS = {
        Correspondence.Priority.URGENT: 2,
        Correspondence.Priority.HIGH: 3,
        Correspondence.Priority.MEDIUM: 5,
        Correspondence.Priority.LOW: 7,
    }
    RESPONSE_BUCKETS = [
        {"name": "0-2 days", "min": 0, "max": 2},
        {"name": "3-5 days", "min": 3, "max": 5},
        {"name": "6-10 days", "min": 6, "max": 10},
        {"name": "11-15 days", "min": 11, "max": 15},
        {"name": "15+ days", "min": 16, "max": None},
    ]
    LEADERSHIP_GRADES = {"MDCS", "EDCS", "MSS1", "MSS2"}

    # ------------------------------------------------------------------ #
    # Public builders
    # ------------------------------------------------------------------ #

    @classmethod
    def build_performance_payload(cls, *, range_days: int = 30) -> dict[str, Any]:
        correspondences = list(cls._fetch_correspondence(range_days=range_days))
        now = timezone.now()
        completed = [item for item in correspondences if item.status == Correspondence.Status.COMPLETED]

        turnaround_values = [cls._turnaround_days(item, now) for item in completed]
        average_turnaround = round(sum(turnaround_values) / len(turnaround_values), 2) if turnaround_values else 0.0
        fastest_turnaround = round(min(turnaround_values), 2) if turnaround_values else 0.0
        slowest_turnaround = round(max(turnaround_values), 2) if turnaround_values else 0.0

        sla_status = cls._compute_sla(completed, now)
        division_stats = cls._compute_division_metrics(correspondences, now)
        response_distribution = cls._compute_response_distribution(completed, now)
        role_performance = cls._compute_role_performance(correspondences, now)

        return {
            "metadata": cls._metadata(range_days),
            "sla": sla_status,
            "turnaround": {
                "average": average_turnaround,
                "fastest": fastest_turnaround,
                "slowest": slowest_turnaround,
            },
            "divisionPerformance": [cls._format_division_metric(metric) for metric in division_stats],
            "responseDistribution": response_distribution,
            "rolePerformance": role_performance,
            "radarData": cls._build_radar_data(division_stats),
        }

    @classmethod
    def build_executive_payload(cls, *, range_days: int = 30) -> dict[str, Any]:
        correspondences = list(cls._fetch_correspondence(range_days=range_days))
        now = timezone.now()
        division_metrics = cls._compute_division_metrics(correspondences, now)
        department_activity = cls._compute_department_activity(correspondences)
        delayed = cls._compute_delayed_items(correspondences, now, limit=6)
        pending_leadership = cls._compute_pending_leadership(correspondences, now)
        weekly_trend = cls._compute_weekly_trend(correspondences)
        sensitivity_breakdown = cls._compute_sensitivity_breakdown(range_days=range_days)

        return {
            "metadata": cls._metadata(range_days),
            "divisionMetrics": [cls._format_division_metric(metric) for metric in division_metrics],
            "departmentActivity": department_activity,
            "delayedApprovals": delayed,
            "pendingLeadership": pending_leadership,
            "weeklyTrend": weekly_trend,
            "sensitivityBreakdown": sensitivity_breakdown,
        }

    @classmethod
    def build_reports_payload(cls, *, range_days: int = 30, division_id: str | None = None) -> dict[str, Any]:
        correspondences = list(cls._fetch_correspondence(range_days=range_days, division_id=division_id))
        now = timezone.now()
        totals = cls._compute_basic_metrics(correspondences, now)
        status_data = cls._build_status_distribution(totals)
        priority_data = cls._build_priority_distribution(correspondences)
        division_data = [
            {
                "name": metric.name,
                "total": metric.workload,
                "completed": metric.completed,
                "pending": metric.workload - metric.completed,
                "rate": round(metric.completion_rate),
            }
            for metric in cls._compute_division_metrics(correspondences, now)
            if metric.workload > 0
        ]
        trend = cls._compute_daily_trend(correspondences, days=7)

        return {
            "metadata": cls._metadata(range_days, division_id=division_id),
            "metrics": totals,
            "statusDistribution": status_data,
            "priorityDistribution": priority_data,
            "divisionSummary": division_data,
            "trend": trend,
        }

    # ------------------------------------------------------------------ #
    # Query helpers
    # ------------------------------------------------------------------ #

    @classmethod
    def _fetch_correspondence(cls, *, range_days: int | None = None, division_id: str | None = None) -> QuerySet[Correspondence]:
        qs: QuerySet[Correspondence] = Correspondence.objects.all()
        if range_days:
            start_date = timezone.now().date() - timedelta(days=range_days)
            qs = qs.filter(received_date__gte=start_date)
        if division_id:
            qs = qs.filter(division_id=division_id)
        return qs.select_related("division", "department", "current_approver").prefetch_related(
            Prefetch(
                "minutes",
                queryset=Minute.objects.order_by("timestamp").only(
                    "id",
                    "correspondence_id",
                    "timestamp",
                    "acted_by_secretary",
                    "acted_by_assistant",
                    "assistant_type",
                ),
            ),
        )

    @staticmethod
    def _metadata(range_days: int, *, division_id: str | None = None) -> dict[str, Any]:
        metadata: dict[str, Any] = {
            "rangeDays": range_days,
            "generatedAt": timezone.now().isoformat(),
        }
        if division_id:
            metadata["divisionId"] = division_id
        return metadata

    @staticmethod
    def _start_datetime(correspondence: Correspondence) -> datetime:
        if correspondence.received_date:
            naive = datetime.combine(correspondence.received_date, time.min)
            return timezone.make_aware(naive, timezone.get_current_timezone())
        return correspondence.created_at

    @classmethod
    def _turnaround_days(cls, correspondence: Correspondence, now: datetime) -> float:
        start = cls._start_datetime(correspondence)
        end = correspondence.completed_at or now
        return max(0.0, (end - start).total_seconds() / 86400.0)

    # ------------------------------------------------------------------ #
    # Metric builders shared across payloads
    # ------------------------------------------------------------------ #

    @staticmethod
    def _format_division_metric(metric: DivisionMetric) -> dict[str, Any]:
        return {
            "id": metric.id,
            "name": metric.name,
            "fullName": metric.full_name,
            "total": metric.workload,
            "workload": metric.workload,
            "completed": metric.completed,
            "avgTurnaround": metric.avg_turnaround,
            "avgDays": metric.avg_turnaround,
            "completionRate": metric.completion_rate,
            "efficiency": metric.efficiency,
            "highPriority": metric.high_priority,
            "backlog": metric.backlog,
        }

    @classmethod
    def _compute_sla(cls, completed: Iterable[Correspondence], now: datetime) -> dict[str, Any]:
        compliant = 0
        breached = 0
        for item in completed:
            target = cls.SLA_TARGETS.get(item.priority, 5)
            days_taken = cls._turnaround_days(item, now)
            if days_taken <= target:
                compliant += 1
            else:
                breached += 1
        total = compliant + breached
        compliance_rate = round((compliant / total) * 100, 2) if total else 0.0
        return {
            "total": total,
            "compliant": compliant,
            "breached": breached,
            "complianceRate": compliance_rate,
        }

    @classmethod
    def _compute_division_metrics(cls, correspondences: Iterable[Correspondence], now: datetime) -> list[DivisionMetric]:
        metrics: dict[str | None, DivisionMetric] = {}
        buckets: dict[str | None, dict[str, Any]] = defaultdict(
            lambda: {"workload": 0, "completed": 0, "turnaround_sum": 0.0, "high_priority": 0, "backlog": 0}
        )

        for item in correspondences:
            key = item.division_id or "unassigned"
            division_name = item.division.code if getattr(item.division, "code", None) else getattr(item.division, "name", None) or "Unassigned"
            full_name = getattr(item.division, "name", None) or "Unassigned"
            bucket = buckets[key]
            bucket["workload"] += 1
            if item.priority in {Correspondence.Priority.HIGH, Correspondence.Priority.URGENT}:
                bucket["high_priority"] += 1

            if item.status == Correspondence.Status.COMPLETED:
                bucket["completed"] += 1
                bucket["turnaround_sum"] += cls._turnaround_days(item, now)
            elif cls._turnaround_days(item, now) > 5:
                bucket["backlog"] += 1

            average_turnaround = bucket["turnaround_sum"] / bucket["completed"] if bucket["completed"] else 0.0
            completion_rate = (bucket["completed"] / bucket["workload"]) * 100 if bucket["workload"] else 0.0
            efficiency = (completion_rate / (average_turnaround or 1)) * 10 if completion_rate else 0.0

            metrics[key] = DivisionMetric(
                id=None if key == "unassigned" else key,
                name=division_name,
                full_name=full_name,
                workload=bucket["workload"],
                completed=bucket["completed"],
                avg_turnaround=round(average_turnaround, 2),
                completion_rate=round(completion_rate, 2),
                efficiency=round(efficiency, 2),
                high_priority=bucket["high_priority"],
                backlog=bucket["backlog"],
            )

        return sorted(metrics.values(), key=lambda metric: metric.workload, reverse=True)

    @classmethod
    def _compute_response_distribution(cls, completed: Iterable[Correspondence], now: datetime) -> list[dict[str, Any]]:
        buckets = [{**bucket, "count": 0} for bucket in cls.RESPONSE_BUCKETS]
        for item in completed:
            days = cls._turnaround_days(item, now)
            for bucket in buckets:
                minimum = bucket["min"]
                maximum = bucket["max"]
                if minimum is not None and days < minimum:
                    continue
                if maximum is not None and days > maximum:
                    continue
                bucket["count"] += 1
                break
        return [{"name": bucket["name"], "label": bucket["name"], "count": bucket["count"]} for bucket in buckets]

    @classmethod
    def _compute_role_performance(cls, correspondences: Iterable[Correspondence], now: datetime) -> list[dict[str, Any]]:
        minute_queryset = Minute.objects.filter(correspondence__in=[item.id for item in correspondences]).select_related("correspondence")
        minutes = list(minute_queryset)
        secretary_minutes = [minute for minute in minutes if minute.acted_by_secretary]
        assistant_minutes = [minute for minute in minutes if minute.acted_by_assistant]
        executive_minutes = [minute for minute in minutes if minute not in secretary_minutes and minute not in assistant_minutes]

        def avg_response(minute_list: list[Minute]) -> float:
            if not minute_list:
                return 0.0
            durations = [cls._turnaround_days(minute.correspondence, now) for minute in minute_list]
            return round(sum(durations) / len(durations), 2) if durations else 0.0

        return [
            {"role": "Secretary", "actions": len(secretary_minutes), "avgResponseTime": avg_response(secretary_minutes)},
            {"role": "Assistant", "actions": len(assistant_minutes), "avgResponseTime": avg_response(assistant_minutes)},
            {"role": "Executive", "actions": len(executive_minutes), "avgResponseTime": avg_response(executive_minutes)},
        ]

    @staticmethod
    def _build_radar_data(metrics: Iterable[DivisionMetric]) -> list[dict[str, Any]]:
        radar = []
        for metric in list(metrics)[:6]:
            radar.append(
                {
                    "division": metric.name,
                    "completionRate": metric.completion_rate,
                    "efficiency": metric.efficiency,
                    "workload": min(metric.workload * 10, 100),
                }
            )
        return radar

    @staticmethod
    def _compute_department_activity(correspondences: Iterable[Correspondence]) -> list[dict[str, Any]]:
        counter: Counter[str] = Counter()
        name_map: dict[str, str] = {}
        for item in correspondences:
            department_id = item.department_id or "unassigned"
            counter[department_id] += 1
            if department_id not in name_map:
                name_map[department_id] = getattr(item.department, "name", None) or "Unassigned"
        top_departments = counter.most_common(6)
        return [{"id": dept_id, "name": name_map.get(dept_id, "Unassigned"), "total": total} for dept_id, total in top_departments]

    @classmethod
    def _compute_delayed_items(cls, correspondences: Iterable[Correspondence], now: datetime, *, limit: int = 6) -> list[dict[str, Any]]:
        delayed = []
        for item in correspondences:
            if item.status == Correspondence.Status.COMPLETED:
                continue
            turnaround = cls._turnaround_days(item, now)
            if turnaround <= 7:
                continue
            last_action = item.minutes.last().timestamp.isoformat() if item.minutes.exists() else None
            approver = None
            if item.current_approver:
                approver = item.current_approver.get_full_name() or item.current_approver.username
            delayed.append(
                {
                    "id": str(item.id),
                    "referenceNumber": item.reference_number,
                    "subject": item.subject,
                    "priority": item.priority,
                    "divisionName": getattr(item.division, "name", None),
                    "daysPending": round(turnaround, 2),
                    "currentApprover": approver,
                    "lastActionAt": last_action,
                }
            )
        delayed.sort(key=lambda entry: entry["daysPending"], reverse=True)
        return delayed[:limit]

    @classmethod
    def _compute_pending_leadership(cls, correspondences: Iterable[Correspondence], now: datetime) -> list[dict[str, Any]]:
        pending = []
        for item in correspondences:
            approver: User | None = item.current_approver
            if not approver or not approver.grade_level:
                continue
            if approver.grade_level not in cls.LEADERSHIP_GRADES:
                continue
            days_pending = round(cls._turnaround_days(item, now), 2)
            pending.append(
                {
                    "id": str(item.id),
                    "referenceNumber": item.reference_number,
                    "subject": item.subject,
                    "approverName": approver.get_full_name() or approver.username,
                    "priority": item.priority,
                    "divisionName": getattr(item.division, "name", None),
                    "receivedDate": item.received_date.isoformat() if item.received_date else None,
                    "daysPending": days_pending,
                }
            )
        return pending

    @staticmethod
    def _compute_weekly_trend(correspondences: Iterable[Correspondence]) -> list[dict[str, Any]]:
        buckets: dict[str, dict[str, Any]] = {}
        for item in correspondences:
            if not item.received_date:
                continue
            date_value = datetime.combine(item.received_date, time.min)
            week_start = date_value - timedelta(days=date_value.weekday())
            key = week_start.date().isoformat()
            bucket = buckets.setdefault(key, {"week": week_start.strftime("%b %d"), "completed": 0, "pending": 0})
            if item.status == Correspondence.Status.COMPLETED:
                bucket["completed"] += 1
            else:
                bucket["pending"] += 1
        return sorted(buckets.values(), key=lambda entry: entry["week"])

    @staticmethod
    def _compute_sensitivity_breakdown(range_days: int) -> list[dict[str, Any]]:
        docs = Document.objects.all()
        if range_days:
            start = timezone.now() - timedelta(days=range_days)
            docs = docs.filter(created_at__gte=start)
        buckets: dict[str, dict[str, Any]] = defaultdict(lambda: {"count": 0, "turnaround_sum": 0.0})
        for document in docs:
            key = document.sensitivity or "internal"
            buckets[key]["count"] += 1
            delta = (document.updated_at - document.created_at).total_seconds() / 86400.0
            buckets[key]["turnaround_sum"] += max(0.0, delta)
        labels = {
            "public": "Public",
            "internal": "Internal",
            "confidential": "Confidential",
            "restricted": "Restricted",
        }
        output = []
        for key, bucket in buckets.items():
            count = bucket["count"]
            avg = bucket["turnaround_sum"] / count if count else 0.0
            output.append({"sensitivity": key, "label": labels.get(key, key.title()), "count": count, "avgTurnaround": round(avg, 2)})
        return output

    @classmethod
    def _compute_basic_metrics(cls, correspondences: Iterable[Correspondence], now: datetime) -> dict[str, Any]:
        correspondences_list = list(correspondences)
        total = len(correspondences_list)
        completed_items = [item for item in correspondences_list if item.status == Correspondence.Status.COMPLETED]
        in_progress = len([item for item in correspondences_list if item.status == Correspondence.Status.IN_PROGRESS])
        pending = len([item for item in correspondences_list if item.status == Correspondence.Status.PENDING])
        urgent = len([item for item in correspondences_list if item.priority == Correspondence.Priority.URGENT])
        avg_processing = (
            round(sum(cls._turnaround_days(item, now) for item in completed_items) / len(completed_items), 2)
            if completed_items
            else 0.0
        )
        completion_rate = round((len(completed_items) / total) * 100, 2) if total else 0.0
        return {
            "total": total,
            "completed": len(completed_items),
            "inProgress": in_progress,
            "pending": pending,
            "urgent": urgent,
            "avgProcessingTime": avg_processing,
            "completionRate": completion_rate,
        }

    @staticmethod
    def _build_status_distribution(metrics: dict[str, Any]) -> list[dict[str, Any]]:
        return [
            {"name": "Completed", "value": metrics["completed"]},
            {"name": "In Progress", "value": metrics["inProgress"]},
            {"name": "Pending", "value": metrics["pending"]},
        ]

    @staticmethod
    def _build_priority_distribution(correspondences: Iterable[Correspondence]) -> list[dict[str, Any]]:
        counter: Counter[str] = Counter(item.priority for item in correspondences)
        order = [Correspondence.Priority.URGENT, Correspondence.Priority.HIGH, Correspondence.Priority.MEDIUM, Correspondence.Priority.LOW]
        labels = {
            Correspondence.Priority.URGENT: "Urgent",
            Correspondence.Priority.HIGH: "High",
            Correspondence.Priority.MEDIUM: "Medium",
            Correspondence.Priority.LOW: "Low",
        }
        return [{"name": labels[key], "value": counter.get(key, 0), "priority": key} for key in order]

    @staticmethod
    def _compute_daily_trend(correspondences: Iterable[Correspondence], *, days: int) -> list[dict[str, Any]]:
        today = timezone.now().date()
        correspondence_list = list(correspondences)
        buckets: list[dict[str, Any]] = []
        for delta in range(days - 1, -1, -1):
            day = today - timedelta(days=delta)
            label = day.strftime("%b %d")
            received = len([item for item in correspondence_list if item.received_date == day])
            completed = len(
                [
                    item
                    for item in correspondence_list
                    if item.completed_at and item.completed_at.date() == day and item.status == Correspondence.Status.COMPLETED
                ]
            )
            buckets.append({"date": label, "received": received, "completed": completed})
        return buckets

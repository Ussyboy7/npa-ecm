"""HRMS staff and organization synchronization."""

from __future__ import annotations

import logging
import time
from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from integrations.connector_http import build_auth_headers, get_json
from integrations.models import HRMSConnector, IntegrationLog

logger = logging.getLogger(__name__)
User = get_user_model()

EXIT_STATUSES = {"inactive", "exited", "terminated", "resigned", "retired"}


class HRMSSyncService:
    """Sync staff profiles and org units from NPA HRMS."""

    @staticmethod
    def _map_field(record: dict[str, Any], mappings: dict[str, str], key: str, default: str) -> str:
        source_key = mappings.get(key, key)
        value = record.get(source_key, record.get(key, default))
        return str(value).strip() if value is not None else default

    @staticmethod
    def _extract_list(payload: Any, *keys: str) -> list[dict[str, Any]]:
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        if isinstance(payload, dict):
            for key in keys:
                value = payload.get(key)
                if isinstance(value, list):
                    return [item for item in value if isinstance(item, dict)]
        return []

    @classmethod
    def sync_organization(cls, connector: HRMSConnector) -> dict[str, int]:
        from organization.models import Department, Directorate, Division

        if not connector.org_endpoint:
            return {"directorates": 0, "divisions": 0, "departments": 0}

        url = f"{connector.base_url.rstrip('/')}/{connector.org_endpoint.lstrip('/')}"
        headers = build_auth_headers(
            api_key=connector.api_key,
            username=connector.username,
            password=connector.password,
        )
        status_code, payload = get_json(url, headers)
        if status_code != 200:
            raise ValueError(f"HRMS org sync failed: HTTP {status_code}")

        counts = {"directorates": 0, "divisions": 0, "departments": 0}

        for item in cls._extract_list(payload, "directorates", "items"):
            code = item.get("code") or item.get("directorate_code")
            name = item.get("name")
            if not code or not name:
                continue
            _, created = Directorate.objects.update_or_create(
                code=str(code).upper(),
                defaults={"name": name, "is_active": item.get("is_active", True)},
            )
            if created:
                counts["directorates"] += 1

        for item in cls._extract_list(payload, "divisions"):
            code = item.get("code") or item.get("division_code")
            name = item.get("name")
            directorate_code = item.get("directorate_code") or item.get("directorate")
            if not code or not name or not directorate_code:
                continue
            directorate = Directorate.objects.filter(code=str(directorate_code).upper()).first()
            if not directorate:
                continue
            _, created = Division.objects.update_or_create(
                directorate=directorate,
                code=str(code).upper(),
                defaults={"name": name, "is_active": item.get("is_active", True)},
            )
            if created:
                counts["divisions"] += 1

        for item in cls._extract_list(payload, "departments"):
            code = item.get("code") or item.get("department_code")
            name = item.get("name")
            division_code = item.get("division_code") or item.get("division")
            if not code or not name or not division_code:
                continue
            division = Division.objects.filter(code=str(division_code).upper()).first()
            if not division:
                continue
            _, created = Department.objects.update_or_create(
                division=division,
                code=str(code).upper(),
                defaults={"name": name, "is_active": item.get("is_active", True)},
            )
            if created:
                counts["departments"] += 1

        return counts

    @classmethod
    @transaction.atomic
    def sync_staff(cls, connector_id: str) -> dict[str, Any]:
        start = time.time()
        try:
            connector = HRMSConnector.objects.get(id=connector_id, is_active=True)
        except HRMSConnector.DoesNotExist:
            return {"success": False, "error": "HRMS connector not found"}

        try:
            org_counts = cls.sync_organization(connector)
        except Exception as exc:
            logger.warning("HRMS org sync skipped/failed for %s: %s", connector.name, exc)
            org_counts = {}

        url = f"{connector.base_url.rstrip('/')}/{connector.staff_endpoint.lstrip('/')}"
        headers = build_auth_headers(
            api_key=connector.api_key,
            username=connector.username,
            password=connector.password,
        )
        status_code, payload = get_json(url, headers)
        duration_ms = int((time.time() - start) * 1000)

        if status_code != 200:
            IntegrationLog.objects.create(
                log_type=IntegrationLog.LogType.HRMS,
                integration_id=connector.id,
                status=IntegrationLog.LogStatus.FAILED,
                message="HRMS staff sync failed",
                error_message=f"HTTP {status_code}",
                duration_ms=duration_ms,
            )
            return {"success": False, "error": f"HTTP {status_code}"}

        staff_rows = cls._extract_list(payload, "staff", "employees", "items", "results")
        mappings = connector.field_mappings or {}
        created = updated = deactivated = 0

        from organization.models import Department, Division

        for row in staff_rows:
            employee_id = cls._map_field(row, mappings, "employee_id", "")
            email = cls._map_field(row, mappings, "email", "").lower()
            if not employee_id and not email:
                continue

            status = cls._map_field(row, mappings, "status", "active").lower()
            first_name = cls._map_field(row, mappings, "first_name", "")
            last_name = cls._map_field(row, mappings, "last_name", "")
            grade_level = cls._map_field(row, mappings, "grade_level", "")

            division = None
            department = None
            division_code = cls._map_field(row, mappings, "division_code", "")
            department_code = cls._map_field(row, mappings, "department_code", "")
            if division_code:
                division = Division.objects.filter(code=division_code.upper()).first()
            if department_code:
                department = Department.objects.filter(code=department_code.upper()).first()

            user = None
            if employee_id:
                user = User.objects.filter(employee_id=employee_id).first()
            if not user and email:
                user = User.objects.filter(email__iexact=email).first()

            username = email.split("@")[0] if email else employee_id.lower()
            if not user:
                if status in EXIT_STATUSES and connector.deactivate_exited_staff:
                    continue
                user = User.objects.create(
                    username=username,
                    email=email or f"{username}@npa.local",
                    first_name=first_name,
                    last_name=last_name,
                    employee_id=employee_id,
                    grade_level=grade_level,
                    division=division,
                    department=department,
                    is_active=True,
                )
                user.set_unusable_password()
                user.save(update_fields=["password"])
                created += 1
            else:
                user.first_name = first_name or user.first_name
                user.last_name = last_name or user.last_name
                user.email = email or user.email
                user.employee_id = employee_id or user.employee_id
                user.grade_level = grade_level or user.grade_level
                if division:
                    user.division = division
                if department:
                    user.department = department
                if connector.deactivate_exited_staff and status in EXIT_STATUSES:
                    user.is_active = False
                    deactivated += 1
                else:
                    user.is_active = True
                user.save()
                updated += 1

        connector.last_synced_at = timezone.now()
        connector.save(update_fields=["last_synced_at", "updated_at"])

        result = {
            "success": True,
            "staff_created": created,
            "staff_updated": updated,
            "staff_deactivated": deactivated,
            "org": org_counts,
        }
        IntegrationLog.objects.create(
            log_type=IntegrationLog.LogType.HRMS,
            integration_id=connector.id,
            status=IntegrationLog.LogStatus.SUCCESS,
            message="HRMS sync completed",
            details=result,
            duration_ms=duration_ms,
        )
        return result

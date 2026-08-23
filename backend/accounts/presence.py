"""Online presence helpers for admin dashboards."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

ONLINE_PRESENCE_WINDOW = timedelta(minutes=2)


def online_presence_cutoff():
    return timezone.now() - ONLINE_PRESENCE_WINDOW


def count_online_users() -> int:
    from accounts.models import User

    return User.objects.filter(
        is_active=True,
        last_activity__gte=online_presence_cutoff(),
    ).count()


def list_online_users():
    from accounts.models import User

    users = User.objects.filter(
        is_active=True,
        last_activity__gte=online_presence_cutoff(),
    ).select_related("system_role")

    result = []
    for u in users:
        role_label = ""
        if u.is_superuser:
            role_label = "Super Admin"
        elif u.system_role:
            role_label = u.system_role.name
        result.append(
            {
                "id": u.id,
                "name": u.get_full_name() or u.email,
                "email": u.email,
                "role": role_label,
                "lastActivity": u.last_activity.isoformat() if u.last_activity else None,
            }
        )
    return result


def presence_window_seconds() -> int:
    return int(ONLINE_PRESENCE_WINDOW.total_seconds())

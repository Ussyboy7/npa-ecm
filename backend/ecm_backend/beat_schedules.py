"""Canonical Celery Beat schedule definitions for NPA-ECM."""

from __future__ import annotations

from celery.schedules import crontab

# Used by CELERY_BEAT_SCHEDULE in settings and setup_celery_beat management command.
CELERY_BEAT_SCHEDULE = {
    "analytics-check-sla-and-escalate": {
        "task": "analytics.check_sla_and_escalate",
        "schedule": crontab(minute="*/15"),
        "options": {"expires": 60 * 14},
    },
    "analytics-generate-daily-snapshots": {
        "task": "analytics.generate_daily_snapshots",
        "schedule": crontab(hour=0, minute=5),
        "options": {"expires": 60 * 60},
    },
    "analytics-generate-weekly-staff-snapshots": {
        "task": "analytics.generate_weekly_staff_snapshots",
        "schedule": crontab(hour=1, minute=0, day_of_week="monday"),
        "options": {"expires": 60 * 60 * 6},
    },
    "analytics-send-daily-digest": {
        "task": "analytics.send_daily_digest",
        "schedule": crontab(hour=8, minute=0),
        "options": {"expires": 60 * 60},
    },
    "integrations-retry-failed-webhooks": {
        "task": "integrations.tasks.retry_failed_webhooks",
        "schedule": crontab(minute="*/30"),
        "options": {"expires": 60 * 25},
    },
    "records-generate-due-disposals": {
        "task": "records.generate_due_disposals",
        "schedule": crontab(hour=2, minute=30),
        "options": {"expires": 60 * 60},
    },
    "integrations-poll-imap-inboxes": {
        "task": "integrations.tasks.poll_imap_inboxes",
        "schedule": crontab(minute="*/10"),
        "options": {"expires": 60 * 9},
    },
    "integrations-sync-hrms": {
        "task": "integrations.tasks.sync_hrms_connectors",
        "schedule": crontab(minute=0, hour="*/6"),
        "options": {"expires": 60 * 60 * 5},
    },
    "integrations-sync-erp": {
        "task": "integrations.tasks.sync_erp_connectors",
        "schedule": crontab(minute=15),
        "options": {"expires": 60 * 50},
    },
}

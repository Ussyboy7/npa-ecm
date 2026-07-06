"""Seed django-celery-beat PeriodicTask rows from canonical schedule definitions."""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django_celery_beat.models import CrontabSchedule, PeriodicTask

from ecm_backend.beat_schedules import CELERY_BEAT_SCHEDULE


class Command(BaseCommand):
    help = "Create or update Celery Beat periodic tasks (idempotent)."

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for name, entry in CELERY_BEAT_SCHEDULE.items():
            schedule = entry["schedule"]
            if not hasattr(schedule, "minute"):
                self.stdout.write(self.style.ERROR(f"Unsupported schedule for '{name}' — skipped"))
                continue

            crontab, _ = CrontabSchedule.objects.get_or_create(
                minute=str(schedule.minute),
                hour=str(schedule.hour),
                day_of_week=str(schedule.day_of_week),
                day_of_month=str(schedule.day_of_month),
                month_of_year=str(schedule.month_of_year),
                timezone=schedule.tz or None,
            )

            task, was_created = PeriodicTask.objects.update_or_create(
                name=name,
                defaults={
                    "task": entry["task"],
                    "crontab": crontab,
                    "interval": None,
                    "enabled": True,
                    "kwargs": "{}",
                    "args": "[]",
                },
            )

            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"Created periodic task '{name}'"))
            else:
                updated += 1
                self.stdout.write(f"Updated periodic task '{name}'")

        self.stdout.write(self.style.SUCCESS(f"Done. created={created}, updated={updated}"))

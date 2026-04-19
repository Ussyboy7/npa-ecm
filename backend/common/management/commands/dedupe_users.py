from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count, QuerySet


User = get_user_model()


@dataclass(frozen=True)
class FieldDup:
    field: str
    value: str
    count: int


def _non_empty(qs: QuerySet, field: str) -> QuerySet:
    return qs.exclude(**{f"{field}__isnull": True}).exclude(**{f"{field}__exact": ""})


def _find_duplicates(qs: QuerySet, field: str) -> list[FieldDup]:
    rows = (
        _non_empty(qs, field)
        .values(field)
        .annotate(c=Count("id"))
        .filter(c__gt=1)
        .order_by("-c")
    )
    return [FieldDup(field=field, value=row[field], count=row["c"]) for row in rows]


def _user_score(user) -> tuple:
    return (
        1 if getattr(user, "is_superuser", False) else 0,
        1 if getattr(user, "is_staff", False) else 0,
        1 if getattr(user, "is_active", False) else 0,
        1 if getattr(user, "last_login", None) else 0,
        1 if getattr(user, "last_activity", None) else 0,
        getattr(user, "last_activity", None) or getattr(user, "last_login", None) or getattr(user, "date_joined", None),
    )


def _choose_canonical(users: Iterable) -> object:
    return sorted(users, key=lambda u: (_user_score(u), str(u.pk)), reverse=True)[0]


def _dedupe_email(email: str, user_pk: str) -> str:
    if "@" not in email:
        return f"{email}.dup-{user_pk}"
    local, domain = email.split("@", 1)
    return f"{local}+dup-{user_pk}@{domain}"


def _dedupe_employee_id(employee_id: str, user_pk: str) -> str:
    suffix = user_pk[:8]
    return f"{employee_id}-DUP-{suffix}"


class Command(BaseCommand):
    help = "Deactivate duplicate users (by email/employee_id) and make identifiers unique."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Apply changes (default is dry-run).")
        parser.add_argument(
            "--include-inactive",
            action="store_true",
            help="Consider inactive users when detecting duplicates (default: only active users).",
        )
        parser.add_argument(
            "--fields",
            default="email,employee_id",
            help="Comma-separated fields to dedupe: email,employee_id (default: email,employee_id).",
        )

    def handle(self, *args, **options):
        apply_changes: bool = options["apply"]
        include_inactive: bool = options["include_inactive"]
        fields = [f.strip() for f in str(options["fields"]).split(",") if f.strip()]
        fields = [f for f in fields if f in {"email", "employee_id"}]
        if not fields:
            self.stdout.write(self.style.ERROR("No valid fields supplied. Use --fields=email,employee_id"))
            return

        base_qs = User.objects.all()
        if not include_inactive:
            base_qs = base_qs.filter(is_active=True)

        duplicates: list[FieldDup] = []
        for field in fields:
            duplicates.extend(_find_duplicates(base_qs, field))

        if not duplicates:
            self.stdout.write(self.style.SUCCESS("No duplicates found for selected fields."))
            return

        self.stdout.write(
            self.style.WARNING(
                f"Found {len(duplicates)} duplicate groups across fields={fields} "
                f"(scope={'all users' if include_inactive else 'active users'})."
            )
        )

        processed_user_ids: set[str] = set()
        planned_updates: list[tuple[str, str, str]] = []

        @transaction.atomic
        def _run():
            for dup in duplicates:
                group_users = list(User.objects.filter(**{dup.field: dup.value}).order_by("id"))
                if not include_inactive:
                    group_users = [u for u in group_users if getattr(u, "is_active", False)]
                if len(group_users) <= 1:
                    continue

                canonical = _choose_canonical(group_users)
                canonical_id = str(canonical.pk)
                self.stdout.write(
                    f"{dup.field}={dup.value} → keep {canonical.username} ({canonical_id}), "
                    f"deactivate {len(group_users) - 1}"
                )

                for u in group_users:
                    if str(u.pk) == canonical_id:
                        continue
                    if str(u.pk) in processed_user_ids:
                        continue
                    processed_user_ids.add(str(u.pk))

                    update_fields: list[str] = []

                    if dup.field == "email" and u.email:
                        new_email = _dedupe_email(u.email, str(u.pk))
                        if new_email != u.email:
                            planned_updates.append((str(u.pk), "email", new_email))
                            u.email = new_email
                            update_fields.append("email")

                    if dup.field == "employee_id" and getattr(u, "employee_id", ""):
                        new_emp = _dedupe_employee_id(getattr(u, "employee_id"), str(u.pk))
                        if new_emp != getattr(u, "employee_id"):
                            planned_updates.append((str(u.pk), "employee_id", new_emp))
                            u.employee_id = new_emp
                            update_fields.append("employee_id")

                    if getattr(u, "is_active", False):
                        planned_updates.append((str(u.pk), "is_active", "False"))
                        u.is_active = False
                        update_fields.append("is_active")

                    if apply_changes and update_fields:
                        u.save(update_fields=sorted(set(update_fields)))

            if not apply_changes:
                transaction.set_rollback(True)

        _run()

        if apply_changes:
            self.stdout.write(self.style.SUCCESS(f"Applied {len(planned_updates)} field updates across users."))
        else:
            self.stdout.write(self.style.WARNING(f"Dry-run: planned {len(planned_updates)} field updates (no changes applied)."))

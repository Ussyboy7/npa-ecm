from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Model


User = get_user_model()

ALIAS_CANONICAL: dict[str, str] = {
    "user-md": "md",
    "user-ed-fa": "edfa",
    "user-ed-mo": "edmo",
    "user-ed-ets": "edets",
    "user-gm-ict": "gmict",
    "user-pa-md": "pamd",
}


@dataclass(frozen=True)
class Candidate:
    user: Model
    reason: str


def _base_employee_id(employee_id: str) -> str | None:
    if not employee_id:
        return None
    for marker in ("-DUP-", "-SEED-"):
        if marker in employee_id:
            return employee_id.split(marker, 1)[0]
    return None


def _base_email(email: str) -> str | None:
    if not email or "@" not in email:
        return None
    local, domain = email.split("@", 1)
    for marker in ("+dup-", "+seed-"):
        if marker in local:
            return f"{local.split(marker, 1)[0]}@{domain}"
    return None


def _has_related_objects(user: Model) -> bool:
    for rel in user._meta.related_objects:
        if not getattr(rel, "auto_created", False):
            continue
        if rel.hidden:
            continue
        accessor = rel.get_accessor_name()
        try:
            manager = getattr(user, accessor)
        except Exception:
            continue

        try:
            if hasattr(manager, "exists") and manager.exists():
                return True
        except Exception:
            continue
    return False


def _reassign_relations(src: Model, dst: Model) -> int:
    updated = 0
    for rel in src._meta.related_objects:
        if not getattr(rel, "auto_created", False):
            continue
        if rel.hidden:
            continue
        if rel.one_to_many:
            related_model = rel.related_model
            field_name = rel.field.name
            updated += related_model.objects.filter(**{field_name: src}).update(**{field_name: dst})
        if rel.many_to_many:
            accessor = rel.get_accessor_name()
            try:
                manager = getattr(src, accessor)
            except Exception:
                manager = None
            if manager is None:
                continue

            through = rel.through
            user_field = rel.field.m2m_reverse_field_name()
            obj_field = rel.field.m2m_field_name()
            src_obj_ids = list(
                through.objects.filter(**{user_field: src}).values_list(f"{obj_field}_id", flat=True)
            )
            for obj_id in src_obj_ids:
                if through.objects.filter(**{user_field: dst, f"{obj_field}_id": obj_id}).exists():
                    updated += through.objects.filter(**{user_field: src, f"{obj_field}_id": obj_id}).delete()[0]
                    continue
                updated += through.objects.filter(**{user_field: src, f"{obj_field}_id": obj_id}).update(**{user_field: dst})
        if rel.one_to_one:
            accessor = rel.get_accessor_name()
            related_obj = getattr(src, accessor, None)
            if related_obj is None:
                continue
            dst_has_obj = False
            try:
                getattr(dst, accessor)
                dst_has_obj = True
            except Exception:
                dst_has_obj = False

            if dst_has_obj:
                related_obj.delete()
                updated += 1
                continue

            setattr(related_obj, rel.field.name, dst)
            related_obj.save(update_fields=[rel.field.name])
            updated += 1
    return updated


class Command(BaseCommand):
    help = "Delete inactive duplicate users (dedupe/seed artifacts) and keep one canonical record."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Apply changes (default is dry-run).")
        parser.add_argument(
            "--force",
            action="store_true",
            help="Delete even if related objects exist (will attempt reassignment first).",
        )

    def handle(self, *args, **options):
        apply_changes: bool = options["apply"]
        force: bool = options["force"]

        candidates: list[Candidate] = []
        for u in User.objects.filter(is_active=False):
            email = (getattr(u, "email", "") or "").strip().lower()
            employee_id = (getattr(u, "employee_id", "") or "").strip()
            if ("+dup-" in email) or ("+seed-" in email):
                candidates.append(Candidate(user=u, reason="email"))
                continue
            if ("-DUP-" in employee_id) or ("-SEED-" in employee_id):
                candidates.append(Candidate(user=u, reason="employee_id"))
                continue

        if not candidates:
            self.stdout.write(self.style.SUCCESS("No inactive duplicate artifacts found."))
            return

        deleted = 0
        reassigned = 0
        skipped = 0

        for c in candidates:
            u = c.user
            email = (getattr(u, "email", "") or "").strip().lower()
            employee_id = (getattr(u, "employee_id", "") or "").strip()

            canonical = None
            base_emp = _base_employee_id(employee_id)
            if base_emp:
                canonical = User.objects.filter(is_active=True, employee_id=base_emp).first()
            if canonical is None:
                base_em = _base_email(email)
                if base_em:
                    canonical = User.objects.filter(is_active=True, email=base_em).first()
            if canonical is None:
                alias = ALIAS_CANONICAL.get(getattr(u, "username", ""))
                if alias:
                    canonical = User.objects.filter(is_active=True, username=alias).first()

            has_related = _has_related_objects(u)
            if canonical is None and has_related and not force:
                self.stdout.write(self.style.WARNING(f"Skip {u.username} ({u.pk}) no canonical and has relations"))
                skipped += 1
                continue

            if not apply_changes:
                self.stdout.write(
                    f"Delete {u.username} ({u.pk}) reason={c.reason}"
                    + (f" canonical={canonical.username} ({canonical.pk})" if canonical is not None else "")
                )
                deleted += 1
                continue

            try:
                with transaction.atomic():
                    if canonical is not None and (has_related or force):
                        reassigned += _reassign_relations(u, canonical)

                    if _has_related_objects(u) and not force:
                        raise RuntimeError("still has relations after reassignment")

                    self.stdout.write(
                        f"Delete {u.username} ({u.pk}) reason={c.reason}"
                        + (f" canonical={canonical.username} ({canonical.pk})" if canonical is not None else "")
                    )
                    u.delete()
                    deleted += 1
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f"Skip {u.username} ({u.pk}) error={exc}"))
                skipped += 1

        if apply_changes:
            self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} users, reassigned {reassigned} relations, skipped {skipped}."))
        else:
            self.stdout.write(self.style.WARNING(f"Dry-run: would delete {deleted} users, reassign {reassigned} relations, skip {skipped}."))

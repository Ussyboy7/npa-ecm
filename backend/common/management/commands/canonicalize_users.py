"""Merge org-chart seed shell users into canonical login usernames."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import IntegrityError, transaction
from django.db.models import ManyToManyField

from common.user_identity import (
    canonical_email,
    canonical_employee_id,
    canonical_username,
    is_seed_email,
    is_seed_shell_username,
)

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Normalize users so org-chart ids (user-gm-procurement) collapse into "
        "login usernames (gmprocurement). Merges duplicates and renames shells."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show planned merges/renames without writing.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        shells = list(
            User.objects.filter(username__startswith="user-").order_by("id")
        )
        # Also catch any leftover +seed emails on non-user-* names (should be rare).
        extra = list(
            User.objects.filter(email__icontains="+seed-")
            .exclude(username__startswith="user-")
            .order_by("id")
        )
        candidates = shells + extra

        merged = renamed = skipped = 0
        for shell in candidates:
            target_username = canonical_username(shell.username)
            if not target_username or target_username == shell.username:
                if is_seed_email(shell.email):
                    cleaned = canonical_email(shell.email)
                    if cleaned and cleaned != shell.email:
                        conflict = (
                            User.objects.filter(email__iexact=cleaned)
                            .exclude(pk=shell.pk)
                            .first()
                        )
                        if conflict:
                            self.stdout.write(
                                f"MERGE-BY-EMAIL {shell.username} ({shell.id}) "
                                f"-> {conflict.username} ({conflict.id})"
                            )
                            if not dry_run:
                                self._merge_users(shell, conflict)
                            merged += 1
                        elif not dry_run:
                            shell.email = cleaned
                            shell.employee_id = (
                                canonical_employee_id(shell.employee_id or "")
                                or shell.employee_id
                            )
                            shell.save(update_fields=["email", "employee_id"])
                            renamed += 1
                        else:
                            renamed += 1
                    else:
                        skipped += 1
                else:
                    skipped += 1
                continue

            target = User.objects.filter(username=target_username).exclude(pk=shell.pk).first()
            if target:
                self.stdout.write(
                    f"MERGE {shell.username} ({shell.id}, {shell.email}) "
                    f"-> {target.username} ({target.id}, {target.email})"
                )
                if not dry_run:
                    self._merge_users(shell, target)
                merged += 1
            else:
                new_email = canonical_email(shell.email) or shell.email
                email_owner = (
                    User.objects.filter(email__iexact=new_email).exclude(pk=shell.pk).first()
                    if new_email
                    else None
                )
                if email_owner:
                    self.stdout.write(
                        f"MERGE-BY-EMAIL {shell.username} ({shell.id}) "
                        f"-> {email_owner.username} ({email_owner.id})"
                    )
                    if not dry_run:
                        self._merge_users(shell, email_owner)
                    merged += 1
                    continue

                self.stdout.write(
                    f"RENAME {shell.username} ({shell.id}) -> {target_username} "
                    f"email={new_email}"
                )
                if not dry_run:
                    shell.username = target_username
                    if new_email:
                        shell.email = new_email
                    cleaned_emp = canonical_employee_id(shell.employee_id or "")
                    if cleaned_emp:
                        shell.employee_id = cleaned_emp
                    shell.save(update_fields=["username", "email", "employee_id"])
                renamed += 1

        action = "Would apply" if dry_run else "Applied"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action}: merged={merged} renamed={renamed} skipped={skipped}"
            )
        )

    def _merge_users(self, source: User, target: User) -> None:
        """Reassign all User FKs/M2Ms from source → target, then delete source."""
        with transaction.atomic():
            # Prefer target's clean email / employee_id; fill gaps from source.
            updates: list[str] = []
            src_email = canonical_email(source.email)
            if src_email and (is_seed_email(target.email) or not target.email):
                if not User.objects.filter(email__iexact=src_email).exclude(pk=target.pk).exists():
                    target.email = src_email
                    updates.append("email")
            src_emp = canonical_employee_id(source.employee_id or "")
            if src_emp and (
                not target.employee_id or str(target.employee_id).upper().find("SEED") >= 0
            ):
                if not User.objects.filter(employee_id=src_emp).exclude(pk=target.pk).exists():
                    target.employee_id = src_emp
                    updates.append("employee_id")
            for field in ("first_name", "last_name", "grade_level"):
                if not getattr(target, field) and getattr(source, field):
                    setattr(target, field, getattr(source, field))
                    updates.append(field)
            if source.system_role_id and not target.system_role_id:
                target.system_role_id = source.system_role_id
                updates.append("system_role_id")
            if source.division_id and not target.division_id:
                target.division_id = source.division_id
                updates.append("division_id")
            if source.department_id and not target.department_id:
                target.department_id = source.department_id
                updates.append("department_id")
            if source.directorate_id and not target.directorate_id:
                target.directorate_id = source.directorate_id
                updates.append("directorate_id")
            if updates:
                target.save(update_fields=list(dict.fromkeys(updates)))

            self._reassign_relations(source, target)
            source.delete()

    def _reassign_relations(self, source: User, target: User) -> None:
        for rel in source._meta.related_objects:
            accessor = rel.get_accessor_name()
            if not accessor:
                continue

            if rel.many_to_many:
                try:
                    manager = getattr(source, accessor)
                except AttributeError:
                    continue
                field_name = rel.field.name
                for obj in list(manager.all()):
                    m2m = getattr(obj, field_name)
                    m2m.remove(source)
                    m2m.add(target)
                continue

            if rel.one_to_one:
                try:
                    related_obj = getattr(source, accessor)
                except Exception:
                    continue
                if related_obj is None:
                    continue
                try:
                    getattr(target, accessor)
                    # Target already has this O2O row — drop the shell's copy.
                    related_obj.delete()
                    continue
                except Exception:
                    pass
                fk_name = rel.field.name
                try:
                    setattr(related_obj, fk_name, target)
                    related_obj.save(update_fields=[fk_name])
                except IntegrityError:
                    related_obj.delete()
                continue

            if rel.one_to_many:
                fk_name = rel.field.name
                manager = getattr(source, accessor)
                for obj in list(manager.all()):
                    try:
                        setattr(obj, fk_name, target)
                        obj.save(update_fields=[fk_name])
                    except IntegrityError:
                        # Unique constraint: target already owns an equivalent row.
                        obj.delete()

        # Forward M2M on User itself (rare)
        for field in source._meta.local_many_to_many:
            if not isinstance(field, ManyToManyField):
                continue
            source_m2m = getattr(source, field.name)
            target_m2m = getattr(target, field.name)
            for obj in source_m2m.all():
                target_m2m.add(obj)
            source_m2m.clear()

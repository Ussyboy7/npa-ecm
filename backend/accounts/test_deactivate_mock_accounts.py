"""Tests for the deactivate_mock_accounts management command."""

from __future__ import annotations

import csv
from io import StringIO
from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from accounts.models import User
from audit.models import ActivityLog
from organization.models import Office, OfficeMembership

pytestmark = pytest.mark.django_db


def make_user(username: str, *, employee_id: str = "") -> User:
    return User.objects.create_user(
        username=username,
        password="ChangeMe123!",
        email=f"{username}@example.test",
        employee_id=employee_id,
    )


def make_office(code: str) -> Office:
    return Office.objects.create(name=f"Office {code}", code=code)


def assign(user: User, office: Office, role: str, *, primary: bool = True) -> OfficeMembership:
    return OfficeMembership.objects.create(
        user=user,
        office=office,
        assignment_role=role,
        is_primary=primary,
        is_active=True,
    )


def run_command(tmp_path: Path, *args: str) -> tuple[Path, Path]:
    accounts_path = tmp_path / "accounts.csv"
    call_command(
        "deactivate_mock_accounts",
        "--out",
        str(accounts_path),
        *args,
        stdout=StringIO(),
        stderr=StringIO(),
    )
    return accounts_path, accounts_path.with_name("accounts-memberships.csv")


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def test_dry_run_exports_accounts_and_memberships_without_changes(tmp_path: Path) -> None:
    mock = make_user("agmabuja")
    real = make_user("realprincipal", employee_id="9001")
    office = make_office("T-DRY")
    assign(mock, office, OfficeMembership.AssignmentRole.PRINCIPAL)
    assign(real, office, OfficeMembership.AssignmentRole.PRINCIPAL)

    accounts_path, memberships_path = run_command(tmp_path)

    accounts = read_rows(accounts_path)
    row = next(item for item in accounts if item["username"] == "agmabuja")
    assert row["proposed_action"] == "WOULD_DEACTIVATE"
    assert row["mock_only_principal_offices"] == ""
    assert row["active_membership_count"] == "1"

    memberships = read_rows(memberships_path)
    assert any(
        item["username"] == "agmabuja"
        and item["office_code"] == "T-DRY"
        and item["membership_action"] == "WOULD_DISABLE"
        for item in memberships
    )

    mock.refresh_from_db()
    assert mock.is_active
    assert mock.has_usable_password()
    assert OfficeMembership.objects.filter(user=mock, is_active=True).count() == 1


def test_apply_refuses_and_changes_nothing_when_mock_only_office_principal(tmp_path: Path) -> None:
    mock = make_user("agmabuja")
    other_mock = make_user("agmbms")
    office = make_office("T-ONLY")
    assign(mock, office, OfficeMembership.AssignmentRole.PRINCIPAL)
    # A second mock principal must not count as real coverage.
    assign(other_mock, office, OfficeMembership.AssignmentRole.PRINCIPAL)

    with pytest.raises(CommandError, match="Refusing --apply"):
        run_command(tmp_path, "--apply")

    for user in (mock, other_mock):
        user.refresh_from_db()
        assert user.is_active
        assert OfficeMembership.objects.filter(user=user, is_active=True).exists()


def test_apply_deactivates_account_memberships_and_writes_audit(tmp_path: Path) -> None:
    mock = make_user("agmabuja")
    real = make_user("realprincipal", employee_id="9001")
    office = make_office("T-OK")
    assign(mock, office, OfficeMembership.AssignmentRole.STAFF)
    assign(real, office, OfficeMembership.AssignmentRole.PRINCIPAL)

    run_command(tmp_path, "--apply")

    mock.refresh_from_db()
    assert not mock.is_active
    assert not mock.is_staff
    assert not mock.has_usable_password()
    assert not OfficeMembership.objects.get(user=mock).is_active
    assert ActivityLog.objects.filter(
        object_id=str(mock.pk), module="accounts", success=True
    ).exists()
    # The real colleague is untouched.
    real.refresh_from_db()
    assert real.is_active


def test_allow_headless_offices_permits_deactivation(tmp_path: Path) -> None:
    mock = make_user("agmabuja")
    office = make_office("T-HEADLESS")
    assign(mock, office, OfficeMembership.AssignmentRole.PRINCIPAL)

    run_command(tmp_path, "--apply", "--allow-headless-offices")

    mock.refresh_from_db()
    assert not mock.is_active
    assert not OfficeMembership.objects.get(user=mock).is_active


def test_already_inactive_mock_accounts_are_ignored(tmp_path: Path) -> None:
    make_user("agmabuja")
    removed = make_user("agmbms")
    removed.is_active = False
    removed.save(update_fields=["is_active"])

    accounts_path, _ = run_command(tmp_path)

    usernames = {row["username"] for row in read_rows(accounts_path)}
    assert usernames == {"agmabuja"}


def test_hold_accounts_are_reported_and_never_deactivated(tmp_path: Path) -> None:
    held = make_user("superadmin")
    office = make_office("T-HOLD")
    assign(held, office, OfficeMembership.AssignmentRole.PRINCIPAL)

    with pytest.raises(CommandError, match="Nothing to apply"):
        run_command(tmp_path, "--apply")

    accounts_path = tmp_path / "accounts.csv"
    rows = read_rows(accounts_path)
    assert rows[0]["username"] == "superadmin"
    assert rows[0]["proposed_action"] == "HOLD"

    held.refresh_from_db()
    assert held.is_active
    assert OfficeMembership.objects.get(user=held).is_active

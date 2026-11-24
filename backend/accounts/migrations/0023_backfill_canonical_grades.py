"""Align stored users with the canonical fourteen-grade hierarchy.

``GMCS``/``AGMCS`` were retired in favour of ``MSS1``/``MSS2``, and the
management band now starts at Assistant Manager (``SSS1``). The nominal-roll
importer writes ``grade_level`` but never ``is_management``, so both stored
copies drifted from the served catalogue. The flag is derived state; this
backfill makes it agree with the band again.

Forward-only: the retired codes and the previous flag values cannot be
reconstructed reliably, so the reverse is a no-op.
"""

from django.db import migrations

from common.grade_utils import MANAGEMENT_GRADES

RETIRED_GRADE_CODES: dict[str, str] = {
    "GMCS": "MSS1",
    "AGMCS": "MSS2",
}


def backfill_canonical_grades(apps, schema_editor):
    User = apps.get_model("accounts", "User")

    # Match trimmed, case-insensitive stored values so hand-edited rows are
    # mapped too, then write each canonical code once.
    replacements: dict[str, list[int]] = {
        canonical: [] for canonical in RETIRED_GRADE_CODES.values()
    }
    for user_id, grade_level in User.objects.values_list("id", "grade_level").iterator():
        canonical = RETIRED_GRADE_CODES.get((grade_level or "").strip().upper())
        if canonical:
            replacements[canonical].append(user_id)

    for canonical_code, user_ids in replacements.items():
        if user_ids:
            User.objects.filter(pk__in=user_ids).update(grade_level=canonical_code)

    # Derive the flag from the same band the catalogue serves rather than
    # flipping only Assistant Managers, which would leave the rest of the band
    # inconsistent. Users outside the band are left alone.
    User.objects.filter(
        grade_level__in=sorted(MANAGEMENT_GRADES),
        is_management=False,
    ).update(is_management=True)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0022_user_profile_fields"),
    ]

    operations = [
        migrations.RunPython(
            backfill_canonical_grades,
            migrations.RunPython.noop,
        ),
    ]

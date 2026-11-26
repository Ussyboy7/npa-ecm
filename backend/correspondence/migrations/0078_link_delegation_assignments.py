"""Link legacy per-record delegations to the assignment they came from.

Only rows with a matching principal/assistant assignment are linked. Rows whose
assignment is gone are left untouched: withdrawing a live delegation is an
organisational decision, taken with
``manage.py link_delegation_assignments --apply --revoke-unmatched``.
"""

from django.db import migrations


def link_assignments(apps, schema_editor):
    Delegation = apps.get_model("correspondence", "Delegation")
    CorrespondenceDelegation = apps.get_model(
        "correspondence", "CorrespondenceDelegation"
    )

    unlinked = CorrespondenceDelegation.objects.filter(
        delegation__isnull=True
    ).only("id", "principal_id", "assistant_id")

    for row in unlinked.iterator():
        assignment_id = (
            Delegation.objects.filter(
                principal_id=row.principal_id,
                assistant_id=row.assistant_id,
            )
            .values_list("id", flat=True)
            .first()
        )
        if assignment_id is None:
            continue
        CorrespondenceDelegation.objects.filter(
            pk=row.pk, delegation__isnull=True
        ).update(delegation_id=assignment_id)


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0077_correspondencedelegation_assistant_type_and_more"),
    ]

    operations = [
        migrations.RunPython(link_assignments, migrations.RunPython.noop),
    ]

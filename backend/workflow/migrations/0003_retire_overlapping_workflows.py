"""Retire overlapping demo workflow templates from the catalog."""

from django.db import migrations

RETIRED_SLUGS = (
    "directorate-approval",
    "executive-approval",
    "parallel-review",
    "for-information-only",
)


def retire_overlapping_workflows(apps, schema_editor):
    WorkflowTemplate = apps.get_model("workflow", "WorkflowTemplate")
    # Cascades steps; ApprovalTask.template is SET_NULL so historical tasks stay.
    WorkflowTemplate.objects.filter(slug__in=RETIRED_SLUGS).delete()


def noop_reverse(apps, schema_editor):
    # Seed will recreate the kept catalog; retired templates are intentional removals.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("workflow", "0002_workflowstep_directorate_workflowstep_office"),
    ]

    operations = [
        migrations.RunPython(retire_overlapping_workflows, noop_reverse),
    ]

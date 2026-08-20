"""Deduplicate organization document templates and enforce uniqueness."""

from django.db import migrations, models
from django.db.models import Count, Q


def dedupe_templates(apps, schema_editor):
    CorrespondenceTemplate = apps.get_model("correspondence", "CorrespondenceTemplate")

    # Exact org-scope duplicates from repeated seeds (NULL scope_id breaks unique matching).
    dup_groups = (
        CorrespondenceTemplate.objects.values("title", "scope", "scope_id", "template_type")
        .annotate(n=Count("id"))
        .filter(n__gt=1)
    )
    for group in dup_groups:
        rows = list(
            CorrespondenceTemplate.objects.filter(
                title=group["title"],
                scope=group["scope"],
                scope_id=group["scope_id"],
                template_type=group["template_type"],
            ).order_by("created_at", "id")
        )
        # Keep the oldest; drop the rest.
        for row in rows[1:]:
            row.delete()


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0055_seed_minute_templates"),
    ]

    operations = [
        migrations.RunPython(dedupe_templates, noop_reverse),
        migrations.AddConstraint(
            model_name="correspondencetemplate",
            constraint=models.UniqueConstraint(
                fields=("title", "scope", "template_type"),
                condition=Q(scope_id__isnull=True),
                name="uniq_corr_template_null_scope",
            ),
        ),
        migrations.AddConstraint(
            model_name="correspondencetemplate",
            constraint=models.UniqueConstraint(
                fields=("title", "scope", "scope_id", "template_type"),
                condition=Q(scope_id__isnull=False),
                name="uniq_corr_template_scoped",
            ),
        ),
    ]

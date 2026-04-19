from django.db import migrations, models
from django.db.models import F, Q


def forward_backfill_treatment_response(apps, schema_editor):
    Correspondence = apps.get_model("correspondence", "Correspondence")
    Minute = apps.get_model("correspondence", "Minute")

    treated_ids = Minute.objects.filter(action_type="treat").values_list("correspondence_id", flat=True).distinct()

    Correspondence.objects.filter(
        id__in=treated_ids,
    ).filter(
        Q(treatment_response__isnull=True) | Q(treatment_response=""),
    ).exclude(
        Q(summary__isnull=True) | Q(summary=""),
    ).update(
        treatment_response=F("summary")
    )


def reverse_backfill_treatment_response(apps, schema_editor):
    # Keep reverse migration non-destructive.
    return


class Migration(migrations.Migration):

    dependencies = [
        ("correspondence", "0026_correspondencedraft"),
    ]

    operations = [
        migrations.AddField(
            model_name="correspondence",
            name="treatment_response",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.RunPython(
            forward_backfill_treatment_response,
            reverse_backfill_treatment_response,
        ),
    ]

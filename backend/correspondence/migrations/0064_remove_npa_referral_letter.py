"""Remove obsolete NPA Referral Letter template."""

from django.db import migrations


def remove_referral(apps, schema_editor):
    CorrespondenceTemplate = apps.get_model("correspondence", "CorrespondenceTemplate")
    CorrespondenceTemplate.objects.filter(title="NPA Referral Letter").delete()


def reverse_remove(apps, schema_editor):
    # Intentionally empty — referral letter is retired.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0063_align_memo_templates_word_headers"),
    ]

    operations = [
        migrations.RunPython(remove_referral, reverse_remove),
    ]

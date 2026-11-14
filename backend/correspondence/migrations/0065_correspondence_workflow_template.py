from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0064_remove_npa_referral_letter"),
        ("workflow", "0005_workflowtemplate_requires_departmental_endorsement"),
    ]

    operations = [
        migrations.AddField(
            model_name="correspondence",
            name="workflow_template",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="correspondence_items",
                to="workflow.workflowtemplate",
            ),
        ),
    ]
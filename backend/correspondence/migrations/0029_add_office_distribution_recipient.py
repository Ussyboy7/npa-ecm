from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organization", "0008_rename_org_dept_name_idx_organizatio_name_93bf26_idx_and_more"),
        ("correspondence", "0028_remove_correspondence_summary"),
    ]

    operations = [
        migrations.AddField(
            model_name="correspondencedistribution",
            name="office",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="office_distribution_entries",
                to="organization.office",
            ),
        ),
        migrations.AlterField(
            model_name="correspondencedistribution",
            name="recipient_type",
            field=models.CharField(
                choices=[
                    ("office", "Office"),
                    ("division", "Division"),
                    ("department", "Department"),
                    ("directorate", "Directorate"),
                    ("user", "User"),
                ],
                max_length=20,
            ),
        ),
    ]

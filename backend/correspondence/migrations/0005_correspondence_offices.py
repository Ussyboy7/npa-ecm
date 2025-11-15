from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("organization", "0004_office_officemembership"),
        ("correspondence", "0004_correspondence_is_deleted"),
    ]

    operations = [
        migrations.AddField(
            model_name="correspondence",
            name="current_office",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="inbox_correspondence",
                to="organization.office",
            ),
        ),
        migrations.AddField(
            model_name="correspondence",
            name="owning_office",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="owned_correspondence",
                to="organization.office",
            ),
        ),
        migrations.AddField(
            model_name="minute",
            name="from_office",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="minutes_from_office",
                to="organization.office",
            ),
        ),
        migrations.AddField(
            model_name="minute",
            name="to_office",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="minutes_to_office",
                to="organization.office",
            ),
        ),
    ]

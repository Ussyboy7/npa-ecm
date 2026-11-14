from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0013_remove_user_tiptap_editor_pilot"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="designation",
            field=models.CharField(
                blank=True,
                help_text="Human-readable job title from the nominal roll.",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="honorific",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="user",
            name="middle_name",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="user",
            name="personnel_number",
            field=models.CharField(
                blank=True,
                help_text="NPA Person No. (distinct from Employee ID).",
                max_length=50,
            ),
        ),
    ]

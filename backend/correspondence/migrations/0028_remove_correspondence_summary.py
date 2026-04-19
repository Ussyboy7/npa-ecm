from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("correspondence", "0027_correspondence_treatment_response"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="correspondence",
            name="summary",
        ),
    ]

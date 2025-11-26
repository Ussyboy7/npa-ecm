# Generated manually to add to_user field to Minute model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("correspondence", "0010_add_minute_recall_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="minute",
            name="to_user",
            field=models.ForeignKey(
                blank=True,
                help_text="Specific user recipient (for parallel routing or direct user routing)",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="minutes_received",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]


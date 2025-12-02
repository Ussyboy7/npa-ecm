# Generated migration for user activity tracking

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_add_2fa_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='last_activity',
            field=models.DateTimeField(blank=True, help_text='Last time the user was active in the system', null=True),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['last_activity'], name='accounts_us_last_ac_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['date_joined'], name='accounts_us_date_jo_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['last_login'], name='accounts_us_last_lo_idx'),
        ),
    ]


# Generated migration for per-minute dispatch/acknowledge lifecycle

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('correspondence', '0039_fix_template_date_ref_alignment'),
    ]

    operations = [
        migrations.AddField(
            model_name='minute',
            name='dispatched_at',
            field=models.DateTimeField(
                blank=True,
                help_text='When minute left sender\'s office',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='minute',
            name='acknowledged_at',
            field=models.DateTimeField(
                blank=True,
                help_text='When recipient opened/viewed the minute',
                null=True,
            ),
        ),
    ]

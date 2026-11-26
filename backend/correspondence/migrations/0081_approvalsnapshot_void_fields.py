from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('correspondence', '0080_acknowledge_legacy_notes'),
    ]

    operations = [
        migrations.AddField(
            model_name='approvalsnapshot',
            name='voided_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='approvalsnapshot',
            name='voided_reason',
            field=models.TextField(blank=True),
        ),
    ]

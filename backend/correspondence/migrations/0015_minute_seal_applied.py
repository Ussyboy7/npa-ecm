# Generated migration for seal_applied field

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_add_executive_signature_models'),
        ('correspondence', '0014_add_performed_by_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='minute',
            name='seal_applied',
            field=models.ForeignKey(
                blank=True,
                help_text='Digital seal applied when this minute was an executive approval',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='minutes',
                to='accounts.documentseal',
            ),
        ),
    ]


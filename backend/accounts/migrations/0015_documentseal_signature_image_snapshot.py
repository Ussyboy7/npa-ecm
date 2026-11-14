from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0014_user_personnel_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="documentseal",
            name="signature_image_snapshot",
            field=models.ImageField(
                blank=True,
                help_text="Signature image as it existed when this seal was issued",
                null=True,
                upload_to="seals/signatures/",
            ),
        ),
    ]

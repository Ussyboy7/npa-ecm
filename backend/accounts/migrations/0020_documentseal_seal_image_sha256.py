from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0019_encrypt_existing_signature_files"),
    ]

    operations = [
        migrations.AddField(
            model_name="documentseal",
            name="seal_image_sha256",
            field=models.CharField(
                blank=True,
                default="",
                help_text="SHA-256 of the server-rendered seal image",
                max_length=64,
            ),
        ),
    ]
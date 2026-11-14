from django.db import migrations, models
import django.db.models.deletion
import uuid

from common.field_encryption import encrypt_value
from common.fields import EncryptedCharField


def encrypt_existing_secrets(apps, schema_editor):
    connection = schema_editor.connection
    quote = connection.ops.quote_name
    fields = (
        ("ExecutiveSignature", "totp_secret"),
        ("LoginSecuritySettings", "totp_secret"),
        ("SealOTP", "code"),
    )
    for model_name, field_name in fields:
        model = apps.get_model("accounts", model_name)
        table = model._meta.db_table
        column = model._meta.get_field(field_name).column
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT {quote('id')}, {quote(column)} FROM {quote(table)}"
            )
            rows = cursor.fetchall()
            for row_id, raw in rows:
                if not raw or str(raw).startswith("enc:"):
                    continue
                cursor.execute(
                    f"UPDATE {quote(table)} SET {quote(column)} = %s "
                    f"WHERE {quote('id')} = %s",
                    [encrypt_value(str(raw)), row_id],
                )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0020_documentseal_seal_image_sha256"),
    ]

    operations = [
        migrations.AddField(
            model_name="loginsecuritysettings",
            name="totp_last_used_step",
            field=models.BigIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="executivesignature",
            name="email_otp_enabled",
            field=models.BooleanField(
                default=True,
                help_text="Allow email OTP as a seal second factor",
            ),
        ),
        migrations.AddField(
            model_name="executivesignature",
            name="totp_last_used_step",
            field=models.BigIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="loginsecuritysettings",
            name="totp_secret",
            field=EncryptedCharField(blank=True, max_length=255),
        ),
        migrations.AlterField(
            model_name="executivesignature",
            name="totp_secret",
            field=EncryptedCharField(
                blank=True,
                help_text="Base32 encoded TOTP secret for authenticator apps",
                max_length=255,
            ),
        ),
        migrations.AlterField(
            model_name="sealotp",
            name="code",
            field=EncryptedCharField(help_text="6-digit OTP code", max_length=255),
        ),
        migrations.CreateModel(
            name="BackupCode",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code_hash", models.CharField(max_length=256)),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="backup_codes",
                        to="accounts.user",
                    ),
                ),
            ],
            options={
                "ordering": ["created_at"],
                "indexes": [
                    models.Index(
                        fields=["user", "used_at"],
                        name="accounts_backup_user_used_idx",
                    )
                ],
            },
        ),
        migrations.RunPython(encrypt_existing_secrets, migrations.RunPython.noop),
    ]
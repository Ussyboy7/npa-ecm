# Generated manually for Phase 1 identity & permissions

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_signaturetemplate_usersignaturepreferences"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="auth_provider",
            field=models.CharField(
                blank=True,
                default="local",
                help_text="Authentication provider: local, oidc, etc.",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="external_auth_subject",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Stable subject identifier from external IdP (OIDC sub)",
                max_length=255,
            ),
        ),
        migrations.CreateModel(
            name="LoginSecuritySettings",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "mfa_enabled",
                    models.BooleanField(
                        default=False,
                        help_text="When enabled, user must verify MFA after password at login",
                    ),
                ),
                (
                    "mfa_required",
                    models.BooleanField(
                        default=False,
                        help_text="Administrator-forced MFA for this user",
                    ),
                ),
                ("totp_secret", models.CharField(blank=True, max_length=32)),
                ("totp_confirmed", models.BooleanField(default=False)),
                (
                    "preferred_method",
                    models.CharField(
                        choices=[("email", "Email OTP"), ("totp", "Authenticator App")],
                        default="email",
                        max_length=10,
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="login_security",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "Login security settings",
            },
        ),
    ]

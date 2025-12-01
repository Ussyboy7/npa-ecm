# Generated migration for 2FA fields

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_add_executive_signature_models'),
    ]

    operations = [
        # Add TOTP fields to ExecutiveSignature
        migrations.AddField(
            model_name='executivesignature',
            name='totp_secret',
            field=models.CharField(blank=True, help_text='Base32 encoded TOTP secret for authenticator apps', max_length=32),
        ),
        migrations.AddField(
            model_name='executivesignature',
            name='totp_enabled',
            field=models.BooleanField(default=False, help_text='Whether TOTP is enabled for this user'),
        ),
        migrations.AddField(
            model_name='executivesignature',
            name='totp_confirmed',
            field=models.BooleanField(default=False, help_text='Whether user has confirmed TOTP setup by entering a valid code'),
        ),
        migrations.AddField(
            model_name='executivesignature',
            name='preferred_2fa_method',
            field=models.CharField(choices=[('email', 'Email OTP'), ('totp', 'Authenticator App')], default='email', help_text="User's preferred 2FA method", max_length=10),
        ),
        
        # Create SealOTP model
        migrations.CreateModel(
            name='SealOTP',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('code', models.CharField(help_text='6-digit OTP code', max_length=6)),
                ('purpose', models.CharField(default='seal_application', help_text='Purpose of this OTP (e.g., seal_application, totp_setup)', max_length=50)),
                ('correspondence_id', models.UUIDField(blank=True, help_text='ID of correspondence this OTP is for', null=True)),
                ('document_id', models.UUIDField(blank=True, help_text='ID of document this OTP is for', null=True)),
                ('expires_at', models.DateTimeField(help_text='When this OTP expires')),
                ('is_used', models.BooleanField(default=False, help_text='Whether this OTP has been used')),
                ('used_at', models.DateTimeField(blank=True, help_text='When this OTP was used', null=True)),
                ('attempts', models.PositiveIntegerField(default=0, help_text='Number of verification attempts')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='seal_otps', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Seal OTP',
                'verbose_name_plural': 'Seal OTPs',
                'ordering': ['-created_at'],
            },
        ),
    ]


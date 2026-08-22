"""Custom user model and related helpers."""

import hashlib
import secrets
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta

from common.models import UUIDModel, TimeStampedModel


class User(AbstractUser):
    """User model augmented with NPA-specific metadata."""

    grade_level = models.CharField(max_length=50, blank=True)
    system_role = models.ForeignKey(
        "organization.Role",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    directorate = models.ForeignKey(
        "organization.Directorate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    division = models.ForeignKey(
        "organization.Division",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    department = models.ForeignKey(
        "organization.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    is_management = models.BooleanField(default=False)
    employee_id = models.CharField(max_length=50, blank=True)
    last_activity = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time the user was active in the system",
    )
    auth_provider = models.CharField(
        max_length=32,
        blank=True,
        default="local",
        help_text="Authentication provider: local, oidc, etc.",
    )
    external_auth_subject = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        help_text="Stable subject identifier from external IdP (OIDC sub)",
    )

    class Meta(AbstractUser.Meta):
        ordering = ["username"]
        indexes = [
            models.Index(fields=["last_activity"]),
            models.Index(fields=["date_joined"]),
            models.Index(fields=["last_login"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["employee_id"],
                name="unique_employee_id_when_set",
                condition=~models.Q(employee_id=""),
            ),
        ]

    def __str__(self) -> str:
        return self.get_full_name() or self.username

    @property
    def display_role(self) -> str:
        """Return a human readable representation of the user's role."""

        parts = [self.system_role.name if self.system_role else ""]
        if self.grade_level:
            parts.append(self.grade_level)
        return " - ".join(filter(None, parts))


class LoginSecuritySettings(UUIDModel, TimeStampedModel):
    """Login MFA and security preferences (separate from executive seal 2FA)."""

    class PreferredMethod(models.TextChoices):
        EMAIL = "email", "Email OTP"
        TOTP = "totp", "Authenticator App"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="login_security",
    )
    mfa_enabled = models.BooleanField(
        default=False,
        help_text="When enabled, user must verify MFA after password at login",
    )
    mfa_required = models.BooleanField(
        default=False,
        help_text="Administrator-forced MFA for this user",
    )
    totp_secret = models.CharField(max_length=32, blank=True)
    totp_confirmed = models.BooleanField(default=False)
    preferred_method = models.CharField(
        max_length=10,
        choices=PreferredMethod.choices,
        default=PreferredMethod.EMAIL,
    )

    class Meta:
        verbose_name_plural = "Login security settings"

    def __str__(self) -> str:
        return f"Login security for {self.user.username}"


def signature_upload_path(instance, filename):
    """Generate secure upload path for signatures."""
    ext = filename.split('.')[-1]
    unique_name = f"{instance.user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    return f"signatures/encrypted/{unique_name}"


class ExecutiveSignature(UUIDModel, TimeStampedModel):
    """
    Securely stores executive digital signatures for document approval seals.
    
    Security features:
    - Signatures are stored encrypted at rest
    - Only accessible during seal generation (never directly downloadable)
    - Protected by 2FA requirement for seal application
    - Audit trail for all signature operations
    """
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="executive_signature",
    )
    
    # The signature image (stored encrypted)
    signature_image = models.ImageField(
        upload_to=signature_upload_path,
        help_text="Encrypted signature image (PNG recommended with transparent background)",
    )
    
    # Original filename for reference
    original_filename = models.CharField(max_length=255, blank=True)
    
    # File hash for integrity verification
    file_hash = models.CharField(
        max_length=64,
        blank=True,
        help_text="SHA-256 hash of the original file for integrity verification",
    )
    
    # Seal customization
    seal_office_name = models.CharField(
        max_length=100,
        default="NIGERIAN PORTS AUTHORITY",
        help_text="Text displayed at top of seal",
    )
    seal_office_title = models.CharField(
        max_length=100,
        blank=True,
        help_text="Text displayed at bottom of seal (e.g., 'OFFICE OF THE MANAGING DIRECTOR')",
    )
    seal_prefix = models.CharField(
        max_length=20,
        default="NPA",
        help_text="Prefix for seal serial numbers",
    )
    
    # Security settings
    require_2fa = models.BooleanField(
        default=True,
        help_text="Require 2FA verification before applying seal",
    )
    
    # TOTP (Authenticator App) settings
    totp_secret = models.CharField(
        max_length=32,
        blank=True,
        help_text="Base32 encoded TOTP secret for authenticator apps",
    )
    totp_enabled = models.BooleanField(
        default=False,
        help_text="Whether TOTP is enabled for this user",
    )
    totp_confirmed = models.BooleanField(
        default=False,
        help_text="Whether user has confirmed TOTP setup by entering a valid code",
    )
    
    # Preferred 2FA method
    preferred_2fa_method = models.CharField(
        max_length=10,
        choices=[
            ('email', 'Email OTP'),
            ('totp', 'Authenticator App'),
        ],
        default='email',
        help_text="User's preferred 2FA method",
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this signature can be used for seals",
    )
    
    # Audit fields
    last_used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this signature was used to generate a seal",
    )
    times_used = models.PositiveIntegerField(
        default=0,
        help_text="Number of times this signature has been used",
    )

    class Meta:
        verbose_name = "Executive Signature"
        verbose_name_plural = "Executive Signatures"

    def __str__(self):
        return f"Signature for {self.user.get_full_name() or self.user.username}"

    def save(self, *args, **kwargs):
        # Auto-generate seal_office_title based on user's role if not set
        if not self.seal_office_title and self.user:
            role = self.user.system_role
            if role:
                self.seal_office_title = f"OFFICE OF THE {role.name.upper()}"
        super().save(*args, **kwargs)

    def record_usage(self):
        """Record that this signature was used."""
        self.last_used_at = timezone.now()
        self.times_used += 1
        self.save(update_fields=["last_used_at", "times_used"])

    @staticmethod
    def compute_file_hash(file_content: bytes) -> str:
        """Compute SHA-256 hash of file content."""
        return hashlib.sha256(file_content).hexdigest()


class SignatureTemplate(UUIDModel, TimeStampedModel):
    """Template for signature formatting in correspondence minutes and approvals."""
    
    class TemplateType(models.TextChoices):
        APPROVAL = "approval", "Approval"
        MINUTE = "minute", "Minute"
        FORWARD = "forward", "Forward"
        TREATMENT = "treatment", "Treatment"
    
    class Style(models.TextChoices):
        STAMP = "stamp", "Stamp"
        FORMAL = "formal", "Formal"
        MINIMAL = "minimal", "Minimal"
    
    name = models.CharField(max_length=255, help_text="Template name")
    description = models.TextField(blank=True, help_text="Template description")
    template_type = models.CharField(
        max_length=20,
        choices=TemplateType.choices,
        help_text="Type of template",
    )
    format = models.TextField(
        help_text="Template format string (e.g., 'APPROVED BY {name}\\n{role}\\n{date}')"
    )
    style = models.CharField(
        max_length=20,
        choices=Style.choices,
        default=Style.FORMAL,
        help_text="Template style",
    )
    default_apply = models.BooleanField(
        default=False,
        help_text="Whether to apply this template by default for its type",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this template is active",
    )
    
    class Meta:
        ordering = ["template_type", "name"]
        indexes = [
            models.Index(fields=["template_type", "is_active"]),
            models.Index(fields=["default_apply"]),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_template_type_display()})"


class UserSignaturePreferences(UUIDModel, TimeStampedModel):
    """User preferences for signature templates and auto-apply settings."""
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="signature_preferences",
    )
    default_template = models.ForeignKey(
        SignatureTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="default_for_users",
        help_text="Default template to use",
    )
    template_overrides = models.JSONField(
        default=dict,
        blank=True,
        help_text="Template overrides by type: {'approval': 'template_id', 'minute': 'template_id'}",
    )
    auto_apply_for_minutes = models.BooleanField(
        default=False,
        help_text="Automatically apply signature for minutes",
    )
    
    class Meta:
        verbose_name = "User Signature Preferences"
        verbose_name_plural = "User Signature Preferences"
    
    def __str__(self):
        return f"Signature preferences for {self.user.username}"


class DocumentSeal(UUIDModel, TimeStampedModel):
    """
    Records of digital seals applied to documents.
    Used for verification and audit trail.
    """
    
    # The document that was sealed
    document = models.ForeignKey(
        "dms.Document",
        on_delete=models.CASCADE,
        related_name="seals",
        null=True,
        blank=True,
    )
    correspondence = models.ForeignKey(
        "correspondence.Correspondence",
        on_delete=models.CASCADE,
        related_name="seals",
        null=True,
        blank=True,
    )
    
    # Who applied the seal
    sealed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="applied_seals",
    )
    
    # Signature used (for audit)
    signature_used = models.ForeignKey(
        ExecutiveSignature,
        on_delete=models.SET_NULL,
        null=True,
        related_name="seals_created",
    )
    
    # Unique serial number for this seal
    serial_number = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique serial number for verification",
    )
    
    # Cryptographic hash for verification
    seal_hash = models.CharField(
        max_length=128,
        help_text="Cryptographic hash of the sealed document",
    )
    
    # QR code verification URL
    verification_url = models.URLField(
        blank=True,
        help_text="URL for QR code verification",
    )
    
    # The generated seal image (cached)
    seal_image = models.ImageField(
        upload_to="seals/generated/",
        null=True,
        blank=True,
        help_text="Cached image of the generated seal",
    )
    
    # Seal metadata
    office_name = models.CharField(max_length=100)
    office_title = models.CharField(max_length=100)
    sealed_at = models.DateTimeField(auto_now_add=True)
    
    # Verification status
    is_valid = models.BooleanField(default=True)
    invalidated_at = models.DateTimeField(null=True, blank=True)
    invalidated_reason = models.TextField(blank=True)

    class Meta:
        verbose_name = "Document Seal"
        verbose_name_plural = "Document Seals"
        ordering = ["-sealed_at"]

    def __str__(self):
        return f"Seal {self.serial_number} by {self.sealed_by}"

    @classmethod
    def generate_serial_number(cls, prefix: str = "NPA") -> str:
        """Generate a unique serial number."""
        timestamp = timezone.now().strftime("%Y%m%d")
        unique_id = uuid.uuid4().hex[:8].upper()
        return f"{prefix}-{timestamp}-{unique_id}"

    def invalidate(self, reason: str):
        """Invalidate this seal."""
        self.is_valid = False
        self.invalidated_at = timezone.now()
        self.invalidated_reason = reason
        self.save(update_fields=["is_valid", "invalidated_at", "invalidated_reason"])


class SealOTP(UUIDModel, TimeStampedModel):
    """
    Temporary OTP codes for seal 2FA verification via email.
    Codes expire after 5 minutes and can only be used once.
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="seal_otps",
    )
    
    code = models.CharField(
        max_length=6,
        help_text="6-digit OTP code",
    )
    
    # What action this OTP is for (for audit)
    purpose = models.CharField(
        max_length=50,
        default="seal_application",
        help_text="Purpose of this OTP (e.g., seal_application, totp_setup)",
    )
    
    # Related correspondence/document (optional, for audit)
    correspondence_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="ID of correspondence this OTP is for",
    )
    document_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="ID of document this OTP is for",
    )
    
    # Expiration
    expires_at = models.DateTimeField(
        help_text="When this OTP expires",
    )
    
    # Usage tracking
    is_used = models.BooleanField(
        default=False,
        help_text="Whether this OTP has been used",
    )
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this OTP was used",
    )
    
    # Security - track failed attempts
    attempts = models.PositiveIntegerField(
        default=0,
        help_text="Number of verification attempts",
    )
    
    class Meta:
        verbose_name = "Seal OTP"
        verbose_name_plural = "Seal OTPs"
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"OTP for {self.user.username} ({self.purpose})"
    
    @classmethod
    def generate_code(cls) -> str:
        """Generate a secure 6-digit OTP code."""
        return ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    @classmethod
    def create_for_user(
        cls,
        user: User,
        purpose: str = "seal_application",
        correspondence_id: uuid.UUID = None,
        document_id: uuid.UUID = None,
        validity_minutes: int = 5,
    ) -> "SealOTP":
        """Create a new OTP for a user, invalidating any existing unused OTPs."""
        # Invalidate existing unused OTPs for this purpose
        cls.objects.filter(
            user=user,
            purpose=purpose,
            is_used=False,
        ).update(is_used=True)
        
        # Create new OTP
        return cls.objects.create(
            user=user,
            code=cls.generate_code(),
            purpose=purpose,
            correspondence_id=correspondence_id,
            document_id=document_id,
            expires_at=timezone.now() + timedelta(minutes=validity_minutes),
        )
    
    def is_valid(self) -> bool:
        """Check if this OTP is still valid (not expired, not used, not too many attempts)."""
        if self.is_used:
            return False
        if timezone.now() > self.expires_at:
            return False
        if self.attempts >= 5:  # Max 5 attempts
            return False
        return True
    
    def verify(self, code: str) -> bool:
        """Verify the OTP code. Returns True if valid, False otherwise."""
        self.attempts += 1
        self.save(update_fields=["attempts"])
        
        if not self.is_valid():
            return False
        
        if self.code != code:
            return False
        
        # Mark as used
        self.is_used = True
        self.used_at = timezone.now()
        self.save(update_fields=["is_used", "used_at"])
        return True

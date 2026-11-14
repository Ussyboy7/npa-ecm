"""Services for seal generation and verification."""

import hashlib
import logging
import re
import secrets
import string
import uuid
from hmac import compare_digest
from typing import Optional, Tuple

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import BackupCode, DocumentSeal, ExecutiveSignature, LoginSecuritySettings, User

logger = logging.getLogger(__name__)

# Bump when the visual seal design changes so cached PNGs are regenerated.
SEAL_RENDER_VERSION = "v3"


class StepUpRequired(ValidationError):
    """A security-sensitive change requires a fresh proof of identity."""

    def __init__(self, detail="Re-authenticate to change this security setting."):
        super().__init__(
            {
                "detail": detail,
                "reason": "step_up_required",
                "step_up_required": True,
            }
        )


class BackupCodeService:
    """Generate and consume hashed, single-use recovery codes."""

    CODE_LENGTH = 8
    DEFAULT_COUNT = 10

    @staticmethod
    def _normalize(code: str) -> str:
        return re.sub(r"[^A-Z0-9]", "", (code or "").upper())

    @classmethod
    def _new_code(cls) -> str:
        alphabet = string.ascii_uppercase + string.digits
        raw = "".join(secrets.choice(alphabet) for _ in range(cls.CODE_LENGTH))
        return f"{raw[:4]}-{raw[4:]}"

    @classmethod
    def generate(cls, user, count: int = DEFAULT_COUNT) -> list[str]:
        """Replace all existing codes with a new set and return the plaintext."""
        count = max(1, min(int(count), 20))
        codes = [cls._new_code() for _ in range(count)]
        with transaction.atomic():
            BackupCode.objects.filter(user=user).delete()
            BackupCode.objects.bulk_create(
                [
                    BackupCode(user=user, code_hash=make_password(cls._normalize(code)))
                    for code in codes
                ]
            )
        return codes

    @classmethod
    def consume(cls, user, code: str) -> bool:
        normalized = cls._normalize(code)
        if len(normalized) != cls.CODE_LENGTH:
            return False
        for record in BackupCode.objects.filter(user=user, used_at__isnull=True):
            if not check_password(normalized, record.code_hash):
                continue
            updated = BackupCode.objects.filter(
                pk=record.pk, used_at__isnull=True
            ).update(used_at=timezone.now())
            return bool(updated)
        return False

    @classmethod
    def remaining(cls, user) -> int:
        return BackupCode.objects.filter(user=user, used_at__isnull=True).count()


class TotpVerificationService:
    """Verify a TOTP code and reject replay of an already used time-step."""

    @classmethod
    def verify_and_consume(cls, instance, code: str) -> bool:
        import pyotp

        secret = getattr(instance, "totp_secret", "") or ""
        code = str(code or "").strip()
        if not secret or not code:
            return False

        totp = pyotp.TOTP(secret)
        now_step = int(timezone.now().timestamp()) // totp.interval
        matched_step = None
        for offset in (0, -1, 1):
            candidate_step = now_step + offset
            if compare_digest(totp.at(candidate_step * totp.interval), code):
                matched_step = candidate_step
                break
        if matched_step is None:
            return False

        with transaction.atomic():
            locked = type(instance).objects.select_for_update().get(pk=instance.pk)
            last_step = getattr(locked, "totp_last_used_step", 0) or 0
            if matched_step <= last_step:
                return False
            locked.totp_last_used_step = matched_step
            locked.save(update_fields=["totp_last_used_step", "updated_at"])
        instance.totp_last_used_step = matched_step
        return True


class StepUpService:
    """Require a password, current TOTP code, or unused backup code."""

    @classmethod
    def assert_verified(cls, request, *, password=None, code=None) -> None:
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            raise StepUpRequired()

        if password and user.check_password(str(password)):
            return

        if code:
            for model in (ExecutiveSignature, LoginSecuritySettings):
                instance = model.objects.filter(user=user).first()
                if instance and getattr(instance, "totp_confirmed", False):
                    if TotpVerificationService.verify_and_consume(instance, code):
                        return
            if BackupCodeService.consume(user, code):
                return

        raise StepUpRequired()


class VerificationTokenService:
    """
    Service for generating and verifying short-lived verification tokens.
    Tokens are stored in the cache (Redis) and expire after a configurable TTL.
    """

    TOKEN_PREFIX = "verify_token_"
    DEFAULT_TTL_SECONDS = 300  # 5 minutes

    @classmethod
    def generate_token(cls, user_id: str, purpose: str = "seal_application") -> str:
        """Generate a token, store it in cache, and return it."""
        import hashlib
        import time
        from django.core.cache import cache

        timestamp = int(time.time())
        raw = f"{user_id}:{purpose}:{timestamp}:{uuid.uuid4().hex}"
        token = hashlib.sha256(raw.encode()).hexdigest()[:48]

        cache_key = f"{cls.TOKEN_PREFIX}{token}"
        cache.set(
            cache_key,
            {"user_id": str(user_id), "purpose": purpose, "created_at": timestamp},
            timeout=cls.DEFAULT_TTL_SECONDS,
        )

        return f"{token}:{timestamp}"

    @classmethod
    def verify_token(cls, token: str, user_id: str, purpose: str = "seal_application") -> bool:
        """
        Verify a token. Returns True if valid and not expired.
        Deletes the token after verification (single-use).
        """
        from django.core.cache import cache

        if ":" not in token:
            return False

        token_hash = token.split(":")[0]
        cache_key = f"{cls.TOKEN_PREFIX}{token_hash}"
        stored = cache.get(cache_key)

        if stored is None:
            return False

        if stored.get("user_id") != str(user_id) or stored.get("purpose") != purpose:
            return False

        # Single-use: delete after verification
        cache.delete(cache_key)
        return True

    @classmethod
    def consume_token(cls, token: str) -> dict | None:
        """
        Consume a token and return its data. Returns None if invalid/expired.
        Token is deleted after consumption.
        """
        from django.core.cache import cache

        if ":" not in token:
            return None

        token_hash = token.split(":")[0]
        cache_key = f"{cls.TOKEN_PREFIX}{token_hash}"
        stored = cache.get(cache_key)

        if stored is None:
            return None

        cache.delete(cache_key)
        return stored


class SealTwoFactorError(ValidationError):
    """A seal 2FA failure with a machine-readable reason and recovery steps."""

    def __init__(self, detail, *, reason, recovery_actions=None, methods=None):
        payload = {"detail": detail, "reason": reason}
        if recovery_actions:
            payload["recovery_actions"] = recovery_actions
        if methods is not None:
            payload["available_methods"] = methods
        super().__init__(payload)


class SealTwoFactorService:
    """The single policy for seal-application second-factor verification.

    A seal must fail closed when the signature requires 2FA but the user has no
    usable delivery method. The status payload tells the client how to recover
    instead of leaving the user at a dead end.
    """

    PURPOSE = "seal_application"

    @classmethod
    def get_status(cls, user, signature=None) -> dict:
        """Return the user's ability to start and complete a seal request."""
        signature_available = signature is not None
        email_otp_enabled = bool(
            signature_available and getattr(signature, "email_otp_enabled", True)
        )
        email_available = bool(getattr(user, "email", "") and email_otp_enabled)
        totp_available = bool(
            signature_available
            and signature.totp_secret
            and signature.totp_enabled
            and signature.totp_confirmed
        )

        methods = []
        if email_available:
            methods.append("email")
        if totp_available:
            methods.append("totp")
        if BackupCodeService.remaining(user):
            methods.append("backup_code")

        preferred = (
            getattr(signature, "preferred_2fa_method", "email")
            if signature
            else "email"
        )
        if preferred not in methods:
            preferred = methods[0] if methods else "email"

        require_2fa = bool(signature_available and signature.require_2fa)
        recovery_actions = []
        if not signature_available:
            recovery_actions.append(
                {
                    "action": "upload_signature",
                    "label": "Upload a signature in Settings",
                    "endpoint": "/settings#signature",
                }
            )
        elif require_2fa and not methods:
            if not totp_available:
                recovery_actions.append(
                    {
                        "action": "setup_totp",
                        "label": "Set up an authenticator app",
                        "endpoint": "/accounts/2fa/totp/setup/",
                        "method": "POST",
                    }
                )
            if not email_available:
                if not getattr(user, "email", ""):
                    recovery_actions.append(
                        {
                            "action": "add_email",
                            "label": "Add an email address in Profile settings",
                            "endpoint": "/settings#profile",
                        }
                    )
                else:
                    recovery_actions.append(
                        {
                            "action": "enable_email_otp",
                            "label": "Enable email OTP in Security settings",
                            "endpoint": "/settings#security",
                        }
                    )

        signature_active = bool(signature_available and signature.is_active)
        blocking_reason = None
        if not signature_available:
            blocking_reason = "no_signature"
        elif not signature_active:
            blocking_reason = "signature_inactive"
        elif require_2fa and not methods:
            blocking_reason = "no_2fa_method"

        return {
            "requires_verification": bool(require_2fa and methods and signature_active),
            "can_seal": bool(signature_active and (not require_2fa or bool(methods))),
            "blocking_reason": blocking_reason,
            "recovery_actions": recovery_actions,
            "require_2fa": require_2fa,
            "totp_enabled": bool(signature_available and signature.totp_enabled),
            "totp_confirmed": bool(signature_available and signature.totp_confirmed),
            "preferred_method": preferred,
            "email": getattr(user, "email", "") or "",
            "has_email": bool(getattr(user, "email", "")),
            "email_otp_enabled": email_otp_enabled,
            "has_signature": signature_available,
            "is_signature_active": signature_active,
            "available_methods": methods,
        }

    @classmethod
    def assert_can_seal(
        cls,
        user,
        signature,
        *,
        verification_token=None,
        already_verified=False,
    ) -> None:
        """Enforce seal 2FA, including method availability, before sealing."""
        if not signature.require_2fa:
            return

        status = cls.get_status(user, signature)
        if not status["available_methods"]:
            raise SealTwoFactorError(
                "2FA is required for seal application, but no email or confirmed "
                "authenticator method is configured.",
                reason="no_2fa_method",
                recovery_actions=status["recovery_actions"],
            )

        # A caller that has already completed this same policy (the minute
        # path) does not need to present the single-use token a second time.
        if already_verified:
            return

        if not verification_token:
            raise SealTwoFactorError(
                "2FA verification is required before applying a seal.",
                reason="verification_required",
                methods=status["available_methods"],
                recovery_actions=status["recovery_actions"],
            )

        if not VerificationTokenService.verify_token(
            token=verification_token,
            user_id=str(user.id),
            purpose=cls.PURPOSE,
        ):
            raise SealTwoFactorError(
                "Invalid or expired verification token. Please verify again.",
                reason="invalid_verification_token",
                methods=status["available_methods"],
                recovery_actions=status["recovery_actions"],
            )


class SealEligibilityService:
    """Authorize the record a user is trying to seal.

    The seal endpoint accepts a target ID from the client, so possession of an
    active signature must not be enough to seal an arbitrary record. This is
    deliberately enforced here, below the HTTP views, so every seal caller
    gets the same target-level check.
    """

    @classmethod
    def assert_user_can_seal(
        cls,
        user: User,
        *,
        document=None,
        correspondence=None,
        minute=None,
    ) -> None:
        if not user or not getattr(user, "is_authenticated", False):
            raise PermissionDenied("Authentication is required to apply a seal")

        if getattr(user, "is_superuser", False):
            return

        if document is None and correspondence is None:
            raise PermissionDenied("A seal target is required")

        if correspondence is not None:
            cls._assert_correspondence_eligible(user, correspondence, minute)
        if document is not None:
            cls._assert_document_eligible(user, document)

    @classmethod
    def _assert_correspondence_eligible(cls, user, correspondence, minute) -> None:
        # The minute API already performed the full approval check before it
        # saved the minute and then routed the correspondence onward. Trust
        # only that exact saved approval, not an arbitrary minute object.
        if minute is not None:
            if (
                getattr(minute, "pk", None)
                and minute.user_id == user.id
                and minute.correspondence_id == correspondence.id
                and str(getattr(minute, "action_type", "")) == "approve"
            ):
                return
            raise PermissionDenied(
                {
                    "detail": "The approval context does not authorize this seal.",
                    "reason": "not_eligible_to_seal",
                }
            )

        from correspondence.services import MinuteRouterService

        # This is the same policy used to accept an approve minute: approval
        # permission, org scope, current turn, delegation, acting authority, or
        # an explicit CC. Do not create a second, weaker interpretation here.
        MinuteRouterService.check_permissions(
            user,
            "approve",
            correspondence=correspondence,
        )

    @staticmethod
    def _assert_document_eligible(user, document) -> None:
        if getattr(document, "is_deleted", False):
            raise PermissionDenied(
                {
                    "detail": "A deleted document cannot be sealed.",
                    "reason": "not_eligible_to_seal",
                }
            )

        from dms.visibility import document_access_level
        from organization.permission_utils import user_has_permission

        # Documents have no separate approval queue. The author or an explicit
        # document admin has the authority to issue a seal; read/write sharing
        # alone does not, and the user must still hold approval authority.
        if (
            not user_has_permission(user, "can_approve")
            or document_access_level(document, user) != "admin"
        ):
            raise PermissionDenied(
                {
                    "detail": "You are not eligible to seal this document.",
                    "reason": "not_eligible_to_seal",
                }
            )


class SealGenerationService:
    """Service for generating and managing digital seals."""
    
    @staticmethod
    def generate_serial_number(prefix: str = "NPA") -> str:
        """
        Generate a unique serial number for a seal.
        Format: PREFIX-YYYYMMDD-XXXXXXXX
        """
        timestamp = timezone.now().strftime("%Y%m%d")
        unique_id = uuid.uuid4().hex[:8].upper()
        return f"{prefix}-{timestamp}-{unique_id}"
    
    @staticmethod
    def compute_document_hash(content: bytes) -> str:
        """
        Compute SHA-256 hash of document content.
        Used for integrity verification.
        """
        return hashlib.sha256(content).hexdigest()
    
    @classmethod
    def generate_seal(
        cls,
        user: User,
        document=None,
        correspondence=None,
        document_content: Optional[bytes] = None,
        request=None,
        minute=None,
        verification_token=None,
        two_factor_verified=False,
    ) -> Tuple[DocumentSeal, dict]:
        """
        Generate a digital seal for a document or correspondence.
        
        Args:
            user: The user applying the seal (must have an ExecutiveSignature)
            document: Optional Document instance
            correspondence: Optional Correspondence instance
            document_content: Optional bytes of document for hash computation
            request: Optional Django request object to detect frontend URL from host
            minute: Optional saved APPROVE minute that authorizes the seal
            verification_token: Single-use 2FA token for the seal application
            two_factor_verified: Internal marker for a flow that already applied
                SealTwoFactorService before calling this method
            
        Returns:
            Tuple of (DocumentSeal instance, seal_data dict for rendering)
            
        Raises:
            ValueError: If user has no signature or neither document nor correspondence provided
            PermissionDenied: If the user is not eligible to approve the target
        """
        # Validate user has a signature
        try:
            # Read through the manager, not the cached reverse relation: settings
            # and TOTP setup can change after the User instance was loaded.
            signature = ExecutiveSignature.objects.get(user=user)
            if not signature.is_active:
                raise ValueError("User's signature is not active")
        except ExecutiveSignature.DoesNotExist:
            raise ValueError("User has no digital signature configured")
        
        # Validate at least one target is provided
        if not document and not correspondence:
            raise ValueError("Either document or correspondence must be provided")

        # An active signature is necessary but not sufficient: the target must
        # also be one this user is entitled to approve.
        SealEligibilityService.assert_user_can_seal(
            user,
            document=document,
            correspondence=correspondence,
            minute=minute,
        )

        SealTwoFactorService.assert_can_seal(
            user,
            signature,
            verification_token=verification_token,
            already_verified=two_factor_verified,
        )
        
        # Generate serial number
        serial = cls.generate_serial_number(signature.seal_prefix)
        
        # Compute document hash if content provided
        doc_hash = ""
        if document_content:
            doc_hash = cls.compute_document_hash(document_content)
        elif document and hasattr(document, 'current_version') and document.current_version:
            # Try to get content from document's current version
            try:
                with document.current_version.file.open('rb') as f:
                    doc_hash = cls.compute_document_hash(f.read())
            except (OSError, ValueError, AttributeError):
                doc_hash = hashlib.sha256(str(document.id).encode()).hexdigest()
        elif correspondence:
            # For correspondence, hash the subject + ID
            content = f"{correspondence.id}:{correspondence.subject}:{timezone.now().isoformat()}"
            doc_hash = hashlib.sha256(content.encode()).hexdigest()
        
        # Build the verification URL from the configured public origin so
        # certificates never inherit a loopback or backend-only host header.
        configured_base_url = (
            getattr(settings, 'PUBLIC_APP_ORIGIN', '')
            or getattr(settings, 'FRONTEND_BASE_URL', '')
        ).rstrip('/')
        if configured_base_url:
            base_url = configured_base_url
        elif request and hasattr(request, 'get_host'):
            # Use request host to build URL dynamically
            scheme = getattr(request, 'scheme', 'http')
            host = request.get_host()
            
            # For local development, always use localhost:3002 (frontend port)
            if 'localhost' in host or '127.0.0.1' in host:
                # Remove port and use frontend port
                host_without_port = host.split(':')[0]
                base_url = f"{scheme}://{host_without_port}:3002"
            else:
                # For staging/production, use the host as-is but ensure https
                host_without_port = host.split(':')[0]
                # Check if it's a known staging/production domain
                if 'stag' in host_without_port or 'staging' in host_without_port:
                    base_url = f"https://{host_without_port}"
                elif 'ecm.npa.gov.ng' in host_without_port or 'npa.gov.ng' in host_without_port:
                    base_url = f"https://{host_without_port}"
                else:
                    # Unknown domain, use settings fallback
                    base_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3002')
        else:
            base_url = 'http://localhost:3002'
        
        verification_url = f"{base_url}/verify/{serial}"
        
        # Build office_title safely (system_role.name can be None)
        if signature.seal_office_title:
            office_title = signature.seal_office_title
        elif user.system_role and getattr(user.system_role, "name", None):
            office_title = f"OFFICE OF THE {(user.system_role.name or 'EXECUTIVE').upper()}"
        else:
            office_title = "OFFICE OF THE EXECUTIVE"

        # Create the seal record
        seal = DocumentSeal.objects.create(
            document=document,
            correspondence=correspondence,
            sealed_by=user,
            signature_used=signature,
            serial_number=serial,
            seal_hash=doc_hash,
            verification_url=verification_url,
            office_name=signature.seal_office_name or "NIGERIAN PORTS AUTHORITY",
            office_title=office_title,
        )

        # Capture the exact signature bytes used by this seal. Replacing a
        # signature later must not alter historical verification output.
        try:
            with signature.signature_image.open("rb") as signature_file:
                seal.signature_image_snapshot.save(
                    f"{seal.serial_number}-signature.png",
                    ContentFile(signature_file.read()),
                    save=True,
                )
        except (OSError, ValueError):
            logger.warning("Failed to snapshot signature for seal %s", serial)

        try:
            seal_png = cls.render_seal_png(seal)
            seal.seal_image.save(
                f"{seal.serial_number}-{SEAL_RENDER_VERSION}.png",
                ContentFile(seal_png),
                save=True,
            )
            seal.seal_image_sha256 = hashlib.sha256(seal_png).hexdigest()
            seal.save(update_fields=["seal_image_sha256", "updated_at"])
        except (OSError, ValueError, AttributeError):
            logger.warning("Failed to render seal PNG for seal %s", serial)
        
        # Record signature usage
        signature.record_usage()

        # Build seal data for rendering
        seal_data = {
            'serial_number': serial,
            'office_name': seal.office_name,
            'office_title': seal.office_title,
            'sealed_by': user.get_full_name() or user.username,
            'sealed_at': seal.sealed_at.isoformat(),
            'verification_url': verification_url,
            'seal_hash': doc_hash[:16] + '...',  # Truncated for display
        }

        return seal, seal_data

    _FONT_PATHS: dict[str, str | None] = {}

    @classmethod
    def _font_path(cls, bold: bool = False, script: bool = False) -> str | None:
        """Resolve a TrueType font by path, independent of the process CWD."""
        key = "script" if script else ("bold" if bold else "regular")
        if key in cls._FONT_PATHS:
            return cls._FONT_PATHS[key]

        from pathlib import Path

        if script:
            names = (
                "GreatVibes-Regular.ttf",
                "Brush Script.ttf",
                "brushscriptmt.ttf",
                "VeraIt.ttf",
            )
        else:
            names = (
                ("DejaVuSans-Bold.ttf", "VeraBd.ttf", "arialbd.ttf", "Arial Bold.ttf")
                if bold
                else ("DejaVuSans.ttf", "Vera.ttf", "arial.ttf", "Arial.ttf")
            )
        candidates: list[Path] = []

        base_dir = getattr(settings, "BASE_DIR", None)
        if base_dir:
            candidates.extend(Path(base_dir) / "static" / "fonts" / name for name in names)

        try:
            import reportlab

            rl_fonts = Path(reportlab.__file__).parent / "fonts"
            candidates.extend(rl_fonts / name for name in names)
        except (ImportError, OSError):
            pass

        candidates.extend(
            Path(path)
            for path in (
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                "/System/Library/Fonts/Supplemental/Brush Script.ttf",
                "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
                "C:/Windows/Fonts/brushscriptmt.ttf",
                "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
            )
        )

        resolved = next((str(path) for path in candidates if path.exists()), None)
        cls._FONT_PATHS[key] = resolved
        return resolved

    @classmethod
    def _load_font(cls, size: int, bold: bool = False, script: bool = False):
        from PIL import ImageFont

        path = cls._font_path(bold, script=script)
        if path:
            try:
                return ImageFont.truetype(path, size)
            except (OSError, ValueError):
                pass
        return ImageFont.load_default()

    @classmethod
    def _draw_text_on_arc(
        cls,
        base_img,
        text: str,
        center: tuple[float, float],
        radius: float,
        start_angle_rad: float,
        end_angle_rad: float,
        rotation_offset_rad: float,
        font,
        fill: tuple[int, int, int, int],
    ) -> None:
        import math
        from PIL import Image, ImageChops, ImageDraw, ImageOps

        draw = ImageDraw.Draw(base_img)
        text = (text or "").strip()
        if not text:
            return

        chars = list(text)
        total_chars = len(chars)
        if total_chars == 0:
            return

        angle_span = end_angle_rad - start_angle_rad
        angle_step = angle_span / max(total_chars - 1, 1)
        cx, cy = center

        for idx, ch in enumerate(chars):
            angle_rad = start_angle_rad + idx * angle_step
            x = cx + radius * float(math.cos(angle_rad))
            y = cy + radius * float(math.sin(angle_rad))

            left, top, right, bottom = draw.textbbox((0, 0), ch, font=font)
            w, h = right - left, bottom - top
            glyph = Image.new("RGBA", (w + 8, h + 8), (0, 0, 0, 0))
            glyph_draw = ImageDraw.Draw(glyph)
            # Offset by the glyph bbox origin. Drawing at a fixed (4, 4)
            # clipped descenders and curved letters such as U.
            glyph_draw.text((4 - left, 4 - top), ch, font=font, fill=fill)

            angle_deg = (angle_rad + rotation_offset_rad) * 180.0 / math.pi
            rotated = glyph.rotate(-angle_deg, resample=Image.Resampling.BICUBIC, expand=True)
            base_img.alpha_composite(rotated, (int(x - rotated.width / 2), int(y - rotated.height / 2)))

    @classmethod
    def _render_seal_png(
        cls,
        *,
        office_name: str,
        office_title: str,
        serial_number: str,
        verification_url: str,
        signature_image_field=None,
        signer_name: str | None = None,
        size: int = 350,
        render_scale: int = 4,
    ) -> bytes:
        import math
        from io import BytesIO

        import qrcode
        from PIL import Image, ImageDraw

        scaled_size = int(size * render_scale)
        img = Image.new("RGBA", (scaled_size, scaled_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        navy = (30, 58, 95, 255)
        gold = (201, 162, 39, 255)
        white = (255, 255, 255, 255)

        center_x = (size / 2) * render_scale
        center_y = (size / 2) * render_scale
        outer_radius = ((size / 2) - 5) * render_scale
        band_width = (size * 0.095) * render_scale
        inner_radius = outer_radius - band_width
        text_radius = outer_radius - band_width / 2

        draw.ellipse(
            (center_x - outer_radius, center_y - outer_radius, center_x + outer_radius, center_y + outer_radius),
            fill=white,
            outline=navy,
            width=max(1, int(2 * render_scale)),
        )
        draw.ellipse(
            (center_x - inner_radius, center_y - inner_radius, center_x + inner_radius, center_y + inner_radius),
            outline=navy,
            width=max(1, int(2 * render_scale)),
        )

        base_top_size = int(size * 0.055 * render_scale)
        base_bottom_size = int(size * 0.040 * render_scale)

        def fit_font_for_arc(text: str, base_size: int, start_angle: float, end_angle: float, *, max_ratio: float) -> int:
            text = (text or "").strip()
            if not text or len(text) < 2:
                return base_size

            angle_span = end_angle - start_angle
            angle_step = angle_span / max(len(text) - 1, 1)
            chord_len = 2.0 * float(text_radius) * float(math.sin(abs(angle_step) / 2.0))
            target = chord_len * max_ratio

            font = cls._load_font(base_size, bold=True)
            max_w = 0
            for ch in text:
                if ch == " ":
                    continue
                left, top, right, bottom = draw.textbbox((0, 0), ch, font=font)
                max_w = max(max_w, right - left)
            if max_w <= 0:
                return base_size

            scale = min(1.0, float(target) / float(max_w))
            return max(10, int(base_size * scale))

        top_text = (office_name or "NIGERIAN PORTS AUTHORITY").upper()
        bottom_text = (office_title or "OFFICE OF THE MANAGING DIRECTOR").upper()

        # Keep the ring text in the outer band so it never runs into the crest.
        top_start = -math.pi * 0.80
        top_end = -math.pi * 0.20
        bottom_start = math.pi * 0.83
        bottom_end = math.pi * 0.17

        font_top = cls._load_font(fit_font_for_arc(top_text, base_top_size, top_start, top_end, max_ratio=0.85), bold=True)
        font_bottom = cls._load_font(
            fit_font_for_arc(bottom_text, base_bottom_size, bottom_start, bottom_end, max_ratio=0.85),
            bold=True,
        )

        cls._draw_text_on_arc(
            img,
            top_text,
            (center_x, center_y),
            radius=text_radius,
            start_angle_rad=top_start,
            end_angle_rad=top_end,
            rotation_offset_rad=math.pi / 2,
            font=font_top,
            fill=navy,
        )
        cls._draw_text_on_arc(
            img,
            bottom_text,
            (center_x, center_y),
            radius=text_radius,
            start_angle_rad=bottom_start,
            end_angle_rad=bottom_end,
            rotation_offset_rad=-math.pi / 2,
            font=font_bottom,
            fill=navy,
        )

        def draw_star(cx: float, cy: float, radius: float) -> None:
            points = []
            for point_index in range(10):
                angle = -math.pi / 2 + point_index * math.pi / 5
                point_radius = radius if point_index % 2 == 0 else radius * 0.45
                points.append(
                    (
                        cx + point_radius * math.cos(angle),
                        cy + point_radius * math.sin(angle),
                    )
                )
            draw.polygon(points, fill=navy)

        star_radius = size * 0.030 * render_scale
        draw_star(center_x - text_radius, center_y, star_radius)
        draw_star(center_x + text_radius, center_y, star_radius)

        logo_size = int(size * 0.26 * render_scale)
        logo_y = center_y - (size * 0.19 * render_scale)
        logo_path = (getattr(settings, "BASE_DIR", None) / "static" / "npalogo.png") if getattr(settings, "BASE_DIR", None) else None
        if logo_path and logo_path.exists():
            try:
                logo = Image.open(str(logo_path)).convert("RGBA")
                logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
                img.alpha_composite(logo, (int(center_x - logo_size / 2), int(logo_y - logo_size / 2)))
            except (OSError, ValueError):
                pass

        # The seal centre carries an APPROVED mark between the crest and the
        # verification QR. The officer's signature remains in the certificate
        # signature block; it is intentionally no longer drawn inside the seal.
        banner_width = int(size * 0.56 * render_scale)
        banner_height = int(size * 0.105 * render_scale)
        banner_center_y = center_y + (size * 0.035 * render_scale)
        banner_left = int(center_x - banner_width / 2)
        banner_top = int(banner_center_y - banner_height / 2)
        banner_right = banner_left + banner_width
        banner_bottom = banner_top + banner_height
        draw.rounded_rectangle(
            (banner_left, banner_top, banner_right, banner_bottom),
            radius=int(size * 0.018 * render_scale),
            fill=gold,
        )

        approved_text = "APPROVED"
        approved_font_size = int(size * 0.075 * render_scale)
        approved_font = cls._load_font(approved_font_size, bold=True)
        max_label_width = banner_width * 0.88
        while approved_font_size > int(size * 0.045 * render_scale):
            left, _top, right, _bottom = draw.textbbox(
                (0, 0), approved_text, font=approved_font
            )
            if right - left <= max_label_width:
                break
            approved_font_size -= max(1, int(size * 0.003 * render_scale))
            approved_font = cls._load_font(approved_font_size, bold=True)
        draw.text(
            (center_x, banner_center_y),
            approved_text,
            font=approved_font,
            fill=navy,
            anchor="mm",
        )

        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(verification_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="#1e3a5f", back_color="white").convert("RGBA")
        qr_size = int(size * 0.225 * render_scale)
        qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.NEAREST)

        qr_y = center_y + (size * 0.115 * render_scale)
        img.alpha_composite(qr_img, (int(center_x - qr_size / 2), int(qr_y)))

        buf = BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    @classmethod
    def render_seal_png(cls, seal, *, verification_url: str | None = None) -> bytes:
        """Render a seal from persisted, server-controlled fields only.

        Callers must never pass browser-rendered bytes here. The signature
        source is the immutable snapshot captured with the seal (falling back
        to the live signature only for legacy rows).
        """
        sealed_by = getattr(seal, "sealed_by", None)
        signer_name = (
            (sealed_by.get_full_name() or sealed_by.username) if sealed_by else None
        )
        return cls._render_seal_png(
            office_name=seal.office_name,
            office_title=seal.office_title,
            serial_number=seal.serial_number,
            verification_url=(
                verification_url
                or seal.verification_url
                or f"verify:{seal.serial_number}"
            ),
            signature_image_field=seal.signature_image,
            signer_name=signer_name,
            size=350,
        )

    @classmethod
    def ensure_seal_image(
        cls,
        seal,
        *,
        verification_url: str | None = None,
        force: bool = False,
    ) -> bytes | None:
        """Return a hash-verified seal PNG, regenerating it when necessary.

        A cached file is trusted only when its stored SHA-256 matches the
        bytes. Files with no digest (including legacy or client-uploaded
        images) are replaced with a server render before they are served or
        embedded in a PDF.
        """
        if not seal:
            return None

        requested_url = (verification_url or seal.verification_url or "").strip()
        if requested_url and requested_url.rstrip("/") != (seal.verification_url or "").rstrip("/"):
            force = True

        if not force and seal.seal_image and seal.seal_image_sha256:
            try:
                with seal.seal_image.open("rb") as image_file:
                    cached = image_file.read()
            except (OSError, ValueError, AttributeError) as exc:
                logger.warning("Could not read cached seal image for %s: %s", seal.serial_number, exc)
            else:
                actual_digest = hashlib.sha256(cached).hexdigest()
                if compare_digest(actual_digest, seal.seal_image_sha256):
                    return cached
                logger.error(
                    "Seal image hash mismatch for %s; regenerating from seal snapshot",
                    seal.serial_number,
                )

        try:
            png = cls.render_seal_png(seal, verification_url=requested_url or None)
        except Exception:
            logger.exception("Could not render seal image for %s", seal.serial_number)
            return None
        if not png:
            return None

        old_name = seal.seal_image.name if seal.seal_image else ""
        old_storage = seal.seal_image.storage if seal.seal_image else None
        try:
            seal.seal_image.save(
                f"{seal.serial_number}-{SEAL_RENDER_VERSION}.png",
                ContentFile(png),
                save=True,
            )
        except Exception:
            logger.exception("Could not cache rendered seal image for %s", seal.serial_number)
            return None

        update_fields = ["seal_image_sha256", "updated_at"]
        seal.seal_image_sha256 = hashlib.sha256(png).hexdigest()
        if requested_url and requested_url != (seal.verification_url or ""):
            seal.verification_url = requested_url
            update_fields.append("verification_url")
        seal.save(update_fields=update_fields)

        new_name = seal.seal_image.name if seal.seal_image else ""
        if old_name and old_name != new_name and old_storage:
            try:
                if old_storage.exists(old_name):
                    old_storage.delete(old_name)
            except Exception:
                logger.warning("Could not delete stale seal image %s", old_name)

        return png
    
    @classmethod
    def verify_seal(cls, serial_number: str) -> dict:
        """
        Verify a seal by its serial number.
        
        Returns:
            dict with verification results
        """
        try:
            seal = DocumentSeal.objects.select_related(
                'sealed_by', 'document', 'correspondence', 'signature_used'
            ).get(serial_number=serial_number)
            
            result = {
                'valid': seal.is_valid,
                'serial_number': seal.serial_number,
                'sealed_by': seal.sealed_by.get_full_name() or seal.sealed_by.username,
                'office_name': seal.office_name,
                'office_title': seal.office_title,
                'sealed_at': seal.sealed_at.isoformat(),
            }
            
            if seal.document:
                result['document_title'] = seal.document.title
            if seal.correspondence:
                result['correspondence_subject'] = seal.correspondence.subject
            
            if not seal.is_valid:
                result['invalidated_at'] = seal.invalidated_at.isoformat() if seal.invalidated_at else None
                result['invalidated_reason'] = seal.invalidated_reason
            
            return result
            
        except DocumentSeal.DoesNotExist:
            return {
                'valid': False,
                'error': 'Seal not found',
                'serial_number': serial_number,
            }
    
    @classmethod
    def invalidate_seal(cls, serial_number: str, reason: str, user: User) -> bool:
        """
        Invalidate a seal (e.g., if document was tampered with).
        
        Returns:
            True if seal was invalidated, False if not found
        """
        try:
            seal = DocumentSeal.objects.get(serial_number=serial_number)
            seal.invalidate(reason)
            
            # Log the invalidation
            from audit.services import AuditService
            from audit.models import ActivityLog
            
            AuditService.log_user_activity(
                user=user,
                action=ActivityLog.ActionType.DOCUMENT_UPDATED,
                request=None,
                description=f"Invalidated seal {serial_number}: {reason}",
                metadata={
                    'serial_number': serial_number,
                    'reason': reason,
                },
            )
            
            return True
        except DocumentSeal.DoesNotExist:
            return False

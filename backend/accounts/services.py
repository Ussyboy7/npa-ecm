"""Services for seal generation and verification."""

import hashlib
import uuid
from datetime import datetime
from typing import Optional, Tuple

from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone

from .models import ExecutiveSignature, DocumentSeal, User


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
    ) -> Tuple[DocumentSeal, dict]:
        """
        Generate a digital seal for a document or correspondence.
        
        Args:
            user: The user applying the seal (must have an ExecutiveSignature)
            document: Optional Document instance
            correspondence: Optional Correspondence instance
            document_content: Optional bytes of document for hash computation
            request: Optional Django request object to detect frontend URL from host
            
        Returns:
            Tuple of (DocumentSeal instance, seal_data dict for rendering)
            
        Raises:
            ValueError: If user has no signature or neither document nor correspondence provided
        """
        # Validate user has a signature
        try:
            signature = user.executive_signature
            if not signature.is_active:
                raise ValueError("User's signature is not active")
        except ExecutiveSignature.DoesNotExist:
            raise ValueError("User has no digital signature configured")
        
        # Validate at least one target is provided
        if not document and not correspondence:
            raise ValueError("Either document or correspondence must be provided")
        
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
            except Exception:
                doc_hash = hashlib.sha256(str(document.id).encode()).hexdigest()
        elif correspondence:
            # For correspondence, hash the subject + ID
            content = f"{correspondence.id}:{correspondence.subject}:{timezone.now().isoformat()}"
            doc_hash = hashlib.sha256(content.encode()).hexdigest()
        
        # Build verification URL - prefer request host, fallback to settings
        # This ensures URLs work correctly in local/stag/prod environments
        if request and hasattr(request, 'get_host'):
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
            # Fallback to settings
            base_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3002')
        
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

        try:
            seal_png = cls._render_seal_png(
                office_name=seal.office_name,
                office_title=seal.office_title,
                serial_number=seal.serial_number,
                verification_url=seal.verification_url,
                signature_image_field=signature.signature_image,
            )
            seal.seal_image.save(
                f"{seal.serial_number}.png",
                ContentFile(seal_png),
                save=True,
            )
        except Exception:
            pass
        
        # Record signature usage
        signature.record_usage()

        # signature_image.url can fail if file was removed from storage
        try:
            signature_url = signature.signature_image.url if signature.signature_image else None
        except (ValueError, OSError):
            signature_url = None

        # Build seal data for rendering
        seal_data = {
            'serial_number': serial,
            'office_name': seal.office_name,
            'office_title': seal.office_title,
            'sealed_by': user.get_full_name() or user.username,
            'sealed_at': seal.sealed_at.isoformat(),
            'verification_url': verification_url,
            'seal_hash': doc_hash[:16] + '...',  # Truncated for display
            'signature_url': signature_url,
        }

        return seal, seal_data

    @staticmethod
    def _load_font(size: int, bold: bool = False):
        from PIL import ImageFont

        try:
            if bold:
                return ImageFont.truetype("DejaVuSans-Bold.ttf", size)
            return ImageFont.truetype("DejaVuSans.ttf", size)
        except Exception:
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
        from PIL import Image, ImageDraw

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
            glyph_draw.text((4, 4), ch, font=font, fill=fill)

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
        signature_image_field,
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

        top_start = -math.pi * 0.80
        top_end = -math.pi * 0.20
        bottom_start = math.pi * 0.83
        bottom_end = math.pi * 0.17

        font_top = cls._load_font(fit_font_for_arc(top_text, base_top_size, top_start, top_end, max_ratio=0.85), bold=True)
        font_bottom = cls._load_font(
            fit_font_for_arc(bottom_text, base_bottom_size, bottom_start, bottom_end, max_ratio=0.85),
            bold=True,
        )
        font_star = cls._load_font(int(size * 0.07 * render_scale), bold=True)
        font_center = cls._load_font(int(size * 0.032 * render_scale), bold=True)
        font_serial = cls._load_font(int(size * 0.026 * render_scale), bold=True)
        font_small = cls._load_font(int(size * 0.024 * render_scale), bold=False)

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

        star = "★"
        draw.text((center_x - text_radius, center_y), star, font=font_star, fill=navy, anchor="mm")
        draw.text((center_x + text_radius, center_y), star, font=font_star, fill=navy, anchor="mm")

        logo_size = int(size * 0.28 * render_scale)
        logo_y = center_y - (size * 0.18 * render_scale)
        logo_path = (getattr(settings, "BASE_DIR", None) / "static" / "npalogo.png") if getattr(settings, "BASE_DIR", None) else None
        if logo_path and logo_path.exists():
            try:
                logo = Image.open(str(logo_path)).convert("RGBA")
                logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
                img.alpha_composite(logo, (int(center_x - logo_size / 2), int(logo_y - logo_size / 2)))
            except Exception:
                pass

        if signature_image_field:
            try:
                with signature_image_field.open("rb") as f:
                    sig_img = Image.open(f).convert("RGBA")
                sig_target_w = int(size * 0.45 * render_scale)
                sig_target_h = int(size * 0.10 * render_scale)
                sig_img = sig_img.resize((sig_target_w, sig_target_h), Image.Resampling.LANCZOS)
                sig_y = center_y + (size * 0.06 * render_scale)
                img.alpha_composite(sig_img, (int(center_x - sig_target_w / 2), int(sig_y - sig_target_h / 2)))
            except Exception:
                pass

        approved_text = "DIGITALLY APPROVED"
        draw.text(
            (center_x, center_y + (size * 0.16 * render_scale)),
            approved_text,
            font=font_center,
            fill=navy,
            anchor="mm",
        )
        draw.text(
            (center_x, center_y + (size * 0.20 * render_scale)),
            serial_number,
            font=font_serial,
            fill=navy,
            anchor="mm",
        )

        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=1,
        )
        qr.add_data(verification_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="#1e3a5f", back_color="white").convert("RGBA")
        qr_size = int(size * 0.10 * render_scale)
        qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.NEAREST)

        qr_y = center_y + (size * 0.24 * render_scale)
        img.alpha_composite(qr_img, (int(center_x - qr_size / 2), int(qr_y)))

        buf = BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    
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

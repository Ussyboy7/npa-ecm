"""Services for seal generation and verification."""

import hashlib
import uuid
from datetime import datetime
from typing import Optional, Tuple

from django.conf import settings
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
        
        # Create the seal record
        seal = DocumentSeal.objects.create(
            document=document,
            correspondence=correspondence,
            sealed_by=user,
            signature_used=signature,
            serial_number=serial,
            seal_hash=doc_hash,
            verification_url=verification_url,
            office_name=signature.seal_office_name,
            office_title=signature.seal_office_title or f"OFFICE OF THE {user.system_role.name.upper() if user.system_role else 'EXECUTIVE'}",
        )
        
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
            'signature_url': signature.signature_image.url if signature.signature_image else None,
        }
        
        return seal, seal_data
    
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



"""Viewsets and helper endpoints for the accounts application."""

from datetime import timedelta

from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, viewsets, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from audit.services import AuditService
from .models import User, ExecutiveSignature, DocumentSeal, SealOTP
from .serializers import (
    UserSerializer, 
    ExecutiveSignatureSerializer,
    ExecutiveSignatureUploadSerializer,
    DocumentSealSerializer,
    SealVerificationSerializer,
)

# For TOTP
import pyotp
import base64
import io

try:
    import qrcode
    QRCODE_AVAILABLE = True
except ImportError:
    QRCODE_AVAILABLE = False


class UserViewSet(viewsets.ModelViewSet):
    """CRUD endpoints for managing users within the demo environment."""

    queryset = User.objects.select_related("directorate", "division", "department", "system_role")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active", "is_management", "grade_level", "system_role", "division", "department"]
    search_fields = ["username", "email", "first_name", "last_name", "employee_id"]
    ordering_fields = ["username", "first_name", "last_name", "date_joined"]
    ordering = ["username"]

    def _ensure_super_admin(self):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only super administrators may modify user records.")

    def perform_update(self, serializer):
        self._ensure_super_admin()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_super_admin()
        super().perform_destroy(instance)

    def perform_create(self, serializer):
        self._ensure_super_admin()
        serializer.save()


class CurrentUserView(APIView):
    """Return and update the authenticated user's profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Update the authenticated user's profile."""
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            # Only allow users to update certain fields themselves
            allowed_fields = ['first_name', 'last_name', 'email']
            update_data = {k: v for k, v in serializer.validated_data.items() if k in allowed_fields}
            for field, value in update_data.items():
                setattr(request.user, field, value)
            request.user.save(update_fields=allowed_fields)
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AuthTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Customize token payload to include user attributes."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["system_role"] = user.system_role.name if user.system_role else ""
        token["grade_level"] = getattr(user, "grade_level", "") or ""
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class AuthTokenObtainPairView(TokenObtainPairView):
    serializer_class = AuthTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        """Handle login and create audit log."""
        # Get username from request to look up user for audit log
        username = request.data.get('username')
        user = None
        if username:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                pass
        
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200 and user:
            # Login successful - create audit log
            from audit.models import ActivityLog
            AuditService.log_user_activity(
                user=user,
                action=ActivityLog.ActionType.USER_LOGIN,
                target_user=None,
                request=request,
                description="User logged in successfully",
            )
        
        return response


class AuthImpersonateView(APIView):
    """Allow super administrators to impersonate another user."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_superuser:
            raise PermissionDenied("Only super administrators may impersonate users.")

        identifier = request.data.get("username") or request.data.get("user_id")
        if not identifier:
            raise ValidationError({"detail": "username is required"})

        try:
            target = User.objects.get(pk=identifier)
        except (User.DoesNotExist, ValueError):
            try:
                target = User.objects.get(username=identifier)
            except User.DoesNotExist as exc:
                # Create audit log for failed impersonation attempt
                from audit.models import ActivityLog
                AuditService.log_user_activity(
                    user=request.user,
                    action=ActivityLog.ActionType.USER_IMPERSONATED,
                    target_user=None,
                    request=request,
                    description=f"Failed impersonation attempt for user: {identifier}",
                    success=False,
                    error_message=str(exc),
                )
                raise NotFound("User not found") from exc

        refresh = RefreshToken.for_user(target)
        access_lifetime: timedelta | None = settings.SIMPLE_JWT.get("ACCESS_TOKEN_LIFETIME")
        expires_in = int(access_lifetime.total_seconds()) if access_lifetime else None

        # Create audit log for successful impersonation
        from audit.models import ActivityLog
        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_IMPERSONATED,
            target_user=target,
            request=request,
            description=f"Impersonated user: {target.username}",
            metadata={"target_username": target.username, "target_id": str(target.id)},
        )

        data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(target).data,
            "expires_in": expires_in,
        }
        return Response(data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """Allow authenticated users to change their password."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Change the user's password."""
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not all([current_password, new_password, confirm_password]):
            raise ValidationError({
                "detail": "current_password, new_password, and confirm_password are required"
            })

        if new_password != confirm_password:
            raise ValidationError({"confirm_password": "New passwords do not match"})

        if len(new_password) < 8:
            raise ValidationError({"new_password": "Password must be at least 8 characters long"})

        user = request.user
        if not user.check_password(current_password):
            raise ValidationError({"current_password": "Current password is incorrect"})

        user.set_password(new_password)
        user.save(update_fields=['password'])

        # Create audit log
        from audit.models import ActivityLog
        AuditService.log_user_activity(
            user=user,
            action=ActivityLog.ActionType.USER_UPDATED,
            target_user=user,
            request=request,
            description="User changed their password",
        )

        return Response({"detail": "Password changed successfully"}, status=status.HTTP_200_OK)


class ExecutiveSignatureView(APIView):
    """
    Manage the current user's executive signature.
    
    GET: Retrieve current signature info
    POST: Upload new signature
    DELETE: Remove signature
    """
    
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get the current user's signature."""
        try:
            signature = ExecutiveSignature.objects.get(user=request.user)
            serializer = ExecutiveSignatureSerializer(signature, context={'request': request})
            return Response(serializer.data)
        except ExecutiveSignature.DoesNotExist:
            return Response({
                "has_signature": False,
                "message": "No signature uploaded",
                "user": request.user.id,
                "user_name": request.user.get_full_name() or request.user.username,
                "user_role": request.user.system_role.name if request.user.system_role else "",
            })

    def post(self, request):
        """Upload or update signature."""
        upload_serializer = ExecutiveSignatureUploadSerializer(data=request.data)
        if not upload_serializer.is_valid():
            return Response(upload_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = upload_serializer.validated_data
        signature_file = validated_data['signature_image']
        
        # Compute file hash for integrity
        file_content = signature_file.read()
        file_hash = ExecutiveSignature.compute_file_hash(file_content)
        signature_file.seek(0)  # Reset file pointer
        
        # Get or create signature record
        signature, created = ExecutiveSignature.objects.get_or_create(
            user=request.user,
            defaults={
                'signature_image': signature_file,
                'original_filename': signature_file.name,
                'file_hash': file_hash,
                'seal_office_name': validated_data.get('seal_office_name', 'NIGERIAN PORTS AUTHORITY'),
                'seal_office_title': validated_data.get('seal_office_title', ''),
                'seal_prefix': validated_data.get('seal_prefix', 'NPA'),
                'require_2fa': validated_data.get('require_2fa', True),
            }
        )
        
        if not created:
            # Update existing signature
            # Delete old file
            if signature.signature_image:
                signature.signature_image.delete(save=False)
            
            signature.signature_image = signature_file
            signature.original_filename = signature_file.name
            signature.file_hash = file_hash
            signature.seal_office_name = validated_data.get('seal_office_name', signature.seal_office_name)
            signature.seal_office_title = validated_data.get('seal_office_title', signature.seal_office_title)
            signature.seal_prefix = validated_data.get('seal_prefix', signature.seal_prefix)
            signature.require_2fa = validated_data.get('require_2fa', signature.require_2fa)
            signature.save()
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_UPDATED,
            target_user=request.user,
            request=request,
            description="Uploaded/updated digital signature",
            metadata={"file_hash": file_hash, "created": created},
        )
        
        serializer = ExecutiveSignatureSerializer(signature, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def patch(self, request):
        """Update signature settings (without uploading new image)."""
        try:
            signature = ExecutiveSignature.objects.get(user=request.user)
        except ExecutiveSignature.DoesNotExist:
            return Response(
                {"detail": "No signature found. Upload a signature first."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update allowed fields
        allowed_fields = ['seal_office_name', 'seal_office_title', 'seal_prefix', 'require_2fa', 'is_active']
        for field in allowed_fields:
            if field in request.data:
                setattr(signature, field, request.data[field])
        signature.save()
        
        serializer = ExecutiveSignatureSerializer(signature, context={'request': request})
        return Response(serializer.data)

    def delete(self, request):
        """Delete the user's signature."""
        try:
            signature = ExecutiveSignature.objects.get(user=request.user)
            
            # Delete the file
            if signature.signature_image:
                signature.signature_image.delete(save=False)
            
            signature.delete()
            
            # Audit log
            from audit.models import ActivityLog
            AuditService.log_user_activity(
                user=request.user,
                action=ActivityLog.ActionType.USER_UPDATED,
                target_user=request.user,
                request=request,
                description="Deleted digital signature",
            )
            
            return Response({"detail": "Signature deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        except ExecutiveSignature.DoesNotExist:
            return Response(
                {"detail": "No signature found"},
                status=status.HTTP_404_NOT_FOUND
            )


class SealVerificationView(APIView):
    """
    Public endpoint for verifying document seals via QR code.
    No authentication required for verification.
    """
    
    permission_classes = []  # Public access for verification
    
    def get(self, request, serial_number):
        """Verify a seal by serial number."""
        try:
            seal = DocumentSeal.objects.select_related('sealed_by', 'document', 'correspondence').get(
                serial_number=serial_number
            )
            
            response_data = {
                "valid": seal.is_valid,
                "serial_number": seal.serial_number,
                "sealed_by": seal.sealed_by.get_full_name() or seal.sealed_by.username,
                "office_name": seal.office_name,
                "office_title": seal.office_title,
                "sealed_at": seal.sealed_at.isoformat(),
            }
            
            if not seal.is_valid:
                response_data["invalidated_at"] = seal.invalidated_at.isoformat() if seal.invalidated_at else None
                response_data["invalidated_reason"] = seal.invalidated_reason
            
            if seal.document:
                response_data["document_title"] = seal.document.title
            if seal.correspondence:
                response_data["correspondence_subject"] = seal.correspondence.subject
            
            return Response(response_data)
            
        except DocumentSeal.DoesNotExist:
            return Response(
                {"valid": False, "error": "Seal not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class ApplySealView(APIView):
    """
    Apply a digital seal to a document or correspondence.
    Only users with an active ExecutiveSignature can apply seals.
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Apply seal to document or correspondence."""
        from .services import SealGenerationService
        from correspondence.models import Correspondence
        from dms.models import Document
        
        document_id = request.data.get('document_id')
        correspondence_id = request.data.get('correspondence_id')
        
        if not document_id and not correspondence_id:
            raise ValidationError({"detail": "Either document_id or correspondence_id is required"})
        
        # Check if user has an active signature
        try:
            signature = ExecutiveSignature.objects.get(user=request.user, is_active=True)
        except ExecutiveSignature.DoesNotExist:
            raise ValidationError({
                "detail": "You need to upload a digital signature before applying seals. "
                         "Go to Settings → Signature to upload your signature."
            })
        
        # Get the document or correspondence
        document = None
        correspondence = None
        
        if document_id:
            try:
                document = Document.objects.get(id=document_id)
            except Document.DoesNotExist:
                raise ValidationError({"document_id": "Document not found"})
        
        if correspondence_id:
            try:
                correspondence = Correspondence.objects.get(id=correspondence_id)
            except Correspondence.DoesNotExist:
                raise ValidationError({"correspondence_id": "Correspondence not found"})
        
        # Generate the seal
        try:
            seal, seal_data = SealGenerationService.generate_seal(
                user=request.user,
                document=document,
                correspondence=correspondence,
            )
            
            # Audit log
            from audit.models import ActivityLog
            AuditService.log_user_activity(
                user=request.user,
                action=ActivityLog.ActionType.DOCUMENT_APPROVED if document else ActivityLog.ActionType.CORRESPONDENCE_APPROVED,
                request=request,
                description=f"Applied digital seal {seal.serial_number}",
                metadata={
                    "serial_number": seal.serial_number,
                    "document_id": str(document_id) if document_id else None,
                    "correspondence_id": str(correspondence_id) if correspondence_id else None,
                },
            )
            
            return Response({
                "seal_id": str(seal.id),
                "serial_number": seal.serial_number,
                "verification_url": seal.verification_url,
                "seal_data": seal_data,
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            raise ValidationError({"detail": str(e)})


# ============================================================================
# 2FA VIEWS FOR SEAL APPLICATION
# ============================================================================

class TwoFactorStatusView(APIView):
    """
    Get the current user's 2FA status and available methods.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            signature = ExecutiveSignature.objects.get(user=request.user)
            return Response({
                "require_2fa": signature.require_2fa,
                "totp_enabled": signature.totp_enabled,
                "totp_confirmed": signature.totp_confirmed,
                "preferred_method": signature.preferred_2fa_method,
                "email": request.user.email,
                "has_email": bool(request.user.email),
                "available_methods": self._get_available_methods(signature, request.user),
            })
        except ExecutiveSignature.DoesNotExist:
            return Response({
                "require_2fa": False,
                "totp_enabled": False,
                "totp_confirmed": False,
                "preferred_method": "email",
                "email": request.user.email,
                "has_email": bool(request.user.email),
                "available_methods": ["email"] if request.user.email else [],
            })
    
    def _get_available_methods(self, signature, user):
        methods = []
        if user.email:
            methods.append("email")
        if signature.totp_enabled and signature.totp_confirmed:
            methods.append("totp")
        return methods


class RequestEmailOTPView(APIView):
    """
    Request an email OTP for seal application.
    Sends a 6-digit code to the user's email.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        correspondence_id = request.data.get('correspondence_id')
        document_id = request.data.get('document_id')
        
        if not request.user.email:
            raise ValidationError({"detail": "No email address configured. Please add an email to your profile."})
        
        # Create OTP
        otp = SealOTP.create_for_user(
            user=request.user,
            purpose="seal_application",
            correspondence_id=correspondence_id,
            document_id=document_id,
            validity_minutes=5,
        )
        
        # Send email
        try:
            from django.core.mail import send_mail
            from django.template.loader import render_to_string
            
            subject = f"NPA ECM - Seal Verification Code: {otp.code}"
            message = f"""
Your verification code for digital seal application is:

{otp.code}

This code expires in 5 minutes.

If you did not request this code, please ignore this email and contact IT support.

Nigerian Ports Authority
Electronic Correspondence Management System
            """.strip()
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[request.user.email],
                fail_silently=False,
            )
            
            # Audit log
            from audit.models import ActivityLog
            AuditService.log_user_activity(
                user=request.user,
                action=ActivityLog.ActionType.USER_UPDATED,
                request=request,
                description="Requested email OTP for seal application",
                metadata={
                    "otp_id": str(otp.id),
                    "correspondence_id": str(correspondence_id) if correspondence_id else None,
                },
            )
            
            # Mask email for response
            email = request.user.email
            masked_email = email[0:2] + "***" + email[email.index("@"):]
            
            return Response({
                "message": f"Verification code sent to {masked_email}",
                "otp_id": str(otp.id),
                "expires_in": 300,  # 5 minutes in seconds
            })
            
        except Exception as e:
            # If email fails, delete the OTP
            otp.delete()
            raise ValidationError({"detail": f"Failed to send email: {str(e)}"})


class VerifyEmailOTPView(APIView):
    """
    Verify an email OTP code.
    Returns a verification token if successful.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        otp_id = request.data.get('otp_id')
        code = request.data.get('code')
        
        if not otp_id or not code:
            raise ValidationError({"detail": "otp_id and code are required"})
        
        try:
            otp = SealOTP.objects.get(id=otp_id, user=request.user)
        except SealOTP.DoesNotExist:
            raise ValidationError({"detail": "Invalid or expired OTP"})
        
        if otp.verify(code):
            # Generate a short-lived verification token
            verification_token = self._generate_verification_token(request.user, otp)
            
            # Audit log
            from audit.models import ActivityLog
            AuditService.log_user_activity(
                user=request.user,
                action=ActivityLog.ActionType.USER_UPDATED,
                request=request,
                description="Verified email OTP for seal application",
                metadata={"otp_id": str(otp.id)},
            )
            
            return Response({
                "verified": True,
                "verification_token": verification_token,
                "expires_in": 300,  # 5 minutes
            })
        else:
            remaining_attempts = max(0, 5 - otp.attempts)
            if remaining_attempts == 0:
                return Response({
                    "verified": False,
                    "error": "Too many failed attempts. Please request a new code.",
                    "remaining_attempts": 0,
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    "verified": False,
                    "error": "Invalid code",
                    "remaining_attempts": remaining_attempts,
                }, status=status.HTTP_400_BAD_REQUEST)
    
    def _generate_verification_token(self, user, otp):
        """Generate a short-lived token for seal application."""
        import hashlib
        import time
        
        # Simple token: hash of user_id + otp_id + timestamp
        timestamp = int(time.time())
        data = f"{user.id}:{otp.id}:{timestamp}"
        token = hashlib.sha256(data.encode()).hexdigest()[:32]
        
        # Store token in cache or session (for now, just return it)
        # In production, you'd store this in Redis/cache with TTL
        return f"{token}:{timestamp}"


class SetupTOTPView(APIView):
    """
    Setup TOTP (Authenticator App) for the user.
    Returns a QR code and secret for setup.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            signature = ExecutiveSignature.objects.get(user=request.user)
        except ExecutiveSignature.DoesNotExist:
            raise ValidationError({"detail": "No signature configured. Please upload a signature first."})
        
        # Generate new TOTP secret if not exists or regenerating
        force_regenerate = request.data.get('regenerate', False)
        
        if not signature.totp_secret or force_regenerate:
            signature.totp_secret = pyotp.random_base32()
            signature.totp_enabled = True
            signature.totp_confirmed = False
            signature.save(update_fields=['totp_secret', 'totp_enabled', 'totp_confirmed'])
        
        # Generate provisioning URI for QR code
        totp = pyotp.TOTP(signature.totp_secret)
        provisioning_uri = totp.provisioning_uri(
            name=request.user.email or request.user.username,
            issuer_name="NPA ECM"
        )
        
        # Generate QR code as base64
        qr_code_base64 = None
        if QRCODE_AVAILABLE:
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(provisioning_uri)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            qr_code_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return Response({
            "secret": signature.totp_secret,
            "provisioning_uri": provisioning_uri,
            "qr_code": f"data:image/png;base64,{qr_code_base64}" if qr_code_base64 else None,
            "instructions": "Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, etc.)",
        })


class VerifyTOTPView(APIView):
    """
    Verify a TOTP code from authenticator app.
    Can be used for both setup confirmation and seal application.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        code = request.data.get('code')
        purpose = request.data.get('purpose', 'verify')  # 'setup' or 'verify'
        
        if not code:
            raise ValidationError({"detail": "code is required"})
        
        try:
            signature = ExecutiveSignature.objects.get(user=request.user)
        except ExecutiveSignature.DoesNotExist:
            raise ValidationError({"detail": "No signature configured"})
        
        if not signature.totp_secret:
            raise ValidationError({"detail": "TOTP not set up. Please set up TOTP first."})
        
        # Verify TOTP
        totp = pyotp.TOTP(signature.totp_secret)
        is_valid = totp.verify(code, valid_window=1)  # Allow 1 step tolerance
        
        if is_valid:
            # If this is setup confirmation, mark as confirmed
            if purpose == 'setup' and not signature.totp_confirmed:
                signature.totp_confirmed = True
                signature.preferred_2fa_method = 'totp'
                signature.save(update_fields=['totp_confirmed', 'preferred_2fa_method'])
            
            # Generate verification token
            verification_token = self._generate_verification_token(request.user)
            
            # Audit log
            from audit.models import ActivityLog
            AuditService.log_user_activity(
                user=request.user,
                action=ActivityLog.ActionType.USER_UPDATED,
                request=request,
                description=f"Verified TOTP for {'setup' if purpose == 'setup' else 'seal application'}",
            )
            
            return Response({
                "verified": True,
                "verification_token": verification_token,
                "totp_confirmed": signature.totp_confirmed,
                "expires_in": 300,
            })
        else:
            return Response({
                "verified": False,
                "error": "Invalid code. Please try again.",
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _generate_verification_token(self, user):
        """Generate a short-lived token for seal application."""
        import hashlib
        import time
        
        timestamp = int(time.time())
        data = f"{user.id}:totp:{timestamp}"
        token = hashlib.sha256(data.encode()).hexdigest()[:32]
        return f"{token}:{timestamp}"


class DisableTOTPView(APIView):
    """
    Disable TOTP for the user. Requires current TOTP code for security.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        code = request.data.get('code')
        
        if not code:
            raise ValidationError({"detail": "Current TOTP code is required to disable"})
        
        try:
            signature = ExecutiveSignature.objects.get(user=request.user)
        except ExecutiveSignature.DoesNotExist:
            raise ValidationError({"detail": "No signature configured"})
        
        if not signature.totp_secret:
            return Response({"detail": "TOTP is not enabled"})
        
        # Verify current code before disabling
        totp = pyotp.TOTP(signature.totp_secret)
        if not totp.verify(code, valid_window=1):
            raise ValidationError({"detail": "Invalid code. Cannot disable TOTP."})
        
        # Disable TOTP
        signature.totp_secret = ""
        signature.totp_enabled = False
        signature.totp_confirmed = False
        signature.preferred_2fa_method = 'email'
        signature.save(update_fields=['totp_secret', 'totp_enabled', 'totp_confirmed', 'preferred_2fa_method'])
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_UPDATED,
            request=request,
            description="Disabled TOTP authentication",
        )
        
        return Response({"detail": "TOTP has been disabled", "preferred_method": "email"})


class UpdatePreferred2FAView(APIView):
    """
    Update the user's preferred 2FA method.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        method = request.data.get('method')
        
        if method not in ['email', 'totp']:
            raise ValidationError({"detail": "method must be 'email' or 'totp'"})
        
        try:
            signature = ExecutiveSignature.objects.get(user=request.user)
        except ExecutiveSignature.DoesNotExist:
            raise ValidationError({"detail": "No signature configured"})
        
        # Validate method is available
        if method == 'totp' and not signature.totp_confirmed:
            raise ValidationError({"detail": "TOTP is not set up. Please set up TOTP first."})
        
        if method == 'email' and not request.user.email:
            raise ValidationError({"detail": "No email address configured"})
        
        signature.preferred_2fa_method = method
        signature.save(update_fields=['preferred_2fa_method'])
        
        return Response({
            "preferred_method": method,
            "message": f"Preferred 2FA method updated to {'Email OTP' if method == 'email' else 'Authenticator App'}",
        })

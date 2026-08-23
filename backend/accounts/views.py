"""Viewsets and helper endpoints for the accounts application."""

from datetime import datetime, timedelta
import csv
import io

from django.conf import settings
from django.http import FileResponse, HttpResponse
from django.core.files.base import ContentFile
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from common.pagination import CatalogPageNumberPagination
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from audit.services import AuditService
from .login_mfa import (
    create_mfa_challenge,
    get_or_create_login_security,
    user_requires_login_mfa,
)
from common.throttles import LoginRateThrottle, OTPRateThrottle, PasswordChangeRateThrottle
from .models import User, ExecutiveSignature, DocumentSeal, SealOTP, SignatureTemplate, UserSignaturePreferences
from .serializers import (
    UserListSerializer,
    UserSerializer, 
    ExecutiveSignatureSerializer,
    ExecutiveSignatureUploadSerializer,
    SignatureTemplateSerializer,
    UserSignaturePreferencesSerializer,
)

# For TOTP
import pyotp
import base64

try:
    import qrcode
    QRCODE_AVAILABLE = True
except ImportError:
    QRCODE_AVAILABLE = False

from PIL import Image


AUTH_ACCESS_COOKIE_NAME = "npa_ecm_access_token"
AUTH_REFRESH_COOKIE_NAME = "npa_ecm_refresh_token"


def _use_secure_auth_cookies(request=None) -> bool:
    frontend_base_url = getattr(settings, "FRONTEND_BASE_URL", "")
    frontend_uses_https = str(frontend_base_url).startswith("https://")
    return bool((request and request.is_secure()) or frontend_uses_https)


def set_auth_token_cookies(response, access_token: str, refresh_token: str, request=None) -> None:
    access_lifetime = settings.SIMPLE_JWT.get("ACCESS_TOKEN_LIFETIME")
    refresh_lifetime = settings.SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME")
    access_max_age = int(access_lifetime.total_seconds()) if access_lifetime else 3600
    refresh_max_age = int(refresh_lifetime.total_seconds()) if refresh_lifetime else 7 * 24 * 60 * 60
    secure = _use_secure_auth_cookies(request)

    response.set_cookie(
        AUTH_ACCESS_COOKIE_NAME,
        access_token,
        max_age=access_max_age,
        secure=secure,
        httponly=False,
        samesite="Lax",
        path="/",
    )
    response.set_cookie(
        AUTH_REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=refresh_max_age,
        secure=secure,
        httponly=False,
        samesite="Lax",
        path="/",
    )


def process_signature_background(image_bytes, threshold=200, fade_width=30):
    """Remove white/light background from a signature image.

    Uses brightness-based alpha mapping with smooth transition for anti-aliasing.
    Dark pixels (ink) stay opaque; white/light pixels become transparent.
    Returns PNG bytes with transparency.
    """
    img = Image.open(io.BytesIO(image_bytes))

    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    pixels = img.load()
    width, height = img.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # Perceptual brightness
            brightness = 0.299 * r + 0.587 * g + 0.114 * b

            if brightness <= (threshold - fade_width):
                new_alpha = 255
            elif brightness >= threshold:
                new_alpha = 0
            else:
                new_alpha = int(255 * (threshold - brightness) / fade_width)

            pixels[x, y] = (r, g, b, min(a, new_alpha))

    output = io.BytesIO()
    img.save(output, format='PNG')
    return output.getvalue()


class UserViewSet(viewsets.ModelViewSet):
    """CRUD endpoints for managing users within the demo environment."""

    queryset = User.objects.select_related("directorate", "division", "department", "system_role")
    serializer_class = UserSerializer

    def get_serializer_class(self):
        if self.action == "list":
            return UserListSerializer
        return UserSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active", "is_management", "grade_level", "system_role", "division", "department"]
    search_fields = ["username", "email", "first_name", "last_name", "employee_id"]
    ordering_fields = ["username", "first_name", "last_name", "date_joined", "last_login"]
    ordering = ["username"]

    def _ensure_can_manage_users(self):
        from organization.permission_utils import require_permission

        require_permission(self.request.user, "can_manage_users")

    def _ensure_super_admin(self):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only super administrators may perform this action.")

    def filter_queryset(self, queryset):
        """Override to add date range filtering."""
        queryset = super().filter_queryset(queryset)
        
        # Date range filters
        date_joined_from = self.request.query_params.get("date_joined_from")
        date_joined_to = self.request.query_params.get("date_joined_to")
        last_login_from = self.request.query_params.get("last_login_from")
        last_login_to = self.request.query_params.get("last_login_to")
        
        import logging
        logger = logging.getLogger(__name__)

        if date_joined_from:
            try:
                from_date = datetime.strptime(date_joined_from, "%Y-%m-%d").date()
                queryset = queryset.filter(date_joined__date__gte=from_date)
            except ValueError:
                logger.warning("Invalid date_joined_from format: %s", date_joined_from)
        
        if date_joined_to:
            try:
                to_date = datetime.strptime(date_joined_to, "%Y-%m-%d").date()
                queryset = queryset.filter(date_joined__date__lte=to_date)
            except ValueError:
                logger.warning("Invalid date_joined_to format: %s", date_joined_to)
        
        if last_login_from:
            try:
                from_date = datetime.strptime(last_login_from, "%Y-%m-%d").date()
                queryset = queryset.filter(last_login__date__gte=from_date)
            except ValueError:
                logger.warning("Invalid last_login_from format: %s", last_login_from)
        
        if last_login_to:
            try:
                to_date = datetime.strptime(last_login_to, "%Y-%m-%d").date()
                queryset = queryset.filter(last_login__date__lte=to_date)
            except ValueError:
                logger.warning("Invalid last_login_to format: %s", last_login_to)
        
        return queryset

    def perform_update(self, serializer):
        self._ensure_can_manage_users()
        old_instance = self.get_object()
        serializer.save()
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_user_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.USER_UPDATED,
            target_user=serializer.instance,
            request=self.request,
            description=f"Updated user: {serializer.instance.username}",
            metadata={"changes": serializer.validated_data},
        )

    def perform_destroy(self, instance):
        self._ensure_can_manage_users()
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_user_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.USER_DELETED,
            target_user=instance,
            request=self.request,
            description=f"Deleted user: {instance.username}",
        )
        
        super().perform_destroy(instance)

    def perform_create(self, serializer):
        self._ensure_can_manage_users()
        instance = serializer.save()
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_user_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.USER_CREATED,
            target_user=instance,
            request=self.request,
            description=f"Created user: {instance.username}",
        )

    @action(detail=False, methods=["post"], url_path="bulk-archive")
    def bulk_archive(self, request):
        """Archive (deactivate) multiple users at once."""
        self._ensure_can_manage_users()
        
        user_ids = request.data.get("user_ids", [])
        if not user_ids:
            raise ValidationError({"user_ids": "User IDs are required"})
        
        users = User.objects.filter(id__in=user_ids, is_active=True)
        updated_count = users.update(is_active=False)
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_UPDATED,
            target_user=None,
            request=request,
            description=f"Bulk archived {updated_count} user(s)",
            metadata={"user_ids": user_ids, "count": updated_count},
        )
        
        return Response({
            "message": f"Successfully archived {updated_count} user(s)",
            "archived_count": updated_count,
        })

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        """Delete multiple users at once."""
        self._ensure_can_manage_users()
        
        user_ids = request.data.get("user_ids", [])
        if not user_ids:
            raise ValidationError({"user_ids": "User IDs are required"})
        
        users = User.objects.filter(id__in=user_ids)
        deleted_count = users.count()
        
        # Audit log before deletion
        from audit.models import ActivityLog
        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_DELETED,
            target_user=None,
            request=request,
            description=f"Bulk deleted {deleted_count} user(s)",
            metadata={"user_ids": user_ids, "count": deleted_count},
        )
        
        users.delete()
        
        return Response({
            "message": f"Successfully deleted {deleted_count} user(s)",
            "deleted_count": deleted_count,
        })

    @action(detail=False, methods=["post"], url_path="bulk-activate")
    def bulk_activate(self, request):
        """Activate multiple users at once."""
        self._ensure_can_manage_users()
        
        user_ids = request.data.get("user_ids", [])
        if not user_ids:
            raise ValidationError({"user_ids": "User IDs are required"})
        
        users = User.objects.filter(id__in=user_ids, is_active=False)
        updated_count = users.update(is_active=True)
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_UPDATED,
            target_user=None,
            request=request,
            description=f"Bulk activated {updated_count} user(s)",
            metadata={"user_ids": user_ids, "count": updated_count},
        )
        
        return Response({
            "message": f"Successfully activated {updated_count} user(s)",
            "activated_count": updated_count,
        })

    @action(detail=False, methods=["post"], url_path="bulk-deactivate")
    def bulk_deactivate(self, request):
        """Deactivate multiple users at once."""
        self._ensure_can_manage_users()
        
        user_ids = request.data.get("user_ids", [])
        if not user_ids:
            raise ValidationError({"user_ids": "User IDs are required"})
        
        users = User.objects.filter(id__in=user_ids, is_active=True)
        updated_count = users.update(is_active=False)
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_UPDATED,
            target_user=None,
            request=request,
            description=f"Bulk deactivated {updated_count} user(s)",
            metadata={"user_ids": user_ids, "count": updated_count},
        )
        
        return Response({
            "message": f"Successfully deactivated {updated_count} user(s)",
            "deactivated_count": updated_count,
        })

    @action(detail=False, methods=["get"], url_path="export")
    def export_users(self, request):
        """Export users to CSV."""
        self._ensure_super_admin()
        
        # Get filtered queryset
        queryset = self.filter_queryset(self.get_queryset())
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="users_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        # Write header
        writer.writerow([
            'ID', 'Username', 'Email', 'First Name', 'Last Name',
            'Employee ID', 'Grade Level', 'System Role', 
            'Directorate', 'Division', 'Department',
            'Is Active', 'Is Management', 'Is Superuser',
            'Date Joined', 'Last Login', 'Last Activity'
        ])
        
        # Write data
        for user in queryset:
            writer.writerow([
                str(user.id),
                user.username,
                user.email,
                user.first_name,
                user.last_name,
                user.employee_id,
                user.grade_level,
                user.system_role.name if user.system_role else ('System Administrator' if user.is_superuser else ''),
                user.directorate.name if user.directorate else '',
                user.division.name if user.division else '',
                user.department.name if user.department else '',
                'Yes' if user.is_active else 'No',
                'Yes' if user.is_management else 'No',
                'Yes' if user.is_superuser else 'No',
                user.date_joined.strftime('%Y-%m-%d %H:%M:%S') if user.date_joined else '',
                user.last_login.strftime('%Y-%m-%d %H:%M:%S') if user.last_login else '',
                user.last_activity.strftime('%Y-%m-%d %H:%M:%S') if user.last_activity else '',
            ])
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_EXPORTED,
            target_user=None,
            request=request,
            description=f"Exported {queryset.count()} user(s) to CSV",
        )
        
        return response

    @action(detail=False, methods=["post"], url_path="import")
    def import_users(self, request):
        """Import users from CSV."""
        self._ensure_super_admin()
        
        csv_file = request.FILES.get('file')
        if not csv_file:
            raise ValidationError({"file": "CSV file is required"})
        
        if not csv_file.name.endswith('.csv'):
            raise ValidationError({"file": "File must be a CSV"})
        
        # Read CSV
        try:
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
        except Exception as e:
            raise ValidationError({"file": "Error reading CSV file. Please check the file format and try again."})
        
        created_count = 0
        updated_count = 0
        errors = []
        
        from organization.models import Role, Directorate, Division, Department
        
        for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is 1)
            try:
                username = row.get('Username', '').strip()
                email = row.get('Email', '').strip()
                
                if not username:
                    errors.append(f"Row {row_num}: Username is required")
                    continue
                
                # Get or create user
                user, created = User.objects.get_or_create(
                    username=username,
                    defaults={
                        'email': email,
                        'first_name': row.get('First Name', '').strip(),
                        'last_name': row.get('Last Name', '').strip(),
                        'employee_id': row.get('Employee ID', '').strip(),
                        'grade_level': row.get('Grade Level', '').strip(),
                        'is_active': row.get('Is Active', 'Yes').strip().lower() in ['yes', 'true', '1'],
                        'is_management': row.get('Is Management', 'No').strip().lower() in ['yes', 'true', '1'],
                    }
                )
                
                if not created:
                    # Update existing user
                    user.email = email
                    user.first_name = row.get('First Name', '').strip()
                    user.last_name = row.get('Last Name', '').strip()
                    user.employee_id = row.get('Employee ID', '').strip()
                    user.grade_level = row.get('Grade Level', '').strip()
                    user.is_active = row.get('Is Active', 'Yes').strip().lower() in ['yes', 'true', '1']
                    user.is_management = row.get('Is Management', 'No').strip().lower() in ['yes', 'true', '1']
                
                # Set role
                role_name = row.get('System Role', '').strip()
                if role_name:
                    try:
                        role = Role.objects.get(name=role_name)
                        user.system_role = role
                    except Role.DoesNotExist:
                        errors.append(f"Row {row_num}: Role '{role_name}' not found")
                
                # Set directorate
                directorate_name = row.get('Directorate', '').strip()
                if directorate_name:
                    try:
                        directorate = Directorate.objects.get(name=directorate_name)
                        user.directorate = directorate
                    except Directorate.DoesNotExist:
                        errors.append(f"Row {row_num}: Directorate '{directorate_name}' not found")
                
                # Set division
                division_name = row.get('Division', '').strip()
                if division_name:
                    try:
                        division = Division.objects.get(name=division_name)
                        user.division = division
                    except Division.DoesNotExist:
                        errors.append(f"Row {row_num}: Division '{division_name}' not found")
                
                # Set department
                department_name = row.get('Department', '').strip()
                if department_name:
                    try:
                        department = Department.objects.get(name=department_name)
                        user.department = department
                    except Department.DoesNotExist:
                        errors.append(f"Row {row_num}: Department '{department_name}' not found")
                
                # Set password if provided (for new users)
                password = row.get('Password', '').strip()
                if created and password:
                    user.set_password(password)
                elif created:
                    # Set default password
                    user.set_password('ChangeMe123!')
                
                user.save()
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
                    
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_IMPORTED,
            target_user=None,
            request=request,
            description=f"Imported CSV: {created_count} created, {updated_count} updated, {len(errors)} errors",
            metadata={
                "created_count": created_count,
                "updated_count": updated_count,
                "error_count": len(errors),
            },
        )
        
        return Response({
            "message": f"Import complete: {created_count} created, {updated_count} updated",
            "created_count": created_count,
            "updated_count": updated_count,
            "errors": errors[:50],  # Limit to first 50 errors
            "total_errors": len(errors),
        })

    @action(detail=False, methods=["get"], url_path="export-template")
    def export_template(self, request):
        """Download CSV template for user import."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="user_import_template.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Username', 'Email', 'First Name', 'Last Name',
            'Employee ID', 'Grade Level', 'System Role',
            'Directorate', 'Division', 'Department',
            'Is Active', 'Is Management', 'Password'
        ])
        # Add example row
        writer.writerow([
            'jdoe', 'jdoe@npa.gov.ng', 'John', 'Doe',
            'EMP001', 'MSS1', 'Staff Officer',
            'Operations', 'Marine Operations', 'Port Operations',
            'Yes', 'No', 'ChangeMe123!'
        ])
        
        return response


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
        try:
            if user.system_role:
                token["system_role"] = user.system_role.name
            elif user.is_superuser:
                token["system_role"] = "System Administrator"
            else:
                token["system_role"] = ""
        except (AttributeError, ValueError):
            token["system_role"] = ""
        try:
            token["grade_level"] = getattr(user, "grade_level", "")
        except (AttributeError, ValueError):
            token["grade_level"] = ""
        return token


class AuthTokenObtainPairView(TokenObtainPairView):
    serializer_class = AuthTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        """Handle login; return MFA challenge when required."""
        serializer = self.get_serializer(data=request.data)
        username = request.data.get("username")
        user = None
        if username:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                pass

        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Login authentication error: {str(e)}", exc_info=True)
            raise

        authenticated_user = serializer.user
        security = get_or_create_login_security(authenticated_user)

        if user_requires_login_mfa(authenticated_user, security):
            challenge = create_mfa_challenge(authenticated_user)
            return Response(
                {
                    "mfa_required": True,
                    "challenge_id": challenge["challenge_id"],
                    "methods": challenge["methods"],
                    "expires_in": challenge["expires_in"],
                },
                status=status.HTTP_200_OK,
            )

        refresh = serializer.validated_data["refresh"]
        access = serializer.validated_data["access"]
        response = Response(
            {"refresh": str(refresh), "access": str(access)},
            status=status.HTTP_200_OK,
        )
        set_auth_token_cookies(response, str(access), str(refresh), request=request)

        if user:
            try:
                from audit.models import ActivityLog
                AuditService.log_user_activity(
                    user=authenticated_user,
                    action=ActivityLog.ActionType.USER_LOGIN,
                    target_user=None,
                    request=request,
                    description="User logged in successfully",
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to create audit log for login: {str(e)}", exc_info=True)

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
            if str(identifier).isdigit():
                target = User.objects.get(pk=identifier, is_active=True)
            else:
                # Try UUID format
                try:
                    import uuid
                    uuid.UUID(identifier)
                    target = User.objects.get(pk=identifier, is_active=True)
                except (ValueError, User.DoesNotExist):
                    raise User.DoesNotExist("Not a valid UUID")
        except (User.DoesNotExist, ValueError):
            try:
                target = User.objects.get(username=identifier, is_active=True)
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
        response = Response(data, status=status.HTTP_200_OK)
        set_auth_token_cookies(response, data["access"], data["refresh"], request=request)
        return response


class ChangePasswordView(APIView):
    """Allow authenticated users to change their password."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [PasswordChangeRateThrottle]

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
                "user_role": request.user.system_role.name if request.user.system_role else ('System Administrator' if request.user.is_superuser else ''),
            })

    def post(self, request):
        """Upload or update signature."""
        upload_serializer = ExecutiveSignatureUploadSerializer(data=request.data)
        if not upload_serializer.is_valid():
            return Response(upload_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = upload_serializer.validated_data
        signature_file = validated_data['signature_image']

        # Background removal re-encodes to PNG — store as .png so MIME matches bytes.
        raw_bytes = signature_file.read()
        processed_bytes = process_signature_background(raw_bytes)
        file_hash = ExecutiveSignature.compute_file_hash(processed_bytes)
        original_name = signature_file.name or "signature.png"
        png_name = f"{original_name.rsplit('.', 1)[0]}.png"
        signature_file = ContentFile(processed_bytes, name=png_name)

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


class SealSignatureImageView(APIView):
    """
    Public endpoint to serve the seal's signature image (the uploaded image used when
    the seal was created). Used by DigitalSealPreview to avoid CORS issues when
    loading /media/ from a different origin. No authentication required.
    """
    permission_classes = []

    def get(self, request, serial_number):
        try:
            seal = DocumentSeal.objects.select_related('signature_used').get(serial_number=serial_number)
        except DocumentSeal.DoesNotExist:
            return Response({"detail": "Seal not found"}, status=status.HTTP_404_NOT_FOUND)
        if not seal.signature_used or not getattr(seal.signature_used, 'signature_image', None) or not seal.signature_used.signature_image:
            return Response({"detail": "No signature image for this seal"}, status=status.HTTP_404_NOT_FOUND)
        try:
            with seal.signature_used.signature_image.open('rb') as f:
                data = f.read()
        except (OSError, ValueError):
            return Response({"detail": "Signature image file unavailable"}, status=status.HTTP_404_NOT_FOUND)
        resp = FileResponse(io.BytesIO(data), content_type='image/png', as_attachment=False)
        resp['Access-Control-Allow-Origin'] = '*'
        return resp


class SealImageUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, serial_number):
        try:
            seal = DocumentSeal.objects.select_related("sealed_by").get(serial_number=serial_number)
        except DocumentSeal.DoesNotExist:
            raise NotFound("Seal not found")

        if not (request.user.is_superuser or request.user == seal.sealed_by):
            raise PermissionDenied("You cannot modify this seal")

        data_url = request.data.get("image_data_url") or request.data.get("image") or ""
        if not isinstance(data_url, str) or not data_url.startswith("data:image/png;base64,"):
            raise ValidationError({"image_data_url": "Expected a PNG data URL"})

        raw_b64 = data_url.split(",", 1)[1] if "," in data_url else ""
        try:
            image_bytes = base64.b64decode(raw_b64, validate=True)
        except Exception:
            raise ValidationError({"image_data_url": "Invalid base64 payload"})

        if len(image_bytes) > 2_500_000:
            raise ValidationError({"image_data_url": "Image too large"})

        try:
            if seal.seal_image:
                seal.seal_image.delete(save=False)
        except Exception:
            pass

        seal.seal_image.save(
            f"{seal.serial_number}.png",
            ContentFile(image_bytes),
            save=True,
        )

        return Response(
            {
                "detail": "Seal image saved",
                "seal_image_url": request.build_absolute_uri(seal.seal_image.url) if seal.seal_image else None,
            },
            status=status.HTTP_200_OK,
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
            seal = DocumentSeal.objects.select_related(
                'sealed_by', 'document', 'correspondence', 'signature_used'
            ).get(serial_number=serial_number)
            
            response_data = {
                "valid": seal.is_valid,
                "serial_number": seal.serial_number,
                "sealed_by": seal.sealed_by.get_full_name() or seal.sealed_by.username,
                "office_name": seal.office_name,
                "office_title": seal.office_title,
                "sealed_at": seal.sealed_at.isoformat(),
            }
            
            # Use proxy URL for signature image so it loads cross-origin (CORS-safe)
            signature_image_url = None
            if seal.signature_used and getattr(seal.signature_used, 'signature_image', None) and seal.signature_used.signature_image:
                signature_image_url = request.build_absolute_uri(
                    f"/api/v1/accounts/seal/signature-image/{seal.serial_number}/"
                )
            response_data["signature_image_url"] = signature_image_url
            
            if not seal.is_valid:
                response_data["invalidated_at"] = seal.invalidated_at.isoformat() if seal.invalidated_at else None
                response_data["invalidated_reason"] = seal.invalidated_reason
            
            if seal.document:
                response_data["document_title"] = seal.document.title
                response_data["document_id"] = str(seal.document.id)
            if seal.correspondence:
                response_data["correspondence_subject"] = seal.correspondence.subject
                response_data["correspondence_id"] = str(seal.correspondence.id)
            
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
        from .services import SealGenerationService, VerificationTokenService
        from correspondence.models import Correspondence
        from dms.models import Document
        
        document_id = request.data.get('document_id')
        correspondence_id = request.data.get('correspondence_id')
        
        if not document_id and not correspondence_id:
            raise ValidationError({"detail": "Either document_id or correspondence_id is required"})
        
        # Require 2FA verification token for seal application
        verification_token = request.data.get('verification_token')
        if not verification_token:
            raise ValidationError({"detail": "2FA verification is required. Please complete 2FA verification first."})
        
        if not VerificationTokenService.verify_token(
            token=verification_token,
            user_id=str(request.user.id),
            purpose="seal_application",
        ):
            raise ValidationError({"detail": "Invalid or expired verification token. Please complete 2FA verification again."})
        
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
                request=request,  # Pass request to detect correct frontend URL
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
            raise ValidationError({"detail": "Invalid data format. Please check your input."})


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
    throttle_classes = [OTPRateThrottle]
    
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
            raise ValidationError({"detail": "Failed to send email. Please try again or contact support."})


class VerifyEmailOTPView(APIView):
    """
    Verify an email OTP code.
    Returns a verification token if successful.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [OTPRateThrottle]
    
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
    
    def _generate_verification_token(self, user, otp=None):
        """Generate a short-lived token for seal application, stored in cache."""
        from .services import VerificationTokenService
        return VerificationTokenService.generate_token(
            user_id=str(user.id),
            purpose="seal_application",
        )


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
    throttle_classes = [OTPRateThrottle]
    
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
        """Generate a short-lived token for seal application, stored in cache."""
        from .services import VerificationTokenService
        return VerificationTokenService.generate_token(
            user_id=str(user.id),
            purpose="seal_application:totp",
        )


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


class SignatureTemplateViewSet(viewsets.ModelViewSet):
    """API endpoint for signature templates."""
    
    queryset = SignatureTemplate.objects.filter(is_active=True)
    serializer_class = SignatureTemplateSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["template_type", "style", "default_apply", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["template_type", "name"]
    
    def get_queryset(self):
        """Return active templates."""
        return super().get_queryset().filter(is_active=True)


class UserSignaturePreferencesViewSet(viewsets.ModelViewSet):
    """API endpoint for user signature preferences."""
    
    queryset = UserSignaturePreferences.objects.select_related("user", "default_template")
    serializer_class = UserSignaturePreferencesSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    
    def get_queryset(self):
        """Users can only access their own preferences."""
        return super().get_queryset().filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Set the user to the current user."""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=["get", "patch"])
    def my_preferences(self, request):
        """Get or update current user's preferences."""
        preferences, created = UserSignaturePreferences.objects.get_or_create(
            user=request.user
        )
        
        if request.method == "GET":
            serializer = self.get_serializer(preferences)
            return Response(serializer.data)
        
        # PATCH
        serializer = self.get_serializer(preferences, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

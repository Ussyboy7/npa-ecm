"""Viewsets and helper endpoints for the accounts application."""

from datetime import datetime, timedelta
import csv
import hashlib
import io
import secrets

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import FileResponse, HttpResponse
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from common.grade_utils import MANAGEMENT_GRADES
from common.pagination import CatalogPageNumberPagination
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView

from audit.services import AuditService
from organization.permissions_catalog import role_has_privileged_permissions
from .login_mfa import (
    create_mfa_challenge,
    get_or_create_login_security,
    user_requires_login_mfa,
)
from common.throttles import (
    AnonSealImageThrottle,
    AnonSealVerifyThrottle,
    LoginRateThrottle,
    OTPRateThrottle,
    PasswordChangeRateThrottle,
    TotpSetupRateThrottle,
)
from .models import User, ExecutiveSignature, DocumentSeal, SealOTP, SignatureTemplate, UserSignaturePreferences
from .serializers import (
    UserListSerializer,
    UserSerializer, 
    ExecutiveSignatureSerializer,
    ExecutiveSignatureSettingsSerializer,
    ExecutiveSignatureUploadSerializer,
    SignatureTemplateSerializer,
    UserSignaturePreferencesSerializer,
)
from .auth_cookies import (
    AUTH_IMPERSONATING_COOKIE_NAME,
    AUTH_ORIGINAL_REFRESH_COOKIE_NAME,
    clear_auth_token_cookies,
    clear_impersonation_cookies,
    csrf_token_is_valid,
    get_refresh_token_from_cookies,
    set_auth_token_cookies,
    set_impersonation_cookies,
)

# For TOTP
import pyotp

from PIL import Image, ImageOps, UnidentifiedImageError


def process_signature_background(image_bytes, threshold=200, fade_width=30):
    """Remove white/light background from a signature image.

    Uses brightness-based alpha mapping with smooth transition for anti-aliasing.
    Dark pixels (ink) stay opaque; white/light pixels become transparent.
    Returns PNG bytes with transparency.
    """
    img = Image.open(io.BytesIO(image_bytes))

    # A small compressed file can still decode to a huge pixel grid. Reject
    # those before the per-pixel Python loop to protect workers.
    if img.width * img.height > 12_000_000:
        raise ValueError("Signature image dimensions are too large")

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
    search_fields = [
        "username",
        "email",
        "first_name",
        "middle_name",
        "last_name",
        "employee_id",
        "personnel_number",
        "designation",
        "system_role__name",
        "directorate__name",
        "division__name",
        "department__name",
    ]
    ordering_fields = ["username", "first_name", "last_name", "date_joined", "last_login"]
    ordering = ["username"]

    def _ensure_can_manage_users(self):
        from organization.permission_utils import require_permission

        require_permission(self.request.user, "can_manage_users")

    def _ensure_super_admin(self):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only super administrators may perform this action.")

    @staticmethod
    def _target_is_administrative(target) -> bool:
        return bool(
            getattr(target, "is_superuser", False)
            or getattr(target, "is_staff", False)
            or role_has_privileged_permissions(getattr(target, "system_role", None))
        )

    def _ensure_can_manage_target(self, target):
        """Prevent a user manager from taking over an administrative account."""
        if self.request.user.is_superuser or target.pk == self.request.user.pk:
            return
        if self._target_is_administrative(target):
            raise PermissionDenied(
                "Only a super administrator may modify another administrative account."
            )
        from organization.org_scope import (
            scoped_people_admin_boundary,
            target_within_people_admin_boundary,
        )

        boundary = scoped_people_admin_boundary(self.request.user)
        if not target_within_people_admin_boundary(boundary, target):
            raise PermissionDenied(
                "You can only manage users within your own organisational unit."
            )

    def _ensure_can_manage_targets(self, targets):
        if self.request.user.is_superuser:
            return
        from organization.org_scope import (
            scoped_people_admin_boundary,
            target_within_people_admin_boundary,
        )

        boundary = scoped_people_admin_boundary(self.request.user)
        for target in targets:
            if self._target_is_administrative(target):
                raise PermissionDenied(
                    "Only a super administrator may modify administrative accounts in bulk."
                )
            if not target_within_people_admin_boundary(boundary, target):
                raise PermissionDenied(
                    "You can only manage users within your own organisational unit."
                )

    def _ensure_can_create_in_scope(self, validated_data):
        """Scoped people managers may only create users in their own unit."""
        if self.request.user.is_superuser:
            return
        from organization.org_scope import scoped_people_admin_boundary

        boundary = scoped_people_admin_boundary(self.request.user)
        if boundary is None:
            return
        division = validated_data.get("division")
        department = validated_data.get("department")
        if boundary.level == "division" and boundary.division_id:
            in_scope = (
                division is not None and division.pk == boundary.division_id
            ) or (
                division is None
                and department is not None
                and department.division_id == boundary.division_id
            )
        elif boundary.level == "department" and boundary.department_id:
            in_scope = department is not None and department.pk == boundary.department_id
        else:
            in_scope = False
        if not in_scope:
            raise PermissionDenied(
                "You can only create users within your own organisational unit."
            )

    @staticmethod
    def _ensure_active_superuser_remains(targets):
        """Block removals that would leave no active superuser behind."""
        active_targets = [
            target.pk
            for target in targets
            if getattr(target, "is_superuser", False) and getattr(target, "is_active", False)
        ]
        if not active_targets:
            return
        remaining = User.objects.filter(is_superuser=True, is_active=True).exclude(
            pk__in=active_targets
        )
        if not remaining.exists():
            raise ValidationError(
                {"detail": "At least one active super administrator must remain."}
            )

    def filter_queryset(self, queryset):
        """Override to add date range and batched ID filtering."""
        queryset = super().filter_queryset(queryset)

        # Single request lookup for payloads that carry many user IDs.
        raw_ids = self.request.query_params.get("ids")
        if raw_ids is not None:
            user_ids = set()
            for raw_id in raw_ids.split(","):
                try:
                    user_ids.add(int(raw_id.strip()))
                except (TypeError, ValueError):
                    continue
            queryset = queryset.filter(id__in=user_ids) if user_ids else queryset.none()
        
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

    @staticmethod
    def _user_field_changed(target, field, value) -> bool:
        """Compare a submitted field with the stored value; password is always sensitive."""
        if field == "password":
            return True
        if field in {"system_role", "directorate", "division", "department"}:
            current_id = getattr(target, f"{field}_id", None)
            new_id = getattr(value, "pk", None) if value is not None else None
            return current_id != new_id
        return getattr(target, field, None) != value

    def _ensure_can_change_sensitive_identity_fields(self, target, validated_data):
        """Grade and management status drive org-wide scope, so guard them."""
        if self.request.user.is_superuser:
            return
        from organization.permission_utils import user_has_permission

        if user_has_permission(self.request.user, "can_manage_roles"):
            return
        changed = sorted(
            field
            for field in ("grade_level", "is_management")
            if field in validated_data
            and self._user_field_changed(target, field, validated_data[field])
        )
        if changed:
            raise PermissionDenied(
                "Only a role administrator can change grade level or management status."
            )

    def _ensure_can_assign_creation_privileges(self, validated_data):
        """Apply the same grade/management guard when creating a user.

        A scoped people manager sets the new account's password, so allowing a
        management grade here would hand them an account with wider org reach
        than their own. Ordinary staff grades remain available.
        """
        if self.request.user.is_superuser:
            return
        from organization.permission_utils import user_has_permission

        if user_has_permission(self.request.user, "can_manage_roles"):
            return
        grade = str(validated_data.get("grade_level") or "").strip().upper()
        if grade in MANAGEMENT_GRADES or validated_data.get("is_management"):
            raise PermissionDenied(
                "Only a role administrator can create a user with a management "
                "grade or management status."
            )

    def perform_update(self, serializer):
        self._ensure_can_manage_users()
        target = self.get_object()
        self._ensure_can_manage_target(target)
        self._ensure_can_change_sensitive_identity_fields(
            target, serializer.validated_data
        )
        if target.pk == self.request.user.pk and not self.request.user.is_superuser:
            allowed = {
                "first_name",
                "middle_name",
                "last_name",
                "email",
                "phone",
                "bio",
                "honorific",
            }
            disallowed = {
                field
                for field, value in serializer.validated_data.items()
                if field not in allowed
                and self._user_field_changed(target, field, value)
            }
            if disallowed:
                raise PermissionDenied(
                    "You cannot change administrative fields on your own account here. "
                    "Use your profile settings or ask a super administrator."
                )
        if target.is_superuser and not serializer.validated_data.get("is_active", target.is_active):
            self._ensure_active_superuser_remains([target])
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
        self._ensure_can_manage_target(instance)
        self._ensure_active_superuser_remains([instance])
        
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
        self._ensure_can_create_in_scope(serializer.validated_data)
        self._ensure_can_assign_creation_privileges(serializer.validated_data)
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
        
        targets = list(User.objects.filter(id__in=user_ids, is_active=True))
        self._ensure_can_manage_targets(targets)
        self._ensure_active_superuser_remains(targets)
        updated_count = User.objects.filter(pk__in=[user.pk for user in targets]).update(is_active=False)
        
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
        
        targets = list(User.objects.filter(id__in=user_ids))
        self._ensure_can_manage_targets(targets)
        self._ensure_active_superuser_remains(targets)
        deleted_count = len(targets)
        
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
        
        User.objects.filter(pk__in=[user.pk for user in targets]).delete()
        
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
        
        targets = list(User.objects.filter(id__in=user_ids, is_active=False))
        self._ensure_can_manage_targets(targets)
        updated_count = User.objects.filter(pk__in=[user.pk for user in targets]).update(is_active=True)
        
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
        
        targets = list(User.objects.filter(id__in=user_ids, is_active=True))
        self._ensure_can_manage_targets(targets)
        self._ensure_active_superuser_remains(targets)
        updated_count = User.objects.filter(pk__in=[user.pk for user in targets]).update(is_active=False)
        
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
            'Middle Name', 'Honorific', 'Employee ID', 'Person No.', 'Designation',
            'Grade Level', 'System Role',
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
                user.middle_name,
                user.honorific,
                user.employee_id,
                user.personnel_number,
                user.designation,
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
        except Exception:
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
                        'middle_name': row.get('Middle Name', '').strip(),
                        'last_name': row.get('Last Name', '').strip(),
                        'honorific': row.get('Honorific', row.get('Title', '')).strip(),
                        'employee_id': row.get('Employee ID', '').strip(),
                        'personnel_number': row.get('Person No.', row.get('Personnel Number', '')).strip(),
                        'designation': row.get('Designation', '').strip(),
                        'grade_level': row.get('Grade Level', '').strip(),
                        'is_active': row.get('Is Active', 'Yes').strip().lower() in ['yes', 'true', '1'],
                        'is_management': row.get('Is Management', 'No').strip().lower() in ['yes', 'true', '1'],
                    }
                )
                
                if not created:
                    # Update existing user
                    user.email = email
                    user.first_name = row.get('First Name', '').strip()
                    user.middle_name = row.get('Middle Name', '').strip()
                    user.last_name = row.get('Last Name', '').strip()
                    user.honorific = row.get('Honorific', row.get('Title', '')).strip()
                    user.employee_id = row.get('Employee ID', '').strip()
                    user.personnel_number = row.get('Person No.', row.get('Personnel Number', '')).strip()
                    user.designation = row.get('Designation', '').strip()
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
            'Username', 'Email', 'Title', 'First Name', 'Middle Name', 'Last Name',
            'Employee ID', 'Person No.', 'Designation', 'Grade Level', 'System Role',
            'Directorate', 'Division', 'Department',
            'Is Active', 'Is Management', 'Password'
        ])
        # Add example row
        writer.writerow([
            'jdoe', 'jdoe@npa.gov.ng', 'Mr.', 'John', 'Michael', 'Doe',
            'EMP001', 'A0001', 'STAFF OFFICER', 'MSS1', 'Staff Officer',
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
            allowed_fields = ['first_name', 'middle_name', 'last_name', 'email', 'phone', 'bio']
            update_data = {k: v for k, v in serializer.validated_data.items() if k in allowed_fields}
            for field, value in update_data.items():
                setattr(request.user, field, value)
            if update_data:
                request.user.save(update_fields=list(update_data))
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserPhotoView(APIView):
    """Upload or replace the authenticated user's profile photo."""

    permission_classes = [IsAuthenticated]
    MAX_BYTES = 5 * 1024 * 1024
    MAX_PIXELS = 25_000_000
    MAX_DIMENSION = 512
    ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}

    def post(self, request):
        upload = request.FILES.get("profile_photo")
        if not upload:
            return Response(
                {"profile_photo": "Choose an image to upload."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size > self.MAX_BYTES:
            return Response(
                {"profile_photo": "Profile photo must be 5MB or less."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.content_type not in self.ALLOWED_TYPES:
            return Response(
                {"profile_photo": "Use a PNG, JPEG, or WebP image."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with Image.open(upload) as source:
                width, height = source.size
                if width * height > self.MAX_PIXELS:
                    return Response(
                        {"profile_photo": "Image dimensions are too large."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                image = ImageOps.exif_transpose(source)
                image.thumbnail((self.MAX_DIMENSION, self.MAX_DIMENSION), Image.LANCZOS)
                if image.mode in ("RGBA", "LA") or "transparency" in image.info:
                    rgba = image.convert("RGBA")
                    flattened = Image.new("RGB", rgba.size, (255, 255, 255))
                    flattened.paste(rgba, mask=rgba.split()[-1])
                    image = flattened
                else:
                    image = image.convert("RGB")
                buffer = io.BytesIO()
                image.save(buffer, format="JPEG", quality=85, optimize=True)
        except (UnidentifiedImageError, OSError, ValueError):
            return Response(
                {"profile_photo": "Could not process this image. Try a different file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_name = request.user.profile_photo.name if request.user.profile_photo else ""
        request.user.profile_photo.save(
            f"profile-{request.user.id}.jpg",
            ContentFile(buffer.getvalue()),
            save=True,
        )
        if old_name and old_name != request.user.profile_photo.name:
            try:
                request.user.profile_photo.storage.delete(old_name)
            except OSError:
                pass

        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


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
    # Signing in must not authenticate an existing session: a stale cookie
    # without a CSRF token would otherwise reject the request before login.
    authentication_classes = []

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
        # Never expose JWTs to JavaScript. The browser keeps them in httpOnly
        # cookies; legacy API clients can still use the token endpoints directly.
        response = Response({"detail": "Signed in."}, status=status.HTTP_200_OK)
        clear_impersonation_cookies(response, request=request)
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

        response = Response(
            {"user": UserSerializer(target).data, "expires_in": expires_in},
            status=status.HTTP_200_OK,
        )
        # Keep the administrator's original refresh token server-side so the
        # browser never needs to hold or replay it from JavaScript.
        if not request.COOKIES.get(AUTH_IMPERSONATING_COOKIE_NAME):
            original_refresh = get_refresh_token_from_cookies(request)
            if original_refresh:
                set_impersonation_cookies(
                    response,
                    request,
                    original_refresh,
                    request.user.id,
                )
        set_auth_token_cookies(
            response,
            str(refresh.access_token),
            str(refresh),
            request=request,
        )
        return response


class AuthImpersonateReturnView(APIView):
    """Restore the administrator session stored when impersonation began."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        original_refresh = request.COOKIES.get(AUTH_ORIGINAL_REFRESH_COOKIE_NAME)
        if not request.COOKIES.get(AUTH_IMPERSONATING_COOKIE_NAME) or not original_refresh:
            raise ValidationError({"detail": "No impersonation session is active."})

        try:
            refresh = RefreshToken(original_refresh)
            original_user = User.objects.get(pk=refresh.get("user_id"), is_superuser=True, is_active=True)
        except (TokenError, User.DoesNotExist, TypeError):
            response = Response(
                {"detail": "Your original session has expired. Please sign in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_token_cookies(response, request=request)
            return response

        new_refresh = RefreshToken.for_user(original_user)
        response = Response({"detail": "Returned to your primary account."})
        clear_impersonation_cookies(response, request=request)
        set_auth_token_cookies(
            response,
            str(new_refresh.access_token),
            str(new_refresh),
            request=request,
        )
        return response


class CookieTokenRefreshView(APIView):
    """Refresh JWTs from the httpOnly refresh cookie and rotate both cookies."""

    permission_classes = []
    authentication_classes = []

    def post(self, request):
        # Pre-migration sessions have a readable refresh cookie but no CSRF
        # cookie. An explicit body token is not ambient, so it can safely
        # bootstrap those sessions; cookie-only refreshes still require CSRF.
        explicit_refresh = str(request.data.get("refresh") or "").strip()
        refresh_raw = explicit_refresh or get_refresh_token_from_cookies(request)
        if not refresh_raw:
            response = Response(
                {"detail": "No refresh session is available."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_token_cookies(response, request=request)
            return response
        if not explicit_refresh and not csrf_token_is_valid(request):
            raise PermissionDenied("CSRF verification failed.")

        serializer = TokenRefreshSerializer(data={"refresh": refresh_raw})
        try:
            valid = serializer.is_valid()
        except (TokenError, User.DoesNotExist, TypeError, KeyError):
            # A blacklisted/rotated token or a token whose user row is gone is
            # a dead session, not a server fault. SimpleJWT raises these out of
            # validate(), where is_valid() does not catch them.
            valid = False
        if not valid:
            response = Response(
                {"detail": "Your session has expired. Please sign in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_token_cookies(response, request=request)
            return response

        access = serializer.validated_data["access"]
        refresh = serializer.validated_data.get("refresh", refresh_raw)
        response = Response({"detail": "Session refreshed."})
        set_auth_token_cookies(response, str(access), str(refresh), request=request)
        return response


class LogoutView(APIView):
    """Blacklist the refresh token and clear all browser session cookies."""

    permission_classes = []
    authentication_classes = []

    def post(self, request):
        refresh_raw = get_refresh_token_from_cookies(request)
        if refresh_raw and csrf_token_is_valid(request):
            try:
                RefreshToken(refresh_raw).blacklist()
            except TokenError:
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_auth_token_cookies(response, request=request)
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


class InitialPasswordSetView(APIView):
    """Set the first password for an imported account from a signed link."""

    permission_classes = []
    throttle_classes = [PasswordChangeRateThrottle]

    def post(self, request):
        uid = request.data.get("uid") or ""
        token = request.data.get("token") or ""
        new_password = request.data.get("new_password") or ""
        confirm_password = request.data.get("confirm_password") or ""

        if not all([uid, token, new_password, confirm_password]):
            raise ValidationError(
                {"detail": "uid, token, new_password, and confirm_password are required"}
            )
        if new_password != confirm_password:
            raise ValidationError({"confirm_password": "Passwords do not match"})
        if len(new_password) < 8:
            raise ValidationError(
                {"new_password": "Password must be at least 8 characters long"}
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise ValidationError({"detail": "This setup link is invalid or has expired."})

        if not user.is_active or not default_token_generator.check_token(user, token):
            raise ValidationError({"detail": "This setup link is invalid or has expired."})

        # A setup link must never become a way to take over an administrative
        # account. Administrators reset their own password through the
        # authenticated change-password flow instead.
        if (
            getattr(user, "is_superuser", False)
            or getattr(user, "is_staff", False)
            or role_has_privileged_permissions(getattr(user, "system_role", None))
        ):
            raise ValidationError({"detail": "This setup link is invalid or has expired."})

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise ValidationError({"new_password": exc.messages})

        user.set_password(new_password)
        user.save(update_fields=["password"])

        try:
            from audit.models import ActivityLog

            AuditService.log_user_activity(
                user=user,
                action=ActivityLog.ActionType.USER_UPDATED,
                target_user=user,
                request=request,
                description="Completed first-login password setup",
            )
        except Exception:
            pass

        return Response({"detail": "Password set successfully"}, status=status.HTTP_200_OK)


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
        # BooleanField defaults missing HTML fields to False, so only honour
        # require_2fa when the client explicitly sent it.
        require_2fa_provided = 'require_2fa' in request.data

        # Background removal re-encodes to PNG — store as .png so MIME matches bytes.
        raw_bytes = signature_file.read()
        try:
            processed_bytes = process_signature_background(raw_bytes)
        except Exception:
            return Response(
                {"signature_image": "Could not process this image. Use a PNG or JPG under 2MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        file_hash = ExecutiveSignature.compute_file_hash(processed_bytes)
        original_name = signature_file.name or "signature.png"
        png_name = f"{original_name.rsplit('.', 1)[0]}.png"
        signature_file = ContentFile(processed_bytes, name=png_name)

        old_image_name = ""
        with transaction.atomic():
            signature, created = ExecutiveSignature.objects.get_or_create(
                user=request.user,
                defaults={
                    'signature_image': signature_file,
                    'original_filename': signature_file.name,
                    'file_hash': file_hash,
                    'seal_office_name': validated_data.get('seal_office_name') or 'NIGERIAN PORTS AUTHORITY',
                    'seal_office_title': validated_data.get('seal_office_title', ''),
                    'seal_prefix': validated_data.get('seal_prefix') or 'NPA',
                    'require_2fa': validated_data['require_2fa'] if require_2fa_provided else True,
                }
            )

            if not created:
                old_image_name = signature.signature_image.name if signature.signature_image else ""
                signature.signature_image = signature_file
                signature.original_filename = signature_file.name
                signature.file_hash = file_hash
                signature.seal_office_name = validated_data.get('seal_office_name', signature.seal_office_name)
                signature.seal_office_title = validated_data.get('seal_office_title', signature.seal_office_title)
                signature.seal_prefix = validated_data.get('seal_prefix', signature.seal_prefix)
                if require_2fa_provided:
                    signature.require_2fa = validated_data['require_2fa']
                signature.is_active = True
                signature.save()

        if old_image_name and old_image_name != signature.signature_image.name:
            try:
                default_storage.delete(old_image_name)
            except OSError:
                pass
        
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

        serializer = ExecutiveSignatureSettingsSerializer(
            signature, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        if (
            "require_2fa" in serializer.validated_data
            and signature.require_2fa
            and not serializer.validated_data["require_2fa"]
        ):
            from .services import StepUpService

            StepUpService.assert_verified(
                request,
                password=request.data.get("current_password"),
                code=request.data.get("code"),
            )
        changed_fields = sorted(serializer.validated_data.keys())
        signature = serializer.save()

        if changed_fields:
            from audit.models import ActivityLog

            AuditService.log_user_activity(
                user=request.user,
                action=ActivityLog.ActionType.USER_UPDATED,
                target_user=request.user,
                request=request,
                description="Updated digital seal settings",
                metadata={"fields": changed_fields},
            )
        
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
    Authenticated endpoint for the immutable signature image used by a seal.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, serial_number):
        try:
            seal = DocumentSeal.objects.select_related('signature_used').get(serial_number=serial_number)
        except DocumentSeal.DoesNotExist:
            return Response({"detail": "Seal not found"}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_superuser and seal.sealed_by_id != request.user.id:
            raise PermissionDenied("You cannot access this seal's signature")

        signature_field = seal.signature_image
        if not signature_field:
            return Response({"detail": "No signature image for this seal"}, status=status.HTTP_404_NOT_FOUND)
        try:
            with signature_field.open('rb') as f:
                data = f.read()
        except (OSError, ValueError):
            return Response({"detail": "Signature image file unavailable"}, status=status.HTTP_404_NOT_FOUND)
        resp = FileResponse(io.BytesIO(data), content_type='image/png', as_attachment=False)
        return resp


class SealImageView(APIView):
    """Serve the hash-verified, server-rendered image for an issued seal."""

    permission_classes = [IsAuthenticated]

    def get(self, request, serial_number):
        try:
            seal = DocumentSeal.objects.select_related("sealed_by", "signature_used").get(
                serial_number=serial_number
            )
        except DocumentSeal.DoesNotExist:
            raise NotFound("Seal not found")

        from .services import SealGenerationService

        image_bytes = SealGenerationService.ensure_seal_image(seal)
        if not image_bytes:
            raise NotFound("Seal image unavailable")

        response = FileResponse(io.BytesIO(image_bytes), content_type="image/png", as_attachment=False)
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response

    def post(self, request, serial_number):
        # The seal image is evidence generated at issue time. There is no
        # supported path for replacing it with client-rendered bytes.
        raise MethodNotAllowed(
            "POST",
            detail="Seal images are generated server-side and cannot be replaced.",
        )


class SealVerificationView(APIView):
    """
    Public endpoint for verifying document seals via QR code.
    No authentication required for verification.
    """
    
    permission_classes = []  # Public access for verification
    throttle_classes = [AnonSealVerifyThrottle]

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
            
            if not seal.is_valid:
                response_data["invalidated_at"] = seal.invalidated_at.isoformat() if seal.invalidated_at else None
                response_data["invalidated_reason"] = seal.invalidated_reason
            
            if seal.document:
                response_data["document_title"] = seal.document.title
                response_data["document_id"] = str(seal.document.id)
            if seal.correspondence:
                response_data["correspondence_subject"] = seal.correspondence.subject
                response_data["correspondence_id"] = str(seal.correspondence.id)

            from correspondence.models import ApprovalSnapshot

            snapshot = (
                ApprovalSnapshot.objects.filter(seal=seal)
                .order_by("-created_at")
                .first()
            )
            if snapshot:
                response_data["pdf_sha256"] = snapshot.pdf_sha256
                response_data["pdf_generated_at"] = (
                    snapshot.pdf_generated_at.isoformat()
                    if snapshot.pdf_generated_at
                    else None
                )
                response_data["snapshot_reference"] = snapshot.document_reference
            
            return Response(response_data)
            
        except DocumentSeal.DoesNotExist:
            return Response(
                {"valid": False, "error": "Seal not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class SealPublicImageView(APIView):
    """Serve the issued seal image to anyone holding a valid serial.

    This is the evidence artifact itself (hash-verified against the seal
    record), not a client rendering. Invalidated and unknown seals return 404
    so a verifier is never shown artwork that implies a valid seal.

    ``?width=<px>`` returns a downscaled rendition of the same stored PNG for
    page display; the full-resolution artifact is always the no-parameter
    response and remains the download.
    """

    permission_classes = []
    throttle_classes = [AnonSealImageThrottle]
    DISPLAY_WIDTHS = (220, 440, 660)

    def get(self, request, serial_number):
        try:
            seal = DocumentSeal.objects.get(serial_number=serial_number, is_valid=True)
        except DocumentSeal.DoesNotExist:
            raise NotFound("Seal not found")

        from .services import SealGenerationService

        # Read-only: an anonymous GET must never render or cache-miss regenerate.
        image_bytes = SealGenerationService.stored_seal_image(seal)
        if not image_bytes:
            raise NotFound("Seal image unavailable")

        cache_control = "public, max-age=300"
        requested_width = request.query_params.get("width")
        if requested_width:
            try:
                width = int(requested_width)
            except (TypeError, ValueError):
                raise ValidationError({"width": "Unsupported display width."})
            if width not in self.DISPLAY_WIDTHS:
                raise ValidationError(
                    {"width": f"Supported display widths: {', '.join(map(str, self.DISPLAY_WIDTHS))}."}
                )
            image_bytes = self._downscale(image_bytes, width)
            cache_control = "public, max-age=86400"

        response = FileResponse(io.BytesIO(image_bytes), content_type="image/png", as_attachment=False)
        response["Cache-Control"] = cache_control
        response["X-Content-Type-Options"] = "nosniff"
        return response

    @staticmethod
    def _downscale(image_bytes: bytes, width: int) -> bytes:
        """Scale the stored artifact down; never upscale or redraw it."""
        from PIL import Image

        with Image.open(io.BytesIO(image_bytes)) as image:
            if image.width <= width:
                return image_bytes
            rendition = image.convert("RGBA")
            height = max(1, round(rendition.height * (width / rendition.width)))
            rendition = rendition.resize((width, height), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            rendition.save(buffer, format="PNG", optimize=True)
            return buffer.getvalue()


class SealDocumentCheckView(APIView):
    """Compare a supplied PDF against the frozen approved copy for a seal."""

    permission_classes = []

    def post(self, request, serial_number):
        try:
            seal = DocumentSeal.objects.get(serial_number=serial_number)
        except DocumentSeal.DoesNotExist:
            return Response({"detail": "Seal not found"}, status=status.HTTP_404_NOT_FOUND)

        upload = request.FILES.get("file")
        if upload is None or not upload.name.lower().endswith(".pdf"):
            raise ValidationError({"file": "Upload the approved-copy PDF."})
        if upload.size > 25 * 1024 * 1024:
            raise ValidationError({"file": "PDF must be 25 MB or smaller."})

        from correspondence.models import ApprovalSnapshot

        snapshot = (
            ApprovalSnapshot.objects.filter(seal=seal, pdf_sha256__gt="")
            .order_by("-created_at")
            .first()
        )
        if snapshot is None:
            return Response(
                {"detail": "No archived approved-copy hash is available for this seal."},
                status=status.HTTP_404_NOT_FOUND,
            )

        digest = hashlib.sha256(upload.read()).hexdigest()
        matches = secrets.compare_digest(digest, snapshot.pdf_sha256)
        return Response(
            {
                "matches": matches,
                "expected_sha256": snapshot.pdf_sha256,
                "actual_sha256": digest,
                "pdf_generated_at": (
                    snapshot.pdf_generated_at.isoformat()
                    if snapshot.pdf_generated_at
                    else None
                ),
                "detail": (
                    "Document matches the archived approved copy."
                    if matches
                    else "Document differs from the archived approved copy."
                ),
            },
            status=status.HTTP_200_OK,
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
        if not ExecutiveSignature.objects.filter(
            user=request.user, is_active=True
        ).exists():
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
                verification_token=request.data.get('verification_token'),
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
            
        except ValueError:
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
        from .services import SealTwoFactorService

        signature = ExecutiveSignature.objects.filter(user=request.user).first()
        return Response(SealTwoFactorService.get_status(request.user, signature))


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
        purpose = str(request.data.get('purpose') or 'seal_application')
        if purpose not in {'seal_application', 'email_otp_setup'}:
            raise ValidationError({"detail": "Unsupported verification purpose"})
        
        if not request.user.email:
            raise ValidationError({"detail": "No email address configured. Please add an email to your profile."})

        signature = ExecutiveSignature.objects.filter(user=request.user).first()
        if purpose == 'email_otp_setup' and not signature:
            raise ValidationError({"detail": "Upload a signature before setting up seal 2FA."})
        if purpose == 'seal_application' and signature and not signature.email_otp_enabled:
            raise ValidationError({"detail": "Email OTP is disabled for seal verification."})
        
        # Create OTP
        otp = SealOTP.create_for_user(
            user=request.user,
            purpose=purpose,
            correspondence_id=correspondence_id,
            document_id=document_id,
            validity_minutes=5,
        )
        
        # Send email
        try:
            from django.core.mail import send_mail
            subject = "NPA ECM - Verification Code"
            message = f"""
Your verification code is:

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
                description="Requested email verification code",
                metadata={
                    "otp_id": str(otp.id),
                    "purpose": purpose,
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
            
        except Exception:
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
        purpose = str(request.data.get('purpose') or 'seal_application')
        
        if not otp_id or not code:
            raise ValidationError({"detail": "otp_id and code are required"})
        
        try:
            otp = SealOTP.objects.get(id=otp_id, user=request.user)
        except SealOTP.DoesNotExist:
            raise ValidationError({"detail": "Invalid or expired OTP"})

        if otp.purpose != purpose:
            raise ValidationError({"detail": "Invalid or expired OTP"})
        
        if otp.verify(code):
            from .services import BackupCodeService

            backup_codes = []
            verification_token = None
            if purpose == 'email_otp_setup':
                signature = ExecutiveSignature.objects.filter(user=request.user).first()
                if not signature:
                    raise ValidationError({"detail": "No signature configured"})
                signature.email_otp_enabled = True
                signature.save(update_fields=['email_otp_enabled', 'updated_at'])
                backup_codes = BackupCodeService.generate(request.user)
            else:
                # Generate a short-lived token for the seal application.
                verification_token = self._generate_verification_token(request.user, otp)
            
            # Audit log
            from audit.models import ActivityLog
            AuditService.log_user_activity(
                user=request.user,
                action=ActivityLog.ActionType.USER_UPDATED,
                request=request,
                description="Verified email OTP",
                metadata={"otp_id": str(otp.id), "purpose": purpose},
            )
            
            return Response({
                "verified": True,
                "verification_token": verification_token,
                "backup_codes": backup_codes,
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
    throttle_classes = [TotpSetupRateThrottle]
    
    def post(self, request):
        try:
            signature = ExecutiveSignature.objects.get(user=request.user)
        except ExecutiveSignature.DoesNotExist:
            raise ValidationError({"detail": "No signature configured. Please upload a signature first."})
        
        # Generate new TOTP secret if not exists or regenerating
        force_regenerate = request.data.get('regenerate', False)

        if signature.totp_secret or force_regenerate:
            from .services import StepUpService

            StepUpService.assert_verified(
                request,
                password=request.data.get('current_password'),
                code=request.data.get('code'),
            )
        
        if not signature.totp_secret or force_regenerate:
            signature.totp_secret = pyotp.random_base32()
            signature.totp_enabled = True
            signature.totp_confirmed = False
            signature.totp_last_used_step = 0
            signature.save(update_fields=[
                'totp_secret', 'totp_enabled', 'totp_confirmed', 'totp_last_used_step', 'updated_at'
            ])
        
        # Generate the shared enrollment payload for the authenticator app.
        from .services import TotpProvisioningService

        payload = TotpProvisioningService.build_payload(
            signature.totp_secret, request.user
        )
        payload["instructions"] = (
            "Scan this QR code with your authenticator app "
            "(Google Authenticator, Microsoft Authenticator, etc.)"
        )
        return Response(payload)


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
        
        from .services import BackupCodeService, TotpVerificationService

        # Verify TOTP and consume the time-step so the same code cannot be replayed.
        is_valid = TotpVerificationService.verify_and_consume(signature, code)
        
        if is_valid:
            # If this is setup confirmation, mark as confirmed
            backup_codes = []
            if purpose == 'setup' and not signature.totp_confirmed:
                signature.totp_confirmed = True
                signature.preferred_2fa_method = 'totp'
                signature.save(update_fields=['totp_confirmed', 'preferred_2fa_method', 'updated_at'])
                if request.data.get('generate_backup_codes'):
                    backup_codes = BackupCodeService.generate(request.user)
            
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
                "backup_codes": backup_codes,
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
            purpose="seal_application",
        )


class DisableTOTPView(APIView):
    """
    Disable TOTP for the user. Requires current TOTP code for security.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [OTPRateThrottle]
    
    def post(self, request):
        code = request.data.get('code')
        
        try:
            signature = ExecutiveSignature.objects.get(user=request.user)
        except ExecutiveSignature.DoesNotExist:
            raise ValidationError({"detail": "No signature configured"})
        
        if not signature.totp_secret:
            return Response({"detail": "TOTP is not enabled"})
        
        from .services import StepUpService, TotpVerificationService

        # A current authenticator code is preferred. If the authenticator is
        # lost, a password or unused backup code still allows recovery without
        # leaving the account permanently unable to remove a broken factor.
        if code and TotpVerificationService.verify_and_consume(signature, code):
            pass
        else:
            StepUpService.assert_verified(
                request,
                password=request.data.get('current_password'),
                code=code if code else None,
            )
        
        # Disable TOTP
        signature.totp_secret = ""
        signature.totp_enabled = False
        signature.totp_confirmed = False
        signature.totp_last_used_step = 0
        signature.preferred_2fa_method = 'email'
        signature.save(update_fields=[
            'totp_secret', 'totp_enabled', 'totp_confirmed', 'totp_last_used_step',
            'preferred_2fa_method', 'updated_at',
        ])
        
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
        
        if method == 'email' and (
            not request.user.email or not signature.email_otp_enabled
        ):
            raise ValidationError({"detail": "Email OTP is not enabled"})
        
        signature.preferred_2fa_method = method
        signature.save(update_fields=['preferred_2fa_method', 'updated_at'])
        
        return Response({
            "preferred_method": method,
            "message": f"Preferred 2FA method updated to {'Email OTP' if method == 'email' else 'Authenticator App'}",
        })


class DisableEmailOTPView(APIView):
    """Disable email OTP as a seal second factor after re-authentication."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [PasswordChangeRateThrottle]

    def post(self, request):
        try:
            signature = ExecutiveSignature.objects.get(user=request.user)
        except ExecutiveSignature.DoesNotExist:
            raise ValidationError({"detail": "No signature configured"})

        from .services import StepUpService

        StepUpService.assert_verified(
            request,
            password=request.data.get("current_password"),
            code=request.data.get("code"),
        )
        signature.email_otp_enabled = False
        if signature.preferred_2fa_method == "email":
            signature.preferred_2fa_method = (
                "totp" if signature.totp_confirmed else "email"
            )
        signature.save(
            update_fields=[
                "email_otp_enabled",
                "preferred_2fa_method",
                "updated_at",
            ]
        )

        from audit.models import ActivityLog

        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_UPDATED,
            request=request,
            description="Disabled email OTP for seal verification",
        )
        return Response({"email_otp_enabled": False})


class VerifyBackupCodeView(APIView):
    """Consume a backup code and issue a seal verification token."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        from .services import BackupCodeService, VerificationTokenService

        code = str(request.data.get("code") or "").strip()
        if not code:
            raise ValidationError({"detail": "Backup code is required"})
        if not BackupCodeService.consume(request.user, code):
            raise ValidationError({"detail": "Invalid or already used backup code"})

        token = VerificationTokenService.generate_token(
            user_id=str(request.user.id),
            purpose="seal_application",
        )
        from audit.models import ActivityLog

        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_UPDATED,
            request=request,
            description="Used a backup code for seal verification",
        )
        return Response(
            {
                "verified": True,
                "verification_token": token,
                "expires_in": 300,
            }
        )


class BackupCodeStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .services import BackupCodeService

        remaining = BackupCodeService.remaining(request.user)
        return Response({"remaining": remaining, "has_codes": remaining > 0})


class GenerateBackupCodesView(APIView):
    """Generate a fresh set of hashed, single-use login backup codes."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [PasswordChangeRateThrottle]

    def post(self, request):
        from .services import BackupCodeService, StepUpService

        StepUpService.assert_verified(
            request,
            password=request.data.get("current_password"),
            code=request.data.get("code"),
        )
        codes = BackupCodeService.generate(request.user)

        from audit.models import ActivityLog

        AuditService.log_user_activity(
            user=request.user,
            action=ActivityLog.ActionType.USER_UPDATED,
            request=request,
            description="Generated login backup codes",
            metadata={"count": len(codes)},
        )
        return Response(
            {
                "backup_codes": codes,
                "remaining": BackupCodeService.remaining(request.user),
            }
        )


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

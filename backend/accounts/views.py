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
from .models import User
from .serializers import UserSerializer


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

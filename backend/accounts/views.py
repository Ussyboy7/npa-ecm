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
    """Return the authenticated user's profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


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
                raise NotFound("User not found") from exc

        refresh = RefreshToken.for_user(target)
        access_lifetime: timedelta | None = settings.SIMPLE_JWT.get("ACCESS_TOKEN_LIFETIME")
        expires_in = int(access_lifetime.total_seconds()) if access_lifetime else None

        data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(target).data,
            "expires_in": expires_in,
        }
        return Response(data, status=status.HTTP_200_OK)

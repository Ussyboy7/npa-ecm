"""API endpoints for correspondence and minutes."""

from __future__ import annotations

import os
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from datetime import timedelta, datetime

from django.db.models import Prefetch, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from common.upload_validators import validate_file_upload
from rest_framework import filters, viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import ValidationError

from audit.services import AuditService
from notifications.models import Notification
from notifications.services import NotificationService
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from organization.models import Office, OfficeMembership

from .models import (
    Correspondence,
    CorrespondenceAttachment,
    CorrespondenceDistribution,
    CorrespondenceDocumentLink,
    Delegation,
    Minute,
)
from .serializers import (
    CorrespondenceAttachmentSerializer,
    CorrespondenceDistributionSerializer,
    CorrespondenceDocumentLinkSerializer,
    CorrespondenceSerializer,
    DelegationSerializer,
    MinuteSerializer,
)


User = get_user_model()


class OfficeInboxPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class CorrespondenceViewSet(viewsets.ModelViewSet):
    queryset = Correspondence.objects.none()
    base_queryset = Correspondence.all_objects.select_related(
        "division",
        "department",
        "created_by",
        "current_approver",
        "owning_office",
        "current_office",
    ).prefetch_related(
        "linked_documents",
        "attachments",
        Prefetch(
        "distribution",
            queryset=CorrespondenceDistribution.objects.select_related(
                "directorate",
                "division",
                "department",
                "added_by",
            ),
        ),
        "minutes",
    )
    serializer_class = CorrespondenceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        "status",
        "priority",
        "source",
        "direction",
        "division",
        "department",
        "owning_office",
        "current_office",
    ]
    search_fields = ["reference_number", "subject", "summary", "tags"]
    ordering_fields = ["created_at", "updated_at", "received_date"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = self.base_queryset
        request = getattr(self, 'request', None)
        if request:
            only_deleted = request.query_params.get('only_deleted') == 'true'
            include_deleted = request.query_params.get('include_deleted') == 'true'
            if only_deleted:
                return qs.filter(is_deleted=True)
            if include_deleted:
                return qs
        return qs.filter(is_deleted=False)

    def create(self, request, *args, **kwargs):
        # Extract file attachments from request (before serializer processes data)
        attachments = request.FILES.getlist('attachments', [])
        
        # Create serializer with request data
        # The serializer will automatically ignore fields not in the model
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get validated data
        validated_data = serializer.validated_data
        creator = validated_data.get("created_by") or request.user
        priority = validated_data.get("priority") or Correspondence.Priority.MEDIUM

        if not validated_data.get("reference_number"):
            count = Correspondence.all_objects.count() + 1
            reference_number = f"NPA/REG/{request.user.username.upper()}/{count:04d}"
        else:
            reference_number = validated_data["reference_number"]

        # Create the correspondence instance
        owning_office = validated_data.get("owning_office") or self._get_user_primary_office(request.user)
        current_office = validated_data.get("current_office") or owning_office

        correspondence = serializer.save(
            created_by=creator,
            priority=priority,
            reference_number=reference_number,
            owning_office=owning_office,
            current_office=current_office,
        )
        self._sync_completed_timestamp(correspondence, None)
        
        # Create audit log
        from audit.models import ActivityLog
        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_CREATED,
            correspondence=correspondence,
            request=request,
            description=f"Created correspondence: {correspondence.reference_number} - {correspondence.subject}",
        )

        # Handle file uploads
        if attachments:
            # Ensure media directory exists
            media_root = settings.MEDIA_ROOT
            attachments_dir = os.path.join(media_root, 'correspondence_attachments', str(correspondence.id))
            os.makedirs(attachments_dir, exist_ok=True)
            
            for file in attachments:
                # Generate file path
                file_path = os.path.join('correspondence_attachments', str(correspondence.id), file.name)

                # Validate the upload before persisting
                if hasattr(file, 'seek'):
                    file.seek(0)
                file_bytes = file.read()
                validate_file_upload(
                    file_name=file.name,
                    mime_type=getattr(file, 'content_type', None),
                    file_bytes=file_bytes,
                    field_name='attachments',
                )
                file_size = len(file_bytes)
                if hasattr(file, 'seek'):
                    file.seek(0)

                # Save file to storage
                saved_path = default_storage.save(file_path, file)

                # Build full URL for the file
                # Use request.build_absolute_uri for proper URL construction
                try:
                    file_url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)
                except Exception:
                    # Fallback if build_absolute_uri fails
                    request_scheme = getattr(request, 'scheme', 'http')
                    request_host = request.get_host() if hasattr(request, 'get_host') else 'localhost:8000'
                    file_url = f"{request_scheme}://{request_host}{settings.MEDIA_URL}{saved_path}"
                
                # Create attachment record
                CorrespondenceAttachment.objects.create(
                    correspondence=correspondence,
                    file_name=file.name,
                    file_type=getattr(file, 'content_type', None) or 'application/octet-stream',
                    file_size=file_size,
                    file_url=file_url,
                )

        # Return the created correspondence with attachments
        output_serializer = self.get_serializer(correspondence)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


    def perform_update(self, serializer):
        instance = self.get_object()
        previous_status = instance.status
        correspondence = serializer.save()
        self._sync_completed_timestamp(correspondence, previous_status)

    def _sync_completed_timestamp(self, correspondence, previous_status):
        if correspondence.status == Correspondence.Status.COMPLETED:
            if not correspondence.completed_at:
                correspondence.completed_at = timezone.now()
                correspondence.save(update_fields=["completed_at"])
        elif previous_status == Correspondence.Status.COMPLETED and correspondence.completed_at is not None:
            correspondence.completed_at = None
            correspondence.save(update_fields=["completed_at"])

    @action(detail=True, methods=["post"], url_path="reassign")
    def reassign(self, request, pk=None):
        correspondence = self.get_object()
        target_office_id = request.data.get("target_office_id")
        owning_office_id = request.data.get("owning_office_id")
        target_user_id = request.data.get("target_user_id")
        reason = (request.data.get("reason") or "").strip()

        if not reason:
            raise ValidationError({"reason": "Please provide a reason for the reassignment."})

        updates: set[str] = set()
        previous_state = {
            "owning_office": correspondence.owning_office_id,
            "current_office": correspondence.current_office_id,
            "current_approver": correspondence.current_approver_id,
        }

        if owning_office_id:
            owning_office = self._get_office_or_400(owning_office_id)
            if correspondence.owning_office_id != owning_office.id:
                correspondence.owning_office = owning_office
                updates.add("owning_office")

        current_office = correspondence.current_office
        if target_office_id:
            target_office = self._get_office_or_400(target_office_id)
            if correspondence.current_office_id != target_office.id:
                correspondence.current_office = target_office
                current_office = target_office
                updates.add("current_office")

        if target_user_id == "":
            if correspondence.current_approver_id is not None:
                correspondence.current_approver = None
                updates.add("current_approver")
        elif target_user_id:
            target_user = self._get_user_or_400(target_user_id)
            if correspondence.current_approver_id != target_user.id:
                correspondence.current_approver = target_user
                updates.add("current_approver")
        else:
            target_user = correspondence.current_approver

        if not updates:
            raise ValidationError({"detail": "No reassignment changes detected."})

        if correspondence.status != Correspondence.Status.IN_PROGRESS:
            correspondence.status = Correspondence.Status.IN_PROGRESS
            updates.add("status")

        correspondence.save(update_fields=list(updates) + ["updated_at"])

        from audit.models import ActivityLog

        metadata = {
            "reason": reason,
            "previous_owning_office": previous_state["owning_office"],
            "new_owning_office": correspondence.owning_office_id,
            "previous_current_office": previous_state["current_office"],
            "new_current_office": correspondence.current_office_id,
            "previous_current_approver": previous_state["current_approver"],
            "new_current_approver": correspondence.current_approver_id,
        }

        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_ROUTED,
            correspondence=correspondence,
            request=request,
            description=f"Correspondence reassigned to office {correspondence.current_office or correspondence.owning_office}",
            metadata=metadata,
        )

        title = f"Correspondence reassigned ({correspondence.reference_number})"
        message = (
            f"{request.user.get_full_name() or request.user.username} reassigned this correspondence. "
            f"Reason: {reason}"
        )

        if correspondence.current_approver:
            NotificationService.create_notification(
                recipient=correspondence.current_approver,
                title=title,
                message=f"{message} You are the current approver.",
                notification_type=Notification.NotificationType.CORRESPONDENCE,
                priority=Notification.Priority.NORMAL,
                sender=request.user,
                module="correspondence",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
                action_url=f"/correspondence/{correspondence.id}",
                action_required=True,
            )

        if current_office:
            self._notify_office_members(current_office, correspondence, request.user, reason)

        serializer = self.get_serializer(correspondence)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="office-inbox")
    def office_inbox(self, request):
        user = request.user
        requested_offices = request.query_params.getlist("office")
        office_ids = [office_id for office_id in requested_offices if office_id and office_id.lower() != "all"]

        if not office_ids:
            office_ids = self._get_user_office_ids(user)

        can_view_all = bool(getattr(user, "is_superuser", False))
        include_all_offices = (
            can_view_all
            and (
                request.query_params.get("include_all_offices", "").lower() in {"true", "1", "yes"}
                or not office_ids
            )
        )

        if include_all_offices:
            queryset = self.base_queryset.filter(is_deleted=False)
        elif office_ids:
            queryset = self.base_queryset.filter(is_deleted=False).filter(
                Q(current_office_id__in=office_ids) | Q(owning_office_id__in=office_ids)
            )
        else:
            return Response(
                {
                    "count": 0,
                    "next": None,
                    "previous": None,
                    "results": [],
                    "summary": {
                        "total": 0,
                        "urgent": 0,
                        "overdue": 0,
                        "assigned_to_user": 0,
                    },
                }
            )

        statuses = request.query_params.getlist("status")
        if statuses:
            queryset = queryset.filter(status__in=statuses)

        assigned_only = request.query_params.get("assigned_only", "").lower() in {"true", "1", "yes"}
        if assigned_only:
            queryset = queryset.filter(current_approver=user)

        search_term = request.query_params.get("search")
        if search_term:
            queryset = queryset.filter(
                Q(reference_number__icontains=search_term)
                | Q(subject__icontains=search_term)
                | Q(sender_name__icontains=search_term)
                | Q(sender_organization__icontains=search_term)
            )

        total_count = queryset.count()
        urgent_count = queryset.filter(priority=Correspondence.Priority.URGENT).count()

        today = timezone.now().date()
        overdue_filter = (
            Q(priority=Correspondence.Priority.URGENT, received_date__lt=today - timedelta(days=2))
            | Q(priority=Correspondence.Priority.HIGH, received_date__lt=today - timedelta(days=5))
            | Q(priority=Correspondence.Priority.MEDIUM, received_date__lt=today - timedelta(days=10))
            | Q(priority=Correspondence.Priority.LOW, received_date__lt=today - timedelta(days=14))
        ) & ~Q(status=Correspondence.Status.COMPLETED)

        overdue_count = queryset.filter(overdue_filter).count()
        assigned_count = queryset.filter(current_approver=user).count()

        paginator = OfficeInboxPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        summary = {
            "total": total_count,
            "urgent": urgent_count,
            "overdue": overdue_count,
            "assigned_to_user": assigned_count,
        }
        response.data["summary"] = summary
        return response

    @action(detail=False, methods=["get"], url_path="archive-records")
    def archive_records(self, request):
        user = request.user
        base_queryset = self._get_archived_queryset(user)
        if base_queryset is None:
            return Response(
                {
                    "count": 0,
                    "next": None,
                    "previous": None,
                    "results": [],
                    "summary": {
                        "total": 0,
                        "downward": 0,
                        "upward": 0,
                        "this_year": 0,
                        "available_years": [],
                    },
                }
            )

        allowed_levels = self._get_allowed_archive_levels(user)
        archive_level = request.query_params.get("archive_level")
        if archive_level and archive_level.lower() != "all":
            if archive_level not in allowed_levels and not getattr(user, "is_superuser", False):
                return Response(
                    {"detail": "You do not have access to the requested archive level."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            base_queryset = base_queryset.filter(archive_level=archive_level)

        search_term = request.query_params.get("search")
        if search_term:
            base_queryset = base_queryset.filter(
                Q(reference_number__icontains=search_term)
                | Q(subject__icontains=search_term)
                | Q(sender_name__icontains=search_term)
                | Q(sender_organization__icontains=search_term)
            )

        priority = request.query_params.get("priority")
        if priority in dict(Correspondence.Priority.choices):
            base_queryset = base_queryset.filter(priority=priority)

        statuses = request.query_params.getlist("status")
        if statuses:
            base_queryset = base_queryset.filter(status__in=statuses)

        year = request.query_params.get("year")
        if year and year.lower() != "all":
            try:
                base_queryset = base_queryset.filter(received_date__year=int(year))
            except ValueError:
                pass

        from_date = self._parse_date_param(request.query_params.get("from_date"))
        if from_date:
            base_queryset = base_queryset.filter(received_date__gte=from_date)

        to_date = self._parse_date_param(request.query_params.get("to_date"))
        if to_date:
            base_queryset = base_queryset.filter(received_date__lte=to_date)

        division_id = request.query_params.get("division")
        if division_id:
            base_queryset = base_queryset.filter(division_id=division_id)

        department_id = request.query_params.get("department")
        if department_id:
            base_queryset = base_queryset.filter(department_id=department_id)

        summary_queryset = base_queryset

        direction = request.query_params.get("direction")
        if direction in dict(Correspondence.Direction.choices):
            queryset = base_queryset.filter(direction=direction)
        else:
            queryset = base_queryset

        available_years = (
            summary_queryset.filter(received_date__isnull=False)
            .values_list("received_date__year", flat=True)
            .distinct()
        )

        total_count = summary_queryset.count()
        downward_count = summary_queryset.filter(direction=Correspondence.Direction.DOWNWARD).count()
        upward_count = summary_queryset.filter(direction=Correspondence.Direction.UPWARD).count()
        current_year = timezone.now().year
        this_year_count = summary_queryset.filter(received_date__year=current_year).count()

        paginator = OfficeInboxPagination()
        page = paginator.paginate_queryset(queryset.order_by("-received_date"), request)
        serializer = self.get_serializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data["summary"] = {
            "total": total_count,
            "downward": downward_count,
            "upward": upward_count,
            "this_year": this_year_count,
            "available_years": sorted(available_years, reverse=True),
        }
        return response

    @action(detail=False, methods=["get"], url_path="department-records")
    def department_records(self, request):
        user = request.user
        base_queryset = self._get_department_records_queryset(user)
        if base_queryset is None:
            return Response(
                {
                    "count": 0,
                    "next": None,
                    "previous": None,
                    "results": [],
                    "summary": {
                        "total": 0,
                        "completed": 0,
                        "archived": 0,
                        "office_owned": 0,
                        "available_years": [],
                    },
                }
            )

        search_term = request.query_params.get("search")
        if search_term:
            base_queryset = base_queryset.filter(
                Q(reference_number__icontains=search_term)
                | Q(subject__icontains=search_term)
                | Q(sender_name__icontains=search_term)
                | Q(sender_organization__icontains=search_term)
            )

        priority = request.query_params.get("priority")
        if priority in dict(Correspondence.Priority.choices):
            base_queryset = base_queryset.filter(priority=priority)

        statuses = request.query_params.getlist("status")
        if statuses:
            base_queryset = base_queryset.filter(status__in=statuses)

        direction = request.query_params.get("direction")
        if direction in dict(Correspondence.Direction.choices):
            base_queryset = base_queryset.filter(direction=direction)

        office_id = request.query_params.get("office")
        if office_id and office_id.lower() != "all":
            base_queryset = base_queryset.filter(
                Q(owning_office_id=office_id) | Q(current_office_id=office_id)
            )

        year = request.query_params.get("year")
        if year and year.lower() != "all":
            try:
                base_queryset = base_queryset.filter(received_date__year=int(year))
            except ValueError:
                pass

        from_date = self._parse_date_param(request.query_params.get("from_date"))
        if from_date:
            base_queryset = base_queryset.filter(received_date__gte=from_date)

        to_date = self._parse_date_param(request.query_params.get("to_date"))
        if to_date:
            base_queryset = base_queryset.filter(received_date__lte=to_date)

        user_office_ids = set(self._get_user_office_ids(user))
        available_years = (
            base_queryset.filter(received_date__isnull=False)
            .values_list("received_date__year", flat=True)
            .distinct()
        )

        total_count = base_queryset.count()
        completed_count = base_queryset.filter(status=Correspondence.Status.COMPLETED).count()
        archived_count = base_queryset.filter(status=Correspondence.Status.ARCHIVED).count()
        office_owned_count = (
            base_queryset.filter(owning_office_id__in=user_office_ids).count()
            if user_office_ids
            else 0
        )

        paginator = OfficeInboxPagination()
        page = paginator.paginate_queryset(base_queryset.order_by("-completed_at", "-updated_at"), request)
        serializer = self.get_serializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data["summary"] = {
            "total": total_count,
            "completed": completed_count,
            "archived": archived_count,
            "office_owned": office_owned_count,
            "available_years": sorted(available_years, reverse=True),
        }
        return response

    def _get_office_or_400(self, office_id: str):
        try:
            return Office.objects.get(id=office_id)
        except Office.DoesNotExist as exc:
            raise ValidationError({"office": "Selected office does not exist."}) from exc

    def _get_user_or_400(self, user_id: str):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist as exc:
            raise ValidationError({"user": "Selected user does not exist."}) from exc

    def _notify_office_members(self, office: Office, correspondence: Correspondence, actor, reason: str):
        memberships = (
            OfficeMembership.objects.filter(office=office, is_active=True)
            .select_related("user")
            .distinct()
        )
        for membership in memberships:
            if not membership.user:
                continue
            NotificationService.create_notification(
                recipient=membership.user,
                title=f"Office inbox update ({correspondence.reference_number})",
                message=(
                    f"{actor.get_full_name() or actor.username} reassigned this correspondence to {office.name}. "
                    f"Reason: {reason}"
                ),
                notification_type=Notification.NotificationType.CORRESPONDENCE,
                priority=Notification.Priority.NORMAL,
                sender=actor,
                module="correspondence",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
                action_url=f"/correspondence/{correspondence.id}",
                action_required=True,
            )
    def _get_user_primary_office(self, user):
        if not user or not getattr(user, "is_authenticated", False):
            return None
        memberships = getattr(user, "office_memberships", None)
        if memberships is None:
            return None
        membership = (
            memberships.filter(is_active=True)
            .select_related("office")
            .order_by("-is_primary", "assignment_role")
            .first()
        )
        return membership.office if membership else None

    def _get_user_office_ids(self, user) -> list[str]:
        if not user or not getattr(user, "is_authenticated", False):
            return []
        return list(
            OfficeMembership.objects.filter(user=user, is_active=True).values_list("office_id", flat=True)
        )

    def _get_allowed_archive_levels(self, user) -> list[str]:
        if not user or not getattr(user, "is_authenticated", False):
            return []
        role_name = getattr(getattr(user, "system_role", None), "name", "") or ""
        grade = (user.grade_level or "").upper()
        is_super_admin = getattr(user, "is_superuser", False) or role_name.lower() == "super admin"
        allowed = {Correspondence.ArchiveLevel.DEPARTMENT}
        if grade in {"MDCS", "EDCS", "MSS1", "MSS2"} or is_super_admin:
            allowed.add(Correspondence.ArchiveLevel.DIVISION)
        if grade in {"MDCS", "EDCS"} or is_super_admin:
            allowed.add(Correspondence.ArchiveLevel.DIRECTORATE)
        return list(allowed)

    def _get_archived_queryset(self, user):
        queryset = self.base_queryset.filter(
            is_deleted=False,
            status__in=[Correspondence.Status.COMPLETED, Correspondence.Status.ARCHIVED],
        )
        if not user or not getattr(user, "is_authenticated", False):
            return queryset.none()
        if getattr(user, "is_superuser", False):
            return queryset

        allowed_levels = self._get_allowed_archive_levels(user)
        department_id = getattr(user, "department_id", None)
        division_id = getattr(user, "division_id", None)
        directorate_id = getattr(user, "directorate_id", None)

        filters = Q()
        if Correspondence.ArchiveLevel.DEPARTMENT in allowed_levels and department_id:
            filters |= Q(department_id=department_id)
        if Correspondence.ArchiveLevel.DIVISION in allowed_levels and division_id:
            filters |= Q(division_id=division_id, division__general_manager=user)
        if Correspondence.ArchiveLevel.DIRECTORATE in allowed_levels and directorate_id:
            filters |= Q(
                division__directorate_id=directorate_id,
                division__directorate__executive_director=user,
            )

        if not filters:
            return queryset.none()
        return queryset.filter(filters)

    def _get_department_records_queryset(self, user):
        queryset = self.base_queryset.filter(
            is_deleted=False,
            status__in=[Correspondence.Status.COMPLETED, Correspondence.Status.ARCHIVED],
        )
        if not user or not getattr(user, "is_authenticated", False):
            return queryset.none()
        if getattr(user, "is_superuser", False):
            return queryset

        office_ids = self._get_user_office_ids(user)
        department_id = getattr(user, "department_id", None)
        division_id = getattr(user, "division_id", None)

        filters = Q()
        if office_ids:
            filters |= Q(owning_office_id__in=office_ids) | Q(current_office_id__in=office_ids)
        if department_id:
            filters |= Q(department_id=department_id)
        if division_id:
            filters |= Q(division_id=division_id)

        if not filters:
            return queryset.none()
        return queryset.filter(filters)

    def _parse_date_param(self, value: str | None):
        if not value:
            return None
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            return None

class CorrespondenceAttachmentViewSet(viewsets.ModelViewSet):
    queryset = CorrespondenceAttachment.objects.select_related("correspondence")
    serializer_class = CorrespondenceAttachmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["correspondence"]
    ordering_fields = ["created_at"]


class CorrespondenceDistributionViewSet(viewsets.ModelViewSet):
    queryset = CorrespondenceDistribution.objects.select_related(
        "correspondence",
        "directorate",
        "division",
        "department",
        "added_by",
    )
    serializer_class = CorrespondenceDistributionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["correspondence", "recipient_type", "purpose"]

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)


class CorrespondenceDocumentLinkViewSet(viewsets.ModelViewSet):
    queryset = CorrespondenceDocumentLink.objects.select_related("correspondence", "document")
    serializer_class = CorrespondenceDocumentLinkSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["correspondence", "document"]


class MinuteViewSet(viewsets.ModelViewSet):
    queryset = Minute.objects.select_related("correspondence", "user")
    serializer_class = MinuteSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["correspondence", "user", "action_type", "direction"]
    ordering_fields = ["timestamp", "step_number"]
    ordering = ["timestamp"]

    def perform_create(self, serializer):
        correspondence = serializer.validated_data["correspondence"]
        current_office = correspondence.current_office
        minute = serializer.save(user=self.request.user, from_office=current_office)
        correspondence = minute.correspondence
        if minute.to_office and minute.to_office_id != (current_office.id if current_office else None):
            correspondence.current_office = minute.to_office
            correspondence.save(update_fields=["current_office", "updated_at"])
        
        # Create audit log
        from audit.models import ActivityLog
        action_type = ActivityLog.ActionType.CORRESPONDENCE_MINUTED
        if minute.action_type == Minute.ActionType.APPROVE:
            action_type = ActivityLog.ActionType.CORRESPONDENCE_APPROVED
        elif minute.action_type == Minute.ActionType.REJECT:
            action_type = ActivityLog.ActionType.CORRESPONDENCE_REJECTED
        elif minute.action_type == Minute.ActionType.TREAT:
            action_type = ActivityLog.ActionType.CORRESPONDENCE_ROUTED
        
        AuditService.log_correspondence_activity(
            user=self.request.user,
            action=action_type,
            correspondence=correspondence,
            request=self.request,
            description=f"{minute.get_action_type_display()} on correspondence: {correspondence.reference_number}",
            metadata={
                "minute_id": str(minute.id),
                "action_type": minute.action_type,
                "from_office": str(minute.from_office_id) if minute.from_office_id else None,
                "to_office": str(minute.to_office_id) if minute.to_office_id else None,
            },
        )
        
        # Send notification to current approver if different from minute author
        if correspondence.current_approver and correspondence.current_approver.id != self.request.user.id:
            NotificationService.create_notification(
                recipient=correspondence.current_approver,
                title=f"New {minute.get_action_type_display()} on {correspondence.reference_number}",
                message=f"{self.request.user.get_full_name() or self.request.user.username} added a {minute.get_action_type_display().lower()} on correspondence: {correspondence.subject}",
                notification_type=Notification.NotificationType.CORRESPONDENCE,
                priority=Notification.Priority.HIGH if correspondence.priority == Correspondence.Priority.URGENT else Notification.Priority.NORMAL,
                sender=self.request.user,
                module="correspondence",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
                action_url=f"/correspondence/{correspondence.id}",
                action_required=correspondence.status == Correspondence.Status.PENDING,
            )


class DelegationViewSet(viewsets.ModelViewSet):
    queryset = Delegation.objects.select_related("principal", "assistant")
    serializer_class = DelegationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["principal", "assistant", "active"]

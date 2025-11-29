"""API endpoints for correspondence and minutes."""

from __future__ import annotations

import logging
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
from dms.models import DocumentVersion

from .models import (
    Correspondence,
    CorrespondenceAttachment,
    CorrespondenceDelegation,
    CorrespondenceDistribution,
    CorrespondenceDocumentLink,
    Delegation,
    Minute,
    ParallelRoutingGroup,
)
from .serializers import (
    CorrespondenceAttachmentSerializer,
    CorrespondenceDelegationSerializer,
    CorrespondenceDistributionSerializer,
    CorrespondenceDocumentLinkSerializer,
    CorrespondenceSerializer,
    DelegationSerializer,
    MinuteSerializer,
    ParallelRoutingGroupSerializer,
)
from .services import CompletionPackageService


logger = logging.getLogger(__name__)
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
        "completion_package",
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
        Prefetch(
            "completion_package__versions",
            queryset=DocumentVersion.objects.order_by("-version_number"),
        ),
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

                # Build relative URL for the file (browser will resolve to current domain)
                media_url = settings.MEDIA_URL or '/media/'
                if not media_url.startswith('/'):
                    media_url = f'/{media_url}'
                file_url = f"{media_url.rstrip('/')}/{saved_path}"
                
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
        if previous_status == Correspondence.Status.COMPLETED:
            raise ValidationError({"detail": "Completed correspondence is read-only."})
        correspondence = serializer.save()
        self._sync_completed_timestamp(correspondence, previous_status)
        if (
            correspondence.status == Correspondence.Status.COMPLETED
            and previous_status != Correspondence.Status.COMPLETED
        ):
            try:
                CompletionPackageService.generate_completion_package(correspondence, self.request.user)
            except Exception:
                logger.exception(
                    "Failed to generate completion package for correspondence %s",
                    correspondence.id,
                )

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

    @action(detail=True, methods=["post"], url_path="completion-package")
    def regenerate_completion_package(self, request, pk=None):
        correspondence = self.get_object()
        if correspondence.status != Correspondence.Status.COMPLETED:
            raise ValidationError(
                {"detail": "Only completed correspondence can generate completion packages."}
            )
        CompletionPackageService.generate_completion_package(correspondence, request.user)
        serializer = self.get_serializer(correspondence)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="sidebar-counts")
    def sidebar_counts(self, request):
        """
        Get counts for sidebar badges.
        Returns counts for office inbox, my inbox, and outbox.
        Optimized for performance - only returns counts, no data.
        """
        user = request.user
        
        # Get user's office IDs
        office_ids = self._get_user_office_ids(user)
        
        # === Office Inbox Count ===
        from correspondence.models import Minute, CorrespondenceDistribution
        from organization.models import OfficeMembership, Office
        
        office_inbox_count = 0
        if office_ids or user.is_superuser:
            # Get parallel routing correspondence IDs
            parallel_correspondence_ids = Minute.objects.filter(
                to_user=user,
                is_parallel_branch=True,
                correspondence__workflow_state='parallel'
            ).values_list('correspondence_id', flat=True).distinct()
            
            # Get user's organizational units from their office memberships
            user_offices = OfficeMembership.objects.filter(
                user=user, is_active=True
            ).select_related('office').values_list('office', flat=True)
            
            user_office_objs = Office.objects.filter(id__in=user_offices)
            user_division_ids = set(user_office_objs.values_list('division_id', flat=True))
            user_department_ids = set(user_office_objs.values_list('department_id', flat=True))
            user_directorate_ids = set(user_office_objs.values_list('directorate_id', flat=True))
            
            # Also include user's direct division/department from profile
            if hasattr(user, 'division_id') and user.division_id:
                user_division_ids.add(user.division_id)
            if hasattr(user, 'department_id') and user.department_id:
                user_department_ids.add(user.department_id)
            if hasattr(user, 'directorate_id') and user.directorate_id:
                user_directorate_ids.add(user.directorate_id)
            
            # Remove None values
            user_division_ids.discard(None)
            user_department_ids.discard(None)
            user_directorate_ids.discard(None)
            
            # Get correspondence IDs where user is a distribution recipient
            distribution_filter = Q()
            if user_division_ids:
                distribution_filter |= Q(division_id__in=user_division_ids)
            if user_department_ids:
                distribution_filter |= Q(department_id__in=user_department_ids)
            if user_directorate_ids:
                distribution_filter |= Q(directorate_id__in=user_directorate_ids)
            
            distribution_correspondence_ids = []
            if distribution_filter:
                distribution_correspondence_ids = CorrespondenceDistribution.objects.filter(
                    distribution_filter
                ).values_list('correspondence_id', flat=True).distinct()
            
            if user.is_superuser and not office_ids:
                office_inbox_queryset = self.base_queryset.filter(
                    is_deleted=False
                ).exclude(status=Correspondence.Status.COMPLETED)
            else:
                office_inbox_queryset = self.base_queryset.filter(is_deleted=False).filter(
                    Q(current_office_id__in=office_ids) | 
                    Q(owning_office_id__in=office_ids) |
                    Q(id__in=parallel_correspondence_ids) |
                    Q(id__in=distribution_correspondence_ids)
                ).exclude(status=Correspondence.Status.COMPLETED)
            
            office_inbox_count = office_inbox_queryset.count()
        
        # === My Inbox Count ===
        # Items directly assigned to user + parallel routes
        my_parallel_ids = Minute.objects.filter(
            to_user=user,
            is_parallel_branch=True,
            correspondence__workflow_state__in=['parallel', 'waiting_merge'],
            correspondence__status__in=['pending', 'in-progress']
        ).values_list('correspondence_id', flat=True).distinct()
        
        my_inbox_count = self.base_queryset.filter(is_deleted=False).filter(
            Q(current_approver=user) | 
            Q(id__in=my_parallel_ids)
        ).exclude(status=Correspondence.Status.COMPLETED).count()
        
        # === Outbox Count ===
        # Items created by user that are still pending or in-progress
        outbox_count = self.base_queryset.filter(
            is_deleted=False,
            created_by=user,
            status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS]
        ).count()
        
        # === Delegated Count ===
        # Items delegated TO the current user (as assistant)
        delegated_count = CorrespondenceDelegation.objects.filter(
            assistant=user,
            status=CorrespondenceDelegation.Status.ACTIVE
        ).count()
        
        return Response({
            "officeInbox": office_inbox_count,
            "myInbox": my_inbox_count,
            "outbox": outbox_count,
            "delegated": delegated_count,
        })

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
            # Include correspondence where:
            # 1. current_office or owning_office is in user's offices, OR
            # 2. User is a recipient of a parallel branch (for parallel routing), OR
            # 3. User's division/department/directorate is in the distribution list (CC)
            from correspondence.models import Minute, CorrespondenceDistribution
            from organization.models import OfficeMembership
            
            parallel_correspondence_ids = Minute.objects.filter(
                to_user=user,
                is_parallel_branch=True,
                correspondence__workflow_state='parallel'
            ).values_list('correspondence_id', flat=True).distinct()
            
            # Get user's organizational units from their office memberships
            user_offices = OfficeMembership.objects.filter(
                user=user, is_active=True
            ).select_related('office').values_list('office', flat=True)
            
            from organization.models import Office
            user_office_objs = Office.objects.filter(id__in=user_offices)
            user_division_ids = set(user_office_objs.values_list('division_id', flat=True))
            user_department_ids = set(user_office_objs.values_list('department_id', flat=True))
            user_directorate_ids = set(user_office_objs.values_list('directorate_id', flat=True))
            
            # Also include user's direct division/department from profile
            if hasattr(user, 'division_id') and user.division_id:
                user_division_ids.add(user.division_id)
            if hasattr(user, 'department_id') and user.department_id:
                user_department_ids.add(user.department_id)
            if hasattr(user, 'directorate_id') and user.directorate_id:
                user_directorate_ids.add(user.directorate_id)
            
            # Remove None values
            user_division_ids.discard(None)
            user_department_ids.discard(None)
            user_directorate_ids.discard(None)
            
            # Get correspondence IDs where user is a distribution recipient
            distribution_filter = Q()
            if user_division_ids:
                distribution_filter |= Q(division_id__in=user_division_ids)
            if user_department_ids:
                distribution_filter |= Q(department_id__in=user_department_ids)
            if user_directorate_ids:
                distribution_filter |= Q(directorate_id__in=user_directorate_ids)
            
            distribution_correspondence_ids = []
            if distribution_filter:
                distribution_correspondence_ids = CorrespondenceDistribution.objects.filter(
                    distribution_filter
                ).values_list('correspondence_id', flat=True).distinct()
            
            queryset = self.base_queryset.filter(is_deleted=False).filter(
                Q(current_office_id__in=office_ids) | 
                Q(owning_office_id__in=office_ids) |
                Q(id__in=parallel_correspondence_ids) |
                Q(id__in=distribution_correspondence_ids)
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

        # Priority filtering
        priorities = request.query_params.getlist("priority")
        if priorities:
            queryset = queryset.filter(priority__in=priorities)

        # Date filtering
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        if date_from:
            queryset = queryset.filter(received_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(received_date__lte=date_to)

        assigned_only = request.query_params.get("assigned_only", "").lower() in {"true", "1", "yes"}
        if assigned_only:
            # Include correspondence where user is current_approver OR is a parallel branch recipient
            from correspondence.models import Minute
            parallel_correspondence_ids = Minute.objects.filter(
                to_user=user,
                is_parallel_branch=True,
                correspondence__workflow_state='parallel'
            ).values_list('correspondence_id', flat=True).distinct()
            
            queryset = queryset.filter(
                Q(current_approver=user) | Q(id__in=parallel_correspondence_ids)
            )

        search_term = request.query_params.get("search")
        if search_term:
            queryset = queryset.filter(
                Q(reference_number__icontains=search_term)
                | Q(subject__icontains=search_term)
                | Q(sender_name__icontains=search_term)
                | Q(sender_organization__icontains=search_term)
                | Q(current_office__name__icontains=search_term)
                | Q(division__name__icontains=search_term)
                | Q(current_approver__first_name__icontains=search_term)
                | Q(current_approver__last_name__icontains=search_term)
            )

        # Sorting
        sort_by = request.query_params.get("sort_by", "priority")
        sort_order = request.query_params.get("sort_order", "desc")
        order_prefix = "-" if sort_order == "desc" else ""
        
        if sort_by == "priority":
            from django.db.models import Case, When, IntegerField
            queryset = queryset.annotate(
                priority_order=Case(
                    When(priority=Correspondence.Priority.URGENT, then=0),
                    When(priority=Correspondence.Priority.HIGH, then=1),
                    When(priority=Correspondence.Priority.MEDIUM, then=2),
                    When(priority=Correspondence.Priority.LOW, then=3),
                    default=99,
                    output_field=IntegerField(),
                )
            ).order_by(f"{order_prefix}priority_order", "-created_at")
        elif sort_by == "days_pending":
            queryset = queryset.order_by(f"{'' if sort_order == 'desc' else '-'}received_date")
        elif sort_by == "updated":
            queryset = queryset.order_by(f"{order_prefix}updated_at")
        elif sort_by == "reference":
            queryset = queryset.order_by(f"{order_prefix}reference_number")
        else:
            queryset = queryset.order_by("-created_at")

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

    @action(detail=False, methods=["get"], url_path="my-inbox")
    def my_inbox(self, request):
        """Get correspondence assigned to the current user."""
        user = request.user
        
        # Find parallel routes assigned to this user
        # Include both 'parallel' and 'waiting_merge' workflow states
        # Also check that the correspondence is not completed
        from correspondence.models import Minute
        parallel_correspondence_ids = Minute.objects.filter(
            to_user=user,
            is_parallel_branch=True,
            correspondence__workflow_state__in=['parallel', 'waiting_merge'],
            correspondence__status__in=['pending', 'in-progress']
        ).values_list('correspondence_id', flat=True).distinct()
        
        queryset = self.base_queryset.filter(is_deleted=False).filter(
            Q(current_approver=user) | 
            Q(id__in=parallel_correspondence_ids)
        )
        
        # Filter by status
        statuses = request.query_params.getlist("status")
        if statuses:
            queryset = queryset.filter(status__in=statuses)
        
        # Filter by priority
        priorities = request.query_params.getlist("priority")
        if priorities:
            queryset = queryset.filter(priority__in=priorities)
        
        # Search
        search_term = request.query_params.get("search")
        if search_term:
            queryset = queryset.filter(
                Q(reference_number__icontains=search_term)
                | Q(subject__icontains=search_term)
                | Q(sender_name__icontains=search_term)
                | Q(sender_organization__icontains=search_term)
                | Q(current_office__name__icontains=search_term)
                | Q(division__name__icontains=search_term)
                | Q(current_approver__first_name__icontains=search_term)
                | Q(current_approver__last_name__icontains=search_term)
            )
        
        # Date filtering
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        if date_from:
            queryset = queryset.filter(received_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(received_date__lte=date_to)
        
        # Sorting
        sort_by = request.query_params.get("sort_by", "priority")
        sort_order = request.query_params.get("sort_order", "desc")
        order_prefix = "-" if sort_order == "desc" else ""
        
        if sort_by == "priority":
            # Use Case/When to order by priority
            from django.db.models import Case, When, IntegerField
            queryset = queryset.annotate(
                priority_order=Case(
                    When(priority=Correspondence.Priority.URGENT, then=0),
                    When(priority=Correspondence.Priority.HIGH, then=1),
                    When(priority=Correspondence.Priority.MEDIUM, then=2),
                    When(priority=Correspondence.Priority.LOW, then=3),
                    default=99,
                    output_field=IntegerField(),
                )
            ).order_by(f"{order_prefix}priority_order", "-created_at")
        elif sort_by == "days_pending":
            # Order by received_date (older = more days pending)
            queryset = queryset.order_by(f"{'' if sort_order == 'desc' else '-'}received_date")
        elif sort_by == "updated":
            queryset = queryset.order_by(f"{order_prefix}updated_at")
        elif sort_by == "reference":
            queryset = queryset.order_by(f"{order_prefix}reference_number")
        else:
            queryset = queryset.order_by("-created_at")
        
        # Calculate summary
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
        
        # Pagination
        paginator = OfficeInboxPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        
        summary = {
            "total": total_count,
            "urgent": urgent_count,
            "overdue": overdue_count,
            "pending": queryset.filter(status=Correspondence.Status.PENDING).count(),
            "in_progress": queryset.filter(status=Correspondence.Status.IN_PROGRESS).count(),
        }
        response.data["summary"] = summary
        return response

    @action(detail=False, methods=["get"], url_path="outbox")
    def outbox(self, request):
        """Get correspondence created by current user that's pending dispatch."""
        user = request.user
        
        # Base queryset: items created by user that are pending or in-progress
        queryset = self.base_queryset.filter(
            is_deleted=False,
            created_by=user,
            status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS]
        )
        
        # Filter by status
        statuses = request.query_params.getlist("status")
        if statuses:
            queryset = queryset.filter(status__in=statuses)
        
        # Filter by priority
        priorities = request.query_params.getlist("priority")
        if priorities:
            queryset = queryset.filter(priority__in=priorities)
        
        # Search
        search_term = request.query_params.get("search")
        if search_term:
            queryset = queryset.filter(
                Q(reference_number__icontains=search_term)
                | Q(subject__icontains=search_term)
                | Q(sender_name__icontains=search_term)
                | Q(sender_organization__icontains=search_term)
                | Q(current_office__name__icontains=search_term)
                | Q(division__name__icontains=search_term)
                | Q(current_approver__first_name__icontains=search_term)
                | Q(current_approver__last_name__icontains=search_term)
            )
        
        # Date filtering
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        # Sorting
        sort_by = request.query_params.get("sort_by", "updated")
        sort_order = request.query_params.get("sort_order", "desc")
        order_prefix = "-" if sort_order == "desc" else ""
        
        if sort_by == "priority":
            from django.db.models import Case, When, IntegerField
            queryset = queryset.annotate(
                priority_order=Case(
                    When(priority=Correspondence.Priority.URGENT, then=0),
                    When(priority=Correspondence.Priority.HIGH, then=1),
                    When(priority=Correspondence.Priority.MEDIUM, then=2),
                    When(priority=Correspondence.Priority.LOW, then=3),
                    default=99,
                    output_field=IntegerField(),
                )
            ).order_by(f"{order_prefix}priority_order", "-created_at")
        elif sort_by == "created":
            queryset = queryset.order_by(f"{order_prefix}created_at")
        elif sort_by == "updated":
            queryset = queryset.order_by(f"{order_prefix}updated_at")
        elif sort_by == "subject":
            queryset = queryset.order_by(f"{'' if sort_order == 'asc' else '-'}subject")
        elif sort_by == "reference":
            queryset = queryset.order_by(f"{order_prefix}reference_number")
        else:
            queryset = queryset.order_by("-updated_at")
        
        # Calculate summary
        total_count = queryset.count()
        urgent_count = queryset.filter(priority=Correspondence.Priority.URGENT).count()
        pending_count = queryset.filter(status=Correspondence.Status.PENDING).count()
        in_progress_count = queryset.filter(status=Correspondence.Status.IN_PROGRESS).count()
        
        # Pagination
        paginator = OfficeInboxPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        
        summary = {
            "total": total_count,
            "urgent": urgent_count,
            "pending": pending_count,
            "in_progress": in_progress_count,
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
        
        completed_from = self._parse_date_param(request.query_params.get("completed_from"))
        if completed_from:
            base_queryset = base_queryset.filter(completed_at__gte=completed_from)
        
        completed_to = self._parse_date_param(request.query_params.get("completed_to"))
        if completed_to:
            base_queryset = base_queryset.filter(completed_at__lte=completed_to)

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

        # Sorting
        sort_by = request.query_params.get("sort_by", "received")
        sort_order = request.query_params.get("sort_order", "desc")
        order_prefix = "-" if sort_order == "desc" else ""
        
        if sort_by == "priority":
            from django.db.models import Case, When, IntegerField
            queryset = queryset.annotate(
                priority_order=Case(
                    When(priority=Correspondence.Priority.URGENT, then=0),
                    When(priority=Correspondence.Priority.HIGH, then=1),
                    When(priority=Correspondence.Priority.MEDIUM, then=2),
                    When(priority=Correspondence.Priority.LOW, then=3),
                    default=99,
                    output_field=IntegerField(),
                )
            ).order_by(f"{order_prefix}priority_order", "-received_date")
        elif sort_by == "received":
            queryset = queryset.order_by(f"{order_prefix}received_date")
        elif sort_by == "completed":
            queryset = queryset.order_by(f"{order_prefix}completed_at" if order_prefix else "completed_at")
        elif sort_by == "subject":
            queryset = queryset.order_by(f"{'' if sort_order == 'asc' else '-'}subject")
        elif sort_by == "reference":
            queryset = queryset.order_by(f"{order_prefix}reference_number")
        else:
            queryset = queryset.order_by("-received_date")

        total_count = summary_queryset.count()
        downward_count = summary_queryset.filter(direction=Correspondence.Direction.DOWNWARD).count()
        upward_count = summary_queryset.filter(direction=Correspondence.Direction.UPWARD).count()
        current_year = timezone.now().year
        this_year_count = summary_queryset.filter(received_date__year=current_year).count()

        paginator = OfficeInboxPagination()
        page = paginator.paginate_queryset(queryset, request)
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

    @action(detail=False, methods=["get"], url_path="records-archive")
    def records_archive(self, request):
        """
        Unified records & archive endpoint with hierarchical scoping.
        - ED/MD level: sees all records in their directorate(s)
        - GM level: sees all records in their division + departments
        - AGM level: sees all records in their department
        - Staff: sees records from their offices
        """
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            return Response(
                {
                    "count": 0,
                    "next": None,
                    "previous": None,
                    "results": [],
                    "summary": {
                        "total": 0,
                        "by_directorate": 0,
                        "by_division": 0,
                        "by_department": 0,
                        "this_year": 0,
                        "available_years": [],
                    },
                }
            )

        # Base queryset for completed/archived records
        queryset = self.base_queryset.filter(
            is_deleted=False,
            status__in=[Correspondence.Status.COMPLETED, Correspondence.Status.ARCHIVED],
        )

        # Determine user's organizational scope
        grade = (user.grade_level or "").upper()
        is_superuser = getattr(user, "is_superuser", False)
        directorate_grades = {"MDCS", "EDCS", "MD", "ED"}
        division_grades = {"MSS1", "GM", "GMCS"}
        department_grades = {"MSS2", "AGM", "AGMCS"}

        user_directorate_id = getattr(user, "directorate_id", None)
        user_division_id = getattr(user, "division_id", None)
        user_department_id = getattr(user, "department_id", None)
        user_office_ids = self._get_user_office_ids(user)

        # Apply hierarchical scoping
        if is_superuser:
            # Superuser sees everything
            pass
        elif grade in directorate_grades and user_directorate_id:
            # ED/MD level - sees all in their directorate
            queryset = queryset.filter(
                Q(division__directorate_id=user_directorate_id) |
                Q(department__division__directorate_id=user_directorate_id)
            )
        elif grade in division_grades and user_division_id:
            # GM level - sees all in their division
            queryset = queryset.filter(
                Q(division_id=user_division_id) |
                Q(department__division_id=user_division_id)
            )
        elif grade in department_grades and user_department_id:
            # AGM level - sees all in their department
            queryset = queryset.filter(department_id=user_department_id)
        else:
            # Staff level - sees records from their offices or department
            filters = Q()
            if user_office_ids:
                filters |= Q(owning_office_id__in=user_office_ids) | Q(current_office_id__in=user_office_ids)
            if user_department_id:
                filters |= Q(department_id=user_department_id)
            if user_division_id:
                filters |= Q(division_id=user_division_id)
            if filters:
                queryset = queryset.filter(filters)
            else:
                queryset = queryset.none()

        # Apply filters from query params
        
        # Directorate filter
        directorate_ids = request.query_params.getlist("directorate")
        if directorate_ids and "all" not in [d.lower() for d in directorate_ids]:
            queryset = queryset.filter(
                Q(division__directorate_id__in=directorate_ids) |
                Q(department__division__directorate_id__in=directorate_ids)
            )

        # Division filter
        division_ids = request.query_params.getlist("division")
        if division_ids and "all" not in [d.lower() for d in division_ids]:
            queryset = queryset.filter(
                Q(division_id__in=division_ids) |
                Q(department__division_id__in=division_ids)
            )

        # Department filter
        department_ids = request.query_params.getlist("department")
        if department_ids and "all" not in [d.lower() for d in department_ids]:
            queryset = queryset.filter(department_id__in=department_ids)

        # Search
        search_term = request.query_params.get("search")
        if search_term:
            queryset = queryset.filter(
                Q(reference_number__icontains=search_term)
                | Q(subject__icontains=search_term)
                | Q(sender_name__icontains=search_term)
                | Q(sender_organization__icontains=search_term)
            )

        # Priority filter
        priorities = request.query_params.getlist("priority")
        if priorities:
            queryset = queryset.filter(priority__in=priorities)

        # Status filter
        statuses = request.query_params.getlist("status")
        if statuses:
            queryset = queryset.filter(status__in=statuses)

        # Direction filter
        directions = request.query_params.getlist("direction")
        if directions:
            queryset = queryset.filter(direction__in=directions)

        # Year filter
        year = request.query_params.get("year")
        if year and year.lower() != "all":
            try:
                queryset = queryset.filter(received_date__year=int(year))
            except ValueError:
                pass

        # Date range filters
        from_date = self._parse_date_param(request.query_params.get("from_date"))
        if from_date:
            queryset = queryset.filter(received_date__gte=from_date)

        to_date = self._parse_date_param(request.query_params.get("to_date"))
        if to_date:
            queryset = queryset.filter(received_date__lte=to_date)

        # Calculate summary before sorting
        summary_queryset = queryset
        available_years = (
            summary_queryset.filter(received_date__isnull=False)
            .values_list("received_date__year", flat=True)
            .distinct()
        )

        total_count = summary_queryset.count()
        current_year = timezone.now().year
        this_year_count = summary_queryset.filter(received_date__year=current_year).count()

        # Sorting
        sort_by = request.query_params.get("sort_by", "completed")
        sort_order = request.query_params.get("sort_order", "desc")
        order_prefix = "-" if sort_order == "desc" else ""

        if sort_by == "priority":
            from django.db.models import Case, When, IntegerField
            queryset = queryset.annotate(
                priority_order=Case(
                    When(priority=Correspondence.Priority.URGENT, then=0),
                    When(priority=Correspondence.Priority.HIGH, then=1),
                    When(priority=Correspondence.Priority.MEDIUM, then=2),
                    When(priority=Correspondence.Priority.LOW, then=3),
                    default=99,
                    output_field=IntegerField(),
                )
            ).order_by(f"{order_prefix}priority_order", "-completed_at")
        elif sort_by == "received":
            queryset = queryset.order_by(f"{order_prefix}received_date")
        elif sort_by == "completed":
            queryset = queryset.order_by(f"{order_prefix}completed_at")
        elif sort_by == "subject":
            queryset = queryset.order_by(f"{'' if sort_order == 'asc' else '-'}subject")
        else:
            queryset = queryset.order_by("-completed_at", "-updated_at")

        # Paginate
        paginator = OfficeInboxPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data["summary"] = {
            "total": total_count,
            "by_directorate": 0,  # Could be calculated if needed
            "by_division": 0,
            "by_department": 0,
            "this_year": this_year_count,
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

    def _find_office_recipient(self, office, preferred_user=None):
        """
        Find the appropriate recipient for an office.

        Relaxed behaviour (per product decision):
        - Caller may select ANY user in the hierarchy, not only strict office members.
        - If a preferred_user is specified:
          - If they're a member of the given office, use them.
          - Otherwise, try to derive their primary office and use that.
          - If that still fails, fall back to the office head / hierarchy.

        Priority remains:
        1. preferred_user (if resolvable to an office)
        2. principal
        3. acting head
        4. highest grade staff

        Returns: (user, is_acting) tuple or (None, False) if no one found
        """
        from organization.models import OfficeMembership

        # If preferred_user is specified, first try to use them directly
        if preferred_user:
            # 1) Check if user is already a member of the selected office
            user_membership = (
                OfficeMembership.objects.filter(
                    office=office,
                    user=preferred_user,
                    is_active=True,
                )
                .order_by("-is_primary", "-starts_at")
                .first()
            )

            if user_membership:
                # User is in office - use them
                return (preferred_user, user_membership.assignment_role == "acting")

            # 2) User is not in this office – RELAXED BEHAVIOUR:
            #    Try to derive their primary office and route there instead.
            #    This supports the UX where the user only remembers the person's name.
            primary_membership = (
                OfficeMembership.objects.filter(
                    user=preferred_user,
                    is_active=True,
                    is_primary=True,
                )
                .select_related("office")
                .first()
            )

            if primary_membership and primary_membership.office:
                derived_office = primary_membership.office
                # Use the derived office and the preferred user
                return (preferred_user, primary_membership.assignment_role == "acting")

            # 3) If we still can't derive an office for the preferred user,
            #    fall back to the standard office head / hierarchy below.

        # No (valid) preferred user - find office head with hierarchy fallback
        # 1. Try principal
        principal = OfficeMembership.objects.filter(
            office=office,
            is_active=True,
            assignment_role='principal'
        ).select_related('user').first()
        
        if principal:
            return (principal.user, False)
        
        # 2. Try acting head
        acting = OfficeMembership.objects.filter(
            office=office,
            is_active=True,
            assignment_role='acting'
        ).select_related('user').order_by('-starts_at').first()  # Most recent acting
        
        if acting:
            return (acting.user, True)
        
        # 3. Find highest grade staff member in office
        # Get all active memberships and sort by grade level
        memberships = OfficeMembership.objects.filter(
            office=office,
            is_active=True
        ).select_related('user').all()
        
        if memberships.exists():
            # Sort by grade level (higher is better)
            # Grade levels: MDCS=19, EDCS=18, GMCS=17, AGMCS=16, etc.
            grade_order = ['MDCS', 'EDCS', 'GMCS', 'AGMCS', 'MSS1', 'MSS2', 'MSS3', 'MSS4', 'MSS5', 
                          'SSS1', 'SSS2', 'SSS3', 'SSS4', 'JSS1', 'JSS2', 'JSS3']
            
            def get_grade_level(user):
                grade = getattr(user, 'grade_level', '')
                try:
                    return grade_order.index(grade) if grade in grade_order else 999
                except (ValueError, AttributeError):
                    return 999
            
            sorted_memberships = sorted(memberships, key=lambda m: get_grade_level(m.user), reverse=True)
            highest_grade = sorted_memberships[0]
            return (highest_grade.user, False)
        
        # No one found in office
        return (None, False)

    def perform_create(self, serializer):
        # Import early to use throughout the function
        from correspondence.models import ParallelRoutingGroup, Minute as MinuteModel, CorrespondenceDelegation
        
        correspondence = serializer.validated_data["correspondence"]
        if correspondence.status == Correspondence.Status.COMPLETED:
            raise ValidationError({"detail": "Completed correspondence cannot be updated."})
        current_office = correspondence.current_office
        
        # Check if user is acting as a delegatee (assistant acting on behalf of principal)
        active_delegation = CorrespondenceDelegation.objects.filter(
            correspondence=correspondence,
            assistant=self.request.user,
            status=CorrespondenceDelegation.Status.ACTIVE
        ).select_related('principal').first()
        
        if active_delegation:
            # User is acting as delegatee - record action under principal's name
            # but track who actually performed it for audit
            principal = active_delegation.principal
            minute = serializer.save(
                user=principal,  # Shows as ED's action
                from_office=current_office,
                performed_by=self.request.user,  # Audit trail - who actually did it
                acted_by_assistant=True,
                assistant_type='PA',  # Default to PA for delegated actions
            )
            logger.info(
                f"Delegation action: {self.request.user.get_full_name()} performed minute "
                f"on behalf of {principal.get_full_name()} for correspondence {correspondence.reference_number}"
            )
            # Debug: Log routing info
            print(
                f"[DELEGATION DEBUG] Minute created - to_office: {minute.to_office}, to_office_id: {minute.to_office_id}, "
                f"to_user: {minute.to_user}, action_type: {minute.action_type}"
            )
        else:
            # Normal action - user acting as themselves
            minute = serializer.save(user=self.request.user, from_office=current_office)
        
        correspondence = minute.correspondence
        
        # Check if this is a response to a consultation request
        # If user received a consultation, route back to the requesting branch
        consultation_received = MinuteModel.objects.filter(
            correspondence=correspondence,
            is_consultation=True,
            to_user=self.request.user,
            consultation_to_branch__isnull=True  # Not yet responded to
        ).first()
        
        if consultation_received and consultation_received.consultation_from_branch:
            # This is a response to a consultation - route back to the requesting branch
            requesting_branch = consultation_received.consultation_from_branch
            consultation_received.consultation_to_branch = minute
            consultation_received.save(update_fields=['consultation_to_branch'])
            
            # Route back to the user who requested consultation
            requesting_user = requesting_branch.user
            from organization.models import OfficeMembership
            requesting_office_membership = OfficeMembership.objects.filter(
                user=requesting_user,
                is_active=True,
                is_primary=True
            ).select_related('office').first()
            
            if requesting_office_membership:
                correspondence.current_office = requesting_office_membership.office
                correspondence.current_approver = requesting_user
                correspondence.save(update_fields=["current_office", "current_approver", "updated_at"])
                logger.info(
                    f"Consultation response - routing back to requesting branch user {requesting_user} "
                    f"at office {requesting_office_membership.office.name}"
                )
                # Skip normal routing logic for consultation responses
                return
        
        # Initialize parallel group tracking variables
        parallel_group_completed = False
        original_sender = None
        
        # Check if user is routing within a parallel branch
        # If so, inherit branch_originator and parallel_group_id for tracking
        parallel_minutes_to_user = MinuteModel.objects.filter(
            correspondence=correspondence,
            is_parallel_branch=True,
            to_user=self.request.user
        ).select_related('correspondence', 'branch_originator')
        
        # If user received a parallel branch, they're routing within that branch
        # Inherit branch tracking info
        if parallel_minutes_to_user.exists():
            parent_parallel_minute = parallel_minutes_to_user.first()
            # Inherit branch_originator and parallel_group_id for sequential routing within branch
            if not minute.branch_originator and parent_parallel_minute.branch_originator:
                minute.branch_originator = parent_parallel_minute.branch_originator
                minute.save(update_fields=['branch_originator'])
            if not minute.parallel_group_id and parent_parallel_minute.parallel_group_id:
                minute.parallel_group_id = parent_parallel_minute.parallel_group_id
                minute.is_parallel_branch = True
                minute.save(update_fields=['parallel_group_id', 'is_parallel_branch'])
        
        # Check if this minute is completing a parallel branch (no further routing down)
        # If so, route up to branch originator (not back to MD) for review and decision
        is_completing_parallel_branch = False
        branch_originator_to_route_to = None
        
        if parallel_minutes_to_user.exists():
            # Find the branch originator (who received this branch from MD)
            # This is the person who should review when the branch completes
            for parallel_minute in parallel_minutes_to_user:
                if parallel_minute.branch_originator:
                    branch_originator_to_route_to = parallel_minute.branch_originator
                    break
            
            # If no branch_originator set (for old parallel routes), use the parallel group creator as fallback
            if not branch_originator_to_route_to:
                parallel_group_ids = set(parallel_minutes_to_user.values_list('parallel_group_id', flat=True).distinct())
                for group_id in parallel_group_ids:
                    if not group_id:
                        continue
                    try:
                        parallel_group = ParallelRoutingGroup.objects.get(id=group_id)
                        # For old routes, use the first recipient as branch originator
                        first_recipient_minute = parallel_minutes_to_user.filter(parallel_group_id=group_id).first()
                        if first_recipient_minute and first_recipient_minute.to_user:
                            branch_originator_to_route_to = first_recipient_minute.to_user
                            # Update the minute to have branch_originator for future
                            first_recipient_minute.branch_originator = first_recipient_minute.to_user
                            first_recipient_minute.save(update_fields=['branch_originator'])
                        break
                    except ParallelRoutingGroup.DoesNotExist:
                        pass
        
        # Update office if to_office is specified and different
        office_updated = False
        approver_updated = False
        recipient_user = None
        
        # If completing a parallel branch, route up to branch originator for review
        # Branch originator can then: complete branch, route to MD, or route laterally
        # Only route up if: (1) user is in a parallel branch, (2) no further routing down (approve or no to_office), 
        # and (3) merge strategy is "independent" (branches work independently)
        if branch_originator_to_route_to and branch_originator_to_route_to.id != self.request.user.id:
            # Check if this is completing the branch (not routing further down)
            # Route up if: approve action OR no to_office specified (completing at this level)
            is_completing_branch = (
                minute.action_type == Minute.ActionType.APPROVE or
                (minute.action_type in [Minute.ActionType.MINUTE, Minute.ActionType.FORWARD] and not minute.to_office)
            )
            
            # Check merge strategy - only route up for "independent" branches
            merge_strategy = "independent"
            if parallel_minutes_to_user.exists():
                parent_minute = parallel_minutes_to_user.first()
                if parent_minute.merge_strategy:
                    merge_strategy = parent_minute.merge_strategy
            
            if is_completing_branch and merge_strategy == "independent":
                # This is completing the branch - route up to branch originator for review
                from organization.models import OfficeMembership
                originator_office_membership = OfficeMembership.objects.filter(
                    user=branch_originator_to_route_to,
                    is_active=True,
                    is_primary=True
                ).select_related('office').first()
                
                if originator_office_membership:
                    correspondence.current_office = originator_office_membership.office
                    correspondence.current_approver = branch_originator_to_route_to
                    office_updated = True
                    approver_updated = True
                    is_completing_parallel_branch = True
                    logger.info(
                        f"Parallel branch completing - routing up to branch originator {branch_originator_to_route_to} "
                        f"at office {originator_office_membership.office.name} for review"
                    )
        # For FORWARD and MINUTE actions, handle office routing (only if not completing parallel branch)
        elif minute.action_type in (Minute.ActionType.FORWARD, Minute.ActionType.MINUTE):
            if minute.to_office:
                # Find appropriate recipient for the office
                # If to_user is set, validate they're in the office and use them
                # Otherwise, find office head (principal > acting > highest grade)
                preferred_user = minute.to_user if hasattr(minute, 'to_user') and minute.to_user else None
                try:
                    recipient_user, is_acting = self._find_office_recipient(minute.to_office, preferred_user)
                    
                    # Log if using acting head
                    if is_acting and recipient_user:
                        logger.info(f"Using acting head {recipient_user} for office {minute.to_office.name}")
                except ValidationError:
                    # If preferred user is not in office, log but continue
                    logger.warning(f"Preferred user not in office {minute.to_office.name}, will use office head")
                    recipient_user, is_acting = self._find_office_recipient(minute.to_office, None)
            
            # Also check if to_user is set but to_office is not - get office from user's membership
            elif minute.to_user and not minute.to_office:
                # Get the user's primary office
                from organization.models import OfficeMembership
                user_office_membership = OfficeMembership.objects.filter(
                    user=minute.to_user,
                    is_active=True,
                    is_primary=True
                ).select_related('office').first()
                
                if user_office_membership:
                    minute.to_office = user_office_membership.office
                    recipient_user = minute.to_user
                    logger.info(f"Derived office {user_office_membership.office.name} from user {minute.to_user}")
        
        # Always update current_office if to_office is specified and different (unless branch completing)
        # Also update if we derived an office from the user
        if not is_completing_parallel_branch:
            if minute.to_office and minute.to_office_id != (current_office.id if current_office else None):
                correspondence.current_office = minute.to_office
                office_updated = True
                logger.info(f"Setting current_office to {minute.to_office.name} (ID: {minute.to_office_id})")
            # If we have a recipient_user but no to_office set, try to get their office
            elif recipient_user and not minute.to_office:
                from organization.models import OfficeMembership
                user_office_membership = OfficeMembership.objects.filter(
                    user=recipient_user,
                    is_active=True,
                    is_primary=True
                ).select_related('office').first()
                
                if user_office_membership and user_office_membership.office_id != (current_office.id if current_office else None):
                    correspondence.current_office = user_office_membership.office
                    office_updated = True
                    logger.info(f"Setting current_office to {user_office_membership.office.name} from recipient user {recipient_user}")
        
        # Set current_approver if we found a recipient user (unless branch completing)
        if not is_completing_parallel_branch and recipient_user and recipient_user.id != self.request.user.id:
            if correspondence.current_approver_id != recipient_user.id:
                correspondence.current_approver = recipient_user
                approver_updated = True
                logger.info(f"Setting current_approver to {recipient_user} (ID: {recipient_user.id})")
        
        # Save updates
        if office_updated or approver_updated:
            update_fields = ["updated_at"]
            if office_updated:
                update_fields.append("current_office")
            if approver_updated:
                update_fields.append("current_approver")
            correspondence.save(update_fields=update_fields)
            print(
                f"[ROUTING SUCCESS] Updated correspondence {correspondence.id} - current_office: {correspondence.current_office_id}, "
                f"current_approver: {correspondence.current_approver_id}"
            )
        else:
            # Debug: Log why routing didn't happen
            print(
                f"[ROUTING DEBUG] No routing update - office_updated: {office_updated}, approver_updated: {approver_updated}, "
                f"recipient_user: {recipient_user}, minute.to_office: {minute.to_office}, "
                f"is_completing_parallel_branch: {is_completing_parallel_branch}"
            )
        
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
        # (Skip if parallel group just completed - notification already sent or will be sent separately)
        if not parallel_group_completed and correspondence.current_approver and correspondence.current_approver.id != self.request.user.id:
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
        
        # If parallel group just completed, notify the original sender
        if parallel_group_completed and original_sender:
            NotificationService.create_notification(
                recipient=original_sender,
                title=f"Parallel Routing Completed - {correspondence.reference_number}",
                message=f"All parallel branches have been completed for correspondence: {correspondence.subject}. The correspondence has been routed back to you.",
                notification_type=Notification.NotificationType.CORRESPONDENCE,
                priority=Notification.Priority.NORMAL,
                sender=self.request.user,
                module="correspondence",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
                action_url=f"/correspondence/{correspondence.id}",
                action_required=True,
            )

    def update(self, request, *args, **kwargs):
        """Handle minute editing with validation."""
        minute = self.get_object()
        
        # Check if minute can be edited
        if not minute.can_be_edited():
            raise ValidationError({
                "detail": "This minute cannot be edited. It has either been opened/acted upon or the 30-minute window has expired."
            })
        
        # Check if user is the original sender
        if minute.user_id != request.user.id:
            raise ValidationError({
                "detail": "Only the original sender can edit this minute."
            })
        
        # Store original text if first edit
        if not minute.is_edited:
            minute.original_minute_text = minute.minute_text
            minute.is_edited = True
        
        # Add to edit history
        edit_entry = {
            "edited_at": timezone.now().isoformat(),
            "edited_by": str(request.user.id),
            "old_text": minute.minute_text,
            "new_text": request.data.get("minute_text", minute.minute_text),
        }
        minute.edit_history.append(edit_entry)
        
        # Update minute
        serializer = self.get_serializer(minute, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        minute = serializer.save(edited_at=timezone.now())
        
        # Create audit log
        AuditService.log_correspondence_activity(
            user=request.user,
            action="minute_edited",
            correspondence=minute.correspondence,
            request=request,
            description=f"Edited minute on correspondence: {minute.correspondence.reference_number}",
            metadata={
                "minute_id": str(minute.id),
                "edit_count": len(minute.edit_history),
            },
        )
        
        # Check parallel routing completion if this minute is part of a parallel branch
        if minute.parallel_group_id:
            from correspondence.models import ParallelRoutingGroup
            try:
                parallel_group = ParallelRoutingGroup.objects.get(id=minute.parallel_group_id)
                parallel_group.check_and_update_completion()
            except ParallelRoutingGroup.DoesNotExist:
                pass
        
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="mark-opened")
    def mark_opened(self, request, pk=None):
        """Mark minute as opened by recipient."""
        minute = self.get_object()
        
        if not minute.is_opened:
            minute.is_opened = True
            minute.opened_at = timezone.now()
            minute.save(update_fields=["is_opened", "opened_at"])
        
        return Response({"status": "marked_as_opened"})

    @action(detail=True, methods=["post"], url_path="recall")
    def recall(self, request, pk=None):
        """Recall/withdraw a minute within the edit window."""
        minute = self.get_object()
        
        # Check if minute can be recalled
        if not minute.can_be_recalled():
            raise ValidationError({
                "detail": "This minute cannot be recalled. It has either been opened/acted upon or the 30-minute window has expired."
            })
        
        # Check if user is the original sender
        if minute.user_id != request.user.id:
            raise ValidationError({
                "detail": "Only the original sender can recall this minute."
            })
        
        # Mark as recalled
        recall_reason = request.data.get("recall_reason", "")
        minute.is_recalled = True
        minute.recalled_at = timezone.now()
        if recall_reason:
            minute.recall_reason = recall_reason
        minute.save(update_fields=["is_recalled", "recalled_at", "recall_reason"])
        
        correspondence = minute.correspondence
        
        # If this was a routing minute (forward/minute/approve/treat) that routed the correspondence,
        # revert the routing back appropriately
        routing_actions = (Minute.ActionType.FORWARD, Minute.ActionType.MINUTE, Minute.ActionType.APPROVE, Minute.ActionType.TREAT)
        if minute.action_type in routing_actions and minute.to_office:
            # Check if there are any minutes created AFTER this one
            # If yes, we can't safely revert routing (workflow has progressed)
            subsequent_minutes = Minute.objects.filter(
                correspondence=correspondence,
                timestamp__gt=minute.timestamp,
                is_recalled=False  # Don't count other recalled minutes
            ).exists()
            
            # Only revert if this is the last routing action (no subsequent minutes)
            # OR if the correspondence is currently at the minute's to_office
            should_revert = False
            if not subsequent_minutes:
                # No subsequent minutes - safe to revert
                should_revert = True
            elif correspondence.current_office_id == minute.to_office_id:
                # Correspondence is still at the recipient office from this minute
                # This means subsequent minutes didn't route it further
                should_revert = True
            
            if should_revert and minute.from_office:
                # Revert to the sender's office
                correspondence.current_office = minute.from_office
                correspondence.current_approver = minute.user  # Route back to sender
                correspondence.save(update_fields=["current_office", "current_approver", "updated_at"])
                
                # Notify the sender that routing was reverted
                NotificationService.create_notification(
                    recipient=minute.user,
                    title=f"Routing Reverted - {correspondence.reference_number}",
                    message=f"Your recalled minute has reverted the correspondence routing back to you. The correspondence is now in your inbox for action.",
                    notification_type=Notification.NotificationType.CORRESPONDENCE,
                    priority=Notification.Priority.NORMAL,
                    sender=request.user,
                    module="correspondence",
                    related_object_type="correspondence",
                    related_object_id=str(correspondence.id),
                    action_url=f"/correspondence/{correspondence.id}",
                    action_required=True,
                )
        
        # Create audit log
        AuditService.log_correspondence_activity(
            user=request.user,
            action="minute_recalled",
            correspondence=correspondence,
            request=request,
            description=f"Recalled minute on correspondence: {correspondence.reference_number}",
            metadata={
                "minute_id": str(minute.id),
                "recall_reason": recall_reason,
                "routing_reverted": minute.action_type in (Minute.ActionType.FORWARD, Minute.ActionType.MINUTE) and minute.to_office_id == correspondence.current_office_id,
            },
        )
        
        # Send notification to recipient if they haven't opened it yet
        if minute.to_office:
            from organization.models import OfficeMembership
            office_head = OfficeMembership.objects.filter(
                office=minute.to_office,
                is_active=True,
                assignment_role__in=['principal', 'acting']
            ).select_related('user').first()
            
            if office_head and office_head.user_id != request.user.id:
                NotificationService.create_notification(
                    recipient=office_head.user,
                    title=f"Minute Recalled - {correspondence.reference_number}",
                    message=f"{request.user.get_full_name() or request.user.username} has recalled a minute on correspondence: {correspondence.subject}. The correspondence has been routed back to the sender.",
                    notification_type=Notification.NotificationType.CORRESPONDENCE,
                    priority=Notification.Priority.NORMAL,
                    sender=request.user,
                    module="correspondence",
                    related_object_type="correspondence",
                    related_object_id=str(correspondence.id),
                    action_url=f"/correspondence/{correspondence.id}",
                    action_required=False,
                )
        
        serializer = self.get_serializer(minute)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="parallel-route")
    def parallel_route(self, request):
        """Create parallel routing to multiple recipients."""
        # Check if user is executive (MD, ED, GM, AGM)
        user = request.user
        executive_grades = ['MDCS', 'EDCS', 'GMCS', 'AGMCS']
        if not hasattr(user, 'grade_level') or user.grade_level not in executive_grades:
            raise ValidationError({
                "detail": "Only executives (MD, ED, GM, AGM) can create parallel routes."
            })
        
        correspondence_id = request.data.get("correspondence_id")
        recipients = request.data.get("recipients", [])  # List of {user_id, purpose, office_id}
        # Default to "independent" for parallel routing - branches work independently
        merge_strategy = request.data.get("merge_strategy", "independent")
        
        if not correspondence_id or not recipients:
            raise ValidationError({
                "detail": "correspondence_id and recipients are required."
            })
        
        # Validate: need at least 2 recipients for parallel routing
        if len(recipients) < 2:
            raise ValidationError({
                "detail": "Parallel routing requires at least 2 recipients."
            })
        
        # Validate: no duplicate user_ids
        user_ids = [r.get("user_id") for r in recipients if r.get("user_id")]
        if len(user_ids) != len(set(user_ids)):
            raise ValidationError({
                "detail": "Duplicate recipients are not allowed. Each recipient must be unique."
            })
        
        try:
            correspondence = Correspondence.objects.get(id=correspondence_id)
        except Correspondence.DoesNotExist:
            raise ValidationError({"detail": "Correspondence not found."})
        
        # Create parallel routing group
        parallel_group = ParallelRoutingGroup.objects.create(
            correspondence=correspondence,
            created_by=user,
            merge_strategy=merge_strategy,
            total_branches=len(recipients),
        )
        
        # Validate recipients - no duplicates
        recipient_user_ids = [r.get("user_id") for r in recipients if r.get("user_id")]
        if len(recipient_user_ids) != len(set(recipient_user_ids)):
            raise ValidationError({
                "detail": "Duplicate recipients are not allowed in parallel routing."
            })
        
        # Create minutes for each recipient
        created_minutes = []
        recipient_users = {}  # Cache recipient user lookups
        
        for recipient_data in recipients:
            recipient_user_id = recipient_data.get("user_id")
            if not recipient_user_id:
                continue
                
            purpose = recipient_data.get("purpose", "action")
            office_id = recipient_data.get("office_id")
            minute_text = recipient_data.get("minute_text", "")
            
            # Get recipient user
            if recipient_user_id not in recipient_users:
                try:
                    recipient_users[recipient_user_id] = User.objects.get(id=recipient_user_id)
                except User.DoesNotExist:
                    raise ValidationError({
                        "detail": f"Recipient user {recipient_user_id} not found."
                    })
            
            recipient_user = recipient_users[recipient_user_id]
            
            # Determine office
            office = None
            if office_id:
                try:
                    office = Office.objects.get(id=office_id)
                except Office.DoesNotExist:
                    pass
            
            # If no office specified, try to get recipient's primary office
            if not office:
                office_membership = OfficeMembership.objects.filter(
                    user=recipient_user,
                    is_active=True,
                    is_primary=True
                ).select_related('office').first()
                if office_membership:
                    office = office_membership.office
            
            # Validate that recipient is in the specified office (if office is set)
            if office:
                user_in_office = OfficeMembership.objects.filter(
                    office=office,
                    user=recipient_user,
                    is_active=True
                ).exists()
                
                if not user_in_office:
                    raise ValidationError({
                        "detail": f"User {recipient_user.get_full_name() or recipient_user.username} is not a member of {office.name}. Please select a user from that office."
                    })
            
            # Create minute - user is the SENDER (creator), to_user is the specific recipient
            minute = Minute.objects.create(
                correspondence=correspondence,
                user=user,  # Sender (the executive creating the parallel route)
                minute_text=minute_text,
                action_type=Minute.ActionType.MINUTE,
                direction=correspondence.direction,
                purpose=purpose,
                requires_response=(purpose in ["action", "approval"]),
                routing_type="parallel",
                parallel_group_id=parallel_group.id,
                is_parallel_branch=True,
                merge_strategy=merge_strategy,
                from_office=correspondence.current_office,
                to_office=office,
                to_user=recipient_user,  # Specific recipient user for parallel routing
                branch_originator=recipient_user,  # Track who received this branch (for routing back up)
            )
            
            # Send notification to the specific recipient user (to_user)
            # This ensures the notification goes to the person who needs to act, not just the office head
            notification_recipient = recipient_user  # Always notify the specific recipient
            
            NotificationService.create_notification(
                recipient=notification_recipient,
                title=f"Parallel Route - {correspondence.reference_number}",
                message=f"{user.get_full_name() or user.username} has routed this correspondence to you in parallel. Purpose: {purpose.replace('_', ' ').title()}",
                notification_type=Notification.NotificationType.CORRESPONDENCE,
                priority=Notification.Priority.HIGH if correspondence.priority == Correspondence.Priority.URGENT else Notification.Priority.NORMAL,
                sender=user,
                module="correspondence",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
                action_url=f"/correspondence/{correspondence.id}",
                action_required=(purpose in ["action", "approval"]),
            )
            
            created_minutes.append(minute)
        
        # Update correspondence workflow state
        correspondence.workflow_state = "parallel"
        correspondence.active_parallel_branches = len(created_minutes)
        correspondence.save(update_fields=["workflow_state", "active_parallel_branches"])
        
        # Create audit log
        AuditService.log_correspondence_activity(
            user=user,
            action="parallel_route_created",
            correspondence=correspondence,
            request=request,
            description=f"Created parallel route with {len(recipients)} branches",
            metadata={
                "parallel_group_id": str(parallel_group.id),
                "merge_strategy": merge_strategy,
                "branch_count": len(recipients),
            },
        )
        
        serializer = self.get_serializer(created_minutes, many=True)
        return Response({
            "parallel_group_id": str(parallel_group.id),
            "minutes": serializer.data,
        }, status=status.HTTP_201_CREATED)


    @action(detail=False, methods=["post"], url_path="consultation-route")
    def consultation_route(self, request):
        """Create a consultation request from a branch to another department for input."""
        correspondence_id = request.data.get("correspondence_id")
        from_branch_minute_id = request.data.get("from_branch_minute_id")  # The minute requesting consultation
        to_user_id = request.data.get("to_user_id")
        to_office_id = request.data.get("to_office_id")
        minute_text = request.data.get("minute_text", "Requesting consultation/input on this matter.")
        
        if not correspondence_id or not from_branch_minute_id or not to_user_id:
            raise ValidationError({
                "detail": "correspondence_id, from_branch_minute_id, and to_user_id are required."
            })
        
        try:
            correspondence = Correspondence.objects.get(id=correspondence_id)
            from_branch_minute = Minute.objects.get(id=from_branch_minute_id)
            to_user = User.objects.get(id=to_user_id)
        except (Correspondence.DoesNotExist, Minute.DoesNotExist, User.DoesNotExist) as e:
            raise ValidationError({"detail": f"Invalid ID: {str(e)}"})
        
        # Validate that from_branch_minute belongs to this correspondence
        if from_branch_minute.correspondence_id != correspondence.id:
            raise ValidationError({"detail": "Branch minute does not belong to this correspondence."})
        
        # Determine office
        office = None
        if to_office_id:
            try:
                office = Office.objects.get(id=to_office_id)
            except Office.DoesNotExist:
                pass
        
        if not office:
            office_membership = OfficeMembership.objects.filter(
                user=to_user,
                is_active=True,
                is_primary=True
            ).select_related('office').first()
            if office_membership:
                office = office_membership.office
        
        # Validate user is in office
        if office:
            user_in_office = OfficeMembership.objects.filter(
                office=office,
                user=to_user,
                is_active=True
            ).exists()
            if not user_in_office:
                raise ValidationError({
                    "detail": f"User {to_user.get_full_name() or to_user.username} is not a member of {office.name}."
                })
        
        # Create consultation minute
        consultation_minute = Minute.objects.create(
            correspondence=correspondence,
            user=request.user,  # Person requesting consultation
            minute_text=minute_text,
            action_type=Minute.ActionType.MINUTE,
            direction=correspondence.direction,
            purpose="comment",  # Consultation is for comment/input
            requires_response=True,
            routing_type="sequential",
            is_consultation=True,
            consultation_from_branch=from_branch_minute,
            from_office=correspondence.current_office,
            to_office=office,
            to_user=to_user,
            # Inherit branch tracking if from_branch is part of a parallel branch
            branch_originator=from_branch_minute.branch_originator,
            parallel_group_id=from_branch_minute.parallel_group_id,
            is_parallel_branch=from_branch_minute.is_parallel_branch,
        )
        
        # Update correspondence
        if office:
            correspondence.current_office = office
        correspondence.current_approver = to_user
        correspondence.save(update_fields=["current_office", "current_approver", "updated_at"])
        
        # Send notification
        NotificationService.create_notification(
            recipient=to_user,
            title=f"Consultation Request - {correspondence.reference_number}",
            message=f"{request.user.get_full_name() or request.user.username} is requesting your input/consultation on this correspondence.",
            notification_type=Notification.NotificationType.CORRESPONDENCE,
            priority=Notification.Priority.NORMAL,
            sender=request.user,
            module="correspondence",
            related_object_type="correspondence",
            related_object_id=str(correspondence.id),
            action_url=f"/correspondence/{correspondence.id}",
            action_required=True,
        )
        
        serializer = self.get_serializer(consultation_minute)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class ParallelRoutingGroupViewSet(viewsets.ModelViewSet):
    queryset = ParallelRoutingGroup.objects.select_related("correspondence", "created_by").distinct()
    serializer_class = ParallelRoutingGroupSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["correspondence", "created_by", "is_complete", "merge_strategy"]
    
    def get_queryset(self):
        """Ensure distinct groups and filter by correspondence if provided."""
        qs = super().get_queryset()
        correspondence_id = self.request.query_params.get('correspondence')
        if correspondence_id:
            qs = qs.filter(correspondence_id=correspondence_id)
        # Use distinct() to prevent duplicates (works across all databases)
        return qs.distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DelegationViewSet(viewsets.ModelViewSet):
    queryset = Delegation.objects.select_related("principal", "assistant")
    serializer_class = DelegationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["principal", "assistant", "active"]


class CorrespondenceDelegationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for per-correspondence delegations.
    Allows executives to delegate specific correspondences to their assistants.
    """
    queryset = CorrespondenceDelegation.objects.select_related(
        "correspondence", "principal", "assistant", "delegation"
    )
    serializer_class = CorrespondenceDelegationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["correspondence", "principal", "assistant", "status"]
    search_fields = ["correspondence__subject", "correspondence__reference_number"]

    def get_queryset(self):
        """Filter delegations based on user role."""
        user = self.request.user
        qs = super().get_queryset()
        
        # User can see delegations they created (as principal) or received (as assistant)
        return qs.filter(Q(principal=user) | Q(assistant=user))

    def perform_create(self, serializer):
        """Create delegation and send notification to assistant."""
        principal = self.request.user
        assistant = serializer.validated_data.get("assistant")
        correspondence = serializer.validated_data.get("correspondence")
        notes = serializer.validated_data.get("notes", "")
        
        # Revoke any existing active delegations for this correspondence by this principal
        existing_delegations = CorrespondenceDelegation.objects.filter(
            correspondence=correspondence,
            principal=principal,
            status=CorrespondenceDelegation.Status.ACTIVE
        )
        if existing_delegations.exists():
            existing_delegations.update(
                status=CorrespondenceDelegation.Status.REVOKED,
                revoked_at=timezone.now()
            )
            logger.info(
                f"Revoked {existing_delegations.count()} existing delegation(s) "
                f"for {correspondence.reference_number}"
            )
        
        # Find the general delegation assignment (if exists)
        delegation = Delegation.objects.filter(
            principal=principal,
            assistant=assistant,
            active=True
        ).first()
        
        # Save the correspondence delegation
        instance = serializer.save(
            principal=principal,
            delegation=delegation
        )
        
        # Send notification to assistant
        self._send_delegation_notification(instance, notes)
        
        # Log the delegation
        logger.info(
            f"Correspondence {correspondence.reference_number} delegated "
            f"from {principal.get_full_name()} to {assistant.get_full_name()}"
        )

    def _send_delegation_notification(self, delegation, notes):
        """Send notification to the assistant about the delegation."""
        try:
            NotificationService.create_notification(
                recipient=delegation.assistant,
                notification_type="delegation",
                title="New Correspondence Delegated to You",
                message=(
                    f"{delegation.principal.get_full_name()} has delegated correspondence "
                    f"'{delegation.correspondence.subject}' ({delegation.correspondence.reference_number}) to you."
                    + (f" Instructions: {notes}" if notes else "")
                ),
                action_url=f"/correspondence/{delegation.correspondence.id}",
                related_object_type="correspondence",
                related_object_id=str(delegation.correspondence.id),
                priority="high" if delegation.correspondence.priority == "urgent" else "medium"
            )
        except Exception as e:
            logger.error(f"Failed to send delegation notification: {e}")

    @action(detail=False, methods=["get"])
    def my_delegated_items(self, request):
        """Get all correspondences delegated TO the current user (as assistant)."""
        user = request.user
        delegations = CorrespondenceDelegation.objects.filter(
            assistant=user,
            status=CorrespondenceDelegation.Status.ACTIVE
        ).select_related("correspondence", "principal")
        
        serializer = self.get_serializer(delegations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def my_delegations(self, request):
        """Get all correspondences delegated BY the current user (as principal)."""
        user = request.user
        delegations = CorrespondenceDelegation.objects.filter(
            principal=user,
            status=CorrespondenceDelegation.Status.ACTIVE
        ).select_related("correspondence", "assistant")
        
        serializer = self.get_serializer(delegations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        """Revoke a delegation."""
        delegation = self.get_object()
        
        # Only the principal can revoke
        if delegation.principal != request.user:
            return Response(
                {"detail": "Only the executive who delegated can revoke."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if delegation.status != CorrespondenceDelegation.Status.ACTIVE:
            return Response(
                {"detail": f"Delegation is already {delegation.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        delegation.revoke()
        
        # Notify assistant about revocation
        try:
            NotificationService.create_notification(
                recipient=delegation.assistant,
                notification_type="delegation",
                title="Delegation Revoked",
                message=(
                    f"{delegation.principal.get_full_name()} has revoked the delegation for "
                    f"'{delegation.correspondence.subject}' ({delegation.correspondence.reference_number})."
                ),
                action_url=f"/correspondence/{delegation.correspondence.id}",
                related_object_type="correspondence",
                related_object_id=str(delegation.correspondence.id),
                priority="medium"
            )
        except Exception as e:
            logger.error(f"Failed to send revocation notification: {e}")
        
        serializer = self.get_serializer(delegation)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark a delegation as completed."""
        delegation = self.get_object()
        
        # Only assistant can mark as completed
        if delegation.assistant != request.user:
            return Response(
                {"detail": "Only the assistant can mark delegation as completed."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if delegation.status != CorrespondenceDelegation.Status.ACTIVE:
            return Response(
                {"detail": f"Delegation is already {delegation.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        delegation.complete()
        
        # Notify principal about completion
        try:
            NotificationService.create_notification(
                recipient=delegation.principal,
                notification_type="delegation",
                title="Delegated Correspondence Handled",
                message=(
                    f"{delegation.assistant.get_full_name()} has completed handling "
                    f"'{delegation.correspondence.subject}' ({delegation.correspondence.reference_number})."
                ),
                action_url=f"/correspondence/{delegation.correspondence.id}",
                related_object_type="correspondence",
                related_object_id=str(delegation.correspondence.id),
                priority="medium"
            )
        except Exception as e:
            logger.error(f"Failed to send completion notification: {e}")
        
        serializer = self.get_serializer(delegation)
        return Response(serializer.data)

"""API endpoints for correspondence (items) CRUD and core actions."""

from __future__ import annotations

import logging
import os
import re
from uuid import UUID
from datetime import timedelta, datetime

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.db import IntegrityError
from django.db.models import Exists, Prefetch, Q, OuterRef, Subquery, CharField, Case as DBCase, When, IntegerField, F, Max
from django.utils import timezone
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from common.storage_utils import resolve_media_path

from django_filters.rest_framework import DjangoFilterBackend

from common.upload_validators import validate_file_upload
from rest_framework import filters, viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from audit.models import ActivityLog
from audit.services import AuditService
from common.pagination import StandardPageNumberPagination
from notifications.models import Notification
from notifications.services import NotificationService
from organization.models import Office, OfficeMembership
from organization.office_access import OFFICE_QUEUE_ROLES, get_office_queue_office_ids
from dms.models import DocumentVersion, Document

from .archive_policy import (
    ARCHIVE_LEVEL_ORDER,
    ARCHIVE_LEVEL_PERMISSION_BY_LEVEL,
    archive_org_units,
    archive_record_visible_to,
    assert_correspondence_writable,
    filter_archived_records,
    readable_archive_levels,
)
from .sidebar_counts_cache import get_sidebar_counts_cache_key
from .models import (
    Correspondence,
    CorrespondenceAttachment,
    CorrespondenceDelegation,
    CorrespondenceDraft,
    CorrespondenceDistribution,
    CorrespondenceDocumentLink,
    CorrespondenceTemplate,
    Delegation,
    DispatchRecord,
    Minute,
    ParallelRoutingGroup,
    PhysicalDocument,
    ReadReceipt,
)
from .serializers import (
    CorrespondenceAttachmentSerializer,
    CorrespondenceDelegationSerializer,
    CorrespondenceDraftSerializer,
    CorrespondenceDistributionSerializer,
    CorrespondenceDocumentLinkSerializer,
    CorrespondenceListSerializer,
    CorrespondenceSerializer,
    CorrespondenceTemplateSerializer,
    DelegationSerializer,
    DispatchRecordSerializer,
    MinuteSerializer,
)
from .services import (
    CompletionPackageService,
    CorrespondenceDocumentService,
    CaseService,
    route_back_to_origin,
)

logger = logging.getLogger(__name__)
User = get_user_model()


_CLIENT_REFERENCE_PATTERN = re.compile(r"^NPA/REG/\d{4}/[A-F0-9]{8}$", re.IGNORECASE)


def _is_client_generated_reference(value: str | None) -> bool:
    """Identify the old browser placeholder so the server can canonicalize it."""
    return bool(value and _CLIENT_REFERENCE_PATTERN.fullmatch(value.strip()))


def _sla_overdue_filter() -> Q:
    from analytics.models import SLAConfiguration

    targets = SLAConfiguration.get_default_sla_targets()
    now = timezone.now()
    overdue_filter = Q()
    for priority, target_hours in targets.items():
        cutoff = now - timedelta(hours=target_hours)
        overdue_filter |= Q(priority=priority, received_date__lt=cutoff.date())
    return overdue_filter & ~Q(status=Correspondence.Status.COMPLETED)


def _sla_due_soon_filter() -> Q:
    from analytics.models import SLAConfiguration

    targets = SLAConfiguration.get_default_sla_targets()
    now = timezone.now()
    due_soon_filter = Q()
    for priority, target_hours in targets.items():
        overdue_cutoff = now - timedelta(hours=target_hours)
        warn_cutoff = overdue_cutoff - timedelta(days=2)
        due_soon_filter |= Q(
            priority=priority,
            received_date__gt=warn_cutoff.date(),
            received_date__gte=overdue_cutoff.date(),
        )
    return due_soon_filter & ~Q(status=Correspondence.Status.COMPLETED)


# Statuses that are no longer sitting in a seat's live tray. Archiving happens
# separately, after completion, so both must be excluded — otherwise archiving
# a completed memo makes it reappear in the Office Inbox it came from.
OFFICE_TRAY_EXCLUDED_STATUSES = (
    Correspondence.Status.COMPLETED,
    Correspondence.Status.ARCHIVED,
)

ARCHIVABLE_STATUSES = (
    Correspondence.Status.COMPLETED,
    Correspondence.Status.DISPATCHED,
    Correspondence.Status.ACKNOWLEDGED,
)


def _share_package_with_archive_level(correspondence: Correspondence, archive_level: str) -> None:
    """Best-effort: keep the completion package readable at its filing level."""
    if not archive_level:
        return
    try:
        CompletionPackageService.share_with_archive_level(correspondence, archive_level)
    except Exception:
        logger.exception(
            "Failed to share completion package for correspondence %s at %s level",
            correspondence.id,
            archive_level,
        )


def _archive_levels_user_may_file(user) -> list[str]:
    from organization.permission_utils import user_has_permission

    if not user_has_permission(user, "can_archive"):
        return []
    levels = [
        level
        for level in ARCHIVE_LEVEL_ORDER
        if user_has_permission(user, ARCHIVE_LEVEL_PERMISSION_BY_LEVEL[level])
    ]
    if not levels:
        # Roles created before level permissions existed only hold can_archive.
        # Keep them working at the most restrictive depth instead of locking
        # them out; scope checks still apply.
        return [Correspondence.ArchiveLevel.DEPARTMENT]
    return levels


def _archive_scope_allows(user, level: str, units: dict[str, object | None]) -> bool:
    """True when the filing level sits inside the user's organisational scope.

    Scope flows upward only: a department officer files at department level, a
    division head may file a department or division record in their division, and
    a directorate head covers every division and department beneath them.
    """
    from organization.org_scope import resolve_user_org_scope

    scope = resolve_user_org_scope(user)
    if scope.level == "all":
        return True
    if scope.level == "participation":
        # Being on the routing trail is not archive authority.
        return False

    if level == Correspondence.ArchiveLevel.DEPARTMENT:
        department = units[level]
        if department is None:
            return False
        if scope.level == "department":
            return department.id == scope.department_id
        department_division = department.division
        if department_division is None:
            return False
        if scope.level == "division":
            return department_division.id == scope.division_id
        return department_division.directorate_id == scope.directorate_id

    if level == Correspondence.ArchiveLevel.DIVISION:
        division = units[level]
        if division is None:
            return False
        if scope.level == "division":
            return division.id == scope.division_id
        if scope.level == "directorate":
            return division.directorate_id == scope.directorate_id
        return False

    if level == Correspondence.ArchiveLevel.DIRECTORATE:
        directorate = units[level]
        return bool(directorate and directorate.id == scope.directorate_id)

    return False


def _resolve_archive_level(user, correspondence: Correspondence, requested: str | None) -> str:
    """Validate the chosen filing level against level authority and org scope.

    Without an explicit level, the memo is filed at its own deepest org unit that
    the user is both authorised for and in scope for.
    """
    units = archive_org_units(correspondence)
    allowed_levels = _archive_levels_user_may_file(user)
    requested_level = (requested or "").strip().lower()

    if not requested_level and not any(units.values()):
        # Older records carry no department/division/directorate to file under.
        # Archive them unlevelled (the previous behaviour) rather than refusing.
        return ""

    if requested_level:
        if requested_level not in ARCHIVE_LEVEL_PERMISSION_BY_LEVEL:
            raise ValidationError(
                {"archive_level": "Unknown archive level. Choose department, division or directorate."}
            )
        if requested_level not in allowed_levels:
            raise PermissionDenied(
                {
                    "detail": (
                        f"You do not have authority to archive at {requested_level} level."
                    ),
                    "code": "archive_level_forbidden",
                    "archive_level": requested_level,
                    "allowed_levels": allowed_levels,
                }
            )
        if units[requested_level] is None:
            raise ValidationError(
                {
                    "archive_level": (
                        f"This correspondence is not filed under a {requested_level}; "
                        "choose a level it belongs to."
                    )
                }
            )
        if not _archive_scope_allows(user, requested_level, units):
            raise PermissionDenied(
                {
                    "detail": (
                        f"This correspondence is outside your organisation scope for "
                        f"{requested_level}-level filing."
                    ),
                    "code": "archive_scope_denied",
                    "archive_level": requested_level,
                    "allowed_levels": allowed_levels,
                }
            )
        return requested_level

    for level in ARCHIVE_LEVEL_ORDER:
        if units[level] is None or level not in allowed_levels:
            continue
        if _archive_scope_allows(user, level, units):
            return level

    raise PermissionDenied(
        {
            "detail": (
                "You cannot archive this correspondence at a level within your authority "
                "and organisation scope."
            ),
            "code": "archive_level_denied",
            "allowed_levels": allowed_levels,
        }
    )


class CorrespondenceViewSet(viewsets.ModelViewSet):
    queryset = Correspondence.objects.none()
    base_queryset = Correspondence.all_objects.select_related(
        "division",
        "department",
        "created_by",
        "current_approver",
        "acting_original_approver",
        "acting_appointment",
        "owning_office",
        "current_office",
        "completion_package",
        "workflow_template",
    ).annotate(
        _auto_created_document_id=Subquery(
            CorrespondenceDocumentLink.objects.filter(
                correspondence=OuterRef('pk'),
                notes__icontains="Auto-created from correspondence registration",
            ).values('document_id')[:1],
            output_field=CharField(),
        ),
    ).prefetch_related(
        "workflow_template__steps__office",
        "workflow_template__steps__directorate",
        "workflow_template__steps__division",
        "workflow_template__steps__department",
        "linked_documents",
        Prefetch(
            "attachments",
            queryset=CorrespondenceAttachment.objects.order_by("-created_at"),
        ),
        Prefetch(
            "distribution",
            queryset=CorrespondenceDistribution.objects.select_related(
                "directorate",
                "division",
                "department",
                "user",
                "added_by",
            ),
        ),
        Prefetch(
            "minutes",
            queryset=Minute.objects.select_related(
                "user", "to_office", "from_office", "to_user", "performed_by"
            ).order_by("-timestamp"),
        ),
        Prefetch(
            "completion_package__versions",
            queryset=DocumentVersion.objects.order_by("-version_number"),
        ),
        Prefetch(
            "physical_documents",
            queryset=PhysicalDocument.objects.select_related("location", "current_office").filter(is_deleted=False),
        ),
    )
    serializer_class = CorrespondenceSerializer
    list_serializer_actions = frozenset(
        {
            "list",
            "registered",
            "my_inbox",
            "my_sent",
            "office_inbox",
            "office_sent",
            "secretary_inbox",
            "archive_records",
        }
    )
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def get_serializer_class(self):
        if getattr(self, "action", None) in self.list_serializer_actions:
            return CorrespondenceListSerializer
        return super().get_serializer_class()
    filterset_fields = [
        "status",
        "priority",
        "source",
        "direction",
        "division",
        "department",
        "owning_office",
        "current_office",
        "parent_correspondence",
    ]
    search_fields = ["reference_number", "subject", "summary", "tags"]
    ordering_fields = ["created_at", "updated_at", "received_date"]
    ordering = ["-created_at"]

    def filter_queryset(self, queryset):
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        received_date_from = self.request.query_params.get("received_date_from")
        received_date_to = self.request.query_params.get("received_date_to")

        queryset = super().filter_queryset(queryset)

        if date_from:
            try:
                from_date = datetime.strptime(date_from, "%Y-%m-%d").date()
                queryset = queryset.filter(created_at__date__gte=from_date)
            except ValueError:
                pass

        if date_to:
            try:
                to_date = datetime.strptime(date_to, "%Y-%m-%d").date()
                queryset = queryset.filter(created_at__date__lte=to_date)
            except ValueError:
                pass

        if received_date_from:
            try:
                from_date = datetime.strptime(received_date_from, "%Y-%m-%d").date()
                queryset = queryset.filter(received_date__gte=from_date)
            except ValueError:
                pass

        if received_date_to:
            try:
                to_date = datetime.strptime(received_date_to, "%Y-%m-%d").date()
                queryset = queryset.filter(received_date__lte=to_date)
            except ValueError:
                pass

        search_query = self.request.query_params.get("search", "").strip()
        if search_query:
            minute_filter = Q(minutes__minute_text__icontains=search_query)
            attachment_filter = Q(attachments__file_name__icontains=search_query)
            queryset = queryset.filter(minute_filter | attachment_filter).distinct()

        return queryset

    def get_queryset(self):
        qs = self.base_queryset
        request = getattr(self, 'request', None)
        if request and request.query_params.get("registered_only") in {"1", "true", "yes"}:
            from organization.permission_utils import require_page_access

            require_page_access(request.user, "registered")
        if request:
            only_deleted = request.query_params.get('only_deleted') == 'true'
            include_deleted = request.query_params.get('include_deleted') == 'true'
            if only_deleted:
                return qs.filter(is_deleted=True)
            if include_deleted:
                return qs

        qs = qs.filter(is_deleted=False)

        if request and request.user.is_authenticated:
            user = request.user
            if not user.is_superuser:
                from organization.permission_utils import user_has_permission
                from organization.org_scope import (
                    correspondence_org_boundary_q,
                    correspondence_participation_q,
                    resolve_user_org_scope,
                )

                # Registered uses the same boundary as search and archives, so a
                # user cannot have one horizon in the list and another in search.
                # can_view_registry no longer bypasses scoping (only can_view_all does).
                if not user_has_permission(user, "can_view_all_correspondence"):
                    scope = resolve_user_org_scope(user)
                    boundary = correspondence_org_boundary_q(scope)
                    if boundary is None:
                        pass
                    elif scope.level == "participation":
                        qs = qs.filter(correspondence_participation_q(user, scope.office_ids))
                    else:
                        qs = qs.filter(
                            boundary | correspondence_participation_q(user, scope.office_ids)
                        )

        return qs.distinct()

    @action(detail=False, methods=["get"], url_path="registered")
    def registered(self, request):
        from organization.permission_utils import require_page_access

        require_page_access(request.user, "registered")
        return self.list(request)

    @action(detail=True, methods=["get"], url_path="routing-suggestions")
    def routing_suggestions(self, request, pk=None):
        """Hierarchy-based recipient suggestions for this correspondence."""
        from accounts.serializers import UserListSerializer

        from .routing_suggestions import VALID_DIRECTIONS, get_routing_suggestions

        # Use the view's scoped queryset without applying list filters: a
        # routing direction is not a filter on the correspondence itself.
        correspondence = get_object_or_404(self.get_queryset(), pk=pk)
        direction = (
            request.query_params.get("routing_direction")
            or request.query_params.get("direction")
            or correspondence.direction
        )
        if direction not in VALID_DIRECTIONS:
            direction = correspondence.direction
        users = get_routing_suggestions(request.user, correspondence, direction)
        return Response(
            {
                "direction": direction,
                "suggestions": UserListSerializer(users, many=True).data,
            }
        )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        user = request.user
        try:
            from organization.permission_utils import user_has_permission

            role_allows = user_has_permission(user, "can_register_correspondence")
            membership_allows = OfficeMembership.objects.filter(user=user, is_active=True, can_register=True).exists()
            if not (getattr(user, "is_superuser", False) or role_allows or membership_allows):
                raise PermissionDenied(
                    {
                        "detail": "Registration restricted. Your role does not permit registering correspondence.",
                        "code": "registration_restricted",
                    }
                )
        except PermissionDenied:
            raise
        except Exception:
            raise PermissionDenied(
                {
                    "detail": "Registration restricted due to permission evaluation error.",
                    "code": "registration_restricted",
                }
            )

        attachments = request.FILES.getlist('attachments', [])

        if attachments:
            for file in attachments:
                if hasattr(file, 'seek'):
                    file.seek(0)
                file_bytes = file.read()
                if hasattr(file, 'seek'):
                    file.seek(0)

                try:
                    validate_file_upload(
                        file_name=file.name,
                        mime_type=file.content_type,
                        file_bytes=file_bytes,
                        field_name='attachments'
                    )
                except ValidationError as e:
                    raise ValidationError({'attachments': str(e)})

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        creator = validated_data.get("created_by") or request.user
        priority = validated_data.get("priority") or Correspondence.Priority.MEDIUM
        owning_office = validated_data.get("owning_office") or self._get_user_primary_office(request.user)
        current_office = validated_data.get("current_office") or owning_office
        supplied_reference = (validated_data.get("reference_number") or "").strip()
        requested_classification = (validated_data.get("reference_classification_code") or "").strip().upper()
        direction = (validated_data.get("direction") or "").strip().lower()
        incoming_reference = (validated_data.get("sender_reference") or "").strip()
        uses_document_reference = direction == Correspondence.Direction.UPWARD and bool(incoming_reference)
        if uses_document_reference:
            reference_max_length = Correspondence._meta.get_field("reference_number").max_length
            if len(incoming_reference) > reference_max_length:
                raise ValidationError({
                    "sender_reference": (
                        f"The incoming document reference must be {reference_max_length} characters or fewer."
                    )
                })
            # An incoming document's own reference is the incoming reference.
            # Do not consume a local office serial when one is supplied.
            supplied_reference = incoming_reference

        reference_scheme = None
        reference_classification = None
        reference_allocation = None
        should_generate_reference = not uses_document_reference and (
            not supplied_reference
            or _is_client_generated_reference(supplied_reference)
            or bool(requested_classification)
        )
        if should_generate_reference:
            from organization.reference_services import (
                allocate_reference,
                default_classification,
                get_classification,
                resolve_reference_scheme,
            )

            reference_scheme = resolve_reference_scheme(
                office=owning_office,
                division=validated_data.get("division"),
                department=validated_data.get("department"),
            )
            if reference_scheme is None:
                raise ValidationError({
                    "reference_number": "No reference scheme is configured for this office. Add one in Template Hub → Reference before registering this correspondence."
                })
            reference_classification = (
                get_classification(reference_scheme, requested_classification)
                if requested_classification
                else default_classification(reference_scheme)
            )
            if reference_classification is None:
                raise ValidationError({
                    "reference_classification_code": "This office's reference scheme has no active classification. Add one in Template Hub → Reference."
                })
            # The scheme owns the canonical number. Allocate it even when the
            # browser submitted its preview, so the serial is consumed and every
            # issued reference is recorded in the ledger.
            supplied_reference, reference_allocation = allocate_reference(
                reference_scheme,
                reference_classification,
                user=request.user,
            )

        reference_number = supplied_reference
        if reference_allocation is None:
            existing = Correspondence.all_objects.filter(reference_number=reference_number).first()
            if existing and not existing.is_deleted:
                if uses_document_reference:
                    raise ValidationError({
                        "sender_reference": (
                            f'This reference already belongs to correspondence '
                            f'"{existing.reference_number}" ({existing.subject}). Open and forward '
                            "the existing record instead of registering it again."
                        ),
                        "existing_correspondence_id": str(existing.id),
                    })
                raise ValidationError({
                    'reference_number': f'A correspondence with reference number "{reference_number}" already exists. Please use a different reference number, or edit the existing correspondence to add your file.'
                })

        max_save_retries = 5
        correspondence = None
        for save_attempt in range(max_save_retries):
            try:
                if save_attempt > 0:
                    serializer = self.get_serializer(data=request.data)
                    serializer.is_valid(raise_exception=True)

                correspondence = serializer.save(
                    created_by=creator,
                    priority=priority,
                    reference_number=reference_number,
                    reference_classification=reference_classification,
                    owning_office=owning_office,
                    current_office=current_office,
                )
                break
            except IntegrityError as e:
                error_str = str(e).lower()
                is_ref_error = (
                    'reference_number' in error_str or
                    'reference_number_key' in error_str or
                    'unique constraint' in error_str and 'reference_number' in error_str
                )
                if is_ref_error:
                    if reference_scheme is None or reference_classification is None:
                        raise ValidationError({
                            'reference_number': f'A correspondence with reference number "{reference_number}" already exists. Please use a different reference number, or edit the existing correspondence to add your file.'
                        })
                    if save_attempt >= max_save_retries - 1:
                        raise ValidationError({
                            'reference_number': "Unable to allocate a unique reference for this office. Please try again.",
                            'code': "reference_retry_exhausted",
                        })
                    from organization.models import ReferenceAllocation
                    from organization.reference_services import allocate_reference

                    # The failed save did not consume the number; release the
                    # unattached ledger row before requesting the next serial.
                    if reference_allocation is not None:
                        ReferenceAllocation.objects.filter(
                            pk=reference_allocation.pk,
                            correspondence__isnull=True,
                        ).delete()
                    reference_number, reference_allocation = allocate_reference(
                        reference_scheme,
                        reference_classification,
                        user=request.user,
                    )
                    continue
                raise

        if not correspondence:
            raise ValidationError({"detail": "Failed to create correspondence after multiple retry attempts", "code": "creation_retry_exhausted"})
        if reference_allocation is not None:
            reference_allocation.correspondence = correspondence
            reference_allocation.save(update_fields=["correspondence", "updated_at"])
        self._sync_completed_timestamp(correspondence, None)

        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_CREATED,
            correspondence=correspondence,
            request=request,
            description=f"Created correspondence: {correspondence.reference_number} - {correspondence.subject}",
        )

        if attachments:
            media_root = settings.MEDIA_ROOT
            attachments_dir = os.path.join(media_root, 'correspondence_attachments', str(correspondence.id))
            os.makedirs(attachments_dir, exist_ok=True)

            for file in attachments:
                file_path = os.path.join('correspondence_attachments', str(correspondence.id), file.name)

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

                saved_path = default_storage.save(file_path, file)

                media_url = settings.MEDIA_URL or '/media/'
                if not media_url.startswith('/'):
                    media_url = f'/{media_url}'
                file_url = f"{media_url.rstrip('/')}/{saved_path}"

                CorrespondenceAttachment.objects.create(
                    correspondence=correspondence,
                    file_name=file.name,
                    file_type=getattr(file, 'content_type', None) or 'application/octet-stream',
                    file_size=file_size,
                    file_url=file_url,
                )

        try:
            document_title = request.data.get('document_title')
            CorrespondenceDocumentService.create_document_from_correspondence(
                correspondence,
                document_title=document_title,
            )
        except Exception as e:
            logger.error(
                f"Failed to auto-create DMS document for correspondence {correspondence.id}: {e}",
                exc_info=True
            )

        try:
            case = CaseService.create_case_from_correspondence(correspondence, created_by=request.user)
            if case:
                logger.info(f"Auto-created case {case.case_number} from correspondence {correspondence.reference_number}")
        except Exception as e:
            logger.error(
                f"Failed to auto-create case for correspondence {correspondence.id}: {e}",
                exc_info=True
            )

        if validated_data.get("has_physical_copy"):
            from .physical_serializers import generate_tracking_number
            phys_tracking_number = generate_tracking_number()
            PhysicalDocument.objects.create(
                tracking_number=phys_tracking_number,
                correspondence=correspondence,
                location=validated_data.get("physical_location"),
                current_office=owning_office or current_office,
                description=correspondence.subject or f"Physical copy of {correspondence.reference_number}",
                status=PhysicalDocument.Status.FILED,
                notes="Auto-created from correspondence registration",
            )
            logger.info(
                f"Auto-created physical document {phys_tracking_number} for correspondence {correspondence.reference_number}"
            )

        output_serializer = self.get_serializer(correspondence)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        assert_correspondence_writable(instance)

        attachments = request.FILES.getlist('attachments', [])

        if attachments:
            for file in attachments:
                if hasattr(file, 'seek'):
                    file.seek(0)
                file_bytes = file.read()
                if hasattr(file, 'seek'):
                    file.seek(0)

                try:
                    validate_file_upload(
                        file_name=file.name,
                        mime_type=file.content_type,
                        file_bytes=file_bytes,
                        field_name='attachments'
                    )
                except ValidationError as e:
                    raise ValidationError({'attachments': str(e)})

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        previous_status = instance.status

        correspondence = serializer.save()

        self._sync_completed_timestamp(correspondence, previous_status)

        if attachments:
            media_root = settings.MEDIA_ROOT
            attachments_dir = os.path.join(media_root, 'correspondence_attachments', str(correspondence.id))
            os.makedirs(attachments_dir, exist_ok=True)

            for file in attachments:
                file_path = os.path.join('correspondence_attachments', str(correspondence.id), file.name)

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

                saved_path = default_storage.save(file_path, file)

                media_url = settings.MEDIA_URL or '/media/'
                if not media_url.startswith('/'):
                    media_url = f'/{media_url}'
                file_url = f"{media_url.rstrip('/')}/{saved_path}"

                CorrespondenceAttachment.objects.create(
                    correspondence=correspondence,
                    file_name=file.name,
                    file_type=getattr(file, 'content_type', None) or 'application/octet-stream',
                    file_size=file_size,
                    file_url=file_url,
                )

        if (
            correspondence.status == Correspondence.Status.COMPLETED
            and previous_status != Correspondence.Status.COMPLETED
        ):
            try:
                CompletionPackageService.generate_completion_package(correspondence, request.user)
            except Exception:
                logger.exception(
                    "Failed to generate completion package for correspondence %s",
                    correspondence.id,
                )


        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=f"Updated correspondence: {correspondence.reference_number} - {correspondence.subject}",
        )

        output_serializer = self.get_serializer(correspondence)
        return Response(output_serializer.data)

    def perform_update(self, serializer):
        instance = self.get_object()
        previous_status = instance.status
        assert_correspondence_writable(instance)
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

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        assert_correspondence_writable(instance)
        return super().destroy(request, *args, **kwargs)

    def _sync_completed_timestamp(self, correspondence, previous_status):
        if correspondence.status == Correspondence.Status.COMPLETED:
            if not correspondence.completed_at:
                correspondence.completed_at = timezone.now()
                correspondence.save(update_fields=["completed_at"])
        elif previous_status == Correspondence.Status.COMPLETED and correspondence.completed_at is not None:
            correspondence.completed_at = None
            correspondence.save(update_fields=["completed_at"])

    def _get_completion_delegate(self, correspondence, user):
        from organization.permission_utils import require_permission

        require_permission(user, "can_minute_correspondence")

        now = timezone.now()
        is_current_approver = correspondence.current_approver_id == user.id
        # An expired delegation is not authority, even while its stored status
        # still says active.
        delegation = CorrespondenceDelegation.objects.filter(
            correspondence=correspondence,
            principal_id=correspondence.current_approver_id,
            assistant=user,
        ).filter(
            CorrespondenceDelegation.live_q(now)
        ).first()
        is_acting_for_current_office = False
        if correspondence.acting_appointment_id:
            from organization.models import ActingAppointment

            is_acting_for_current_office = ActingAppointment.objects.filter(
                id=correspondence.acting_appointment_id,
                acting_user=user,
                office_id=correspondence.current_office_id,
                is_active=True,
                starts_at__lte=now,
            ).filter(
                Q(ends_at__isnull=True) | Q(ends_at__gte=now),
            ).exists()

        if delegation is not None and not delegation.allows("minute"):
            raise PermissionDenied(
                {
                    "detail": (
                        f"Your {delegation.assistant_type or 'assistant'} assignment for this "
                        "correspondence does not allow you to complete it."
                    ),
                    "reason": "delegation_permission_denied",
                    "permission": "minute",
                }
            )

        if not (is_current_approver or delegation or is_acting_for_current_office):
            expired = CorrespondenceDelegation.objects.filter(
                correspondence=correspondence,
                assistant=user,
                status=CorrespondenceDelegation.Status.ACTIVE,
                expires_at__isnull=False,
                expires_at__lte=now,
            ).first()
            if expired is not None:
                expired.expire_if_due()
                raise PermissionDenied(
                    {
                        "detail": (
                            "Your delegation for this correspondence expired on "
                            f"{timezone.localtime(expired.expires_at):%d %b %Y, %H:%M}. "
                            "Ask the executive to delegate it again."
                        ),
                        "reason": "delegation_expired",
                    }
                )
            raise PermissionDenied("Only the current assignee or their active delegate can complete this correspondence.")
        return delegation

    def _complete_correspondence_record(self, correspondence, request):
        correspondence.status = Correspondence.Status.COMPLETED
        correspondence.completed_at = timezone.now()
        correspondence.save(update_fields=["status", "completed_at", "updated_at"])

        CorrespondenceDelegation.objects.filter(
            correspondence=correspondence,
            principal_id=correspondence.current_approver_id,
            status=CorrespondenceDelegation.Status.ACTIVE,
        ).update(
            status=CorrespondenceDelegation.Status.COMPLETED,
            completed_at=correspondence.completed_at,
        )

        try:
            CompletionPackageService.generate_completion_package(correspondence, request.user)
        except Exception:
            logger.exception(
                "Failed to generate completion package for correspondence %s",
                correspondence.id,
            )

        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_COMPLETED,
            correspondence=correspondence,
            request=request,
            description=f"Completed correspondence: {correspondence.reference_number}",
        )
        return Response(self.get_serializer(correspondence).data)

    @action(detail=True, methods=["post"], url_path="complete")
    @transaction.atomic
    def complete_correspondence(self, request, pk=None):
        correspondence = self.get_object()
        self._get_completion_delegate(correspondence, request.user)

        if correspondence.status not in (Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS):
            raise ValidationError({"detail": "Only active correspondence can be completed."})

        active_minutes = correspondence.minutes.filter(is_recalled=False)
        if not active_minutes.exists():
            raise ValidationError({"detail": "Correspondence needs at least one active minute before it can be completed."})
        if active_minutes.filter(acknowledged_at__isnull=True).exists():
            raise ValidationError({"detail": "All active minutes must be acknowledged before completion."})

        return self._complete_correspondence_record(correspondence, request)

    @action(detail=True, methods=["post"], url_path="complete-no-response")
    @transaction.atomic
    def complete_without_response(self, request, pk=None):
        correspondence = self.get_object()
        delegation = self._get_completion_delegate(correspondence, request.user)
        minute_text = (request.data.get("minute_text") or "").strip()

        if not minute_text:
            raise ValidationError({"minute_text": "Enter a final note before closing without a response."})
        if correspondence.status not in (Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS):
            raise ValidationError({"detail": "Only active correspondence can be completed."})
        if not correspondence.minutes.filter(is_recalled=False).exists():
            raise ValidationError({"detail": "At least one active minute is required before a final disposition."})

        earlier_routed_minutes = correspondence.minutes.filter(
            is_recalled=False,
        ).filter(
            Q(to_office__isnull=False) | Q(to_user__isnull=False),
        )
        if earlier_routed_minutes.filter(acknowledged_at__isnull=True).exists():
            raise ValidationError({"detail": "All previously routed minutes must be acknowledged before closing without a response."})

        last_step = correspondence.minutes.filter(is_recalled=False).aggregate(
            last_step=Max("step_number"),
        )["last_step"] or 0
        final_minute = Minute.objects.create(
            correspondence=correspondence,
            user=delegation.principal if delegation else request.user,
            performed_by=request.user if delegation else None,
            acted_by_assistant=bool(delegation),
            assistant_type=delegation.assistant_type if delegation else "",
            grade_level=getattr(request.user, "grade_level", "") or "",
            action_type=Minute.ActionType.MINUTE,
            minute_text=f"[NO RESPONSE REQUIRED]\n\n{minute_text}",
            direction=correspondence.direction,
            step_number=last_step + 1,
            from_office=correspondence.current_office,
            requires_response=False,
        )

        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_MINUTED,
            correspondence=correspondence,
            request=request,
            description=f"Recorded final action with no response required: {correspondence.reference_number}",
            metadata={"minute_id": str(final_minute.id), "no_response_required": True},
        )

        return self._complete_correspondence_record(correspondence, request)

    @action(detail=True, methods=["post"], url_path="reassign")
    def reassign(self, request, pk=None):
        correspondence = self.get_object()
        assert_correspondence_writable(correspondence)
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

    @action(detail=True, methods=["post"], url_path="return-to-principal")
    def return_to_principal(self, request, pk=None):
        """Return a single acting-seat item to the original principal."""
        from organization.acting_services import return_item_to_principal

        correspondence = self.get_object()
        assert_correspondence_writable(correspondence)
        reason = (request.data.get("reason") or "").strip()
        result = return_item_to_principal(
            correspondence,
            returned_by=request.user,
            reason=reason,
        )
        correspondence.refresh_from_db()
        serializer = self.get_serializer(correspondence)
        data = serializer.data
        data["return_result"] = result
        return Response(data)

    def _user_can_manage_draft(self, user, correspondence) -> bool:
        if user.is_superuser:
            return True
        if correspondence.created_by_id == user.id:
            return True
        if correspondence.owning_office_id:
            return OfficeMembership.objects.filter(
                user=user,
                office_id=correspondence.owning_office_id,
                is_active=True,
            ).exists()
        return False

    @action(detail=True, methods=["post"], url_path="cancel-draft")
    def cancel_draft(self, request, pk=None):
        # Look up without visibility scoping so creators get 403 (not 404) when denied.
        correspondence = get_object_or_404(
            self.base_queryset.filter(is_deleted=False),
            pk=pk,
        )
        user = request.user

        if correspondence.status != Correspondence.Status.PENDING:
            raise ValidationError({"detail": "Only pending drafts can be cancelled."})

        if not self._user_can_manage_draft(user, correspondence):
            raise PermissionDenied(
                {"detail": "Only the creator or office members can cancel this draft."}
            )

        withdraw_reason = (request.data.get("reason") or "").strip()
        correspondence.status = Correspondence.Status.WITHDRAWN
        correspondence.withdrawn_at = timezone.now()
        correspondence.withdrawn_by = user
        correspondence.withdraw_reason = withdraw_reason
        correspondence.save(
            update_fields=["status", "withdrawn_at", "withdrawn_by", "withdraw_reason", "updated_at"]
        )

        AuditService.log_correspondence_activity(
            user=user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=f"Cancelled draft: {correspondence.reference_number} - {correspondence.subject}",
            metadata={"withdraw_reason": withdraw_reason, "action": "cancel_draft"},
        )

        if correspondence.current_approver and correspondence.current_approver != user:
            NotificationService.create_notification(
                recipient=correspondence.current_approver,
                title=f"Draft Cancelled - {correspondence.reference_number}",
                message=(
                    f"{user.get_full_name() or user.username} cancelled the draft: "
                    f"{correspondence.subject}. Reason: {withdraw_reason or 'No reason provided'}"
                ),
                notification_type=Notification.NotificationType.CORRESPONDENCE,
                priority=Notification.Priority.NORMAL,
                sender=user,
                module="correspondence",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
                action_url=f"/correspondence/{correspondence.id}",
            )

        serializer = self.get_serializer(correspondence)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="resend-draft")
    def resend_draft(self, request, pk=None):
        correspondence = get_object_or_404(
            self.base_queryset.filter(is_deleted=False),
            pk=pk,
        )
        user = request.user

        if correspondence.status != Correspondence.Status.WITHDRAWN:
            raise ValidationError({"detail": "Only cancelled drafts can be resent."})

        if not self._user_can_manage_draft(user, correspondence):
            raise PermissionDenied(
                {"detail": "Only the creator or office members can resend this draft."}
            )

        correspondence.status = Correspondence.Status.PENDING
        correspondence.withdrawn_at = None
        correspondence.withdrawn_by = None
        correspondence.withdraw_reason = ""
        correspondence.save(
            update_fields=[
                "status",
                "withdrawn_at",
                "withdrawn_by",
                "withdraw_reason",
                "updated_at",
            ]
        )

        AuditService.log_correspondence_activity(
            user=user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=f"Resent draft: {correspondence.reference_number} - {correspondence.subject}",
            metadata={"action": "resend_draft"},
        )

        if correspondence.current_approver:
            ref = correspondence.reference_number or str(correspondence.id)
            NotificationService.create_notification(
                recipient=correspondence.current_approver,
                title=f"Draft Resubmitted - {ref}",
                message=(
                    f"{user.get_full_name() or user.username} resubmitted the draft: "
                    f"{correspondence.subject} ({ref})."
                ),
                notification_type=Notification.NotificationType.CORRESPONDENCE,
                priority=Notification.Priority.NORMAL,
                sender=user,
                module="correspondence",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
                action_url=f"/correspondence/{correspondence.id}",
                action_required=True,
            )

        serializer = self.get_serializer(correspondence)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="withdraw")
    def withdraw(self, request, pk=None):
        correspondence = self.get_object()

        previous_status = correspondence.status

        if previous_status not in [Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS]:
            raise ValidationError({
                "detail": "Only pending or in-progress correspondence can be withdrawn."
            })

        user = request.user
        can_withdraw = False

        if correspondence.created_by == user:
            can_withdraw = True
        elif correspondence.owning_office:
            is_office_member = OfficeMembership.objects.filter(
                user=user,
                office=correspondence.owning_office,
                is_active=True
            ).exists()
            if is_office_member:
                can_withdraw = True

        if not can_withdraw and not user.is_superuser:
            raise PermissionDenied({
                "detail": "You don't have permission to withdraw this correspondence. Only the creator or office members can withdraw."
            })

        withdraw_reason = request.data.get("reason", "")

        correspondence.status = Correspondence.Status.WITHDRAWN
        correspondence.withdrawn_at = timezone.now()
        correspondence.withdrawn_by = user
        if withdraw_reason:
            correspondence.withdraw_reason = withdraw_reason
        correspondence.save(update_fields=["status", "withdrawn_at", "withdrawn_by", "withdraw_reason", "updated_at"])

        AuditService.log_correspondence_activity(
            user=user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=f"Withdrew correspondence: {correspondence.reference_number} - {correspondence.subject}",
            metadata={
                "withdraw_reason": withdraw_reason,
                "previous_status": previous_status,
            },
        )

        if correspondence.current_approver and correspondence.current_approver != user:
            NotificationService.create_notification(
                recipient=correspondence.current_approver,
                title=f"Correspondence Withdrawn - {correspondence.reference_number}",
                message=f"{user.get_full_name() or user.username} has withdrawn the correspondence: {correspondence.subject}. Reason: {withdraw_reason or 'No reason provided'}",
                notification_type=Notification.NotificationType.CORRESPONDENCE,
                priority=Notification.Priority.NORMAL,
                sender=user,
                module="correspondence",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
                action_url=f"/correspondence/{correspondence.id}",
            )

        serializer = self.get_serializer(correspondence)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="resend-reminder")
    def resend_reminder(self, request, pk=None):
        correspondence = self.get_object()
        user = request.user

        if correspondence.status not in (
            Correspondence.Status.PENDING,
            Correspondence.Status.IN_PROGRESS,
        ):
            raise ValidationError(
                {"detail": "Reminders can only be sent for pending or in-progress correspondence."}
            )

        if not correspondence.current_approver:
            raise ValidationError({"detail": "No current approver assigned for this correspondence."})

        can_remind = (
            correspondence.created_by_id == user.id
            or user.is_superuser
        )
        if not can_remind and correspondence.owning_office_id:
            can_remind = OfficeMembership.objects.filter(
                user=user,
                office_id=correspondence.owning_office_id,
                is_active=True,
            ).exists()

        if not can_remind:
            raise PermissionDenied(
                {"detail": "Only the creator or office members can send reminders."}
            )

        custom_message = (request.data.get("custom_message") or "").strip()
        approver = correspondence.current_approver
        ref = correspondence.reference_number or str(correspondence.id)
        base_message = (
            f"Reminder: {correspondence.subject} ({ref}) is awaiting your action."
        )
        message = f"{base_message}\n\n{custom_message}" if custom_message else base_message

        NotificationService.create_notification(
            recipient=approver,
            title=f"Reminder — {ref}",
            message=message,
            notification_type=Notification.NotificationType.CORRESPONDENCE,
            priority=Notification.Priority.HIGH
            if correspondence.priority == Correspondence.Priority.URGENT
            else Notification.Priority.NORMAL,
            sender=user,
            module="correspondence",
            related_object_type="correspondence",
            related_object_id=str(correspondence.id),
            action_url=f"/correspondence/{correspondence.id}",
            action_required=True,
        )

        if approver.email:
            try:
                from django.core.mail import send_mail

                send_mail(
                    subject=f"NPA ECM Reminder — {ref}",
                    message=message,
                    from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@npa.gov.ng"),
                    recipient_list=[approver.email],
                    fail_silently=True,
                )
            except Exception:
                pass

        AuditService.log_correspondence_activity(
            user=user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=f"Sent reminder for correspondence: {ref}",
            metadata={
                "approver_id": str(approver.id),
                "custom_message": custom_message or None,
            },
        )

        return Response(
            {
                "detail": "Reminder sent successfully.",
                "approver_id": str(approver.id),
                "approver_name": approver.get_full_name() or approver.username,
            }
        )

    @action(detail=True, methods=["post"], url_path="remind-branch", url_name="remind_branch")
    def remind_branch(self, request, pk=None):
        correspondence = self.get_object()
        assert_correspondence_writable(correspondence)
        user = request.user

        group_id = request.data.get("parallel_group_id")
        minute_id = request.data.get("minute_id")
        office_id = request.data.get("office_id")
        user_id = request.data.get("user_id")

        can_remind = correspondence.created_by_id == user.id or user.is_superuser
        if not can_remind and correspondence.owning_office_id:
            can_remind = OfficeMembership.objects.filter(
                user=user, office_id=correspondence.owning_office_id, is_active=True
            ).exists()
        if not can_remind and correspondence.current_office_id:
            can_remind = OfficeMembership.objects.filter(
                user=user, office_id=correspondence.current_office_id, is_active=True
            ).exists()
        if not can_remind:
            raise PermissionDenied({"detail": "Not authorized to remind this branch."})

        branch_minute = None
        if minute_id:
            branch_minute = Minute.objects.filter(
                correspondence=correspondence, id=minute_id, is_parallel_branch=True
            ).first()
        elif group_id and (office_id or user_id):
            q = Minute.objects.filter(
                correspondence=correspondence, parallel_group_id=group_id, is_parallel_branch=True
            )
            q = q.filter(to_office_id=office_id, to_user__isnull=True) if office_id else q.filter(to_user_id=user_id)
            branch_minute = q.order_by("timestamp").first()

        if not branch_minute:
            raise ValidationError({"detail": "Parallel branch not found."})

        if branch_minute.to_office_id:
            recipient_ids = list(
                OfficeMembership.objects.filter(
                    office_id=branch_minute.to_office_id, is_active=True
                ).values_list("user_id", flat=True)
            )
        elif branch_minute.to_user_id:
            recipient_ids = [branch_minute.to_user_id]
        else:
            recipient_ids = []

        if not recipient_ids:
            raise ValidationError({"detail": "Branch has no recipient to remind."})

        custom_message = (request.data.get("custom_message") or "").strip()
        ref = correspondence.reference_number or str(correspondence.id)
        base = f"Reminder: {correspondence.subject} ({ref}) is awaiting your response (parallel branch)."
        message = f"{base}\n\n{custom_message}" if custom_message else base

        notified = []
        from accounts.models import User as _User

        for rid in recipient_ids:
            recipient = _User.objects.filter(id=rid).first()
            if not recipient:
                continue
            NotificationService.create_notification(
                recipient=recipient,
                title=f"Branch reminder — {ref}",
                message=message,
                notification_type=Notification.NotificationType.CORRESPONDENCE,
                priority=Notification.Priority.HIGH
                if correspondence.priority == Correspondence.Priority.URGENT
                else Notification.Priority.NORMAL,
                sender=user,
                module="correspondence",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
                action_url=f"/correspondence/{correspondence.id}",
                action_required=True,
            )
            notified.append(str(rid))

        AuditService.log_correspondence_activity(
            user=user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=f"Sent branch reminder for parallel branch: {ref}",
            metadata={"minute_id": str(branch_minute.id), "notified": notified},
        )

        return Response({"detail": "Branch reminder sent.", "notified_user_ids": notified})

    @action(detail=True, methods=["post"], url_path="force-complete-branch", url_name="force_complete_branch")
    def force_complete_branch(self, request, pk=None):
        correspondence = self.get_object()
        assert_correspondence_writable(correspondence)
        user = request.user

        group_id = request.data.get("parallel_group_id")
        minute_id = request.data.get("minute_id")
        office_id = request.data.get("office_id")
        user_id = request.data.get("user_id")

        can_force = user.is_superuser or correspondence.created_by_id == user.id
        if not can_force and correspondence.owning_office_id:
            can_force = OfficeMembership.objects.filter(
                user=user, office_id=correspondence.owning_office_id, is_active=True
            ).exists()
        if not can_force and correspondence.current_office_id:
            can_force = OfficeMembership.objects.filter(
                user=user, office_id=correspondence.current_office_id, is_active=True
            ).exists()
        if not can_force:
            raise PermissionDenied({"detail": "Not authorized to force-complete this branch."})

        branch_minute = None
        if minute_id:
            branch_minute = Minute.objects.filter(
                correspondence=correspondence, id=minute_id, is_parallel_branch=True
            ).first()
        elif group_id and (office_id or user_id):
            q = Minute.objects.filter(
                correspondence=correspondence, parallel_group_id=group_id, is_parallel_branch=True
            )
            q = q.filter(to_office_id=office_id) if office_id else q.filter(to_user_id=user_id)
            branch_minute = q.order_by("timestamp").first()

        if not branch_minute:
            raise ValidationError({"detail": "Parallel branch not found."})
        if branch_minute.branch_completed_at:
            return Response(
                {"detail": "Branch already force-completed.", "minute_id": str(branch_minute.id)}
            )

        branch_minute.branch_completed_at = timezone.now()
        branch_minute.save(update_fields=["branch_completed_at"])

        g_id = branch_minute.parallel_group_id
        if g_id:
            try:
                parallel_group = ParallelRoutingGroup.objects.filter(id=g_id).first()
                if not parallel_group:
                    parallel_group = ParallelRoutingGroup.objects.create(
                        id=g_id,
                        correspondence=correspondence,
                        created_by=correspondence.created_by or user,
                        merge_strategy="all",
                    )
                parallel_group.check_and_update_completion()
                correspondence.refresh_from_db()

                if parallel_group.is_complete and correspondence.workflow_state == "merged":
                    route_back_to_origin(correspondence, parallel_group, user)
            except Exception as _exc:
                logger.error("Parallel completion handling failed: %s", _exc, exc_info=True)

        AuditService.log_correspondence_activity(
            user=user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=f"Force-completed parallel branch: {correspondence.reference_number}",
            metadata={"minute_id": str(branch_minute.id)},
        )

        return Response(
            {
                "detail": "Branch force-completed.",
                "minute_id": str(branch_minute.id),
                "workflow_state": correspondence.workflow_state,
            }
        )

    @action(detail=True, methods=["get"], url_path="parallel-branches", url_name="parallel_branches")
    def list_parallel_branches(self, request, pk=None):
        correspondence = self.get_object()
        serializer = CorrespondenceSerializer(correspondence, context={"view": self, "request": request})
        return Response(serializer.get_parallel_branches(correspondence) or [])

    @action(detail=True, methods=["post"], url_path="dispatch", url_name="dispatch")
    @transaction.atomic
    def create_dispatch(self, request, pk=None):
        correspondence = self.get_object()
        if not correspondence.is_outward():
            raise ValidationError({
                "detail": "Only outward correspondence can be dispatched. "
                "Inward items should be archived after completion; send replies as a new outward letter."
            })
        force_override = request.data.get("force_override", False)
        allowed_statuses = [Correspondence.Status.COMPLETED]
        if force_override:
            allowed_statuses.append(Correspondence.Status.DISPATCHED)
        if correspondence.status not in allowed_statuses:
            raise ValidationError({"detail": "Only completed outward correspondence can be dispatched."})

        serializer = DispatchRecordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(
            correspondence=correspondence,
            dispatched_by=request.user,
        )
        correspondence.status = Correspondence.Status.DISPATCHED
        correspondence.dispatch_date = serializer.validated_data.get("dispatched_date")
        correspondence.save(update_fields=["status", "dispatch_date", "updated_at"])

        CorrespondenceDocumentService.publish_documents_on_issue(
            correspondence,
            user=request.user,
            request=request,
            dispatch_record=serializer.instance,
        )

        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=f"Dispatched correspondence: {correspondence.reference_number}",
            metadata={"dispatch_mode": serializer.validated_data.get("dispatch_mode")},
        )
        output = self.get_serializer(correspondence)
        return Response(output.data)

    @action(detail=True, methods=["post"], url_path="acknowledge")
    def acknowledge(self, request, pk=None):
        correspondence = self.get_object()
        if not correspondence.is_outward():
            raise ValidationError({"detail": "Only outward correspondence can be acknowledged."})
        if correspondence.status != Correspondence.Status.DISPATCHED:
            raise ValidationError({"detail": "Correspondence must be dispatched before it can be acknowledged."})

        dispatch_record_id = request.data.get("dispatch_record_id")
        acknowledged_date = request.data.get("acknowledged_date", timezone.now().date())

        if dispatch_record_id:
            try:
                record = DispatchRecord.objects.get(id=dispatch_record_id, correspondence=correspondence)
                record.acknowledged_date = acknowledged_date
                record.acknowledged_by = request.user
                record.save(update_fields=["acknowledged_date", "acknowledged_by"])
            except DispatchRecord.DoesNotExist:
                raise ValidationError({"detail": "Dispatch record not found."})
        else:
            latest = correspondence.dispatch_records.order_by("-dispatched_date", "-created_at").first()
            if latest and not latest.acknowledged_date:
                latest.acknowledged_date = acknowledged_date
                latest.acknowledged_by = request.user
                latest.save(update_fields=["acknowledged_date", "acknowledged_by"])

        # Keep status as dispatched; acknowledgment lives on DispatchRecord + date field.
        # Retain ACKNOWLEDGED status for backward-compatible clients/filters.
        correspondence.status = Correspondence.Status.ACKNOWLEDGED
        correspondence.acknowledged_date = acknowledged_date
        correspondence.save(update_fields=["status", "acknowledged_date", "updated_at"])

        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=f"Acknowledged correspondence: {correspondence.reference_number}",
        )

        if correspondence.created_by and correspondence.created_by != request.user:
            NotificationService.create_notification(
                recipient=correspondence.created_by,
                title=f"Correspondence Acknowledged - {correspondence.reference_number}",
                message=f"{request.user.get_full_name() or request.user.username} acknowledged receipt of: {correspondence.subject}",
                notification_type=Notification.NotificationType.CORRESPONDENCE,
                priority=Notification.Priority.NORMAL,
                sender=request.user,
                module="correspondence",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
                action_url=f"/correspondence/{correspondence.id}",
            )

        output = self.get_serializer(correspondence)
        return Response(output.data)

    @action(detail=True, methods=["post"], url_path="archive")
    def archive_single(self, request, pk=None):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_archive")
        correspondence = self.get_object()

        if correspondence.status == Correspondence.Status.ARCHIVED:
            raise ValidationError({"detail": "Correspondence is already archived."})

        if correspondence.status not in ARCHIVABLE_STATUSES:
            raise ValidationError({"detail": "Only completed, dispatched, or acknowledged correspondence can be archived."})

        archive_level = _resolve_archive_level(
            request.user,
            correspondence,
            request.data.get("archive_level"),
        )

        correspondence.pre_archive_status = correspondence.status
        correspondence.status = Correspondence.Status.ARCHIVED
        correspondence.archived_at = timezone.now()
        correspondence.archive_level = archive_level
        correspondence.save(
            update_fields=[
                "status",
                "pre_archive_status",
                "archived_at",
                "archive_level",
                "updated_at",
            ]
        )
        _share_package_with_archive_level(correspondence, archive_level)

        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=(
                f"Archived correspondence at {archive_level} level: {correspondence.reference_number}"
                if archive_level
                else f"Archived correspondence: {correspondence.reference_number}"
            ),
            metadata={"archive_level": archive_level},
        )

        output = self.get_serializer(correspondence)
        return Response(output.data)

    @action(detail=True, methods=["post"], url_path="unarchive")
    @transaction.atomic
    def unarchive(self, request, pk=None):
        """Return an archived record to its prior lifecycle status with an audit reason."""
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_archive")
        correspondence = self.get_object()
        if correspondence.status != Correspondence.Status.ARCHIVED:
            raise ValidationError({"detail": "Only archived correspondence can be returned to records."})

        reason = (request.data.get("reason") or "").strip()
        if not reason:
            raise ValidationError({"reason": "Explain why this record is being returned to records."})
        if len(reason) > 2000:
            raise ValidationError({"reason": "Keep the reason under 2000 characters."})

        current_level = correspondence.archive_level
        units = archive_org_units(correspondence)
        if current_level and (
            current_level not in _archive_levels_user_may_file(request.user)
            or not _archive_scope_allows(request.user, current_level, units)
        ):
            raise PermissionDenied(
                {
                    "detail": "You cannot return this record from an archive outside your authority and organisation scope.",
                    "code": "archive_scope_denied",
                    "archive_level": current_level,
                }
            )

        previous_status = correspondence.pre_archive_status
        if previous_status not in ARCHIVABLE_STATUSES:
            # Legacy rows predate the stored lifecycle status. Use available
            # outward dispatch evidence, otherwise safely return to completed.
            if correspondence.is_outward() and correspondence.acknowledged_date:
                previous_status = Correspondence.Status.ACKNOWLEDGED
            elif correspondence.is_outward() and correspondence.dispatch_date:
                previous_status = Correspondence.Status.DISPATCHED
            else:
                previous_status = Correspondence.Status.COMPLETED

        correspondence.status = previous_status
        correspondence.pre_archive_status = None
        correspondence.archived_at = None
        correspondence.archive_level = ""
        correspondence.save(
            update_fields=[
                "status",
                "pre_archive_status",
                "archived_at",
                "archive_level",
                "updated_at",
            ]
        )
        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=f"Returned correspondence to records: {correspondence.reference_number} - {reason}",
            metadata={
                "unarchived": True,
                "previous_archive_level": current_level,
                "previous_status": Correspondence.Status.ARCHIVED,
                "restored_status": previous_status,
                "reason": reason,
            },
        )
        return Response(self.get_serializer(correspondence).data)

    @action(detail=True, methods=["post"], url_path="refile")
    @transaction.atomic
    def refile_archive(self, request, pk=None):
        """Move an archived record to another filing level, with a written reason."""
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_archive")
        correspondence = self.get_object()

        if correspondence.status != Correspondence.Status.ARCHIVED:
            raise ValidationError({"detail": "Only archived correspondence can be re-filed."})

        reason = (request.data.get("reason") or "").strip()
        if not reason:
            raise ValidationError({"reason": "Explain why this record is being re-filed."})
        if len(reason) > 2000:
            raise ValidationError({"reason": "Keep the reason under 2000 characters."})

        current_level = correspondence.archive_level
        requested_level = (request.data.get("archive_level") or "").strip().lower()
        if not requested_level:
            raise ValidationError({"archive_level": "Choose the level to file this record under."})
        if requested_level == current_level:
            raise ValidationError(
                {"archive_level": f"This record is already filed at {current_level} level."}
            )

        new_level = _resolve_archive_level(request.user, correspondence, requested_level)

        correspondence.archive_level = new_level
        correspondence.save(update_fields=["archive_level", "updated_at"])
        _share_package_with_archive_level(correspondence, new_level)

        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=(
                f"Re-filed correspondence from {current_level or 'unfiled'} to {new_level} level: "
                f"{correspondence.reference_number} - {reason}"
            ),
            metadata={
                "refiled": True,
                "previous_archive_level": current_level,
                "archive_level": new_level,
                "reason": reason,
            },
        )

        return Response(self.get_serializer(correspondence).data)

    @action(detail=False, methods=["post"], url_path="bulk-archive")
    def bulk_archive(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_archive")
        correspondence_ids = request.data.get("correspondence_ids", [])

        if not correspondence_ids:
            raise ValidationError({"correspondence_ids": "Correspondence IDs are required"})

        correspondences = Correspondence.objects.filter(id__in=correspondence_ids, is_deleted=False)

        accessible_items = []
        for corr in correspondences:
            if corr.created_by == request.user or request.user.is_superuser:
                accessible_items.append(corr)
            elif corr.current_approver == request.user:
                accessible_items.append(corr)
            elif corr.owning_office_id or corr.current_office_id:
                office_ids = self._get_user_office_ids(request.user)
                if (corr.owning_office_id in office_ids) or (corr.current_office_id in office_ids):
                    accessible_items.append(corr)

        if not accessible_items:
            raise PermissionDenied({"detail": "You don't have permission to archive any of the selected items", "code": "archive_permission_denied"})

        requested_level = request.data.get("archive_level")
        archived_count = 0
        skipped: list[dict[str, str]] = []

        for corr in accessible_items:
            if corr.status == Correspondence.Status.ARCHIVED:
                skipped.append(
                    {
                        "id": str(corr.id),
                        "reference_number": corr.reference_number,
                        "reason": "Already archived.",
                    }
                )
                continue
            if corr.status not in ARCHIVABLE_STATUSES:
                skipped.append(
                    {
                        "id": str(corr.id),
                        "reference_number": corr.reference_number,
                        "reason": "Only completed, dispatched, or acknowledged correspondence can be archived.",
                    }
                )
                continue

            try:
                archive_level = _resolve_archive_level(request.user, corr, requested_level)
            except (ValidationError, PermissionDenied) as exc:
                detail = exc.detail
                if isinstance(detail, dict):
                    reason = str(detail.get("detail") or detail.get("archive_level") or detail)
                elif isinstance(detail, list):
                    reason = str(detail[0]) if detail else "Not permitted."
                else:
                    reason = str(detail)
                skipped.append(
                    {
                        "id": str(corr.id),
                        "reference_number": corr.reference_number,
                        "reason": reason,
                    }
                )
                continue

            corr.pre_archive_status = corr.status
            corr.status = Correspondence.Status.ARCHIVED
            corr.archived_at = timezone.now()
            corr.archive_level = archive_level
            corr.save(
                update_fields=[
                    "status",
                    "pre_archive_status",
                    "archived_at",
                    "archive_level",
                    "updated_at",
                ]
            )
            _share_package_with_archive_level(corr, archive_level)
            archived_count += 1

            AuditService.log_correspondence_activity(
                user=request.user,
                action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
                correspondence=corr,
                request=request,
                description=(
                    f"Archived correspondence at {archive_level} level: "
                    f"{corr.reference_number} - {corr.subject}"
                    if archive_level
                    else f"Archived correspondence: {corr.reference_number} - {corr.subject}"
                ),
                metadata={
                    "bulk_operation": True,
                    "new_status": "archived",
                    "archive_level": archive_level,
                },
            )

        if archived_count == 0:
            raise PermissionDenied(
                {
                    "detail": (
                        "None of the selected items can be archived within your "
                        "authority and organisation scope."
                    ),
                    "code": "archive_level_denied",
                    "rejected": skipped,
                }
            )

        return Response({
            "message": f"Successfully archived {archived_count} correspondence item(s)",
            "archived_count": archived_count,
            "skipped_count": len(correspondence_ids) - archived_count,
            "skipped": skipped,
        })

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        correspondence_ids = request.data.get("correspondence_ids", [])

        if not correspondence_ids:
            raise ValidationError({"correspondence_ids": "Correspondence IDs are required"})

        correspondences = Correspondence.objects.filter(id__in=correspondence_ids, is_deleted=False)

        accessible_items = []
        for corr in correspondences:
            if corr.created_by == request.user or request.user.is_superuser:
                accessible_items.append(corr)

        if not accessible_items:
            raise PermissionDenied({"detail": "You don't have permission to delete any of the selected items", "code": "delete_permission_denied"})

        for correspondence in accessible_items:
            assert_correspondence_writable(correspondence)

        deleted_count = 0

        for corr in accessible_items:
            corr.is_deleted = True
            corr.save(update_fields=["is_deleted", "updated_at"])
            deleted_count += 1

            AuditService.log_correspondence_activity(
                user=request.user,
                action=ActivityLog.ActionType.CORRESPONDENCE_DELETED,
                correspondence=corr,
                request=request,
                description=f"Deleted correspondence: {corr.reference_number} - {corr.subject}",
                metadata={"bulk_operation": True, "soft_delete": True},
            )

        return Response({
            "message": f"Successfully deleted {deleted_count} correspondence item(s)",
            "deleted_count": deleted_count,
            "skipped_count": len(correspondence_ids) - deleted_count,
        })

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

    @action(
        detail=True, methods=["post"], url_path="treat-and-respond",
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def treat_and_respond(self, request, pk=None):
        from django.db import transaction as db_transaction

        original = self.get_object()

        assert_correspondence_writable(original)
        if original.is_deleted:
            raise ValidationError({"detail": "Deleted correspondence cannot be treated."})

        def _get_json_field(name: str) -> dict:
            raw = request.data.get(name)
            if isinstance(raw, str):
                import json as _json
                try:
                    return _json.loads(raw)
                except (_json.JSONDecodeError, TypeError):
                    return {}
            return raw if isinstance(raw, dict) else {}

        minute_data = _get_json_field("minute")
        response_data = _get_json_field("response")
        document_link_data = request.data.get("document_link")

        if not minute_data:
            raise ValidationError({"minute": "Minute data is required."})
        if not response_data:
            raise ValidationError({"response": "Response correspondence data is required."})

        attachments = request.FILES.getlist("attachments", [])
        if attachments:
            for f in attachments:
                validate_file_upload(
                    file_name=f.name, mime_type=f.content_type,
                    file_bytes=f.read(), field_name="attachments",
                )
                f.seek(0)

        with db_transaction.atomic():
            minute_data["correspondence"] = original.id
            minute_serializer = MinuteSerializer(
                data=minute_data,
                context={"request": request},
            )
            minute_serializer.is_valid(raise_exception=True)
            minute_serializer.save()

            original.direction = response_data.get(
                "direction", original.direction
            )
            current_approver = response_data.get("current_approver_id")
            if current_approver:
                original.current_approver_id = current_approver
            current_office = response_data.get("current_office_id")
            if current_office:
                original.current_office_id = current_office
            original.save(update_fields=["direction", "current_approver", "current_office"])

            response_data["source"] = "internal"
            response_data["status"] = "pending"
            response_data["parent_correspondence_id"] = str(original.id)
            response_serializer = CorrespondenceSerializer(
                data=response_data,
                context={"request": request},
            )
            response_serializer.is_valid(raise_exception=True)
            response_correspondence = response_serializer.save(created_by=request.user)

            for f in attachments:
                CorrespondenceAttachment.objects.create(
                    correspondence=response_correspondence,
                    file=f,
                    added_by=request.user,
                )

            if document_link_data:
                doc_id = document_link_data if isinstance(document_link_data, str) else document_link_data.get("document_id")
                if doc_id:
                    linked_document = Document.objects.filter(id=doc_id).first()
                    if linked_document is not None:
                        from .reference_utils import memo_reference_conflict

                        version = linked_document.versions.order_by(
                            "-version_number"
                        ).first()
                        conflict = memo_reference_conflict(
                            version.content_html if version else "",
                            response_correspondence.reference_number,
                        )
                        if conflict:
                            raise ValidationError({"document": conflict})
                    CorrespondenceDocumentLink.objects.create(
                        correspondence=response_correspondence,
                        document_id=doc_id,
                        notes=document_link_data.get("notes", "") if isinstance(document_link_data, dict) else "",
                    )

        return Response(
            {
                "id": str(response_correspondence.id),
                "reference_number": response_correspondence.reference_number,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="reference-preview")
    def reference_preview(self, request):
        owning_office_id = request.query_params.get("owning_office")
        division_id = request.query_params.get("division")
        department_id = request.query_params.get("department")
        owning_office = None
        if owning_office_id:
            owning_office = Office.objects.filter(id=owning_office_id).first()
        if not owning_office:
            owning_office = self._get_user_primary_office(request.user)
        division = None
        department = None
        if division_id:
            from organization.models import Division

            division = Division.objects.filter(id=division_id).first()
        if department_id:
            from organization.models import Department

            department = Department.objects.filter(id=department_id).first()
        from organization.reference_services import (
            default_classification,
            get_classification,
            preview_next_reference,
            resolve_reference_scheme,
            scheme_context,
        )

        scheme = resolve_reference_scheme(
            office=owning_office, division=division, department=department
        )
        if scheme is not None:
            classification = (
                get_classification(scheme, request.query_params.get("classification"))
                or default_classification(scheme)
            )
            if classification is not None:
                return Response(
                    {
                        "reference_number": preview_next_reference(scheme, classification),
                        "reference_path": None,
                        "scheme": scheme_context(scheme),
                        "classification": classification.code,
                    }
                )
            return Response(
                {
                    "reference_number": "",
                    "reference_path": None,
                    "scheme": scheme_context(scheme),
                    "warning": (
                        "This office's reference scheme has no active classification. "
                        "Add one in Template Hub → Reference."
                    ),
                }
            )

        return Response(
            {
                "reference_number": "",
                "reference_path": None,
                "scheme": None,
                "warning": (
                    "No reference scheme is configured for this office. "
                    "Add one in Template Hub → Reference before registering."
                ),
            }
        )

    @action(detail=False, methods=["get"], url_path="sidebar-counts")
    def sidebar_counts(self, request):
        from django.core.cache import cache
        from django.core.cache.backends.base import InvalidCacheBackendError
        from correspondence.models import (
            Minute,
            CorrespondenceDistribution,
        )
        from dms.models import FormDocument
        from forms.signature_models import FormSignature
        user = request.user

        cache_key = get_sidebar_counts_cache_key(user.id)
        cached_result = None
        refresh_cache = request.query_params.get("refresh") in {"1", "true"}
        try:
            if refresh_cache:
                cache.delete(cache_key)
            else:
                cached_result = cache.get(cache_key)
        except (ConnectionError, InvalidCacheBackendError, Exception) as e:
            logger.warning(f"Cache unavailable for sidebar_counts: {str(e)}")

        if cached_result is not None:
            return Response(cached_result)

        office_memberships = list(
            OfficeMembership.objects.filter(user=user, is_active=True)
            .order_by()
            .values_list(
                "office_id",
                "assignment_role",
                "office__division_id",
                "office__department_id",
                "office__directorate_id",
            )
        )
        office_ids = {
            office_id
            for office_id, assignment_role, *_ in office_memberships
            if assignment_role in OFFICE_QUEUE_ROLES
        }
        my_user_office_id_list = {membership[0] for membership in office_memberships}
        my_user_division_ids = {
            membership[2] for membership in office_memberships if membership[2]
        }
        my_user_department_ids = {
            membership[3] for membership in office_memberships if membership[3]
        }
        my_user_directorate_ids = {
            membership[4] for membership in office_memberships if membership[4]
        }

        base_filter = Q(is_deleted=False) & ~Q(status__in=OFFICE_TRAY_EXCLUDED_STATUSES)

        if user.is_superuser and not office_ids:
            office_inbox_count = Correspondence.objects.filter(base_filter).count()
        elif not office_ids:
            office_inbox_count = 0
        else:
            # Office Inbox = items at queue-role offices only (not personal parallel/CC)
            office_filter = Q(current_office_id__in=office_ids) | Q(owning_office_id__in=office_ids)
            inbox_exclude_sent = (
                Q(
                    owning_office_id__in=office_ids,
                    status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS],
                    current_office__isnull=False,
                )
                & ~Q(current_office_id__in=office_ids)
            )
            office_inbox_count = Correspondence.objects.filter(
                base_filter & office_filter
            ).exclude(inbox_exclude_sent).count()

        my_parallel_subquery = Minute.objects.filter(
            to_user=user,
            is_parallel_branch=True,
            correspondence__workflow_state__in=['parallel', 'waiting_merge'],
            correspondence__status__in=['pending', 'in-progress'],
            correspondence_id=OuterRef('id'),
            is_recalled=False
        )

        if hasattr(user, 'division_id') and user.division_id:
            my_user_division_ids.add(user.division_id)
        if hasattr(user, 'department_id') and user.department_id:
            my_user_department_ids.add(user.department_id)
        if hasattr(user, 'directorate_id') and user.directorate_id:
            my_user_directorate_ids.add(user.directorate_id)

        my_distribution_filter = Q()
        if my_user_division_ids:
            my_distribution_filter |= Q(division_id__in=my_user_division_ids)
        if my_user_department_ids:
            my_distribution_filter |= Q(department_id__in=my_user_department_ids)
        if my_user_directorate_ids:
            my_distribution_filter |= Q(directorate_id__in=my_user_directorate_ids)
        if my_user_office_id_list:
            my_distribution_filter |= Q(office_id__in=my_user_office_id_list)
        my_distribution_filter |= Q(user=user, recipient_type='user')

        my_distribution_subquery = CorrespondenceDistribution.objects.filter(
            my_distribution_filter,
            correspondence_id=OuterRef('id'),
            is_active=True
        )

        my_inbox_count = Correspondence.objects.filter(
            Q(is_deleted=False) &
            (Q(current_approver=user) | Exists(my_parallel_subquery) | Exists(my_distribution_subquery))
        ).exclude(status=Correspondence.Status.COMPLETED).count()

        delegated_count = CorrespondenceDelegation.objects.filter(
            assistant=user,
        ).filter(
            CorrespondenceDelegation.live_q()
        ).count()

        pending_signatures_count = FormDocument.objects.filter(
            document__is_deleted=False,
            signature_workflow__signatures__assigned_to_user=user,
            signature_workflow__signatures__status=FormSignature.Status.PENDING,
        ).distinct().count()

        pending_approval_minutes_count = Minute.objects.filter(
            to_user=user,
            purpose="approval",
            is_recalled=False,
            correspondence__is_deleted=False,
        ).exclude(
            correspondence__status=Correspondence.Status.COMPLETED
        ).count()

        result = {
            "officeInbox": office_inbox_count,
            "myInbox": my_inbox_count,
            "delegated": delegated_count,
            "pendingApprovals": pending_approval_minutes_count,
            "pendingSignatures": pending_signatures_count,
        }

        try:
            cache.set(cache_key, result, 60)
        except (ConnectionError, InvalidCacheBackendError, Exception) as e:
            logger.warning(f"Failed to cache sidebar_counts: {str(e)}")

        return Response(result)

    @action(detail=False, methods=["get"], url_path="office-inbox")
    def office_inbox(self, request):
        user = request.user
        requested_offices = request.query_params.getlist("office")
        requested_ids = [office_id for office_id in requested_offices if office_id and office_id.lower() != "all"]

        queue_office_ids = get_office_queue_office_ids(user)
        can_view_all = bool(getattr(user, "is_superuser", False))

        if requested_ids:
            if can_view_all:
                office_ids = requested_ids
            else:
                allowed = {str(oid) for oid in queue_office_ids}
                office_ids = [oid for oid in requested_ids if str(oid) in allowed]
                if not office_ids:
                    return Response(
                        {"detail": "You don't have access to the requested office(s)."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
        else:
            office_ids = queue_office_ids

        include_all_offices = (
            can_view_all
            and (
                request.query_params.get("include_all_offices", "").lower() in {"true", "1", "yes"}
                or not office_ids
            )
        )

        if include_all_offices:
            queryset = self.base_queryset.filter(is_deleted=False).exclude(
                status__in=OFFICE_TRAY_EXCLUDED_STATUSES
            )
        elif not office_ids:
            queryset = self.base_queryset.none()
        else:
            # Seat tray only — personal parallel/CC stays in My Inbox
            base_q = Q(current_office_id__in=office_ids) | Q(owning_office_id__in=office_ids)
            queryset = self.base_queryset.filter(is_deleted=False).filter(base_q).exclude(
                status__in=OFFICE_TRAY_EXCLUDED_STATUSES
            )
            queryset = queryset.exclude(
                Q(
                    owning_office_id__in=office_ids,
                    status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS],
                    current_office__isnull=False,
                )
                & ~Q(current_office_id__in=office_ids)
            )

        statuses = request.query_params.getlist("status")
        if statuses:
            queryset = queryset.filter(status__in=statuses)

        priorities = request.query_params.getlist("priority")
        if priorities:
            queryset = queryset.filter(priority__in=priorities)

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        if date_from:
            queryset = queryset.filter(received_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(received_date__lte=date_to)

        assigned_only = request.query_params.get("assigned_only", "").lower() in {"true", "1", "yes"}
        if assigned_only:
            parallel_correspondence_ids = Minute.objects.filter(
                to_user=user,
                is_parallel_branch=True,
                correspondence__workflow_state='parallel',
                is_recalled=False
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

        sort_by = request.query_params.get("sort_by", "priority")
        sort_order = request.query_params.get("sort_order", "desc")
        order_prefix = "-" if sort_order == "desc" else ""

        if sort_by == "priority":
            queryset = queryset.annotate(
                priority_order=DBCase(
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

        read_subquery = ReadReceipt.objects.filter(
            user=user, correspondence=OuterRef('pk')
        )
        queryset = queryset.annotate(is_read=Exists(read_subquery))

        total_count = queryset.count()
        urgent_count = queryset.filter(priority=Correspondence.Priority.URGENT).count()

        overdue_count = queryset.filter(_sla_overdue_filter()).count()
        assigned_count = queryset.filter(current_approver=user).count()

        paginator = StandardPageNumberPagination()
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

    @action(detail=False, methods=["get"], url_path="secretary-inbox")
    def secretary_inbox(self, request):
        user = request.user

        role_name = getattr(getattr(user, "system_role", None), "name", "") or ""
        is_secretary = role_name.lower() == "secretary"

        if not is_secretary:
            return Response(
                {"detail": "This endpoint is only available for secretaries."},
                status=status.HTTP_403_FORBIDDEN
            )

        secretary_correspondence_ids = Minute.objects.filter(
            acted_by_secretary=True,
            performed_by=user
        ).values_list('correspondence_id', flat=True).distinct()

        queryset = self.base_queryset.filter(
            is_deleted=False,
            id__in=secretary_correspondence_ids
        )

        statuses = request.query_params.getlist("status")
        if statuses:
            queryset = queryset.filter(status__in=statuses)

        priorities = request.query_params.getlist("priority")
        if priorities:
            queryset = queryset.filter(priority__in=priorities)

        search_term = request.query_params.get("search")
        if search_term:
            queryset = queryset.filter(
                Q(reference_number__icontains=search_term)
                | Q(subject__icontains=search_term)
                | Q(sender_name__icontains=search_term)
                | Q(sender_organization__icontains=search_term)
            )

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        if date_from:
            queryset = queryset.filter(received_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(received_date__lte=date_to)

        sort_by = request.query_params.get("sort_by", "priority")
        sort_order = request.query_params.get("sort_order", "desc")
        order_prefix = "-" if sort_order == "desc" else ""

        if sort_by == "priority":
            queryset = queryset.annotate(
                priority_order=DBCase(
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

        overdue_count = queryset.filter(_sla_overdue_filter()).count()

        paginator = StandardPageNumberPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)

        summary = {
            "total": total_count,
            "urgent": urgent_count,
            "overdue": overdue_count,
            "assigned_to_user": 0,
        }
        response.data["summary"] = summary
        return response

    @action(detail=False, methods=["get"], url_path="my-inbox")
    def my_inbox(self, request):
        from organization.permission_utils import require_page_access

        require_page_access(request.user, "my_inbox")
        user = request.user

        parallel_correspondence_ids = Minute.objects.filter(
            to_user=user,
            is_parallel_branch=True,
            correspondence__workflow_state__in=['parallel', 'waiting_merge'],
            correspondence__status__in=['pending', 'in-progress'],
            is_recalled=False
        ).values_list('correspondence_id', flat=True).distinct()

        user_offices = OfficeMembership.objects.filter(
            user=user, is_active=True
        ).select_related('office').values_list('office', flat=True)

        user_office_objs = Office.objects.filter(id__in=user_offices)
        user_division_ids = set(user_office_objs.values_list('division_id', flat=True))
        user_department_ids = set(user_office_objs.values_list('department_id', flat=True))
        user_directorate_ids = set(user_office_objs.values_list('directorate_id', flat=True))

        if hasattr(user, 'division_id') and user.division_id:
            user_division_ids.add(user.division_id)
        if hasattr(user, 'department_id') and user.department_id:
            user_department_ids.add(user.department_id)
        if hasattr(user, 'directorate_id') and user.directorate_id:
            user_directorate_ids.add(user.directorate_id)

        user_division_ids.discard(None)
        user_department_ids.discard(None)
        user_directorate_ids.discard(None)

        distribution_filter = Q()
        if user_division_ids:
            distribution_filter |= Q(division_id__in=user_division_ids)
        if user_department_ids:
            distribution_filter |= Q(department_id__in=user_department_ids)
        if user_directorate_ids:
            distribution_filter |= Q(directorate_id__in=user_directorate_ids)
        user_office_id_list = list(user_offices)
        if user_office_id_list:
            distribution_filter |= Q(office_id__in=user_office_id_list)
        distribution_filter |= Q(user=user, recipient_type='user')

        distribution_correspondence_ids = []
        if distribution_filter:
            distribution_correspondence_ids = CorrespondenceDistribution.objects.filter(
                distribution_filter,
                is_active=True
            ).values_list('correspondence_id', flat=True).distinct()

        queryset = self.base_queryset.filter(is_deleted=False).filter(
            Q(current_approver=user) |
            Q(id__in=parallel_correspondence_ids) |
            Q(id__in=distribution_correspondence_ids)
        ).exclude(status=Correspondence.Status.COMPLETED).exclude(
            # Office-seat items under acting are handled only in Office Inbox,
            # not in personal My Inbox — keeps My=person, Office=seat.
            acting_appointment__isnull=False
        )

        statuses = request.query_params.getlist("status")
        if statuses:
            queryset = queryset.filter(status__in=statuses)

        priorities = request.query_params.getlist("priority")
        if priorities:
            queryset = queryset.filter(priority__in=priorities)

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

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        if date_from:
            queryset = queryset.filter(received_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(received_date__lte=date_to)

        sort_by = request.query_params.get("sort_by", "priority")
        sort_order = request.query_params.get("sort_order", "desc")
        order_prefix = "-" if sort_order == "desc" else ""

        if sort_by == "priority":
            queryset = queryset.annotate(
                priority_order=DBCase(
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

        overdue_count = queryset.filter(_sla_overdue_filter()).count()
        due_soon_count = queryset.filter(_sla_due_soon_filter()).count()

        paginator = StandardPageNumberPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)

        summary = {
            "total": total_count,
            "urgent": urgent_count,
            "overdue": overdue_count,
            "due_soon": due_soon_count,
            "pending": queryset.filter(status=Correspondence.Status.PENDING).count(),
            "in_progress": queryset.filter(status=Correspondence.Status.IN_PROGRESS).count(),
        }
        response.data["summary"] = summary
        return response

    @action(detail=False, methods=["get"], url_path="my-sent")
    def my_sent(self, request):
        """Correspondence the current user has routed or formally dispatched."""
        from organization.permission_utils import require_page_access

        require_page_access(request.user, "my_sent")
        user = request.user
        sent_type = request.query_params.get("sent_type", "all").lower()

        routed_ids = Minute.objects.filter(
            user=user,
            is_recalled=False,
            action_type__in=["minute", "forward", "approve", "treat"],
            dispatched_at__isnull=False,
        ).values_list("correspondence_id", flat=True).distinct()

        external_dispatch_ids = DispatchRecord.objects.filter(
            dispatched_by=user
        ).values_list("correspondence_id", flat=True).distinct()

        acted_ids = Minute.objects.filter(
            user=user,
            is_recalled=False,
            action_type__in=["minute", "forward", "approve", "treat"],
        ).values_list("correspondence_id", flat=True).distinct()

        ownership = Q(created_by=user) | Q(id__in=acted_ids) | Q(id__in=external_dispatch_ids)

        sent_statuses = [
            Correspondence.Status.COMPLETED,
            Correspondence.Status.DISPATCHED,
            Correspondence.Status.ACKNOWLEDGED,
            Correspondence.Status.ARCHIVED,
        ]
        pending_routed = Q(created_by=user, status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS], current_office__isnull=False) & ~Q(current_office=F('owning_office'))
        sent_filter = Q(id__in=routed_ids) | Q(status__in=sent_statuses) | pending_routed

        queryset = self.base_queryset.filter(is_deleted=False).filter(ownership & sent_filter)

        if sent_type == "internal":
            queryset = queryset.filter(id__in=routed_ids).exclude(
                status__in=[
                    Correspondence.Status.DISPATCHED,
                    Correspondence.Status.ACKNOWLEDGED,
                    Correspondence.Status.PENDING,
                    Correspondence.Status.IN_PROGRESS,
                ]
            )
        elif sent_type == "external":
            queryset = queryset.filter(
                Q(status__in=[Correspondence.Status.DISPATCHED, Correspondence.Status.ACKNOWLEDGED])
                | Q(id__in=external_dispatch_ids)
            )

        queryset = self._apply_correspondence_queue_filters(
            queryset, request, default_sort_by="dispatch_date"
        )

        total_count = queryset.count()
        internal_count = (
            self.base_queryset.filter(is_deleted=False)
            .filter(ownership)
            .filter(id__in=routed_ids)
            .exclude(
                status__in=[
                    Correspondence.Status.DISPATCHED,
                    Correspondence.Status.ACKNOWLEDGED,
                    Correspondence.Status.PENDING,
                    Correspondence.Status.IN_PROGRESS,
                ]
            )
            .count()
        )
        external_count = (
            self.base_queryset.filter(is_deleted=False)
            .filter(ownership)
            .filter(
                Q(status__in=[Correspondence.Status.DISPATCHED, Correspondence.Status.ACKNOWLEDGED])
                | Q(id__in=external_dispatch_ids)
            )
            .count()
        )

        summary = {
            "total": total_count,
            "internal": internal_count,
            "external": external_count,
            "urgent": queryset.filter(priority=Correspondence.Priority.URGENT).count(),
            "pending": queryset.filter(status=Correspondence.Status.PENDING).count(),
            "in_progress": queryset.filter(status=Correspondence.Status.IN_PROGRESS).count(),
        }
        return self._paginate_correspondence_queue(request, queryset, summary)

    def _apply_correspondence_queue_filters(self, queryset, request, *, default_sort_by="updated"):
        statuses = request.query_params.getlist("status")
        if statuses:
            queryset = queryset.filter(status__in=statuses)

        priorities = request.query_params.getlist("priority")
        if priorities:
            queryset = queryset.filter(priority__in=priorities)

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

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        date_field = request.query_params.get("date_field", "created_at")
        allowed_date_fields = {"created_at", "updated_at", "dispatch_date", "received_date"}
        if date_field not in allowed_date_fields:
            date_field = "created_at"
        if date_from:
            queryset = queryset.filter(**{f"{date_field}__gte": date_from})
        if date_to:
            queryset = queryset.filter(**{f"{date_field}__lte": date_to})

        sort_by = request.query_params.get("sort_by", default_sort_by)
        sort_order = request.query_params.get("sort_order", "desc")
        order_prefix = "-" if sort_order == "desc" else ""

        if sort_by == "priority":
            queryset = queryset.annotate(
                priority_order=DBCase(
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
        elif sort_by == "dispatch_date":
            queryset = queryset.order_by(f"{order_prefix}dispatch_date", "-updated_at")
        elif sort_by == "subject":
            queryset = queryset.order_by(f"{'' if sort_order == 'asc' else '-'}subject")
        elif sort_by == "reference":
            queryset = queryset.order_by(f"{order_prefix}reference_number")
        else:
            queryset = queryset.order_by("-updated_at")

        return queryset

    def _paginate_correspondence_queue(self, request, queryset, summary):
        paginator = StandardPageNumberPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data["summary"] = summary
        return response

    @action(detail=False, methods=["get"], url_path="office-sent")
    def office_sent(self, request):
        user = request.user
        requested_offices = request.query_params.getlist("office")
        requested_ids = [office_id for office_id in requested_offices if office_id and office_id.lower() != "all"]

        queue_office_ids = get_office_queue_office_ids(user)

        if requested_ids:
            if user.is_superuser:
                scope_office_ids = requested_ids
            else:
                allowed = {str(oid) for oid in queue_office_ids}
                scope_office_ids = [oid for oid in requested_ids if str(oid) in allowed]
                if not scope_office_ids:
                    return Response(
                        {"detail": "You don't have access to the requested office(s)."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
        elif queue_office_ids:
            scope_office_ids = queue_office_ids
        elif user.is_superuser:
            scope_office_ids = []
        else:
            return Response(
                {
                    "count": 0,
                    "next": None,
                    "previous": None,
                    "results": [],
                    "summary": {"total": 0, "dispatched": 0, "acknowledged": 0, "internal": 0, "external": 0},
                }
            )

        dispatch_type = request.query_params.get("dispatch_type", "all").lower()
        include_archived = request.query_params.get("include_archived", "").lower() in {"true", "1", "yes"}

        statuses = [Correspondence.Status.DISPATCHED, Correspondence.Status.ACKNOWLEDGED]
        if include_archived:
            statuses.append(Correspondence.Status.ARCHIVED)

        dispatched_q = Q(status__in=statuses)
        if scope_office_ids:
            office_user_ids = OfficeMembership.objects.filter(
                office_id__in=scope_office_ids,
                is_active=True,
            ).values_list("user_id", flat=True)
            dispatched_q &= (
                Q(owning_office_id__in=scope_office_ids)
                | Q(dispatch_records__dispatched_by_id__in=office_user_ids)
            )
        else:
            dispatched_q &= Q(dispatch_records__isnull=False)

        minute_filter = Q(from_office_id__in=scope_office_ids) if scope_office_ids else Q()
        minute_ids = Minute.objects.filter(
            minute_filter,
            action_type__in=['minute', 'forward', 'approve', 'treat'],
        ).values_list('correspondence_id', flat=True).distinct()

        # Pending/in-progress that has already left the owning office (e.g. upward pending at MD) counts as sent for the owning office.
        if scope_office_ids:
            office_pending_routed = Q(owning_office_id__in=scope_office_ids, status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS], current_office__isnull=False) & ~Q(current_office_id__in=scope_office_ids)
        else:
            office_pending_routed = Q(status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS], current_office__isnull=False) & ~Q(current_office=F('owning_office'))

        queryset = self.base_queryset.filter(
            is_deleted=False,
        ).filter(
            dispatched_q |
            Q(id__in=minute_ids) |
            office_pending_routed
        ).distinct()

        if dispatch_type == "internal":
            queryset = queryset.filter(
                dispatch_records__dispatch_mode=DispatchRecord.DispatchMode.INTERNAL
            ).distinct()
        elif dispatch_type == "external":
            queryset = queryset.exclude(
                dispatch_records__dispatch_mode=DispatchRecord.DispatchMode.INTERNAL
            ).distinct()

        queryset = self._apply_correspondence_queue_filters(
            queryset, request, default_sort_by="dispatch_date"
        )

        total_count = queryset.count()
        dispatched_count = queryset.filter(status=Correspondence.Status.DISPATCHED).count()
        acknowledged_count = queryset.filter(status=Correspondence.Status.ACKNOWLEDGED).count()
        internal_count = queryset.filter(
            dispatch_records__dispatch_mode=DispatchRecord.DispatchMode.INTERNAL
        ).distinct().count()
        external_count = queryset.exclude(
            dispatch_records__dispatch_mode=DispatchRecord.DispatchMode.INTERNAL
        ).distinct().count()

        summary = {
            "total": total_count,
            "dispatched": dispatched_count,
            "acknowledged": acknowledged_count,
            "internal": internal_count,
            "external": external_count,
        }
        return self._paginate_correspondence_queue(request, queryset, summary)

    @action(detail=False, methods=["get"], url_path="archive-records", filter_backends=[])
    def archive_records(self, request):
        from organization.permission_utils import require_page_access

        require_page_access(request.user, "records")
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

        visible_levels = readable_archive_levels(user)
        archive_level = request.query_params.get("archive_level")
        if archive_level and archive_level.lower() != "all":
            if archive_level not in visible_levels:
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
        if division_id and division_id.lower() != "all":
            try:
                UUID(division_id)
                base_queryset = base_queryset.filter(division_id=division_id)
            except (TypeError, ValueError):
                logger.warning("Ignoring invalid division filter in archive_records: %s", division_id)

        department_id = request.query_params.get("department")
        if department_id and department_id.lower() != "all":
            try:
                UUID(department_id)
                base_queryset = base_queryset.filter(department_id=department_id)
            except (TypeError, ValueError):
                logger.warning("Ignoring invalid department filter in archive_records: %s", department_id)

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

        sort_by = request.query_params.get("sort_by", "received")
        sort_order = request.query_params.get("sort_order", "desc")
        order_prefix = "-" if sort_order == "desc" else ""

        if sort_by == "priority":
            queryset = queryset.annotate(
                priority_order=DBCase(
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

        paginator = StandardPageNumberPagination()
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

    @action(detail=True, methods=["get"], url_path="archive-record")
    def archive_record(self, request, pk=None):
        """Return one completed/archived record using archive visibility, not the active inbox scope."""
        correspondence = get_object_or_404(self._get_archived_queryset(request.user), pk=pk)
        return Response(self.get_serializer(correspondence).data)

    @action(detail=False, methods=["get"], url_path="records-archive")
    def records_archive(self, request):
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

        queryset = self._get_archived_queryset(user)

        directorate_ids = request.query_params.getlist("directorate")
        if directorate_ids and "all" not in [d.lower() for d in directorate_ids]:
            queryset = queryset.filter(
                Q(division__directorate_id__in=directorate_ids) |
                Q(department__division__directorate_id__in=directorate_ids)
            )

        division_ids = request.query_params.getlist("division")
        if division_ids and "all" not in [d.lower() for d in division_ids]:
            queryset = queryset.filter(
                Q(division_id__in=division_ids) |
                Q(department__division_id__in=division_ids)
            )

        department_ids = request.query_params.getlist("department")
        if department_ids and "all" not in [d.lower() for d in department_ids]:
            queryset = queryset.filter(department_id__in=department_ids)

        search_term = request.query_params.get("search")
        if search_term:
            queryset = queryset.filter(
                Q(reference_number__icontains=search_term)
                | Q(subject__icontains=search_term)
                | Q(sender_name__icontains=search_term)
                | Q(sender_organization__icontains=search_term)
            )

        priorities = request.query_params.getlist("priority")
        if priorities:
            queryset = queryset.filter(priority__in=priorities)

        statuses = request.query_params.getlist("status")
        if statuses:
            queryset = queryset.filter(status__in=statuses)

        directions = request.query_params.getlist("direction")
        if directions:
            queryset = queryset.filter(direction__in=directions)

        year = request.query_params.get("year")
        if year and year.lower() != "all":
            try:
                queryset = queryset.filter(received_date__year=int(year))
            except ValueError:
                pass

        from_date = self._parse_date_param(request.query_params.get("from_date"))
        if from_date:
            queryset = queryset.filter(received_date__gte=from_date)

        to_date = self._parse_date_param(request.query_params.get("to_date"))
        if to_date:
            queryset = queryset.filter(received_date__lte=to_date)

        summary_queryset = queryset
        available_years = (
            summary_queryset.filter(received_date__isnull=False)
            .values_list("received_date__year", flat=True)
            .distinct()
        )

        total_count = summary_queryset.count()
        current_year = timezone.now().year
        this_year_count = summary_queryset.filter(received_date__year=current_year).count()

        sort_by = request.query_params.get("sort_by", "completed")
        sort_order = request.query_params.get("sort_order", "desc")
        order_prefix = "-" if sort_order == "desc" else ""

        if sort_by == "priority":
            queryset = queryset.annotate(
                priority_order=DBCase(
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

        paginator = StandardPageNumberPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        completed_count = summary_queryset.filter(status=Correspondence.Status.COMPLETED).count()
        archived_count = summary_queryset.filter(status=Correspondence.Status.ARCHIVED).count()
        response.data["summary"] = {
            "total": total_count,
            "by_directorate": 0,
            "by_division": 0,
            "by_department": 0,
            "this_year": this_year_count,
            "completed": completed_count,
            "archived": archived_count,
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
        return _archive_levels_user_may_file(user)

    def _get_archived_queryset(self, user):
        # Completed, not-yet-filed records retain the established org/participant
        # boundary. Archived rows use filing-level visibility only.
        return filter_archived_records(self.base_queryset, user)

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
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["correspondence"]
    ordering_fields = ["created_at"]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        if not file:
            raise ValidationError({'file': 'No file provided'})

        correspondence_id = request.data.get('correspondence')
        if not correspondence_id:
            raise ValidationError({'correspondence': 'Correspondence ID is required'})

        try:
            correspondence = Correspondence.objects.get(id=correspondence_id)
        except Correspondence.DoesNotExist:
            raise ValidationError({'correspondence': 'Correspondence not found'})

        assert_correspondence_writable(correspondence)

        if hasattr(file, 'seek'):
            file.seek(0)
        file_bytes = file.read()
        validate_file_upload(
            file_name=file.name,
            mime_type=getattr(file, 'content_type', None),
            file_bytes=file_bytes,
        )
        file_size = len(file_bytes)
        if hasattr(file, 'seek'):
            file.seek(0)

        file_path = os.path.join('correspondence_attachments', str(correspondence.id), file.name)

        saved_path = default_storage.save(file_path, file)

        media_url = settings.MEDIA_URL or '/media/'
        if not media_url.startswith('/'):
            media_url = f'/{media_url}'
        file_url = f"{media_url.rstrip('/')}/{saved_path}"

        attachment = CorrespondenceAttachment.objects.create(
            correspondence=correspondence,
            file_name=file.name,
            file_type=getattr(file, 'content_type', None) or 'application/octet-stream',
            file_size=file_size,
            file_url=file_url,
        )

        serializer = self.get_serializer(attachment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        assert_correspondence_writable(serializer.instance.correspondence)
        serializer.save()

    def perform_destroy(self, instance):
        assert_correspondence_writable(instance.correspondence)
        instance.delete()

    def _load_attachment_bytes(self, attachment: CorrespondenceAttachment) -> tuple[bytes, str, str]:
        file_name = attachment.file_name or "attachment"
        content_type = attachment.file_type or "application/octet-stream"
        if not attachment.file_url:
            raise ValidationError({"detail": "No file stored for this attachment."})
        file_path = resolve_media_path(attachment.file_url)
        if file_path.startswith(("http://", "https://")):
            import requests

            remote = requests.get(file_path, timeout=30)
            remote.raise_for_status()
            return remote.content, file_name, remote.headers.get("Content-Type") or content_type
        if not os.path.isfile(file_path):
            raise ValidationError({"detail": "Stored attachment file is missing on the server."})
        with open(file_path, "rb") as handle:
            return handle.read(), file_name, content_type

    def _attachment_response(self, attachment, *, as_attachment: bool):
        payload, file_name, content_type = self._load_attachment_bytes(attachment)
        disposition = "attachment" if as_attachment else "inline"
        response = HttpResponse(payload, content_type=content_type)
        response["Content-Disposition"] = f'{disposition}; filename="{file_name}"'
        response["Content-Length"] = str(len(payload))
        return response

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        attachment = self.get_object()
        return self._attachment_response(attachment, as_attachment=True)

    @action(detail=True, methods=["get"], url_path="content")
    def content(self, request, pk=None):
        attachment = self.get_object()
        return self._attachment_response(attachment, as_attachment=False)

    @action(detail=True, methods=["get"], url_path="print")
    def print_attachment(self, request, pk=None):
        """Inline stream for printing (same bytes as content; canonical print entrypoint)."""
        attachment = self.get_object()
        return self._attachment_response(attachment, as_attachment=False)


class CorrespondenceDistributionViewSet(viewsets.ModelViewSet):
    queryset = CorrespondenceDistribution.objects.select_related(
        "correspondence",
        "directorate",
        "division",
        "department",
        "user",
        "added_by",
    )
    serializer_class = CorrespondenceDistributionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["correspondence", "recipient_type", "purpose"]

    def perform_create(self, serializer):
        from organization.permission_utils import require_permission

        require_permission(self.request.user, "can_distribute")
        correspondence = serializer.validated_data.get("correspondence")
        if correspondence is not None:
            assert_correspondence_writable(correspondence)
        serializer.save(added_by=self.request.user)

    def perform_update(self, serializer):
        assert_correspondence_writable(serializer.instance.correspondence)
        serializer.save()

    def perform_destroy(self, instance):
        assert_correspondence_writable(instance.correspondence)
        instance.delete()

    @action(detail=False, methods=["post"])
    def share_with_department(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_distribute")
        from organization.models import OfficeMembership, Department

        correspondence_id = request.data.get('correspondence_id')
        department_id = request.data.get('department_id')
        parent_distribution_id = request.data.get('parent_distribution_id')

        if not correspondence_id or not department_id:
            return Response(
                {"detail": "correspondence_id and department_id are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            correspondence = Correspondence.objects.get(id=correspondence_id)
            department = Department.objects.get(id=department_id)
        except (Correspondence.DoesNotExist, Department.DoesNotExist) as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_404_NOT_FOUND
            )

        assert_correspondence_writable(correspondence)
        user = request.user
        is_office_holder = OfficeMembership.objects.filter(
            user=user,
            office__department=department,
            assignment_role='principal',
            is_active=True,
            is_primary=True
        ).exists()

        if not is_office_holder and not user.is_superuser:
            return Response(
                {"detail": "Only office holders (principals) can share with department"},
                status=status.HTTP_403_FORBIDDEN
            )

        department_members = OfficeMembership.objects.filter(
            office__department=department,
            is_active=True
        ).select_related('user').values_list('user', flat=True).distinct()

        if not department_members:
            return Response(
                {"detail": "No active members found in this department"},
                status=status.HTTP_404_NOT_FOUND
            )

        parent_distribution = None
        if parent_distribution_id:
            try:
                parent_distribution = CorrespondenceDistribution.objects.get(id=parent_distribution_id)
            except CorrespondenceDistribution.DoesNotExist:
                pass

        created_count = 0
        errors = []
        for member_id in department_members:
            existing = CorrespondenceDistribution.objects.filter(
                correspondence=correspondence,
                user_id=member_id,
                recipient_type='user',
                purpose='information'
            ).exists()

            if not existing:
                try:
                    CorrespondenceDistribution.objects.create(
                        correspondence=correspondence,
                        recipient_type='user',
                        user_id=member_id,
                        purpose='information',
                        added_by=user,
                        minute=parent_distribution.minute if parent_distribution else None,
                    )
                    created_count += 1
                except Exception as e:
                    errors.append(str(e))
                    logger.error(f"Failed to create distribution for user {member_id}: {e}")

        if created_count > 0:
            return Response({
                "detail": f"Shared with {created_count} department member(s)",
                "created_count": created_count,
                "total_members": len(department_members),
                "errors": errors if errors else None
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                "detail": "No new distribution entries created (all members may already have access)",
                "created_count": 0,
                "total_members": len(department_members),
                "errors": errors if errors else None
            }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        distribution = self.get_object()

        if distribution.recipient_type == 'user' and distribution.user != request.user:
            return Response(
                {"detail": "You can only mark your own distribution entries as read."},
                status=status.HTTP_403_FORBIDDEN
            )

        if distribution.recipient_type != 'user':
            from organization.models import OfficeMembership
            user_offices = OfficeMembership.objects.filter(
                user=request.user, is_active=True
            ).values_list('office_id', flat=True)

            if distribution.recipient_type == 'office' and distribution.office_id not in user_offices:
                return Response(
                    {"detail": "You are not a member of this office."},
                    status=status.HTTP_403_FORBIDDEN
                )

        distribution.read_at = timezone.now()
        distribution.read_by = request.user
        distribution.save(update_fields=['read_at', 'read_by'])

        return Response({
            "detail": "Marked as read",
            "read_at": distribution.read_at,
            "read_by": distribution.read_by.id if distribution.read_by else None
        })


class CorrespondenceDocumentLinkViewSet(viewsets.ModelViewSet):
    queryset = CorrespondenceDocumentLink.objects.select_related("correspondence", "document")
    serializer_class = CorrespondenceDocumentLinkSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["correspondence", "document"]

    def perform_create(self, serializer):
        correspondence = serializer.validated_data.get("correspondence")
        if correspondence is not None:
            assert_correspondence_writable(correspondence)
        serializer.save()

    def perform_update(self, serializer):
        assert_correspondence_writable(serializer.instance.correspondence)
        serializer.save()

    def perform_destroy(self, instance):
        assert_correspondence_writable(instance.correspondence)
        instance.delete()


class DelegationViewSet(viewsets.ModelViewSet):
    """Assistant assignments (principal → TA/PA).

    An assignment is a two-person arrangement: only the principal and the
    assistant may see it, and only the principal may change it. Listing every
    pair in the organisation leaked the executive-assistant map to anyone with
    a login. People administrators keep the organisation-wide view the
    Assistants tab needs.
    """

    queryset = Delegation.objects.select_related("principal", "assistant")
    serializer_class = DelegationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["principal", "assistant", "active"]

    def _manages_all_assignments(self, user) -> bool:
        from organization.permission_utils import user_has_permission

        return bool(
            getattr(user, "is_superuser", False)
            or user_has_permission(user, "can_manage_users")
        )

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if self._manages_all_assignments(user):
            return qs
        return qs.filter(Q(principal=user) | Q(assistant=user))

    def _assert_principal_controls(self, principal) -> None:
        user = self.request.user
        if self._manages_all_assignments(user):
            return
        if principal is None or principal.id != user.id:
            raise PermissionDenied(
                {
                    "detail": "Only the executive who owns an assistant assignment can change it.",
                    "reason": "not_principal",
                }
            )

    def perform_create(self, serializer):
        self._assert_principal_controls(serializer.validated_data.get("principal"))
        serializer.save()

    def perform_update(self, serializer):
        self._assert_principal_controls(serializer.instance.principal)
        serializer.save()

    def perform_destroy(self, instance):
        self._assert_principal_controls(instance.principal)
        instance.delete()


class CorrespondenceDelegationViewSet(viewsets.ModelViewSet):
    queryset = CorrespondenceDelegation.objects.select_related(
        "correspondence", "principal", "assistant", "delegation"
    )
    serializer_class = CorrespondenceDelegationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["correspondence", "principal", "assistant", "status"]
    search_fields = ["correspondence__subject", "correspondence__reference_number"]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        access_q = Q(principal=user) | Q(assistant=user)

        # Archive readers can inspect the delegation history of a record they
        # are allowed to read even when they were neither principal nor assistant.
        correspondence_id = self.request.query_params.get("correspondence")
        if correspondence_id and archive_record_visible_to(user, correspondence_id):
            access_q |= Q(correspondence_id=correspondence_id)

        # "Active" means still in force. A row whose expiry has passed keeps its
        # stored status until something notices, so the gate is applied here too
        # rather than leaving expired delegations in the working list.
        if self.request.query_params.get("status") == CorrespondenceDelegation.Status.ACTIVE:
            qs = qs.filter(CorrespondenceDelegation.live_q())

        return qs.filter(access_q)

    def perform_create(self, serializer):
        principal = self.request.user
        assistant = serializer.validated_data.get("assistant")
        correspondence = serializer.validated_data.get("correspondence")
        notes = serializer.validated_data.get("notes", "")

        assert_correspondence_writable(correspondence)

        # A record can only be handed to someone the principal has actually
        # assigned as their assistant. Without this, any writer could name any
        # user and the assignment's grants would never be consulted.
        assignment = Delegation.objects.filter(
            principal=principal,
            assistant=assistant,
            active=True,
        ).first()
        if assignment is None:
            raise ValidationError(
                {
                    "assistant": (
                        "Assign this person as your TA/PA before delegating a record to them."
                    ),
                    "reason": "assistant_not_assigned",
                }
            )

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

        instance = serializer.save(
            principal=principal,
            delegation=assignment,
            # Snapshot the kind from the assignment, not the request: the minute
            # will say whether a TA or a PA acted, even if the assignment
            # changes later, and a client cannot relabel who is acting.
            assistant_type=assignment.assistant_type,
        )

        self._send_delegation_notification(instance, notes)

        logger.info(
            f"Correspondence {correspondence.reference_number} delegated "
            f"from {principal.get_full_name()} to {assistant.get_full_name()}"
        )

    def _assert_principal_only(self, delegation) -> None:
        """Only the principal (or a superuser) may edit or remove a delegation.

        Without this, the assistant could extend their own expiry or rewrite the
        instructions — the delegation would police itself.
        """
        user = self.request.user
        if getattr(user, "is_superuser", False):
            return
        if delegation.principal_id != user.id:
            raise PermissionDenied(
                {
                    "detail": "Only the executive who delegated this record can change the delegation.",
                    "reason": "not_principal",
                }
            )

    def perform_update(self, serializer):
        assert_correspondence_writable(serializer.instance.correspondence)
        self._assert_principal_only(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        assert_correspondence_writable(instance.correspondence)
        self._assert_principal_only(instance)
        instance.delete()

    def _send_delegation_notification(self, delegation, notes):
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
        user = request.user
        delegations = CorrespondenceDelegation.objects.filter(
            assistant=user,
        ).filter(
            CorrespondenceDelegation.granting_q("view")
        ).select_related("correspondence", "principal")

        serializer = self.get_serializer(delegations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def my_delegations(self, request):
        user = request.user
        delegations = CorrespondenceDelegation.objects.filter(
            principal=user,
        ).filter(
            CorrespondenceDelegation.live_q()
        ).select_related("correspondence", "assistant")

        serializer = self.get_serializer(delegations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        delegation = self.get_object()
        assert_correspondence_writable(delegation.correspondence)

        if delegation.principal != request.user:
            return Response(
                {"detail": "Only the executive who delegated can revoke."},
                status=status.HTTP_403_FORBIDDEN
            )

        delegation.expire_if_due()
        if delegation.status != CorrespondenceDelegation.Status.ACTIVE:
            return Response(
                {"detail": f"Delegation is already {delegation.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        delegation.revoke()

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
        delegation = self.get_object()

        if delegation.assistant != request.user:
            return Response(
                {"detail": "Only the assistant can mark delegation as completed."},
                status=status.HTTP_403_FORBIDDEN
            )

        delegation.expire_if_due()
        if delegation.status != CorrespondenceDelegation.Status.ACTIVE:
            return Response(
                {"detail": f"Delegation is already {delegation.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        delegation.complete()

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

    @action(detail=True, methods=["get"], url_path="activity")
    def activity(self, request, pk=None):
        delegation = self.get_object()
        actions = Minute.objects.filter(
            correspondence=delegation.correspondence,
            performed_by=delegation.assistant,
            acted_by_assistant=True,
        ).order_by("timestamp")

        activity_log = [
            {
                "minute_id": str(m.id),
                "action_type": m.action_type,
                "timestamp": m.timestamp.isoformat() if m.timestamp else None,
                "minute_text": (m.minute_text[:200] + "...") if len(m.minute_text or "") > 200 else m.minute_text,
            }
            for m in actions
        ]

        return Response({
            "delegation_id": str(delegation.id),
            "correspondence": str(delegation.correspondence_id),
            "principal": str(delegation.principal_id) if delegation.principal_id else None,
            "assistant": str(delegation.assistant_id) if delegation.assistant_id else None,
            "total_actions": len(activity_log),
            "first_action_at": activity_log[0]["timestamp"] if activity_log else None,
            "last_action_at": activity_log[-1]["timestamp"] if activity_log else None,
            "actions": activity_log,
        })

    @action(detail=False, methods=["get"], url_path="delegation-summary")
    def delegation_summary(self, request):
        correspondence_id = request.query_params.get("correspondence_id")
        assistant_id = request.query_params.get("assistant_id")
        if not correspondence_id or not assistant_id:
            return Response(
                {"detail": "correspondence_id and assistant_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        actions = Minute.objects.filter(
            correspondence_id=correspondence_id,
            performed_by_id=assistant_id,
            acted_by_assistant=True,
        ).order_by("timestamp")

        activity_log = [
            {
                "minute_id": str(m.id),
                "action_type": m.action_type,
                "timestamp": m.timestamp.isoformat() if m.timestamp else None,
                "minute_text": (m.minute_text[:200] + "...") if len(m.minute_text or "") > 200 else m.minute_text,
            }
            for m in actions
        ]

        return Response({
            "correspondence_id": correspondence_id,
            "assistant_id": assistant_id,
            "total_actions": len(activity_log),
            "first_action_at": activity_log[0]["timestamp"] if activity_log else None,
            "last_action_at": activity_log[-1]["timestamp"] if activity_log else None,
            "actions": activity_log,
        })


class CorrespondenceDraftViewSet(viewsets.ModelViewSet):
    queryset = CorrespondenceDraft.objects.select_related("correspondence", "user")
    serializer_class = CorrespondenceDraftSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["correspondence", "draft_type", "user"]
    search_fields = ["content", "subject"]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        return qs.filter(user=user)

    def _assert_draft_writable(self, correspondence):
        if correspondence is not None:
            assert_correspondence_writable(correspondence)

    def perform_create(self, serializer):
        self._assert_draft_writable(serializer.validated_data.get("correspondence"))
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        self._assert_draft_writable(serializer.instance.correspondence)
        self._assert_draft_writable(serializer.validated_data.get("correspondence"))
        serializer.save()

    def perform_destroy(self, instance):
        # Draft deletion only removes the user's own abandoned work and is used
        # to clean up after a minute is submitted; it does not touch the record.
        instance.delete()


class CorrespondenceTemplateViewSet(viewsets.ModelViewSet):
    queryset = CorrespondenceTemplate.objects.all()
    serializer_class = CorrespondenceTemplateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["scope", "scope_id", "template_type", "is_active", "is_default"]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "scope", "template_type", "created_at"]
    ordering = ["scope", "scope_id", "template_type", "title"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.is_superuser:
            return qs

        filters = Q(scope="organization")

        if user.directorate_id:
            filters |= Q(scope="directorate", scope_id=str(user.directorate_id))
        if user.division_id:
            filters |= Q(scope="division", scope_id=str(user.division_id))
        if user.department_id:
            filters |= Q(scope="department", scope_id=str(user.department_id))

        filters |= Q(scope="user", scope_id=str(user.id))

        return qs.filter(filters, is_active=True)

    def perform_create(self, serializer):
        scope = serializer.validated_data.get("scope")
        if scope == "organization":
            from organization.permission_utils import require_permission

            require_permission(self.request.user, "can_access_administration")
        serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user
        )

    def perform_update(self, serializer):
        scope = serializer.validated_data.get("scope", serializer.instance.scope)
        if scope == "organization":
            from organization.permission_utils import require_permission

            require_permission(self.request.user, "can_access_administration")
        serializer.save(updated_by=self.request.user)


class DispatchRecordViewSet(viewsets.ModelViewSet):
    queryset = DispatchRecord.objects.select_related("dispatched_by", "acknowledged_by")
    serializer_class = DispatchRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["correspondence", "dispatch_mode"]

    def perform_create(self, serializer):
        correspondence = serializer.validated_data.get("correspondence")
        if correspondence is not None:
            assert_correspondence_writable(correspondence)
        serializer.save(dispatched_by=self.request.user)

    def perform_update(self, serializer):
        assert_correspondence_writable(serializer.instance.correspondence)
        correspondence = serializer.validated_data.get("correspondence")
        if correspondence is not None:
            assert_correspondence_writable(correspondence)
        serializer.save()

    def perform_destroy(self, instance):
        assert_correspondence_writable(instance.correspondence)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="mark-acknowledged")
    def mark_acknowledged(self, request, pk=None):
        record = self.get_object()
        assert_correspondence_writable(record.correspondence)
        record.acknowledged_date = request.data.get("acknowledged_date", timezone.now().date())
        record.acknowledged_by = request.user
        record.save(update_fields=["acknowledged_date", "acknowledged_by"])
        return Response(DispatchRecordSerializer(record, context={"request": request}).data)


class CorrespondenceAccessLogViewSet(viewsets.GenericViewSet, viewsets.mixins.CreateModelMixin, viewsets.mixins.ListModelMixin):
    """Audit trail of correspondence views, downloads, and prints — mirrors DocumentAccessLogViewSet."""
    queryset = None  # set dynamically via get_queryset
    serializer_class = None  # set via string to avoid circular import
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["correspondence", "action", "user"]
    ordering_fields = ["timestamp"]
    ordering = ["-timestamp"]

    def get_serializer_class(self):
        from .serializers import CorrespondenceAccessLogSerializer
        return CorrespondenceAccessLogSerializer

    def get_queryset(self):
        from .models import CorrespondenceAccessLog
        return CorrespondenceAccessLog.objects.select_related("correspondence", "user")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

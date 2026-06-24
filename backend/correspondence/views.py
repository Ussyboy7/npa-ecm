"""API endpoints for correspondence and minutes."""

from __future__ import annotations

import logging
import os
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from datetime import timedelta, datetime

from django.db.models import Prefetch, Q
from django.db import models, IntegrityError
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from common.upload_validators import validate_file_upload
from rest_framework import filters, viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import ValidationError, PermissionDenied

from audit.models import ActivityLog
from audit.services import AuditService
from common.grade_utils import (
    DEPARTMENT_GRADES,
    DIRECTORATE_GRADES,
    DIVISION_GRADES,
    LEADERSHIP_GRADES,
    get_grade_level,
)
from notifications.models import Notification
from notifications.services import NotificationService
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from common.pagination import StandardPageNumberPagination

from organization.models import Office, OfficeMembership
from dms.models import DocumentVersion

from .models import (
    Case,
    CaseComment,
    CaseCorrespondenceLink,
    CaseDocumentLink,
    CaseFormLink,
    CaseSLA,
    CaseTemplate,
    CaseWorkflowRule,
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
)
from .services import CorrespondenceDocumentService, CaseService
from .serializers import (
    CaseCommentSerializer,
    CaseCorrespondenceLinkSerializer,
    CaseDetailSerializer,
    CaseDocumentLinkSerializer,
    CaseFormLinkSerializer,
    CaseSerializer,
    CaseSLASerializer,
    CaseTemplateSerializer,
    CaseWorkflowRuleSerializer,
    CorrespondenceAttachmentSerializer,
    CorrespondenceDelegationSerializer,
    CorrespondenceDraftSerializer,
    CorrespondenceDistributionSerializer,
    CorrespondenceDocumentLinkSerializer,
    CorrespondenceSerializer,
    CorrespondenceTemplateSerializer,
    DelegationSerializer,
    DispatchRecordSerializer,
    MinuteSerializer,
    ParallelRoutingGroupSerializer,
)
from .services import CompletionPackageService


logger = logging.getLogger(__name__)
User = get_user_model()


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
        # Optimize attachments - use select_related and order_by
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
        # Optimize minutes - use select_related for foreign keys
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
    )
    serializer_class = CorrespondenceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
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
        "parent_correspondence",
    ]
    search_fields = ["reference_number", "subject", "summary", "tags"]
    ordering_fields = ["created_at", "updated_at", "received_date"]
    ordering = ["-created_at"]

    def filter_queryset(self, queryset):
        """Override to add date range filtering and enhanced search."""
        # Get date range parameters
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        received_date_from = self.request.query_params.get("received_date_from")
        received_date_to = self.request.query_params.get("received_date_to")
        
        # Call super to apply standard filters (SearchFilter, DjangoFilterBackend, etc.)
        queryset = super().filter_queryset(queryset)
        
        # Apply created_at date range filter
        if date_from:
            try:
                from_date = datetime.strptime(date_from, "%Y-%m-%d").date()
                queryset = queryset.filter(created_at__date__gte=from_date)
            except ValueError:
                pass  # Invalid date format, ignore
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, "%Y-%m-%d").date()
                queryset = queryset.filter(created_at__date__lte=to_date)
            except ValueError:
                pass  # Invalid date format, ignore
        
        # Apply received_date range filter
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
        
        # Enhanced search: also search in minutes and attachments
        search_query = self.request.query_params.get("search", "").strip()
        if search_query:
            # Search in minutes
            minute_filter = Q(minutes__minute_text__icontains=search_query)
            # Search in attachment file names
            attachment_filter = Q(attachments__file_name__icontains=search_query)
            # Combine with existing search results using OR
            queryset = queryset.filter(minute_filter | attachment_filter).distinct()
        
        return queryset

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
        # Server-side permission enforcement for correspondence registration/creation.
        # Frontend should be allowed to drive this via Role.permissions['can_register_correspondence'].
        # We also allow users who have an active office membership with can_register=True (registry staff).
        user = request.user
        try:
            from organization.models import OfficeMembership
            role = getattr(user, "system_role", None)
            role_perms = getattr(role, "permissions", None) if role else None
            role_allows = bool(role_perms.get("can_register_correspondence", False)) if isinstance(role_perms, dict) else False
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
            # If anything unexpected happens while evaluating permissions, fail closed.
            raise PermissionDenied(
                {
                    "detail": "Registration restricted due to permission evaluation error.",
                    "code": "registration_restricted",
                }
            )

        # Extract file attachments from request (before serializer processes data)
        attachments = request.FILES.getlist('attachments', [])
        
        # Validate attachments BEFORE creating correspondence to avoid partial creation
        if attachments:
            from common.upload_validators import validate_file_upload
            for file in attachments:
                # Read file bytes for validation
                if hasattr(file, 'seek'):
                    file.seek(0)
                file_bytes = file.read()
                if hasattr(file, 'seek'):
                    file.seek(0)  # Reset for later use
                
                # Validate file before proceeding
                try:
                    validate_file_upload(
                        file_name=file.name,
                        mime_type=file.content_type,
                        file_bytes=file_bytes,
                        field_name='attachments'
                    )
                except ValidationError as e:
                    # If validation fails, raise error before creating correspondence
                    raise ValidationError({'attachments': str(e)})
        
        # Create serializer with request data
        # The serializer will automatically ignore fields not in the model
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get validated data
        validated_data = serializer.validated_data
        creator = validated_data.get("created_by") or request.user
        priority = validated_data.get("priority") or Correspondence.Priority.MEDIUM

        if not validated_data.get("reference_number"):
            # Use date-based counting instead of full table scan
            # Count only today's records - much faster with index on created_at
            today = timezone.now().date()
            base_count = Correspondence.all_objects.filter(
                created_at__date=today
            ).count()
            
            # Generate unique reference number with retry logic to handle race conditions
            max_retries = 100
            reference_number = None
            for attempt in range(max_retries):
                count = base_count + attempt + 1
                candidate = f"NPA/REG/{request.user.username.upper()}/{timezone.now().strftime('%Y%m%d')}/{count:04d}"
                
                # Check if this reference number already exists
                if not Correspondence.all_objects.filter(reference_number=candidate).exists():
                    reference_number = candidate
                    break
            
            # Fallback if we couldn't generate a unique number (shouldn't happen)
            if not reference_number:
                import uuid
                reference_number = f"NPA/REG/{request.user.username.upper()}/{timezone.now().strftime('%Y%m%d')}/{uuid.uuid4().hex[:4].upper()}"
        else:
            reference_number = validated_data["reference_number"]
            # Check if provided reference number already exists
            existing = Correspondence.all_objects.filter(reference_number=reference_number).first()
            if existing:
                # If it exists and is not deleted, raise a helpful error
                if not existing.is_deleted:
                    raise ValidationError({
                        'reference_number': f'A correspondence with reference number "{reference_number}" already exists. Please use a different reference number, or edit the existing correspondence to add your file.'
                    })
                # If it's deleted, we can reuse it (soft delete allows reuse)
                reference_number = validated_data["reference_number"]

        # Create the correspondence instance
        owning_office = validated_data.get("owning_office") or self._get_user_primary_office(request.user)
        current_office = validated_data.get("current_office") or owning_office

        # Try to save with retry logic for race conditions
        max_save_retries = 5
        correspondence = None
        for save_attempt in range(max_save_retries):
            try:
                # Recreate serializer for each retry to ensure clean state
                if save_attempt > 0:
                    serializer = self.get_serializer(data=request.data)
                    serializer.is_valid(raise_exception=True)
                
                correspondence = serializer.save(
                    created_by=creator,
                    priority=priority,
                    reference_number=reference_number,
                    owning_office=owning_office,
                    current_office=current_office,
                )
                break  # Success, exit retry loop
            except IntegrityError as e:
                # Check if it's a reference_number uniqueness error
                # Also check for the underlying database error
                error_str = str(e).lower()
                is_ref_error = (
                    'reference_number' in error_str or 
                    'reference_number_key' in error_str or
                    'unique constraint' in error_str and 'reference_number' in error_str
                )
                if is_ref_error:
                    if save_attempt < max_save_retries - 1:
                        # Generate a new reference number and retry
                        today = timezone.now().date()
                        base_count = Correspondence.all_objects.filter(
                            created_at__date=today
                        ).count()
                        count = base_count + save_attempt + 2
                        reference_number = f"NPA/REG/{request.user.username.upper()}/{timezone.now().strftime('%Y%m%d')}/{count:04d}"
                        # Continue to next retry
                        continue
                    else:
                        # Last attempt failed, use UUID fallback
                        import uuid
                        reference_number = f"NPA/REG/{request.user.username.upper()}/{timezone.now().strftime('%Y%m%d')}/{uuid.uuid4().hex[:4].upper()}"
                        # Continue to last attempt
                        continue
                else:
                    # Different integrity error, re-raise
                    raise
        
        if not correspondence:
            raise ValidationError("Failed to create correspondence after multiple retry attempts")
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

        # Auto-create DMS Document from correspondence
        try:
            CorrespondenceDocumentService.create_document_from_correspondence(correspondence)
        except Exception as e:
            # Log error but don't fail correspondence creation
            logger.error(
                f"Failed to auto-create DMS document for correspondence {correspondence.id}: {e}",
                exc_info=True
            )
        
        # Auto-create Case from correspondence (if type matches trigger criteria)
        try:
            case = CaseService.create_case_from_correspondence(correspondence, created_by=request.user)
            if case:
                logger.info(f"Auto-created case {case.case_number} from correspondence {correspondence.reference_number}")
        except Exception as e:
            # Log error but don't fail correspondence creation
            logger.error(
                f"Failed to auto-create case for correspondence {correspondence.id}: {e}",
                exc_info=True
            )

        # Return the created correspondence with attachments
        output_serializer = self.get_serializer(correspondence)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Handle correspondence update with attachment support."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Check if correspondence is completed (read-only)
        if instance.status == Correspondence.Status.COMPLETED:
            raise ValidationError({"detail": "Completed correspondence is read-only."})
        
        # Extract file attachments from request (before serializer processes data)
        attachments = request.FILES.getlist('attachments', [])
        
        # Validate attachments BEFORE updating correspondence
        if attachments:
            from common.upload_validators import validate_file_upload
            for file in attachments:
                # Read file bytes for validation
                if hasattr(file, 'seek'):
                    file.seek(0)
                file_bytes = file.read()
                if hasattr(file, 'seek'):
                    file.seek(0)  # Reset for later use
                
                # Validate file before proceeding
                try:
                    validate_file_upload(
                        file_name=file.name,
                        mime_type=file.content_type,
                        file_bytes=file_bytes,
                        field_name='attachments'
                    )
                except ValidationError as e:
                    # If validation fails, raise error before updating correspondence
                    raise ValidationError({'attachments': str(e)})
        
        # Update serializer with request data
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Store previous status for comparison
        previous_status = instance.status
        
        # Save the correspondence
        correspondence = serializer.save()
        
        # Sync completed timestamp if needed
        self._sync_completed_timestamp(correspondence, previous_status)
        
        # Handle file uploads (append new attachments, don't replace existing ones)
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
        
        # Handle completion package generation if status changed to completed
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
            
            # Update DMS document status to PUBLISHED
            try:
                CorrespondenceDocumentService.update_document_status_on_completion(correspondence)
            except Exception:
                logger.exception(
                    "Failed to update DMS document status for correspondence %s",
                    correspondence.id,
                )
        
        # Create audit log
        from audit.models import ActivityLog
        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=f"Updated correspondence: {correspondence.reference_number} - {correspondence.subject}",
        )
        
        # Return the updated correspondence with attachments
        output_serializer = self.get_serializer(correspondence)
        return Response(output_serializer.data)

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
            
            # Update DMS document status to PUBLISHED
            try:
                CorrespondenceDocumentService.update_document_status_on_completion(correspondence)
            except Exception:
                logger.exception(
                    "Failed to update DMS document status for correspondence %s",
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

    @action(detail=True, methods=["post"], url_path="withdraw")
    def withdraw(self, request, pk=None):
        """Withdraw a pending correspondence (similar to recall in minutes)."""
        correspondence = self.get_object()
        
        # Store previous status before changing
        previous_status = correspondence.status
        
        # Check if correspondence can be withdrawn
        if previous_status not in [Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS]:
            raise ValidationError({
                "detail": "Only pending or in-progress correspondence can be withdrawn."
            })
        
        # Check if user has permission (creator or office member)
        user = request.user
        can_withdraw = False
        
        if correspondence.created_by == user:
            can_withdraw = True
        elif correspondence.owning_office:
            from organization.models import OfficeMembership
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
        
        # Get withdrawal reason
        withdraw_reason = request.data.get("reason", "")
        
        # Mark as withdrawn
        correspondence.status = Correspondence.Status.WITHDRAWN
        correspondence.withdrawn_at = timezone.now()
        correspondence.withdrawn_by = user
        if withdraw_reason:
            correspondence.withdraw_reason = withdraw_reason
        correspondence.save(update_fields=["status", "withdrawn_at", "withdrawn_by", "withdraw_reason", "updated_at"])
        
        # Create audit log
        from audit.models import ActivityLog
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
        
        # Notify relevant users
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

    @action(detail=True, methods=["post"], url_path="dispatch", url_name="dispatch")
    def create_dispatch(self, request, pk=None):
        """Mark correspondence as dispatched with tracking details."""
        correspondence = self.get_object()
        force_override = request.data.get("force_override", False)
        allowed_statuses = [Correspondence.Status.COMPLETED]
        if force_override:
            allowed_statuses.append(Correspondence.Status.DISPATCHED)
        if correspondence.status not in allowed_statuses:
            raise ValidationError({"detail": "Only completed correspondence can be dispatched."})

        serializer = DispatchRecordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(
            correspondence=correspondence,
            dispatched_by=request.user,
        )
        correspondence.status = Correspondence.Status.DISPATCHED
        correspondence.dispatch_date = serializer.validated_data.get("dispatched_date")
        correspondence.save(update_fields=["status", "dispatch_date", "updated_at"])

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
        """Mark correspondence as acknowledged by recipient."""
        correspondence = self.get_object()
        if correspondence.status not in (Correspondence.Status.DISPATCHED, Correspondence.Status.COMPLETED):
            raise ValidationError({"detail": "Correspondence must be dispatched or completed to acknowledge."})

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
        output = self.get_serializer(correspondence)
        return Response(output.data)

    @action(detail=True, methods=["post"], url_path="archive")
    def archive_single(self, request, pk=None):
        """Archive a single correspondence item."""
        correspondence = self.get_object()

        if correspondence.status == Correspondence.Status.ARCHIVED:
            raise ValidationError({"detail": "Correspondence is already archived."})

        if correspondence.status not in (
            Correspondence.Status.COMPLETED,
            Correspondence.Status.DISPATCHED,
            Correspondence.Status.ACKNOWLEDGED,
        ):
            raise ValidationError({"detail": "Only completed, dispatched, or acknowledged correspondence can be archived."})

        correspondence.status = Correspondence.Status.ARCHIVED
        correspondence.archived_at = timezone.now()
        correspondence.save(update_fields=["status", "archived_at", "updated_at"])

        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=f"Archived correspondence: {correspondence.reference_number}",
        )

        output = self.get_serializer(correspondence)
        return Response(output.data)

    @action(detail=False, methods=["post"], url_path="bulk-archive")
    def bulk_archive(self, request):
        """Archive multiple correspondence items at once."""
        correspondence_ids = request.data.get("correspondence_ids", [])
        
        if not correspondence_ids:
            raise ValidationError({"correspondence_ids": "Correspondence IDs are required"})
        
        correspondences = Correspondence.objects.filter(id__in=correspondence_ids, is_deleted=False)
        
        # Check permissions - user must be creator, current approver, or superuser
        accessible_items = []
        for corr in correspondences:
            if corr.created_by == request.user or request.user.is_superuser:
                accessible_items.append(corr)
            elif corr.current_approver == request.user:
                accessible_items.append(corr)
            # Check if user is in owning/current office
            elif corr.owning_office_id or corr.current_office_id:
                office_ids = self._get_user_office_ids(request.user)
                if (corr.owning_office_id in office_ids) or (corr.current_office_id in office_ids):
                    accessible_items.append(corr)
        
        if not accessible_items:
            raise PermissionDenied("You don't have permission to archive any of the selected items")
        
        # Archive correspondence
        archived_count = 0
        from audit.models import ActivityLog
        
        for corr in accessible_items:
            corr.status = Correspondence.Status.ARCHIVED
            corr.archived_at = timezone.now()
            corr.save(update_fields=["status", "archived_at", "updated_at"])
            archived_count += 1
            
            AuditService.log_correspondence_activity(
                user=request.user,
                action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
                correspondence=corr,
                request=request,
                description=f"Archived correspondence: {corr.reference_number} - {corr.subject}",
                metadata={"bulk_operation": True, "new_status": "archived"},
            )
        
        return Response({
            "message": f"Successfully archived {archived_count} correspondence item(s)",
            "archived_count": archived_count,
            "skipped_count": len(correspondence_ids) - archived_count,
        })

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        """Soft delete multiple correspondence items at once."""
        correspondence_ids = request.data.get("correspondence_ids", [])
        
        if not correspondence_ids:
            raise ValidationError({"correspondence_ids": "Correspondence IDs are required"})
        
        correspondences = Correspondence.objects.filter(id__in=correspondence_ids, is_deleted=False)
        
        # Check permissions - user must be creator or superuser
        accessible_items = []
        for corr in correspondences:
            if corr.created_by == request.user or request.user.is_superuser:
                accessible_items.append(corr)
        
        if not accessible_items:
            raise PermissionDenied("You don't have permission to delete any of the selected items")
        
        # Soft delete correspondence
        deleted_count = 0
        from audit.models import ActivityLog
        
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

    @action(detail=False, methods=["get"], url_path="sidebar-counts")
    def sidebar_counts(self, request):
        """
        Get counts for sidebar badges.
        Returns counts for office inbox, my inbox, and outbox.
        Results are cached for 60 seconds to improve performance.
        Optimized for performance using aggregation queries.
        """
        from django.core.cache import cache
        from django.core.cache.backends.base import InvalidCacheBackendError
        from django.db.models import Count, Q, Exists, OuterRef
        from correspondence.models import Minute, CorrespondenceDistribution, Case
        from dms.models import Document
        from organization.models import OfficeMembership, Office
        
        user = request.user
        
        # Cache key based on user ID
        cache_key = f"sidebar_counts_{user.id}"
        cached_result = None
        try:
            cached_result = cache.get(cache_key)
        except (ConnectionError, InvalidCacheBackendError, Exception) as e:
            # If cache is unavailable (e.g., Redis not running), log and continue
            logger.warning(f"Cache unavailable for sidebar_counts: {str(e)}")
        
        if cached_result is not None:
            return Response(cached_result)
        
        # Get user's office IDs (cached)
        office_ids = self._get_user_office_ids(user)
        
        # === Office Inbox Count (Optimized) ===
        office_inbox_count = 0
        if office_ids or user.is_superuser:
            # Build optimized query with subqueries
            base_filter = Q(is_deleted=False) & ~Q(status=Correspondence.Status.COMPLETED)
            
            if user.is_superuser and not office_ids:
                office_inbox_count = Correspondence.objects.filter(base_filter).count()
            else:
                # Parallel routing subquery
                parallel_subquery = Minute.objects.filter(
                    to_user=user,
                    is_parallel_branch=True,
                    correspondence__workflow_state='parallel',
                    correspondence_id=OuterRef('id'),
                    is_recalled=False  # Exclude recalled minutes
                )
                
                # Distribution subquery - get user's org units once
                user_offices = OfficeMembership.objects.filter(
                    user=user, is_active=True
                ).select_related('office').values_list('office', flat=True)
                
                user_office_objs = Office.objects.filter(id__in=user_offices)
                user_division_ids = list(user_office_objs.values_list('division_id', flat=True).distinct())
                user_department_ids = list(user_office_objs.values_list('department_id', flat=True).distinct())
                user_directorate_ids = list(user_office_objs.values_list('directorate_id', flat=True).distinct())
                
                # Add user's direct org units
                if hasattr(user, 'division_id') and user.division_id:
                    user_division_ids.append(user.division_id)
                if hasattr(user, 'department_id') and user.department_id:
                    user_department_ids.append(user.department_id)
                if hasattr(user, 'directorate_id') and user.directorate_id:
                    user_directorate_ids.append(user.directorate_id)
                
                # Remove None values
                user_division_ids = [x for x in user_division_ids if x]
                user_department_ids = [x for x in user_department_ids if x]
                user_directorate_ids = [x for x in user_directorate_ids if x]
                
                # Distribution subquery - build filter conditions first
                has_distribution_filter = False
                distribution_filter = Q()
                if user_division_ids:
                    distribution_filter |= Q(division_id__in=user_division_ids)
                    has_distribution_filter = True
                if user_department_ids:
                    distribution_filter |= Q(department_id__in=user_department_ids)
                    has_distribution_filter = True
                if user_directorate_ids:
                    distribution_filter |= Q(directorate_id__in=user_directorate_ids)
                    has_distribution_filter = True
                # Add user distribution filter
                distribution_filter |= Q(user=user, recipient_type='user')
                has_distribution_filter = True
                
                # Build main query with subqueries
                office_filter = Q(current_office_id__in=office_ids) | Q(owning_office_id__in=office_ids)
                # Always include parallel_subquery (it's always defined)
                office_filter |= Exists(parallel_subquery)
                # Only add distribution subquery if we have filter conditions
                if has_distribution_filter:
                    distribution_subquery = CorrespondenceDistribution.objects.filter(
                        distribution_filter,
                        correspondence_id=OuterRef('id'),
                        is_active=True  # Only active distribution entries
                    )
                    office_filter |= Exists(distribution_subquery)
                
                office_inbox_count = Correspondence.objects.filter(
                    base_filter & office_filter
                ).count()
        
        # === My Inbox Count (Optimized) ===
        my_parallel_subquery = Minute.objects.filter(
            to_user=user,
            is_parallel_branch=True,
            correspondence__workflow_state__in=['parallel', 'waiting_merge'],
            correspondence__status__in=['pending', 'in-progress'],
            correspondence_id=OuterRef('id'),
            is_recalled=False  # Exclude recalled minutes
        )
        
        my_inbox_count = Correspondence.objects.filter(
            Q(is_deleted=False) &
            (Q(current_approver=user) | Exists(my_parallel_subquery))
        ).exclude(status=Correspondence.Status.COMPLETED).count()
        
        # === Outbox Count (Optimized) ===
        outbox_count = Correspondence.objects.filter(
            is_deleted=False,
            created_by=user,
            status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS]
        ).count()
        
        # === Delegated Count (Optimized) ===
        delegated_count = CorrespondenceDelegation.objects.filter(
            assistant=user,
            status=CorrespondenceDelegation.Status.ACTIVE
        ).count()
        
        # === Secretary Inbox Count (for secretaries only) ===
        secretary_inbox_count = 0
        role_name = getattr(getattr(user, "system_role", None), "name", "") or ""
        is_secretary = role_name.lower() == "secretary"
        if is_secretary:
            secretary_correspondence_ids = Minute.objects.filter(
                acted_by_secretary=True,
                performed_by=user,
                is_recalled=False  # Exclude recalled minutes
            ).values_list('correspondence_id', flat=True).distinct()
            secretary_inbox_count = Correspondence.objects.filter(
                is_deleted=False,
                id__in=secretary_correspondence_ids
            ).exclude(status=Correspondence.Status.COMPLETED).count()
        
        # === Office Outbox Count ===
        office_outbox_count = 0
        if office_ids or user.is_superuser:
            base_filter = Q(is_deleted=False) & Q(status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS])
            if user.is_superuser and not office_ids:
                office_outbox_count = Correspondence.objects.filter(base_filter).count()
            else:
                office_outbox_count = Correspondence.objects.filter(
                    base_filter & Q(owning_office_id__in=office_ids)
                ).count()

        # === Case Counts ===
        case_base = Case.objects.filter(is_deleted=False)
        my_cases_count = case_base.filter(Q(created_by=user) | Q(assigned_to=user)).count()
        office_cases_count = 0
        if office_ids:
            office_cases_count = case_base.filter(
                Q(current_office_id__in=office_ids) | Q(owning_office_id__in=office_ids)
            ).count()
        all_cases_count = case_base.count()

        # === Executive Approvals Count ===
        executive_approvals_count = Minute.objects.filter(
            to_user=user,
            purpose="approval",
            is_recalled=False,
            correspondence__is_deleted=False,
        ).exclude(
            correspondence__status=Correspondence.Status.COMPLETED
        ).count()

        # === My Documents Count ===
        my_documents_count = Document.objects.filter(
            is_deleted=False,
            author=user,
        ).count()

        result = {
            "officeInbox": office_inbox_count,
            "myInbox": my_inbox_count,
            "outbox": outbox_count,
            "officeOutbox": office_outbox_count,
            "delegated": delegated_count,
            "secretaryInbox": secretary_inbox_count,
            "myCases": my_cases_count,
            "officeCases": office_cases_count,
            "allCases": all_cases_count,
            "executiveApprovals": executive_approvals_count,
            "myDocuments": my_documents_count,
        }
        
        # Cache result for 60 seconds (if cache is available)
        try:
            cache.set(cache_key, result, 60)
        except (ConnectionError, InvalidCacheBackendError, Exception) as e:
            # If cache is unavailable, log and continue - cache is optional
            logger.warning(f"Failed to cache sidebar_counts: {str(e)}")
        
        return Response(result)

    @action(detail=False, methods=["get"], url_path="office-inbox")
    def office_inbox(self, request):
        """
        Get correspondence for Office Inbox.
        
        Office Inbox shows INWARD correspondence (coming INTO office):
        - Inward-Internal: From another NPA office (minuted to your office)
        - Inward-External: From external organization (physical copy received, registered)
        - Distribution (CC): Correspondence where your office/division/department is in distribution list
          - Distribution items appear in Office Inbox for awareness
          - Distribution can be "For Information", "For Action", or "For Comment"
          - Distribution items can be further minuted down (acted upon)
          - Everything is tracked and recorded
        
        Concept: Inward = Coming INTO office → Office Inbox
        Distribution = CC/information sharing → Also appears in Office Inbox
        """
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
                correspondence__workflow_state='parallel',
                is_recalled=False  # Exclude recalled minutes
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
            # Add user distribution filter
            distribution_filter |= Q(user=user, recipient_type='user')
            
            distribution_correspondence_ids = []
            if distribution_filter:
                # Only get active distribution entries (excludes those from recalled minutes)
                distribution_correspondence_ids = CorrespondenceDistribution.objects.filter(
                    distribution_filter,
                    is_active=True  # Only active distribution entries
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
                correspondence__workflow_state='parallel',
                is_recalled=False  # Exclude recalled minutes
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
        """Get correspondence where secretary has acted on behalf of executives."""
        user = request.user
        
        # Check if user is a secretary
        role_name = getattr(getattr(user, "system_role", None), "name", "") or ""
        is_secretary = role_name.lower() == "secretary"
        
        if not is_secretary:
            return Response(
                {"detail": "This endpoint is only available for secretaries."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Find correspondence where secretary has acted (via minutes with acted_by_secretary=True and performed_by=user)
        from correspondence.models import Minute
        secretary_correspondence_ids = Minute.objects.filter(
            acted_by_secretary=True,
            performed_by=user
        ).values_list('correspondence_id', flat=True).distinct()
        
        queryset = self.base_queryset.filter(
            is_deleted=False,
            id__in=secretary_correspondence_ids
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
        paginator = StandardPageNumberPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        
        summary = {
            "total": total_count,
            "urgent": urgent_count,
            "overdue": overdue_count,
            "assigned_to_user": 0,  # Not applicable for secretary inbox
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
            correspondence__status__in=['pending', 'in-progress'],
            is_recalled=False  # Exclude recalled minutes
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
        paginator = StandardPageNumberPagination()
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
        """Get correspondence created by current user or from user's office(s) that's pending dispatch."""
        user = request.user
        
        # Check if filtering by office (for Office Outbox)
        office_ids = request.query_params.getlist("office")
        
        if office_ids:
            # Office Outbox: Items from specific office(s) that are pending/in-progress
            from organization.models import OfficeMembership
            # Verify user is a member of the requested office(s)
            user_office_ids = list(OfficeMembership.objects.filter(
                user=user,
                is_active=True,
                office_id__in=office_ids
            ).values_list('office_id', flat=True))
            
            if not user_office_ids and not user.is_superuser:
                return Response(
                    {"detail": "You don't have access to the requested office(s)."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Filter by owning_office OR correspondence that has been minuted/treated from these offices
            correspondence_ids_from_minutes = Minute.objects.filter(
                from_office_id__in=user_office_ids if user_office_ids else office_ids,
                action_type__in=['minute', 'forward', 'approve', 'treat']
            ).values_list('correspondence_id', flat=True).distinct()
            
            queryset = self.base_queryset.filter(
                is_deleted=False,
                status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS]
            ).filter(
                Q(owning_office_id__in=user_office_ids if user_office_ids else office_ids) |
                Q(id__in=correspondence_ids_from_minutes)
            )
        else:
            # My Outbox: Items created by current user OR minuted/treated by current user
            correspondence_ids_from_minutes = Minute.objects.filter(
                user=user,
                action_type__in=['minute', 'forward', 'approve', 'treat']
            ).values_list('correspondence_id', flat=True).distinct()
            
            queryset = self.base_queryset.filter(
                is_deleted=False,
                status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS]
            ).filter(
                Q(created_by=user) | Q(id__in=correspondence_ids_from_minutes)
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
        paginator = StandardPageNumberPagination()
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

    @action(detail=False, methods=["get"], url_path="archive-records", filter_backends=[])
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

        user_directorate_id = getattr(user, "directorate_id", None)
        user_division_id = getattr(user, "division_id", None)
        user_department_id = getattr(user, "department_id", None)
        user_office_ids = self._get_user_office_ids(user)

        # Apply hierarchical scoping
        if is_superuser:
            # Superuser sees everything
            pass
        elif grade in DIRECTORATE_GRADES and user_directorate_id:
            # ED/MD level - sees all in their directorate
            queryset = queryset.filter(
                Q(division__directorate_id=user_directorate_id) |
                Q(department__division__directorate_id=user_directorate_id)
            )
        elif grade in DIVISION_GRADES and user_division_id:
            # GM level - sees all in their division
            queryset = queryset.filter(
                Q(division_id=user_division_id) |
                Q(department__division_id=user_division_id)
            )
        elif grade in DEPARTMENT_GRADES and user_department_id:
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
        paginator = StandardPageNumberPagination()
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
        from common.grade_utils import LEADERSHIP_GRADES

        if not user or not getattr(user, "is_authenticated", False):
            return []
        role_name = getattr(getattr(user, "system_role", None), "name", "") or ""
        grade = (user.grade_level or "").upper()
        is_super_admin = getattr(user, "is_superuser", False) or role_name.lower() == "super admin"
        is_secretary = role_name.lower() == "secretary"
        allowed = {Correspondence.ArchiveLevel.DEPARTMENT}
        if grade in LEADERSHIP_GRADES or is_super_admin or is_secretary:
            allowed.add(Correspondence.ArchiveLevel.DIVISION)
        if grade in DIRECTORATE_GRADES or is_super_admin or is_secretary:
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

        # Debug logging
        print(f"DEBUG: User {user.username} - allowed_levels: {allowed_levels}")
        print(f"DEBUG: User {user.username} - department_id: {department_id}, division_id: {division_id}, directorate_id: {directorate_id}")

        # For users with archive access, also include correspondence that doesn't have organizational associations
        # but has been completed/archived (for backward compatibility)
        base_filters = Q()

        # Add organizational filters
        org_filters = Q()
        if Correspondence.ArchiveLevel.DEPARTMENT in allowed_levels and department_id:
            org_filters |= Q(department_id=department_id)
            print(f"DEBUG: Added department filter: {department_id}")
        if Correspondence.ArchiveLevel.DIVISION in allowed_levels and division_id:
            org_filters |= Q(division_id=division_id)
            print(f"DEBUG: Added division filter: {division_id}")
        if Correspondence.ArchiveLevel.DIRECTORATE in allowed_levels and directorate_id:
            org_filters |= Q(division__directorate_id=directorate_id)
            print(f"DEBUG: Added directorate filter: {directorate_id}")

        # Include correspondence that either:
        # 1. Has proper organizational associations, OR
        # 2. Doesn't have organizational associations but was added by this user or their office
        if org_filters:
            base_filters |= org_filters

        # For backward compatibility: include correspondence without org associations
        # that might be accessible to this user
        backward_compat_filters = Q()
        if department_id:
            backward_compat_filters |= Q(department_id=department_id)
        if division_id:
            backward_compat_filters |= Q(division_id=division_id)
        if directorate_id:
            backward_compat_filters |= Q(division__directorate_id=directorate_id)

        # Include items added by this user
        user_added_filters = Q(added_by=user)

        # Combine all filters
        if base_filters or backward_compat_filters or user_added_filters:
            combined_filters = base_filters | backward_compat_filters | user_added_filters
        else:
            print(f"DEBUG: No filters applied for user {user.username}")
            return queryset.none()

        filtered_queryset = queryset.filter(combined_filters).distinct()
        count = filtered_queryset.count()
        print(f"DEBUG: Filtered queryset count for user {user.username}: {count}")

        # Additional debug: show a few examples
        if count > 0:
            sample_items = filtered_queryset[:3]
            for item in sample_items:
                print(f"DEBUG: Sample item - {item.reference_number}: division={item.division_id}, department={item.department_id}, archive_level={item.archive_level}")

        return filtered_queryset

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
        """Handle file upload for correspondence attachments."""
        # Get the file from request
        file = request.FILES.get('file')
        if not file:
            raise ValidationError({'file': 'No file provided'})
        
        # Get correspondence ID from request data or query params
        correspondence_id = request.data.get('correspondence')
        if not correspondence_id:
            raise ValidationError({'correspondence': 'Correspondence ID is required'})
        
        try:
            correspondence = Correspondence.objects.get(id=correspondence_id)
        except Correspondence.DoesNotExist:
            raise ValidationError({'correspondence': 'Correspondence not found'})
        
        # Validate the upload
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
        
        # Generate file path
        file_path = os.path.join('correspondence_attachments', str(correspondence.id), file.name)
        
        # Save file to storage
        saved_path = default_storage.save(file_path, file)
        
        # Build relative URL for the file
        media_url = settings.MEDIA_URL or '/media/'
        if not media_url.startswith('/'):
            media_url = f'/{media_url}'
        file_url = f"{media_url.rstrip('/')}/{saved_path}"
        
        # Create attachment record
        attachment = CorrespondenceAttachment.objects.create(
            correspondence=correspondence,
            file_name=file.name,
            file_type=getattr(file, 'content_type', None) or 'application/octet-stream',
            file_size=file_size,
            file_url=file_url,
        )
        
        # Serialize and return
        serializer = self.get_serializer(attachment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
        serializer.save(added_by=self.request.user)

    @action(detail=False, methods=["post"])
    def share_with_department(self, request):
        """
        Share department distribution with all department members.
        
        Creates distribution entries for all active department members when
        office holder clicks "Share with Department".
        """
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
        
        # Verify user is office holder (principal) of this department
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
        
        # Get all active department members
        department_members = OfficeMembership.objects.filter(
            office__department=department,
            is_active=True
        ).select_related('user').values_list('user', flat=True).distinct()
        
        if not department_members:
            return Response(
                {"detail": "No active members found in this department"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get parent distribution entry if provided
        parent_distribution = None
        if parent_distribution_id:
            try:
                parent_distribution = CorrespondenceDistribution.objects.get(id=parent_distribution_id)
            except CorrespondenceDistribution.DoesNotExist:
                pass
        
        # Create distribution entries for all department members
        created_count = 0
        errors = []
        for member_id in department_members:
            # Skip if distribution already exists for this user
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


class CorrespondenceDocumentLinkViewSet(viewsets.ModelViewSet):
    queryset = CorrespondenceDocumentLink.objects.select_related("correspondence", "document")
    serializer_class = CorrespondenceDocumentLinkSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["correspondence", "document"]


class MinuteViewSet(viewsets.ModelViewSet):
    queryset = Minute.objects.select_related("correspondence", "user", "seal_applied", "seal_applied__sealed_by", "seal_applied__signature_used")
    serializer_class = MinuteSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["correspondence", "user", "action_type", "direction"]
    ordering_fields = ["timestamp", "step_number"]
    ordering = ["timestamp"]

    def get_queryset(self):
        """Filter queryset based on query parameters."""
        queryset = super().get_queryset()
        
        # Filter for minutes with executive seals (for Executive Approvals page)
        has_seal = self.request.query_params.get('has_seal')
        if has_seal is not None:
            has_seal_bool = has_seal.lower() in ('true', '1', 'yes')
            if has_seal_bool:
                # Only minutes with valid seals
                queryset = queryset.filter(
                    seal_applied__isnull=False,
                    seal_applied__is_valid=True
                )
            else:
                # Only minutes without seals
                queryset = queryset.filter(seal_applied__isnull=True)
        
        return queryset

    @action(detail=False, methods=["get"], url_path="pending-approvals")
    def pending_approvals(self, request):
        """
        Return pending approval minutes for the authenticated user.

        Frontend expects: { results: [...] }
        """
        user = request.user
        qs = (
            Minute.objects.select_related("correspondence")
            .filter(
                to_user=user,
                purpose="approval",
                is_recalled=False,
                correspondence__is_deleted=False,
            )
            .exclude(correspondence__status=Correspondence.Status.COMPLETED)
            .order_by("-created_at")
        )

        paginator = StandardPageNumberPagination()
        page = paginator.paginate_queryset(qs, request)
        items = page if page is not None else qs

        results = [
            {
                "id": str(m.id),
                "correspondenceId": str(m.correspondence_id),
                "correspondence": {
                    "id": str(m.correspondence_id),
                    "subject": m.correspondence.subject,
                    "reference_number": m.correspondence.reference_number,
                },
                "due_date": m.response_deadline.isoformat() if m.response_deadline else None,
                "created_at": m.created_at.isoformat() if getattr(m, "created_at", None) else None,
            }
            for m in items
        ]

        if page is not None:
            return paginator.get_paginated_response(results)

        return Response({"results": results, "count": len(results)})

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
            sorted_memberships = sorted(
                memberships,
                key=lambda m: get_grade_level(getattr(m.user, 'grade_level', None)),
                reverse=True,
            )
            highest_grade = sorted_memberships[0]
            return (highest_grade.user, False)
        
        # No one found in office
        return (None, False)

    def create(self, request, *args, **kwargs):
        """Override create to refresh minute after seal is applied."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Refresh the minute from database to get the seal_applied relationship
        minute = serializer.instance
        if minute:
            minute.refresh_from_db()
            # Re-serialize with updated data including seal
            serializer = self.get_serializer(minute)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

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
        
        # Get from_office from validated data if provided, otherwise use current_office
        from_office = serializer.validated_data.get('from_office') or current_office
        
        if active_delegation:
            # User is acting as delegatee - record action under principal's name
            # but track who actually performed it for audit
            principal = active_delegation.principal
            minute = serializer.save(
                user=principal,  # Shows as ED's action
                from_office=from_office,
                performed_by=self.request.user,  # Audit trail - who actually did it
                acted_by_assistant=True,
                assistant_type='PA',  # Default to PA for delegated actions
                dispatched_at=timezone.now(),  # Auto-set when minute is created
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
            minute = serializer.save(
                user=self.request.user,
                from_office=from_office,
                dispatched_at=timezone.now(),  # Auto-set when minute is created
            )
        
        # Auto-grant document access to minute recipients
        from correspondence.services import CorrespondenceDocumentService
        try:
            CorrespondenceDocumentService.grant_document_access_for_minute(minute)
        except Exception as e:
            # Log error but don't fail minute creation
            logger.error(
                f"Failed to auto-grant document access for minute {minute.id}: {str(e)}",
                exc_info=True
            )
        
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
            # Route up if: approve action without to_office OR no to_office specified (completing at this level)
            # If APPROVE has a to_office, it's routing (not completing)
            is_completing_branch = (
                (minute.action_type == Minute.ActionType.APPROVE and not minute.to_office) or
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
        # For REJECT action, route back to sender's office (owning_office or from previous minute)
        elif minute.action_type == Minute.ActionType.REJECT:
            # Route back to the office that sent this correspondence
            # Priority: owning_office > from_office of previous minute > created_by's office
            reject_target_office = None
            reject_target_user = None
            
            # 1. Try owning_office (office that owns/created the correspondence)
            if correspondence.owning_office:
                reject_target_office = correspondence.owning_office
                # Find office head
                reject_target_user, _ = self._find_office_recipient(reject_target_office, None)
                logger.info(f"REJECT: Routing back to owning office {reject_target_office.name}")
            
            # 2. If no owning_office, try to find the office that sent it (from previous minute)
            if not reject_target_office:
                previous_minute = MinuteModel.objects.filter(
                    correspondence=correspondence,
                    timestamp__lt=minute.timestamp
                ).exclude(
                    action_type=Minute.ActionType.REJECT
                ).order_by('-timestamp', '-step_number').first()
                
                if previous_minute and previous_minute.from_office:
                    reject_target_office = previous_minute.from_office
                    reject_target_user, _ = self._find_office_recipient(reject_target_office, previous_minute.user)
                    logger.info(f"REJECT: Routing back to previous sender's office {reject_target_office.name}")
            
            # 3. If still no office, try created_by's office
            if not reject_target_office and correspondence.created_by:
                from organization.models import OfficeMembership
                creator_office_membership = OfficeMembership.objects.filter(
                    user=correspondence.created_by,
                    is_active=True,
                    is_primary=True
                ).select_related('office').first()
                
                if creator_office_membership:
                    reject_target_office = creator_office_membership.office
                    reject_target_user = correspondence.created_by
                    logger.info(f"REJECT: Routing back to creator's office {reject_target_office.name}")
            
            # Set routing if we found a target office
            if reject_target_office:
                recipient_user = reject_target_user
                minute.to_office = reject_target_office
                minute.save(update_fields=['to_office'])
                logger.info(f"REJECT: Will route to {reject_target_office.name}")
        
        # For FORWARD, MINUTE, and APPROVE actions, handle office routing (only if not completing parallel branch)
        # APPROVE actions can also route to another office (e.g., MD approves and forwards to ED)
        elif minute.action_type in (Minute.ActionType.FORWARD, Minute.ActionType.MINUTE, Minute.ActionType.APPROVE):
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
        # For REJECT, always route back (even if it's completing a branch)
        if not is_completing_parallel_branch or minute.action_type == Minute.ActionType.REJECT:
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
        
        # Set current_approver if we found a recipient user (unless branch completing, but allow for REJECT)
        if (not is_completing_parallel_branch or minute.action_type == Minute.ActionType.REJECT) and recipient_user and recipient_user.id != self.request.user.id:
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
        
        # Automatically apply digital seal for executive approvals only
        # Only APPROVE actions require seals, not regular minutes
        if minute.action_type == Minute.ActionType.APPROVE:
            # Check if user is an executive (MD, ED) with an active signature
            user_grade = self.request.user.grade_level
            user_role_obj = getattr(self.request.user, 'system_role', None)
            user_role = user_role_obj.name.upper() if user_role_obj and user_role_obj.name else ''
            executive_grades = ['MDCS', 'EDCS']  # Managing Director, Executive Director
            executive_roles = ['MANAGING DIRECTOR', 'EXECUTIVE DIRECTOR', 'MD', 'ED']
            
            is_executive = (
                user_grade in executive_grades or 
                user_role in executive_roles or
                'MANAGING DIRECTOR' in user_role or
                'EXECUTIVE DIRECTOR' in user_role
            )
            
            if is_executive:
                try:
                    from accounts.models import ExecutiveSignature
                    from accounts.services import SealGenerationService
                    
                    signature = ExecutiveSignature.objects.get(user=self.request.user, is_active=True)
                    
                    # Generate and apply the seal
                    seal, seal_data = SealGenerationService.generate_seal(
                        user=self.request.user,
                        correspondence=correspondence,
                        request=self.request,  # Pass request to detect correct frontend URL
                    )
                    
                    # Store seal reference in minute
                    minute.seal_applied = seal
                    minute.save(update_fields=['seal_applied'])
                    
                    # Log the seal application
                    AuditService.log_correspondence_activity(
                        user=self.request.user,
                        action=action_type,
                        correspondence=correspondence,
                        request=self.request,
                        description=f"Applied digital seal {seal.serial_number} on executive approval",
                        metadata={
                            "seal_id": str(seal.id),
                            "serial_number": seal.serial_number,
                        },
                    )
                    
                    print(f"[SEAL] Applied digital seal {seal.serial_number} for executive approval on correspondence {correspondence.reference_number}")
                    
                except ExecutiveSignature.DoesNotExist:
                    # User doesn't have an active signature - log but don't fail
                    print(f"[SEAL] Executive {self.request.user.username} attempted approval without digital signature")
                except Exception as e:
                    # Don't fail the approval if seal generation fails
                    print(f"[SEAL ERROR] Failed to apply seal: {e}")
        
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

    @action(detail=True, methods=["get"], url_path="approval-pdf")
    def approval_pdf(self, request, pk=None):
        """
        Generate and return a PDF document for an executive approval minute.
        Includes correspondence details, all minutes, and the approval with seal.
        """
        from correspondence.services import ExecutiveApprovalPDFService
        from django.http import HttpResponse
        import traceback
        
        minute = self.get_object()
        
        # Only allow for APPROVE action types
        if minute.action_type != Minute.ActionType.APPROVE:
            return Response(
                {"detail": "This endpoint is only available for approval minutes."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            pdf_bytes = ExecutiveApprovalPDFService.generate_approval_pdf(
                minute=minute,
                correspondence=minute.correspondence
            )
            
            response = HttpResponse(pdf_bytes, content_type="application/pdf")
            filename = f"approval-{minute.correspondence.reference_number or minute.correspondence.id}-{minute.id}.pdf"
            response["Content-Disposition"] = f'inline; filename="{filename}"'
            return response
        except Exception as e:
            error_trace = traceback.format_exc()
            logger.exception(f"Error generating approval PDF: {e}\n{error_trace}")
            return Response(
                {"detail": f"Failed to generate PDF: {str(e)}", "traceback": error_trace if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
        """Mark minute as opened by recipient (also serves as acknowledgment)."""
        minute = self.get_object()
        
        update_fields = []
        if not minute.is_opened:
            minute.is_opened = True
            minute.opened_at = timezone.now()
            update_fields.extend(["is_opened", "opened_at"])
        
        # Also set acknowledged_at when recipient opens/views the minute
        if not minute.acknowledged_at:
            minute.acknowledged_at = timezone.now()
            update_fields.append("acknowledged_at")
        
        # Also set dispatched_at if not already set (auto-dispatch on first view)
        if not minute.dispatched_at:
            minute.dispatched_at = minute.timestamp  # Use creation time as dispatch time
            update_fields.append("dispatched_at")
        
        if update_fields:
            minute.save(update_fields=update_fields)
        
        return Response({"status": "marked_as_opened"})

    @action(detail=True, methods=["post"], url_path="recall")
    def recall(self, request, pk=None):
        """Recall/withdraw a minute within the edit window."""
        minute = self.get_object()
        
        # Check if minute can be recalled
        if not minute.can_be_recalled():
            # Check why it can't be recalled to provide a more specific error message
            if minute.is_recalled:
                raise ValidationError({
                    "detail": "This minute has already been recalled."
                })
            
            # Check if subsequent minutes exist
            subsequent_minutes = Minute.objects.filter(
                correspondence=minute.correspondence,
                timestamp__gt=minute.timestamp,
                is_recalled=False
            ).exists()
            
            if subsequent_minutes:
                raise ValidationError({
                    "detail": "This minute cannot be recalled because subsequent actions have been taken on this correspondence."
                })
            
            # Fallback error (shouldn't reach here, but just in case)
            raise ValidationError({
                "detail": "This minute cannot be recalled."
            })
        
        # Check if user is the original sender
        if minute.user_id != request.user.id:
            raise ValidationError({
                "detail": "Only the original sender can recall this minute."
            })
        
        # Mark as recalled
        recall_reason = request.data.get("recall_reason", "")
        minute.is_recalled = True
        from django.utils import timezone as tz
        minute.recalled_at = tz.now()
        if recall_reason:
            minute.recall_reason = recall_reason
        minute.save(update_fields=["is_recalled", "recalled_at", "recall_reason"])
        
        # Invalidate digital seal if this minute had one
        if minute.seal_applied:
            seal = minute.seal_applied
            seal.is_valid = False
            seal.invalidated_at = tz.now()
            seal.invalidated_reason = f"Minute recalled by {request.user.get_full_name() or request.user.username}"
            seal.save(update_fields=["is_valid", "invalidated_at", "invalidated_reason"])
        
        # Mark all distribution entries linked to this minute as inactive
        # This ensures distribution recipients can't see the correspondence anymore
        CorrespondenceDistribution.objects.filter(
            minute=minute,
            is_active=True
        ).update(is_active=False)
        
        correspondence = minute.correspondence
        
        # If this was a routing minute (forward/minute/approve/treat) that routed the correspondence,
        # revert the routing back appropriately
        routing_actions = (Minute.ActionType.FORWARD, Minute.ActionType.MINUTE, Minute.ActionType.APPROVE, Minute.ActionType.TREAT)
        should_revert = False  # Initialize for case update logic
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
        
        # Notify distribution (CC) recipients about the recall
        # Distribution recipients should be aware that a minute they were copied on has been recalled
        from organization.models import OfficeMembership
        distribution_recipients = set()  # Use set to avoid duplicate notifications
        
        # Get all distribution items for this correspondence
        distribution_items = CorrespondenceDistribution.objects.filter(
            correspondence=correspondence
        ).select_related('added_by')
        
        for dist_item in distribution_items:
            # Find office heads for each distribution recipient
            office_heads = []
            
            if dist_item.division_id:
                # Get offices in this division
                from organization.models import Office
                division_offices = Office.objects.filter(
                    division_id=dist_item.division_id,
                    is_active=True
                )
                for office in division_offices:
                    office_head = OfficeMembership.objects.filter(
                        office=office,
                        is_active=True,
                        assignment_role__in=['principal', 'acting']
                    ).select_related('user').first()
                    if office_head:
                        office_heads.append(office_head.user)
            
            elif dist_item.department_id:
                # Get offices in this department
                from organization.models import Office
                dept_offices = Office.objects.filter(
                    department_id=dist_item.department_id,
                    is_active=True
                )
                for office in dept_offices:
                    office_head = OfficeMembership.objects.filter(
                        office=office,
                        is_active=True,
                        assignment_role__in=['principal', 'acting']
                    ).select_related('user').first()
                    if office_head:
                        office_heads.append(office_head.user)
            
            elif dist_item.directorate_id:
                # Get offices in this directorate
                from organization.models import Office
                dir_offices = Office.objects.filter(
                    directorate_id=dist_item.directorate_id,
                    is_active=True
                )
                for office in dir_offices:
                    office_head = OfficeMembership.objects.filter(
                        office=office,
                        is_active=True,
                        assignment_role__in=['principal', 'acting']
                    ).select_related('user').first()
                    if office_head:
                        office_heads.append(office_head.user)
            
            # Add office heads to distribution recipients set
            for user in office_heads:
                if user.id != request.user.id:  # Don't notify the person who recalled
                    distribution_recipients.add(user)
        
        # Send notifications to all distribution recipients
        for recipient in distribution_recipients:
            NotificationService.create_notification(
                recipient=recipient,
                title=f"Minute Recalled - {correspondence.reference_number}",
                message=f"{request.user.get_full_name() or request.user.username} has recalled a minute on correspondence: {correspondence.subject} that you were copied on.",
                notification_type=Notification.NotificationType.CORRESPONDENCE,
                priority=Notification.Priority.NORMAL,
                sender=request.user,
                module="correspondence",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
                action_url=f"/correspondence/{correspondence.id}",
                action_required=False,
            )
        
        # Update case if correspondence is linked to a case
        if correspondence.case:
            from correspondence.models import Case
            from correspondence.services import CaseService
            from django.utils import timezone
            
            case = correspondence.case
            
            # Check if there are any other active (non-recalled) minutes for this correspondence
            active_minutes_count = Minute.objects.filter(
                correspondence=correspondence,
                is_recalled=False
            ).count()
            
            # Update case's updated_at timestamp to reflect the change
            case.updated_at = timezone.now()
            case.save(update_fields=["updated_at"])
            
            # Log case activity
            AuditService.log_activity(
                user=request.user,
                action="minute_recalled_on_case",
                object_type="case",
                object_id=str(case.id),
                description=f"Minute recalled on correspondence {correspondence.reference_number} linked to case {case.case_number}",
                module="correspondence",
                metadata={
                    "minute_id": str(minute.id),
                    "correspondence_id": str(correspondence.id),
                    "recall_reason": recall_reason,
                    "active_minutes_remaining": active_minutes_count,
                },
            )
            
            # If routing was reverted and this was a significant action,
            # consider updating case status back to previous state
            if should_revert and minute.action_type in (Minute.ActionType.APPROVE, Minute.ActionType.TREAT):
                # If this was an approval or treatment that was recalled,
                # and routing was reverted, the case might need status update
                # Check if case status should be reverted
                if case.status == Case.Status.IN_PROGRESS and active_minutes_count == 0:
                    # No other active minutes, might want to keep status as is
                    # or revert based on business logic
                    pass
            
            # Notify case assignee about the minute recall
            if case.assigned_to and case.assigned_to_id != request.user.id:
                NotificationService.create_notification(
                    recipient=case.assigned_to,
                    title=f"Minute Recalled on Case {case.case_number}",
                    message=f"A minute on correspondence {correspondence.reference_number} linked to case {case.case_number} has been recalled by {request.user.get_full_name() or request.user.username}.",
                    notification_type=Notification.NotificationType.SYSTEM,
                    priority=Notification.Priority.NORMAL,
                    sender=request.user,
                    module="case_management",
                    related_object_type="case",
                    related_object_id=str(case.id),
                    action_url=f"/cases/{case.id}",
                    action_required=False,
                )
            
            # Evaluate workflow rules for the case
            CaseService.evaluate_workflow_rules(
                case,
                "minute_recalled",
                {
                    "minute_id": str(minute.id),
                    "minute_action_type": minute.action_type,
                    "recall_reason": recall_reason,
                    "routing_reverted": should_revert,
                    "active_minutes_remaining": active_minutes_count,
                }
            )
        
        # Build response with warning if minute was acknowledged
        serializer = self.get_serializer(minute)
        response_data = serializer.data
        
        # Add warning if minute was acknowledged
        if minute.acknowledged_at:
            response_data['warning'] = (
                f"This minute was acknowledged on {minute.acknowledged_at.strftime('%d %b %Y, %H:%M')}. "
                f"Recalling will remove it from the recipient's inbox."
            )
        
        return Response(response_data)

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


class ParallelRoutingGroupViewSet(viewsets.ModelViewSet):
    queryset = ParallelRoutingGroup.objects.select_related("correspondence", "created_by").distinct()
    serializer_class = ParallelRoutingGroupSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
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
    pagination_class = StandardPageNumberPagination
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
    pagination_class = StandardPageNumberPagination
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


class CorrespondenceDraftViewSet(viewsets.ModelViewSet):
    """
    API endpoint for correspondence drafts.
    Allows users to save and resume drafts for minutes and treatments.
    """
    queryset = CorrespondenceDraft.objects.select_related("correspondence", "user")
    serializer_class = CorrespondenceDraftSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["correspondence", "draft_type", "user"]
    search_fields = ["content", "subject"]

    def get_queryset(self):
        """Filter drafts to only show current user's drafts."""
        user = self.request.user
        qs = super().get_queryset()
        return qs.filter(user=user)

    def perform_create(self, serializer):
        """Set the user to the current user."""
        serializer.save(user=self.request.user)


class CaseViewSet(viewsets.ModelViewSet):
    """ViewSet for managing cases."""

    queryset = Case.objects.select_related(
        "created_by", "assigned_to", "owning_office", "current_office", "completion_package"
    ).prefetch_related(
        "correspondence_links__correspondence",
        "document_links__document",
        "form_links__form_document__document",
    )
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        "status",
        "case_type",
        "priority",
        "created_by",
        "assigned_to",
        "owning_office",
        "current_office",
    ]
    
    def get_queryset(self):
        """Override to add executive filtering for secretaries and scope-based filtering."""
        queryset = super().get_queryset()
        
        user = self.request.user
        role_name = getattr(getattr(user, "system_role", None), "name", "") or ""
        is_secretary = role_name.lower() == "secretary"
        is_superuser = getattr(user, "is_superuser", False) or role_name.lower() == "super admin"
        
        # Get scope parameter
        scope = self.request.query_params.get("scope", "personal")
        
        # Scope-based filtering (hierarchical access)
        if scope == "organization" or (is_superuser and scope == "all"):
            # MD or Super Admin: Show all cases (no filtering)
            pass
        elif scope == "directorate":
            # ED: Filter by directorate
            if user.directorate_id:
                # Cases in divisions that belong to this directorate
                from organization.models import Division
                division_ids = Division.objects.filter(
                    directorate_id=user.directorate_id
                ).values_list('id', flat=True)
                # Filter cases by division OR cases linked to correspondence in this directorate
                from correspondence.models import Correspondence, CaseCorrespondenceLink
                directorate_correspondence_ids = Correspondence.objects.filter(
                    directorate_id=user.directorate_id
                ).values_list('id', flat=True)
                case_ids_from_correspondence = CaseCorrespondenceLink.objects.filter(
                    correspondence_id__in=directorate_correspondence_ids
                ).values_list('case_id', flat=True).distinct()
                queryset = queryset.filter(
                    Q(division_id__in=division_ids) | Q(id__in=case_ids_from_correspondence)
                )
        elif scope == "division":
            # GM: Filter by division
            if user.division_id:
                # Cases in this division OR cases linked to correspondence in this division
                from correspondence.models import Correspondence, CaseCorrespondenceLink
                division_correspondence_ids = Correspondence.objects.filter(
                    division_id=user.division_id
                ).values_list('id', flat=True)
                case_ids_from_correspondence = CaseCorrespondenceLink.objects.filter(
                    correspondence_id__in=division_correspondence_ids
                ).values_list('case_id', flat=True).distinct()
                queryset = queryset.filter(
                    Q(division_id=user.division_id) | Q(id__in=case_ids_from_correspondence)
                )
        elif scope == "department":
            # AGM: Filter by department
            if user.department_id:
                # Cases in this department OR cases linked to correspondence in this department
                from correspondence.models import Correspondence, CaseCorrespondenceLink
                department_correspondence_ids = Correspondence.objects.filter(
                    department_id=user.department_id
                ).values_list('id', flat=True)
                case_ids_from_correspondence = CaseCorrespondenceLink.objects.filter(
                    correspondence_id__in=department_correspondence_ids
                ).values_list('case_id', flat=True).distinct()
                queryset = queryset.filter(
                    Q(department_id=user.department_id) | Q(id__in=case_ids_from_correspondence)
                )
        elif scope == "office":
            # Office cases: Filter by user's office memberships
            from organization.models import OfficeMembership
            user_office_ids = OfficeMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('office_id', flat=True)
            if user_office_ids:
                queryset = queryset.filter(
                    Q(owning_office_id__in=user_office_ids) | 
                    Q(current_office_id__in=user_office_ids)
                )
        elif scope == "my":
            # My cases: Assigned to user
            queryset = queryset.filter(assigned_to=user)
        # "personal" scope (default): My cases + Office cases (handled by frontend)
        
        # Executive filtering for secretaries
        executive_id = self.request.query_params.get("executive")
        if is_secretary and executive_id:
            # Filter cases where secretary has acted on behalf of this executive
            # via correspondence linked to cases
            from correspondence.models import Minute
            secretary_correspondence_ids = Minute.objects.filter(
                acted_by_secretary=True,
                performed_by=user,
                user_id=executive_id  # The executive the secretary acted for
            ).values_list('correspondence_id', flat=True).distinct()
            
            # Get cases linked to these correspondence
            case_ids = CaseCorrespondenceLink.objects.filter(
                correspondence_id__in=secretary_correspondence_ids
            ).values_list('case_id', flat=True).distinct()
            
            queryset = queryset.filter(id__in=case_ids)
        
        return queryset
    search_fields = ["case_number", "title", "description"]
    ordering_fields = ["opened_at", "closed_at", "priority", "status"]
    ordering = ["-opened_at"]

    def get_serializer_class(self):
        if self.action in ["retrieve", "update", "partial_update"]:
            return CaseDetailSerializer
        return super().get_serializer_class()

    def perform_create(self, serializer):
        # Auto-generate case number if not provided
        if not serializer.validated_data.get("case_number"):
            today = timezone.now().date()
            count = Case.all_objects.filter(opened_at__date=today).count() + 1
            serializer.validated_data["case_number"] = f"CASE/{today.strftime('%Y%m%d')}/{count:04d}"

        serializer.save(created_by=self.request.user)
        case = serializer.instance

        from audit.models import ActivityLog
        AuditService.log_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.CASE_CREATED,
            object_type="Case",
            object_id=str(case.id),
            object_repr=str(case),
            description=f"Created case: {case.case_number} - {case.title}",
            module="Case Management",
            severity="info",
        )
        
        # Send notifications
        # Notify assigned user if different from creator
        if case.assigned_to and case.assigned_to != self.request.user:
            NotificationService.create_notification(
                recipient=case.assigned_to,
                title=f"New Case Assigned: {case.case_number}",
                message=f"Case '{case.title}' has been assigned to you.",
                notification_type=Notification.NotificationType.SYSTEM,
                priority=Notification.Priority.HIGH if case.priority == "urgent" else Notification.Priority.NORMAL,
                sender=self.request.user,
                module="case_management",
                related_object_type="case",
                related_object_id=str(case.id),
                action_url=f"/cases/{case.id}",
                action_required=True,
            )

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        old_assigned_to = serializer.instance.assigned_to
        serializer.save()
        case = serializer.instance
        
        # Handle status changes
        if old_status != case.status:
            from audit.models import ActivityLog
            AuditService.log_activity(
                user=self.request.user,
                action=ActivityLog.ActionType.CASE_UPDATED,
                object_type="Case",
                object_id=str(case.id),
                object_repr=str(case),
                description=f"Case '{case.title}' ({case.case_number}) status changed from {old_status} to {case.status}.",
                module="Case Management",
                severity="info",
            )
            
            # Notify via CaseService.update_case_status (which handles notifications)
            # But we need to call it here since perform_update doesn't call the action
            from correspondence.services import CaseService
            CaseService.update_case_status(case, case.status, updated_by=self.request.user)
        
        # Handle assignment changes
        if old_assigned_to != case.assigned_to:
            # Notify new assignee
            if case.assigned_to:
                NotificationService.create_notification(
                    recipient=case.assigned_to,
                    title=f"Case Assigned: {case.case_number}",
                    message=f"Case '{case.title}' has been assigned to you.",
                    notification_type=Notification.NotificationType.SYSTEM,
                    priority=Notification.Priority.HIGH if case.priority == "urgent" else Notification.Priority.NORMAL,
                    sender=self.request.user,
                    module="case_management",
                    related_object_type="case",
                    related_object_id=str(case.id),
                    action_url=f"/cases/{case.id}",
                    action_required=True,
                )
            
            # Notify previous assignee if unassigned
            if old_assigned_to and old_assigned_to != case.assigned_to:
                NotificationService.create_notification(
                    recipient=old_assigned_to,
                    title=f"Case Unassigned: {case.case_number}",
                    message=f"Case '{case.title}' has been unassigned from you.",
                    notification_type=Notification.NotificationType.SYSTEM,
                    priority=Notification.Priority.NORMAL,
                    sender=self.request.user,
                    module="case_management",
                    related_object_type="case",
                    related_object_id=str(case.id),
                    action_url=f"/cases/{case.id}",
                    action_required=False,
                )

    @action(detail=True, methods=["post"], url_path="link_correspondence")
    def link_correspondence(self, request, pk=None):
        case = self.get_object()
        correspondence_id = request.data.get("correspondence_id")
        is_primary = request.data.get("is_primary", False)
        notes = request.data.get("notes", "")
        if not correspondence_id:
            raise ValidationError({"detail": "Correspondence ID is required."})
        try:
            correspondence = Correspondence.objects.get(id=correspondence_id)
        except Correspondence.DoesNotExist:
            raise ValidationError({"detail": "Correspondence not found."})

        link = CaseService.link_correspondence_to_case(case, correspondence, is_primary, notes)
        return Response(CaseCorrespondenceLinkSerializer(link).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="link_document")
    def link_document(self, request, pk=None):
        case = self.get_object()
        document_id = request.data.get("document_id")
        notes = request.data.get("notes", "")
        if not document_id:
            raise ValidationError({"detail": "Document ID is required."})
        try:
            from dms.models import Document
            document = Document.objects.get(id=document_id)
        except Document.DoesNotExist:
            raise ValidationError({"detail": "Document not found."})

        link = CaseService.link_document_to_case(case, document, notes)
        from .serializers import CaseDocumentLinkSerializer
        return Response(CaseDocumentLinkSerializer(link).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="link_form")
    def link_form(self, request, pk=None):
        case = self.get_object()
        form_document_id = request.data.get("form_document_id")
        notes = request.data.get("notes", "")
        if not form_document_id:
            raise ValidationError({"detail": "Form Document ID is required."})
        try:
            from dms.models import FormDocument
            form_document = FormDocument.objects.get(id=form_document_id)
        except FormDocument.DoesNotExist:
            raise ValidationError({"detail": "Form Document not found."})

        link = CaseService.link_form_to_case(case, form_document, notes)
        return Response(CaseFormLinkSerializer(link).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="secretary-executives")
    def secretary_executives(self, request):
        """Get list of executives that the secretary has acted on behalf of."""
        user = request.user
        role_name = getattr(getattr(user, "system_role", None), "name", "") or ""
        is_secretary = role_name.lower() == "secretary"
        
        if not is_secretary:
            return Response(
                {"detail": "This endpoint is only available for secretaries."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get distinct executives (users) that secretary has acted for
        from correspondence.models import Minute
        executive_ids = Minute.objects.filter(
            acted_by_secretary=True,
            performed_by=user
        ).values_list('user_id', flat=True).distinct()
        
        # Get user details
        executives = User.objects.filter(id__in=executive_ids).values(
            'id', 'first_name', 'last_name', 'email', 'username'
        )
        
        executives_list = [
            {
                'id': str(exec['id']),
                'name': f"{exec['first_name']} {exec['last_name']}".strip() or exec['username'],
                'email': exec['email'],
            }
            for exec in executives
        ]
        
        return Response(executives_list)

    def perform_create(self, serializer):
        case = serializer.save(created_by=self.request.user)
        
        # Create default SLA
        CaseService.create_case_sla(case)
        
        # Evaluate workflow rules
        CaseService.evaluate_workflow_rules(case, "status_change", {"new_status": case.status})
    
    @action(detail=True, methods=["get"], url_path="sla-status")
    def sla_status(self, request, pk=None):
        """Get SLA status for a case."""
        case = self.get_object()
        sla_data = CaseService.check_case_sla(case)
        return Response(sla_data)
    
    @action(detail=True, methods=["post"], url_path="update-status")
    def update_status(self, request, pk=None):
        case = self.get_object()
        new_status = request.data.get("status")
        if not new_status:
            raise ValidationError({"detail": "New status is required."})
        try:
            old_status = case.status
            updated_case = CaseService.update_case_status(case, new_status, user=request.user)
            
            # Evaluate workflow rules
            CaseService.evaluate_workflow_rules(case, "status_change", {"old_status": old_status, "new_status": new_status})
            
            # Check SLA
            CaseService.check_case_sla(case)
            
            return Response(self.get_serializer(updated_case).data)
        except ValueError as e:
            raise ValidationError({"detail": str(e)})

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        """Get or create comments for a case."""
        case = self.get_object()
        from correspondence.models import CaseComment
        from correspondence.serializers import CaseCommentSerializer
        
        if request.method == "GET":
            # Get all comments for this case
            comments = CaseComment.objects.filter(case=case, parent__isnull=True).select_related(
                "author", "resolved_by"
            ).prefetch_related("mentions", "replies__author", "replies__mentions").order_by("-created_at")
            serializer = CaseCommentSerializer(comments, many=True)
            return Response(serializer.data)
        else:
            # Create new comment
            serializer = CaseCommentSerializer(data={
                **request.data,
                "case": str(case.id),
                "author": str(request.user.id),
            })
            serializer.is_valid(raise_exception=True)
            comment = serializer.save(author=request.user)
            
            # Handle mentions
            mentions = request.data.get("mentions", [])
            if mentions:
                from accounts.models import User
                mention_users = User.objects.filter(id__in=mentions)
                comment.mentions.set(mention_users)
                
                # Send notifications to mentioned users
                from notifications.models import Notification
                from notifications.services import NotificationService
                for user in mention_users:
                    NotificationService.create_notification(
                        recipient=user,
                        title=f"Mentioned in Case: {case.case_number}",
                        message=f"{request.user.get_full_name() or request.user.username} mentioned you in a comment on case '{case.title}'.",
                        notification_type=Notification.NotificationType.SYSTEM,
                        priority=Notification.Priority.NORMAL,
                        sender=request.user,
                        module="case_management",
                        related_object_type="case",
                        related_object_id=str(case.id),
                        action_url=f"/cases/{case.id}",
                        action_required=False,
                    )
            
            # Notify case assignee if different from comment author
            if case.assigned_to and case.assigned_to != request.user:
                NotificationService.create_notification(
                    recipient=case.assigned_to,
                    title=f"New Comment on Case: {case.case_number}",
                    message=f"{request.user.get_full_name() or request.user.username} added a comment on case '{case.title}'.",
                    notification_type=Notification.NotificationType.SYSTEM,
                    priority=Notification.Priority.NORMAL,
                    sender=request.user,
                    module="case_management",
                    related_object_type="case",
                    related_object_id=str(case.id),
                    action_url=f"/cases/{case.id}",
                    action_required=False,
                )
            
            return Response(CaseCommentSerializer(comment).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=["post"], url_path="export")
    def export_case(self, request, pk=None):
        """Export case data as JSON."""
        case = self.get_object()
        from correspondence.models import CaseCorrespondenceLink, CaseDocumentLink, CaseFormLink, CaseComment
        
        # Get all related data
        correspondence_links = CaseCorrespondenceLink.objects.filter(case=case).select_related("correspondence")
        document_links = CaseDocumentLink.objects.filter(case=case).select_related("document")
        form_links = CaseFormLink.objects.filter(case=case).select_related("form_document__document", "form_document__template")
        comments = CaseComment.objects.filter(case=case).select_related("author", "resolved_by").prefetch_related("mentions")
        
        export_data = {
            "case": {
                "case_number": case.case_number,
                "title": case.title,
                "description": case.description,
                "case_type": case.case_type,
                "status": case.status,
                "priority": case.priority,
                "tags": case.tags,
                "metadata": case.metadata,
                "opened_at": case.opened_at.isoformat() if case.opened_at else None,
                "resolved_at": case.resolved_at.isoformat() if case.resolved_at else None,
                "closed_at": case.closed_at.isoformat() if case.closed_at else None,
            },
            "correspondence": [
                {
                    "reference_number": link.correspondence.reference_number,
                    "subject": link.correspondence.subject,
                    "is_primary": link.is_primary,
                    "notes": link.notes,
                }
                for link in correspondence_links
            ],
            "documents": [
                {
                    "title": link.document.title,
                    "reference_number": link.document.reference_number,
                    "document_type": link.document.document_type,
                    "notes": link.notes,
                }
                for link in document_links
            ],
            "forms": [
                {
                    "title": link.form_document.document.title,
                    "template": link.form_document.template.name if link.form_document.template else None,
                    "status": link.form_document.status,
                    "notes": link.notes,
                }
                for link in form_links
            ],
            "comments": [
                {
                    "author": comment.author.get_full_name() if comment.author else "Unknown",
                    "content": comment.content,
                    "created_at": comment.created_at.isoformat(),
                    "is_resolved": comment.is_resolved,
                }
                for comment in comments
            ],
            "exported_at": timezone.now().isoformat(),
            "exported_by": request.user.get_full_name() or request.user.username,
        }
        
        return Response(export_data)
    
    @action(detail=False, methods=["post"], url_path="import")
    def import_cases(self, request):
        """Import cases from JSON data."""
        import_data = request.data
        
        if not isinstance(import_data, list):
            import_data = [import_data]
        
        results = {
            "imported": 0,
            "failed": 0,
            "errors": [],
        }
        
        for case_data in import_data:
            try:
                # Validate required fields
                if "case_number" not in case_data:
                    results["failed"] += 1
                    results["errors"].append("Missing case_number")
                    continue
                
                # Check if case already exists
                if Case.objects.filter(case_number=case_data["case_number"]).exists():
                    results["failed"] += 1
                    results["errors"].append(f"Case {case_data['case_number']} already exists")
                    continue
                
                # Create case
                case_serializer = CaseSerializer(data=case_data)
                case_serializer.is_valid(raise_exception=True)
                case = case_serializer.save(created_by=request.user)
                
                results["imported"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(str(e))
        
        return Response(results, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=["post"], url_path="generate-completion-package")
    def generate_completion_package(self, request, pk=None):
        case = self.get_object()
        try:
            completion_doc = CaseService.generate_case_completion_package(case, triggered_by=request.user)
            return Response(
                {"message": "Completion package generated successfully.", "document_id": str(completion_doc.id)},
                status=status.HTTP_200_OK,
            )
        except ValueError as e:
            raise ValidationError({"detail": str(e)})
        except Exception as e:
            logger.error(f"Error generating case completion package for case {case.id}: {e}", exc_info=True)
            raise ValidationError({"detail": "Failed to generate completion package."})

    @action(detail=True, methods=["delete"], url_path="unlink_correspondence")
    def unlink_correspondence(self, request, pk=None):
        case = self.get_object()
        correspondence_id = request.data.get("correspondence_id")
        if not correspondence_id:
            raise ValidationError({"detail": "Correspondence ID is required."})
        try:
            link = CaseCorrespondenceLink.objects.get(case=case, correspondence_id=correspondence_id)
            link.delete()
            from audit.models import ActivityLog
            AuditService.log_activity(
                user=request.user,
                action=ActivityLog.ActionType.CASE_UPDATED,
                object_type="Case",
                object_id=str(case.id),
                object_repr=str(case),
                description=f"Unlinked correspondence from case {case.case_number}.",
                module="Case Management",
                severity="info",
            )
            return Response({"message": "Correspondence unlinked successfully."}, status=status.HTTP_200_OK)
        except CaseCorrespondenceLink.DoesNotExist:
            raise ValidationError({"detail": "Link not found."})

    @action(detail=True, methods=["delete"], url_path="unlink_document")
    def unlink_document(self, request, pk=None):
        case = self.get_object()
        document_id = request.data.get("document_id")
        if not document_id:
            raise ValidationError({"detail": "Document ID is required."})
        try:
            link = CaseDocumentLink.objects.get(case=case, document_id=document_id)
            link.delete()
            from audit.models import ActivityLog
            AuditService.log_activity(
                user=request.user,
                action=ActivityLog.ActionType.CASE_UPDATED,
                object_type="Case",
                object_id=str(case.id),
                object_repr=str(case),
                description=f"Unlinked document from case {case.case_number}.",
                module="Case Management",
                severity="info",
            )
            return Response({"message": "Document unlinked successfully."}, status=status.HTTP_200_OK)
        except CaseDocumentLink.DoesNotExist:
            raise ValidationError({"detail": "Link not found."})

    @action(detail=True, methods=["delete"], url_path="unlink_form")
    def unlink_form(self, request, pk=None):
        case = self.get_object()
        form_document_id = request.data.get("form_document_id")
        if not form_document_id:
            raise ValidationError({"detail": "Form Document ID is required."})
        try:
            link = CaseFormLink.objects.get(case=case, form_document_id=form_document_id)
            link.delete()
            from audit.models import ActivityLog
            AuditService.log_activity(
                user=request.user,
                action=ActivityLog.ActionType.CASE_UPDATED,
                object_type="Case",
                object_id=str(case.id),
                object_repr=str(case),
                description=f"Unlinked form from case {case.case_number}.",
                module="Case Management",
                severity="info",
            )
            return Response({"message": "Form unlinked successfully."}, status=status.HTTP_200_OK)
        except CaseFormLink.DoesNotExist:
            raise ValidationError({"detail": "Link not found."})


class CaseTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing case templates."""
    
    queryset = CaseTemplate.objects.filter(is_deleted=False)
    serializer_class = CaseTemplateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["case_type", "is_active"]
    search_fields = ["name", "description", "slug"]
    ordering_fields = ["name", "usage_count", "created_at"]
    ordering = ["case_type", "name"]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=["post"], url_path="create-case")
    def create_case_from_template(self, request, pk=None):
        """Create a case from this template."""
        template = self.get_object()
        case_data = request.data.copy()
        
        # Apply template defaults
        case_data.setdefault("case_type", template.case_type)
        case_data.setdefault("priority", template.default_priority)
        
        # Apply template structure defaults
        structure = template.structure or {}
        default_fields = structure.get("default_fields", {})
        if "title" not in case_data and "title" in default_fields:
            case_data["title"] = default_fields["title"]
        if "description" not in case_data and "description" in default_fields:
            case_data["description"] = default_fields["description"]
        if "tags" not in case_data and "tags" in default_fields:
            case_data["tags"] = default_fields["tags"]
        if "metadata" not in case_data and "metadata" in default_fields:
            case_data["metadata"] = default_fields["metadata"]
        
        # Create case
        serializer = CaseSerializer(data=case_data)
        serializer.is_valid(raise_exception=True)
        case = serializer.save(created_by=request.user, template=template)
        
        # Increment template usage
        template.increment_usage()
        
        return Response(CaseSerializer(case).data, status=status.HTTP_201_CREATED)


class CaseCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing case comments."""
    
    queryset = CaseComment.objects.all()
    serializer_class = CaseCommentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["case", "author", "is_resolved", "parent"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        case_id = self.request.query_params.get("case")
        if case_id:
            queryset = queryset.filter(case_id=case_id)
        return queryset.select_related("author", "resolved_by", "case").prefetch_related("mentions", "replies")
    
    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        
        # Handle mentions
        mentions = self.request.data.get("mentions", [])
        if mentions:
            from accounts.models import User
            mention_users = User.objects.filter(id__in=mentions)
            comment.mentions.set(mention_users)
            
            # Send notifications
            from notifications.models import Notification
            from notifications.services import NotificationService
            for user in mention_users:
                NotificationService.create_notification(
                    recipient=user,
                    title=f"Mentioned in Case: {comment.case.case_number}",
                    message=f"{self.request.user.get_full_name() or self.request.user.username} mentioned you in a comment on case '{comment.case.title}'.",
                    notification_type=Notification.NotificationType.SYSTEM,
                    priority=Notification.Priority.NORMAL,
                    sender=self.request.user,
                    module="case_management",
                    related_object_type="case",
                    related_object_id=str(comment.case.id),
                    action_url=f"/cases/{comment.case.id}",
                    action_required=False,
                )
        
        # Notify case assignee
        if comment.case.assigned_to and comment.case.assigned_to != self.request.user:
            NotificationService.create_notification(
                recipient=comment.case.assigned_to,
                title=f"New Comment on Case: {comment.case.case_number}",
                message=f"{self.request.user.get_full_name() or self.request.user.username} added a comment on case '{comment.case.title}'.",
                notification_type=Notification.NotificationType.SYSTEM,
                priority=Notification.Priority.NORMAL,
                sender=self.request.user,
                module="case_management",
                related_object_type="case",
                related_object_id=str(comment.case.id),
                action_url=f"/cases/{comment.case.id}",
                action_required=False,
            )
    
    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve_comment(self, request, pk=None):
        """Mark a comment as resolved."""
        comment = self.get_object()
        comment.resolve(request.user)
        return Response(CaseCommentSerializer(comment).data)
    
    @action(detail=True, methods=["post"], url_path="unresolve")
    def unresolve_comment(self, request, pk=None):
        """Mark a comment as unresolved."""
        comment = self.get_object()
        comment.unresolve()
        return Response(CaseCommentSerializer(comment).data)


class CaseWorkflowRuleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing case workflow rules."""
    
    queryset = CaseWorkflowRule.objects.all()
    serializer_class = CaseWorkflowRuleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["case_type", "priority", "trigger_type", "action_type", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["priority_order", "name", "created_at"]
    ordering = ["priority_order", "name"]


class CaseSLAViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing case SLA information."""
    
    queryset = CaseSLA.objects.all()
    serializer_class = CaseSLASerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["case", "breached"]
    ordering_fields = ["target_date", "created_at"]
    ordering = ["target_date"]


class CorrespondenceTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing correspondence/minute content templates."""
    
    queryset = CorrespondenceTemplate.objects.all()
    serializer_class = CorrespondenceTemplateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["scope", "scope_id", "template_type", "is_active", "is_default"]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "scope", "template_type", "created_at"]
    ordering = ["scope", "scope_id", "template_type", "title"]
    
    def get_queryset(self):
        """Filter templates based on user permissions and scope."""
        qs = super().get_queryset()
        user = self.request.user
        
        # Superusers can see all templates
        if user.is_superuser:
            return qs
        
        # Regular users can see:
        # - Organization-wide templates
        # - Templates for their directorate/division/department
        # - Their personal templates
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
        """Set the creator and updater when creating a template."""
        serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user
        )
    
    def perform_update(self, serializer):
        """Set the updater when updating a template."""
        serializer.save(updated_by=self.request.user)


class DispatchRecordViewSet(viewsets.ModelViewSet):
    queryset = DispatchRecord.objects.select_related("dispatched_by", "acknowledged_by")
    serializer_class = DispatchRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["correspondence", "dispatch_mode"]

    def perform_create(self, serializer):
        serializer.save(dispatched_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="mark-acknowledged")
    def mark_acknowledged(self, request, pk=None):
        record = self.get_object()
        record.acknowledged_date = request.data.get("acknowledged_date", timezone.now().date())
        record.acknowledged_by = request.user
        record.save(update_fields=["acknowledged_date", "acknowledged_by"])
        return Response(DispatchRecordSerializer(record, context={"request": request}).data)


class CaseCorrespondenceLinkViewSet(viewsets.ModelViewSet):
    queryset = CaseCorrespondenceLink.objects.select_related("case", "correspondence")
    serializer_class = CaseCorrespondenceLinkSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["case", "correspondence", "is_primary"]

"""API endpoints for minutes and parallel routing."""

from __future__ import annotations

import logging
import traceback

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from audit.models import ActivityLog
from audit.services import AuditService
from common.pagination import StandardPageNumberPagination
from notifications.models import Notification
from notifications.services import NotificationService
from organization.models import Office, OfficeMembership

from .models import (
    Case,
    CaseCorrespondenceLink,
    Correspondence,
    CorrespondenceDistribution,
    Minute,
    ParallelRoutingGroup,
)
from .serializers import MinuteSerializer, ParallelRoutingGroupSerializer
from .services import (
    CaseService,
    CorrespondenceDocumentService,
    ExecutiveApprovalPDFService,
    MinuteRouterService,
    MinuteSealService,
    ParallelBranchService,
    validate_workflow_vs_requirement,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class MinuteViewSet(viewsets.ModelViewSet):
    queryset = Minute.objects.select_related("correspondence", "user", "seal_applied", "seal_applied__sealed_by", "seal_applied__signature_used")
    serializer_class = MinuteSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["correspondence", "user", "action_type", "direction", "approval_level", "approval_role", "from_office", "to_office"]
    ordering_fields = ["timestamp", "step_number"]
    ordering = ["timestamp"]

    def get_queryset(self):
        queryset = super().get_queryset()
        has_seal = self.request.query_params.get('has_seal')
        if has_seal is not None:
            has_seal_bool = has_seal.lower() in ('true', '1', 'yes')
            if has_seal_bool:
                queryset = queryset.filter(
                    seal_applied__isnull=False,
                    seal_applied__is_valid=True
                )
            else:
                queryset = queryset.filter(seal_applied__isnull=True)
        else:
            has_seal_bool = False
        approval_level = self.request.query_params.get('approval_level')
        if approval_level:
            queryset = queryset.filter(approval_level=approval_level)
        approval_role = self.request.query_params.get('approval_role')
        if approval_role:
            queryset = queryset.filter(approval_role=approval_role)
        from_office_param = self.request.query_params.get('from_office') or self.request.query_params.get('from_office_id')
        if from_office_param:
            queryset = queryset.filter(from_office_id=from_office_param)
        # Directorate → Division → Department scoping for approvals (and sealed views).
        # MD / Superuser see all. ED sees directorate, GM sees division, AGM/staff sees department.
        # This makes /approvals org-scoped rather than global.
        user = getattr(self.request, "user", None)
        is_register_query = (has_seal is not None and has_seal_bool) or (approval_level is not None) or (approval_role is not None)
        if user and getattr(user, "is_authenticated", False):
            is_super = bool(getattr(user, "is_superuser", False))
            role_name = getattr(getattr(user, "system_role", None), "name", "") or ""
            grade = (getattr(user, "grade_level", "") or "").upper()
            is_md = grade == "MDCS" or "managing director" in role_name.lower() or role_name.strip().lower() == "md"
            if is_super or is_md:
                pass
            elif is_register_query:
                # Only scope the approvals/sealed listing; keep other minute lists unscoped
                # (inbox, pending_approvals, detail views) to avoid breaking routing flows.
                if getattr(user, "department_id", None):
                    queryset = queryset.filter(
                        Q(from_office__department_id=user.department_id)
                        | Q(correspondence__department_id=user.department_id)
                        | Q(correspondence__owning_office__department_id=user.department_id)
                    )
                elif getattr(user, "division_id", None):
                    queryset = queryset.filter(
                        Q(from_office__division_id=user.division_id)
                        | Q(correspondence__division_id=user.division_id)
                        | Q(correspondence__owning_office__division_id=user.division_id)
                    )
                elif getattr(user, "directorate_id", None):
                    queryset = queryset.filter(
                        Q(from_office__directorate_id=user.directorate_id)
                        | Q(correspondence__owning_office__directorate_id=user.directorate_id)
                        | Q(correspondence__division__directorate_id=user.directorate_id)
                    )
                else:
                    # No org assignment (test accounts) — show nothing rather than everything
                    queryset = queryset.none()
        return queryset

    @action(detail=False, methods=["get"], url_path="pending-approvals")
    def pending_approvals(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_approvals")
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        minute = serializer.instance
        if minute:
            minute = Minute.objects.select_related(
                "seal_applied", "seal_applied__sealed_by", "seal_applied__signature_used"
            ).get(pk=minute.pk)
            serializer = self.get_serializer(minute)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        action_type = serializer.validated_data.get("action_type", "minute")
        correspondence = serializer.validated_data.get("correspondence")
        # Unified gate: permission + scope + turn/delegation/CC for approve
        if correspondence is not None and action_type == "approve":
            MinuteRouterService.check_permissions(self.request.user, action_type, correspondence=correspondence, request=self.request)
        else:
            MinuteRouterService.check_permissions(self.request.user, action_type, correspondence=correspondence, request=self.request)

        if correspondence is None:
            correspondence = serializer.validated_data["correspondence"]
        if correspondence.status == Correspondence.Status.COMPLETED:
            raise ValidationError({"detail": "Completed correspondence cannot be updated."})
        current_office = correspondence.current_office

        to_user = serializer.validated_data.get("to_user")
        to_office = serializer.validated_data.get("to_office")
        from_office = serializer.validated_data.get("from_office") or current_office
        MinuteRouterService.prevent_self_loop(self.request.user, to_user, to_office, from_office)

        # Workflow step constraint — fail on mismatch, don't silently bypass
        # Validate that workflow configuration can satisfy correspondence's required approval level
        # If template is explicitly provided, validate against it; otherwise validate global config
        _workflow_template = serializer.validated_data.get("workflow_template") or serializer.validated_data.get("template")
        if _workflow_template is not None and isinstance(_workflow_template, str):
            from workflow.models import WorkflowTemplate

            try:
                _workflow_template = WorkflowTemplate.objects.get(id=_workflow_template)
            except WorkflowTemplate.DoesNotExist:
                _workflow_template = None
        # When no explicit template, pass None to trigger global check (any executive template exists?)
        # Also try to resolve a specific template if correspondence has workflow_template attr
        if _workflow_template is None and hasattr(correspondence, "workflow_template") and getattr(correspondence, "workflow_template", None):
            _workflow_template = getattr(correspondence, "workflow_template")
        validate_workflow_vs_requirement(correspondence, _workflow_template)

        # For approve actions, map approval_level/approval_role before save; enforce MD-only and minute_text
        if action_type == "approve":
            # Ensure minute_text present (serializer already validates, but double-check for service-level callers)
            minute_text = serializer.validated_data.get("minute_text", "")
            if not minute_text or not str(minute_text).strip():
                raise ValidationError({"minute_text": "Minute text is required for approval/endorsement."})
            # Determine expected levels and inject if client did not provide or provided inconsistent values
            expected_level, expected_role = MinuteRouterService.resolve_approval_levels(self.request.user, correspondence)
            # If client provided explicit levels, validate they match expected or MD-only
            provided_level = serializer.validated_data.get("approval_level")
            provided_role = serializer.validated_data.get("approval_role")
            if provided_level or provided_role:
                # Reject EXECUTIVE+ENDORSEMENT universally
                if provided_level == "executive" and provided_role == "endorsement":
                    raise ValidationError({"approval_role": "EXECUTIVE+ENDORSEMENT is not allowed."})
                # If client tries to claim EXECUTIVE+APPROVAL without being MD
                if provided_level == "executive" and provided_role == "approval" and not MinuteRouterService._is_md(self.request.user):
                    try:
                        AuditService.log_correspondence_activity(
                            user=self.request.user,
                            action=ActivityLog.ActionType.CORRESPONDENCE_REJECTED,
                            correspondence=correspondence,
                            request=self.request,
                            description=f"Approval denied – MD only for EXECUTIVE+APPROVAL ({self.request.user.username})",
                            metadata={"reason": "md_only", "provided_level": provided_level, "provided_role": provided_role},
                        )
                    except Exception:
                        pass
                    from rest_framework.exceptions import PermissionDenied as _PermissionDenied

                    raise _PermissionDenied({"detail": "Only MD can perform EXECUTIVE+APPROVAL.", "reason": "md_only"})
                # Otherwise enforce expected mapping if client provided mismatched (optional – we override)
                # Use provided values if they match invariant, else override to expected
                if provided_level != expected_level or provided_role != expected_role:
                    # If mismatch but not MD-only violation, override to expected (GM endorsement case)
                    # For GM trying to force EXECUTIVE+APPROVAL we already rejected above
                    serializer.validated_data["approval_level"] = expected_level
                    serializer.validated_data["approval_role"] = expected_role
            else:
                serializer.validated_data["approval_level"] = expected_level
                serializer.validated_data["approval_role"] = expected_role

        minute, _ = MinuteRouterService.save_minute_with_delegation(
            serializer, self.request, correspondence, from_office,
        )

        try:
            CorrespondenceDocumentService.grant_document_access_for_minute(minute)
        except Exception as e:
            logger.error(f"Failed to auto-grant document access for minute {minute.id}: {str(e)}", exc_info=True)

        correspondence = minute.correspondence

        if MinuteRouterService.handle_consultation_response(minute, self.request, correspondence):
            return

        parallel_group_completed = False
        original_sender = None

        parallel_minutes_to_user = ParallelBranchService.inherit_branch_tracking(
            minute, self.request, correspondence,
        )

        ParallelBranchService.set_branch_originator(minute)
        ParallelBranchService.set_response_deadline(minute, correspondence)

        branch_originator_to_route_to = None
        if parallel_minutes_to_user.exists():
            branch_originator_to_route_to = ParallelBranchService.find_branch_originator(parallel_minutes_to_user)

        is_top_level_branch = ParallelBranchService.is_top_level_branch(minute)
        is_completing_parallel_branch = False
        office_updated = False
        approver_updated = False
        recipient_user = None

        if branch_originator_to_route_to and branch_originator_to_route_to.id != self.request.user.id:
            merge_strategy = ParallelBranchService.get_merge_strategy(minute, parallel_minutes_to_user)
            is_completing = (
                (minute.action_type == Minute.ActionType.APPROVE and not minute.to_office)
                or (minute.action_type in [Minute.ActionType.MINUTE, Minute.ActionType.FORWARD] and not minute.to_office)
            )
            if is_completing and merge_strategy == "independent":
                if ParallelBranchService.route_completing_branch(
                    minute, correspondence, branch_originator_to_route_to, self.request.user,
                ):
                    is_completing_parallel_branch = True
                    office_updated = True
                    approver_updated = True

        elif minute.action_type == Minute.ActionType.REJECT:
            recipient_user = MinuteRouterService.resolve_reject_target(minute, correspondence)

        elif minute.action_type in (Minute.ActionType.FORWARD, Minute.ActionType.MINUTE, Minute.ActionType.APPROVE):
            recipient_user, _ = MinuteRouterService.resolve_forward_target(minute)

        _office_updated, _approver_updated = MinuteRouterService.update_correspondence_routing(
            minute, correspondence, current_office, recipient_user,
            is_completing_parallel_branch, is_top_level_branch,
        )
        office_updated = office_updated or _office_updated
        approver_updated = approver_updated or _approver_updated

        if office_updated or approver_updated:
            update_fields = ["updated_at"]
            if office_updated:
                update_fields.append("current_office")
            if approver_updated:
                update_fields.append("current_approver")
                if correspondence.acting_appointment_id is not None:
                    update_fields.append("acting_appointment")
                if correspondence.acting_original_approver_id is not None:
                    update_fields.append("acting_original_approver")
            correspondence.save(update_fields=update_fields)

        parallel_group_completed, original_sender = ParallelBranchService.check_and_handle_completion(
            minute, correspondence, self.request.user,
        )

        audit_action_type = ActivityLog.ActionType.CORRESPONDENCE_MINUTED
        if minute.action_type == Minute.ActionType.APPROVE:
            audit_action_type = ActivityLog.ActionType.CORRESPONDENCE_APPROVED
        elif minute.action_type == Minute.ActionType.REJECT:
            audit_action_type = ActivityLog.ActionType.CORRESPONDENCE_REJECTED
        elif minute.action_type == Minute.ActionType.TREAT:
            audit_action_type = ActivityLog.ActionType.CORRESPONDENCE_ROUTED

        AuditService.log_correspondence_activity(
            user=self.request.user,
            action=audit_action_type,
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

        MinuteSealService.apply_if_eligible(minute, self.request.user, correspondence, self.request, action_type)

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
        from correspondence.services import ExecutiveApprovalPDFService
        from django.http import HttpResponse
        import traceback

        minute = self.get_object()

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
        minute = self.get_object()

        if not minute.can_be_edited():
            raise ValidationError({
                "detail": "This minute cannot be edited. It has either been opened/acted upon or the 30-minute window has expired."
            })

        if minute.user_id != request.user.id:
            raise ValidationError({
                "detail": "Only the original sender can edit this minute."
            })

        if not minute.is_edited:
            minute.original_minute_text = minute.minute_text
            minute.is_edited = True

        edit_entry = {
            "edited_at": timezone.now().isoformat(),
            "edited_by": str(request.user.id),
            "old_text": minute.minute_text,
            "new_text": request.data.get("minute_text", minute.minute_text),
        }
        minute.edit_history.append(edit_entry)

        serializer = self.get_serializer(minute, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        minute = serializer.save(edited_at=timezone.now())

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

        if minute.parallel_group_id:
            try:
                parallel_group = ParallelRoutingGroup.objects.get(id=minute.parallel_group_id)
                parallel_group.check_and_update_completion()
            except ParallelRoutingGroup.DoesNotExist:
                pass

        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="versions")
    def versions(self, request, pk=None):
        minute = self.get_object()
        versions_payload = []

        if minute.is_edited:
            versions_payload.append({
                "version": 1,
                "minute_text": minute.original_minute_text,
                "edited_at": None,
                "edited_by": None,
                "is_original": True,
            })
            for idx, entry in enumerate(minute.edit_history):
                versions_payload.append({
                    "version": idx + 2,
                    "minute_text": entry.get("new_text", ""),
                    "edited_at": entry.get("edited_at"),
                    "edited_by": entry.get("edited_by"),
                    "is_original": False,
                })
        else:
            versions_payload.append({
                "version": 1,
                "minute_text": minute.minute_text,
                "edited_at": None,
                "edited_by": None,
                "is_original": True,
            })

        return Response({
            "minute_id": str(minute.id),
            "is_edited": minute.is_edited,
            "edit_count": len(minute.edit_history),
            "current_version": len(minute.edit_history) + 1 if minute.is_edited else 1,
            "versions": versions_payload,
        })

    @action(detail=True, methods=["post"], url_path="mark-opened")
    def mark_opened(self, request, pk=None):
        minute = self.get_object()

        update_fields = []
        if not minute.is_opened:
            minute.is_opened = True
            minute.opened_at = timezone.now()
            update_fields.extend(["is_opened", "opened_at"])

        if not minute.acknowledged_at:
            minute.acknowledged_at = timezone.now()
            update_fields.append("acknowledged_at")

        if not minute.dispatched_at:
            minute.dispatched_at = minute.timestamp
            update_fields.append("dispatched_at")

        if update_fields:
            minute.save(update_fields=update_fields)

        return Response({"status": "marked_as_opened"})

    @action(detail=True, methods=["post"], url_path="recall")
    def recall(self, request, pk=None):
        minute = self.get_object()
        is_md_or_super = bool(
            getattr(request.user, "is_superuser", False)
            or (getattr(getattr(request.user, "system_role", None), "name", "") or "").lower() == "managing director"
        )

        if not is_md_or_super and not minute.can_be_recalled():
            # Distinguish already-recalled vs window/acknowledged/downstream
            if minute.is_recalled:
                raise ValidationError({"detail": "This minute has already been recalled."})
            if minute.acknowledged_at or minute.dispatched_at:
                raise ValidationError({"detail": "Cannot recall — already opened/dispatched by the next office."})
            if minute.edit_window_expires_at and timezone.now() > minute.edit_window_expires_at:
                raise ValidationError({"detail": "Recall window expired (1 hour). Only MD can recall after this."})
            # Downstream exists
            raise ValidationError({"detail": "Cannot recall — the next person has already acted on this. Only MD can recall with cascade."})

        if not is_md_or_super and minute.user_id != request.user.id:
            raise ValidationError({
                "detail": "Only the original sender can recall this minute."
            })

        recall_reason = request.data.get("recall_reason", "")
        from django.utils import timezone as tz
        correspondence = minute.correspondence

        downstream_minutes = Minute.objects.filter(
            correspondence=correspondence,
            timestamp__gt=minute.timestamp,
            is_recalled=False
        ).order_by("timestamp")

        for downstream in downstream_minutes:
            downstream.is_recalled = True
            downstream.recalled_at = tz.now()
            downstream.recall_reason = (
                f"Cascaded from recall of minute {minute.id}"
                if not recall_reason
                else f"{recall_reason} [cascaded from minute {minute.id}]"
            )
            downstream.save(update_fields=["is_recalled", "recalled_at", "recall_reason"])

            if downstream.seal_applied:
                seal = downstream.seal_applied
                seal.is_valid = False
                seal.invalidated_at = tz.now()
                seal.invalidated_reason = (
                    f"Downstream minute cascaded from recall of minute {minute.id} "
                    f"by {request.user.get_full_name() or request.user.username}"
                )
                seal.save(update_fields=["is_valid", "invalidated_at", "invalidated_reason"])

            CorrespondenceDistribution.objects.filter(
                minute=downstream,
                is_active=True
            ).update(is_active=False)

        minute.is_recalled = True
        minute.recalled_at = tz.now()
        if recall_reason:
            minute.recall_reason = recall_reason
        minute.save(update_fields=["is_recalled", "recalled_at", "recall_reason"])

        if minute.seal_applied:
            seal = minute.seal_applied
            seal.is_valid = False
            seal.invalidated_at = tz.now()
            seal.invalidated_reason = f"Minute recalled by {request.user.get_full_name() or request.user.username}"
            seal.save(update_fields=["is_valid", "invalidated_at", "invalidated_reason"])

        CorrespondenceDistribution.objects.filter(
            minute=minute,
            is_active=True
        ).update(is_active=False)

        downstream_count = len(downstream_minutes)

        routing_actions = (Minute.ActionType.FORWARD, Minute.ActionType.MINUTE, Minute.ActionType.APPROVE, Minute.ActionType.TREAT)
        if minute.action_type in routing_actions and minute.from_office:
            correspondence.current_office = minute.from_office
            correspondence.current_approver = minute.user
            correspondence.save(update_fields=["current_office", "current_approver", "updated_at"])

        if minute.action_type in routing_actions and minute.from_office:
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

        for downstream in downstream_minutes:
            NotificationService.create_notification(
                recipient=downstream.user,
                title=f"Minute Cascaded by Recall - {correspondence.reference_number}",
                message=f"A prior minute was recalled, which cascaded to your action on this correspondence.",
                notification_type=Notification.NotificationType.CORRESPONDENCE,
                priority=Notification.Priority.NORMAL,
                sender=request.user,
                module="correspondence",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
                action_url=f"/correspondence/{correspondence.id}",
                action_required=True,
            )

        routing_reverted = minute.action_type in routing_actions and minute.from_office

        AuditService.log_correspondence_activity(
            user=request.user,
            action="minute_recalled",
            correspondence=correspondence,
            request=request,
            description=f"Recalled minute on correspondence: {correspondence.reference_number}",
            metadata={
                "minute_id": str(minute.id),
                "recall_reason": recall_reason,
                "downstream_cascaded_count": downstream_count,
                "downstream_recalled_ids": [str(m.id) for m in downstream_minutes],
                "routing_reverted": routing_reverted,
            },
        )

        if minute.to_office:
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

        distribution_recipients = set()

        distribution_items = CorrespondenceDistribution.objects.filter(
            correspondence=correspondence
        ).select_related('added_by')

        for dist_item in distribution_items:
            office_heads = []

            if dist_item.division_id:
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

            for user in office_heads:
                if user.id != request.user.id:
                    distribution_recipients.add(user)

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

        if correspondence.case:
            case = correspondence.case

            active_minutes_count = Minute.objects.filter(
                correspondence=correspondence,
                is_recalled=False
            ).count()

            case.updated_at = timezone.now()
            case.save(update_fields=["updated_at"])

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

            if routing_reverted and minute.action_type in (Minute.ActionType.APPROVE, Minute.ActionType.TREAT):
                if case.status == Case.Status.IN_PROGRESS and active_minutes_count == 0:
                    pass

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

            CaseService.evaluate_workflow_rules(
                case,
                "minute_recalled",
                {
                    "minute_id": str(minute.id),
                    "minute_action_type": minute.action_type,
                    "recall_reason": recall_reason,
                    "routing_reverted": routing_reverted,
                    "active_minutes_remaining": active_minutes_count,
                }
            )

        serializer = self.get_serializer(minute)
        response_data = serializer.data

        if minute.acknowledged_at:
            response_data['warning'] = (
                f"This minute was acknowledged on {minute.acknowledged_at.strftime('%d %b %Y, %H:%M')}. "
                f"Recalling will remove it from the recipient's inbox."
            )

        response_data["downstream_cascaded_count"] = downstream_count
        response_data["downstream_ids"] = [str(m.id) for m in downstream_minutes]

        return Response(response_data)

    @action(detail=False, methods=["post"], url_path="parallel-route")
    def parallel_route(self, request):
        user = request.user
        executive_grades = ['MDCS', 'EDCS', 'GMCS', 'AGMCS']
        if not hasattr(user, 'grade_level') or user.grade_level not in executive_grades:
            raise ValidationError({
                "detail": "Only executives (MD, ED, GM, AGM) can create parallel routes."
            })

        correspondence_id = request.data.get("correspondence_id")
        recipients = request.data.get("recipients", [])
        merge_strategy = request.data.get("merge_strategy", "independent")

        if not correspondence_id or not recipients:
            raise ValidationError({
                "detail": "correspondence_id and recipients are required."
            })

        if len(recipients) < 2:
            raise ValidationError({
                "detail": "Parallel routing requires at least 2 recipients."
            })

        user_ids = [r.get("user_id") for r in recipients if r.get("user_id")]
        if len(user_ids) != len(set(user_ids)):
            raise ValidationError({
                "detail": "Duplicate recipients are not allowed. Each recipient must be unique."
            })

        try:
            correspondence = Correspondence.objects.get(id=correspondence_id)
        except Correspondence.DoesNotExist:
            raise ValidationError({"detail": "Correspondence not found."})

        parallel_group = ParallelRoutingGroup.objects.create(
            correspondence=correspondence,
            created_by=user,
            merge_strategy=merge_strategy,
            total_branches=len(recipients),
        )

        recipient_user_ids = [r.get("user_id") for r in recipients if r.get("user_id")]
        if len(recipient_user_ids) != len(set(recipient_user_ids)):
            raise ValidationError({
                "detail": "Duplicate recipients are not allowed in parallel routing."
            })

        created_minutes = []
        recipient_users = {}

        for recipient_data in recipients:
            recipient_user_id = recipient_data.get("user_id")
            if not recipient_user_id:
                continue

            purpose = recipient_data.get("purpose", "action")
            office_id = recipient_data.get("office_id")
            minute_text = recipient_data.get("minute_text", "").strip()
            if not minute_text:
                raise ValidationError({
                    "detail": "Minute text is required for each parallel branch recipient."
                })

            if recipient_user_id not in recipient_users:
                try:
                    recipient_users[recipient_user_id] = User.objects.get(id=recipient_user_id)
                except User.DoesNotExist:
                    raise ValidationError({
                        "detail": f"Recipient user {recipient_user_id} not found."
                    })

            recipient_user = recipient_users[recipient_user_id]

            office = None
            if office_id:
                try:
                    office = Office.objects.get(id=office_id)
                except Office.DoesNotExist:
                    pass

            if not office:
                office_membership = OfficeMembership.objects.filter(
                    user=recipient_user,
                    is_active=True,
                    is_primary=True
                ).select_related('office').first()
                if office_membership:
                    office = office_membership.office

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

            minute = Minute.objects.create(
                correspondence=correspondence,
                user=user,
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
                to_user=recipient_user,
                branch_originator=recipient_user,
            )

            notification_recipient = recipient_user

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

        correspondence.workflow_state = "parallel"
        correspondence.active_parallel_branches = len(created_minutes)
        correspondence.save(update_fields=["workflow_state", "active_parallel_branches"])

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
        qs = super().get_queryset()
        correspondence_id = self.request.query_params.get('correspondence')
        if correspondence_id:
            qs = qs.filter(correspondence_id=correspondence_id)
        return qs.distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

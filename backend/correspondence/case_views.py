"""API endpoints for case management."""

from __future__ import annotations

import logging

from django.contrib.auth import get_user_model
from django.utils import timezone

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from django.db.models import Q

from audit.models import ActivityLog
from audit.services import AuditService
from common.pagination import StandardPageNumberPagination
from notifications.models import Notification
from notifications.services import NotificationService

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
    Minute,
)
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
)
from .services import CaseService

logger = logging.getLogger(__name__)
User = get_user_model()


class CaseViewSet(viewsets.ModelViewSet):
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
        queryset = super().get_queryset()

        if self.detail or self.action in ("retrieve", "update", "partial_update", "destroy"):
            return queryset

        user = self.request.user
        role_name = getattr(getattr(user, "system_role", None), "name", "") or ""
        is_secretary = role_name.lower() == "secretary"
        is_superuser = getattr(user, "is_superuser", False) or role_name.lower() == "super admin"

        scope = self.request.query_params.get("scope", "personal")

        if scope == "organization" or (is_superuser and scope == "all"):
            pass
        elif scope == "directorate":
            if user.directorate_id:
                from organization.models import Division
                division_ids = Division.objects.filter(
                    directorate_id=user.directorate_id
                ).values_list('id', flat=True)
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
            if user.division_id:
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
            if user.department_id:
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
            else:
                queryset = queryset.none()
        elif scope == "my":
            queryset = queryset.filter(assigned_to=user)
        elif scope == "all":
            from organization.models import OfficeMembership
            user_office_ids = OfficeMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('office_id', flat=True)
            queryset = queryset.filter(
                Q(assigned_to=user)
                | Q(owning_office_id__in=user_office_ids)
                | Q(current_office_id__in=user_office_ids)
            )
        else:
            from organization.models import OfficeMembership
            user_office_ids = OfficeMembership.objects.filter(
                user=user,
                is_active=True
            ).values_list('office_id', flat=True)
            queryset = queryset.filter(
                Q(assigned_to=user)
                | Q(owning_office_id__in=user_office_ids)
                | Q(current_office_id__in=user_office_ids)
            )

        executive_id = self.request.query_params.get("executive")
        if is_secretary and executive_id:
            secretary_correspondence_ids = Minute.objects.filter(
                acted_by_secretary=True,
                performed_by=user,
                user_id=executive_id
            ).values_list('correspondence_id', flat=True).distinct()

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

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        old_assigned_to = serializer.instance.assigned_to
        serializer.save()
        case = serializer.instance

        if old_status != case.status:
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

            CaseService.update_case_status(case, case.status, updated_by=self.request.user)

        if old_assigned_to != case.assigned_to:
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
        user = request.user
        role_name = getattr(getattr(user, "system_role", None), "name", "") or ""
        is_secretary = role_name.lower() == "secretary"

        if not is_secretary:
            return Response(
                {"detail": "This endpoint is only available for secretaries."},
                status=status.HTTP_403_FORBIDDEN
            )

        executive_ids = Minute.objects.filter(
            acted_by_secretary=True,
            performed_by=user
        ).values_list('user_id', flat=True).distinct()

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
        if not serializer.validated_data.get("case_number"):
            today = timezone.now().date()
            count = Case.all_objects.filter(opened_at__date=today).count() + 1
            serializer.validated_data["case_number"] = f"CASE/{today.strftime('%Y%m%d')}/{count:04d}"

        case = serializer.save(created_by=self.request.user)

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

        CaseService.create_case_sla(case)
        CaseService.evaluate_workflow_rules(case, "status_change", {"new_status": case.status})

    @action(detail=True, methods=["get"], url_path="sla-status")
    def sla_status(self, request, pk=None):
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

            CaseService.evaluate_workflow_rules(case, "status_change", {"old_status": old_status, "new_status": new_status})

            CaseService.check_case_sla(case)

            return Response(self.get_serializer(updated_case).data)
        except ValueError as e:
            raise ValidationError({"detail": str(e)})

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        case = self.get_object()

        if request.method == "GET":
            comments = CaseComment.objects.filter(case=case, parent__isnull=True).select_related(
                "author", "resolved_by"
            ).prefetch_related("mentions", "replies__author", "replies__mentions").order_by("-created_at")
            serializer = CaseCommentSerializer(comments, many=True)
            return Response(serializer.data)
        else:
            serializer = CaseCommentSerializer(data={
                **request.data,
                "case": str(case.id),
                "author": str(request.user.id),
            })
            serializer.is_valid(raise_exception=True)
            comment = serializer.save(author=request.user)

            mentions = request.data.get("mentions", [])
            if mentions:
                from accounts.models import User
                mention_users = User.objects.filter(id__in=mentions)
                comment.mentions.set(mention_users)

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
        case = self.get_object()

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
                if "case_number" not in case_data:
                    results["failed"] += 1
                    results["errors"].append("Missing case_number")
                    continue

                if Case.objects.filter(case_number=case_data["case_number"]).exists():
                    results["failed"] += 1
                    results["errors"].append(f"Case {case_data['case_number']} already exists")
                    continue

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

    @action(detail=True, methods=["get"], url_path="completion-package/download")
    def download_completion_package(self, request, pk=None):
        """Stream the case completion package via DRM-aware DMS version delivery."""
        from dms.drm import assert_download_allowed
        from dms.views import DocumentVersionViewSet

        case = self.get_object()
        document = case.completion_package
        if not document:
            raise ValidationError({"detail": "No completion package available for this case."})
        version = document.versions.order_by("-version_number").first()
        if not version:
            raise ValidationError({"detail": "Completion package has no downloadable version."})

        assert_download_allowed(document, request.user)
        helper = DocumentVersionViewSet()
        return helper._serve_version(request, version, as_attachment=True, purpose="download")

    @action(detail=True, methods=["delete"], url_path="unlink_correspondence")
    def unlink_correspondence(self, request, pk=None):
        case = self.get_object()
        correspondence_id = request.data.get("correspondence_id")
        if not correspondence_id:
            raise ValidationError({"detail": "Correspondence ID is required."})
        try:
            link = CaseCorrespondenceLink.objects.get(case=case, correspondence_id=correspondence_id)
            link.delete()
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
        template = self.get_object()
        case_data = request.data.copy()

        case_data.setdefault("case_type", template.case_type)
        case_data.setdefault("priority", template.default_priority)

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

        serializer = CaseSerializer(data=case_data)
        serializer.is_valid(raise_exception=True)
        if not serializer.validated_data.get("case_number"):
            today = timezone.now().date()
            count = Case.all_objects.filter(opened_at__date=today).count() + 1
            serializer.validated_data["case_number"] = f"CASE/{today.strftime('%Y%m%d')}/{count:04d}"
        case = serializer.save(created_by=request.user, template=template)

        template.increment_usage()

        return Response(CaseSerializer(case).data, status=status.HTTP_201_CREATED)


class CaseCommentViewSet(viewsets.ModelViewSet):
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

        mentions = self.request.data.get("mentions", [])
        if mentions:
            from accounts.models import User
            mention_users = User.objects.filter(id__in=mentions)
            comment.mentions.set(mention_users)

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
        comment = self.get_object()
        comment.resolve(request.user)
        return Response(CaseCommentSerializer(comment).data)

    @action(detail=True, methods=["post"], url_path="unresolve")
    def unresolve_comment(self, request, pk=None):
        comment = self.get_object()
        comment.unresolve()
        return Response(CaseCommentSerializer(comment).data)


class CaseWorkflowRuleViewSet(viewsets.ModelViewSet):
    queryset = CaseWorkflowRule.objects.all()
    serializer_class = CaseWorkflowRuleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["case_type", "priority", "trigger_type", "action_type", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["priority_order", "name", "created_at"]
    ordering = ["priority_order", "name"]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            from organization.permission_utils import require_permission

            require_permission(request.user, "can_manage_org_structure")


class CaseSLAViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CaseSLA.objects.all()
    serializer_class = CaseSLASerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["case", "breached"]
    ordering_fields = ["target_date", "created_at"]
    ordering = ["target_date"]


class CaseCorrespondenceLinkViewSet(viewsets.ModelViewSet):
    queryset = CaseCorrespondenceLink.objects.select_related("case", "correspondence")
    serializer_class = CaseCorrespondenceLinkSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["case", "correspondence", "is_primary"]

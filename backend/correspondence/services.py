"""Domain services for correspondence workflows."""

from __future__ import annotations

import textwrap
import uuid
from io import BytesIO
from typing import Iterable, List, Sequence

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from django.utils.text import slugify
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas

from accounts.models import User
from correspondence.models import Correspondence
from dms.models import Document, DocumentPermission, DocumentVersion
from notifications.models import Notification
from notifications.services import NotificationService
from organization.models import Office, OfficeMembership


class CompletionPackageService:
    """Handles generation and distribution of correspondence completion summaries."""

    SUMMARY_TEMPLATE = "correspondence/completion_summary.html"

    @classmethod
    @transaction.atomic
    def generate_completion_package(cls, correspondence: Correspondence, triggered_by: User | None = None) -> Document:
        """Create or refresh the completion package for a correspondence."""

        if correspondence.status != Correspondence.Status.COMPLETED:
            raise ValueError("Completion packages can only be generated for completed correspondence.")

        document = cls._ensure_document(correspondence, triggered_by)
        stakeholders = cls._resolve_stakeholders(correspondence)
        cls._assign_permissions(document, correspondence, stakeholders)

        correspondence.completion_package = document
        correspondence.completion_summary_generated_at = timezone.now()
        correspondence.save(update_fields=["completion_package", "completion_summary_generated_at"])

        cls._notify_stakeholders(correspondence, document, stakeholders, triggered_by)

        return document

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @classmethod
    def _ensure_document(cls, correspondence: Correspondence, triggered_by: User | None) -> Document:
        document = correspondence.completion_package
        created = False
        if not document:
            title = f"{correspondence.reference_number or correspondence.subject} – Completion Package"
            document = Document.objects.create(
                title=title,
                description="Automatically generated completion summary for correspondence.",
                document_type=Document.DocumentType.REPORT,
                reference_number=correspondence.reference_number or "",
                status=Document.DocumentStatus.PUBLISHED,
                sensitivity=Document.Sensitivity.INTERNAL,
                author=triggered_by or correspondence.created_by,
                division=correspondence.division,
                department=correspondence.department,
                tags=["completion-package", "correspondence"],
            )
            created = True

        context = cls._build_summary_context(correspondence, triggered_by, document_created=created)
        html = render_to_string(cls.SUMMARY_TEMPLATE, context)
        text = strip_tags(html)
        pdf_bytes = cls._build_summary_pdf(text)

        storage_path = cls._store_pdf(correspondence, pdf_bytes)
        file_url = cls._build_media_url(storage_path)
        version_number = 1
        latest_version = document.versions.order_by("-version_number").first()
        if latest_version:
            version_number = latest_version.version_number + 1

        DocumentVersion.objects.create(
            document=document,
            version_number=version_number,
            file_name=storage_path.split("/")[-1],
            file_type="application/pdf",
            file_size=len(pdf_bytes),
            file_url=file_url,
            content_html=html,
            content_text=text,
            summary="Automated completion summary",
            uploaded_by=triggered_by or correspondence.created_by,
        )

        return document

    @staticmethod
    def _build_summary_context(correspondence: Correspondence, triggered_by: User | None, document_created: bool) -> dict:
        minutes = list(
            correspondence.minutes.select_related("user")
            .order_by("timestamp")
        )
        attachments = list(correspondence.attachments.all())
        distribution = list(
            correspondence.distribution.select_related("directorate", "division", "department", "added_by")
        )
        generated_by = triggered_by or correspondence.current_approver or correspondence.created_by
        return {
            "correspondence": correspondence,
            "minutes": minutes,
            "attachments": attachments,
            "distribution": distribution,
            "generated_at": timezone.now(),
            "generated_by": generated_by,
            "document_created": document_created,
        }

    @staticmethod
    def _build_summary_pdf(text: str) -> bytes:
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=LETTER)
        width, height = LETTER
        x_margin = 40
        y = height - 50

        pdf.setFont("Helvetica-Bold", 12)
        wrapped_subject = textwrap.wrap(text.splitlines()[0], 80)
        for line in wrapped_subject:
            pdf.drawString(x_margin, y, line)
            y -= 16
        pdf.setFont("Helvetica", 10)
        y -= 12

        for line in text.splitlines()[1:]:
            if not line.strip():
                y -= 10
                continue
            for chunk in textwrap.wrap(line, 95):
                if y < 60:
                    pdf.showPage()
                    pdf.setFont("Helvetica", 10)
                    y = height - 50
                pdf.drawString(x_margin, y, chunk)
                y -= 12
        pdf.save()
        buffer.seek(0)
        return buffer.read()

    @staticmethod
    def _store_pdf(correspondence: Correspondence, pdf_bytes: bytes) -> str:
        directory = f"completion_packages/{correspondence.id}"
        filename = slugify(correspondence.reference_number or correspondence.subject or "completion")
        filename = filename[:80] if filename else correspondence.id
        storage_path = f"{directory}/{filename}-{uuid.uuid4().hex}.pdf"
        default_storage.save(storage_path, ContentFile(pdf_bytes))
        return storage_path

    @staticmethod
    def _build_media_url(path: str) -> str:
        media_url = settings.MEDIA_URL or "/media/"
        if not media_url.endswith("/"):
            media_url = f"{media_url}/"
        return f"{media_url}{path}".replace("//", "/")

    @classmethod
    def _resolve_stakeholders(cls, correspondence: Correspondence) -> List[User]:
        users: set[User] = set()

        def add_user(user: User | None):
            if user and user.is_active:
                users.add(user)

        add_user(correspondence.created_by)
        add_user(correspondence.current_approver)

        minutes = correspondence.minutes.select_related("user")
        for minute in minutes:
            add_user(minute.user)

        attachments = correspondence.attachments.select_related()
        for attachment in attachments:
            if hasattr(attachment, "uploaded_by"):
                add_user(getattr(attachment, "uploaded_by", None))

        office_ids = set()
        if correspondence.owning_office_id:
            office_ids.add(correspondence.owning_office_id)
        if correspondence.current_office_id:
            office_ids.add(correspondence.current_office_id)

        office_ids.update(cls._office_ids_from_archive_level(correspondence))
        office_ids.update(cls._office_ids_from_distribution(correspondence))

        if office_ids:
            memberships = (
                OfficeMembership.objects.filter(office_id__in=office_ids, is_active=True)
                .select_related("user")
            )
            for membership in memberships:
                add_user(membership.user)

        return list(users)

    @staticmethod
    def _office_ids_from_archive_level(correspondence: Correspondence) -> set:
        office_ids: set[str] = set()
        if not correspondence.archive_level:
            return office_ids

        office_queryset = Office.objects.filter(is_active=True)
        if correspondence.archive_level == Correspondence.ArchiveLevel.DEPARTMENT and correspondence.department_id:
            office_ids.update(
                office_queryset.filter(department_id=correspondence.department_id).values_list("id", flat=True)
            )
        elif correspondence.archive_level == Correspondence.ArchiveLevel.DIVISION and correspondence.division_id:
            office_ids.update(
                office_queryset.filter(division_id=correspondence.division_id).values_list("id", flat=True)
            )
        elif correspondence.archive_level == Correspondence.ArchiveLevel.DIRECTORATE and correspondence.division:
            directorate_id = correspondence.division.directorate_id
            if directorate_id:
                office_ids.update(
                    office_queryset.filter(division__directorate_id=directorate_id).values_list("id", flat=True)
                )
        return office_ids

    @staticmethod
    def _office_ids_from_distribution(correspondence: Correspondence) -> set:
        office_ids: set[str] = set()
        office_queryset = Office.objects.filter(is_active=True)
        for entry in correspondence.distribution.all():
            if entry.department_id:
                office_ids.update(
                    office_queryset.filter(department_id=entry.department_id).values_list("id", flat=True)
                )
            elif entry.division_id:
                office_ids.update(
                    office_queryset.filter(division_id=entry.division_id).values_list("id", flat=True)
                )
            elif entry.directorate_id:
                office_ids.update(
                    office_queryset.filter(division__directorate_id=entry.directorate_id).values_list("id", flat=True)
                )
        return office_ids

    @classmethod
    def _assign_permissions(
        cls,
        document: Document,
        correspondence: Correspondence,
        stakeholders: Sequence[User],
    ) -> None:
        DocumentPermission.objects.filter(document=document).delete()
        permission = DocumentPermission.objects.create(
            document=document,
            access=DocumentPermission.AccessLevel.READ,
        )

        divisions = set()
        departments = set()

        if correspondence.division_id:
            divisions.add(correspondence.division_id)
        if correspondence.department_id:
            departments.add(correspondence.department_id)

        for entry in correspondence.distribution.all():
            if entry.division_id:
                divisions.add(entry.division_id)
            if entry.department_id:
                departments.add(entry.department_id)

        if divisions:
            permission.divisions.add(*divisions)
        if departments:
            permission.departments.add(*departments)

        if stakeholders:
            permission.users.add(*stakeholders)

    @classmethod
    def _notify_stakeholders(
        cls,
        correspondence: Correspondence,
        document: Document,
        stakeholders: Iterable[User],
        actor: User | None,
    ) -> None:
        latest_version = document.versions.order_by("-version_number").first()
        file_url = latest_version.file_url if latest_version else ""
        absolute_link = cls._build_frontend_url(f"/correspondence/{correspondence.id}")
        download_link = cls._build_frontend_url(file_url) if file_url else absolute_link

        for user in stakeholders:
            NotificationService.create_notification(
                recipient=user,
                title=f"Completion package ready ({correspondence.reference_number})",
                message=(
                    f"The correspondence \"{correspondence.subject}\" has been completed. "
                    "A consolidated package is now available."
                ),
                notification_type=Notification.NotificationType.CORRESPONDENCE,
                priority=Notification.Priority.NORMAL,
                sender=actor,
                module="correspondence",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
                action_url=f"/correspondence/{correspondence.id}",
                action_required=False,
            )

            if user.email:
                cls._send_completion_email(user, correspondence, absolute_link, download_link)

    @staticmethod
    def _send_completion_email(user: User, correspondence: Correspondence, view_link: str, download_link: str) -> None:
        from django.core.mail import send_mail

        subject = f"[NPA ECM] Completion package ready – {correspondence.reference_number}"
        message = (
            f"Dear {user.get_full_name() or user.username},\n\n"
            f"The correspondence \"{correspondence.subject}\" has been completed.\n"
            f"You can review the final package here: {view_link}\n"
            f"Download the compiled summary: {download_link}\n\n"
            "This message was generated automatically."
        )
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )

    @staticmethod
    def _build_frontend_url(path: str) -> str:
        base = settings.FRONTEND_BASE_URL.rstrip("/")
        if not path:
            return base
        if path.startswith("http://") or path.startswith("https://"):
            return path
        if not path.startswith("/"):
            path = f"/{path}"
        return f"{base}{path}"


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
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
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
        pdf_bytes = cls._build_summary_pdf(context)

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
    def _build_summary_pdf(context: dict) -> bytes:
        """Build a properly formatted PDF from context data."""
        from django.utils.dateformat import format as date_format
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=LETTER, 
                               rightMargin=0.75*inch, leftMargin=0.75*inch,
                               topMargin=0.75*inch, bottomMargin=0.75*inch)
        
        # Create styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#111827'),
            spaceAfter=12,
            alignment=TA_LEFT,
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#111827'),
            spaceAfter=8,
            spaceBefore=16,
            alignment=TA_LEFT,
        )
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#0f172a'),
            leading=14,
            alignment=TA_LEFT,
        )
        meta_style = ParagraphStyle(
            'MetaStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#0f172a'),
            leading=14,
            spaceAfter=6,
        )
        minute_header_style = ParagraphStyle(
            'MinuteHeader',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#111827'),
            fontName='Helvetica-Bold',
            spaceAfter=4,
        )
        minute_meta_style = ParagraphStyle(
            'MinuteMeta',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#475569'),
            spaceAfter=6,
        )
        minute_text_style = ParagraphStyle(
            'MinuteText',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#0f172a'),
            leading=14,
            spaceAfter=12,
            leftIndent=12,
        )
        
        story = []
        correspondence = context['correspondence']
        minutes = context['minutes']
        distribution = context['distribution']
        attachments = context['attachments']
        generated_at = context['generated_at']
        generated_by = context.get('generated_by')
        
        # Title
        story.append(Paragraph("Correspondence Completion Summary", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Correspondence Details Section
        story.append(Paragraph("Correspondence Details", heading_style))
        
        meta_items = [
            ("Reference", correspondence.reference_number or "—"),
            ("Subject", correspondence.subject or "—"),
            ("Owning Office", correspondence.owning_office.name if hasattr(correspondence, 'owning_office') and correspondence.owning_office else "Unassigned"),
            ("Current Office", correspondence.current_office.name if correspondence.current_office else "Unassigned"),
            ("Priority", correspondence.get_priority_display() if hasattr(correspondence, 'get_priority_display') else str(correspondence.priority)),
            ("Archive Level", correspondence.get_archive_level_display() if hasattr(correspondence, 'get_archive_level_display') else "Department"),
            ("Generated", f"{date_format(generated_at, 'F j, Y H:i')}" + (f" · {generated_by.get_full_name() or generated_by.username}" if generated_by else "")),
        ]
        
        for label, value in meta_items:
            story.append(Paragraph(f"<b>{label}:</b> {value}", meta_style))
        
        story.append(Spacer(1, 0.15*inch))
        
        # Minutes & Decisions Section
        story.append(Paragraph("Minutes & Decisions", heading_style))
        
        if minutes:
            for minute in minutes:
                # Minute header
                user_name = minute.user.get_full_name() if minute.user else minute.user.username if minute.user else "Unknown"
                action_type = minute.get_action_type_display() if hasattr(minute, 'get_action_type_display') else str(minute.action_type)
                story.append(Paragraph(f"{action_type} by {user_name}", minute_header_style))
                
                # Minute metadata
                timestamp = date_format(minute.timestamp, 'F j, Y H:i') if hasattr(minute, 'timestamp') else ""
                direction = minute.get_direction_display() if hasattr(minute, 'get_direction_display') else str(minute.direction) if hasattr(minute, 'direction') else ""
                meta_text = f"{timestamp} · Direction: {direction}" if timestamp and direction else timestamp or direction or ""
                if meta_text:
                    story.append(Paragraph(meta_text, minute_meta_style))
                
                # Minute text
                if minute.minute_text:
                    # Wrap long text
                    minute_text = minute.minute_text.replace('\n', '<br/>')
                    story.append(Paragraph(minute_text, minute_text_style))
                
                # Routing info
                if hasattr(minute, 'to_office') and minute.to_office:
                    story.append(Paragraph(f"Routed to: {minute.to_office.name}", minute_meta_style))
                
                story.append(Spacer(1, 0.1*inch))
        else:
            story.append(Paragraph("No minutes were recorded for this correspondence.", normal_style))
        
        story.append(Spacer(1, 0.15*inch))
        
        # Distribution Section
        story.append(Paragraph("Distribution", heading_style))
        
        if distribution:
            dist_data = [['Recipient', 'Type', 'Purpose']]
            for entry in distribution:
                recipient_name = "—"
                if hasattr(entry, 'directorate') and entry.directorate:
                    recipient_name = entry.directorate.name
                elif hasattr(entry, 'division') and entry.division:
                    recipient_name = entry.division.name
                elif hasattr(entry, 'department') and entry.department:
                    recipient_name = entry.department.name
                
                recipient_type = entry.get_recipient_type_display() if hasattr(entry, 'get_recipient_type_display') else str(entry.recipient_type) if hasattr(entry, 'recipient_type') else "—"
                purpose = entry.get_purpose_display() if hasattr(entry, 'get_purpose_display') else str(entry.purpose) if hasattr(entry, 'purpose') else "—"
                
                dist_data.append([recipient_name, recipient_type, purpose])
            
            dist_table = Table(dist_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
            dist_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#111827')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#0f172a')),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ]))
            story.append(dist_table)
        else:
            story.append(Paragraph("No distribution list captured.", normal_style))
        
        story.append(Spacer(1, 0.15*inch))
        
        # Attachments Section
        story.append(Paragraph("Attachments", heading_style))
        
        if attachments:
            attach_data = [['File Name', 'Type', 'Size']]
            for attachment in attachments:
                file_size = ""
                if hasattr(attachment, 'file_size') and attachment.file_size:
                    size_kb = attachment.file_size / 1024
                    if size_kb < 1024:
                        file_size = f"{size_kb:.1f} KB"
                    else:
                        file_size = f"{size_kb / 1024:.1f} MB"
                
                attach_data.append([
                    attachment.file_name or "—",
                    getattr(attachment, 'file_type', None) or "—",
                    file_size or "—"
                ])
            
            attach_table = Table(attach_data, colWidths=[3.5*inch, 1.5*inch, 1*inch])
            attach_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#111827')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#0f172a')),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ]))
            story.append(attach_table)
        else:
            story.append(Paragraph("No attachments were linked to this correspondence.", normal_style))
        
        # Build PDF
        doc.build(story)
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
    def _build_media_url(path: str, request=None) -> str:
        """Build media URL. Always returns relative path (browser resolves to current domain)."""
        media_url = settings.MEDIA_URL or "/media/"
        if not media_url.startswith("/"):
            media_url = f"/{media_url}"
        if not media_url.endswith("/"):
            media_url = f"{media_url}/"
        # Always return relative path - avoids hardcoded IPs in Docker environments
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


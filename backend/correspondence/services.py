"""Domain services for correspondence workflows."""

from __future__ import annotations

import os
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
import logging

from accounts.models import User

logger = logging.getLogger(__name__)
from audit.services import AuditService
from correspondence.models import (
    Case,
    Correspondence,
    CorrespondenceAttachment,
    CorrespondenceDocumentLink,
)
from dms.models import Document, DocumentPermission, DocumentVersion
from notifications.models import Notification
from notifications.services import NotificationService
from organization.models import Office, OfficeMembership


class CorrespondenceDocumentService:
    """Service for automatically creating DMS documents from correspondence."""

    # Map correspondence document types to DMS document types
    DOCUMENT_TYPE_MAP = {
        Correspondence.DocumentType.LETTER: Document.DocumentType.LETTER,
        Correspondence.DocumentType.REQUEST: Document.DocumentType.LETTER,
        Correspondence.DocumentType.COMPLAINT: Document.DocumentType.LETTER,
        Correspondence.DocumentType.INQUIRY: Document.DocumentType.LETTER,
        Correspondence.DocumentType.REPORT: Document.DocumentType.REPORT,
        Correspondence.DocumentType.DIRECTIVE: Document.DocumentType.POLICY,
        Correspondence.DocumentType.OTHER: Document.DocumentType.OTHER,
    }

    @classmethod
    @transaction.atomic
    def create_document_from_correspondence(
        cls,
        correspondence: Correspondence,
        attachments: List[CorrespondenceAttachment] | None = None,
    ) -> Document:
        """
        Automatically create a DMS Document from a Correspondence.
        
        Args:
            correspondence: The correspondence to create a document from
            attachments: Optional list of attachments to create DocumentVersions from
            
        Returns:
            The created DMS Document
        """
        # Check if document already exists
        existing_link = CorrespondenceDocumentLink.objects.filter(
            correspondence=correspondence
        ).select_related('document').first()
        
        if existing_link:
            return existing_link.document

        # Map document type
        dms_document_type = cls.DOCUMENT_TYPE_MAP.get(
            correspondence.document_type,
            Document.DocumentType.OTHER
        )

        # Determine sensitivity based on priority
        sensitivity = Document.Sensitivity.INTERNAL
        if correspondence.priority == Correspondence.Priority.URGENT:
            sensitivity = Document.Sensitivity.CONFIDENTIAL
        elif correspondence.priority == Correspondence.Priority.HIGH:
            sensitivity = Document.Sensitivity.INTERNAL

        # Get parent document if this is a response
        parent_document = None
        if correspondence.parent_correspondence:
            parent_link = CorrespondenceDocumentLink.objects.filter(
                correspondence=correspondence.parent_correspondence
            ).select_related('document').first()
            if parent_link:
                parent_document = parent_link.document

        # Create DMS Document
        document = Document.objects.create(
            title=correspondence.subject,
            description=correspondence.summary or f"Correspondence: {correspondence.reference_number}",
            document_type=dms_document_type,
            reference_number=correspondence.reference_number or "",
            status=Document.DocumentStatus.DRAFT,  # Will be published when correspondence is completed
            sensitivity=sensitivity,
            author=correspondence.created_by,
            division=correspondence.division,
            department=correspondence.department,
            tags=correspondence.tags or [],
            parent_document=parent_document,  # Link to parent document for threading
        )

        # Link correspondence to document
        CorrespondenceDocumentLink.objects.create(
            correspondence=correspondence,
            document=document,
            notes="Auto-created from correspondence registration",
        )

        # Create DocumentVersions from attachments
        if attachments is None:
            attachments = list(correspondence.attachments.all())
        
        if attachments:
            # Create versions from attachments
            for attachment in attachments:
                cls._create_document_version_from_attachment(document, attachment)
        elif correspondence.body_html:
            # If no attachments but has body_html, create a version from the body
            cls._create_document_version_from_body(document, correspondence)

        # Log activity
        from audit.models import ActivityLog
        AuditService.log_document_activity(
            user=correspondence.created_by,
            action=ActivityLog.ActionType.DOCUMENT_CREATED,
            document=document,
            request=None,
            description=f"Auto-created from correspondence: {correspondence.reference_number}",
        )

        return document

    @classmethod
    def _create_document_version_from_attachment(
        cls,
        document: Document,
        attachment: CorrespondenceAttachment,
    ) -> DocumentVersion:
        """Create a DocumentVersion from a CorrespondenceAttachment."""
        # Get next version number
        latest_version = document.versions.order_by("-version_number").first()
        version_number = (latest_version.version_number + 1) if latest_version else 1

        # Extract text from file if possible (for search)
        content_text = ""
        content_html = ""
        
        # Try to extract text from attachment
        # This is a placeholder - actual text extraction would use OCR or file parsing
        if attachment.file_type and 'text' in attachment.file_type.lower():
            # For text files, we could read and extract content
            # For now, we'll leave it empty and let OCR handle it later
            pass

        # Create DocumentVersion
        document_version = DocumentVersion.objects.create(
            document=document,
            version_number=version_number,
            file_name=attachment.file_name,
            file_type=attachment.file_type or 'application/octet-stream',
            file_size=attachment.file_size or 0,
            file_url=attachment.file_url,
            content_text=content_text,
            content_html=content_html,
            summary=f"Original attachment: {attachment.file_name}",
            uploaded_by=document.author,
            notes=f"Auto-created from correspondence attachment",
        )

        return document_version

    @classmethod
    def _create_document_version_from_body(
        cls,
        document: Document,
        correspondence: Correspondence,
    ) -> DocumentVersion:
        """Create a DocumentVersion from correspondence body_html."""
        from django.utils.html import strip_tags
        
        # Get next version number
        latest_version = document.versions.order_by("-version_number").first()
        version_number = (latest_version.version_number + 1) if latest_version else 1

        # Extract text from HTML
        content_text = strip_tags(correspondence.body_html) if correspondence.body_html else ""
        content_html = correspondence.body_html or ""

        # Create DocumentVersion
        document_version = DocumentVersion.objects.create(
            document=document,
            version_number=version_number,
            file_name=f"{correspondence.reference_number or 'correspondence'}.html",
            file_type="text/html",
            file_size=len(content_html.encode('utf-8')) if content_html else 0,
            file_url="",  # No file URL for HTML body
            content_text=content_text,
            content_html=content_html,
            summary="Correspondence body content",
            uploaded_by=document.author,
            notes="Auto-created from correspondence body",
        )

        return document_version

    @classmethod
    def update_document_status_on_completion(cls, correspondence: Correspondence) -> None:
        """
        Update DMS document status to PUBLISHED when correspondence is completed.
        
        Args:
            correspondence: The completed correspondence
        """
        # Get linked document
        link = CorrespondenceDocumentLink.objects.filter(
            correspondence=correspondence
        ).select_related('document').first()
        
        if link and link.document:
            link.document.status = Document.DocumentStatus.PUBLISHED
            link.document.save(update_fields=['status'])
            
            # Log activity
            from audit.models import ActivityLog
            AuditService.log_document_activity(
                user=correspondence.current_approver or correspondence.created_by,
                action=ActivityLog.ActionType.DOCUMENT_UPDATED,
                document=link.document,
                request=None,
                description=f"Document published - correspondence {correspondence.reference_number} completed",
            )

    @classmethod
    def get_workflow_history_for_document(cls, document: Document) -> List:
        """
        Get workflow history (minutes) for a DMS document linked to correspondence.
        
        Args:
            document: The DMS document
            
        Returns:
            List of minutes/workflow actions for the linked correspondence
        """
        from correspondence.models import Minute
        
        # Get linked correspondence
        link = CorrespondenceDocumentLink.objects.filter(
            document=document
        ).select_related('correspondence').first()
        
        if not link:
            return []
        
        # Get all minutes for the correspondence, ordered chronologically
        minutes = Minute.objects.filter(
            correspondence=link.correspondence
        ).select_related(
            'user', 'from_office', 'to_office', 'to_user'
        ).order_by('timestamp', 'step_number')
        
        return list(minutes)

    @classmethod
    def grant_document_access_for_minute(cls, minute) -> None:
        """
        Automatically grant document access to minute recipients.
        
        When a minute is created routing to a user/office, automatically grant
        READ access to the linked document so recipients can access the document
        they're minuted on.
        
        Args:
            minute: The Minute instance that was just created
        """
        from correspondence.models import Minute as MinuteModel
        
        # Get the linked document
        link = CorrespondenceDocumentLink.objects.filter(
            correspondence=minute.correspondence
        ).select_related('document').first()
        
        if not link:
            # No document linked to this correspondence
            return
        
        document = link.document
        
        # Get recipients who should get access
        recipients = []
        
        # If minute is routed to a specific user
        if minute.to_user:
            recipients.append(minute.to_user)
        
        # If minute is routed to an office, grant access to all active office members
        if minute.to_office:
            from organization.models import OfficeMembership
            office_members = OfficeMembership.objects.filter(
                office=minute.to_office,
                is_active=True
            ).select_related('user').values_list('user', flat=True)
            
            from accounts.models import User
            for user_id in office_members:
                try:
                    user = User.objects.get(id=user_id)
                    if user not in recipients:
                        recipients.append(user)
                except User.DoesNotExist:
                    continue
        
        # If no specific recipients, skip
        if not recipients:
            return
        
        # Grant READ access to all recipients
        # Find or create a permission for this document
        # Use get_or_create but handle the case where multiple permissions might exist
        permission = DocumentPermission.objects.filter(
            document=document,
            access=DocumentPermission.AccessLevel.READ
        ).first()
        
        if not permission:
            # Create new permission
            permission = DocumentPermission.objects.create(
                document=document,
                access=DocumentPermission.AccessLevel.READ,
                note=f'Auto-granted access via minute routing (Step {minute.step_number})'
            )
            created = True
        else:
            created = False
        
        # Add recipients to the permission
        added_count = 0
        for recipient in recipients:
            if recipient not in permission.users.all():
                permission.users.add(recipient)
                added_count += 1
        
        # Log the action
        if created:
            logger.info(
                f"Auto-granted document access: {document.title} (ID: {document.id}) "
                f"to {len(recipients)} recipient(s) via minute {minute.id}"
            )
        elif added_count > 0:
            logger.info(
                f"Updated document access: {document.title} (ID: {document.id}) "
                f"added {added_count} recipient(s) via minute {minute.id}"
            )


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


class ExecutiveApprovalPDFService:
    """Service for generating Executive Approval PDF documents."""
    
    @classmethod
    def generate_approval_pdf(cls, minute, correspondence) -> bytes:
        """
        Generate a comprehensive PDF document for an executive approval.
        
        Includes:
        - Original correspondence details
        - All minutes/actions taken
        - Executive approval with digital seal
        - All formatted professionally
        """
        from correspondence.models import Minute as MinuteModel
        from django.utils.dateformat import format as date_format
        from reportlab.lib.utils import ImageReader
        from PIL import Image
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=LETTER,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )
        
        # Track temporary files to clean up after PDF build
        temp_files_to_cleanup = []
        
        # Create styles
        styles = getSampleStyleSheet()
        
        # Title style
        title_style = ParagraphStyle(
            'ApprovalTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1e3a5f'),
            spaceAfter=16,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
        )
        
        # Header style
        header_style = ParagraphStyle(
            'ApprovalHeader',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1e3a5f'),
            spaceAfter=8,
            spaceBefore=20,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold',
        )
        
        # Subheader style
        subheader_style = ParagraphStyle(
            'ApprovalSubheader',
            parent=styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#475569'),
            spaceAfter=6,
            spaceBefore=12,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold',
        )
        
        # Normal text style
        normal_style = ParagraphStyle(
            'ApprovalNormal',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#0f172a'),
            leading=14,
            alignment=TA_LEFT,
        )
        
        # Meta info style
        meta_style = ParagraphStyle(
            'ApprovalMeta',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#64748b'),
            leading=12,
            spaceAfter=4,
        )
        
        # Minute text style
        minute_text_style = ParagraphStyle(
            'ApprovalMinuteText',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#0f172a'),
            leading=16,
            spaceAfter=12,
            leftIndent=16,
        )
        
        # Approval highlight style
        approval_style = ParagraphStyle(
            'ApprovalHighlight',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#059669'),
            leading=16,
            spaceAfter=12,
            fontName='Helvetica-Bold',
        )
        
        story = []
        
        # Title
        story.append(Paragraph("EXECUTIVE APPROVAL DOCUMENT", title_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Correspondence Details Section
        story.append(Paragraph("Correspondence Details", header_style))
        story.append(Spacer(1, 0.1*inch))
        
        # Format received date
        received_date_str = "—"
        if correspondence.received_date:
            try:
                received_date_str = date_format(correspondence.received_date, 'F j, Y')
            except (AttributeError, TypeError):
                if hasattr(correspondence.received_date, 'strftime'):
                    received_date_str = correspondence.received_date.strftime('%B %d, %Y')
                else:
                    received_date_str = str(correspondence.received_date)
        
        corr_meta = [
            ("Reference Number", correspondence.reference_number or "—"),
            ("Subject", correspondence.subject or "—"),
            ("Received Date", received_date_str),
            ("Sender", correspondence.sender_name or "—"),
            ("Sender Organization", correspondence.sender_organization or "—"),
            ("Priority", correspondence.get_priority_display() if hasattr(correspondence, 'get_priority_display') else str(correspondence.priority)),
            ("Status", correspondence.get_status_display() if hasattr(correspondence, 'get_status_display') else str(correspondence.status)),
        ]
        
        for label, value in corr_meta:
            story.append(Paragraph(f"<b>{label}:</b> {value}", normal_style))
        
        story.append(Spacer(1, 0.2*inch))
        
        # Minutes & Actions Section
        story.append(Paragraph("Minutes & Actions", header_style))
        story.append(Spacer(1, 0.1*inch))
        
        # Get all minutes for this correspondence, ordered chronologically
        all_minutes = MinuteModel.objects.filter(
            correspondence=correspondence
        ).select_related(
            'user', 'from_office', 'to_office', 'seal_applied', 'seal_applied__sealed_by'
        ).order_by('timestamp', 'step_number')
        
        for min in all_minutes:
            # Minute header with action type
            user_name = min.user.get_full_name() if min.user else min.user.username if min.user else "Unknown"
            action_type = min.get_action_type_display() if hasattr(min, 'get_action_type_display') else str(min.action_type).title()
            
            # Highlight approval minutes
            if min.action_type == MinuteModel.ActionType.APPROVE:
                story.append(Paragraph(f"✓ {action_type} by {user_name}", approval_style))
            else:
                story.append(Paragraph(f"{action_type} by {user_name}", subheader_style))
            
            # Minute metadata
            timestamp = ""
            if hasattr(min, 'timestamp') and min.timestamp:
                try:
                    timestamp = date_format(min.timestamp, 'F j, Y, H:i')
                except (AttributeError, TypeError):
                    timestamp = min.timestamp.strftime('%B %d, %Y, %H:%M') if hasattr(min.timestamp, 'strftime') else str(min.timestamp)
            direction = min.get_direction_display() if hasattr(min, 'get_direction_display') else str(min.direction) if hasattr(min, 'direction') else ""
            grade = min.grade_level or ""
            
            meta_parts = []
            if timestamp:
                meta_parts.append(timestamp)
            if direction:
                meta_parts.append(f"Direction: {direction}")
            if grade:
                meta_parts.append(f"Grade: {grade}")
            
            if meta_parts:
                story.append(Paragraph(" · ".join(meta_parts), meta_style))
            
            # Minute text
            if min.minute_text:
                minute_text = min.minute_text.replace('\n', '<br/>')
                story.append(Paragraph(minute_text, minute_text_style))
            
            # Routing info
            if min.to_office:
                story.append(Paragraph(f"<i>Routed to: {min.to_office.name}</i>", meta_style))
            elif min.to_user:
                to_user_name = min.to_user.get_full_name() if min.to_user else min.to_user.username if min.to_user else "Unknown"
                story.append(Paragraph(f"<i>Routed to: {to_user_name}</i>", meta_style))
            
            # Digital Seal information (for approval minutes)
            if min.action_type == MinuteModel.ActionType.APPROVE and min.seal_applied:
                seal = min.seal_applied
                story.append(Spacer(1, 0.1*inch))
                story.append(Paragraph("Digital Executive Seal Applied", subheader_style))
                
                # Format sealed_at date
                sealed_at_str = "—"
                if seal.sealed_at:
                    try:
                        sealed_at_str = date_format(seal.sealed_at, 'F j, Y, H:i')
                    except (AttributeError, TypeError):
                        if hasattr(seal.sealed_at, 'strftime'):
                            sealed_at_str = seal.sealed_at.strftime('%B %d, %Y, %H:%M')
                        else:
                            sealed_at_str = str(seal.sealed_at)
                
                seal_info = [
                    ("Serial Number", seal.serial_number),
                    ("Sealed By", seal.sealed_by.get_full_name() if seal.sealed_by else seal.sealed_by.username if seal.sealed_by else "Unknown"),
                    ("Office", seal.office_name),
                    ("Office Title", seal.office_title),
                    ("Sealed At", sealed_at_str),
                    ("Verification URL", seal.verification_url or "—"),
                ]
                
                for label, value in seal_info:
                    story.append(Paragraph(f"<b>{label}:</b> {value}", normal_style))
                
                # Try to include seal image if available
                if seal.seal_image:
                    try:
                        # Read the seal image directly from storage
                        from django.core.files.storage import default_storage
                        if default_storage.exists(seal.seal_image.name):
                            with default_storage.open(seal.seal_image.name, 'rb') as img_file:
                                img = Image.open(img_file)
                                img.thumbnail((200, 200), Image.Resampling.LANCZOS)
                                img_buffer = BytesIO()
                                # Convert to RGB if necessary (for PNG with transparency)
                                if img.mode in ('RGBA', 'LA', 'P'):
                                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                                    if img.mode == 'P':
                                        img = img.convert('RGBA')
                                    rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                                    img = rgb_img
                                img.save(img_buffer, format='PNG')
                                img_buffer.seek(0)
                                
                                seal_img = ImageReader(img_buffer)
                                story.append(Spacer(1, 0.1*inch))
                                # Center the image
                                from reportlab.platypus import Image as ReportLabImage
                                seal_image_elem = ReportLabImage(seal_img, width=150, height=150)
                                story.append(seal_image_elem)
                    except ImportError as e:
                        logger.warning(f"PIL or reportlab not available for seal image: {e}")
                    except Exception as e:
                        logger.warning(f"Could not load seal image: {e}")
            
            story.append(Spacer(1, 0.15*inch))
        
        if not all_minutes.exists():
            story.append(Paragraph("No minutes recorded for this correspondence.", normal_style))
        
        story.append(Spacer(1, 0.2*inch))
        
        # Attachments Section (if any) - Embed actual content
        attachments = correspondence.attachments.all().order_by('created_at') if hasattr(correspondence, 'attachments') else []
        if attachments:
            story.append(PageBreak())
            story.append(Paragraph("Attachments & Documents", header_style))
            story.append(Spacer(1, 0.15*inch))
            
            # Determine original vs later attachments (within 1 minute of correspondence creation = original)
            original_threshold = correspondence.created_at + timezone.timedelta(minutes=1)
            
            for idx, att in enumerate(attachments, 1):
                is_original = att.created_at <= original_threshold
                attachment_label = "Original Document" if is_original else f"Attachment #{idx}"
                
                # Attachment header with metadata
                att_header_style = ParagraphStyle(
                    'AttachmentHeader',
                    parent=styles['Heading3'],
                    fontSize=12,
                    textColor=colors.HexColor('#1e3a5f'),
                    spaceAfter=6,
                    spaceBefore=16 if idx > 1 else 0,
                    fontName='Helvetica-Bold',
                )
                
                story.append(Paragraph(f"{attachment_label}: {att.file_name}", att_header_style))
                
                # Attachment metadata
                file_size_kb = att.file_size / 1024 if att.file_size else 0
                file_size_str = f"{file_size_kb:.1f} KB" if file_size_kb < 1024 else f"{file_size_kb / 1024:.1f} MB"
                
                att_meta_parts = [
                    f"Type: {att.file_type}",
                    f"Size: {file_size_str}",
                ]
                
                # Format created_at
                try:
                    att_date_str = date_format(att.created_at, 'F j, Y, H:i')
                except (AttributeError, TypeError):
                    if hasattr(att.created_at, 'strftime'):
                        att_date_str = att.created_at.strftime('%B %d, %Y, %H:%M')
                    else:
                        att_date_str = str(att.created_at)
                
                if not is_original:
                    att_meta_parts.append(f"Added: {att_date_str}")
                
                story.append(Paragraph(" · ".join(att_meta_parts), meta_style))
                story.append(Spacer(1, 0.1*inch))
                
                # Try to embed the actual file content
                try:
                    from django.core.files.storage import default_storage
                    import os
                    
                    # Extract file path from file_url or construct it
                    file_path = None
                    if att.file_url:
                        # Extract path from URL (e.g., /media/correspondence_attachments/...)
                        if '/media/' in att.file_url:
                            file_path = att.file_url.split('/media/')[-1].lstrip('/')
                        elif att.file_url.startswith('http'):
                            # Full URL - extract path
                            from urllib.parse import urlparse
                            parsed = urlparse(att.file_url)
                            if '/media/' in parsed.path:
                                file_path = parsed.path.split('/media/')[-1].lstrip('/')
                            elif parsed.path.startswith('/correspondence_attachments/'):
                                file_path = parsed.path.lstrip('/')
                    else:
                        # Construct path from correspondence ID and filename
                        file_path = f"correspondence_attachments/{correspondence.id}/{att.file_name}"
                    
                    # Try multiple path variations if the first doesn't exist
                    possible_paths = []
                    if file_path:
                        possible_paths.append(file_path)
                    possible_paths.append(f"correspondence_attachments/{correspondence.id}/{att.file_name}")
                    # Also try with just the filename in case it's stored differently
                    possible_paths.append(att.file_name)
                    
                    # Find the first path that exists
                    file_path = None
                    for path in possible_paths:
                        if default_storage.exists(path):
                            file_path = path
                            break
                    
                    # Log for debugging if file not found
                    if not file_path:
                        logger.warning(f"Attachment file not found: {att.file_name}, tried paths: {possible_paths}, file_url: {att.file_url}")
                        story.append(Paragraph(f"<i>File not found in storage: {att.file_name}</i>", meta_style))
                        continue
                    
                    if file_path and default_storage.exists(file_path):
                        # Determine file type and handle accordingly
                        file_type_lower = (att.file_type or '').lower()
                        
                        if 'pdf' in file_type_lower:
                            # For PDFs, convert to image using poppler
                            pdf_embedded = False
                            try:
                                from pdf2image import convert_from_path
                                import tempfile
                                import subprocess
                                
                                # Check if poppler is available
                                poppler_available = False
                                try:
                                    # Try to find pdftoppm or pdftocairo
                                    result = subprocess.run(['which', 'pdftoppm'], capture_output=True, timeout=2)
                                    poppler_available = result.returncode == 0
                                    if not poppler_available:
                                        result = subprocess.run(['which', 'pdftocairo'], capture_output=True, timeout=2)
                                        poppler_available = result.returncode == 0
                                except Exception:
                                    pass
                                
                                # Find poppler path (check MacPorts first, then system)
                                poppler_path = None
                                poppler_bin_paths = [
                                    '/opt/local/bin',  # MacPorts
                                    '/usr/local/bin',  # Homebrew
                                    '/usr/bin',        # System
                                ]
                                for bin_path in poppler_bin_paths:
                                    pdftoppm_path = os.path.join(bin_path, 'pdftoppm')
                                    if os.path.exists(pdftoppm_path) and os.access(pdftoppm_path, os.X_OK):
                                        poppler_path = bin_path
                                        logger.info(f"Found poppler at: {poppler_path}")
                                        break
                                
                                if not poppler_available and not poppler_path:
                                    logger.warning("poppler not found - PDF preview requires poppler-utils to be installed")
                                    raise ImportError("poppler not available")
                                
                                # Get the full file system path if using local storage
                                if hasattr(default_storage, 'path'):
                                    try:
                                        # Local file storage
                                        full_path = default_storage.path(file_path)
                                        # Convert first page to image directly from file path
                                        # Use poppler_path if found
                                        # Use very high DPI (600) for maximum clarity
                                        convert_kwargs = {'first_page': 1, 'last_page': 1, 'dpi': 600}
                                        if poppler_path:
                                            convert_kwargs['poppler_path'] = poppler_path
                                        images = convert_from_path(full_path, **convert_kwargs)
                                        if images:
                                            img = images[0]
                                            # For maximum clarity, minimize resizing
                                            # Only resize if image is extremely large (over 7.5 inches at 600 DPI = 4500 pixels)
                                            # This preserves maximum detail
                                            max_width_pixels = 7.5 * 600  # 7.5 inches at 600 DPI
                                            if img.width > max_width_pixels:
                                                ratio = max_width_pixels / img.width
                                                new_height = img.height * ratio
                                                # Use highest quality resampling (LANCZOS is best for downscaling)
                                                img = img.resize((int(max_width_pixels), int(new_height)), Image.Resampling.LANCZOS)
                                            
                                            img_buffer = BytesIO()
                                            if img.mode in ('RGBA', 'LA', 'P'):
                                                rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                                                if img.mode == 'P':
                                                    img = img.convert('RGBA')
                                                rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                                                img = rgb_img
                                            # Save to temporary file for ReportLabImage with maximum quality
                                            import tempfile
                                            with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_img_file:
                                                # Save PNG with no compression for maximum quality
                                                img.save(tmp_img_file, format='PNG', optimize=False, compress_level=0)
                                                tmp_img_path = tmp_img_file.name
                                            
                                            # Track temp file for cleanup after PDF build
                                            temp_files_to_cleanup.append(tmp_img_path)
                                            
                                            from reportlab.platypus import Image as ReportLabImage
                                            # Convert pixel dimensions to points for ReportLab
                                            # At 600 DPI: 1 pixel = 72/600 = 0.12 points
                                            # Calculate available space: frame is ~492 x 672 points based on error
                                            # Use slightly smaller to ensure it fits: 6.5 inches = 468 points width
                                            max_width_pts = 6.5 * 72  # 6.5 inches = 468 points
                                            max_height_pts = 8.5 * 72  # 8.5 inches = 612 points (leave room for other content)
                                            
                                            # Convert image dimensions from pixels to points
                                            width_pts = img.width * (72.0 / 600.0)
                                            height_pts = img.height * (72.0 / 600.0)
                                            
                                            # Scale down if image is too large to fit in frame
                                            if width_pts > max_width_pts or height_pts > max_height_pts:
                                                width_ratio = max_width_pts / width_pts
                                                height_ratio = max_height_pts / height_pts
                                                # Use built-in min function explicitly to avoid shadowing issues
                                                import builtins
                                                scale_ratio = builtins.min(width_ratio, height_ratio)
                                                width_pts = width_pts * scale_ratio
                                                height_pts = height_pts * scale_ratio
                                            
                                            # Use the scaled dimensions to fit within page frame
                                            pdf_image_elem = ReportLabImage(
                                                tmp_img_path,
                                                width=width_pts,
                                                height=height_pts
                                            )
                                            story.append(pdf_image_elem)
                                            story.append(Paragraph("<i>First page of PDF document</i>", meta_style))
                                            pdf_embedded = True
                                    except Exception as e:
                                        logger.warning(
                                            f"pdf2image convert_from_path (file system) failed: {e}, "
                                            f"poppler_path={poppler_path}, file={full_path}",
                                            exc_info=True
                                        )
                                        # Don't raise - continue to try temp file method below
                                else:
                                    # Remote storage or BytesIO needed
                                    with default_storage.open(file_path, 'rb') as pdf_file:
                                        # Save to temp file for pdf2image
                                        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                                            tmp_file.write(pdf_file.read())
                                            tmp_path = tmp_file.name
                                    
                                    try:
                                        # Convert first page to image
                                        # Use poppler_path if found
                                        # Use very high DPI (600) for maximum clarity
                                        convert_kwargs = {'first_page': 1, 'last_page': 1, 'dpi': 600}
                                        if poppler_path:
                                            convert_kwargs['poppler_path'] = poppler_path
                                        images = convert_from_path(tmp_path, **convert_kwargs)
                                        if images:
                                            img = images[0]
                                            # For maximum clarity, minimize resizing
                                            # Only resize if image is extremely large (over 7.5 inches at 600 DPI = 4500 pixels)
                                            # This preserves maximum detail
                                            max_width_pixels = 7.5 * 600  # 7.5 inches at 600 DPI
                                            if img.width > max_width_pixels:
                                                ratio = max_width_pixels / img.width
                                                new_height = img.height * ratio
                                                # Use highest quality resampling (LANCZOS is best for downscaling)
                                                img = img.resize((int(max_width_pixels), int(new_height)), Image.Resampling.LANCZOS)
                                            
                                            img_buffer = BytesIO()
                                            if img.mode in ('RGBA', 'LA', 'P'):
                                                rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                                                if img.mode == 'P':
                                                    img = img.convert('RGBA')
                                                rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                                                img = rgb_img
                                            # Save to temporary file for ReportLabImage with maximum quality
                                            import tempfile
                                            with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_img_file:
                                                # Save PNG with no compression for maximum quality
                                                img.save(tmp_img_file, format='PNG', optimize=False, compress_level=0)
                                                tmp_img_path = tmp_img_file.name
                                            
                                            # Track temp file for cleanup after PDF build
                                            temp_files_to_cleanup.append(tmp_img_path)
                                            
                                            from reportlab.platypus import Image as ReportLabImage
                                            # Convert pixel dimensions to points for ReportLab
                                            # At 600 DPI: 1 pixel = 72/600 = 0.12 points
                                            # Calculate available space: frame is ~492 x 672 points based on error
                                            # Use slightly smaller to ensure it fits: 6.5 inches = 468 points width
                                            max_width_pts = 6.5 * 72  # 6.5 inches = 468 points
                                            max_height_pts = 8.5 * 72  # 8.5 inches = 612 points (leave room for other content)
                                            
                                            # Convert image dimensions from pixels to points
                                            width_pts = img.width * (72.0 / 600.0)
                                            height_pts = img.height * (72.0 / 600.0)
                                            
                                            # Scale down if image is too large to fit in frame
                                            if width_pts > max_width_pts or height_pts > max_height_pts:
                                                width_ratio = max_width_pts / width_pts
                                                height_ratio = max_height_pts / height_pts
                                                # Use built-in min function explicitly to avoid shadowing issues
                                                import builtins
                                                scale_ratio = builtins.min(width_ratio, height_ratio)
                                                width_pts = width_pts * scale_ratio
                                                height_pts = height_pts * scale_ratio
                                            
                                            # Use the scaled dimensions to fit within page frame
                                            pdf_image_elem = ReportLabImage(
                                                tmp_img_path,
                                                width=width_pts,
                                                height=height_pts
                                            )
                                            story.append(pdf_image_elem)
                                            story.append(Paragraph("<i>First page of PDF document</i>", meta_style))
                                            pdf_embedded = True
                                    finally:
                                        if os.path.exists(tmp_path):
                                            temp_files_to_cleanup.append(tmp_path)
                            except ImportError:
                                logger.warning("pdf2image not installed - poppler may be missing")
                            except Exception as e:
                                logger.warning(
                                    f"pdf2image conversion failed: {e}, "
                                    f"poppler_path={poppler_path}, file_path={file_path}",
                                    exc_info=True
                                )
                            
                            # If poppler conversion failed, show metadata only
                            if not pdf_embedded:
                                story.append(Paragraph("<b>PDF Document</b>", subheader_style))
                                story.append(Paragraph(
                                    f"<i>PDF file: {att.file_name}<br/>"
                                    f"Size: {file_size_str}<br/>"
                                    f"Note: PDF image conversion was not possible (poppler may not be available). "
                                    f"Please download the file to view its contents.</i>",
                                    meta_style
                                ))
                                logger.info(
                                    f"PDF image conversion failed for: {att.file_name}, "
                                    f"path: {file_path}, "
                                    f"exists: {default_storage.exists(file_path) if file_path else False}"
                                )
                        
                        elif 'image' in file_type_lower:
                            # For images, embed directly
                            try:
                                with default_storage.open(file_path, 'rb') as img_file:
                                    img = Image.open(img_file)
                                    # Resize to fit page width (max 5.5 inches)
                                    max_width = 5.5 * inch
                                    if img.width > max_width:
                                        ratio = max_width / img.width
                                        new_height = img.height * ratio
                                        img.thumbnail((max_width, new_height), Image.Resampling.LANCZOS)
                                    
                                    img_buffer = BytesIO()
                                    if img.mode in ('RGBA', 'LA', 'P'):
                                        rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                                        if img.mode == 'P':
                                            img = img.convert('RGBA')
                                        rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                                        img = rgb_img
                                    img.save(img_buffer, format='PNG')
                                    img_buffer.seek(0)
                                    
                                    from reportlab.platypus import Image as ReportLabImage
                                    img_reader = ImageReader(img_buffer)
                                    img_elem = ReportLabImage(img_reader, width=img.width, height=img.height)
                                    story.append(img_elem)
                            except Exception as e:
                                logger.warning(f"Could not embed image: {e}")
                                story.append(Paragraph("<i>Image file (could not be embedded)</i>", meta_style))
                        
                        else:
                            # For other file types, show metadata only
                            story.append(Paragraph(
                                f"<i>File type: {att.file_type or 'Unknown'}. "
                                f"Content preview not available for this file type.</i>",
                                meta_style
                            ))
                    else:
                        story.append(Paragraph("<i>File not found in storage</i>", meta_style))
                
                except Exception as e:
                    logger.warning(f"Error processing attachment {att.file_name}: {e}")
                    story.append(Paragraph(f"<i>Error loading attachment: {str(e)}</i>", meta_style))
                
                story.append(Spacer(1, 0.2*inch))
            
            story.append(Spacer(1, 0.2*inch))
        
        # Footer
        story.append(Spacer(1, 0.3*inch))
        try:
            generated_str = date_format(timezone.now(), 'F j, Y, H:i')
        except (AttributeError, TypeError):
            generated_str = timezone.now().strftime('%B %d, %Y, %H:%M')
        story.append(Paragraph(
            f"<i>Generated on {generated_str}</i>",
            meta_style
        ))
        
        # Build PDF
        try:
            doc.build(story)
            buffer.seek(0)
            return buffer.getvalue()
        finally:
            # Clean up all temporary files after PDF is built
            for temp_file in temp_files_to_cleanup:
                try:
                    if os.path.exists(temp_file):
                        os.unlink(temp_file)
                except Exception as e:
                    logger.warning(f"Failed to clean up temp file {temp_file}: {e}")


class CaseService:
    """Service for managing Cases - unified case/file management."""
    
    # Correspondence document types that should auto-create cases
    CASE_TRIGGERING_TYPES = [
        Correspondence.DocumentType.COMPLAINT,
        Correspondence.DocumentType.REQUEST,
        Correspondence.DocumentType.INQUIRY,
    ]
    
    # Map correspondence document types to case types
    CASE_TYPE_MAP = {
        Correspondence.DocumentType.COMPLAINT: "complaint",
        Correspondence.DocumentType.REQUEST: "request",
        Correspondence.DocumentType.INQUIRY: "inquiry",
        Correspondence.DocumentType.REPORT: "project",
        Correspondence.DocumentType.DIRECTIVE: "general",
        Correspondence.DocumentType.LETTER: "general",
        Correspondence.DocumentType.OTHER: "general",
    }
    
    @classmethod
    def generate_case_number(cls) -> str:
        """Generate a unique case number."""
        from datetime import datetime
        year = datetime.now().year
        # Format: CASE/YYYY/XXX (e.g., CASE/2025/001)
        last_case = Case.objects.filter(
            case_number__startswith=f"CASE/{year}/"
        ).order_by('-case_number').first()
        
        if last_case:
            try:
                last_num = int(last_case.case_number.split('/')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        return f"CASE/{year}/{next_num:03d}"
    
    @classmethod
    @transaction.atomic
    def create_case_from_correspondence(
        cls,
        correspondence: Correspondence,
        created_by: User | None = None,
    ) -> "Case":
        """
        Auto-create a Case from a Correspondence if it matches trigger criteria.
        
        Args:
            correspondence: The correspondence to create a case from
            created_by: User who triggered the case creation
            
        Returns:
            The created Case, or None if case should not be created
        """
        from correspondence.models import Case, CaseCorrespondenceLink
        
        # Check if correspondence type should trigger a case
        if correspondence.document_type not in cls.CASE_TRIGGERING_TYPES:
            return None
        
        # Check if case already exists for this correspondence
        if correspondence.case:
            return correspondence.case
        
        # Check if case already exists via link
        existing_link = CaseCorrespondenceLink.objects.filter(
            correspondence=correspondence,
            is_primary=True
        ).select_related('case').first()
        
        if existing_link:
            correspondence.case = existing_link.case
            correspondence.save(update_fields=['case'])
            return existing_link.case
        
        # Determine case type
        case_type = cls.CASE_TYPE_MAP.get(
            correspondence.document_type,
            "general"
        )
        
        # Generate case number
        case_number = cls.generate_case_number()
        
        # Create case
        case = Case.objects.create(
            case_number=case_number,
            title=correspondence.subject,
            description=correspondence.summary or correspondence.body_html[:500] if correspondence.body_html else "",
            case_type=case_type,
            status=Case.Status.OPEN,
            priority=correspondence.priority,
            division=correspondence.division,
            department=correspondence.department,
            owning_office=correspondence.owning_office,
            current_office=correspondence.current_office,
            created_by=created_by or correspondence.created_by,
            assigned_to=correspondence.current_approver,
            tags=correspondence.tags or [],
        )
        
        # Link correspondence to case
        CaseCorrespondenceLink.objects.create(
            case=case,
            correspondence=correspondence,
            is_primary=True,
        )
        
        # Update correspondence to reference case
        correspondence.case = case
        correspondence.save(update_fields=['case'])
        
        # Link the DMS document (if exists) to the case
        from correspondence.models import CorrespondenceDocumentLink
        doc_link = CorrespondenceDocumentLink.objects.filter(
            correspondence=correspondence
        ).select_related('document').first()
        
        if doc_link:
            from correspondence.models import CaseDocumentLink
            CaseDocumentLink.objects.get_or_create(
                case=case,
                document=doc_link.document,
            )
        
        # Log activity
        AuditService.log_activity(
            user=created_by or correspondence.created_by,
            action="case_created",
            object_type="case",
            object_id=str(case.id),
            description=f"Case {case.case_number} created from correspondence {correspondence.reference_number}",
            module="correspondence",
        )
        
        # Send notifications
        # Notify assigned user if different from creator
        if case.assigned_to and case.assigned_to != (created_by or correspondence.created_by):
            NotificationService.create_notification(
                recipient=case.assigned_to,
                title=f"New Case Assigned: {case.case_number}",
                message=f"Case '{case.title}' has been assigned to you. Created from correspondence {correspondence.reference_number}.",
                notification_type=Notification.NotificationType.SYSTEM,
                priority=Notification.Priority.HIGH if case.priority == "urgent" else Notification.Priority.NORMAL,
                sender=created_by or correspondence.created_by,
                module="case_management",
                related_object_type="case",
                related_object_id=str(case.id),
                action_url=f"/cases/{case.id}",
                action_required=True,
            )
        
        # Notify case creator
        creator = created_by or correspondence.created_by
        if creator:
            NotificationService.create_notification(
                recipient=creator,
                title=f"Case Created: {case.case_number}",
                message=f"Case '{case.title}' has been created successfully from correspondence {correspondence.reference_number}.",
                notification_type=Notification.NotificationType.SYSTEM,
                priority=Notification.Priority.NORMAL,
                module="case_management",
                related_object_type="case",
                related_object_id=str(case.id),
                action_url=f"/cases/{case.id}",
                action_required=False,
            )
        
        logger.info(f"Created case {case.case_number} from correspondence {correspondence.reference_number}")
        return case
    
    @classmethod
    @transaction.atomic
    def link_document_to_case(cls, case: "Case", document: Document, notes: str = "") -> "CaseDocumentLink":
        """Link a DMS document to a case."""
        from correspondence.models import CaseDocumentLink
        link, created = CaseDocumentLink.objects.get_or_create(
            case=case,
            document=document,
            defaults={"notes": notes},
        )
        if not created and notes:
            link.notes = notes
            link.save(update_fields=['notes'])
        
        # Send notification to case assigned user
        if case.assigned_to:
            NotificationService.create_notification(
                recipient=case.assigned_to,
                title=f"New Document Linked to Case: {case.case_number}",
                message=f"Document '{document.title}' has been linked to case '{case.title}'.",
                notification_type=Notification.NotificationType.SYSTEM,
                priority=Notification.Priority.NORMAL,
                module="case_management",
                related_object_type="case",
                related_object_id=str(case.id),
                action_url=f"/cases/{case.id}",
                action_required=False,
            )
        
        return link
    
    @classmethod
    @transaction.atomic
    def link_form_to_case(cls, case: "Case", form_document, notes: str = "") -> "CaseFormLink":
        """Link a form document to a case."""
        from correspondence.models import CaseFormLink
        link, created = CaseFormLink.objects.get_or_create(
            case=case,
            form_document=form_document,
            defaults={"notes": notes},
        )
        if not created and notes:
            link.notes = notes
            link.save(update_fields=['notes'])
        
        # Send notification to case assigned user
        if case.assigned_to:
            form_name = form_document.template.name if hasattr(form_document, 'template') and form_document.template else "Form"
            NotificationService.create_notification(
                recipient=case.assigned_to,
                title=f"New Form Linked to Case: {case.case_number}",
                message=f"Form '{form_name}' has been linked to case '{case.title}'.",
                notification_type=Notification.NotificationType.SYSTEM,
                priority=Notification.Priority.NORMAL,
                module="case_management",
                related_object_type="case",
                related_object_id=str(case.id),
                action_url=f"/cases/{case.id}",
                action_required=False,
            )
        
        return link
    
    @classmethod
    @transaction.atomic
    def link_correspondence_to_case(
        cls,
        case: "Case",
        correspondence: Correspondence,
        is_primary: bool = False,
        notes: str = "",
    ) -> "CaseCorrespondenceLink":
        """Link a correspondence to a case."""
        from correspondence.models import CaseCorrespondenceLink
        link, created = CaseCorrespondenceLink.objects.get_or_create(
            case=case,
            correspondence=correspondence,
            defaults={"is_primary": is_primary, "notes": notes},
        )
        if not created:
            if is_primary:
                link.is_primary = True
            if notes:
                link.notes = notes
            link.save(update_fields=['is_primary', 'notes'])
        
        # Update correspondence to reference case
        correspondence.case = case
        correspondence.save(update_fields=['case'])
        
        # Send notification to case assigned user
        if case.assigned_to:
            NotificationService.create_notification(
                recipient=case.assigned_to,
                title=f"New Correspondence Linked to Case: {case.case_number}",
                message=f"Correspondence '{correspondence.subject}' ({correspondence.reference_number}) has been linked to case '{case.title}'.",
                notification_type=Notification.NotificationType.SYSTEM,
                priority=Notification.Priority.NORMAL,
                module="case_management",
                related_object_type="case",
                related_object_id=str(case.id),
                action_url=f"/cases/{case.id}",
                action_required=False,
            )
        
        return link
    
    @classmethod
    @transaction.atomic
    def update_case_status(cls, case: "Case", new_status: str, updated_by: User | None = None) -> "Case":
        """Update case status and handle lifecycle transitions."""
        from django.utils import timezone
        
        old_status = case.status
        case.status = new_status
        
        # Handle status-specific logic
        if new_status == Case.Status.RESOLVED and not case.resolved_at:
            case.resolved_at = timezone.now()
        elif new_status == Case.Status.CLOSED and not case.closed_at:
            case.closed_at = timezone.now()
            # Auto-generate completion package
            cls.generate_case_completion_package(case, updated_by)
        
        case.save(update_fields=['status', 'resolved_at', 'closed_at'])
        
        # Log activity
        AuditService.log_activity(
            user=updated_by,
            action="case_status_updated",
            object_type="case",
            object_id=str(case.id),
            description=f"Case {case.case_number} status changed from {old_status} to {new_status}",
            module="correspondence",
        )
        
        # Send notifications for status changes
        if updated_by:
            # Notify assigned user if different from updater
            if case.assigned_to and case.assigned_to != updated_by:
                NotificationService.create_notification(
                    recipient=case.assigned_to,
                    title=f"Case Status Updated: {case.case_number}",
                    message=f"Case '{case.title}' status changed from {old_status.replace('_', ' ').title()} to {new_status.replace('_', ' ').title()}.",
                    notification_type=Notification.NotificationType.SYSTEM,
                    priority=Notification.Priority.HIGH if case.priority == "urgent" else Notification.Priority.NORMAL,
                    sender=updated_by,
                    module="case_management",
                    related_object_type="case",
                    related_object_id=str(case.id),
                    action_url=f"/cases/{case.id}",
                    action_required=(new_status in [Case.Status.IN_PROGRESS, Case.Status.OPEN]),
                )
            
            # Notify case creator if different from updater and assigned user
            if case.created_by and case.created_by != updated_by and case.created_by != case.assigned_to:
                NotificationService.create_notification(
                    recipient=case.created_by,
                    title=f"Case Status Updated: {case.case_number}",
                    message=f"Case '{case.title}' status changed from {old_status.replace('_', ' ').title()} to {new_status.replace('_', ' ').title()}.",
                    notification_type=Notification.NotificationType.SYSTEM,
                    priority=Notification.Priority.NORMAL,
                    sender=updated_by,
                    module="case_management",
                    related_object_type="case",
                    related_object_id=str(case.id),
                    action_url=f"/cases/{case.id}",
                    action_required=False,
                )
        
        return case
    
    @classmethod
    @transaction.atomic
    def generate_case_completion_package(cls, case: "Case", triggered_by: User | None = None) -> Document:
        """Generate completion package for a closed case."""
        from correspondence.models import CaseDocumentLink, CaseCorrespondenceLink, CaseFormLink
        
        # Check if completion package already exists
        if case.completion_package:
            return case.completion_package
        
        # Get all related items
        correspondence_list = case.get_related_correspondence()
        documents = case.get_related_documents()
        forms = case.get_related_forms()
        activities = case.get_all_activities()
        
        # Build comprehensive case summary
        context = {
            "case": case,
            "correspondence": correspondence_list,
            "documents": documents,
            "forms": forms,
            "activities": activities,
            "triggered_by": triggered_by,
        }
        
        # Generate PDF (similar to CompletionPackageService but for cases)
        pdf_bytes = cls._build_case_summary_pdf(context)
        
        # Create DMS document for completion package
        completion_doc = Document.objects.create(
            title=f"Case Completion Package - {case.case_number}",
            description=f"Complete case file for {case.title}",
            document_type=Document.DocumentType.REPORT,
            status=Document.DocumentStatus.PUBLISHED,
            sensitivity=Document.Sensitivity.INTERNAL,
            author=triggered_by or case.created_by,
            division=case.division,
            department=case.department,
        )
        
        # Store PDF as document version
        from django.core.files.base import ContentFile
        pdf_file = ContentFile(pdf_bytes)
        pdf_file.name = f"case_completion_{case.case_number}_{timezone.now().strftime('%Y%m%d')}.pdf"
        
        DocumentVersion.objects.create(
            document=completion_doc,
            version_number=1,
            file_name=pdf_file.name,
            file_type="application/pdf",
            file_size=len(pdf_bytes),
            file_url=default_storage.save(f"completion_packages/{pdf_file.name}", pdf_file),
            summary=f"Case completion package for {case.case_number}",
            uploaded_by=triggered_by or case.created_by,
        )
        
        # Link completion package to case
        case.completion_package = completion_doc
        case.completion_package_generated_at = timezone.now()
        case.save(update_fields=['completion_package', 'completion_package_generated_at'])
        
        # Link completion package document to case
        CaseDocumentLink.objects.create(
            case=case,
            document=completion_doc,
            notes="Auto-generated case completion package",
        )
        
        logger.info(f"Generated completion package for case {case.case_number}")
        return completion_doc
    
    @classmethod
    def _build_case_summary_pdf(cls, context: dict) -> bytes:
        """Build PDF summary for case completion package."""
        from reportlab.lib.pagesizes import LETTER
        from reportlab.lib.units import inch
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
        from reportlab.lib import colors
        from django.utils import timezone
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=LETTER, topMargin=0.75*inch, bottomMargin=0.75*inch)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=12,
            alignment=TA_CENTER,
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#2563eb'),
            spaceAfter=8,
            spaceBefore=12,
        )
        
        case = context['case']
        
        # Title
        story.append(Paragraph(f"Case Completion Package", title_style))
        story.append(Paragraph(f"{case.case_number}", title_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Case Information
        story.append(Paragraph("Case Information", heading_style))
        case_info = [
            ["Case Number:", case.case_number],
            ["Title:", case.title],
            ["Type:", case.get_case_type_display()],
            ["Status:", case.get_status_display()],
            ["Priority:", case.get_priority_display()],
            ["Opened:", case.opened_at.strftime('%B %d, %Y') if case.opened_at else "N/A"],
            ["Resolved:", case.resolved_at.strftime('%B %d, %Y') if case.resolved_at else "N/A"],
            ["Closed:", case.closed_at.strftime('%B %d, %Y') if case.closed_at else "N/A"],
        ]
        if case.description:
            case_info.append(["Description:", case.description])
        
        case_table = Table(case_info, colWidths=[2*inch, 4.5*inch])
        case_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        story.append(case_table)
        story.append(Spacer(1, 0.2*inch))
        
        # Related Correspondence
        if context['correspondence']:
            story.append(Paragraph("Related Correspondence", heading_style))
            for corr in context['correspondence']:
                story.append(Paragraph(f"• {corr.reference_number}: {corr.subject}", styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        # Related Documents
        if context['documents']:
            story.append(Paragraph("Related Documents", heading_style))
            for doc in context['documents']:
                story.append(Paragraph(f"• {doc.title} ({doc.get_document_type_display()})", styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        # Related Forms
        if context['forms']:
            story.append(Paragraph("Related Forms", heading_style))
            for form in context['forms']:
                story.append(Paragraph(f"• {form.document.title} ({form.get_status_display()})", styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        # Activities Timeline
        if context['activities']:
            story.append(Paragraph("Activity Timeline", heading_style))
            for activity in context['activities']:
                activity_date = activity.timestamp.strftime('%B %d, %Y, %H:%M')
                story.append(Paragraph(
                    f"• [{activity_date}] {activity.get_action_type_display()}: {activity.minute_text[:100]}...",
                    styles['Normal']
                ))
            story.append(Spacer(1, 0.2*inch))
        
        # Footer
        story.append(Spacer(1, 0.3*inch))
        generated_str = timezone.now().strftime('%B %d, %Y, %H:%M')
        story.append(Paragraph(f"<i>Generated on {generated_str}</i>", styles['Italic']))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    @classmethod
    def create_case_sla(cls, case: "Case") -> "CaseSLA":
        """Create or get existing SLA for a case."""
        from correspondence.models import CaseSLA
        from analytics.services import AnalyticsService
        from django.utils import timezone
        from datetime import timedelta
        
        # Check if SLA already exists
        if hasattr(case, 'sla'):
            return case.sla
        
        # Get SLA target hours based on case priority
        sla_targets = AnalyticsService.get_sla_targets()
        target_hours = sla_targets.get(case.priority, 120)  # Default to 120 hours (5 days) if priority not found
        
        # Calculate target date from case opened_at (convert hours to timedelta)
        opened_at = case.opened_at or timezone.now()
        target_date = opened_at + timedelta(hours=target_hours)
        
        # Store target_days in the model (convert hours to days for storage)
        target_days = target_hours / 24
        
        # Create SLA
        sla = CaseSLA.objects.create(
            case=case,
            target_days=target_days,
            target_date=target_date,
            warning_threshold_percent=75,
            critical_threshold_percent=90,
        )
        
        logger.info(f"Created SLA for case {case.case_number}: {target_hours} hours ({target_days} days), target date: {target_date}")
        return sla
    
    @classmethod
    def check_case_sla(cls, case: "Case") -> dict:
        """Check and return SLA status for a case."""
        from correspondence.models import CaseSLA
        from django.utils import timezone
        from datetime import timedelta
        
        # Get or create SLA
        if not hasattr(case, 'sla'):
            sla = cls.create_case_sla(case)
        else:
            sla = case.sla
        
        # Check status
        status = sla.check_status()
        
        # Calculate time remaining
        now = timezone.now()
        if sla.target_date > now:
            time_remaining = sla.target_date - now
            days_remaining = time_remaining.days
            hours_remaining = time_remaining.seconds // 3600
        else:
            time_remaining = now - sla.target_date
            days_remaining = -time_remaining.days
            hours_remaining = -(time_remaining.seconds // 3600)
        
        # Calculate percentage elapsed
        if case.opened_at:
            elapsed = (now - case.opened_at).total_seconds()
            total = (sla.target_date - case.opened_at).total_seconds()
            percent_elapsed = (elapsed / total) * 100 if total > 0 else 0
        else:
            percent_elapsed = 0
        
        return {
            "status": status,
            "target_days": sla.target_days,
            "target_date": sla.target_date.isoformat() if sla.target_date else None,
            "days_remaining": days_remaining,
            "hours_remaining": hours_remaining,
            "percent_elapsed": round(percent_elapsed, 2),
            "breached": sla.breached,
            "breached_at": sla.breached_at.isoformat() if sla.breached_at else None,
            "warning_threshold": sla.warning_threshold_percent,
            "critical_threshold": sla.critical_threshold_percent,
        }
    
    @classmethod
    def evaluate_workflow_rules(cls, case: "Case", event_type: str, context: dict) -> None:
        """
        Evaluate workflow rules for a case event.
        
        This method is called when case events occur (e.g., status changes) to
        evaluate and trigger any applicable workflow rules.
        
        Args:
            case: The case instance
            event_type: Type of event (e.g., "status_change", "created", "assigned")
            context: Additional context data for the event (e.g., {"old_status": "...", "new_status": "..."})
        
        Note:
            This is a stub implementation. Full workflow rules engine integration
            will be implemented when the workflow module is complete.
        """
        # Log the workflow event for future implementation
        logger.debug(
            f"Workflow rule evaluation for case {case.case_number}: "
            f"event_type={event_type}, context={context}"
        )
        
        # TODO: Implement full workflow rules engine integration
        # This will evaluate rules from the workflow.WorkflowRule model
        # and trigger appropriate actions (notifications, status changes, etc.)
        
        # For now, this is a no-op to prevent errors
        # Future implementation will:
        # 1. Query active workflow rules for this case type/division
        # 2. Evaluate rule conditions against case state and context
        # 3. Execute matching rule actions (notifications, status updates, etc.)
        pass


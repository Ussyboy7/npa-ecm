"""Domain services for correspondence workflows."""

from __future__ import annotations

import os
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
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
import logging

logger = logging.getLogger(__name__)

from accounts.models import User
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
from rest_framework.exceptions import ValidationError

from common.grade_utils import get_grade_level


def validate_workflow_vs_requirement(correspondence, template=None) -> None:
    """
    Validate that workflow configuration can satisfy correspondence's required approval level.

    Invariants:
    - Correspondence.required_approval_level is authoritative (NONE/DEPARTMENTAL/EXECUTIVE)
    - WorkflowStep.required_approval_level is routing constraint
    - If corr required=EXECUTIVE, workflow must contain a step with required_approval_level=executive,
      else ValidationError "Workflow configuration cannot satisfy this correspondence's required approval level."
    - DEPARTMENTAL: Officer -> GM APPROVED (DEPARTMENTAL+APPROVAL) -> Treat/COMPLETED
    - EXECUTIVE: Officer -> GM ENDORSED (DEPARTMENTAL+ENDORSEMENT) -> MD EXECUTIVE APPROVED -> Treat/COMPLETED,
      or direct Officer->MD when requires_departmental_endorsement=False (inferred from template steps)
    - Workflow grouping labels already: upward/downward/special; keep.

    Args:
        correspondence: Correspondence instance
        template: WorkflowTemplate instance, iterable of steps, or None (global check)

    Raises:
        ValidationError if mismatch.
    """
    from correspondence.models import Correspondence as CorrModel

    required = getattr(correspondence, "required_approval_level", None)
    # Normalize to lower string
    required_str = str(required).lower().strip() if required is not None else ""
    # NONE or empty -> no approval routing needed, always pass
    if required_str in ("", "none", CorrModel.RequiredApprovalLevel.NONE.lower()):
        return

    # Only EXECUTIVE needs strict check; DEPARTMENTAL always passes if workflow exists
    # (departmental can be satisfied by any workflow containing departmental or executive?
    #  but minimal: departmental passes regardless if at least one step exists or even if no executive)
    if required_str != CorrModel.RequiredApprovalLevel.EXECUTIVE.lower() and required_str != "executive":
        return

    # At this point required == EXECUTIVE -> need executive step
    # Resolve steps collection
    steps = []
    if template is None:
        # Global check: does any active correspondence workflow contain executive step?
        try:
            from workflow.models import WorkflowStep as WStep
            from workflow.models import WorkflowTemplate as WTemplate

            # If no workflow templates are configured at all (common in tests), don't block
            if not WTemplate.objects.filter(is_active=True, applies_to="correspondence").exists():
                return
            has_exec = WStep.objects.filter(
                required_approval_level__iexact="executive",
                template__is_active=True,
                template__applies_to="correspondence",
            ).exists()
            if has_exec:
                return
            # No executive step globally but templates exist -> fail
            raise ValidationError("Workflow configuration cannot satisfy this correspondence's required approval level.")
        except Exception as e:
            # If ValidationError already raised, re-raise
            if isinstance(e, ValidationError):
                raise
            # Fallback: treat as mismatch if we cannot determine
            raise ValidationError("Workflow configuration cannot satisfy this correspondence's required approval level.")
    else:
        # template provided could be WorkflowTemplate, QuerySet, list, or single step
        # If template has .steps manager
        if hasattr(template, "steps"):
            try:
                steps_qs = template.steps.all()  # type: ignore
                steps = list(steps_qs)
            except Exception:
                steps = list(template.steps.all()) if hasattr(template.steps, "all") else []
        elif isinstance(template, (list, tuple)):
            steps = list(template)
        else:
            # Unknown type, try to iterate
            try:
                steps = list(template)  # type: ignore
            except Exception:
                steps = []

        # Check for executive step (case-insensitive)
        has_exec = False
        for s in steps:
            lvl = getattr(s, "required_approval_level", "") or ""
            if str(lvl).lower() == "executive":
                has_exec = True
                break

        if not has_exec:
            raise ValidationError("Workflow configuration cannot satisfy this correspondence's required approval level.")

        # Direct MD path inference: if template has no departmental step but has executive,
        # it's considered direct MD (requires_departmental_endorsement=False) and should still pass.
        # No additional failure needed. The presence of executive satisfies requirement.
        # If template had explicit requires_departmental_endorsement flag, we could enforce:
        if hasattr(template, "requires_departmental_endorsement"):
            # If flag is True, we might want to ensure departmental step also exists?
            # For now, still only require executive; flag just governs routing, not validation failure.
            # Keeping minimal - don't fail on missing departmental even when flag True.
            pass
        return


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
        document_title: str | None = None,
    ) -> list[Document]:
        """
        Create DMS Documents from a Correspondence.
        
        Creates:
          - One PRIMARY Document from body_html (the memo / treatment response)
          - One ATTACHMENT Document per uploaded file
        
        Args:
            correspondence: The correspondence to create documents from
            attachments: Optional list of attachments
            document_title: Optional custom title for the PRIMARY document
            
        Returns:
            List of created DMS Documents (primary first, then attachments)
        """
        created: list[Document] = []

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

        # Build a clean plain-text description from treatment_response
        raw = correspondence.treatment_response or ""
        clean_desc = strip_tags(raw).strip()[:500] if raw else ""

        # ---------- PRIMARY document (the memo) ----------
        has_memo = bool(correspondence.body_html and correspondence.body_html.strip())
        has_treatment = bool(correspondence.treatment_response and correspondence.treatment_response.strip())

        # Skip auto-creation if the correspondence already has linked DMS documents
        # (e.g. TreatmentModal linked an HTML memo before this service runs)
        existing_links = CorrespondenceDocumentLink.objects.filter(
            correspondence=correspondence
        ).select_related('document')
        if existing_links.exists():
            return [link.document for link in existing_links]

        if has_memo or has_treatment:
            primary = Document.objects.create(
                title=document_title or correspondence.subject,
                description=clean_desc or f"Correspondence: {correspondence.reference_number}",
                document_type=dms_document_type,
                reference_number=correspondence.reference_number or "",
                status=Document.DocumentStatus.DRAFT,
                sensitivity=sensitivity,
                author=correspondence.created_by,
                division=correspondence.division,
                department=correspondence.department,
                tags=correspondence.tags or [],
                parent_document=parent_document,
                role=Document.Role.PRIMARY,
            )
            if has_memo:
                cls._create_document_version_from_body(primary, correspondence)
            elif has_treatment:
                # Fallback: create version from plain treatment_response text
                content_text = strip_tags(correspondence.treatment_response) if correspondence.treatment_response else ""
                DocumentVersion.objects.create(
                    document=primary,
                    version_number=1,
                    file_name=f"{correspondence.reference_number or 'correspondence'}.txt",
                    file_type="text/plain",
                    file_size=len(content_text.encode('utf-8')) if content_text else 0,
                    file_url="",
                    content_text=content_text,
                    content_html="",
                    summary="Correspondence treatment note",
                    uploaded_by=correspondence.created_by,
                    notes="Auto-created from correspondence treatment response",
                )
            CorrespondenceDocumentLink.objects.create(
                correspondence=correspondence,
                document=primary,
                notes="Primary document (memo)",
            )
            created.append(primary)

            # Log activity
            from audit.models import ActivityLog
            AuditService.log_document_activity(
                user=correspondence.created_by,
                action=ActivityLog.ActionType.DOCUMENT_CREATED,
                document=primary,
                request=None,
                description=f"Primary document auto-created from correspondence: {correspondence.reference_number}",
            )

        # ---------- ATTACHMENT documents (uploaded files) ----------
        if attachments is None:
            attachments = list(correspondence.attachments.all())

        for attachment in attachments:
            title = attachment.file_name or f"Attachment – {correspondence.subject}"
            # Strip extension from title for readability
            name, _ = os.path.splitext(attachment.file_name) if attachment.file_name else ("Attachment", "")
            title = name or f"Attachment – {correspondence.subject}"

            att_doc = Document.objects.create(
                title=title,
                description=clean_desc or f"Attachment for {correspondence.reference_number}",
                document_type=dms_document_type,
                reference_number=correspondence.reference_number or "",
                status=Document.DocumentStatus.DRAFT,
                sensitivity=sensitivity,
                author=correspondence.created_by,
                division=correspondence.division,
                department=correspondence.department,
                tags=correspondence.tags or [],
                parent_document=parent_document,
                role=Document.Role.ATTACHMENT,
            )
            cls._create_document_version_from_attachment(att_doc, attachment)
            CorrespondenceDocumentLink.objects.create(
                correspondence=correspondence,
                document=att_doc,
                notes=f"Attachment: {attachment.file_name}",
            )
            created.append(att_doc)

            # Log activity
            from audit.models import ActivityLog
            AuditService.log_document_activity(
                user=correspondence.created_by,
                action=ActivityLog.ActionType.DOCUMENT_CREATED,
                document=att_doc,
                request=None,
                description=f"Attachment document auto-created from correspondence: {correspondence.reference_number}",
            )

        return created

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
            summary="",  # Real summary via generate-summary after OCR/text extract
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
        Update all linked DMS documents to PUBLISHED when correspondence is completed.
        """
        links = CorrespondenceDocumentLink.objects.filter(
            correspondence=correspondence
        ).select_related('document')
        
        for link in links:
            if link.document:
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
        
        Grants READ access to ALL documents linked to the correspondence.
        """
        links = CorrespondenceDocumentLink.objects.filter(
            correspondence=minute.correspondence
        ).select_related('document')
        
        if not links:
            return
        
        recipients = []
        if minute.to_user:
            recipients.append(minute.to_user)
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
        
        if not recipients:
            return

        for link in links:
            document = link.document
            permission = DocumentPermission.objects.filter(
                document=document,
                access=DocumentPermission.AccessLevel.READ
            ).first()
            
            if not permission:
                permission = DocumentPermission.objects.create(
                    document=document,
                    access=DocumentPermission.AccessLevel.READ,
                    note=f'Auto-granted access via minute routing (Step {minute.step_number})'
                )
            
            for recipient in recipients:
                if recipient not in permission.users.all():
                    permission.users.add(recipient)


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

    @classmethod
    def generate_pdf(cls, correspondence: Correspondence) -> bytes:
        """
        Generate completion summary PDF bytes on demand.
        Does not create or update the DMS document; use for direct download.
        The completion package is still created and stored in DMS when correspondence
        is completed; this endpoint is an extra convenience.
        """
        if correspondence.status != Correspondence.Status.COMPLETED:
            raise ValueError("Completion summary PDF is only available for completed correspondence.")
        context = cls._build_summary_context(correspondence, None, document_created=False)
        return cls._build_summary_pdf(context)

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
            content_text=strip_tags(html),
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

        # Linked DMS document content for inclusion in summary
        document_content = ""
        from correspondence.models import CorrespondenceDocumentLink
        from dms.models import DocumentVersion

        doc_links = CorrespondenceDocumentLink.objects.filter(
            correspondence=correspondence
        ).select_related("document").order_by("created_at")
        for link in doc_links:
            latest = (
                DocumentVersion.objects.filter(document=link.document)
                .order_by("-version_number")
                .first()
            )
            if latest and (latest.content_html or latest.content_text):
                doc_content = latest.content_html or latest.content_text
                if doc_content and doc_content.strip():
                    document_content += f'<div class="linked-doc"><h3>{link.document.title}</h3>{doc_content}</div>'

        # Fallback: when no linked DMS content but attachments exist, show guidance
        if not document_content.strip() and attachments:
            has_body = bool(correspondence.body_html and correspondence.body_html.strip())
            has_treatment = bool(correspondence.treatment_response and correspondence.treatment_response.strip())
            if not has_body and not has_treatment:
                document_content = (
                    "<p class=\"muted\">Document content is available in the attachments below.</p>"
                )

        return {
            "correspondence": correspondence,
            "minutes": minutes,
            "attachments": attachments,
            "distribution": distribution,
            "generated_at": timezone.now(),
            "generated_by": generated_by,
            "document_created": document_created,
            "document_content": document_content,
        }

    @staticmethod
    def _build_summary_pdf(context: dict) -> bytes:
        """Build Official Correspondence Record PDF (matches reference design)."""
        from django.utils.dateformat import format as date_format
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=LETTER, 
                               rightMargin=0.65*inch, leftMargin=0.65*inch,
                               topMargin=0.55*inch, bottomMargin=0.55*inch)

        # Watermark for completion package — COMPLETED · date, light, diagonal (not sealer's name)
        from reportlab.lib.enums import TA_CENTER as _TA_CENTER
        def _watermark(canvas, _doc):
            canvas.saveState()
            canvas.setFont("Helvetica-Bold", 36)
            # light grey, very transparent
            try:
                canvas.setFillColor(colors.HexColor("#94a3b8"), alpha=0.28)
            except:
                canvas.setFillColor(colors.HexColor("#e2e8f0"))
            canvas.rotate(30)
            # Use COMPLETED + date, not sealer name
            from django.utils.dateformat import format as _fmt
            wm_date = _fmt(generated_at, 'j F Y') if 'generated_at' in locals() else ""
            # generated_at is defined later in story building; capture via closure after story is built,
            # so we defer textual content to build time by using a mutable holder
            # Instead, we will set canvas watermark text via doc watermarkText attribute set later
            txt = getattr(doc, '_watermark_text', "COMPLETED \u00b7 " + _fmt(generated_at, 'j F Y') if 'generated_at' in dir() else "COMPLETED")
            canvas.drawCentredString(320, 80, txt)
            canvas.restoreState()
        
        styles = getSampleStyleSheet()
        # Brand colors
        navy = colors.HexColor('#1e3a5f')
        teal = colors.HexColor('#0e7490')
        gold = colors.HexColor('#c5a15a')
        slate = colors.HexColor('#64748b')
        dark = colors.HexColor('#0f172a')
        # Cover & section styles
        kicker_style = ParagraphStyle('Kicker', parent=styles['Normal'], fontSize=7, textColor=teal, fontName='Helvetica-Bold', leading=9, spaceAfter=2, alignment=TA_LEFT)
        cover_title_style = ParagraphStyle('CoverTitle', parent=styles['Heading1'], fontSize=20, textColor=navy, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=6, leading=22)
        cover_sub_style = ParagraphStyle('CoverSub', parent=styles['Normal'], fontSize=8, textColor=teal, fontName='Helvetica-Bold', alignment=TA_CENTER, leading=10)
        cover_desc_style = ParagraphStyle('CoverDesc', parent=styles['Normal'], fontSize=9, textColor=slate, alignment=TA_CENTER, leading=12, spaceAfter=8)
        badge_style = ParagraphStyle('Badge', parent=styles['Normal'], fontSize=7, textColor=navy, backColor=colors.HexColor('#f1f5f9'), borderPadding=(4,8,4), alignment=TA_CENTER)
        section_title_style = ParagraphStyle('SectionTitle', parent=styles['Heading2'], fontSize=14, textColor=navy, fontName='Helvetica-Bold', spaceAfter=6, spaceBefore=14, leading=16)
        heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontSize=11, textColor=navy, fontName='Helvetica-Bold', spaceAfter=6, spaceBefore=10, leading=13, alignment=TA_LEFT)
        normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'], fontSize=9, textColor=dark, leading=12, alignment=TA_LEFT)
        meta_style = ParagraphStyle('MetaStyle', parent=styles['Normal'], fontSize=8, textColor=slate, leading=10, spaceAfter=4)
        minute_header_style = ParagraphStyle('MinuteHeader', parent=styles['Normal'], fontSize=10, textColor=dark, fontName='Helvetica-Bold', spaceAfter=2)
        minute_meta_style = ParagraphStyle('MinuteMeta', parent=styles['Normal'], fontSize=7, textColor=slate, spaceAfter=3)
        minute_text_style = ParagraphStyle('MinuteText', parent=styles['Normal'], fontSize=9, textColor=dark, leading=11, spaceAfter=6, leftIndent=8)
        
        story = []
        temp_files_to_cleanup = []
        correspondence = context['correspondence']
        minutes = context['minutes']
        distribution = context['distribution']
        attachments = context['attachments']
        generated_at = context['generated_at']
        generated_by = context.get('generated_by')

        # Helpers for new layout
        def _cover():
            # Logo
            try:
                logo_path = os.path.join(os.path.dirname(__file__), "npalogo.png")
                if os.path.exists(logo_path):
                    from reportlab.platypus import Image as RLImage
                    # Use a small crest at the top
                    logo_tbl = Table([[RLImage(logo_path, width=0.55*inch, height=0.55*inch)]], colWidths=[0.6*inch])
                    logo_tbl.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'CENTER'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE')]))
                    story.append(logo_tbl)
                    story.append(Spacer(1, 0.08*inch))
            except:
                pass
            # Badge
            badge_tbl = Table([[Paragraph('<font color="#1e3a5f"><b>OFFICIAL CORRESPONDENCE RECORD</b></font>', ParagraphStyle('b', parent=styles['Normal'], fontSize=7, textColor=navy, alignment=TA_CENTER))]], colWidths=[3.2*inch])
            badge_tbl.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')), ('ROUNDEDCORNERS', [4,4,4,4]), ('ALIGN', (0,0), (-1,-1), 'CENTER'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('LEFTPADDING', (0,0), (-1,-1), 6), ('RIGHTPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 4), ('TOPPADDING', (0,0), (-1,-1), 4)]))
            story.append(badge_tbl)
            story.append(Spacer(1, 0.12*inch))
            story.append(Paragraph("NIGERIAN PORTS AUTHORITY", ParagraphStyle('bt', parent=styles['Normal'], fontSize=11, textColor=navy, fontName='Helvetica-Bold', alignment=TA_CENTER, leading=13)))
            story.append(Paragraph("CORRESPONDENCE MANAGEMENT", ParagraphStyle('bs', parent=styles['Normal'], fontSize=7, textColor=teal, fontName='Helvetica-Bold', alignment=TA_CENTER, leading=9)))
            # gold line
            line_tbl = Table([['']], colWidths=[0.9*inch])
            line_tbl.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), gold), ('LINEABOVE', (0,0), (-1,0), 0, colors.white), ('LINEBELOW', (0,0), (-1,0), 1.2, gold)]))
            story.append(Spacer(1, 0.06*inch))
            story.append(line_tbl)
            story.append(Spacer(1, 0.1*inch))
            story.append(Paragraph("Correspondence Completion Package", cover_title_style))
            story.append(Paragraph("A complete record of the correspondence, attachment, and decision trail", cover_desc_style))
            story.append(Spacer(1, 0.18*inch))
            # Reference / Priority boxes
            ref = correspondence.reference_number or "—"
            pri = (correspondence.get_priority_display() if hasattr(correspondence, 'get_priority_display') else str(correspondence.priority)).upper() if correspondence.priority else "MEDIUM"
            t = Table([
                [Paragraph('<font size=7 color="#64748b">Reference</font><br/><font size=9 color="#1e3a5f"><b>%s</b></font>' % ref, normal_style),
                 Paragraph('<font size=7 color="#64748b">Priority</font><br/><font size=7 color="#92400e" backColor="#fef3c7"><b> %s </b></font>' % pri, normal_style)]
            ], colWidths=[2.3*inch, 1.3*inch])
            t.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')), ('ROUNDEDCORNERS', [6,6,6,6]), ('BOX', (0,0), (-1,-1), 0, colors.white), ('INNERGRID', (0,0), (-1,-1), 0, colors.white), ('LEFTPADDING', (0,0), (-1,-1), 10), ('RIGHTPADDING', (0,0), (-1,-1), 10), ('TOPPADDING', (0,0), (-1,-1), 8), ('BOTTOMPADDING', (0,0), (-1,-1), 8), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('ALIGN', (0,0), (-1,-1), 'CENTER')]))
            # Use a centered wrapper table
            wrap = Table([[t]], colWidths=[4.5*inch])
            wrap.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'CENTER')]))
            story.append(wrap)
            story.append(Spacer(1, 0.1*inch))
            story.append(Paragraph("Generated %s · %s" % (date_format(generated_at, 'j F Y'), (correspondence.owning_office.name if getattr(correspondence, 'owning_office', None) and correspondence.owning_office else "Managing Director Office")), ParagraphStyle('gen', parent=styles['Normal'], fontSize=7, textColor=colors.HexColor('#94a3b8'), alignment=TA_CENTER)))
            story.append(Spacer(1, 0.14*inch))
            # footer line
            owning = correspondence.owning_office.name if getattr(correspondence, 'owning_office', None) and correspondence.owning_office else "Managing Director Office"
            arch = correspondence.get_archive_level_display() if hasattr(correspondence, 'get_archive_level_display') else (correspondence.archive_level or "Not specified")
            footer = Table([[Paragraph('<font size=7 color="#64748b">Owning office: %s</font>' % owning, meta_style), Paragraph('<font size=7 color="#64748b">Archive level: %s</font>' % arch, ParagraphStyle('fm2', parent=meta_style, alignment=TA_RIGHT))]], colWidths=[3.5*inch, 3.5*inch])
            footer.setStyle(TableStyle([('LINEABOVE', (0,0), (-1,0), 0.5, colors.HexColor('#e2e8f0')), ('TOPPADDING', (0,0), (-1,-1), 6)]))
            story.append(footer)
            story.append(Spacer(1, 0.18*inch))

        def _section_kicker(num, title):
            story.append(Paragraph("%s / RECORD OVERVIEW" % num if "01" in num else "%s" % num, kicker_style))
            # Actually kicker is like 01 / RECORD OVERVIEW etc. We'll use generic
            story.append(Paragraph(title, section_title_style))

        # Build cover
        _cover()
        # We will continue with sections after this helper; keep story building for 01/02/03 below
        
        
        # Helper to convert HTML to ReportLab-safe format
        def html_to_reportlab(text):
            if not text or not str(text).strip():
                return ""
            import re
            t = re.sub(r'</(p|div|li|tr|h[1-6])>', '\n', str(text), flags=re.IGNORECASE)
            t = re.sub(r'<br\s*/?>', '\n', t, flags=re.IGNORECASE)
            t = strip_tags(t)
            t = t.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
            t = re.sub(r'\n\s*\n', '\n\n', t)
            return t.strip().replace('\n', '<br/>')

        # Title is now in cover, skip old title

        # 01 / RECORD OVERVIEW — Completion Summary
        story.append(Paragraph("01 / RECORD OVERVIEW", kicker_style))
        story.append(Paragraph("Completion Summary", section_title_style))
        story.append(Spacer(1, 0.08*inch))
        # Correspondence Document card
        doc_content = context.get("document_content", "")
        if doc_content and str(doc_content).strip():
            story.append(Paragraph(html_to_reportlab(doc_content), normal_style))
        else:
            # Fallback card
            card = Table([[Paragraph('<font size=8 color="#64748b">Correspondence Document</font><br/><font size=9>Document content is available in the attachments below.</font>', normal_style)]], colWidths=[6.8*inch])
            card.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')), ('ROUNDEDCORNERS', [6,6,6,6]), ('BOX', (0,0), (-1,-1), 0, colors.white), ('LEFTPADDING', (0,0), (-1,-1), 10), ('RIGHTPADDING', (0,0), (-1,-1), 10), ('TOPPADDING', (0,0), (-1,-1), 10), ('BOTTOMPADDING', (0,0), (-1,-1), 10)]))
            story.append(card)
        story.append(Spacer(1, 0.12*inch))
        # Subject / Current office two-col
        subj = correspondence.subject or "—"
        curr_off = correspondence.current_office.name if getattr(correspondence, 'current_office', None) and correspondence.current_office else (correspondence.owning_office.name if getattr(correspondence, 'owning_office', None) and correspondence.owning_office else "—")
        two_col = Table([
            [Paragraph('<font size=7 color="#64748b">Subject</font><br/><font size=9><b>%s</b></font>' % subj, normal_style),
             Paragraph('<font size=7 color="#64748b">Current office</font><br/><font size=9><b>%s</b></font>' % curr_off, normal_style)]
        ], colWidths=[3.4*inch, 3.4*inch])
        two_col.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')), ('ROUNDEDCORNERS', [6,6,6,6]), ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')), ('LEFTPADDING', (0,0), (-1,-1), 10), ('RIGHTPADDING', (0,0), (-1,-1), 10), ('TOPPADDING', (0,0), (-1,-1), 10), ('BOTTOMPADDING', (0,0), (-1,-1), 10), ('VALIGN', (0,0), (-1,-1), 'TOP')]))
        story.append(two_col)
        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph("AT A GLANCE", ParagraphStyle('atgl', parent=kicker_style, fontSize=7)))
        story.append(Paragraph("Package contents", ParagraphStyle('pkg', parent=section_title_style, fontSize=13)))
        pkg = Table([
            [Paragraph('<b>Item</b>', normal_style), Paragraph('<b>Description</b>', normal_style), Paragraph('<b>Status</b>', normal_style)],
            [Paragraph('01', normal_style), Paragraph('Correspondence completion summary', normal_style), Paragraph('Included', normal_style)],
            [Paragraph('02', normal_style), Paragraph('Original document attachment', normal_style), Paragraph('Included', normal_style)],
            [Paragraph('03', normal_style), Paragraph('Correspondence details and minutes', normal_style), Paragraph('Included', normal_style)],
        ], colWidths=[0.6*inch, 4.6*inch, 1.6*inch])
        pkg.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), navy), ('TEXTCOLOR', (0,0), (-1,0), colors.white), ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0), (-1,-1), 8), ('ALIGN', (0,0), (-1,-1), 'LEFT'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')), ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]), ('LEFTPADDING', (0,0), (-1,-1), 6), ('RIGHTPADDING', (0,0), (-1,-1), 6), ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6)]))
        story.append(pkg)
        story.append(Spacer(1, 0.1*inch))
        note = Table([[Paragraph('<font size=7 color="#1e3a5f"><b>Record note</b></font><br/><font size=8 color="#475569">This package consolidates the correspondence record and the supporting document for review, routing, and archival reference.</font>', normal_style)]], colWidths=[6.8*inch])
        note.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')), ('ROUNDEDCORNERS', [6,6,6,6]), ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')), ('LEFTPADDING', (0,0), (-1,-1), 10), ('RIGHTPADDING', (0,0), (-1,-1), 10), ('TOPPADDING', (0,0), (-1,-1), 10), ('BOTTOMPADDING', (0,0), (-1,-1), 10)]))
        story.append(note)
        story.append(Spacer(1, 0.18*inch))

        # 02 / SUPPORTING RECORD — Attachments & Documents Section (before meta - same order as Executive Approval)

        # Order: body_html, treatment_response, parent (Re:), linked DMS, fallback when attachments only
        has_doc = False
        if correspondence.body_html and str(correspondence.body_html).strip():
            story.append(Paragraph("Correspondence Document", heading_style))
            story.append(Spacer(1, 0.1*inch))
            story.append(Paragraph(html_to_reportlab(correspondence.body_html), normal_style))
            story.append(Spacer(1, 0.15*inch))
            has_doc = True
        if correspondence.treatment_response and str(correspondence.treatment_response).strip():
            if not has_doc:
                story.append(Paragraph("Correspondence Document", heading_style))
                story.append(Spacer(1, 0.1*inch))
                has_doc = True
            story.append(Paragraph(html_to_reportlab(correspondence.treatment_response), normal_style))
            story.append(Spacer(1, 0.15*inch))
        # Parent correspondence (for Re: / response correspondence)
        parent = getattr(correspondence, 'parent_correspondence', None)
        if parent:
            parent_content_parts = []
            if parent.body_html and str(parent.body_html).strip():
                parent_content_parts.append(html_to_reportlab(parent.body_html))
            if parent.treatment_response and str(parent.treatment_response).strip():
                parent_content_parts.append(html_to_reportlab(parent.treatment_response))
            from correspondence.models import Minute as MinuteModel
            for pm in MinuteModel.objects.filter(
                correspondence=parent,
            ).order_by('timestamp', 'step_number')[:5]:  # Limit to first 5 parent minutes
                if pm.minute_text and str(pm.minute_text).strip():
                    parent_content_parts.append(html_to_reportlab(pm.minute_text))
            if parent_content_parts:
                if not has_doc:
                    story.append(Paragraph("Correspondence Document", heading_style))
                    story.append(Spacer(1, 0.1*inch))
                    has_doc = True
                subheader = ParagraphStyle(
                    'CompletionSubheader', parent=styles['Heading3'],
                    fontSize=12, textColor=colors.HexColor('#475569'),
                    spaceAfter=6, fontName='Helvetica-Bold',
                )
                story.append(Paragraph(
                    f"<b>Original Request ({getattr(parent, 'reference_number', None) or getattr(parent, 'subject', 'Re:')}):</b>",
                    subheader,
                ))
                story.append(Paragraph("<br/><br/>".join(parent_content_parts), normal_style))
                story.append(Spacer(1, 0.15*inch))
        document_content = context.get("document_content", "")
        if document_content and str(document_content).strip():
            if not has_doc:
                story.append(Paragraph("Correspondence Document", heading_style))
                story.append(Spacer(1, 0.1*inch))
                has_doc = True
            story.append(Paragraph(html_to_reportlab(document_content), normal_style))
            story.append(Spacer(1, 0.15*inch))
        if has_doc:
            story.append(Spacer(1, 0.1*inch))

        # Attachments & Documents Section (before meta - same order as Executive Approval)
        # 02 / SUPPORTING RECORD
        story.append(Paragraph("02 / SUPPORTING RECORD", kicker_style))
        story.append(Paragraph("Attachments & Documents", section_title_style))
        story.append(Spacer(1, 0.08*inch))
        if attachments:
            story.append(Spacer(1, 0.15*inch))
            from reportlab.platypus import Image as ReportLabImage
            from reportlab.lib.utils import ImageReader
            try:
                from PIL import Image
            except ImportError:
                Image = None
            original_threshold = correspondence.created_at + timezone.timedelta(minutes=1) if hasattr(correspondence, 'created_at') and correspondence.created_at else None
            for idx, att in enumerate(attachments, 1):
                is_original = original_threshold and att.created_at <= original_threshold
                att_label = "Original Document" if is_original else f"Attachment #{idx}"
                att_header = ParagraphStyle(
                    'AttHeader', parent=styles['Heading3'], fontSize=12,
                    textColor=colors.HexColor('#1e3a5f'), spaceAfter=6,
                    spaceBefore=16 if idx > 1 else 0, fontName='Helvetica-Bold',
                )
                story.append(Paragraph(f"{att_label}: {att.file_name or 'Attachment'}", att_header))
                file_size_kb = att.file_size / 1024 if att.file_size else 0
                file_size_str = f"{file_size_kb:.1f} KB" if file_size_kb < 1024 else f"{file_size_kb / 1024:.1f} MB"
                story.append(Paragraph(f"{att.file_type or '—'} · {file_size_str}", meta_style))
                story.append(Spacer(1, 0.1*inch))
                try:
                    file_path = None
                    if att.file_url:
                        if '/media/' in att.file_url:
                            file_path = att.file_url.split('/media/')[-1].lstrip('/')
                        elif att.file_url.startswith('http'):
                            from urllib.parse import urlparse
                            parsed = urlparse(att.file_url)
                            if '/media/' in parsed.path:
                                file_path = parsed.path.split('/media/')[-1].lstrip('/')
                            elif parsed.path.startswith('/correspondence_attachments/'):
                                file_path = parsed.path.lstrip('/')
                    if not file_path:
                        file_path = f"correspondence_attachments/{correspondence.id}/{att.file_name}"
                    possible_paths = [file_path, f"correspondence_attachments/{correspondence.id}/{att.file_name}", att.file_name]
                    file_path = next((p for p in possible_paths if default_storage.exists(p)), None)
                    if file_path and default_storage.exists(file_path):
                        # For completion package, use the original PDF without the seal's diagonal (so only COMPLETED shows)
                        # If this attachment was auto-promoted to a DMS doc with a sealed version, prefer the first version's file
                        try:
                            from dms.models import Document as _DmsDoc
                            _doc = _DmsDoc.objects.filter(versions__file_url=file_path).first() or _DmsDoc.objects.filter(title=att.file_name.replace('.pdf','')).first()
                            if _doc and _doc.versions.count() > 1:
                                first_v = _doc.versions.order_by('version_number').first()
                                if first_v and first_v.file_url and default_storage.exists(first_v.file_url.split('/media/')[-1].lstrip('/')):
                                    file_path = first_v.file_url.split('/media/')[-1].lstrip('/')
                        except: pass
                        ft, fn = (att.file_type or '').lower(), (att.file_name or '').lower()
                        if 'image' in ft:
                            with default_storage.open(file_path, 'rb') as img_file:
                                img = Image.open(img_file)
                                max_width = 5.5 * inch
                                if img.width > max_width:
                                    ratio = max_width / img.width
                                    img.thumbnail((max_width, img.height * ratio), Image.Resampling.LANCZOS)
                                img_buffer = BytesIO()
                                if img.mode in ('RGBA', 'LA', 'P'):
                                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                                    if img.mode == 'P':
                                        img = img.convert('RGBA')
                                    rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                                    img = rgb_img
                                img.save(img_buffer, format='PNG')
                                img_buffer.seek(0)
                                story.append(ReportLabImage(ImageReader(img_buffer), width=img.width, height=img.height))
                        elif 'pdf' in ft or fn.endswith('.pdf'):
                            try:
                                from pdf2image import convert_from_path
                                import tempfile
                                full_path = default_storage.path(file_path)
                                images = convert_from_path(full_path, first_page=1, last_page=1, dpi=150)
                                if images:
                                    img = images[0]
                                    if img.mode in ('RGBA', 'LA', 'P'):
                                        rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                                        if img.mode == 'P':
                                            img = img.convert('RGBA')
                                        rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                                        img = rgb_img
                                    with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
                                        img.save(tmp, format='PNG')
                                        tmp_path = tmp.name
                                        temp_files_to_cleanup.append(tmp_path)
                                    max_w, max_h = 6.5 * 72, 8.5 * 72
                                    w_pts = img.width * (72.0 / 150.0)
                                    h_pts = img.height * (72.0 / 150.0)
                                    if w_pts > max_w or h_pts > max_h:
                                        r = min(max_w / w_pts, max_h / h_pts)
                                        w_pts, h_pts = w_pts * r, h_pts * r
                                    story.append(ReportLabImage(tmp_path, width=w_pts, height=h_pts))
                                    story.append(Paragraph("<i>First page of PDF</i>", meta_style))
                            except Exception as e:
                                logger.warning("PDF conversion failed: %s", e)
                                story.append(Paragraph(f"<i>PDF: {att.file_name} (preview unavailable)</i>", meta_style))
                        elif 'html' in ft or fn.endswith(('.html', '.htm')):
                            with default_storage.open(file_path, 'rb') as f:
                                html_content = f.read().decode('utf-8', errors='replace')
                            if html_content and html_content.strip():
                                story.append(Paragraph(html_to_reportlab(html_content), normal_style))
                            else:
                                story.append(Paragraph("<i>HTML file (empty)</i>", meta_style))
                        else:
                            story.append(Paragraph(f"<i>File: {att.file_name} (preview not available)</i>", meta_style))
                    else:
                        story.append(Paragraph(f"<i>File not found: {att.file_name}</i>", meta_style))
                except Exception as e:
                    logger.warning("Attachment processing error for %s: %s", att.file_name, e)
                    story.append(Paragraph(f"<i>Error loading: {att.file_name}</i>", meta_style))
                story.append(Spacer(1, 0.2*inch))
            story.append(Spacer(1, 0.15*inch))
        else:
            story.append(Paragraph("02 / SUPPORTING RECORD", kicker_style))
            story.append(Paragraph("Attachments & Documents", section_title_style))
            story.append(Paragraph("No attachments were linked to this correspondence.", normal_style))
            story.append(Spacer(1, 0.2*inch))

        # 03 / ROUTING RECORD
        story.append(Paragraph("03 / ROUTING RECORD", kicker_style))
        story.append(Paragraph("Correspondence Details", section_title_style))
        
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
        
        story.append(Spacer(1, 0.22*inch))
        
        story.append(Paragraph("Minutes & Decisions", section_title_style))
        
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
                
                story.append(Spacer(1, 0.08*inch))
        else:
            story.append(Paragraph("<i>— No minutes recorded —</i>", meta_style))
        
        story.append(Spacer(1, 0.22*inch))
        
        # Distribution Section
        story.append(Paragraph("Distribution", heading_style))
        
        if distribution:
            dist_data = [['Recipient', 'Type', 'Purpose']]
            for entry in distribution:
                recipient_name = "—"
                if hasattr(entry, 'directorate') and entry.directorate:
                    recipient_name = entry.directorate.name
                elif hasattr(entry, 'office') and entry.office:
                    recipient_name = entry.office.name
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
            story.append(Paragraph("<i>— No distribution list —</i>", meta_style))
        
        story.append(Spacer(1, 0.15*inch))

        # Build PDF with COMPLETED watermark (light, diagonal)
        from django.utils.dateformat import format as _fmt2
        try:
            wm_txt = "COMPLETED \u00b7 " + _fmt2(generated_at, 'Y-m-d H:i') + " UTC"
        except:
            wm_txt = "COMPLETED"
        doc._watermark_text = wm_txt
        doc.build(story, onFirstPage=_watermark, onLaterPages=_watermark)
        for tmp in temp_files_to_cleanup:
            try:
                os.unlink(tmp)
            except Exception:
                pass
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
            if entry.office_id:
                office_ids.add(str(entry.office_id))
            elif entry.department_id:
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
            if entry.office_id:
                office = Office.objects.filter(id=entry.office_id).first()
                if office and office.division_id:
                    divisions.add(office.division_id)
                if office and office.department_id:
                    departments.add(office.department_id)
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
        
        Document content (in order):
        - body_html, treatment_response
        - Parent correspondence content (for Re: responses)
        - Treat/forward minute text (request context)
        - Linked DMS document content
        - Attachments (PDFs, images, HTML files)
        - Correspondence details
        - Minutes & actions with digital seal
        - Footer
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
        
        # Helper to convert HTML to ReportLab-safe format (Paragraph supports <b>, <i>, <br/>, etc.)
        def html_to_reportlab(html):
            if not html or not html.strip():
                return ""
            import re
            text = re.sub(r'</(p|div|li|tr|h[1-6])>', '\n', html, flags=re.IGNORECASE)
            text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
            text = strip_tags(text)
            text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
            text = re.sub(r'\n\s*\n', '\n\n', text)
            return text.strip().replace('\n', '<br/>')
        
        # Title
        story.append(Paragraph("EXECUTIVE APPROVAL DOCUMENT", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # --- SECTION 1: Document That Was Approved ---
        # Bundles approved document content with minutes and seal in one PDF
        has_doc_content = False
        
        # 1a. Letter/Body content (body_html)
        if correspondence.body_html and correspondence.body_html.strip():
            story.append(Paragraph("Document Content", header_style))
            story.append(Spacer(1, 0.1*inch))
            body_safe = html_to_reportlab(correspondence.body_html)
            if body_safe:
                story.append(Paragraph(body_safe, normal_style))
                story.append(Spacer(1, 0.2*inch))
                has_doc_content = True
        
        # 1a2. Treatment/Request content (treatment_response)
        if correspondence.treatment_response and correspondence.treatment_response.strip():
            if not has_doc_content:
                story.append(Paragraph("Document Content", header_style))
                story.append(Spacer(1, 0.1*inch))
            treatment_safe = html_to_reportlab(correspondence.treatment_response)
            if treatment_safe:
                story.append(Paragraph(treatment_safe, normal_style))
                story.append(Spacer(1, 0.2*inch))
                has_doc_content = True
        
        # 1a3. Parent correspondence content (for Re: / response correspondence)
        parent = getattr(correspondence, 'parent_correspondence', None)
        if parent:
            parent_content_parts = []
            if parent.body_html and parent.body_html.strip():
                parent_content_parts.append(html_to_reportlab(parent.body_html))
            if parent.treatment_response and parent.treatment_response.strip():
                parent_content_parts.append(html_to_reportlab(parent.treatment_response))
            # Parent's non-approval minutes (request is often in treat/minute)
            for pm in MinuteModel.objects.filter(
                correspondence=parent,
            ).exclude(action_type=MinuteModel.ActionType.APPROVE).order_by('timestamp', 'step_number'):
                if pm.minute_text and pm.minute_text.strip():
                    parent_content_parts.append(html_to_reportlab(pm.minute_text))
            if parent_content_parts:
                if not has_doc_content:
                    story.append(Paragraph("Document Content", header_style))
                    story.append(Spacer(1, 0.1*inch))
                story.append(Paragraph(
                    f"<b>Original Request ({parent.reference_number or parent.subject}):</b>",
                    subheader_style
                ))
                story.append(Paragraph("<br/><br/>".join(parent_content_parts), normal_style))
                story.append(Spacer(1, 0.2*inch))
                has_doc_content = True
        
        # 1a4. Minute text (all non-approval minutes - often contain the request)
        pre_approval_minutes = MinuteModel.objects.filter(
            correspondence=correspondence,
        ).exclude(action_type=MinuteModel.ActionType.APPROVE).order_by('timestamp', 'step_number')
        for m in pre_approval_minutes:
            if m.minute_text and m.minute_text.strip():
                if not has_doc_content:
                    story.append(Paragraph("Document Content", header_style))
                    story.append(Spacer(1, 0.1*inch))
                user_name = m.user.get_full_name() if m.user else m.user.username if m.user else "Unknown"
                action_label = m.get_action_type_display() if hasattr(m, 'get_action_type_display') else str(m.action_type).title()
                story.append(Paragraph(f"<b>{action_label} by {user_name}:</b>", subheader_style))
                story.append(Paragraph(m.minute_text.replace('\n', '<br/>'), normal_style))
                story.append(Spacer(1, 0.15*inch))
                has_doc_content = True
        
        # 1b. Linked DMS document content
        from correspondence.models import CorrespondenceDocumentLink
        doc_links = CorrespondenceDocumentLink.objects.filter(
            correspondence=correspondence
        ).select_related('document').order_by('created_at')
        for link in doc_links:
            latest_version = (
                DocumentVersion.objects.filter(document=link.document)
                .order_by('-version_number')
                .first()
            )
            if latest_version and (latest_version.content_html or latest_version.content_text):
                if not has_doc_content:
                    story.append(Paragraph("Document Content", header_style))
                    story.append(Spacer(1, 0.1*inch))
                content = latest_version.content_html or latest_version.content_text
                content_safe = html_to_reportlab(content)
                if content_safe:
                    story.append(Paragraph(f"<b>Linked: {link.document.title}</b>", subheader_style))
                    story.append(Paragraph(content_safe, normal_style))
                    story.append(Spacer(1, 0.15*inch))
                    has_doc_content = True
        
        # 1c. Attachments (original document + other attachments) - embed before correspondence details
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
                file_size_kb = att.file_size / 1024 if att.file_size else 0
                file_size_str = f"{file_size_kb:.1f} KB" if file_size_kb < 1024 else f"{file_size_kb / 1024:.1f} MB"
                att_meta_parts = [f"Type: {att.file_type}", f"Size: {file_size_str}"]
                try:
                    att_date_str = date_format(att.created_at, 'F j, Y, H:i')
                except (AttributeError, TypeError):
                    att_date_str = att.created_at.strftime('%B %d, %Y, %H:%M') if hasattr(att.created_at, 'strftime') else str(att.created_at)
                if not is_original:
                    att_meta_parts.append(f"Added: {att_date_str}")
                story.append(Paragraph(" · ".join(att_meta_parts), meta_style))
                story.append(Spacer(1, 0.1*inch))
                # Try to embed the actual file content (PDF, image, etc.)
                try:
                    from django.core.files.storage import default_storage
                    import os
                    file_path = None
                    if att.file_url:
                        if '/media/' in att.file_url:
                            file_path = att.file_url.split('/media/')[-1].lstrip('/')
                        elif att.file_url.startswith('http'):
                            from urllib.parse import urlparse
                            parsed = urlparse(att.file_url)
                            if '/media/' in parsed.path:
                                file_path = parsed.path.split('/media/')[-1].lstrip('/')
                            elif parsed.path.startswith('/correspondence_attachments/'):
                                file_path = parsed.path.lstrip('/')
                    else:
                        file_path = f"correspondence_attachments/{correspondence.id}/{att.file_name}"
                    possible_paths = [file_path] if file_path else []
                    possible_paths.extend([
                        f"correspondence_attachments/{correspondence.id}/{att.file_name}",
                        att.file_name,
                    ])
                    file_path = next((p for p in possible_paths if default_storage.exists(p)), None)
                    if not file_path:
                        logger.warning(f"Attachment file not found: {att.file_name}, file_url: {att.file_url}")
                        story.append(Paragraph(f"<i>File not found in storage: {att.file_name}</i>", meta_style))
                    elif file_path and default_storage.exists(file_path):
                        file_type_lower = (att.file_type or '').lower()
                        if 'pdf' in file_type_lower:
                            pdf_embedded = False
                            try:
                                from pdf2image import convert_from_path
                                import tempfile
                                poppler_path = None
                                for bin_path in ['/opt/local/bin', '/usr/local/bin', '/usr/bin']:
                                    if os.path.exists(os.path.join(bin_path, 'pdftoppm')):
                                        poppler_path = bin_path
                                        break
                                if hasattr(default_storage, 'path'):
                                    full_path = default_storage.path(file_path)
                                    convert_kwargs = {'first_page': 1, 'last_page': 1, 'dpi': 300}
                                    if poppler_path:
                                        convert_kwargs['poppler_path'] = poppler_path
                                    images = convert_from_path(full_path, **convert_kwargs)
                                    if images:
                                        img = images[0]
                                        if img.mode in ('RGBA', 'LA', 'P'):
                                            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                                            if img.mode == 'P':
                                                img = img.convert('RGBA')
                                            rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                                            img = rgb_img
                                        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
                                            img.save(tmp, format='PNG')
                                            tmp_path = tmp.name
                                            temp_files_to_cleanup.append(tmp_path)
                                        from reportlab.platypus import Image as ReportLabImage
                                        max_w, max_h = 6.5 * 72, 8.5 * 72
                                        w_pts = img.width * (72.0 / 300.0)
                                        h_pts = img.height * (72.0 / 300.0)
                                        if w_pts > max_w or h_pts > max_h:
                                            r = min(max_w / w_pts, max_h / h_pts)
                                            w_pts, h_pts = w_pts * r, h_pts * r
                                        story.append(ReportLabImage(tmp_path, width=w_pts, height=h_pts))
                                        story.append(Paragraph("<i>First page of PDF document</i>", meta_style))
                                        pdf_embedded = True
                            except Exception as e:
                                logger.warning(f"PDF conversion failed: {e}")
                            if not pdf_embedded:
                                story.append(Paragraph(f"<i>PDF file: {att.file_name} (preview unavailable)</i>", meta_style))
                        elif 'html' in file_type_lower or (att.file_name or '').lower().endswith('.html'):
                            # HTML attachment - include content in document
                            try:
                                with default_storage.open(file_path, 'rb') as f:
                                    html_content = f.read().decode('utf-8', errors='replace')
                                if html_content and html_content.strip():
                                    story.append(Paragraph(html_to_reportlab(html_content), normal_style))
                                else:
                                    story.append(Paragraph("<i>HTML file (empty)</i>", meta_style))
                            except Exception as e:
                                logger.warning(f"Could not read HTML attachment {att.file_name}: {e}")
                                story.append(Paragraph(f"<i>HTML file: {att.file_name} (could not read)</i>", meta_style))
                        elif 'image' in file_type_lower:
                            try:
                                with default_storage.open(file_path, 'rb') as img_file:
                                    img = Image.open(img_file)
                                    max_width = 5.5 * inch
                                    if img.width > max_width:
                                        ratio = max_width / img.width
                                        img.thumbnail((max_width, img.height * ratio), Image.Resampling.LANCZOS)
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
                                    from reportlab.lib.utils import ImageReader
                                    story.append(ReportLabImage(ImageReader(img_buffer), width=img.width, height=img.height))
                            except Exception as e:
                                logger.warning(f"Image embed failed: {e}")
                                story.append(Paragraph("<i>Image file (could not be embedded)</i>", meta_style))
                        else:
                            story.append(Paragraph(f"<i>File type: {att.file_type}. Preview not available.</i>", meta_style))
                    else:
                        story.append(Paragraph("<i>File not found in storage</i>", meta_style))
                except Exception as e:
                    logger.warning(f"Error processing attachment {att.file_name}: {e}")
                    story.append(Paragraph(f"<i>Error loading: {str(e)}</i>", meta_style))
                story.append(Spacer(1, 0.2*inch))
            story.append(Spacer(1, 0.2*inch))

        # Correspondence Details Section
        story.append(Paragraph("Correspondence Details", header_style))
        story.append(Spacer(1, 0.1*inch))
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
                                img.thumbnail((900, 900), Image.Resampling.LANCZOS)
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
                                
                                story.append(Spacer(1, 0.1*inch))
                                # Center the image
                                from reportlab.platypus import Image as ReportLabImage
                                seal_image_elem = ReportLabImage(img_buffer, width=144, height=144)
                                story.append(seal_image_elem)
                    except ImportError as e:
                        logger.warning(f"PIL or reportlab not available for seal image: {e}")
                    except Exception as e:
                        logger.warning(f"Could not load seal image: {e}")
            
            story.append(Spacer(1, 0.15*inch))
        
        if not all_minutes.exists():
            story.append(Paragraph("No minutes recorded for this correspondence.", normal_style))
        
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
            for temp_file in temp_files_to_cleanup:
                try:
                    if os.path.exists(temp_file):
                        os.unlink(temp_file)
                except Exception as e:
                    logger.warning(f"Failed to clean up temp file {temp_file}: {e}")


class CaseService:
    """Service for managing Cases - unified case/file management."""
    
    CASE_TRIGGERING_TYPES = [
        Correspondence.DocumentType.COMPLAINT,
        Correspondence.DocumentType.REQUEST,
        Correspondence.DocumentType.INQUIRY,
    ]
    
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
        today = timezone.now().date()
        count = Case.objects.filter(opened_at__date=today).count() + 1
        return f"CASE/{today.strftime('%Y%m%d')}/{count:04d}"
    
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
            description=(
                correspondence.treatment_response
                or (correspondence.body_html[:500] if correspondence.body_html else "")
            ),
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
        from correspondence.models import CaseDocumentLink
        
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
        from reportlab.lib.enums import TA_CENTER
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
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
        from django.utils import timezone
        
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


# ──────────────────────────────────────────────
#  Shared routing helpers
# ──────────────────────────────────────────────


def find_office_recipient(office, preferred_user=None):
    """
    Find the appropriate recipient for an office.

    Relaxed behaviour (per product decision):
    - Caller may select ANY user in the hierarchy, not only strict office members.
    - If a preferred_user is specified:
      - If they're a member of the given office, use them.
      - Otherwise, try to derive their primary office and use that.
      - If that still fails, fall back to the office head / hierarchy.

    Priority:
    1. Active ActingAppointment for the office (seat succession) — acting user
       (if preferred_user is the absent principal, redirect to acting user)
    2. preferred_user (if resolvable to an office)
    3. principal
    4. acting head membership
    5. highest grade staff

    Returns: (user, is_acting) tuple or (None, False) if no one found
    """
    from organization.acting_services import get_active_appointment_for_office

    active_appointment = get_active_appointment_for_office(office)
    if active_appointment:
        if preferred_user and preferred_user.id == active_appointment.principal_id:
            return (active_appointment.acting_user, True)
        if preferred_user and preferred_user.id == active_appointment.acting_user_id:
            return (active_appointment.acting_user, True)
        if preferred_user is None:
            return (active_appointment.acting_user, True)
        # Non-principal preferred user: allow explicit routing to that person,
        # but still prefer acting when the preferred user is unresolved below.

    if preferred_user:
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
            is_acting = (
                user_membership.assignment_role == "acting"
                or (
                    active_appointment is not None
                    and preferred_user.id == active_appointment.acting_user_id
                )
            )
            return (preferred_user, is_acting)

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
            is_acting = (
                primary_membership.assignment_role == "acting"
                or (
                    active_appointment is not None
                    and preferred_user.id == active_appointment.acting_user_id
                )
            )
            return (preferred_user, is_acting)

    if active_appointment:
        return (active_appointment.acting_user, True)

    principal = OfficeMembership.objects.filter(
        office=office,
        is_active=True,
        assignment_role='principal'
    ).select_related('user').first()

    if principal:
        return (principal.user, False)

    acting = OfficeMembership.objects.filter(
        office=office,
        is_active=True,
        assignment_role='acting'
    ).select_related('user').order_by('-starts_at').first()

    if acting:
        return (acting.user, True)

    memberships = OfficeMembership.objects.filter(
        office=office,
        is_active=True
    ).select_related('user').all()

    if memberships.exists():
        sorted_memberships = sorted(
            memberships,
            key=lambda m: get_grade_level(getattr(m.user, 'grade_level', None)),
            reverse=True,
        )
        highest_grade = sorted_memberships[0]
        return (highest_grade.user, False)

    return (None, False)


def route_back_to_origin(correspondence, parallel_group, acting_user):
    """Route correspondence back to the origin office after a parallel merge.

    Returns True if a route-back actually happened.
    """
    origin_office = correspondence.owning_office
    if not origin_office and parallel_group.created_by_id:
        _m = OfficeMembership.objects.filter(
            user_id=parallel_group.created_by_id,
            is_active=True,
            is_primary=True,
        ).select_related("office").first()
        origin_office = _m.office if _m else None

    if not origin_office:
        return False

    try:
        _ru, _ = find_office_recipient(origin_office, None)
    except ValidationError:
        _ru = None

    correspondence.current_office = origin_office
    if _ru and _ru.id != acting_user.id:
        correspondence.current_approver = _ru
    correspondence.save(
        update_fields=[
            f for f in ["current_office", "current_approver", "updated_at"]
            if (f != "current_approver" or bool(_ru))
        ]
    )
    logger.info(
        "Parallel group %s merged - routing back to origin office %s",
        parallel_group.id,
        origin_office.name,
    )
    return True


def _find_or_create_parallel_group(minute):
    """Look up or lazily create a ParallelRoutingGroup for the given minute."""
    from correspondence.models import ParallelRoutingGroup as _PRG

    parallel_group = _PRG.objects.filter(id=minute.parallel_group_id).first()
    if parallel_group:
        return parallel_group

    _strategy = minute.merge_strategy or "all"
    parallel_group = _PRG.objects.create(
        id=minute.parallel_group_id,
        correspondence=minute.correspondence,
        created_by=minute.correspondence.created_by or minute.user,
        merge_strategy=_strategy,
    )
    if minute.correspondence.workflow_state != "parallel":
        minute.correspondence.workflow_state = "parallel"
        minute.correspondence.save(update_fields=["workflow_state", "updated_at"])
    return parallel_group


# ──────────────────────────────────────────────
#  MinuteRouterService — action-based routing logic
# ──────────────────────────────────────────────


class MinuteRouterService:
    """Handles all routing decisions when creating a minute.

    Responsibilities:
    - Permission gating per action type
    - Self-loop prevention
    - Delegation detection (assistant acting on behalf of principal)
    - Consultation response handling
    - REJECT / FORWARD / MINUTE / APPROVE office resolution
    - Correspondence current_office / current_approver updates
    """

    ACTION_PERMISSION_MAP = {
        "minute": "can_minute_correspondence",
        "forward": "can_minute_correspondence",
        "treat": "can_treat_correspondence",
        "approve": "can_approve",
        "reject": "can_reject",
    }

    @classmethod
    def _is_md(cls, user) -> bool:
        grade = (getattr(user, "grade_level", "") or "").upper()
        role = getattr(getattr(user, "system_role", None), "name", "") or ""
        role_upper = role.upper()
        return grade == "MDCS" or "MANAGING DIRECTOR" in role_upper or role_upper.strip() == "MD" or getattr(user, "is_superuser", False)

    @classmethod
    def resolve_approval_levels(cls, user, correspondence):
        """Map required_approval_level + actor grade/role to actual approval_level/approval_role.

        - required==EXECUTIVE and MD -> EXECUTIVE+APPROVAL
        - required==EXECUTIVE and GM/AGM/ED or other non-MD -> DEPARTMENTAL+ENDORSEMENT
        - required==DEPARTMENTAL -> DEPARTMENTAL+APPROVAL
        - required==NONE -> DEPARTMENTAL+APPROVAL (final)
        Never returns EXECUTIVE+ENDORSEMENT.
        """
        from correspondence.models import Correspondence, Minute

        required = getattr(correspondence, "required_approval_level", Correspondence.RequiredApprovalLevel.DEPARTMENTAL)
        if required == Correspondence.RequiredApprovalLevel.EXECUTIVE:
            if cls._is_md(user):
                return (Minute.ApprovalLevel.EXECUTIVE, Minute.ApprovalRole.APPROVAL)
            # GM/AGM/ED or any non-MD within scope -> endorsement
            return (Minute.ApprovalLevel.DEPARTMENTAL, Minute.ApprovalRole.ENDORSEMENT)
        # DEPARTMENTAL or NONE -> final approval
        return (Minute.ApprovalLevel.DEPARTMENTAL, Minute.ApprovalRole.APPROVAL)

    @classmethod
    def check_permissions(cls, user, action_type, correspondence=None, request=None):
        """Gate creation by action type with unified approval gate.

        For approve: hasPerm(can_approve) && org_scope allows correspondence && isCurrentTurn/delegation/CC explicit.
        Maps approval_level/approval_role and enforces MD-only for EXECUTIVE+APPROVAL.
        """
        from organization.permission_utils import require_permission, user_has_permission

        permission = cls.ACTION_PERMISSION_MAP.get(action_type)
        if permission:
            require_permission(user, permission)

        # Only apply unified gate for approve/endorse actions when correspondence is known
        if action_type == "approve" and correspondence is not None:
            # minute_text required for approve/endorse is validated in serializer, but also guard here if available in request data
            # Org scope check
            from organization.org_scope import apply_correspondence_org_scope

            qs = type(correspondence).objects.filter(pk=correspondence.pk)
            allowed_qs = apply_correspondence_org_scope(qs, user)
            if not allowed_qs.exists():
                from rest_framework.exceptions import PermissionDenied
                from audit.services import AuditService
                from audit.models import ActivityLog

                try:
                    AuditService.log_correspondence_activity(
                        user=user,
                        action=ActivityLog.ActionType.CORRESPONDENCE_REJECTED,
                        correspondence=correspondence,
                        request=request,
                        description=f"Approval denied – org scope check failed for {getattr(user, 'username', user)}",
                        metadata={"reason": "org_scope", "required_level": getattr(correspondence, "required_approval_level", None)},
                    )
                except Exception:
                    pass
                raise PermissionDenied({"detail": "Org scope does not allow approval for this correspondence.", "reason": "org_scope"})

            # Turn / delegation / CC check
            from correspondence.models import CorrespondenceDistribution, CorrespondenceDelegation

            is_current_turn = False
            if getattr(correspondence, "current_approver_id", None):
                is_current_turn = str(correspondence.current_approver_id) == str(user.id)
            # Also allow if correspondence has no current_approver yet (initial creation) – treat creator as turn?
            # Check delegation
            is_delegatee = CorrespondenceDelegation.objects.filter(
                correspondence=correspondence,
                assistant=user,
                status=CorrespondenceDelegation.Status.ACTIVE,
            ).exists()
            # CC explicit – user-type distribution or office-type where user belongs to that office
            is_cc = CorrespondenceDistribution.objects.filter(
                correspondence=correspondence,
                user=user,
                is_active=True,
            ).exists()
            if not is_cc:
                # office-type CC
                from organization.models import OfficeMembership

                user_office_ids = list(
                    OfficeMembership.objects.filter(user=user, is_active=True).values_list("office_id", flat=True)
                )
                if user_office_ids:
                    is_cc = CorrespondenceDistribution.objects.filter(
                        correspondence=correspondence,
                        office_id__in=user_office_ids,
                        is_active=True,
                    ).exists()

            if not (is_current_turn or is_delegatee or is_cc):
                from rest_framework.exceptions import PermissionDenied
                from audit.services import AuditService
                from audit.models import ActivityLog

                try:
                    AuditService.log_correspondence_activity(
                        user=user,
                        action=ActivityLog.ActionType.CORRESPONDENCE_REJECTED,
                        correspondence=correspondence,
                        request=request,
                        description=f"Approval denied – not current turn/delegatee/CC for {getattr(user, 'username', user)}",
                        metadata={"reason": "not_turn"},
                    )
                except Exception:
                    pass
                raise PermissionDenied({"detail": "Not current turn, delegatee, or CC – cannot approve.", "reason": "not_turn"})

            # If correspondence is EXECUTIVE track, ensure caller is not trying to claim EXECUTIVE+APPROVAL without MD
            # This is also enforced in serializer, but double-check here for service-level callers
            from correspondence.models import Minute

            expected_level, expected_role = cls.resolve_approval_levels(user, correspondence)
            # If expected is EXECUTIVE+APPROVAL, caller must be MD (already handled)
            if expected_level == Minute.ApprovalLevel.EXECUTIVE and expected_role == Minute.ApprovalRole.APPROVAL:
                if not cls._is_md(user):
                    from rest_framework.exceptions import PermissionDenied
                    from audit.services import AuditService
                    from audit.models import ActivityLog

                    try:
                        AuditService.log_correspondence_activity(
                            user=user,
                            action=ActivityLog.ActionType.CORRESPONDENCE_REJECTED,
                            correspondence=correspondence,
                            request=request,
                            description=f"Approval denied – MD only for EXECUTIVE+APPROVAL ({getattr(user, 'username', user)})",
                            metadata={"reason": "md_only"},
                        )
                    except Exception:
                        pass
                    raise PermissionDenied({"detail": "Only MD can perform EXECUTIVE+APPROVAL.", "reason": "md_only"})

    @classmethod
    def prevent_self_loop(cls, user, to_user, to_office, from_office):
        """Raise ValidationError if user routes to themselves or their own office."""
        if to_user and to_user.id == user.id:
            raise ValidationError({"detail": "Cannot route correspondence to yourself."})
        if to_office and from_office and to_office.id == from_office.id:
            raise ValidationError({"detail": "Cannot route correspondence to the same office."})

    @classmethod
    def save_minute_with_delegation(cls, serializer, request, correspondence, from_office):
        """Detect assistant delegation and save the minute under the principal's name.

        Returns the saved Minute instance and a bool indicating whether delegation was active.
        """
        from correspondence.models import CorrespondenceDelegation

        active_delegation = CorrespondenceDelegation.objects.filter(
            correspondence=correspondence,
            assistant=request.user,
            status=CorrespondenceDelegation.Status.ACTIVE
        ).select_related('principal').first()

        if active_delegation:
            principal = active_delegation.principal
            minute = serializer.save(
                user=principal,
                from_office=from_office,
                performed_by=request.user,
                acted_by_assistant=True,
                assistant_type='PA',
                dispatched_at=timezone.now(),
            )
            logger.info(
                f"Delegation action: {request.user.get_full_name()} performed minute "
                f"on behalf of {principal.get_full_name()} for correspondence {correspondence.reference_number}"
            )
            return minute, True

        minute = serializer.save(
            user=request.user,
            from_office=from_office,
            dispatched_at=timezone.now(),
        )
        return minute, False

    @classmethod
    def handle_consultation_response(cls, minute, request, correspondence):
        """Route back to the requesting branch if this is a consultation response.

        Returns True if this was a consultation response (caller should short-circuit).
        """
        from correspondence.models import Minute as MinuteModel

        consultation_received = MinuteModel.objects.filter(
            correspondence=correspondence,
            is_consultation=True,
            to_user=request.user,
            consultation_to_branch__isnull=True,
        ).first()

        if consultation_received and consultation_received.consultation_from_branch:
            requesting_branch = consultation_received.consultation_from_branch
            consultation_received.consultation_to_branch = minute
            consultation_received.save(update_fields=['consultation_to_branch'])

            requesting_user = requesting_branch.user
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
                return True
        return False

    @classmethod
    def resolve_reject_target(cls, minute, correspondence):
        """Determine where a REJECT action should route back to.

        Priority: owning_office → previous minute's from_office → creator's office.
        Sets minute.to_office and returns the recipient user (or None).
        """
        from correspondence.models import Minute as MinuteModel

        reject_target_office = None
        reject_target_user = None

        if correspondence.owning_office:
            reject_target_office = correspondence.owning_office
            reject_target_user, _ = find_office_recipient(reject_target_office, None)
            logger.info(f"REJECT: Routing back to owning office {reject_target_office.name}")

        if not reject_target_office:
            previous_minute = MinuteModel.objects.filter(
                correspondence=correspondence,
                timestamp__lt=minute.timestamp
            ).exclude(
                action_type=MinuteModel.ActionType.REJECT
            ).order_by('-timestamp', '-step_number').first()

            if previous_minute and previous_minute.from_office:
                reject_target_office = previous_minute.from_office
                reject_target_user, _ = find_office_recipient(reject_target_office, previous_minute.user)
                logger.info(f"REJECT: Routing back to previous sender's office {reject_target_office.name}")

        if not reject_target_office and correspondence.created_by:
            creator_office_membership = OfficeMembership.objects.filter(
                user=correspondence.created_by,
                is_active=True,
                is_primary=True
            ).select_related('office').first()

            if creator_office_membership:
                reject_target_office = creator_office_membership.office
                reject_target_user = correspondence.created_by
                logger.info(f"REJECT: Routing back to creator's office {reject_target_office.name}")

        if reject_target_office:
            minute.to_office = reject_target_office
            minute.save(update_fields=['to_office'])
            logger.info(f"REJECT: Will route to {reject_target_office.name}")
            return reject_target_user

        return None

    @classmethod
    def resolve_forward_target(cls, minute):
        """Resolve to_office and recipient_user for FORWARD/MINUTE/APPROVE actions.

        Returns (recipient_user, is_acting) tuple.
        """
        recipient_user = None
        is_acting = False

        if minute.to_office:
            preferred_user = minute.to_user if hasattr(minute, 'to_user') and minute.to_user else None
            try:
                recipient_user, is_acting = find_office_recipient(minute.to_office, preferred_user)
                if is_acting and recipient_user:
                    logger.info(f"Using acting head {recipient_user} for office {minute.to_office.name}")
            except ValidationError:
                logger.warning(f"Preferred user not in office {minute.to_office.name}, will use office head")
                recipient_user, is_acting = find_office_recipient(minute.to_office, None)

        elif minute.to_user and not minute.to_office:
            user_office_membership = OfficeMembership.objects.filter(
                user=minute.to_user,
                is_active=True,
                is_primary=True
            ).select_related('office').first()

            if user_office_membership:
                minute.to_office = user_office_membership.office
                recipient_user = minute.to_user
                minute.save(update_fields=['to_office'])
                logger.info(f"Derived office {user_office_membership.office.name} from user {minute.to_user}")

        return recipient_user, is_acting

    @classmethod
    def update_correspondence_routing(cls, minute, correspondence, current_office,
                                       recipient_user, is_completing_parallel_branch,
                                       is_top_level_branch):
        """Update correspondence.current_office and current_approver based on routing.

        Returns (office_updated, approver_updated).
        """
        office_updated = False
        approver_updated = False

        if not is_completing_parallel_branch or minute.action_type == Minute.ActionType.REJECT:
            if is_top_level_branch:
                logger.info("Skipping global current_office reassignment for top-level parallel branch %s", minute.id)
            elif minute.to_office and minute.to_office_id != (current_office.id if current_office else None):
                correspondence.current_office = minute.to_office
                office_updated = True
                logger.info(f"Setting current_office to {minute.to_office.name} (ID: {minute.to_office_id})")
            elif recipient_user and not minute.to_office:
                user_office_membership = OfficeMembership.objects.filter(
                    user=recipient_user,
                    is_active=True,
                    is_primary=True
                ).select_related('office').first()

                if user_office_membership and user_office_membership.office_id != (current_office.id if current_office else None):
                    correspondence.current_office = user_office_membership.office
                    office_updated = True
                    logger.info(f"Setting current_office to {user_office_membership.office.name} from recipient user {recipient_user}")

        if (not is_completing_parallel_branch or minute.action_type == Minute.ActionType.REJECT) and not is_top_level_branch and recipient_user and recipient_user.id != minute.user.id:
            if correspondence.current_approver_id != recipient_user.id:
                correspondence.current_approver = recipient_user
                approver_updated = True
                logger.info(f"Setting current_approver to {recipient_user} (ID: {recipient_user.id})")
            from organization.acting_services import apply_acting_markers_if_needed

            target_office = correspondence.current_office or minute.to_office
            if apply_acting_markers_if_needed(correspondence, recipient_user, office=target_office):
                approver_updated = True

        return office_updated, approver_updated


# ──────────────────────────────────────────────
#  ParallelBranchService — parallel routing lifecycle
# ──────────────────────────────────────────────


class ParallelBranchService:
    """Manages parallel routing branch detection, tracking, SLA, and completion."""

    SLA_HOURS = {
        Correspondence.Priority.URGENT: 24,
        Correspondence.Priority.HIGH: 72,
        Correspondence.Priority.MEDIUM: 120,
        Correspondence.Priority.LOW: 168,
    }

    @classmethod
    def inherit_branch_tracking(cls, minute, request, correspondence):
        """Inherit branch_originator and parallel_group_id from parent parallel minute.

        Also inherits is_parallel_branch flag for sub-routing within a branch.
        """
        from django.db.models import Q
        from correspondence.models import Minute as MinuteModel

        _user_office_ids = list(
            OfficeMembership.objects.filter(user=request.user, is_active=True).values_list("office_id", flat=True)
        )
        parallel_minutes_to_user = MinuteModel.objects.filter(
            correspondence=correspondence,
            is_parallel_branch=True,
        ).filter(
            Q(to_user=request.user)
            | Q(to_user__isnull=True, to_office_id__in=_user_office_ids)
        ).select_related('correspondence', 'branch_originator')

        if parallel_minutes_to_user.exists():
            parent_parallel_minute = parallel_minutes_to_user.first()
            if not minute.branch_originator and parent_parallel_minute.branch_originator:
                minute.branch_originator = parent_parallel_minute.branch_originator
                minute.save(update_fields=['branch_originator'])
            if not minute.parallel_group_id and parent_parallel_minute.parallel_group_id:
                minute.parallel_group_id = parent_parallel_minute.parallel_group_id
                minute.is_parallel_branch = True
                minute.save(update_fields=['parallel_group_id', 'is_parallel_branch'])

        return parallel_minutes_to_user

    @classmethod
    def set_branch_originator(cls, minute):
        """Set branch originator for top-level office-routed parallel branches."""
        if (
            minute.is_parallel_branch
            and minute.to_office_id
            and not minute.to_user_id
            and not minute.branch_originator
        ):
            parent_is_branch = bool(
                minute.parent_minute_id
                and getattr(minute.parent_minute, "is_parallel_branch", False)
            )
            if not parent_is_branch:
                principal = (
                    OfficeMembership.objects.filter(
                        office_id=minute.to_office_id,
                        assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
                        is_active=True,
                    )
                    .select_related("user")
                    .first()
                )
                if principal:
                    minute.branch_originator = principal.user
                    minute.save(update_fields=["branch_originator"])

    @classmethod
    def set_response_deadline(cls, minute, correspondence):
        """Set SLA response_deadline on top-level parallel branches."""
        if (
            minute.is_parallel_branch
            and not getattr(minute.parent_minute, "is_parallel_branch", False)
            and not minute.response_deadline
        ):
            sla_hours = cls.SLA_HOURS.get(correspondence.priority, 120)
            minute.response_deadline = timezone.now() + timezone.timedelta(hours=sla_hours)
            minute.save(update_fields=["response_deadline"])

    @classmethod
    def find_branch_originator(cls, parallel_minutes_to_user):
        """Find the branch originator (who should review when the branch completes).

        Returns the user or None.
        """
        from correspondence.models import ParallelRoutingGroup, Minute as MinuteModel

        branch_originator_to_route_to = None
        for parallel_minute in parallel_minutes_to_user:
            if parallel_minute.branch_originator:
                branch_originator_to_route_to = parallel_minute.branch_originator
                break

        if not branch_originator_to_route_to:
            parallel_group_ids = set(parallel_minutes_to_user.values_list('parallel_group_id', flat=True).distinct())
            for group_id in parallel_group_ids:
                if not group_id:
                    continue
                try:
                    parallel_group = ParallelRoutingGroup.objects.get(id=group_id)
                    first_recipient_minute = parallel_minutes_to_user.filter(parallel_group_id=group_id).first()
                    if first_recipient_minute and first_recipient_minute.to_user:
                        branch_originator_to_route_to = first_recipient_minute.to_user
                        first_recipient_minute.branch_originator = first_recipient_minute.to_user
                        first_recipient_minute.save(update_fields=['branch_originator'])
                    break
                except ParallelRoutingGroup.DoesNotExist:
                    pass

        return branch_originator_to_route_to

    @classmethod
    def get_merge_strategy(cls, minute, parallel_minutes_to_user):
        """Resolve the effective merge strategy."""
        from correspondence.models import ParallelRoutingGroup

        merge_strategy = "all"
        if minute.parallel_group_id:
            try:
                grp = ParallelRoutingGroup.objects.get(id=minute.parallel_group_id)
                merge_strategy = grp.merge_strategy
            except ParallelRoutingGroup.DoesNotExist:
                pass
        if merge_strategy == "all" and parallel_minutes_to_user.exists():
            parent_minute = parallel_minutes_to_user.first()
            if parent_minute.merge_strategy and parent_minute.merge_strategy != "all":
                merge_strategy = parent_minute.merge_strategy
        return merge_strategy

    @classmethod
    def is_top_level_branch(cls, minute):
        """Determine if this minute is a top-level parallel branch."""
        parent_is_parallel = bool(
            minute.parent_minute_id
            and getattr(minute.parent_minute, "is_parallel_branch", False)
        )
        return bool(
            minute.is_parallel_branch
            and (minute.to_office_id or minute.to_user_id)
            and not parent_is_parallel
        )

    @classmethod
    def route_completing_branch(cls, minute, correspondence, branch_originator_to_route_to, user):
        """Route an 'independent' completing branch back to the branch originator.

        Returns True if routing was applied.
        """
        if (
            not branch_originator_to_route_to
            or branch_originator_to_route_to.id == user.id
        ):
            return False

        is_completing_branch = (
            (minute.action_type == Minute.ActionType.APPROVE and not minute.to_office)
            or (minute.action_type in [Minute.ActionType.MINUTE, Minute.ActionType.FORWARD] and not minute.to_office)
        )

        if not is_completing_branch:
            return False

        originator_office_membership = OfficeMembership.objects.filter(
            user=branch_originator_to_route_to,
            is_active=True,
            is_primary=True
        ).select_related('office').first()

        if not originator_office_membership:
            return False

        correspondence.current_office = originator_office_membership.office
        correspondence.current_approver = branch_originator_to_route_to
        logger.info(
            f"Parallel branch completing - routing up to branch originator {branch_originator_to_route_to} "
            f"at office {originator_office_membership.office.name} for review"
        )
        return True

    @classmethod
    def check_and_handle_completion(cls, minute, correspondence, user):
        """Evaluate parallel group completion and handle merge.

        Returns (parallel_group_completed, original_sender).
        """
        parallel_group_completed = False
        original_sender = None

        if minute.parallel_group_id and minute.is_parallel_branch and not cls.is_top_level_branch(minute):
            parallel_group = _find_or_create_parallel_group(minute)
            parallel_group.check_and_update_completion()
            correspondence.refresh_from_db()

            if parallel_group.is_complete and correspondence.workflow_state == "merged":
                if route_back_to_origin(correspondence, parallel_group, user):
                    parallel_group_completed = True
                    original_sender = parallel_group.created_by

        return parallel_group_completed, original_sender


# ──────────────────────────────────────────────
#  MinuteSealService — executive approval digital seal
# ──────────────────────────────────────────────


class MinuteSealService:
    """Handles digital seal generation for executive approvals."""

    @classmethod
    def apply_if_eligible(cls, minute, user, correspondence, request, action_type):
        """Generate and apply a digital seal if the user is an MD with an active signature.

        Returns the seal if applied, else None.
        """
        if action_type != "approve":
            return None

        from accounts.models import ExecutiveSignature
        from accounts.services import SealGenerationService
        from audit.models import ActivityLog

        user_grade = user.grade_level
        user_role_obj = getattr(user, 'system_role', None)
        user_role = user_role_obj.name.upper() if user_role_obj and user_role_obj.name else ''
        is_md = (
            user_grade == 'MDCS'
            or 'MANAGING DIRECTOR' in user_role
            or user_role == 'MD'
        )

        if not is_md:
            return None

        try:
            signature = ExecutiveSignature.objects.get(user=user, is_active=True)

            seal, seal_data = SealGenerationService.generate_seal(
                user=user,
                correspondence=correspondence,
                request=request,
            )

            minute.seal_applied = seal
            minute.save(update_fields=['seal_applied'])

            AuditService.log_correspondence_activity(
                user=user,
                action=ActivityLog.ActionType.CORRESPONDENCE_APPROVED,
                correspondence=correspondence,
                request=request,
                description=f"Applied digital seal {seal.serial_number} on executive approval",
                metadata={
                    "seal_id": str(seal.id),
                    "serial_number": seal.serial_number,
                },
            )

            logger.info(
                "Applied digital seal %s for executive approval on correspondence %s",
                seal.serial_number,
                correspondence.reference_number,
            )
            return seal

        except ExecutiveSignature.DoesNotExist:
            logger.warning("Executive %s attempted approval without digital signature", user.username)
        except Exception as e:
            logger.error("Failed to apply digital seal: %s", e, exc_info=True)

        return None

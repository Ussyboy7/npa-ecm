"""PDF generation for form submissions."""

from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

_UNICODE_FONT_REGISTERED = False
_FONT_REGULAR = "Helvetica"
_FONT_BOLD = "Helvetica-Bold"


def _ensure_unicode_fonts() -> tuple[str, str]:
    """Register DejaVu so Naira and checkbox glyphs render."""
    global _UNICODE_FONT_REGISTERED, _FONT_REGULAR, _FONT_BOLD
    if _UNICODE_FONT_REGISTERED:
        return _FONT_REGULAR, _FONT_BOLD

    candidates = [
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ("/Library/Fonts/Arial Unicode.ttf", "/Library/Fonts/Arial Unicode.ttf"),
    ]
    for regular_path, bold_path in candidates:
        try:
            pdfmetrics.registerFont(TTFont("DejaVuSans", regular_path))
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", bold_path))
            _FONT_REGULAR = "DejaVuSans"
            _FONT_BOLD = "DejaVuSans-Bold"
            _UNICODE_FONT_REGISTERED = True
            return _FONT_REGULAR, _FONT_BOLD
        except Exception:
            continue

    _UNICODE_FONT_REGISTERED = True
    return _FONT_REGULAR, _FONT_BOLD


def _npa_logo_path() -> str | None:
    """Resolve the NPA crest used across seals and branding."""
    from pathlib import Path

    from django.conf import settings

    candidates = [
        Path(settings.BASE_DIR) / "static" / "npalogo.png",
        Path(settings.BASE_DIR).parent / "frontend" / "public" / "npalogo.png",
        Path("/app/static/npalogo.png"),
        Path("/app/frontend/public/npalogo.png"),
    ]
    for path in candidates:
        if path.exists():
            return str(path)
    return None


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def generate_project_monitoring_report_pdf(submission_data: Dict[str, Any]) -> bytes:
    """Generate a one-page Project Monitoring Report matching the NPA paper form."""
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas as pdf_canvas

    buffer = BytesIO()
    font_regular, font_bold = _ensure_unicode_fonts()
    c = pdf_canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4

    left = 1.5 * cm
    right = page_w - 1.5 * cm
    content_w = right - left
    y = page_h - 1.0 * cm

    def draw_centered(text: str, size: float, font: str, y_pos: float) -> None:
        c.setFont(font, size)
        c.drawCentredString(page_w / 2, y_pos, text)

    def draw_line(x1: float, y_pos: float, x2: float) -> None:
        c.setStrokeColor(colors.black)
        c.setLineWidth(0.55)
        c.line(x1, y_pos, x2, y_pos)

    def field_row(label: str, value: str, y_pos: float, label_w: float = 5.0 * cm, extra_lines: int = 0) -> float:
        """Label + underline row; returns next y."""
        c.setFont(font_bold, 8.5)
        c.drawString(left, y_pos, label)
        value_x = left + label_w
        draw_line(value_x, y_pos - 1, right)
        if value:
            c.setFont(font_regular, 8.5)
            max_chars = 92
            display = value if len(value) <= max_chars else value[: max_chars - 1] + "…"
            c.drawString(value_x + 2, y_pos + 1, display)
        y_next = y_pos - 0.48 * cm
        for _ in range(extra_lines):
            draw_line(left, y_next - 1, right)
            y_next -= 0.40 * cm
        return y_next

    def checklist_item(label: str, checked: bool, y_pos: float, blank_lines: int = 1) -> float:
        mark = "☑" if checked else "☐"
        c.setFont(font_regular, 8.5)
        c.drawString(left, y_pos, f"{mark}  {label}")
        y_next = y_pos - 0.38 * cm
        for _ in range(blank_lines):
            draw_line(left, y_next - 1, right)
            y_next -= 0.36 * cm
        return y_next

    def multiline_section(label: str, value: str, y_pos: float, blank_lines: int) -> float:
        c.setFont(font_bold, 8.5)
        c.drawString(left, y_pos, label)
        y_next = y_pos - 0.38 * cm
        draw_line(left, y_next - 1, right)
        if value:
            c.setFont(font_regular, 8.5)
            c.drawString(left + 2, y_next + 1, value)
        y_next -= 0.38 * cm
        for _ in range(max(0, blank_lines - 1)):
            draw_line(left, y_next - 1, right)
            y_next -= 0.36 * cm
        return y_next

    # ---- Header titles ----
    draw_centered("NIGERIAN PORTS AUTHORITY", 12, font_bold, y)
    y -= 0.40 * cm
    draw_centered("INTERNAL AUDIT DIVISION", 10.5, font_bold, y)
    y -= 0.18 * cm

    # ---- Crest / logo (centered) + CHQ alone on the top-right ----
    logo_path = _npa_logo_path()
    logo_h = 1.65 * cm
    logo_top = y
    if logo_path:
        try:
            logo = ImageReader(logo_path)
            logo_w = 1.65 * cm
            c.drawImage(
                logo,
                (page_w - logo_w) / 2,
                y - logo_h,
                width=logo_w,
                height=logo_h,
                mask="auto",
                preserveAspectRatio=True,
                anchor="c",
            )
        except Exception:
            logo_h = 0.25 * cm
    else:
        logo_h = 0.25 * cm

    # CHQ sits to the right of the crest band — not on the To/Date row
    c.setFont(font_bold, 9)
    c.drawRightString(right, logo_top - 0.15 * cm, "CHQ")
    chq = _text(submission_data.get("chq_no"))
    draw_line(right - 2.8 * cm, logo_top - 0.55 * cm, right)
    if chq:
        c.setFont(font_regular, 8)
        c.drawRightString(right - 2, logo_top - 0.45 * cm, chq)

    y -= logo_h + 0.45 * cm

    # ---- To / From (left) and Date / Our Ref (right) ----
    col_gap = 0.55 * cm
    left_col_w = content_w * 0.55
    right_col_x = left + left_col_w + col_gap
    right_label_w = 1.8 * cm

    row_y = y
    c.setFont(font_bold, 8.5)
    c.drawString(left, row_y, "To:")
    draw_line(left + 1.0 * cm, row_y - 1, left + left_col_w)
    to_val = _text(submission_data.get("to"))
    if to_val:
        c.setFont(font_regular, 8.5)
        c.drawString(left + 1.1 * cm, row_y + 1, to_val)

    c.setFont(font_bold, 8.5)
    c.drawString(right_col_x, row_y, "Date:")
    draw_line(right_col_x + right_label_w, row_y - 1, right)
    date_val = _text(submission_data.get("date"))
    if date_val:
        c.setFont(font_regular, 8.5)
        c.drawString(right_col_x + right_label_w + 2, row_y + 1, date_val)

    row_y -= 0.50 * cm
    c.setFont(font_bold, 8.5)
    c.drawString(left, row_y, "From:")
    draw_line(left + 1.2 * cm, row_y - 1, left + left_col_w)
    from_val = _text(submission_data.get("from_field"))
    if from_val:
        c.setFont(font_regular, 8.5)
        c.drawString(left + 1.3 * cm, row_y + 1, from_val)

    c.setFont(font_bold, 8.5)
    c.drawString(right_col_x, row_y, "Our Ref:")
    draw_line(right_col_x + right_label_w, row_y - 1, right)
    ref_val = _text(submission_data.get("our_ref"))
    if ref_val:
        c.setFont(font_regular, 8.5)
        c.drawString(right_col_x + right_label_w + 2, row_y + 1, ref_val)

    y = row_y - 0.55 * cm

    # ---- Subject = form title only (paper does not show correspondence subject) ----
    draw_centered("PROJECT MONITORING REPORT - AUDIT DIVISION", 10.5, font_bold, y)
    y -= 0.55 * cm

    # ---- Body fields ----
    y = field_row("Project:", _text(submission_data.get("project")), y)
    y = field_row("Location:", _text(submission_data.get("location")), y)
    y = field_row("Contractor's Name:", _text(submission_data.get("contractor_name")), y)
    y = field_row(
        "Address:",
        _text(submission_data.get("contractor_address")),
        y,
        extra_lines=3,
    )
    y = field_row("Contract Sum:", format_currency(submission_data.get("contract_sum", "")), y)
    y = field_row(
        "Ref: No. & Date of Award Letter:",
        _text(submission_data.get("award_ref")),
        y,
        label_w=6.2 * cm,
    )
    y = field_row(
        "C.E.P. No. & Date:",
        _text(submission_data.get("cep_no_date")),
        y,
        extra_lines=3,
    )
    y = field_row("Project Manager:", _text(submission_data.get("project_manager")), y)
    y = field_row("Audit Assignment:", _text(submission_data.get("audit_assignment")), y)

    y -= 0.05 * cm
    y = checklist_item("(i) Attach Bill of Quantity", bool(submission_data.get("attach_boq")), y, blank_lines=1)
    y = checklist_item(
        "(ii) Check Bill of Quantity For Extent of Work Done",
        bool(submission_data.get("check_boq_extent")),
        y,
        blank_lines=2,
    )
    y = checklist_item(
        "(iii) Review the Unit Price of item on BOQ",
        bool(submission_data.get("review_unit_price")),
        y,
        blank_lines=1,
    )
    y = checklist_item(
        "(iv) Attach all Working Papers",
        bool(submission_data.get("attach_working_papers")),
        y,
        blank_lines=1,
    )

    y = multiline_section("Comments:", _text(submission_data.get("comments")), y, blank_lines=2)
    y = multiline_section("Observation:", _text(submission_data.get("observation")), y, blank_lines=4)
    y = multiline_section("Recommendation:", _text(submission_data.get("recommendation")), y, blank_lines=2)

    # ---- Certification ----
    y -= 0.08 * cm
    draw_line(left, y, right)
    y -= 0.38 * cm
    c.setFont(font_regular, 8)
    cert = (
        "We hereby certified that the Project was executed in accordance with "
        "the terms of the Letter of Award of the Contract"
    )
    c.drawCentredString(page_w / 2, y, cert)
    y -= 0.48 * cm

    # ---- Three-column signatures ----
    col_w = content_w / 3
    roles = (
        ("pm", "Project Manager/Engineer"),
        ("procurement", "Procurement"),
        ("audit", "Audit"),
    )
    sig_top = y
    for idx, (role, title) in enumerate(roles):
        x0 = left + idx * col_w
        c.setFont(font_bold, 8)
        c.drawString(x0, sig_top, title)

        lines = [
            ("Name:", _text(submission_data.get(f"{role}_name"))),
            ("P/N:", _text(submission_data.get(f"{role}_pn"))),
            ("Designation:", _text(submission_data.get(f"{role}_designation"))),
            ("Signature:", ""),
            ("Date:", _text(submission_data.get(f"{role}_date"))),
        ]
        row = sig_top - 0.36 * cm
        for label, value in lines:
            c.setFont(font_bold, 7.5)
            c.drawString(x0, row, label)
            line_x = x0 + 2.0 * cm
            line_end = x0 + col_w - 0.2 * cm
            draw_line(line_x, row - 1, line_end)
            if label == "Signature:":
                image_bytes = submission_data.get(f"{role}_signature_image")
                drew = False
                if image_bytes:
                    try:
                        img = ImageReader(BytesIO(image_bytes))
                        iw, ih = img.getSize()
                        max_w = max(1.0, col_w - 2.2 * cm)
                        max_h = 0.95 * cm
                        scale = min(max_w / float(iw), max_h / float(ih)) if iw and ih else 1
                        img_w, img_h = iw * scale, ih * scale
                        # Sit the image on the underline (bottom aligned to the line).
                        c.drawImage(
                            img,
                            line_x + 1,
                            (row - 1),
                            width=img_w,
                            height=img_h,
                            mask="auto",
                            preserveAspectRatio=True,
                        )
                        drew = True
                        row -= max(0.95 * cm, img_h) + 0.12 * cm
                        continue
                    except Exception:
                        drew = False
                if not drew and submission_data.get(f"{role}_signature"):
                    c.setFont(font_regular, 7)
                    c.drawString(line_x + 2, row + 1, "[Signed]")
                row -= 0.55 * cm
                continue
            if value:
                c.setFont(font_regular, 7.5)
                c.drawString(line_x + 2, row + 1, value)
            row -= 0.36 * cm

    # ---- Distribution footer ----
    c.setFont(font_bold, 8)
    c.drawString(left, 0.95 * cm, "Distribution (Original) PV;")
    dist = _text(submission_data.get("distribution"))
    if dist:
        c.setFont(font_regular, 8)
        c.drawString(left + 4.2 * cm, 0.95 * cm, dist)

    c.showPage()
    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def format_currency(amount: Any) -> str:
    """Format amount as Nigerian Naira currency."""
    try:
        if amount is None or amount == "":
            return ""
        if isinstance(amount, str):
            cleaned = (
                amount.replace("₦", "")
                .replace("NGN", "")
                .replace(",", "")
                .strip()
            )
            if not cleaned:
                return ""
            num_amount = float(cleaned)
        else:
            num_amount = float(amount)
        return f"₦{num_amount:,.2f}"
    except (ValueError, TypeError):
        return f"₦{amount}"


def generate_project_completion_validation_pdf(form_data: Dict[str, Any]) -> bytes:
    """
    Legacy table-layout PDF for Project Completion Validation.

    Not wired from DMS generate_pdf — no live seeded template or paper facsimile.
    Prefer generate_generic_form_pdf until an official layout is provided.
    """
    buffer = BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=1*cm,
        bottomMargin=1*cm,
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=14,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#000000'),
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Normal'],
        fontSize=12,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#000000'),
        alignment=TA_CENTER,
        spaceAfter=20,
    )
    
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#000000'),
        spaceAfter=4,
    )
    
    value_style = ParagraphStyle(
        'Value',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        textColor=colors.HexColor('#000000'),
        spaceAfter=8,
    )
    
    field_style = ParagraphStyle(
        'Field',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        textColor=colors.HexColor('#000000'),
        spaceAfter=6,
    )
    
    # Header
    story.append(Paragraph("NIGERIAN PORTS AUTHORITY", header_style))
    story.append(Spacer(1, 0.3*cm))
    
    # Title
    story.append(Paragraph("PROJECT COMPLETION VALIDATION FORM", title_style))
    story.append(Spacer(1, 0.4*cm))
    
    # Form Fields
    # 1. Scope of Work Completed
    scope_value = form_data.get('scope_completed', '')
    scope_label_map = {
        'fully': 'Fully Completed',
        'partial': 'Partially Completed',
        'not': 'Not Completed'
    }
    scope_display = scope_label_map.get(scope_value, scope_value)
    story.append(Paragraph("<b>1. Scope of Work Completed?</b>", label_style))
    story.append(Paragraph(scope_display, value_style))
    story.append(Spacer(1, 0.2*cm))
    
    # 2. Physical Inspection
    inspection_value = form_data.get('physical_inspection', '')
    inspection_display = 'Yes' if inspection_value == 'yes' else 'No'
    story.append(Paragraph("<b>2. Physical Inspection Conducted?</b>", label_style))
    story.append(Paragraph(inspection_display, value_style))
    
    if form_data.get('inspection_date'):
        story.append(Paragraph(f"<b>Inspection Date:</b> {form_data.get('inspection_date', '')}", field_style))
    story.append(Spacer(1, 0.2*cm))
    
    # 3. Outstanding Issues
    issues_value = form_data.get('outstanding_issues', '')
    issues_display = 'Yes' if issues_value == 'yes' else 'No'
    story.append(Paragraph("<b>3. Any Outstanding Issues?</b>", label_style))
    story.append(Paragraph(issues_display, value_style))
    
    if form_data.get('outstanding_issues_description'):
        story.append(Paragraph("<b>Description:</b>", label_style))
        story.append(Paragraph(form_data.get('outstanding_issues_description', ''), value_style))
    story.append(Spacer(1, 0.2*cm))
    
    # 4. Supporting Documents
    story.append(Paragraph("<b>4. Supporting Documents Attached:</b>", label_style))
    docs = []
    if form_data.get('completion_report_attached'):
        docs.append('☑ Completion Report')
    else:
        docs.append('☐ Completion Report')
    if form_data.get('site_photos_attached'):
        docs.append('☑ Site Photos')
    else:
        docs.append('☐ Site Photos')
    if form_data.get('engineers_confirmation_attached'):
        docs.append('☑ Engineer\'s Confirmation')
    else:
        docs.append('☐ Engineer\'s Confirmation')
    
    for doc_item in docs:
        story.append(Paragraph(doc_item, field_style))
    story.append(Spacer(1, 0.3*cm))
    
    # Declaration
    story.append(Paragraph("<b>DECLARATION:</b>", label_style))
    story.append(Paragraph("I confirm that the above information is true and accurate.", field_style))
    story.append(Spacer(1, 0.3*cm))
    
    # Signatory Information
    decl_data = [
        ['Name:', form_data.get('declarant_name', '') or ''],
        ['Designation:', form_data.get('declarant_designation', '') or ''],
        ['Signature:', '[Digital Signature]' if form_data.get('declarant_signature') else ''],
    ]
    
    decl_table = Table(decl_data, colWidths=[4*cm, 11*cm])
    decl_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(decl_table)
    
    # Build PDF
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes


def generate_generic_form_pdf(form_data: Dict[str, Any], template_structure: Dict[str, Any]) -> bytes:
    """
    Generate a generic PDF for any form template based on its structure.
    
    Args:
        form_data: Dictionary containing form field values
        template_structure: The form template structure (fields, sections, etc.)
        
    Returns:
        PDF bytes
    """
    buffer = BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=1*cm,
        bottomMargin=1*cm,
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Normal'],
        fontSize=14,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#000000'),
        alignment=TA_CENTER,
        spaceAfter=20,
    )
    
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#000000'),
        spaceAfter=4,
    )
    
    value_style = ParagraphStyle(
        'Value',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        textColor=colors.HexColor('#000000'),
        spaceAfter=8,
    )
    
    field_style = ParagraphStyle(
        'Field',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        textColor=colors.HexColor('#000000'),
        spaceAfter=6,
    )
    
    # Title
    form_name = template_structure.get('name', 'Form')
    story.append(Paragraph(form_name.upper(), title_style))
    story.append(Spacer(1, 0.4*cm))
    
    # Get fields from structure (structure is already the form structure dict)
    structure = template_structure.get('structure', {})
    fields = structure.get('fields', [])
    sections = structure.get('sections', [])
    
    # If sections exist, organize by sections
    if sections:
        for section in sections:
            section_title = section.get('title', '')
            if section_title:
                story.append(Paragraph(f"<b>{section_title}</b>", label_style))
                story.append(Spacer(1, 0.2*cm))
            
            section_fields = section.get('fields', [])
            for field_id in section_fields:
                field = next((f for f in fields if f.get('id') == field_id), None)
                if field:
                    _add_field_to_pdf(story, field, form_data, label_style, value_style, field_style)
        story.append(Spacer(1, 0.2*cm))
    else:
        # No sections, just render all fields
        for field in fields:
            _add_field_to_pdf(story, field, form_data, label_style, value_style, field_style)
    
    # Build PDF
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes


def _add_field_to_pdf(story, field: Dict[str, Any], form_data: Dict[str, Any], 
                      label_style, value_style, field_style):
    """Helper function to add a field to the PDF story."""
    field_id = field.get('id', '')
    field_label = field.get('label', field_id)
    field_type = field.get('type', 'text')
    field_value = form_data.get(field_id, '')
    
    # Skip file fields (signatures, attachments)
    if field_type == 'file':
        if field_value:
            story.append(Paragraph(f"<b>{field_label}:</b> [File Attached]", field_style))
        return
    
    # Render label
    story.append(Paragraph(f"<b>{field_label}</b>", label_style))
    
    # Render value based on type
    if field_type == 'checkbox':
        checkbox = '☑' if field_value else '☐'
        story.append(Paragraph(f"{checkbox} {field_label}", value_style))
    elif field_type == 'radio':
        options = field.get('options', [])
        selected_option = next((opt for opt in options if opt.get('value') == field_value), None)
        if selected_option:
            story.append(Paragraph(selected_option.get('label', field_value), value_style))
        else:
            story.append(Paragraph(str(field_value) if field_value else '', value_style))
    elif field_type == 'textarea':
        story.append(Paragraph(str(field_value) if field_value else '', value_style))
    else:
        story.append(Paragraph(str(field_value) if field_value else '', value_style))
    
    story.append(Spacer(1, 0.1*cm))


def _money_parts(amount: Any) -> tuple[str, str]:
    """Split an amount into Naira / Kobo display strings."""
    try:
        if amount is None or amount == "":
            return "", ""
        if isinstance(amount, str):
            cleaned = amount.replace("₦", "").replace(",", "").strip()
            value = float(cleaned) if cleaned else 0.0
        else:
            value = float(amount)
        naira = int(value)
        kobo = int(round((value - naira) * 100))
        return f"{naira:,}", f"{kobo:02d}"
    except (ValueError, TypeError):
        return _text(amount), ""


def generate_witnessing_deliveries_pdf(form_data: Dict[str, Any]) -> bytes:
    """One-page facsimile of the NPA Witnessing of Deliveries Form."""
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas as pdf_canvas

    buffer = BytesIO()
    font_regular, font_bold = _ensure_unicode_fonts()
    c = pdf_canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4
    left, right = 1.3 * cm, page_w - 1.3 * cm
    content_w = right - left
    y = page_h - 0.9 * cm

    def line(x1: float, y_pos: float, x2: float) -> None:
        c.setStrokeColor(colors.black)
        c.setLineWidth(0.5)
        c.line(x1, y_pos, x2, y_pos)

    def dotted_field(label: str, value: str, y_pos: float, label_w: float = 4.2 * cm) -> float:
        c.setFont(font_bold, 8)
        c.drawString(left, y_pos, label)
        line(left + label_w, y_pos - 1, right)
        if value:
            c.setFont(font_regular, 8)
            c.drawString(left + label_w + 2, y_pos + 1, value)
        return y_pos - 0.42 * cm

    # Header: crest left, titles center, CHQ + No. right
    logo_path = _npa_logo_path()
    logo_size = 1.5 * cm
    if logo_path:
        try:
            c.drawImage(
                ImageReader(logo_path),
                left,
                y - logo_size,
                width=logo_size,
                height=logo_size,
                mask="auto",
                preserveAspectRatio=True,
            )
        except Exception:
            pass

    c.setFont(font_bold, 12)
    c.drawCentredString(page_w / 2, y - 0.15 * cm, "NIGERIAN PORTS AUTHORITY")
    c.setFont(font_bold, 9)
    c.drawRightString(right, y - 0.1 * cm, "CHQ")
    serial = _text(form_data.get("form_no") or form_data.get("serial_no") or form_data.get("chq_no"))
    c.setFont(font_regular, 8)
    c.drawRightString(right, y - 0.45 * cm, f"No. {serial}" if serial else "No. ________")

    y -= logo_size + 0.15 * cm
    c.setFont(font_bold, 10)
    c.drawCentredString(page_w / 2, y, "INTERNAL AUDIT DIVISION")
    y -= 0.35 * cm
    c.setFont(font_bold, 10)
    c.drawCentredString(page_w / 2, y, "WITNESSING OF DELIVERIES FORM")
    # underline title
    title_w = c.stringWidth("WITNESSING OF DELIVERIES FORM", font_bold, 10)
    c.line(page_w / 2 - title_w / 2, y - 2, page_w / 2 + title_w / 2, y - 2)
    y -= 0.55 * cm

    # Date on the right
    c.setFont(font_bold, 8)
    c.drawString(right - 5.2 * cm, y, "DATE:")
    line(right - 4.0 * cm, y - 1, right)
    if _text(form_data.get("date")):
        c.setFont(font_regular, 8)
        c.drawString(right - 3.9 * cm, y + 1, _text(form_data.get("date")))
    y -= 0.45 * cm

    y = dotted_field("LOCATION:", _text(form_data.get("location")), y)
    y = dotted_field("CONTRACTOR'S NAME:", _text(form_data.get("contractor_name")), y, label_w=4.6 * cm)
    y = dotted_field("ADDRESS:", _text(form_data.get("contractor_address")), y)
    y = dotted_field("LETTER OF AWARD REF. NO.:", _text(form_data.get("award_ref")), y, label_w=5.4 * cm)
    y = dotted_field("VEHICLE REGN. NO.:", _text(form_data.get("vehicle_reg")), y, label_w=4.4 * cm)
    y -= 0.15 * cm

    # ITEMS SUPPLIED table
    c.setFont(font_bold, 9)
    c.drawCentredString(page_w / 2, y, "ITEMS SUPPLIED")
    y -= 0.28 * cm

    # Column layout: S/N | QTY | DESCRIPTION | UNIT PRICE N|K | AMOUNT N|K
    cols = [
        ("S/N", 0.9 * cm),
        ("QTY", 1.2 * cm),
        ("DESCRIPTION", 7.2 * cm),
        ("UNIT PRICE", 3.4 * cm),
        ("AMOUNT", 3.4 * cm),
    ]
    table_w = sum(w for _, w in cols)
    x0 = left + (content_w - table_w) / 2
    row_h = 0.38 * cm
    header_h = 0.55 * cm

    # Header band
    c.setLineWidth(0.7)
    c.rect(x0, y - header_h, table_w, header_h, stroke=1, fill=0)
    x = x0
    for i, (label, w) in enumerate(cols):
        if i:
            c.line(x, y, x, y - header_h)
        c.setFont(font_bold, 7)
        if label in ("UNIT PRICE", "AMOUNT"):
            c.drawCentredString(x + w / 2, y - 0.22 * cm, label)
            # N / K subheaders
            c.line(x + w / 2, y - 0.28 * cm, x + w / 2, y - header_h)
            c.setFont(font_bold, 6.5)
            c.drawCentredString(x + w / 4, y - 0.48 * cm, "N")
            c.drawCentredString(x + 3 * w / 4, y - 0.48 * cm, "K")
        else:
            c.drawCentredString(x + w / 2, y - 0.35 * cm, label)
        x += w
    y -= header_h

    items = form_data.get("items") or []
    if not isinstance(items, list):
        items = []
    # Always show 10 rows like the paper
    while len(items) < 10:
        items.append({"sn": len(items) + 1, "qty": "", "description": "", "unit_price": "", "amount": ""})
    items = items[:10]

    for idx, row in enumerate(items):
        c.rect(x0, y - row_h, table_w, row_h, stroke=1, fill=0)
        x = x0
        sn = str(row.get("sn") or (idx + 1))
        qty = _text(row.get("qty"))
        desc = _text(row.get("description"))
        up_n, up_k = _money_parts(row.get("unit_price"))
        am_n, am_k = _money_parts(row.get("amount"))
        values = [sn, qty, desc]
        for i, (label, w) in enumerate(cols):
            if i:
                c.line(x, y, x, y - row_h)
            c.setFont(font_regular, 7)
            if i < 3:
                if i == 2:
                    c.drawString(x + 2, y - 0.26 * cm, desc[:48])
                else:
                    c.drawCentredString(x + w / 2, y - 0.26 * cm, values[i])
            elif i == 3:
                c.line(x + w / 2, y, x + w / 2, y - row_h)
                c.drawRightString(x + w / 2 - 2, y - 0.26 * cm, up_n)
                c.drawRightString(x + w - 2, y - 0.26 * cm, up_k)
            else:
                c.line(x + w / 2, y, x + w / 2, y - row_h)
                c.drawRightString(x + w / 2 - 2, y - 0.26 * cm, am_n)
                c.drawRightString(x + w - 2, y - 0.26 * cm, am_k)
            x += w
        y -= row_h

    # Totals rows
    for label, key in (("SUB TOTAL", "sub_total"), ("VAT", "vat"), ("GRAND TOTAL", "grand_total")):
        c.rect(x0, y - row_h, table_w, row_h, stroke=1, fill=0)
        desc_w = cols[0][1] + cols[1][1] + cols[2][1]
        c.line(x0 + desc_w, y, x0 + desc_w, y - row_h)
        c.setFont(font_bold, 7.5)
        c.drawRightString(x0 + desc_w - 4, y - 0.26 * cm, label)
        n, k = _money_parts(form_data.get(key))
        amount_x = x0 + desc_w + cols[3][1]
        c.line(amount_x, y, amount_x, y - row_h)
        c.line(amount_x + cols[4][1] / 2, y, amount_x + cols[4][1] / 2, y - row_h)
        c.setFont(font_regular, 7.5)
        c.drawRightString(amount_x + cols[4][1] / 2 - 2, y - 0.26 * cm, n)
        c.drawRightString(amount_x + cols[4][1] - 2, y - 0.26 * cm, k)
        y -= row_h

    y -= 0.35 * cm
    # Supplier row
    c.setFont(font_bold, 8)
    c.drawString(left, y, "SUPPLIER:-")
    y -= 0.4 * cm
    c.setFont(font_bold, 7.5)
    c.drawString(left, y, "Name:")
    line(left + 1.1 * cm, y - 1, left + 7.0 * cm)
    if _text(form_data.get("supplier_name")):
        c.setFont(font_regular, 7.5)
        c.drawString(left + 1.2 * cm, y + 1, _text(form_data.get("supplier_name")))
    c.setFont(font_bold, 7.5)
    c.drawString(left + 7.3 * cm, y, "Signature:")
    line(left + 9.2 * cm, y - 1, left + 13.5 * cm)
    # supplier signature image if present as bytes or truthy file marker
    sig_bytes = form_data.get("supplier_signature_image")
    if isinstance(sig_bytes, (bytes, bytearray)):
        try:
            img = ImageReader(BytesIO(sig_bytes))
            c.drawImage(img, left + 9.3 * cm, y - 0.05 * cm, width=2.8 * cm, height=0.7 * cm, mask="auto", preserveAspectRatio=True)
        except Exception:
            pass
    c.setFont(font_bold, 7.5)
    c.drawString(left + 13.7 * cm, y, "Date:")
    line(left + 14.7 * cm, y - 1, right)
    if _text(form_data.get("supplier_date")):
        c.setFont(font_regular, 7.5)
        c.drawString(left + 14.8 * cm, y + 1, _text(form_data.get("supplier_date")))

    y -= 0.55 * cm
    c.setFont(font_bold, 8)
    c.drawCentredString(page_w / 2, y, "CERTIFICATION BY THE USER PROCUREMENT AND AUDIT")
    y -= 0.28 * cm
    c.setFont(font_regular, 7.5)
    c.drawCentredString(
        page_w / 2,
        y,
        "We here certify that the items listed above are supplied in accordance with description and specifications",
    )
    y -= 0.35 * cm

    # Certification grid
    cert_cols = [
        ("DEPARTMENT", 2.4 * cm),
        ("NAME", 3.6 * cm),
        ("P/NO", 1.8 * cm),
        ("DESIGNATION", 3.2 * cm),
        ("SIGNATURE", 3.2 * cm),
        ("DATE", 2.0 * cm),
    ]
    cert_w = sum(w for _, w in cert_cols)
    cx0 = left + (content_w - cert_w) / 2
    ch = 0.42 * cm
    c.rect(cx0, y - ch, cert_w, ch, stroke=1, fill=0)
    x = cx0
    for i, (label, w) in enumerate(cert_cols):
        if i:
            c.line(x, y, x, y - ch)
        c.setFont(font_bold, 6.5)
        c.drawCentredString(x + w / 2, y - 0.28 * cm, label)
        x += w
    y -= ch

    roles = (
        ("USER", "user_dept"),
        ("PROCUREMENT", "procurement"),
        ("AUDIT", "audit"),
    )
    for dept_label, prefix in roles:
        c.rect(cx0, y - ch, cert_w, ch, stroke=1, fill=0)
        vals = [
            dept_label,
            _text(form_data.get(f"{prefix}_name")),
            _text(form_data.get(f"{prefix}_pn")),
            _text(form_data.get(f"{prefix}_designation")),
            "",
            _text(form_data.get(f"{prefix}_date")),
        ]
        x = cx0
        for i, (label, w) in enumerate(cert_cols):
            if i:
                c.line(x, y, x, y - ch)
            if i == 4:
                img_bytes = form_data.get(f"{prefix}_signature_image")
                if isinstance(img_bytes, (bytes, bytearray)):
                    try:
                        img = ImageReader(BytesIO(img_bytes))
                        c.drawImage(
                            img,
                            x + 2,
                            y - ch + 1,
                            width=w - 4,
                            height=ch - 2,
                            mask="auto",
                            preserveAspectRatio=True,
                        )
                    except Exception:
                        if form_data.get(f"{prefix}_signature"):
                            c.setFont(font_regular, 6.5)
                            c.drawCentredString(x + w / 2, y - 0.28 * cm, "[Signed]")
                elif form_data.get(f"{prefix}_signature"):
                    c.setFont(font_regular, 6.5)
                    c.drawCentredString(x + w / 2, y - 0.28 * cm, "[Signed]")
            else:
                c.setFont(font_bold if i == 0 else font_regular, 6.5)
                c.drawCentredString(x + w / 2, y - 0.28 * cm, vals[i][:22])
            x += w
        y -= ch

    # Carbon copy footer
    c.setFont(font_regular, 6.5)
    c.drawCentredString(
        page_w / 2,
        0.85 * cm,
        "White - Audit for Payment, Green - Audit Office Copy, Pink - Store Copy, Yellow - User's Copy.",
    )

    c.showPage()
    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def generate_audit_query_pdf(form_data: Dict[str, Any]) -> bytes:
    """One-page facsimile of the NPA Audit Query (Bills for Certification) form."""
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas as pdf_canvas

    buffer = BytesIO()
    font_regular, font_bold = _ensure_unicode_fonts()
    c = pdf_canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4
    left, right = 1.6 * cm, page_w - 1.6 * cm
    content_w = right - left
    y = page_h - 1.1 * cm

    def line(x1: float, y_pos: float, x2: float) -> None:
        c.setStrokeColor(colors.black)
        c.setLineWidth(0.55)
        c.line(x1, y_pos, x2, y_pos)

    # Titles
    c.setFont(font_bold, 12)
    c.drawCentredString(page_w / 2, y, "NIGERIAN PORTS AUTHORITY")
    y -= 0.38 * cm
    c.setFont(font_bold, 10)
    c.drawCentredString(page_w / 2, y, "INTERNAL AUDIT DIVISION")
    y -= 0.32 * cm
    c.setFont(font_bold, 10)
    c.drawCentredString(page_w / 2, y, "HEADQUARTERS")
    y -= 0.2 * cm

    # Crest
    logo_path = _npa_logo_path()
    logo_h = 1.7 * cm
    if logo_path:
        try:
            c.drawImage(
                ImageReader(logo_path),
                (page_w - logo_h) / 2,
                y - logo_h,
                width=logo_h,
                height=logo_h,
                mask="auto",
                preserveAspectRatio=True,
            )
        except Exception:
            logo_h = 0.2 * cm
    else:
        logo_h = 0.2 * cm

    # HQ + serial on the right of crest band
    c.setFont(font_bold, 9)
    c.drawString(right - 3.2 * cm, y - 0.2 * cm, "HQ")
    serial = _text(form_data.get("hq_serial") or form_data.get("serial_no") or form_data.get("form_no"))
    line(right - 2.4 * cm, y - 0.35 * cm, right)
    if serial:
        c.setFont(font_regular, 8)
        c.drawRightString(right - 2, y - 0.25 * cm, serial)

    y -= logo_h + 0.45 * cm

    # TO / DATE
    c.setFont(font_bold, 9)
    c.drawString(left, y, "TO:")
    line(left + 1.0 * cm, y - 1, left + content_w * 0.58)
    if _text(form_data.get("to")):
        c.setFont(font_regular, 9)
        c.drawString(left + 1.1 * cm, y + 1, _text(form_data.get("to")))
    c.setFont(font_bold, 9)
    c.drawString(left + content_w * 0.62, y, "DATE:")
    line(left + content_w * 0.72, y - 1, right)
    if _text(form_data.get("date")):
        c.setFont(font_regular, 9)
        c.drawString(left + content_w * 0.73, y + 1, _text(form_data.get("date")))
    y -= 0.5 * cm

    # FROM / REF
    c.setFont(font_bold, 9)
    c.drawString(left, y, "FROM:")
    from_val = _text(form_data.get("from") or form_data.get("from_field")) or "GENERAL MANAGER AUDIT, HQ."
    line(left + 1.3 * cm, y - 1, left + content_w * 0.58)
    c.setFont(font_regular, 9)
    c.drawString(left + 1.4 * cm, y + 1, from_val)
    c.setFont(font_bold, 9)
    c.drawString(left + content_w * 0.62, y, "REF:")
    line(left + content_w * 0.70, y - 1, right)
    ref_val = _text(form_data.get("ref"))
    if not ref_val:
        ref_val = "HQ/GMA/OP/A.13/"
    c.setFont(font_regular, 8)
    c.drawString(left + content_w * 0.71, y + 1, ref_val)
    y -= 0.65 * cm

    # SUBJECT
    c.setFont(font_bold, 10)
    c.drawCentredString(page_w / 2, y, "SUBJECT: AUDIT QUERY")
    sw = c.stringWidth("SUBJECT: AUDIT QUERY", font_bold, 10)
    c.line(page_w / 2 - sw / 2, y - 2, page_w / 2 + sw / 2, y - 2)
    y -= 0.38 * cm
    c.setFont(font_bold, 10)
    c.drawCentredString(page_w / 2, y, "BILLS FOR CERTIFICATION")
    sw2 = c.stringWidth("BILLS FOR CERTIFICATION", font_bold, 10)
    c.line(page_w / 2 - sw2 / 2, y - 2, page_w / 2 + sw2 / 2, y - 2)
    y -= 0.55 * cm

    # PAYEE
    c.setFont(font_bold, 9)
    c.drawString(left, y, "PAYEE")
    line(left + 1.5 * cm, y - 1, right)
    if _text(form_data.get("payee")):
        c.setFont(font_regular, 9)
        c.drawString(left + 1.6 * cm, y + 1, _text(form_data.get("payee")))
    y -= 0.5 * cm

    # PV line
    c.setFont(font_regular, 9)
    c.drawString(left, y, "I return herewith P. V. No.")
    line(left + 4.4 * cm, y - 1, left + 8.0 * cm)
    if _text(form_data.get("pv_no")):
        c.setFont(font_bold, 9)
        c.drawString(left + 4.5 * cm, y + 1, _text(form_data.get("pv_no")))
    c.setFont(font_regular, 9)
    c.drawString(left + 8.2 * cm, y, "Dated")
    line(left + 9.4 * cm, y - 1, right)
    if _text(form_data.get("pv_date")):
        c.setFont(font_bold, 9)
        c.drawString(left + 9.5 * cm, y + 1, _text(form_data.get("pv_date")))
    y -= 0.5 * cm

    # Amount line: (N .... ) ........ Naira ..... Kobo
    c.setFont(font_regular, 9)
    c.drawString(left, y, "(N")
    line(left + 0.7 * cm, y - 1, left + 5.5 * cm)
    naira = form_data.get("amount_naira", "")
    kobo = form_data.get("amount_kobo", "")
    try:
        naira_disp = f"{float(naira):,.2f}" if naira not in ("", None) else ""
    except (ValueError, TypeError):
        naira_disp = _text(naira)
    if naira_disp:
        c.setFont(font_bold, 9)
        c.drawString(left + 0.8 * cm, y + 1, naira_disp)
    c.setFont(font_regular, 9)
    c.drawString(left + 5.6 * cm, y, ")")
    line(left + 6.0 * cm, y - 1, left + 11.5 * cm)
    c.drawString(left + 11.6 * cm, y, "Naira")
    line(left + 12.8 * cm, y - 1, left + 15.2 * cm)
    if kobo not in ("", None):
        c.setFont(font_bold, 9)
        c.drawString(left + 12.9 * cm, y + 1, _text(kobo))
    c.setFont(font_regular, 9)
    c.drawString(left + 15.3 * cm, y, "Kobo")
    y -= 0.5 * cm

    c.setFont(font_regular, 9)
    c.drawString(left, y, "together with relevant documents uncertified because of the following reasons:-")
    y -= 0.45 * cm

    # 13 blank reason lines; put reasons text on first lines
    reasons = _text(form_data.get("reasons"))
    reason_chunks: list[str] = []
    if reasons:
        # naive wrap ~95 chars
        words = reasons.split()
        current = ""
        for word in words:
            trial = f"{current} {word}".strip()
            if len(trial) > 95:
                reason_chunks.append(current)
                current = word
            else:
                current = trial
        if current:
            reason_chunks.append(current)

    for i in range(13):
        line(left, y - 1, right)
        if i < len(reason_chunks):
            c.setFont(font_regular, 8.5)
            c.drawString(left + 2, y + 1, reason_chunks[i])
        y -= 0.42 * cm

    y -= 0.15 * cm
    deadline = form_data.get("response_deadline", 48) or 48
    c.setFont(font_regular, 8)
    c.drawString(
        left,
        y,
        f"Could you please explain the observations made above and return same to the undersigned "
        f"within {deadline} hours, further necessary action.",
    )

    # Signature block bottom-right
    c.setFont(font_regular, 9)
    c.drawRightString(right, 1.6 * cm, "for: Gen. Manager Audit")
    line(right - 5.5 * cm, 1.25 * cm, right)
    gm_name = _text(form_data.get("gm_name"))
    if gm_name:
        c.setFont(font_bold, 8)
        c.drawRightString(right, 1.35 * cm, gm_name)
    gm_desig = _text(form_data.get("gm_designation"))
    if gm_desig:
        c.setFont(font_regular, 7.5)
        c.drawRightString(right, 1.0 * cm, gm_desig)

    c.showPage()
    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

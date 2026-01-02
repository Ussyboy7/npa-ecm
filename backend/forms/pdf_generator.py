"""PDF generation for form submissions."""

from __future__ import annotations

from io import BytesIO
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage


def generate_project_monitoring_report_pdf(submission_data: Dict[str, Any]) -> bytes:
    """
    Generate PDF for Project Monitoring Report matching the original NPA form format.
    
    Args:
        submission_data: Dictionary containing form field values
        
    Returns:
        PDF bytes
    """
    buffer = BytesIO()
    
    # A4 page size with margins matching the original form
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=1*cm,
        bottomMargin=1*cm,
    )
    
    # Container for the story (PDF elements)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles matching the original form
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
    
    # Header: NIGERIAN PORTS AUTHORITY INTERNAL AUDIT DIVISION
    story.append(Paragraph("NIGERIAN PORTS AUTHORITY", header_style))
    story.append(Paragraph("INTERNAL AUDIT DIVISION", header_style))
    story.append(Spacer(1, 0.3*cm))
    
    # Title: PROJECT MONITORING REPORT - AUDIT DIVISION
    story.append(Paragraph("PROJECT MONITORING REPORT - AUDIT DIVISION", title_style))
    story.append(Spacer(1, 0.4*cm))
    
    # Header Information Table
    header_data = [
        ['To:', submission_data.get('to', '') or ''],
        ['From:', submission_data.get('from_field', '') or ''],
        ['Date:', submission_data.get('date', '') or ''],
        ['CHQ No:', submission_data.get('chq_no', '') or ''],
        ['Our Ref:', submission_data.get('our_ref', '') or ''],
    ]
    
    header_table = Table(header_data, colWidths=[3*cm, 12*cm])
    header_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.3*cm))
    
    # Subject
    story.append(Paragraph("<b>Subject:</b> " + (submission_data.get('subject', '') or ''), field_style))
    story.append(Spacer(1, 0.2*cm))
    
    # Project Details Section
    story.append(Paragraph("<b>Project Details:</b>", label_style))
    
    project_data = [
        ['Project:', submission_data.get('project', '') or ''],
        ['Location:', submission_data.get('location', '') or ''],
        ['Contractor\'s Name:', submission_data.get('contractor_name', '') or ''],
        ['Address:', submission_data.get('contractor_address', '') or ''],
        ['Contract Sum:', format_currency(submission_data.get('contract_sum', 0))],
        ['Ref: No. & Date of Award Letter:', submission_data.get('award_ref', '') or ''],
        ['C.E.P. No. & Date:', submission_data.get('cep_no_date', '') or ''],
    ]
    
    project_table = Table(project_data, colWidths=[5*cm, 10*cm])
    project_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story.append(project_table)
    story.append(Spacer(1, 0.3*cm))
    
    # Audit Details Section
    story.append(Paragraph("<b>Audit Details:</b>", label_style))
    
    audit_data = [
        ['Project Manager:', submission_data.get('project_manager', '') or ''],
        ['Audit Assignment:', submission_data.get('audit_assignment', '') or ''],
    ]
    
    audit_table = Table(audit_data, colWidths=[5*cm, 10*cm])
    audit_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(audit_table)
    story.append(Spacer(1, 0.2*cm))
    
    # Checkboxes
    checkbox_items = [
        ('(i) Attach Bill of Quantity', submission_data.get('attach_boq', False)),
        ('(ii) Check Bill of Quantity For Extent of Work Done', submission_data.get('check_boq_extent', False)),
        ('(iii) Review the Unit Price of item on BOQ', submission_data.get('review_unit_price', False)),
        ('(iv) Attach all Working Papers', submission_data.get('attach_working_papers', False)),
    ]
    
    for label, checked in checkbox_items:
        checkbox = '☑' if checked else '☐'
        story.append(Paragraph(f"{checkbox} {label}", field_style))
    
    story.append(Spacer(1, 0.2*cm))
    
    # Comments
    if submission_data.get('comments'):
        story.append(Paragraph("<b>Comments:</b>", label_style))
        story.append(Paragraph(submission_data.get('comments', ''), value_style))
        story.append(Spacer(1, 0.2*cm))
    
    # Observation
    if submission_data.get('observation'):
        story.append(Paragraph("<b>Observation:</b>", label_style))
        story.append(Paragraph(submission_data.get('observation', ''), value_style))
        story.append(Spacer(1, 0.2*cm))
    
    # Recommendation
    if submission_data.get('recommendation'):
        story.append(Paragraph("<b>Recommendation:</b>", label_style))
        story.append(Paragraph(submission_data.get('recommendation', ''), value_style))
        story.append(Spacer(1, 0.3*cm))
    
    # Certification Statement
    story.append(Paragraph(
        "We hereby certified that the Project was executed in accordance with the terms of the Letter of Award of the Contract.",
        field_style
    ))
    story.append(Spacer(1, 0.4*cm))
    
    # Signatures Section
    story.append(Paragraph("<b>Signatures:</b>", label_style))
    story.append(Spacer(1, 0.2*cm))
    
    # Project Manager/Engineer
    story.append(Paragraph("<b>Project Manager/Engineer:</b>", label_style))
    pm_data = [
        ['Name:', submission_data.get('pm_name', '') or ''],
        ['P/N:', submission_data.get('pm_pn', '') or ''],
        ['Designation:', submission_data.get('pm_designation', '') or ''],
        ['Signature:', '[Signature]' if submission_data.get('pm_signature') else ''],
        ['Date:', submission_data.get('pm_date', '') or ''],
    ]
    pm_table = Table(pm_data, colWidths=[3*cm, 4*cm, 3*cm, 3*cm, 2*cm])
    pm_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(pm_table)
    story.append(Spacer(1, 0.3*cm))
    
    # Procurement
    story.append(Paragraph("<b>Procurement:</b>", label_style))
    proc_data = [
        ['Name:', submission_data.get('procurement_name', '') or ''],
        ['P/N:', submission_data.get('procurement_pn', '') or ''],
        ['Designation:', submission_data.get('procurement_designation', '') or ''],
        ['Signature:', '[Signature]' if submission_data.get('procurement_signature') else ''],
        ['Date:', submission_data.get('procurement_date', '') or ''],
    ]
    proc_table = Table(proc_data, colWidths=[3*cm, 4*cm, 3*cm, 3*cm, 2*cm])
    proc_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(proc_table)
    story.append(Spacer(1, 0.3*cm))
    
    # Audit
    story.append(Paragraph("<b>Audit:</b>", label_style))
    audit_sig_data = [
        ['Name:', submission_data.get('audit_name', '') or ''],
        ['P/N:', submission_data.get('audit_pn', '') or ''],
        ['Designation:', submission_data.get('audit_designation', '') or ''],
        ['Signature:', '[Signature]' if submission_data.get('audit_signature') else ''],
        ['Date:', submission_data.get('audit_date', '') or ''],
    ]
    audit_sig_table = Table(audit_sig_data, colWidths=[3*cm, 4*cm, 3*cm, 3*cm, 2*cm])
    audit_sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(audit_sig_table)
    story.append(Spacer(1, 0.3*cm))
    
    # Distribution
    if submission_data.get('distribution'):
        story.append(Paragraph("<b>Distribution (Original) PV:</b>", label_style))
        story.append(Paragraph(submission_data.get('distribution', ''), value_style))
    
    # Build PDF
    doc.build(story)
    
    # Get PDF bytes
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes


def format_currency(amount: Any) -> str:
    """Format amount as Nigerian Naira currency."""
    try:
        if amount is None:
            return "₦0.00"
        num_amount = float(amount)
        return f"₦{num_amount:,.2f}"
    except (ValueError, TypeError):
        return f"₦{amount}"


def generate_project_completion_validation_pdf(form_data: Dict[str, Any]) -> bytes:
    """
    Generate PDF for Project Completion Validation Form.
    
    Args:
        form_data: Dictionary containing form field values
        
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


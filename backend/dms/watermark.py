"""Apply byte-level text watermarks and PDF permission flags at serve time."""

from __future__ import annotations

import io
import secrets

from pypdf import PdfReader, PdfWriter
from pypdf.constants import UserAccessPermissions
from reportlab.lib.colors import Color
from reportlab.pdfgen import canvas


def is_pdf_bytes(data: bytes) -> bool:
    return bool(data) and data[:4] == b"%PDF"


def apply_text_watermark(pdf_bytes: bytes, text: str) -> bytes:
    """
    Overlay diagonal semi-transparent text on every page of a PDF.

    Returns the original bytes unchanged when text is empty or the payload is not a PDF.
    Raises on stamp failures so restricted PDFs are never served unmarked by accident.
    """
    watermark = (text or "").strip()
    if not watermark or not is_pdf_bytes(pdf_bytes):
        return pdf_bytes

    reader = PdfReader(io.BytesIO(pdf_bytes))
    if not reader.pages:
        return pdf_bytes

    writer = PdfWriter()
    for page in reader.pages:
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        overlay_buf = io.BytesIO()
        c = canvas.Canvas(overlay_buf, pagesize=(width, height))
        c.saveState()
        c.setFillColor(Color(0.55, 0.55, 0.55, alpha=0.28))
        font_size = max(28, min(width, height) * 0.08)
        c.setFont("Helvetica-Bold", font_size)
        c.translate(width / 2, height / 2)
        c.rotate(45)
        c.drawCentredString(0, 0, watermark)
        c.restoreState()
        c.save()
        overlay_buf.seek(0)
        overlay_page = PdfReader(overlay_buf).pages[0]
        page.merge_page(overlay_page, over=True)
        writer.add_page(page)

    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def apply_pdf_access_restrictions(
    pdf_bytes: bytes,
    *,
    allow_print: bool = True,
    allow_extract: bool = True,
) -> bytes:
    """
    Encrypt PDF with empty user password so viewers open it, but owner
    permissions block print and/or extract when policy requires it.
    """
    if not is_pdf_bytes(pdf_bytes):
        return pdf_bytes
    if allow_print and allow_extract:
        return pdf_bytes

    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    writer.append_pages_from_reader(reader)

    # Start from no grants, then add back what policy allows.
    permissions = UserAccessPermissions(0)
    if allow_print:
        permissions |= UserAccessPermissions.PRINT
        permissions |= UserAccessPermissions.PRINT_TO_REPRESENTATION
    if allow_extract:
        permissions |= UserAccessPermissions.EXTRACT
        permissions |= UserAccessPermissions.EXTRACT_TEXT_AND_GRAPHICS

    owner_password = secrets.token_urlsafe(24)
    writer.encrypt(
        user_password="",
        owner_password=owner_password,
        use_128bit=True,
        permissions_flag=permissions,
    )
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()

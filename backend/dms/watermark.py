"""Apply byte-level text watermarks to PDF payloads at serve time."""

from __future__ import annotations

import io

from pypdf import PdfReader, PdfWriter
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

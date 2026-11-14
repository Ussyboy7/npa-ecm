"""Compose the approved-copy PDF for an approval minute.

The source memo is reproduced from its DMS version, followed by a signed
certificate and the minutes record. HTML memos are rendered as before; a
scan-only PDF or image keeps its original pages. The DMS version is never
modified.
"""

from __future__ import annotations

import html as html_lib
import logging
import re
from datetime import datetime
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse
from xml.sax.saxutils import escape

from django.conf import settings
from django.core.files.storage import default_storage
from django.utils.dateformat import format as date_format
from PIL import Image, ImageOps
from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    Image as ReportLabImage,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from correspondence.models import CorrespondenceDocumentLink, Minute
from dms.models import Document, DocumentVersion

logger = logging.getLogger(__name__)
PAGE_SIZE = A4

NAVY = colors.HexColor("#1e3a5f")
SLATE = colors.HexColor("#475569")
MUTED = colors.HexColor("#64748b")
GREEN = colors.HexColor("#047857")
LIGHT_GREEN = colors.HexColor("#ecfdf5")
LINE = colors.HexColor("#cbd5e1")
CONTENT_WIDTH = 6.5 * inch
_SCAN_IMAGE_EXTENSIONS = {".bmp", ".gif", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"}
_SCAN_IMAGE_TYPES = {
    "image/bmp",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
}


def _safe_text(value) -> str:
    """Return text that is safe inside a ReportLab Paragraph."""
    return escape(html_lib.unescape(str(value or "")))


def _plain(value: str) -> str:
    return re.sub(r"<[^>]+>", "", html_lib.unescape(value or "")).strip()


def _inline_markup(fragment: str) -> str:
    """Convert simple HTML inline markup into ReportLab-safe paragraph markup."""
    if not fragment or not fragment.strip():
        return ""

    text = re.sub(
        r"<(br|/p|/div|/li|/tr|/h[1-6])\b[^>]*>",
        "\n",
        fragment,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"<(strong|b)\b[^>]*>", "\x00BOPEN\x00", text, flags=re.IGNORECASE)
    text = re.sub(r"</(strong|b)>", "\x00BCLOSE\x00", text, flags=re.IGNORECASE)
    text = re.sub(r"<(em|i)\b[^>]*>", "\x00IOPEN\x00", text, flags=re.IGNORECASE)
    text = re.sub(r"</(em|i)>", "\x00ICLOSE\x00", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = html_lib.unescape(text).replace("\xa0", " ")
    text = escape(text)
    text = text.replace("\x00BOPEN\x00", "<b>").replace("\x00BCLOSE\x00", "</b>")
    text = text.replace("\x00IOPEN\x00", "<i>").replace("\x00ICLOSE\x00", "</i>")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip().replace("\n", "<br/>")


def _html_segments(html: str) -> list[tuple[str, object]]:
    """Split memo HTML into ordered text and table segments."""
    table_pattern = re.compile(r"<table\b[^>]*>.*?</table>", re.IGNORECASE | re.DOTALL)
    segments: list[tuple[str, object]] = []
    cursor = 0
    for match in table_pattern.finditer(html or ""):
        before = (html or "")[cursor : match.start()]
        if before.strip():
            segments.append(("text", before))
        rows = []
        for row_html in re.findall(
            r"<tr\b[^>]*>.*?</tr>", match.group(0), re.IGNORECASE | re.DOTALL
        ):
            cells = re.findall(
                r"<t[dh]\b[^>]*>(.*?)</t[dh]>",
                row_html,
                re.IGNORECASE | re.DOTALL,
            )
            if cells:
                rows.append([_inline_markup(cell) for cell in cells])
        if rows:
            segments.append(("table", rows))
        cursor = match.end()
    tail = (html or "")[cursor:]
    if tail.strip():
        segments.append(("text", tail))
    return segments


def _styles():
    base = getSampleStyleSheet()
    return {
        "org": ParagraphStyle(
            "MemoOrg",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=15,
            alignment=TA_CENTER,
            textColor=NAVY,
            spaceAfter=2,
        ),
        "division": ParagraphStyle(
            "MemoDivision",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            alignment=TA_CENTER,
            textColor=SLATE,
            spaceAfter=1,
        ),
        "department": ParagraphStyle(
            "MemoDepartment",
            parent=base["Normal"],
            fontSize=9,
            leading=11,
            alignment=TA_CENTER,
            textColor=SLATE,
            spaceAfter=4,
        ),
        "doc_type": ParagraphStyle(
            "MemoDocType",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            alignment=TA_CENTER,
            textColor=NAVY,
            spaceBefore=6,
            spaceAfter=6,
        ),
        "approval_label": ParagraphStyle(
            "ApprovalCopyLabel",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=17,
            textColor=GREEN,
            alignment=TA_LEFT,
            spaceAfter=4,
        ),
        "meta": ParagraphStyle(
            "MemoMeta",
            parent=base["Normal"],
            fontSize=8.5,
            leading=11,
            textColor=SLATE,
        ),
        "meta_small": ParagraphStyle(
            "MemoMetaSmall",
            parent=base["Normal"],
            fontSize=7.5,
            leading=9.5,
            textColor=MUTED,
        ),
        "subject": ParagraphStyle(
            "MemoSubject",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            textColor=colors.black,
            spaceBefore=10,
            spaceAfter=8,
        ),
        "body": ParagraphStyle(
            "MemoBody",
            parent=base["Normal"],
            fontSize=9.5,
            leading=13,
            textColor=colors.black,
            spaceAfter=5,
        ),
        "cell": ParagraphStyle(
            "MemoCell",
            parent=base["Normal"],
            fontSize=8,
            leading=10,
            textColor=colors.black,
        ),
        "cell_header": ParagraphStyle(
            "MemoCellHeader",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.white,
        ),
        "section": ParagraphStyle(
            "ApprovalSection",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=14,
            textColor=NAVY,
            spaceAfter=8,
        ),
        "subheader": ParagraphStyle(
            "ApprovalSubheader",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=NAVY,
            spaceBefore=8,
            spaceAfter=4,
        ),
        "minute": ParagraphStyle(
            "MinuteCell",
            parent=base["Normal"],
            fontSize=7.5,
            leading=9.5,
            textColor=colors.black,
        ),
        "minute_header": ParagraphStyle(
            "MinuteHeader",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.white,
        ),
        "verification_label": ParagraphStyle(
            "VerificationLabel",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=SLATE,
        ),
        "verification_value": ParagraphStyle(
            "VerificationValue",
            parent=base["Normal"],
            fontSize=8,
            leading=10,
            textColor=colors.black,
        ),
        "verification_value_bold": ParagraphStyle(
            "VerificationValueBold",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10.5,
            textColor=colors.black,
        ),
        "footer": ParagraphStyle(
            "ApprovalFooter",
            parent=base["Normal"],
            fontSize=7.5,
            leading=9,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceBefore=10,
        ),
    }


def _format_date(value, pattern: str = "F j, Y, H:i") -> str:
    if not value:
        return ""
    try:
        return date_format(value, pattern)
    except (AttributeError, TypeError):
        return (
            value.strftime("%B %d, %Y, %H:%M")
            if hasattr(value, "strftime")
            else str(value)
        )


def _public_app_origin() -> str:
    """Return the externally reachable application origin, if configured."""
    for setting_name in ("PUBLIC_APP_ORIGIN", "FRONTEND_BASE_URL"):
        origin = (getattr(settings, setting_name, "") or "").strip().rstrip("/")
        if origin:
            return origin
    return ""


def _verification_url(seal) -> str:
    """Build the verification URL from the configured public app origin."""
    if not seal:
        return ""
    serial = getattr(seal, "serial_number", "")
    base = _public_app_origin()
    if base and serial:
        return f"{base}/verify/{serial}"
    return getattr(seal, "verification_url", "") or ""


def _source_memo(correspondence):
    """Return the primary linked DMS document and its current version.

    The approved copy is an attachment in the DMS, so it is explicitly skipped
    when selecting the source memo. A version is renderable if it has HTML,
    text, or an original PDF/image scan to preserve.
    """
    fallback = None
    links = (
        CorrespondenceDocumentLink.objects.filter(correspondence=correspondence)
        .select_related("document")
        .order_by("created_at")
    )
    for link in links:
        document = link.document
        if "approved-copy" in (document.tags or []):
            continue
        version = (
            DocumentVersion.objects.filter(document=document)
            .order_by("-version_number")
            .first()
        )
        if not version or not (
            version.content_html or version.content_text or _scan_kind(version)
        ):
            continue
        candidate = (document, version)
        if document.role == Document.Role.PRIMARY:
            return candidate
        if fallback is None:
            fallback = candidate
    return fallback


def _scan_kind(version) -> str:
    """Return ``pdf`` or ``image`` when a version carries an original scan."""
    if not version or not getattr(version, "file_url", ""):
        return ""
    mime_type = (getattr(version, "file_type", "") or "").split(";", 1)[0].strip().lower()
    file_name = getattr(version, "file_name", "") or ""
    extension = Path(urlparse(getattr(version, "file_url", "")).path or file_name).suffix.lower()
    if not extension:
        extension = Path(file_name).suffix.lower()
    if mime_type == "application/pdf" or extension == ".pdf":
        return "pdf"
    if mime_type in _SCAN_IMAGE_TYPES or extension in _SCAN_IMAGE_EXTENSIONS:
        return "image"
    return ""


def _media_storage_path(file_url: str) -> str:
    """Turn a stored media URL back into a storage-relative path."""
    if not file_url:
        return ""
    path = urlparse(file_url).path if "://" in file_url else file_url
    media_prefix = f"{(settings.MEDIA_URL or '/media/').rstrip('/')}/"
    if media_prefix in path:
        relative = path.split(media_prefix, 1)[1].lstrip("/")
    else:
        relative = path.lstrip("/")
    if not relative or ".." in Path(relative).parts:
        return ""
    return relative


def _read_version_file(version) -> bytes | None:
    """Read the original uploaded file for a DMS version, if it is available."""
    path = _media_storage_path(getattr(version, "file_url", ""))
    if not path:
        return None
    try:
        with default_storage.open(path, "rb") as stored_file:
            return stored_file.read()
    except (OSError, ValueError) as exc:
        logger.warning("Could not read source scan %s: %s", path, exc)
        return None


def _image_scan_pdf(file_bytes: bytes) -> bytes | None:
    """Place an image scan on a clean A4 page without cropping it."""
    try:
        image = Image.open(BytesIO(file_bytes))
        image.seek(0)
        image = ImageOps.exif_transpose(image)
        if image.mode in ("RGBA", "LA") or "transparency" in image.info:
            rgba = image.convert("RGBA")
            background = Image.new("RGB", rgba.size, "white")
            background.paste(rgba, mask=rgba.getchannel("A"))
            image = background
        else:
            image = image.convert("RGB")

        normalized = BytesIO()
        image.save(normalized, format="PNG")
        normalized.seek(0)

        page_width, page_height = PAGE_SIZE
        margin = 0.35 * inch
        scale = min(
            (page_width - 2 * margin) / image.width,
            (page_height - 2 * margin) / image.height,
        )
        draw_width = image.width * scale
        draw_height = image.height * scale

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=PAGE_SIZE)
        pdf.drawImage(
            ImageReader(normalized),
            (page_width - draw_width) / 2,
            (page_height - draw_height) / 2,
            width=draw_width,
            height=draw_height,
            preserveAspectRatio=True,
            anchor="c",
        )
        pdf.showPage()
        pdf.save()
        return buffer.getvalue()
    except (OSError, ValueError) as exc:
        logger.warning("Could not render image scan: %s", exc)
        return None


def _render_scan_pdf(version) -> bytes | None:
    """Return the original scan pages as a PDF, preserving PDF pagination."""
    kind = _scan_kind(version)
    if not kind:
        return None
    file_bytes = _read_version_file(version)
    if not file_bytes:
        return None
    if kind == "image":
        return _image_scan_pdf(file_bytes)

    if not file_bytes.startswith(b"%PDF-"):
        logger.warning("Source file for %s is not a valid PDF", version.file_url)
        return None
    try:
        if not PdfReader(BytesIO(file_bytes)).pages:
            return None
    except Exception as exc:
        logger.warning("Could not read source scan PDF %s: %s", version.file_url, exc)
        return None
    return file_bytes


def _media_url(path: str) -> str:
    """Build a relative media URL for a stored approved-copy PDF."""
    media_url = (settings.MEDIA_URL or "/media/").strip()
    if not media_url.startswith("/"):
        media_url = f"/{media_url}"
    if not media_url.endswith("/"):
        media_url = f"{media_url}/"
    return f"{media_url}{path.lstrip('/')}"


def _dms_paper_html(content_html: str) -> str:
    """Wrap stored DMS HTML in the same paper CSS used by the DMS preview."""
    return f"""<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
@page {{ size: A4; margin: 0.35in 0.35in 1.75in 0.35in; }}
html, body {{ margin: 0; padding: 0; }}
.doc-paper {{
    font-family: Verdana, Geneva, sans-serif;
    font-size: 12px;
    line-height: 1.5;
    color: #000;
    text-align: left;
}}
.doc-paper p {{ margin: 0 0 0.55em; }}
.doc-paper table {{ border-collapse: collapse; width: 100%; margin: 0.75rem 0; }}
.doc-paper td, .doc-paper th {{
    border: 1px solid #c4c4c4;
    padding: 0.35rem 0.5rem;
    vertical-align: top;
}}
.doc-paper th {{ font-weight: 600; background: #f3f4f6; }}
.doc-paper img {{ max-width: 100%; height: auto; display: inline-block; }}
.doc-paper img[alt="Signature"] {{
    width: auto;
    height: auto;
    max-width: 2.4in;
    max-height: 1.1in;
    display: block;
    margin-top: 0.2in;
}}
</style>
</head>
<body><div class="doc-paper">{content_html}</div></body>
</html>"""


def _pdf_page_count(pdf_bytes: bytes) -> int:
    return len(PdfReader(BytesIO(pdf_bytes)).pages)


def _merge_pdfs(parts: list[bytes], title: str) -> bytes:
    """Join separately rendered memo and certificate pages into one PDF."""
    writer = PdfWriter()
    for part in parts:
        for page in PdfReader(BytesIO(part)).pages:
            writer.add_page(page)
    writer.add_metadata(
        {
            "/Title": title,
            "/Author": "Nigerian Ports Authority",
            "/Creator": "NPA ECM",
        }
    )
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def _reportlab_pdf(
    flowables,
    title: str,
    page_offset: int = 0,
    bottom_margin: float = 0.7 * inch,
) -> bytes:
    """Render fallback memo or certificate/record pages with ReportLab."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=PAGE_SIZE,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.6 * inch,
        bottomMargin=bottom_margin,
        title=title,
        author="Nigerian Ports Authority",
    )
    doc.build(flowables)
    return buffer.getvalue()


def _render_back_pdf(
    minute,
    correspondence,
    seal,
    seal_png,
    styles,
    page_offset: int,
    snapshot=None,
) -> bytes:
    """Render the certificate and approval-record pages after the memo."""
    minutes = []
    if snapshot is None:
        minutes = list(
            Minute.objects.filter(correspondence=correspondence)
            .select_related("user", "from_office", "to_office", "seal_applied")
            .order_by("timestamp", "step_number")
        )
    story = _approval_certificate(
        minute,
        correspondence,
        seal,
        seal_png,
        styles,
        snapshot=snapshot,
    )
    story.append(PageBreak())
    story.append(Paragraph("Approval Record", styles["section"]))
    if minutes or (snapshot is not None and snapshot.minutes):
        story.append(_minutes_table(minutes, styles, snapshot=snapshot))
    else:
        story.append(
            Paragraph("No minutes recorded for this correspondence.", styles["body"])
        )

    reference = correspondence.reference_number or str(correspondence.id)
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=PAGE_SIZE,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.7 * inch,
        title=f"Approved copy — {reference}",
        author="Nigerian Ports Authority",
    )

    def footer(canvas, document):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(MUTED)
        canvas.drawString(0.75 * inch, 0.4 * inch, f"{reference} · Approved copy")
        canvas.drawRightString(
            PAGE_SIZE[0] - 0.75 * inch,
            0.4 * inch,
            f"Page {document.page + page_offset}",
        )
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    buffer.seek(0)
    return buffer.getvalue()


def _render_memo_pdf(source_document, source_version, correspondence) -> bytes:
    """Render the source memo pages without changing the DMS version.

    HTML memos use WeasyPrint so their inline styles, tables and spacing are
    retained. Scan-only versions preserve the original PDF or image pages;
    OCR text is never substituted for the scan.
    """
    content_html = (source_version.content_html or "") if source_version else ""
    if source_version and not content_html.strip():
        scan_pdf = _render_scan_pdf(source_version)
        if scan_pdf:
            return scan_pdf
    if content_html:
        try:
            from weasyprint import HTML

            base_url = None
            if settings.MEDIA_ROOT:
                media_root = Path(settings.MEDIA_ROOT)
                base_url = media_root.as_uri() + "/"
            return HTML(string=_dms_paper_html(content_html), base_url=base_url).write_pdf(
                presentational_hints=True
            )
        except Exception as exc:  # keep downloads available if the renderer cannot load
            logger.warning("Falling back to ReportLab memo rendering: %s", exc)

    styles = _styles()
    flowables = []
    if content_html:
        flowables.extend(_memo_flowables(content_html, styles, allow_header=True))
    elif source_version and source_version.content_text:
        text_html = escape(source_version.content_text).replace("\n", "<br/>")
        flowables.extend(_memo_flowables(text_html, styles, allow_header=True))
    elif correspondence.body_html:
        flowables.extend(
            _memo_flowables(correspondence.body_html, styles, allow_header=True)
        )
    elif correspondence.treatment_response:
        flowables.extend(
            _memo_flowables(
                escape(correspondence.treatment_response).replace("\n", "<br/>"),
                styles,
                allow_header=True,
            )
        )
    if not flowables:
        flowables.append(
            Paragraph("No source memo content is available.", styles["body"])
        )
    return _reportlab_pdf(
        flowables,
        title=f"Approved copy — {correspondence.reference_number or correspondence.id}",
        bottom_margin=1.75 * inch,
    )


def _seal_png(seal) -> bytes | None:
    """Return the hash-verified server render of an issued seal."""
    if not seal:
        return None
    from accounts.services import SealGenerationService

    verification_url = _verification_url(seal) or f"verify:{seal.serial_number}"
    return SealGenerationService.ensure_seal_image(
        seal,
        verification_url=verification_url,
    )


def _seal_image_flowable(png: bytes | None, size: float = 96):
    if not png:
        return None
    try:
        image = Image.open(BytesIO(png))
        image.thumbnail((900, 900), Image.Resampling.LANCZOS)
        if image.mode in ("RGBA", "LA", "P"):
            rgb = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            rgb.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
            image = rgb
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)
        width, height = image.size
        scale = size / max(width, height)
        return ReportLabImage(buffer, width=width * scale, height=height * scale)
    except Exception:
        return None


def _signature_png(seal) -> bytes | None:
    """Read the signature image used for this seal, if it is still available."""
    if not seal:
        return None
    signature_image = seal.signature_image
    if not signature_image:
        return None
    try:
        with signature_image.open("rb") as image_file:
            return image_file.read()
    except (OSError, ValueError, AttributeError):
        return None


def _memo_table(rows, styles):
    if not rows:
        return []
    columns = max(len(row) for row in rows)
    normalized = [row + [""] * (columns - len(row)) for row in rows]
    if columns == 3:
        widths = [0.55 * inch, CONTENT_WIDTH - 1.55 * inch, 1.0 * inch]
    elif columns == 2:
        widths = [1.7 * inch, CONTENT_WIDTH - 1.7 * inch]
    else:
        widths = [CONTENT_WIDTH / columns] * columns

    data = []
    for row_index, row in enumerate(normalized):
        style = styles["cell_header"] if row_index == 0 else styles["cell"]
        data.append([Paragraph(cell or "&nbsp;", style) for cell in row])

    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("GRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.white, colors.HexColor("#f8fafc")],
                ),
            ]
        )
    )
    return [Spacer(1, 0.08 * inch), table, Spacer(1, 0.12 * inch)]


def _memo_text_flowables(markup: str, styles, allow_header: bool):
    lines = [line.strip() for line in (markup or "").split("<br/>")]
    lines = [line for line in lines if line and _plain(line)]
    if not lines:
        return []

    flow = []
    index = 0
    if allow_header and lines and "NIGERIAN PORTS" in _plain(lines[0]).upper():
        flow.append(Paragraph(lines[0], styles["org"]))
        index = 1
        if index < len(lines) and _plain(lines[index]).isupper():
            flow.append(Paragraph(lines[index], styles["division"]))
            index += 1
        if index < len(lines) and "DEPARTMENT" in _plain(lines[index]).upper():
            flow.append(Paragraph(lines[index], styles["department"]))
            index += 1
        if index < len(lines) and "MEMORANDUM" in _plain(lines[index]).upper():
            flow.append(Paragraph(_plain(lines[index]).upper(), styles["doc_type"]))
            index += 1
        flow.append(
            HRFlowable(
                width="100%",
                thickness=1.2,
                color=NAVY,
                spaceBefore=2,
                spaceAfter=8,
            )
        )

    # The memo header is usually two lines containing To/Date and From/Ref.
    to_line = next(
        (line for line in lines[index:] if _plain(line).startswith("To:")), None
    )
    from_line = next(
        (line for line in lines[index:] if _plain(line).startswith("From:")), None
    )
    if to_line and from_line:
        to_text = _plain(to_line)
        from_text = _plain(from_line)
        to_match = re.match(r"To:\s*(.*?)\s+Date:\s*(.*)$", to_text, re.IGNORECASE)
        from_match = re.match(
            r"From:\s*(.*?)\s+Ref\.?:\s*(.*)$", from_text, re.IGNORECASE
        )
        to_value = to_match.group(1) if to_match else to_text[3:].strip()
        date_value = to_match.group(2) if to_match else ""
        from_value = from_match.group(1) if from_match else from_text[5:].strip()
        ref_value = from_match.group(2) if from_match else ""
        meta = Table(
            [
                [
                    Paragraph("<b>To:</b>", styles["meta"]),
                    Paragraph(_safe_text(to_value), styles["meta"]),
                    Paragraph("<b>Date:</b>", styles["meta"]),
                    Paragraph(_safe_text(date_value), styles["meta"]),
                ],
                [
                    Paragraph("<b>From:</b>", styles["meta"]),
                    Paragraph(_safe_text(from_value), styles["meta"]),
                    Paragraph("<b>Ref.:</b>", styles["meta"]),
                    Paragraph(_safe_text(ref_value), styles["meta"]),
                ],
            ],
            colWidths=[0.45 * inch, 2.7 * inch, 0.45 * inch, 2.9 * inch],
        )
        meta.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 1),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                ]
            )
        )
        flow.append(meta)
        flow.append(Spacer(1, 0.08 * inch))
        lines = [line for line in lines if line not in (to_line, from_line)]

    subject_seen = False
    for line in lines[index:]:
        plain = _plain(line)
        if not plain:
            continue
        if not subject_seen and plain.upper().startswith(("RE:", "RE :")):
            flow.append(Paragraph(line, styles["subject"]))
            subject_seen = True
        else:
            flow.append(Paragraph(line, styles["body"]))
    return flow


def _memo_flowables(html: str, styles, allow_header: bool = True):
    flow = []
    first_text = allow_header
    for kind, payload in _html_segments(html):
        if kind == "table":
            flow.extend(_memo_table(payload, styles))
        else:
            flow.extend(
                _memo_text_flowables(
                    _inline_markup(payload),
                    styles,
                    first_text,
                )
            )
            first_text = False
    if not flow and html and html.strip():
        flow.append(Paragraph(_inline_markup(html), styles["body"]))
    return flow


def _minutes_table(minutes, styles, snapshot=None):
    """Render the approval trail as a compact minutes table."""
    data = [
        [
            Paragraph("Step", styles["minute_header"]),
            Paragraph("Action", styles["minute_header"]),
            Paragraph("By", styles["minute_header"]),
            Paragraph("Office", styles["minute_header"]),
            Paragraph("Date", styles["minute_header"]),
            Paragraph("Note", styles["minute_header"]),
        ]
    ]
    approval_rows = []
    if snapshot is not None:
        for row_index, item in enumerate(snapshot.minutes or [], start=1):
            action = str(item.get("action") or "")
            by = str(item.get("by") or "Unknown")
            identity = " · ".join(
                filter(
                    None,
                    [
                        item.get("personnel_number") or "",
                        item.get("designation") or "",
                    ],
                )
            )
            user = f"<b>{_safe_text(by)}</b>"
            if identity:
                user += f"<br/>{_safe_text(identity)}"
            date_text = str(item.get("date") or "")
            try:
                date_text = _format_date(
                    datetime.fromisoformat(date_text), "d M Y"
                )
            except (TypeError, ValueError):
                date_text = date_text[:10]
            data.append(
                [
                    Paragraph(_safe_text(item.get("step")), styles["minute"]),
                    Paragraph(_safe_text(action), styles["minute"]),
                    Paragraph(user, styles["minute"]),
                    Paragraph(
                        _safe_text(item.get("office") or "—"), styles["minute"]
                    ),
                    Paragraph(_safe_text(date_text), styles["minute"]),
                    Paragraph(
                        _safe_text(item.get("note") or "—").replace("\n", "<br/>"),
                        styles["minute"],
                    ),
                ]
            )
            if action.lower() == "approve":
                approval_rows.append(row_index)
    else:
        for row_index, minute in enumerate(minutes, start=1):
            action = (
                minute.get_action_type_display()
                if hasattr(minute, "get_action_type_display")
                else str(minute.action_type).title()
            )
            user_obj = getattr(minute, "user", None)
            if user_obj:
                full_name = " ".join(
                    filter(
                        None,
                        [
                            getattr(user_obj, "honorific", ""),
                            user_obj.first_name,
                            getattr(user_obj, "middle_name", ""),
                            user_obj.last_name,
                        ],
                    )
                ) or user_obj.get_full_name() or user_obj.username
                identity = " · ".join(
                    filter(
                        None,
                        [
                            getattr(user_obj, "personnel_number", "")
                            or getattr(user_obj, "employee_id", ""),
                            getattr(user_obj, "designation", ""),
                        ],
                    )
                )
                user = f"<b>{_safe_text(full_name)}</b>"
                if identity:
                    user += f"<br/>{_safe_text(identity)}"
            else:
                user = "Unknown"
            office = (
                minute.from_office.name
                if getattr(minute, "from_office", None)
                else minute.to_office.name
                if getattr(minute, "to_office", None)
                else "—"
            )
            note = _safe_text(minute.minute_text or "—").replace("\n", "<br/>")
            if minute.action_type != Minute.ActionType.APPROVE and len(note) > 280:
                note = note[:277] + "…"
            data.append(
                [
                    Paragraph(_safe_text(minute.step_number), styles["minute"]),
                    Paragraph(_safe_text(action), styles["minute"]),
                    Paragraph(user, styles["minute"]),
                    Paragraph(_safe_text(office), styles["minute"]),
                    Paragraph(
                        _safe_text(_format_date(minute.timestamp, "d M Y")),
                        styles["minute"],
                    ),
                    Paragraph(note or "&nbsp;", styles["minute"]),
                ]
            )
            if minute.action_type == Minute.ActionType.APPROVE:
                approval_rows.append(row_index)

    table = Table(
        data,
        colWidths=[
            0.35 * inch,
            0.65 * inch,
            1.55 * inch,
            1.45 * inch,
            0.85 * inch,
            1.65 * inch,
        ],
        repeatRows=1,
    )
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        (
            "ROWBACKGROUNDS",
            (0, 1),
            (-1, -1),
            [colors.white, colors.HexColor("#f8fafc")],
        ),
    ]
    for row_index in approval_rows:
        style.append(("BACKGROUND", (0, row_index), (-1, row_index), LIGHT_GREEN))
    table.setStyle(TableStyle(style))
    return table


def _approval_certificate(
    minute,
    correspondence,
    seal,
    seal_png,
    styles,
    snapshot=None,
):
    """Signed certificate page carrying the seal and document reference."""
    approver_user = getattr(minute, "user", None)
    approver = (
        (approver_user.get_full_name() or approver_user.username)
        if approver_user
        else "Approving authority"
    )
    reference = correspondence.reference_number or str(correspondence.id)
    seal_image = _seal_image_flowable(seal_png, size=150)
    signature_png = _signature_png(seal)
    signature_image = _seal_image_flowable(signature_png, size=2.0 * inch)
    if signature_image:
        signature_image.hAlign = "LEFT"
    office_title = getattr(seal, "office_title", "") if seal else ""
    office_name = getattr(seal, "office_name", "") if seal else ""
    level = str(getattr(minute, "approval_level", "") or "").lower()
    approval_kind = (
        "EXECUTIVE APPROVAL"
        if level == Minute.ApprovalLevel.EXECUTIVE
        else "DEPARTMENTAL APPROVAL"
    )
    subject = correspondence.subject or ""
    seal_serial = getattr(seal, "serial_number", "") if seal else ""
    verification_url = _verification_url(seal) if seal else ""
    approved_at_value = getattr(minute, "timestamp", None)
    sealed_at_value = getattr(seal, "sealed_at", None) if seal else None
    if snapshot is not None:
        approver = snapshot.signer_name or approver
        reference = snapshot.document_reference or reference
        office_title = snapshot.signer_office or office_title
        level = snapshot.approval_level or level
        approval_kind = snapshot.approval_kind or approval_kind
        subject = snapshot.subject or subject
        seal_serial = snapshot.seal_serial or seal_serial
        verification_url = snapshot.seal_verification_url or verification_url
        approved_at_value = snapshot.approved_at or approved_at_value
        sealed_at_value = snapshot.sealed_at or sealed_at_value

    statement = Paragraph(
        "This is to certify that the source memo reproduced in the preceding pages "
        "was approved by the authorised officer and sealed with the Nigerian Ports "
        "Authority digital seal. The document reference below identifies the controlled "
        "record for this approved copy.",
        styles["body"],
    )
    certificate_head = Table(
        [[statement, seal_image or ""]],
        colWidths=[CONTENT_WIDTH - 2.2 * inch, 2.2 * inch],
    )
    certificate_head.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    approved_at = _format_date(approved_at_value) or "—"
    sealed_at = _format_date(sealed_at_value) if sealed_at_value else ""
    rows = [
        ("Document reference", reference, False),
        ("Subject", subject or "—", True),
    ]
    if seal:
        rows.append(("Seal serial", seal_serial, False))
        if sealed_at and sealed_at == approved_at:
            rows.append(("Approved & sealed", approved_at, False))
        else:
            rows.append(("Approved at", approved_at, False))
            rows.append(("Sealed at", sealed_at or "—", False))
        rows.append(("Verify", verification_url or "—", False))
    else:
        rows.append(("Approved at", approved_at, False))
    details = Table(
        [
            [
                Paragraph(_safe_text(label), styles["verification_label"]),
                Paragraph(
                    _safe_text(value),
                    styles["verification_value_bold"]
                    if is_bold
                    else styles["verification_value"],
                ),
            ]
            for label, value, is_bold in rows
        ],
        colWidths=[1.55 * inch, CONTENT_WIDTH - 1.55 * inch],
    )
    details.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEBELOW", (0, 0), (-1, -1), 0.25, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )

    certification = Table(
        [
            [
                Paragraph(
                    "<b>Certification.</b> The seal serial and verification address "
                    "above identify this approved copy. Any alteration to the document "
                    "after sealing invalidates the certified copy.",
                    styles["body"],
                )
            ]
        ],
        colWidths=[CONTENT_WIDTH],
    )
    certification.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.4, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )

    signature_rows = [
        [Paragraph("Signed and sealed", styles["subheader"])],
        [
            Paragraph(
                "Authorised signature" if signature_image else "Authorised signatory",
                styles["meta_small"],
            )
        ],
    ]
    if signature_image:
        signature_rows.extend(
            [
                [Spacer(1, 0.04 * inch)],
                [signature_image],
                [Spacer(1, 0.02 * inch)],
                [
                    HRFlowable(
                        width=2.0 * inch,
                        thickness=0.7,
                        color=LINE,
                        hAlign="LEFT",
                        spaceBefore=0,
                        spaceAfter=0,
                    )
                ],
            ]
        )
    else:
        signature_rows.append([Spacer(1, 0.08 * inch)])
    signature_rows.append(
        [Paragraph(f"<b>{_safe_text(approver)}</b>", styles["meta"])]
    )
    if office_title or office_name:
        signature_rows.append(
            [Paragraph(_safe_text(office_title or office_name), styles["meta_small"])]
        )

    # Keep every signature element on one left edge inside a fixed-width block.
    signature_block = Table(signature_rows, colWidths=[2.8 * inch], hAlign="LEFT")
    signature_block.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ]
        )
    )

    return [
        Paragraph(f"{approval_kind} · APPROVED COPY", styles["approval_label"]),
        Paragraph("Approval Certificate", styles["section"]),
        Paragraph("Digital seal and verification", styles["subheader"]),
        certificate_head,
        Spacer(1, 0.2 * inch),
        details,
        Spacer(1, 0.25 * inch),
        certification,
        Spacer(1, 0.3 * inch),
        signature_block,
    ]


def _approved_copy_overlay(width: float, height: float, seal_png: bytes | None) -> bytes:
    """One-page overlay with the approved-copy watermark and optional seal."""
    buffer = BytesIO()
    overlay = canvas.Canvas(buffer, pagesize=(width, height))
    overlay.saveState()
    overlay.setFillColor(colors.Color(0.35, 0.35, 0.35, alpha=0.10))
    overlay.setFont("Helvetica-Bold", max(26, min(width, height) * 0.07))
    overlay.translate(width / 2, height / 2)
    overlay.rotate(45)
    overlay.drawCentredString(0, 0, "APPROVED COPY")
    overlay.restoreState()
    if seal_png:
        seal_size = 84
        margin = 0.5 * inch
        try:
            overlay.drawImage(
                ImageReader(BytesIO(seal_png)),
                width - margin - seal_size,
                margin,
                width=seal_size,
                height=seal_size,
                mask="auto",
                preserveAspectRatio=True,
            )
        except Exception as exc:
            logger.warning("Could not add seal to memo page: %s", exc)
    overlay.save()
    return buffer.getvalue()


def _brand_approved_copy(
    pdf_bytes: bytes,
    seal_png: bytes | None = None,
    seal_page_count: int = 0,
) -> bytes:
    """Stamp APPROVED COPY on every page and the seal on selected pages."""
    reader = PdfReader(BytesIO(pdf_bytes))
    writer = PdfWriter()
    for index, page in enumerate(reader.pages):
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        overlay = _approved_copy_overlay(
            width,
            height,
            seal_png if index < seal_page_count else None,
        )
        added_page = writer.add_page(page)
        added_page.merge_page(PdfReader(BytesIO(overlay)).pages[0], over=True)
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def build_approval_pdf(minute, correspondence, snapshot=None) -> bytes:
    """Build the approved-copy PDF without modifying the source memo.

    Page 1 (and any additional source pages) is the linked DMS memo: HTML is
    rendered from its current content, while a scan-only version keeps its
    original PDF/image pages. The certificate and approval record follow, so
    approval branding never changes the source memo's own layout or references.
    """
    styles = _styles()
    seal = getattr(minute, "seal_applied", None)
    seal_png = _seal_png(seal) if seal else None
    source_document, source_version = _source_memo(correspondence) or (None, None)

    memo_pdf = _render_memo_pdf(source_document, source_version, correspondence)
    memo_page_count = _pdf_page_count(memo_pdf)
    memo_pdf = _brand_approved_copy(
        memo_pdf,
        seal_png=seal_png,
        seal_page_count=memo_page_count,
    )
    back_pdf = _render_back_pdf(
        minute,
        correspondence,
        seal,
        seal_png,
        styles,
        page_offset=memo_page_count,
        snapshot=snapshot,
    )
    back_pdf = _brand_approved_copy(back_pdf)
    return _merge_pdfs(
        [memo_pdf, back_pdf],
        title=f"Approved copy — {correspondence.reference_number or correspondence.id}",
    )

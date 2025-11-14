"""Utilities for validating uploaded files."""

from __future__ import annotations

import logging
import mimetypes
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Iterable

from django.conf import settings
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)

DEFAULT_ALLOWED_EXTENSIONS: tuple[str, ...] = (
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'txt',
    'rtf',
    'csv',
    'jpg',
    'jpeg',
    'png',
)

DEFAULT_ALLOWED_MIME_TYPES: tuple[str, ...] = (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
    'image/jpeg',
    'image/png',
)

MAX_UPLOAD_SIZE_BYTES = getattr(settings, 'MAX_UPLOAD_SIZE_BYTES', 10 * 1024 * 1024)
ALLOWED_EXTENSIONS: Iterable[str] = getattr(
    settings, 'ALLOWED_UPLOAD_EXTENSIONS', DEFAULT_ALLOWED_EXTENSIONS,
)
ALLOWED_MIME_TYPES: Iterable[str] = getattr(
    settings, 'ALLOWED_UPLOAD_MIME_TYPES', DEFAULT_ALLOWED_MIME_TYPES,
)


def _normalize_mime(mime_type: str | None, file_name: str) -> str | None:
    mime = (mime_type or '').lower() or None
    if not mime:
        guessed, _ = mimetypes.guess_type(file_name)
        mime = guessed
    return mime


def _scan_with_clamav(file_bytes: bytes, file_name: str, field_name: str) -> None:
    if not getattr(settings, 'CLAMAV_SCAN_ENABLED', False):
        return

    clamscan_path = getattr(settings, 'CLAMAV_BINARY_PATH', None) or shutil.which('clamscan')
    if not clamscan_path:
        logger.warning('ClamAV scanning enabled but `clamscan` binary not found.')
        return

    with tempfile.NamedTemporaryFile(prefix='ecm-upload-', suffix=Path(file_name).suffix) as tmp:
        tmp.write(file_bytes)
        tmp.flush()
        result = subprocess.run(  # noqa: S603,S607
            [clamscan_path, '--no-summary', tmp.name],
            capture_output=True,
            text=True,
        )
        if result.returncode == 1:
            raise ValidationError({field_name: 'Upload rejected: malware detected.'})
        if result.returncode not in (0, 1):
            logger.error('ClamAV scan failed: %s', result.stderr.strip())
            raise ValidationError({field_name: 'Unable to verify uploaded file.'})


def validate_file_upload(
    *,
    file_name: str,
    mime_type: str | None,
    file_bytes: bytes,
    field_name: str = 'file',
) -> None:
    """Validate extension, mime-type, size and run AV scan on uploaded bytes."""

    if not file_name:
        raise ValidationError({field_name: 'File name is required.'})

    file_size = len(file_bytes)
    if file_size == 0:
        raise ValidationError({field_name: 'Uploaded file is empty.'})

    if file_size > MAX_UPLOAD_SIZE_BYTES:
        raise ValidationError({field_name: f'File exceeds maximum size of {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB.'})

    extension = Path(file_name).suffix.lower().lstrip('.')
    if extension not in ALLOWED_EXTENSIONS:
        raise ValidationError({field_name: f"Files with .{extension or 'unknown'} extension are not allowed."})

    normalized_mime = _normalize_mime(mime_type, file_name)
    if normalized_mime and normalized_mime not in ALLOWED_MIME_TYPES:
        raise ValidationError({field_name: f'Unsupported file type: {normalized_mime}.'})

    _scan_with_clamav(file_bytes, file_name, field_name)

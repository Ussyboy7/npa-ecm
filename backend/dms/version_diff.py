"""Document version text extraction and diff utilities."""

from __future__ import annotations

import difflib
from typing import Any

from django.utils.html import strip_tags


def extract_version_plain_text(version) -> str:
    """Return best-effort plain text for a document version."""
    if version.content_text and version.content_text.strip():
        return version.content_text.strip()
    if version.content_html and version.content_html.strip():
        return " ".join(strip_tags(version.content_html).split())
    if version.ocr_text and version.ocr_text.strip():
        return version.ocr_text.strip()
    return ""


def build_version_diff(left_version, right_version) -> dict[str, Any]:
    """Build a unified diff between two document versions."""
    left_lines = extract_version_plain_text(left_version).splitlines()
    right_lines = extract_version_plain_text(right_version).splitlines()

    if not left_lines and not right_lines:
        return {
            "has_content": False,
            "left_version_number": left_version.version_number,
            "right_version_number": right_version.version_number,
            "added_lines": 0,
            "removed_lines": 0,
            "unified_diff": "",
            "summary": "Neither version has extractable text content.",
        }

    unified = difflib.unified_diff(
        left_lines,
        right_lines,
        fromfile=f"v{left_version.version_number}",
        tofile=f"v{right_version.version_number}",
        lineterm="",
    )
    diff_text = "\n".join(unified)

    added = sum(1 for line in diff_text.splitlines() if line.startswith("+") and not line.startswith("+++"))
    removed = sum(1 for line in diff_text.splitlines() if line.startswith("-") and not line.startswith("---"))

    return {
        "has_content": True,
        "left_version_id": str(left_version.id),
        "right_version_id": str(right_version.id),
        "left_version_number": left_version.version_number,
        "right_version_number": right_version.version_number,
        "added_lines": added,
        "removed_lines": removed,
        "unified_diff": diff_text,
        "summary": f"{added} line(s) added, {removed} line(s) removed",
    }

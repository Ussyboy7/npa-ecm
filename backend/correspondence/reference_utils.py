"""Helpers for keeping a memo's printed reference aligned with its record."""

from __future__ import annotations

import html
import re

# Match the value after ``Ref.:`` while allowing the label/value to be split by
# inline HTML. The value ends at whitespace or the next tag.
_PRINTED_REFERENCE_RE = re.compile(
    r"(?i)(\bRef\.?\s*:\s*(?:</?(?:strong|b|span|em)>|\s|&nbsp;)*)([^\s<]+)"
)


def printed_reference(content_html: str) -> str:
    """Return the reference printed in a memo's HTML, if one is present."""
    match = _PRINTED_REFERENCE_RE.search(content_html or "")
    return html.unescape(match.group(2)).strip() if match else ""


def normalize_printed_reference(content_html: str, reference: str) -> str:
    """Replace the first printed ``Ref.:`` value with the canonical reference."""
    if not content_html or not reference:
        return content_html or ""
    return _PRINTED_REFERENCE_RE.sub(
        lambda match: f"{match.group(1)}{html.escape(reference)}",
        content_html,
        count=1,
    )


def memo_reference_conflict(content_html: str, canonical: str) -> str | None:
    """Return an error message when a memo prints a different reference."""
    printed = printed_reference(content_html)
    canonical = (canonical or "").strip()
    if printed and canonical and printed != canonical:
        return (
            f"The memo prints Ref.: {printed}, but this correspondence's canonical "
            f"reference is {canonical}. Regenerate the memo from the correspondence "
            "reference before linking it."
        )
    return None

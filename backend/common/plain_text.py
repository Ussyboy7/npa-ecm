"""Plain text for search, snippets and diffs.

Rich-text memos store their layout as non-breaking spaces (U+00A0) so the
editor keeps the spacing the author typed, and the same HTML carries `&nbsp;`
/ `&amp;` entities. Text extracted for search, OCR, summaries or diffing must
be ordinary prose: tags removed, entities decoded and every run of whitespace
(includes U+00A0) collapsed to a single space, so words are never glued
together and no `&nbsp;` reaches a result list.
"""

from __future__ import annotations

import html as html_module
import re
from typing import Optional

from django.utils.html import strip_tags

# Print-ready documents carry a <style> block; strip_tags keeps its CSS body, so
# it would be indexed as prose. Comments go too.
_DROP_BLOCKS = re.compile(
    r"<(style|script|head|noscript)\b[^>]*>.*?</\1\s*>",
    re.IGNORECASE | re.DOTALL,
)
_HTML_COMMENTS = re.compile(r"<!--.*?-->", re.DOTALL)

# strip_tags drops block boundaries, so adjacent blocks would read as one word
# ("MemorandumTo:", "AUTHORITYINFORMATION"). A block break is a word break.
_BLOCK_BREAK = re.compile(
    r"</(?:p|div|li|ul|ol|dl|dt|dd|tr|td|th|h[1-6]|blockquote|table|thead|tbody|tfoot|section|header|footer|article)\s*>"
    r"|<br\s*/?>"
    r"|<hr\s*/?>"
    r"|<(?:p|div|li|ul|ol|tr|h[1-6]|blockquote|table|section|header|footer|article)\b[^>]*>",
    re.IGNORECASE,
)


def to_plain_text(value: Optional[str]) -> str:
    """Return single-line plain text for an HTML or plain-text value."""
    if not value:
        return ""
    text = _DROP_BLOCKS.sub(" ", value)
    text = _HTML_COMMENTS.sub(" ", text)
    text = _BLOCK_BREAK.sub(" ", text)
    text = strip_tags(text)
    # strip_tags leaves entities alone; unmapped, "&nbsp;" becomes the word
    # "nbsp" in the full-text index.
    text = html_module.unescape(text)
    return " ".join(text.split())


def normalize_text_spacing(value: Optional[str]) -> str:
    """Collapse non-breaking/space runs per line, preserving line structure."""
    if not value:
        return ""
    lines = (line for line in html_module.unescape(value).splitlines())
    return "\n".join(" ".join(line.split()) for line in lines)

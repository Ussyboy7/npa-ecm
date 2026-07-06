"""Semantic / vector-style search utilities (embedding re-rank without external ML deps)."""

from __future__ import annotations

import math
import re
from hashlib import sha256
from typing import Iterable

SYNONYM_GROUPS: tuple[tuple[str, ...], ...] = (
    ("memo", "memorandum", "minute", "note"),
    ("letter", "correspondence", "dispatch", "mail"),
    ("contract", "agreement", "mou", "memorandum"),
    ("invoice", "payment", "billing", "receipt"),
    ("policy", "procedure", "guideline", "circular"),
    ("report", "analysis", "brief", "summary"),
    ("approval", "endorsement", "sign-off", "clearance"),
    ("port", "terminal", "jetty", "harbour"),
)

EMBEDDING_DIMS = 128


def expand_query(query: str) -> str:
    """Expand query with domain synonym groups."""
    tokens = set(re.findall(r"\w+", query.lower()))
    extras: list[str] = []
    for group in SYNONYM_GROUPS:
        if tokens.intersection(group):
            extras.extend(term for term in group if term not in tokens)
    if not extras:
        return query
    return f"{query} {' '.join(sorted(set(extras)))}"


def tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", (text or "").lower())


def embed_text(text: str, dims: int = EMBEDDING_DIMS) -> list[float]:
    """Deterministic bag-of-words style embedding for cosine similarity."""
    vector = [0.0] * dims
    for token in tokenize(text):
        digest = sha256(token.encode("utf-8")).digest()
        for index in range(dims):
            vector[index] += digest[index % len(digest)] / 255.0
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def cosine_similarity(left: Iterable[float], right: Iterable[float]) -> float:
    return sum(a * b for a, b in zip(left, right, strict=False))


def document_text_blob(document) -> str:
    parts = [
        document.title or "",
        document.description or "",
        document.reference_number or "",
        " ".join(document.tags or []),
    ]
    latest = None
    versions_manager = getattr(document, "versions", None)
    if versions_manager is not None and hasattr(versions_manager, "order_by"):
        latest = versions_manager.order_by("-version_number").first()
    if latest:
        parts.extend(
            [
                latest.file_name or "",
                latest.content_text or "",
                latest.ocr_text or "",
            ]
        )
    return " ".join(part for part in parts if part).strip()


def rerank_documents(query: str, documents: list, *, limit: int = 50) -> list:
    """Re-rank document queryset results by semantic similarity to query."""
    if not query or not documents:
        return documents[:limit]

    expanded = expand_query(query)
    query_vector = embed_text(expanded)
    scored: list[tuple[float, object]] = []

    for document in documents:
        blob = document_text_blob(document)
        if not blob:
            fts_rank = float(getattr(document, "_semantic_fts_rank", 0.0))
            scored.append((fts_rank * 0.1, document))
            continue
        similarity = cosine_similarity(query_vector, embed_text(blob))
        fts_rank = float(getattr(document, "_semantic_fts_rank", 0.0))
        combined = (similarity * 0.75) + (fts_rank * 0.25)
        document._semantic_score = combined  # noqa: SLF001
        scored.append((combined, document))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [document for _, document in scored[:limit]]

"""Search services for full-text search and advanced filtering."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db.models import Q, QuerySet

from correspondence.models import Correspondence
from dms.models import Document

logger = logging.getLogger(__name__)


class SearchService:
    """Service for advanced document and correspondence search."""

    @staticmethod
    def build_search_vector() -> SearchVector:
        """
        Build search vector for documents.

        Returns:
            SearchVector combining multiple fields with weights
        """
        return (
            SearchVector("title", weight="A", config="english")
            + SearchVector("description", weight="B", config="english")
            + SearchVector("reference_number", weight="A", config="english")
            + SearchVector("tags", weight="C", config="english")
        )

    @staticmethod
    def full_text_search_documents(
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Perform full-text search on documents.

        Args:
            query: Search query text
            filters: Optional filters (document_type, status, author_id, etc.)
            limit: Maximum number of results
            offset: Offset for pagination

        Returns:
            Dictionary with results and metadata
        """
        filters = filters or {}

        # Build base queryset
        queryset = Document.objects.filter(is_deleted=False)

        # Apply filters
        if filters.get("document_type"):
            queryset = queryset.filter(document_type=filters["document_type"])

        if filters.get("status"):
            queryset = queryset.filter(status=filters["status"])

        if filters.get("sensitivity"):
            queryset = queryset.filter(sensitivity=filters["sensitivity"])

        if filters.get("author_id"):
            queryset = queryset.filter(author_id=filters["author_id"])

        if filters.get("division_id"):
            queryset = queryset.filter(division_id=filters["division_id"])

        if filters.get("department_id"):
            queryset = queryset.filter(department_id=filters["department_id"])

        if filters.get("date_from"):
            queryset = queryset.filter(created_at__gte=filters["date_from"])

        if filters.get("date_to"):
            queryset = queryset.filter(created_at__lte=filters["date_to"])

        if filters.get("tags"):
            tags = filters["tags"] if isinstance(filters["tags"], list) else [filters["tags"]]
            queryset = queryset.filter(tags__overlap=tags)

        # Perform full-text search
        if query:
            search_vector = SearchService.build_search_vector()
            search_query = SearchQuery(query, config="english")

            queryset = queryset.annotate(
                search=search_vector,
                rank=SearchRank(search_vector, search_query),
            ).filter(search=search_query).order_by("-rank", "-created_at")
        else:
            # No query, just apply filters and sort by date
            queryset = queryset.order_by("-created_at")

        # Get total count before pagination
        total_count = queryset.count()

        # Apply pagination
        results = list(queryset[offset : offset + limit])

        return {
            "results": results,
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total_count,
        }

    @staticmethod
    def search_within_documents(
        query: str,
        document_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Search within specific documents (e.g., OCR text, content).

        Args:
            query: Search query
            document_ids: Optional list of document IDs to search within

        Returns:
            Dictionary with matching documents and snippets
        """
        from dms.models import DocumentVersion

        queryset = DocumentVersion.objects.filter(
            document__is_deleted=False,
        )

        if document_ids:
            queryset = queryset.filter(document_id__in=document_ids)

        # Search in OCR text and content text
        search_query = SearchQuery(query, config="english")
        search_vector = (
            SearchVector("ocr_text", weight="A", config="english")
            + SearchVector("content_text", weight="B", config="english")
        )

        queryset = queryset.annotate(
            search=search_vector,
            rank=SearchRank(search_vector, search_query),
        ).filter(search=search_query).order_by("-rank")

        results = []
        for version in queryset:
            # Extract snippet (first 200 chars of matching text)
            text = version.ocr_text or version.content_text or ""
            snippet = text[:200] + "..." if len(text) > 200 else text

            results.append({
                "document": version.document,
                "version": version,
                "snippet": snippet,
                "rank": getattr(version, "rank", 0),
            })

        return {
            "results": results,
            "total_count": len(results),
        }

    @staticmethod
    def search_correspondence(
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Perform full-text search on correspondence.

        Args:
            query: Search query text
            filters: Optional filters
            limit: Maximum number of results
            offset: Offset for pagination

        Returns:
            Dictionary with results and metadata
        """
        filters = filters or {}

        queryset = Correspondence.objects.all()

        # Apply filters
        if filters.get("status"):
            queryset = queryset.filter(status=filters["status"])

        if filters.get("priority"):
            queryset = queryset.filter(priority=filters["priority"])

        if filters.get("division_id"):
            queryset = queryset.filter(division_id=filters["division_id"])

        # Full-text search
        if query:
            search_vector = (
                SearchVector("subject", weight="A", config="english")
                + SearchVector("reference_number", weight="A", config="english")
                + SearchVector("body", weight="B", config="english")
            )
            search_query = SearchQuery(query, config="english")

            queryset = queryset.annotate(
                search=search_vector,
                rank=SearchRank(search_vector, search_query),
            ).filter(search=search_query).order_by("-rank", "-created_at")
        else:
            queryset = queryset.order_by("-created_at")

        total_count = queryset.count()
        results = list(queryset[offset : offset + limit])

        return {
            "results": results,
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total_count,
        }

    @staticmethod
    def get_search_suggestions(query: str, limit: int = 10) -> List[str]:
        """
        Get search suggestions based on query and user history.

        Args:
            query: Partial query text
            limit: Maximum number of suggestions

        Returns:
            List of suggested search terms
        """
        from search.models import SearchHistory

        # Get suggestions from search history
        suggestions = (
            SearchHistory.objects.filter(query__icontains=query)
            .values_list("query", flat=True)
            .distinct()[:limit]
        )

        return list(suggestions)


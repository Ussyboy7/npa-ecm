"""Search services for full-text search and advanced filtering."""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db.models import Q, QuerySet

from common.constants import (
    SENSITIVITY_HIGH_CONFIDENTIAL_GRADES,
    SENSITIVITY_HIGH_RESTRICTED_GRADES,
)
from correspondence.models import Correspondence, Case
from dms.models import Document

logger = logging.getLogger(__name__)


class SearchService:
    """Service for advanced document and correspondence search."""

    @staticmethod
    def _apply_visibility_filters(queryset: QuerySet, user: Any) -> QuerySet:
        """
        Apply visibility filters based on user permissions.
        
        Args:
            queryset: Document queryset to filter
            user: User to check permissions for
            
        Returns:
            Filtered queryset
        """
        if not user or not user.is_authenticated or user.is_superuser:
            return queryset.distinct()

        visibility_filter = Q(author=user) | Q(workspaces__members=user) | Q(permissions__users=user)

        if user.division_id:
            visibility_filter |= Q(permissions__divisions=user.division_id)
        if user.department_id:
            visibility_filter |= Q(permissions__departments=user.department_id)
        if user.grade_level:
            visibility_filter |= Q(permissions__grade_levels__contains=[user.grade_level])

        visibility_filter |= Q(sensitivity__in=[Document.Sensitivity.PUBLIC, Document.Sensitivity.INTERNAL])

        if user.grade_level in SENSITIVITY_HIGH_CONFIDENTIAL_GRADES:
            visibility_filter |= Q(sensitivity=Document.Sensitivity.CONFIDENTIAL)
        if user.grade_level in SENSITIVITY_HIGH_RESTRICTED_GRADES:
            visibility_filter |= Q(sensitivity=Document.Sensitivity.RESTRICTED)

        # Published documents with public/internal sensitivity are generally accessible
        visibility_filter |= Q(
            status=Document.DocumentStatus.PUBLISHED,
            sensitivity__in=[Document.Sensitivity.PUBLIC, Document.Sensitivity.INTERNAL],
        )

        return queryset.filter(visibility_filter).distinct()

    @staticmethod
    def _apply_correspondence_visibility_filters(queryset: QuerySet, user: Any) -> QuerySet:
        """
        Apply visibility filters for correspondence search based on user permissions.
        
        Users can see correspondence if:
        - They are a superuser
        - They created the correspondence
        - They are a member of the owning office
        - They are in the distribution list
        - They have been assigned as a user in the correspondence flow
        
        Args:
            queryset: Correspondence queryset to filter
            user: User to check permissions for
            
        Returns:
            Filtered queryset
        """
        if not user or not user.is_authenticated:
            return queryset.none()
        
        if user.is_superuser:
            return queryset.distinct()
        
        from correspondence.models import CorrespondenceDistribution, Minute
        from organization.models import OfficeMembership
        
        visibility_filter = Q(created_by=user)
        
        # Get user's office memberships
        user_office_ids = OfficeMembership.objects.filter(
            user=user,
            is_active=True
        ).values_list('office_id', flat=True)
        
        # User can see correspondence in their offices
        if user_office_ids:
            visibility_filter |= Q(owning_office_id__in=user_office_ids)
            visibility_filter |= Q(current_office_id__in=user_office_ids)
        
        # User can see correspondence where they are in distribution
        user_distributions = CorrespondenceDistribution.objects.filter(
            user=user
        ).values_list('correspondence_id', flat=True).distinct()
        
        if user_distributions:
            visibility_filter |= Q(id__in=user_distributions)
        
        # User can see correspondence where they have been added as to_user in minutes
        user_minute_correspondence = Minute.objects.filter(
            to_user=user
        ).values_list('correspondence_id', flat=True).distinct()
        
        if user_minute_correspondence:
            visibility_filter |= Q(id__in=user_minute_correspondence)
        
        # Filter out deleted correspondence
        visibility_filter &= Q(is_deleted=False)
        
        return queryset.filter(visibility_filter).distinct()

    @staticmethod
    def _apply_case_visibility_filters(queryset: QuerySet, user: Any) -> QuerySet:
        """
        Apply visibility filters for case search based on user permissions.
        
        Users can see cases if:
        - They are a superuser
        - They created the case
        - They are assigned to the case
        - They are a member of the owning division/department
        
        Args:
            queryset: Case queryset to filter
            user: User to check permissions for
            
        Returns:
            Filtered queryset
        """
        if not user or not user.is_authenticated:
            return queryset.none()
        
        if user.is_superuser:
            return queryset.distinct()
        
        from correspondence.models import Case
        from organization.models import OfficeMembership
        
        visibility_filter = Q(created_by=user) | Q(assigned_to=user)
        
        # User can see cases in their division
        if user.division_id:
            visibility_filter |= Q(division_id=user.division_id)
        
        # User can see cases in their department
        if user.department_id:
            visibility_filter |= Q(department_id=user.department_id)
        
        # User can see cases in offices they're members of
        user_office_ids = OfficeMembership.objects.filter(
            user=user,
            is_active=True
        ).values_list('office_id', flat=True)
        
        if user_office_ids:
            visibility_filter |= Q(owning_office_id__in=user_office_ids)
        
        return queryset.filter(visibility_filter).distinct()

    @staticmethod
    def extract_snippet(text: str, query: str, context: int = 100, max_length: int = 200) -> str:
        """
        Extract a snippet of text around matching query terms.
        
        Args:
            text: Full text to search in
            query: Search query to highlight
            context: Number of characters before/after match
            max_length: Maximum snippet length
            
        Returns:
            Snippet with highlighted terms
        """
        if not text or not query:
            # Return first part of text if no query
            return text[:max_length] + "..." if len(text) > max_length else text
        
        # Clean query for regex (escape special chars)
        query_clean = re.escape(query.strip())
        
        # Find first match (case-insensitive)
        pattern = re.compile(query_clean, re.IGNORECASE)
        match = pattern.search(text)
        
        if not match:
            # No match found, return beginning
            return text[:max_length] + "..." if len(text) > max_length else text
        
        # Extract context around match
        start = max(0, match.start() - context)
        end = min(len(text), match.end() + context)
        
        snippet = text[start:end]
        
        # Add ellipsis if needed
        if start > 0:
            snippet = "..." + snippet
        if end < len(text):
            snippet = snippet + "..."
        
        # Truncate if too long
        if len(snippet) > max_length:
            # Try to center on match
            match_pos = snippet.lower().find(query.lower())
            if match_pos >= 0:
                snippet_start = max(0, match_pos - max_length // 2)
                snippet = snippet[snippet_start:snippet_start + max_length]
                if snippet_start > 0:
                    snippet = "..." + snippet
                if snippet_start + max_length < len(text):
                    snippet = snippet + "..."
            else:
                snippet = snippet[:max_length] + "..."
        
        return snippet

    @staticmethod
    def highlight_terms(text: str, query: str) -> str:
        """
        Highlight search terms in text (simple version - returns text as-is for now).
        Frontend can handle highlighting.
        
        Args:
            text: Text to highlight in
            query: Search query terms
            
        Returns:
            Text with highlighted terms (HTML or marked text)
        """
        # For now, return as-is. Frontend can handle highlighting.
        # Could implement HTML highlighting here if needed.
        return text

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
        user: Optional[Any] = None,
        search_mode: str = "keyword",
    ) -> Dict[str, Any]:
        """
        Perform full-text search on documents.

        Args:
            query: Search query text
            filters: Optional filters (document_type, status, author_id, etc.)
            limit: Maximum number of results
            offset: Offset for pagination
            user: User to apply visibility filters for (optional)

        Returns:
            Dictionary with results and metadata
        """
        filters = filters or {}

        # Build base queryset
        queryset = Document.objects.filter(is_deleted=False)
        
        # Apply visibility filters if user is provided
        if user and user.is_authenticated:
            queryset = SearchService._apply_visibility_filters(queryset, user)

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
            from dms.models import DocumentVersion
            from django.db.models import Max
            
            search_query = SearchQuery(query, config="english")
            
            # Build base search vector for document fields
            base_search_vector = SearchService.build_search_vector()
            
            # Search in document fields first
            queryset = queryset.annotate(
                search=base_search_vector,
                rank=SearchRank(base_search_vector, search_query),
            )
            
            # Also find documents whose versions match the query
            # Use full-text search on version content for better performance
            version_matching_docs = DocumentVersion.objects.filter(
                document__is_deleted=False
            ).annotate(
                version_search=SearchVector("ocr_text", weight="A", config="english") +
                               SearchVector("content_text", weight="B", config="english"),
                version_rank=SearchRank(
                    SearchVector("ocr_text", weight="A", config="english") +
                    SearchVector("content_text", weight="B", config="english"),
                    search_query
                )
            ).filter(
                version_search=search_query
            ).values_list('document_id', flat=True).distinct()
            
            # Combine: documents matching in base fields OR in version content
            document_field_match = Q(search=search_query)
            version_content_match = Q(id__in=version_matching_docs)
            
            # Use Q to combine both conditions
            combined_filter = document_field_match | version_content_match
            queryset = queryset.filter(combined_filter).distinct()
            
            # Adjust ranking: documents matching in base fields get their rank,
            # documents only matching in versions get a lower rank
            from django.db.models import Case, When, FloatField, F
            queryset = queryset.annotate(
                final_rank=Case(
                    When(search=search_query, then=F('rank')),
                    default=0.5,  # Lower rank for version-only matches
                    output_field=FloatField()
                )
            ).order_by("-final_rank", "-created_at")
        else:
            # No query, just apply filters and sort by date
            queryset = queryset.order_by("-created_at")

        if query and search_mode == "semantic":
            from search.semantic_service import rerank_documents

            pool_limit = min(max(queryset.count(), limit + offset), 200)
            pool = list(queryset[:pool_limit])
            for document in pool:
                document._semantic_fts_rank = float(
                    getattr(document, "final_rank", 0) or getattr(document, "rank", 0) or 0
                )
            ranked = rerank_documents(query, pool, limit=pool_limit)
            total_count = len(ranked)
            results = ranked[offset : offset + limit]
            if query:
                enriched_results = []
                for doc in results:
                    snippet = SearchService.extract_snippet(
                        doc.description or doc.title or "",
                        query,
                    )
                    doc._search_snippet = snippet
                    doc._match_field = "semantic"
                    doc._matching_version_id = None
                    enriched_results.append(doc)
                results = enriched_results
            return {
                "results": results,
                "total_count": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total_count,
                "search_mode": "semantic",
            }

        # Get total count before pagination
        total_count = queryset.count()

        # Apply pagination
        results = list(queryset[offset : offset + limit])
        
        # Add snippets and match information to results
        if query:
            from dms.models import DocumentVersion
            enriched_results = []
            for doc in results:
                # Try to find matching version content
                matching_version = None
                snippet = None
                match_field = None
                
                # Check if document fields matched
                if hasattr(doc, 'search') and doc.search:
                    # Document fields matched
                    snippet = SearchService.extract_snippet(
                        doc.description or doc.title or "",
                        query
                    )
                    match_field = "document"
                
                # Also check version content
                if not snippet or not matching_version:
                    versions = DocumentVersion.objects.filter(
                        document=doc
                    ).order_by('-version_number')[:1]
                    
                    for version in versions:
                        # Check OCR text
                        if version.ocr_text and query.lower() in version.ocr_text.lower():
                            snippet = SearchService.extract_snippet(version.ocr_text, query)
                            match_field = "ocr_text"
                            matching_version = version
                            break
                        # Check content text
                        elif version.content_text and query.lower() in version.content_text.lower():
                            snippet = SearchService.extract_snippet(version.content_text, query)
                            match_field = "content_text"
                            matching_version = version
                            break
                
                # Add snippet and match info to result
                doc._search_snippet = snippet
                doc._match_field = match_field
                doc._matching_version_id = str(matching_version.id) if matching_version else None
                
                enriched_results.append(doc)
            
            results = enriched_results

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
        user: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Perform full-text search on correspondence.

        Args:
            query: Search query text
            filters: Optional filters (status, priority, source, direction, division_id, department_id, office_id, tags, date_from, date_to)
            limit: Maximum number of results
            offset: Offset for pagination
            user: User to apply visibility filters for (optional)

        Returns:
            Dictionary with results and metadata
        """
        filters = filters or {}

        # Build base queryset
        queryset = Correspondence.objects.all()
        
        # Apply visibility filters based on user permissions
        if user and user.is_authenticated:
            queryset = SearchService._apply_correspondence_visibility_filters(queryset, user)

        # Apply filters
        if filters.get("status"):
            queryset = queryset.filter(status=filters["status"])

        if filters.get("priority"):
            queryset = queryset.filter(priority=filters["priority"])

        if filters.get("source"):
            queryset = queryset.filter(source=filters["source"])

        if filters.get("direction"):
            queryset = queryset.filter(direction=filters["direction"])

        if filters.get("division_id"):
            queryset = queryset.filter(division_id=filters["division_id"])

        if filters.get("department_id"):
            queryset = queryset.filter(department_id=filters["department_id"])

        if filters.get("office_id"):
            # Search in both owning_office and current_office
            queryset = queryset.filter(
                Q(owning_office_id=filters["office_id"]) |
                Q(current_office_id=filters["office_id"])
            )

        if filters.get("tags"):
            tags = filters["tags"] if isinstance(filters["tags"], list) else [filters["tags"]]
            queryset = queryset.filter(tags__overlap=tags)

        if filters.get("date_from"):
            queryset = queryset.filter(
                Q(received_date__gte=filters["date_from"]) |
                Q(created_at__date__gte=filters["date_from"])
            )

        if filters.get("date_to"):
            queryset = queryset.filter(
                Q(received_date__lte=filters["date_to"]) |
                Q(created_at__date__lte=filters["date_to"])
            )

        # Full-text search
        if query:
            search_vector = (
                SearchVector("subject", weight="A", config="english")
                + SearchVector("reference_number", weight="A", config="english")
                + SearchVector("body_html", weight="B", config="english")
                + SearchVector("treatment_response", weight="B", config="english")
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
        
        # Add snippets to results
        if query:
            enriched_results = []
            for corr in results:
                # Extract snippet from treatment_response/body_html/subject
                text_to_search = corr.treatment_response or corr.body_html or corr.subject or ""
                # Remove HTML tags for snippet extraction
                import re
                text_clean = re.sub(r'<[^>]+>', '', text_to_search)
                snippet = SearchService.extract_snippet(text_clean, query)
                
                corr._search_snippet = snippet
                corr._match_field = "body" if corr.body_html else ("treatment_response" if corr.treatment_response else "subject")
                
                enriched_results.append(corr)
            
            results = enriched_results

        return {
            "results": results,
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total_count,
        }

    @staticmethod
    def search_cases(
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        offset: int = 0,
        user: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Perform full-text search on cases.

        Args:
            query: Search query text
            filters: Optional filters (status, case_type, priority, division_id, department_id, assigned_to_id, date_from, date_to)
            limit: Maximum number of results
            offset: Offset for pagination
            user: User to apply visibility filters for (optional)

        Returns:
            Dictionary with results and metadata
        """
        filters = filters or {}

        # Build base queryset
        queryset = Case.objects.filter(is_deleted=False)
        
        # Apply visibility filters based on user permissions
        if user and user.is_authenticated:
            queryset = SearchService._apply_case_visibility_filters(queryset, user)

        # Apply filters
        if filters.get("status"):
            statuses = filters["status"] if isinstance(filters["status"], list) else [filters["status"]]
            queryset = queryset.filter(status__in=statuses)

        if filters.get("case_type"):
            case_types = filters["case_type"] if isinstance(filters["case_type"], list) else [filters["case_type"]]
            queryset = queryset.filter(case_type__in=case_types)

        if filters.get("priority"):
            priorities = filters["priority"] if isinstance(filters["priority"], list) else [filters["priority"]]
            queryset = queryset.filter(priority__in=priorities)

        if filters.get("division_id"):
            queryset = queryset.filter(division_id=filters["division_id"])

        if filters.get("department_id"):
            queryset = queryset.filter(department_id=filters["department_id"])

        if filters.get("owning_office_id"):
            queryset = queryset.filter(owning_office_id=filters["owning_office_id"])

        if filters.get("assigned_to_id"):
            queryset = queryset.filter(assigned_to_id=filters["assigned_to_id"])

        if filters.get("date_from"):
            queryset = queryset.filter(opened_at__gte=filters["date_from"])

        if filters.get("date_to"):
            queryset = queryset.filter(opened_at__lte=filters["date_to"])

        if filters.get("tags"):
            tags = filters["tags"] if isinstance(filters["tags"], list) else [filters["tags"]]
            queryset = queryset.filter(tags__overlap=tags)

        # Full-text search
        if query:
            search_vector = (
                SearchVector("case_number", weight="A", config="english")
                + SearchVector("title", weight="A", config="english")
                + SearchVector("description", weight="B", config="english")
            )
            search_query = SearchQuery(query, config="english")

            queryset = queryset.annotate(
                search=search_vector,
                rank=SearchRank(search_vector, search_query),
            ).filter(search=search_query).order_by("-rank", "-opened_at")
        else:
            queryset = queryset.order_by("-opened_at")

        total_count = queryset.count()
        results = list(queryset[offset : offset + limit])
        
        # Add snippets to results
        if query:
            enriched_results = []
            for case in results:
                # Extract snippet from description or title
                text_to_search = case.description or case.title or ""
                snippet = SearchService.extract_snippet(text_to_search, query)
                
                case._search_snippet = snippet
                case._match_field = "case"
                enriched_results.append(case)
            
            results = enriched_results

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

    @staticmethod
    def find_related_items(
        *,
        record_type: str,
        record_id: str,
        user: Any,
        limit: int = 8,
    ) -> dict[str, Any]:
        """Find related records and potential duplicates for search v2."""
        from uuid import UUID

        try:
            record_uuid = UUID(str(record_id))
        except (TypeError, ValueError):
            return {"related": [], "duplicates": [], "total_count": 0}

        related: list[dict[str, Any]] = []
        duplicates: list[dict[str, Any]] = []

        if record_type == "document":
            doc_qs = SearchService._apply_visibility_filters(
                Document.objects.filter(is_deleted=False), user
            )
            try:
                document = doc_qs.get(id=record_uuid)
            except Document.DoesNotExist:
                return {"related": [], "duplicates": [], "total_count": 0}

            tag_list = list(document.tags or [])
            related_qs = doc_qs.exclude(id=document.id)
            if tag_list:
                related_qs = related_qs.filter(tags__overlap=tag_list)
            elif document.author_id:
                related_qs = related_qs.filter(author_id=document.author_id)
            else:
                words = [w for w in (document.title or "").split() if len(w) > 3][:3]
                if words:
                    q = Q()
                    for word in words:
                        q |= Q(title__icontains=word)
                    related_qs = related_qs.filter(q)

            for item in related_qs.order_by("-updated_at")[:limit]:
                related.append(
                    {
                        "type": "document",
                        "id": str(item.id),
                        "title": item.title,
                        "reference": item.reference_number,
                        "reason": "shared tags" if tag_list else "same author or title",
                    }
                )

            dup_qs = doc_qs.exclude(id=document.id).filter(title__iexact=document.title)
            for item in dup_qs[:5]:
                duplicates.append(
                    {
                        "type": "document",
                        "id": str(item.id),
                        "title": item.title,
                        "reference": item.reference_number,
                        "reason": "identical title",
                    }
                )

        elif record_type == "correspondence":
            corr_qs = SearchService._apply_correspondence_visibility_filters(
                Correspondence.objects.filter(is_deleted=False), user
            )
            try:
                correspondence = corr_qs.get(id=record_uuid)
            except Correspondence.DoesNotExist:
                return {"related": [], "duplicates": [], "total_count": 0}

            related_qs = corr_qs.exclude(id=correspondence.id)
            if correspondence.sender_organization:
                related_qs = related_qs.filter(
                    sender_organization__iexact=correspondence.sender_organization
                )
            elif correspondence.division_id:
                related_qs = related_qs.filter(division_id=correspondence.division_id)
            else:
                words = [w for w in (correspondence.subject or "").split() if len(w) > 3][:3]
                if words:
                    q = Q()
                    for word in words:
                        q |= Q(subject__icontains=word)
                    related_qs = related_qs.filter(q)

            for item in related_qs.order_by("-updated_at")[:limit]:
                related.append(
                    {
                        "type": "correspondence",
                        "id": str(item.id),
                        "title": item.subject,
                        "reference": item.reference_number,
                        "reason": (
                            "same sender organization"
                            if correspondence.sender_organization
                            else "same division or subject"
                        ),
                    }
                )

            if correspondence.subject:
                dup_qs = corr_qs.exclude(id=correspondence.id).filter(
                    subject__iexact=correspondence.subject
                )
                if correspondence.sender_organization:
                    dup_qs = dup_qs.filter(
                        sender_organization__iexact=correspondence.sender_organization
                    )
                for item in dup_qs[:5]:
                    duplicates.append(
                        {
                            "type": "correspondence",
                            "id": str(item.id),
                            "title": item.subject,
                            "reference": item.reference_number,
                            "reason": "matching subject"
                            + (
                                " and sender"
                                if correspondence.sender_organization
                                else ""
                            ),
                        }
                    )

        elif record_type == "case":
            case_qs = Case.objects.filter(is_deleted=False)
            try:
                case = case_qs.get(id=record_uuid)
            except Case.DoesNotExist:
                return {"related": [], "duplicates": [], "total_count": 0}

            related_qs = case_qs.exclude(id=case.id)
            if case.division_id:
                related_qs = related_qs.filter(division_id=case.division_id)
            for item in related_qs.order_by("-opened_at")[:limit]:
                related.append(
                    {
                        "type": "case",
                        "id": str(item.id),
                        "title": item.title,
                        "reference": item.case_number,
                        "reason": "same division",
                    }
                )

        return {
            "related": related,
            "duplicates": duplicates,
            "total_count": len(related) + len(duplicates),
        }

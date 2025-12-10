"""Views for search module."""

from __future__ import annotations

from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from search.models import SavedSearch, SearchHistory
from search.serializers import (
    SavedSearchSerializer,
    SearchHistorySerializer,
    SearchRequestSerializer,
    SearchSuggestionRequestSerializer,
)
from search.services import SearchService


class SearchViewSet(viewsets.ViewSet):
    """ViewSet for search operations."""

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def search(self, request):
        """
        Perform advanced search.

        Request body:
        {
            "query": "search text",
            "filters": {
                "document_type": "memo",
                "status": "published",
                "author_id": "uuid",
                "date_from": "2025-01-01",
                "date_to": "2025-12-31"
            },
            "limit": 50,
            "offset": 0,
            "search_type": "documents"
        }
        """
        serializer = SearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        query = serializer.validated_data.get("query", "")
        filters = serializer.validated_data.get("filters", {})
        limit = serializer.validated_data.get("limit", 50)
        offset = serializer.validated_data.get("offset", 0)
        search_type = serializer.validated_data.get("search_type", "documents")

        # Perform search
        if search_type == "documents":
            results = SearchService.full_text_search_documents(
                query, filters, limit, offset
            )
            # Serialize documents
            from dms.serializers import DocumentSerializer

            results["results"] = DocumentSerializer(results["results"], many=True).data
        elif search_type == "correspondence":
            results = SearchService.search_correspondence(query, filters, limit, offset)
            # Serialize correspondence
            from correspondence.serializers import CorrespondenceSerializer

            results["results"] = CorrespondenceSerializer(
                results["results"], many=True
            ).data
        else:
            # Search both
            doc_results = SearchService.full_text_search_documents(
                query, filters, limit, offset
            )
            corr_results = SearchService.search_correspondence(
                query, filters, limit, offset
            )

            from correspondence.serializers import CorrespondenceSerializer
            from dms.serializers import DocumentSerializer

            results = {
                "documents": {
                    "results": DocumentSerializer(doc_results["results"], many=True).data,
                    "total_count": doc_results["total_count"],
                },
                "correspondence": {
                    "results": CorrespondenceSerializer(
                        corr_results["results"], many=True
                    ).data,
                    "total_count": corr_results["total_count"],
                },
                "total_count": doc_results["total_count"] + corr_results["total_count"],
            }

        # Save to search history
        if query:
            SearchHistory.objects.create(
                user=request.user,
                query=query,
                result_count=results.get("total_count", 0),
                filters=filters,
            )

        return Response(results)

    @action(detail=False, methods=["post"])
    def search_within(self, request):
        """
        Search within specific documents (OCR text, content).

        Request body:
        {
            "query": "search text",
            "document_ids": ["uuid1", "uuid2"]
        }
        """
        query = request.data.get("query", "")
        document_ids = request.data.get("document_ids", [])

        if not query:
            return Response(
                {"error": "query is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = SearchService.search_within_documents(query, document_ids)

        # Serialize results
        from dms.serializers import DocumentSerializer, DocumentVersionSerializer

        serialized_results = []
        for item in results["results"]:
            serialized_results.append({
                "document": DocumentSerializer(item["document"]).data,
                "version": DocumentVersionSerializer(item["version"]).data,
                "snippet": item["snippet"],
                "rank": item["rank"],
            })

        return Response({
            "results": serialized_results,
            "total_count": results["total_count"],
        })

    @action(detail=False, methods=["post"])
    def suggestions(self, request):
        """
        Get search suggestions.

        Request body:
        {
            "query": "partial query",
            "limit": 10
        }
        """
        serializer = SearchSuggestionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        query = serializer.validated_data["query"]
        limit = serializer.validated_data.get("limit", 10)

        suggestions = SearchService.get_search_suggestions(query, limit)

        return Response({"suggestions": suggestions})


class SavedSearchViewSet(viewsets.ModelViewSet):
    """ViewSet for managing saved searches."""

    queryset = SavedSearch.objects.all()
    serializer_class = SavedSearchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter searches by current user unless shared."""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(
                Q(user=self.request.user) | Q(is_shared=True)
            )
        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        """Set the creator when creating a saved search."""
        serializer.save(user=self.request.user)


class SearchHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing search history."""

    queryset = SearchHistory.objects.all()
    serializer_class = SearchHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter history by current user."""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)
        return queryset.order_by("-created_at")[:50]  # Last 50 searches

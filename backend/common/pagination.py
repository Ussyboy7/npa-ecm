"""
Shared pagination utilities.

Standardize on `page_size` query param across the API because the frontend
passes `page_size` widely (e.g. `?page=1&page_size=50`).
"""

from rest_framework.pagination import PageNumberPagination


class StandardPageNumberPagination(PageNumberPagination):
    """Operational lists — default 50 rows, max 100 per request."""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


class CatalogPageNumberPagination(PageNumberPagination):
    """
    Reference catalogs (org units, user pickers, templates).

    Max 500 is a safety ceiling for admin grids, not for unbounded export.
    """

    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 500

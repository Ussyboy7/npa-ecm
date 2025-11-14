"""Custom exception handler for consistent API error responses."""

from typing import Any

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """
    Wrap DRF's default exception handler to enforce a consistent payload.

    Returns:
        Response | None: A DRF Response object with normalized structure,
        or None if the exception should propagate.
    """
    response = drf_exception_handler(exc, context)

    if response is None:
        # Let DRF/Django handle exceptions it doesn't know about
        return None

    detail = response.data
    message = "An unexpected error occurred"

    if isinstance(detail, dict):
        message = detail.get("detail") or detail.get("message") or message
    elif isinstance(detail, list) and detail:
        message = detail[0]
    elif isinstance(detail, str):
        message = detail

    response.data = {
        "error": True,
        "message": message,
        "status_code": response.status_code,
        "details": detail if isinstance(detail, dict) else {"raw": detail},
    }

    # Ensure we always return a valid HTTP status
    if not response.status_code:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

    return response


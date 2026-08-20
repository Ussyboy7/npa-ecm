"""Authenticated media serving for allowlisted non-document paths (signatures, seals)."""

from __future__ import annotations

import mimetypes
import os

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

# Document binaries must use DMS / correspondence attachment endpoints — not this path.
ALLOWED_MEDIA_PREFIXES = (
    "signatures/",
    "seals/",
    "signature_templates/",
    "user_signatures/",
    "accounts/",
)


class ProtectedMediaView(APIView):
    """
    Serve allowlisted media files to authenticated users only.

    DMS versions, correspondence attachments, and completion packages are excluded
    so they cannot be fetched via raw path guessing.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, path: str):
        normalized = (path or "").lstrip("/").replace("\\", "/")
        if ".." in normalized.split("/"):
            raise Http404()
        if not any(normalized.startswith(prefix) for prefix in ALLOWED_MEDIA_PREFIXES):
            raise Http404()

        root = os.path.realpath(str(settings.MEDIA_ROOT))
        full_path = os.path.realpath(os.path.join(root, normalized))
        if not full_path.startswith(root + os.sep) and full_path != root:
            raise Http404()
        if not os.path.isfile(full_path):
            raise Http404()

        content_type, _ = mimetypes.guess_type(full_path)
        return FileResponse(
            open(full_path, "rb"),
            as_attachment=False,
            filename=os.path.basename(full_path),
            content_type=content_type or "application/octet-stream",
        )

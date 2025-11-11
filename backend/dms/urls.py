"""URL routes for the document management system app."""

from rest_framework.routers import DefaultRouter

from .views import (
    DocumentAccessLogViewSet,
    DocumentCommentViewSet,
    DocumentDiscussionMessageViewSet,
    DocumentEditorSessionViewSet,
    DocumentPermissionViewSet,
    DocumentVersionViewSet,
    DocumentViewSet,
    DocumentWorkspaceViewSet,
)


router = DefaultRouter()
router.register(r"workspaces", DocumentWorkspaceViewSet, basename="document-workspace")
router.register(r"documents", DocumentViewSet, basename="document")
router.register(r"versions", DocumentVersionViewSet, basename="document-version")
router.register(r"permissions", DocumentPermissionViewSet, basename="document-permission")
router.register(r"comments", DocumentCommentViewSet, basename="document-comment")
router.register(r"discussions", DocumentDiscussionMessageViewSet, basename="document-discussion")
router.register(r"access-logs", DocumentAccessLogViewSet, basename="document-access-log")
router.register(r"editor-sessions", DocumentEditorSessionViewSet, basename="document-editor-session")


urlpatterns = router.urls


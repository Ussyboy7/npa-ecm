"""URL routes for the document management system app."""

from rest_framework.routers import DefaultRouter

from .views import (
    DocumentAccessLogViewSet,
    DocumentCollectionViewSet,
    DocumentCommentViewSet,
    DocumentDiscussionMessageViewSet,
    DocumentEditorSessionViewSet,
    DocumentPermissionViewSet,
    DocumentRightsPolicyViewSet,
    DocumentTemplateViewSet,
    DocumentVersionViewSet,
    DocumentViewSet,
)
from .form_views import FormDocumentViewSet


router = DefaultRouter()
router.register(r"collections", DocumentCollectionViewSet, basename="document-collection")
router.register(r"documents", DocumentViewSet, basename="document")
router.register(r"form-documents", FormDocumentViewSet, basename="form-document")
router.register(r"versions", DocumentVersionViewSet, basename="document-version")
router.register(r"permissions", DocumentPermissionViewSet, basename="document-permission")
router.register(r"comments", DocumentCommentViewSet, basename="document-comment")
router.register(r"discussions", DocumentDiscussionMessageViewSet, basename="document-discussion")
router.register(r"access-logs", DocumentAccessLogViewSet, basename="document-access-log")
router.register(r"editor-sessions", DocumentEditorSessionViewSet, basename="document-editor-session")
router.register(r"templates", DocumentTemplateViewSet, basename="document-template")
router.register(r"drm-policies", DocumentRightsPolicyViewSet, basename="document-rights-policy")


urlpatterns = router.urls


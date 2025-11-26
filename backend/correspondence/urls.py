"""URL routes for the correspondence app."""

from rest_framework.routers import DefaultRouter

from .views import (
    CorrespondenceAttachmentViewSet,
    CorrespondenceDistributionViewSet,
    CorrespondenceDocumentLinkViewSet,
    CorrespondenceViewSet,
    DelegationViewSet,
    MinuteViewSet,
    ParallelRoutingGroupViewSet,
)


router = DefaultRouter()
router.register(r"items", CorrespondenceViewSet, basename="correspondence")
router.register(r"attachments", CorrespondenceAttachmentViewSet, basename="correspondence-attachment")
router.register(r"distribution", CorrespondenceDistributionViewSet, basename="correspondence-distribution")
router.register(r"document-links", CorrespondenceDocumentLinkViewSet, basename="correspondence-document-link")
router.register(r"minutes", MinuteViewSet, basename="minute")
router.register(r"parallel-routing-groups", ParallelRoutingGroupViewSet, basename="parallel-routing-group")
router.register(r"delegations", DelegationViewSet, basename="delegation")


urlpatterns = router.urls


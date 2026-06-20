"""URL routes for the correspondence app."""

from rest_framework.routers import DefaultRouter

from .views import (
    CaseCommentViewSet,
    CaseCorrespondenceLinkViewSet,
    CaseSLAViewSet,
    CaseTemplateViewSet,
    CaseViewSet,
    CaseWorkflowRuleViewSet,
    CorrespondenceAttachmentViewSet,
    CorrespondenceDelegationViewSet,
    CorrespondenceDraftViewSet,
    CorrespondenceDistributionViewSet,
    CorrespondenceDocumentLinkViewSet,
    CorrespondenceTemplateViewSet,
    CorrespondenceViewSet,
    DelegationViewSet,
    DispatchRecordViewSet,
    MinuteViewSet,
    ParallelRoutingGroupViewSet,
)
from .physical_views import (
    LocationViewSet,
    PhysicalDocumentViewSet,
    CheckOutEventViewSet,
)


router = DefaultRouter()
router.register(r"items", CorrespondenceViewSet, basename="correspondence")
router.register(r"attachments", CorrespondenceAttachmentViewSet, basename="correspondence-attachment")
router.register(r"distribution", CorrespondenceDistributionViewSet, basename="correspondence-distribution")
router.register(r"document-links", CorrespondenceDocumentLinkViewSet, basename="correspondence-document-link")
router.register(r"templates", CorrespondenceTemplateViewSet, basename="correspondence-template")
router.register(r"minutes", MinuteViewSet, basename="minute")
router.register(r"parallel-routing-groups", ParallelRoutingGroupViewSet, basename="parallel-routing-group")
router.register(r"delegations", DelegationViewSet, basename="delegation")
router.register(r"correspondence-delegations", CorrespondenceDelegationViewSet, basename="correspondence-delegation")
router.register(r"drafts", CorrespondenceDraftViewSet, basename="correspondence-draft")
router.register(r"cases", CaseViewSet, basename="case")
router.register(r"case-templates", CaseTemplateViewSet, basename="case-template")
router.register(r"case-comments", CaseCommentViewSet, basename="case-comment")
router.register(r"case-correspondence-links", CaseCorrespondenceLinkViewSet, basename="case-correspondence-link")
router.register(r"case-workflow-rules", CaseWorkflowRuleViewSet, basename="case-workflow-rule")
router.register(r"case-slas", CaseSLAViewSet, basename="case-sla")
router.register(r"dispatch-records", DispatchRecordViewSet, basename="dispatch-record")
router.register(r"locations", LocationViewSet, basename="location")
router.register(r"physical-documents", PhysicalDocumentViewSet, basename="physical-document")
router.register(r"checkout-events", CheckOutEventViewSet, basename="checkout-event")


urlpatterns = router.urls


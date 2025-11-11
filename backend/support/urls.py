"""URL routes for the support app."""

from rest_framework.routers import DefaultRouter

from .views import FaqEntryViewSet, HelpGuideViewSet, SupportTicketViewSet


router = DefaultRouter()
router.register(r"guides", HelpGuideViewSet, basename="help-guide")
router.register(r"faqs", FaqEntryViewSet, basename="faq-entry")
router.register(r"tickets", SupportTicketViewSet, basename="support-ticket")


urlpatterns = router.urls


"""URLs for forms app."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from forms.views import FormTemplateViewSet, FormSubmissionViewSet
from forms.signature_views import FormSignatureWorkflowViewSet, FormSignatureViewSet

router = DefaultRouter()
router.register(r"templates", FormTemplateViewSet, basename="form-template")
router.register(r"submissions", FormSubmissionViewSet, basename="form-submission")
router.register(r"signature-workflows", FormSignatureWorkflowViewSet, basename="form-signature-workflow")
router.register(r"signatures", FormSignatureViewSet, basename="form-signature")

urlpatterns = [
    path("", include(router.urls)),
]


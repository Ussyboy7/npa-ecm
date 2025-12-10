"""URL configuration for content capture module."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from capture.views import (
    BatchUploadViewSet,
    CaptureJobViewSet,
    CaptureViewSet,
    OCRResultViewSet,
    ScanSessionViewSet,
)

router = DefaultRouter()
router.register(r"jobs", CaptureJobViewSet, basename="capture-job")
router.register(r"ocr-results", OCRResultViewSet, basename="ocr-result")
router.register(r"scan-sessions", ScanSessionViewSet, basename="scan-session")
router.register(r"batch-uploads", BatchUploadViewSet, basename="batch-upload")
router.register(r"operations", CaptureViewSet, basename="capture")

urlpatterns = router.urls


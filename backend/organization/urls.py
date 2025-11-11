"""URL routes for the organization app."""

from rest_framework.routers import DefaultRouter

from .views import DepartmentViewSet, DirectorateViewSet, DivisionViewSet


router = DefaultRouter()
router.register(r"directorates", DirectorateViewSet, basename="directorate")
router.register(r"divisions", DivisionViewSet, basename="division")
router.register(r"departments", DepartmentViewSet, basename="department")


urlpatterns = router.urls

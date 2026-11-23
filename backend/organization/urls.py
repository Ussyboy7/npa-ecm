"""URL routes for the organization app."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    DepartmentViewSet,
    DirectorateViewSet,
    GradeCatalogView,
    DivisionViewSet,
    OfficeMembershipViewSet,
    OfficeViewSet,
    ReferenceAllocationViewSet,
    ReferenceSchemeViewSet,
    RoleViewSet,
)
from .calendar_views import ExecutiveCalendarEventViewSet
from .acting_views import ActingAppointmentViewSet, ActingRequestViewSet


router = DefaultRouter()
router.register(r"directorates", DirectorateViewSet, basename="directorate")
router.register(r"divisions", DivisionViewSet, basename="division")
router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"roles", RoleViewSet, basename="role")
router.register(r"offices", OfficeViewSet, basename="office")
router.register(r"office-memberships", OfficeMembershipViewSet, basename="office-membership")
router.register(r"calendar-events", ExecutiveCalendarEventViewSet, basename="calendar-event")
router.register(r"acting-appointments", ActingAppointmentViewSet, basename="acting-appointment")
router.register(r"acting-requests", ActingRequestViewSet, basename="acting-request")
router.register(r"reference-schemes", ReferenceSchemeViewSet, basename="reference-scheme")
router.register(
    r"reference-allocations", ReferenceAllocationViewSet, basename="reference-allocation"
)


urlpatterns = [
    path("grades/", GradeCatalogView.as_view(), name="grade-catalog"),
] + router.urls

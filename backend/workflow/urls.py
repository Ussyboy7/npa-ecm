"""URL routes for the workflow app."""

from rest_framework.routers import DefaultRouter

from .views import (
    ApprovalTaskViewSet,
    TaskActionViewSet,
    WorkflowStepViewSet,
    WorkflowTemplateViewSet,
)


router = DefaultRouter()
router.register(r"templates", WorkflowTemplateViewSet, basename="workflow-template")
router.register(r"steps", WorkflowStepViewSet, basename="workflow-step")
router.register(r"tasks", ApprovalTaskViewSet, basename="approval-task")
router.register(r"task-actions", TaskActionViewSet, basename="task-action")


urlpatterns = router.urls


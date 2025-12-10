"""URL configuration for search module."""

from rest_framework.routers import DefaultRouter

from search.views import SavedSearchViewSet, SearchHistoryViewSet, SearchViewSet

router = DefaultRouter()
router.register(r"operations", SearchViewSet, basename="search")
router.register(r"saved", SavedSearchViewSet, basename="saved-search")
router.register(r"history", SearchHistoryViewSet, basename="search-history")

urlpatterns = router.urls


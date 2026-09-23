"""The news API exposes one resource: leads."""
from rest_framework.routers import DefaultRouter
from .views import LeadViewSet

# The project mounts these routes at /api/news/. DRF also registers the
# select/dismiss actions declared on LeadViewSet.
router = DefaultRouter()
router.register('leads', LeadViewSet, basename='lead')
urlpatterns = router.urls

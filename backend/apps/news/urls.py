"""Collected leads and the author/editor news dashboard API."""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, DashboardAccessView, LeadViewSet, NewsImageUploadView, NewsImageView, StoryViewSet

# The project mounts these routes at /api/news/. DRF also registers the
# select/dismiss actions declared on LeadViewSet.
router = DefaultRouter()
router.register('leads', LeadViewSet, basename='lead')
router.register('categories', CategoryViewSet, basename='news-category')
router.register('stories', StoryViewSet, basename='news-story')
urlpatterns = [
    path('dashboard/', DashboardAccessView.as_view(), name='news-dashboard'),
    path('images/', NewsImageUploadView.as_view(), name='news-image-upload'),
    path('images/<uuid:pk>/', NewsImageView.as_view(), name='news-image'),
] + router.urls

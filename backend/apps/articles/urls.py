from django.urls import path
from .views import ArticleListCreateAPIView, ArticleDetailView

# Sub-paths isolated under the app level scope
urlpatterns = [
    # Handles collection queries and fresh form post inputs
    path("", ArticleListCreateAPIView.as_view(), name="article-list-create"),
    
    # Handles explicit single item lookup interactions based on URL slugs
    path("<slug:slug>/", ArticleDetailView.as_view(), name="article-detail"),
]

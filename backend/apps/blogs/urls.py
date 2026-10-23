from django.urls import path
from .views import BlogPostListCreateAPIView, BlogPostDetailAPIView, CommentListCreateAPIView, LikeToggleAPIView, CommentModeration, CommentDelete

urlpatterns = [
    path('moderation/comments/', CommentModeration.as_view(), name='comment-moderation'),
    path('moderation/comments/<int:pk>/', CommentDelete.as_view(), name='comment-delete'),
    # Timeline overview channels and core opinion setups
    path("", BlogPostListCreateAPIView.as_view(), name="blog-list-create"),
    
    # Detail analysis parameters matching slugs
    path("<slug:slug>/", BlogPostDetailAPIView.as_view(), name="blog-detail"),
    
    # Isolated nested path tracking for comment lists
    path("<slug:slug>/comments/", CommentListCreateAPIView.as_view(), name="blog-comment-list-create"),
    
    # Action route for engagement metrics triggers
    path("<slug:slug>/like/", LikeToggleAPIView.as_view(), name="blog-like-toggle"),
]

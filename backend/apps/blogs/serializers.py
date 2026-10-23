from rest_framework import serializers
from .models import BlogPost, Comment, Like
from apps.content.workflow import ContentSerializerMixin

class CommentSerializer(serializers.ModelSerializer):
    # Resolves client profile identifiers down to true username strings
    user_username = serializers.CharField(source='user.username', read_only=True)
    post_title = serializers.CharField(source='post.title', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'post', 'user', 'user_username', 'post_title', 'content', 'created_at']
        read_only_fields = ['id', 'post', 'user', 'created_at']

class BlogPostSerializer(ContentSerializerMixin, serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    
    # Nests comments as sub-arrays and counts like totals programmatically inside JSON data files
    comments = CommentSerializer(many=True, read_only=True)
    likes_count = serializers.IntegerField(source='likes.count', read_only=True)

    class Meta:
        model = BlogPost
        fields = ['id', 'title', 'slug', 'content', 'author', 'author_username', 'likes_count', 'comments', 'created_at', 'updated_at', 'status', 'feedback', 'reviewer', 'reviewed_at', 'published_at']
        # Added 'author' to read_only_fields so DRF serializer validation does not require it in the POST body
        read_only_fields = ['id', 'slug', 'author', 'likes_count', 'comments', 'created_at', 'updated_at', 'reviewer', 'reviewed_at', 'published_at']
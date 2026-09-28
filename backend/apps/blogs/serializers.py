from rest_framework import serializers
from .models import BlogPost, Comment, Like

class CommentSerializer(serializers.ModelSerializer):
    # Resolves client profile identifiers down to true username strings
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'post', 'user', 'user_username', 'content', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class BlogPostSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    
    # Nests comments as sub-arrays and counts like totals programmatically inside JSON data files
    comments = CommentSerializer(many=True, read_only=True)
    likes_count = serializers.IntegerField(source='likes.count', read_only=True)

    class Meta:
        model = BlogPost
        fields = ['id', 'title', 'slug', 'content', 'author', 'author_username', 'likes_count', 'comments', 'created_at']
        read_only_fields = ['id', 'slug', 'likes_count', 'comments', 'created_at']

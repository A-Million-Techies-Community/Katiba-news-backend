from rest_framework import serializers
from .models import Article

class ArticleSerializer(serializers.ModelSerializer):
    # Extracts the author's real human username text string instead of a row ID number
    author_username = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = Article
        # Explicitly targets base data schema fields needed by frontend requests
        fields = ['id', 'title', 'slug', 'content', 'status', 'author', 'author_username', 'created_at', 'updated_at']
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

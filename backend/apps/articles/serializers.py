from rest_framework import serializers
from .models import Article
from apps.content.workflow import ContentSerializerMixin

class ArticleSerializer(ContentSerializerMixin, serializers.ModelSerializer):
    # Extracts the author's real human username text string instead of a row ID number
    author_username = serializers.CharField(source='author.username', read_only=True)

    def validate_featured_image(self, image):
        if image is None:
            return image
        from apps.news.serializers import NewsImageUploadSerializer
        # Same size, pixel, format and metadata policy as private news images.
        return NewsImageUploadSerializer().validate_file(image)

    class Meta:
        model = Article
        # Explicitly targets base data schema fields needed by frontend requests
        # 📍 ADDED 'featured_image' here so the API accepts the uploaded file
        fields = [
            'id', 'title', 'slug', 'content', 'featured_image', 
            'status', 'author', 'author_username', 'created_at', 
            'updated_at', 'feedback', 'reviewer', 'reviewed_at', 'published_at'
        ]
        
        # Added 'author' here so Django automatically assigns it from the logged-in session token
        read_only_fields = [
            'id', 'slug', 'author', 'created_at', 'updated_at', 
            'reviewer', 'reviewed_at', 'published_at'
        ]
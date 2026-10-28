"""Retain existing image URLs while applying the article visibility rules."""
from django.http import FileResponse, Http404
from rest_framework import permissions
from rest_framework.views import APIView
from apps.content.workflow import visible_content
from .models import Article


class ArticleImageView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, name):
        # Exact database lookup, never join an untrusted path to the filesystem.
        article = visible_content(Article, request).filter(featured_image='articles/' + name).first()
        if article is None or not article.featured_image:
            raise Http404
        try:
            response = FileResponse(article.featured_image.open('rb'), content_type='image/' + ('jpeg' if article.featured_image.name.lower().endswith(('.jpg', '.jpeg')) else 'webp' if article.featured_image.name.lower().endswith('.webp') else 'png'))
        except FileNotFoundError:
            raise Http404
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response

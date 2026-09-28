from rest_framework import generics
from .models import Article
from .serializers import ArticleSerializer

class ArticleListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ArticleSerializer

    # Filters content dynamically so anonymous visitors only see published documents
    def get_queryset(self):
        if self.request.method == 'GET':
            return Article.objects.filter(status=Article.Status.PUBLISHED).order_by('-created_at')
        return Article.objects.all().order_by('-created_at')

    # Automatically attaches the currently authenticated token session profile as the author
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class ArticleDetailView(generics.RetrieveUpdateDestroyAPIView):
    # Handles retrieving, modifying, or removing items matching their web URL slug
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    lookup_field = 'slug'

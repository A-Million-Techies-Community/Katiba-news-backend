from rest_framework import generics, permissions
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Article
from .serializers import ArticleSerializer

User = get_user_model()


class ArticleListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ArticleSerializer
    
    # 📍 TEMPORARY TESTING CONFIGURATION: Allows unrestricted submissions without signing in
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        fetch_all = self.request.query_params.get('all', 'false').lower() == 'true'
        status_param = self.request.query_params.get('status', None)

        # 1. If explicit status query parameter is provided (e.g. ?status=Draft)
        if status_param:
            return Article.objects.filter(status__iexact=status_param).order_by('-created_at')

        # 2. Testing mode / Admin override: return everything if ?all=true is passed
        if fetch_all or (user.is_authenticated and (user.is_staff or user.is_superuser)):
            return Article.objects.all().order_by('-created_at')

        # 3. Logged-in Author: return ALL of their own articles (Drafts, Under Review, Published)
        #    PLUS any published articles by other authors
        if user.is_authenticated:
            return Article.objects.filter(
                Q(author=user) | Q(status=Article.Status.PUBLISHED)
            ).distinct().order_by('-created_at')

        # 4. Public / Unauthenticated visitors: strictly return PUBLISHED articles only
        return Article.objects.filter(status=Article.Status.PUBLISHED).order_by('-created_at')

    def perform_create(self, serializer):
        """
        Automatically falls back to a default testing user account 
        if the request doesn't provide a logged-in token session.
        """
        if self.request.user.is_authenticated:
            serializer.save(author=self.request.user)
        else:
            # Looks up or creates a fallback test author record directly in your database
            test_author, _ = User.objects.get_or_create(
                username='testauthor',
                defaults={
                    'email': 'testauthor@katibanews.local',
                    'first_name': 'Test',
                    'last_name': 'Author'
                }
            )
            serializer.save(author=test_author)


class ArticleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer 
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'
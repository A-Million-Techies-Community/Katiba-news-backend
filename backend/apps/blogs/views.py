from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import BlogPost, Comment, Like
from .serializers import BlogPostSerializer, CommentSerializer

User = get_user_model()

class BlogPostListCreateAPIView(generics.ListCreateAPIView):
    # Fetches active chronological public entries
    queryset = BlogPost.objects.all().order_by('-created_at')
    serializer_class = BlogPostSerializer

    def create(self, request, *args, **kwargs):
        # Prevent "author: This field is required" error when author is not passed in payload
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)

        # Get current user or fallback to first superuser/admin for guest posts
        author_user = request.user if request.user and request.user.is_authenticated else User.objects.first()

        if author_user and ('author' not in data or not data['author']):
            data['author'] = author_user.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        if author_user:
            serializer.save(author=author_user)
        else:
            serializer.save()

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class BlogPostDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    # Targets individual resource manipulations
    queryset = BlogPost.objects.all()
    serializer_class = BlogPostSerializer
    lookup_field = 'slug'

class CommentListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer

    # Extracts matching conversation nodes linked to specific URL parameters
    def get_queryset(self):
        return Comment.objects.filter(post__slug=self.kwargs['slug']).order_by('created_at')

    # Saves comment inputs and directly connects them to the active target post
    def perform_create(self, serializer):
        user = self.request.user if self.request.user and self.request.user.is_authenticated else User.objects.first()
        serializer.save(user=user, post=BlogPost.objects.get(slug=self.kwargs['slug']))

class LikeToggleAPIView(APIView):
    # Evaluates binary records to seamlessly add or drop like counts from database tables
    def post(self, request, slug):
        post_obj = BlogPost.objects.get(slug=slug)
        user = request.user if request.user and request.user.is_authenticated else User.objects.first()

        if not user:
            return Response({'error': 'No active user found.'}, status=status.HTTP_400_BAD_REQUEST)

        like_qs = Like.objects.filter(post=post_obj, user=user)
        
        # Deletes records if they already exist, otherwise generates a fresh entry interaction
        if like_qs.exists():
            like_qs.delete()
            return Response(status=status.HTTP_200_OK)
        Like.objects.create(post=post_obj, user=user)
        return Response(status=status.HTTP_201_CREATED)
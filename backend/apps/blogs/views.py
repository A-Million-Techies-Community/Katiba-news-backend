from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import BlogPost, Comment, Like
from .serializers import BlogPostSerializer, CommentSerializer

class BlogPostListCreateAPIView(generics.ListCreateAPIView):
    # Fetches active chronological public entries
    queryset = BlogPost.objects.all().order_by('-created_at')
    serializer_class = BlogPostSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

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
        serializer.save(user=self.request.user, post=BlogPost.objects.get(slug=self.kwargs['slug']))

class LikeToggleAPIView(APIView):
    # Evaluates binary records to seamlessly add or drop like counts from database tables
    def post(self, request, slug):
        post_obj = BlogPost.objects.get(slug=slug)
        like_qs = Like.objects.filter(post=post_obj, user=request.user)
        
        # Deletes records if they already exist, otherwise generates a fresh entry interaction
        if like_qs.exists():
            like_qs.delete()
            return Response(status=status.HTTP_200_OK)
        Like.objects.create(post=post_obj, user=request.user)
        return Response(status=status.HTTP_201_CREATED)

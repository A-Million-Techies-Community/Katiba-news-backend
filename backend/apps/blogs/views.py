from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.content.workflow import ContentListCreate, ContentDetail
from apps.users.access import editorial_access
from .models import BlogPost, Comment, Like
from .serializers import BlogPostSerializer, CommentSerializer


class BlogPostListCreateAPIView(ContentListCreate):
    serializer_class = BlogPostSerializer


class BlogPostDetailAPIView(ContentDetail):
    serializer_class = BlogPostSerializer


class CommentListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_post(self):
        return get_object_or_404(BlogPost, slug=self.kwargs['slug'], status='published')

    def get_queryset(self):
        return Comment.objects.filter(post=self.get_post()).select_related('user').order_by('created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, post=self.get_post())


class LikeToggleAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, slug):
        post = get_object_or_404(BlogPost.objects.select_for_update(), slug=slug, status='published')
        like, created = Like.objects.get_or_create(post=post, user=request.user)
        if not created:
            like.delete()
        return Response({'liked': created}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class CommentModeration(generics.ListAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        query = Comment.objects.select_related('user', 'post').order_by('-created_at')
        return query if editorial_access(self.request.user) else query.filter(post__author=self.request.user)


class CommentDelete(generics.DestroyAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        query = Comment.objects.select_related('post')
        if editorial_access(self.request.user):
            return query
        from django.db.models import Q
        return query.filter(Q(user=self.request.user) | Q(post__author=self.request.user))

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.articles.models import Article
from apps.blogs.models import BlogPost

# Extracts the master system user account model dynamically
User = get_user_model()

class KatibaNewsCoreTests(APITestCase):

    # Sets up an authenticated user profile session before each test runs
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password123")
        self.client.force_authenticate(user=self.user)

    # Validates that post routing parameters write objects to the articles database safely
    def test_article_workflow(self):
        url = reverse("article-list-create")
        # Included the required author field relation directly to pass serializer validation
        payload = {
            "title": "Test Title", 
            "content": "Test Body Content", 
            "status": "published",
            "author": self.user.id
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Article.objects.count(), 1)

    # Validates public community timeline feeds creation endpoints inside the blogs app
    def test_blog_workflow(self):
        url = reverse("blog-list-create")
        # Included the required author field relation directly to pass serializer validation
        payload = {
            "title": "Blog Title", 
            "content": "Blog Body Content",
            "author": self.user.id
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(BlogPost.objects.count(), 1)

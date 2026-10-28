"""Regression tests for login budgets, private media, and resource limits."""
import tempfile
from io import BytesIO
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient
from apps.articles.models import Article


class SecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.writer = get_user_model().objects.create_user(username='safe-writer', email='safe@example.com', password='Testing-password-793!')
        self.writer.groups.add(Group.objects.get(name='Author'))
        self.other = get_user_model().objects.create_user(username='other-safe', email='other-safe@example.com')
        self.other.groups.add(Group.objects.get(name='Author'))
        self.editor = get_user_model().objects.create_user(username='safe-editor', email='editor-safe@example.com')
        self.editor.groups.add(Group.objects.get(name='Editor'))
        self.directory = tempfile.TemporaryDirectory()
        self.settings_override = override_settings(MEDIA_ROOT=self.directory.name)
        self.settings_override.enable()
        self.addCleanup(self.directory.cleanup)
        self.addCleanup(self.settings_override.disable)
        self.addCleanup(cache.clear)

    def image(self):
        out = BytesIO()
        Image.new('RGB', (8, 8), 'blue').save(out, format='PNG')
        return SimpleUploadedFile('picture.png', out.getvalue(), content_type='image/png')

    def test_login_account_budget_spans_ips_and_admin(self):
        for attempt in range(10):
            response = self.client.post('/api/users/login/', {'username': 'safe-writer', 'password': 'wrong'}, format='json', REMOTE_ADDR=f'192.0.2.{attempt}')
            self.assertEqual(response.status_code, 401)
        response = self.client.post('/admin/login/', {'username': 'safe-writer', 'password': 'wrong'}, REMOTE_ADDR='192.0.2.99')
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response['Retry-After'], '600')

    def test_login_ip_budget_ignores_spoofed_forwarded_header(self):
        for attempt in range(30):
            response = self.client.post('/api/users/login/', {'username': f'absent-{attempt}', 'password': 'wrong'}, format='json', HTTP_X_FORWARDED_FOR=f'192.0.2.{attempt}')
            self.assertEqual(response.status_code, 401)
        self.assertEqual(self.client.post('/api/users/login/', {'username': 'new-name', 'password': 'wrong'}, format='json').status_code, 429)

    def test_cache_failure_fails_closed(self):
        from unittest.mock import patch
        with patch('config.security.cache.add', side_effect=ConnectionError):
            self.assertEqual(self.client.post('/api/users/login/', {'username': 'safe-writer', 'password': 'anything'}, format='json').status_code, 503)

    def test_private_article_image_visibility_tracks_workflow(self):
        article = Article.objects.create(title='Private image', content='body', author=self.writer, featured_image=self.image())
        url = article.featured_image.url
        self.assertEqual(self.client.get(url).status_code, 404)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.client.force_authenticate(self.editor)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.client.force_authenticate(self.writer)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        response.close()
        article.status = 'under_review'; article.save()
        self.client.force_authenticate(self.editor)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200); response.close()
        article.status = 'published'; article.save()
        self.client.force_authenticate(None)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Cache-Control'], 'private, no-store'); response.close()

    def test_oversized_article_and_comment_rejected(self):
        self.client.force_authenticate(self.writer)
        self.assertEqual(self.client.post('/api/articles/', {'title': 'Too long', 'content': 'a' * 200001}, format='json').status_code, 400)
        from apps.blogs.models import BlogPost
        post = BlogPost.objects.create(title='Discussion', author=self.writer, content='text', status='published')
        self.assertEqual(self.client.post(f'/api/blogs/{post.slug}/comments/', {'content': 'a' * 5001}, format='json').status_code, 400)

    def test_article_image_reencoded_and_non_images_rejected(self):
        self.client.force_authenticate(self.writer)
        response = self.client.post('/api/articles/', {'title': 'Photo', 'content': 'body', 'featured_image': self.image()}, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data['featured_image'].endswith('.webp'))
        response = self.client.post('/api/articles/', {'title': 'Bad file', 'content': 'body', 'featured_image': SimpleUploadedFile('bad.svg', b'<svg onload="alert(1)"/>', content_type='image/svg+xml')}, format='multipart')
        self.assertEqual(response.status_code, 400)

    def test_authenticated_api_has_rate_limit(self):
        self.client.force_authenticate(self.writer)
        with override_settings(REST_FRAMEWORK={**__import__('django.conf', fromlist=['settings']).settings.REST_FRAMEWORK, 'DEFAULT_THROTTLE_RATES': {'user': '1/hour', 'anon': '120/hour'}}):
            from rest_framework.throttling import UserRateThrottle
            from unittest.mock import patch
            with patch.object(UserRateThrottle, 'THROTTLE_RATES', {'user': '1/hour'}):
                self.assertEqual(self.client.get('/api/users/me/').status_code, 200)
                self.assertEqual(self.client.get('/api/users/me/').status_code, 429)

    def test_logout_revokes_access_and_refresh_tokens(self):
        response = self.client.post('/api/users/login/', {'username': self.writer.username, 'password': 'Testing-password-793!'}, format='json')
        self.assertEqual(response.status_code, 200)
        tokens = response.data
        from rest_framework_simplejwt.tokens import AccessToken
        token = AccessToken(tokens['access'])
        self.assertEqual(token['exp'] - token['iat'], 900)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + tokens['access'])
        self.assertEqual(self.client.post('/api/users/logout/').status_code, 204)
        self.assertEqual(self.client.get('/api/users/me/').status_code, 401)
        self.client.credentials()
        self.assertEqual(self.client.post('/api/users/token/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)

    def test_oversized_requests_rejected_before_login(self):
        self.assertEqual(self.client.post('/api/users/login/', {'username': 'a' * 17000, 'password': 'wrong'}, format='json').status_code, 413)
        self.assertEqual(self.client.post('/api/articles/', data=b'x' * (6 * 1024 * 1024 + 1), content_type='application/octet-stream').status_code, 413)

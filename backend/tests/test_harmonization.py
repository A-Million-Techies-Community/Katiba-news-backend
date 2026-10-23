"""Integration coverage for account access, publishing, privacy and moderation."""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient
from apps.articles.models import Article
from apps.blogs.models import BlogPost, Comment
from apps.news.models import Story, Category

User = get_user_model()

class WorkspaceIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.writer = User.objects.create_user(username='writer', email='writer@example.com', password='Writer-password-871!')
        self.writer.groups.add(Group.objects.get(name='Author'))
        self.other = User.objects.create_user(username='other', email='other@example.com')
        self.other.groups.add(Group.objects.get(name='Author'))
        self.editor = User.objects.create_user(username='editor', email='editor@example.com')
        self.editor.groups.add(Group.objects.get(name='Editor'))
        self.admin = User.objects.create_superuser(username='admin', email='admin@example.com', password='Admin-password-781!')

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def test_public_cannot_write_or_read_drafts_even_with_query_overrides(self):
        for model, kind in [(Article, 'articles'), (BlogPost, 'blogs')]:
            item = model.objects.create(title='Private', content='Secret', author=self.writer)
            for suffix in ['', '?all=true', '?status=draft']:
                self.assertEqual(self.client.get(f'/api/{kind}/{suffix}').data, [])
            url = f'/api/{kind}/{item.slug}/'
            self.assertEqual(self.client.get(url).status_code, 404)
            self.assertEqual(self.client.patch(url, {'title': 'Changed'}).status_code, 401)
            self.assertEqual(self.client.delete(url).status_code, 401)
            self.assertEqual(self.client.post(f'/api/{kind}/', {'title': 'Guest', 'content': 'Body'}).status_code, 401)

    def test_writer_editor_publication_flow_for_articles_and_blogs(self):
        for kind in ('articles', 'blogs'):
            self.auth(self.writer)
            response = self.client.post(f'/api/{kind}/', {'title': f'{kind} report', 'content': 'Original reporting', 'status': 'draft', 'author': self.other.pk})
            self.assertEqual(response.status_code, 201, response.data)
            self.assertEqual(response.data['author'], self.writer.pk)
            url = f"/api/{kind}/{response.data['slug']}/"
            self.assertEqual(self.client.patch(url, {'status': 'published'}).status_code, 403)
            self.auth(self.other)
            self.assertEqual(self.client.patch(url, {'title': 'Stolen'}).status_code, 404)
            self.auth(self.editor)
            self.assertEqual(self.client.get(url).status_code, 404)
            self.auth(self.writer)
            self.assertEqual(self.client.patch(url, {'status': 'under_review'}).status_code, 200)
            self.assertEqual(self.client.patch(url, {'content': 'Late edit'}).status_code, 403)
            self.auth(self.editor)
            self.assertEqual(self.client.patch(url, {'status': 'published'}).status_code, 400)
            self.assertEqual(self.client.patch(url, {'status': 'rejected'}).status_code, 400)
            self.assertEqual(self.client.patch(url, {'status': 'rejected', 'feedback': 'Verify the figures.'}).status_code, 200)
            self.auth(self.writer)
            self.assertEqual(self.client.patch(url, {'status': 'under_review'}).status_code, 200)
            self.auth(self.editor)
            self.assertEqual(self.client.patch(url, {'status': 'approved', 'feedback': 'Verified.'}).status_code, 200)
            self.assertEqual(self.client.patch(url, {'status': 'published'}).status_code, 200)
            self.client.force_authenticate(user=None)
            published = self.client.get(url)
            self.assertEqual(published.status_code, 200)
            self.assertNotIn('feedback', published.data)
            self.assertNotIn('reviewer', published.data)

    def test_group_membership_controls_every_author_endpoint(self):
        self.auth(self.writer)
        self.assertEqual(self.client.get('/api/users/author/profile/').status_code, 200)
        self.writer.groups.clear()
        for path in ('/api/users/author/profile/', '/api/news/dashboard/'):
            self.assertEqual(self.client.get(path).status_code, 403)
        self.assertEqual(self.client.post('/api/articles/', {'title': 'No access', 'content': 'Body'}).status_code, 403)

    def test_admin_role_changes_and_suspension_revoke_tokens(self):
        login = self.client.post('/api/users/login/', {'username': 'writer', 'password': 'Writer-password-871!'})
        token = login.data['access']
        for actor in (self.writer, self.editor):
            self.auth(actor)
            self.assertEqual(self.client.get('/api/users/accounts/').status_code, 403)
        self.auth(self.admin)
        response = self.client.patch(f'/api/users/accounts/{self.writer.pk}/', {'newsroom_role': 'Editor'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['role'], 'Editor')
        self.assertFalse(self.writer.groups.filter(name='Author').exists())
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer '+token)
        self.assertEqual(self.client.get('/api/users/me/').status_code, 401)
        self.client.credentials()
        self.auth(self.admin)
        response = self.client.post('/api/users/accounts/', {'username': 'newwriter', 'email': 'new@example.com', 'password': 'Strong-new-password-813!', 'newsroom_role': 'Author'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.client.patch(f'/api/users/accounts/{self.admin.pk}/', {'is_active': False}, format='json').status_code, 400)
        self.assertEqual(self.client.patch(f'/api/users/accounts/{self.writer.pk}/', {'is_active': False}, format='json').status_code, 200)
        self.writer.refresh_from_db()
        self.assertFalse(self.writer.is_active)

    def test_news_publication_requires_approval_and_hides_private_fields(self):
        category = Category.objects.create(name='Public affairs')
        story = Story.objects.create(title='News report', content='<p>Verified reporting.</p>', author=self.writer, category=category, status='submitted')
        self.assertEqual(self.client.get('/api/news/public/').data['count'], 0)
        self.auth(self.editor)
        url = f'/api/news/stories/{story.pk}/'
        self.assertEqual(self.client.post(url+'publish/', {}, format='json').status_code, 400)
        self.assertEqual(self.client.post(url+'approve/', {}, format='json').status_code, 200)
        self.assertEqual(self.client.post(url+'publish/', {}, format='json').status_code, 200)
        self.client.force_authenticate(user=None)
        public = self.client.get(f'/api/news/public/{story.pk}/')
        self.assertEqual(public.status_code, 200)
        self.assertNotIn('feedback', public.data)
        self.assertNotIn('reviewer', public.data)

    def test_comments_require_login_and_publication_and_moderation_is_scoped(self):
        draft = BlogPost.objects.create(title='Draft', content='Body', author=self.writer)
        post = BlogPost.objects.create(title='Published', content='Body', author=self.writer, status='published')
        url = f'/api/blogs/{post.slug}/comments/'
        self.assertEqual(self.client.post(url, {'content': 'Guest'}).status_code, 401)
        self.auth(self.other)
        self.assertEqual(self.client.post(f'/api/blogs/{draft.slug}/comments/', {'content': 'Hidden'}).status_code, 404)
        response = self.client.post(url, {'content': 'Reader feedback', 'user': self.writer.pk})
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['user'], self.other.pk)
        self.assertEqual(len(self.client.get('/api/blogs/moderation/comments/').data), 0)
        comment = response.data['id']
        self.auth(self.writer)
        self.assertEqual(len(self.client.get('/api/blogs/moderation/comments/').data), 1)
        self.assertEqual(self.client.delete(f'/api/blogs/moderation/comments/{comment}/').status_code, 204)

    def test_editor_cannot_create_or_review_own_content(self):
        self.auth(self.editor)
        for model, kind in [(Article, 'articles'), (BlogPost, 'blogs')]:
            self.assertEqual(self.client.post(f'/api/{kind}/', {'title': 'Editor draft', 'content': 'Body'}).status_code, 403)
            own = model.objects.create(title=f'Own {kind}', content='Body', author=self.editor, status='under_review')
            self.assertEqual(self.client.patch(f'/api/{kind}/{own.slug}/', {'status': 'approved'}).status_code, 403)

    def test_media_remains_private_until_story_publication(self):
        from tempfile import TemporaryDirectory
        from io import BytesIO
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.core.files.storage import FileSystemStorage
        from apps.news.models import NewsImage
        with TemporaryDirectory() as directory:
            field = NewsImage._meta.get_field('file')
            old_storage = field.storage
            field.storage = FileSystemStorage(location=directory)
            self.addCleanup(setattr, field, 'storage', old_storage)
            output = BytesIO()
            Image.new('RGB', (10, 10), 'green').save(output, format='PNG')
            self.auth(self.writer)
            response = self.client.post('/api/news/images/', {'file': SimpleUploadedFile('fixture.png', output.getvalue(), content_type='image/png')}, format='multipart')
            self.assertEqual(response.status_code, 201, response.data)
            image = NewsImage.objects.get(pk=response.data['id'])
            self.assertEqual(len(self.client.get('/api/news/media/').data), 1)
            self.auth(self.other)
            self.assertEqual(self.client.delete(f'/api/news/media/{image.pk}/').status_code, 404)
            self.client.force_authenticate(user=None)
            self.assertEqual(self.client.get(image.api_url).status_code, 404)
            category = Category.objects.create(name='Images')
            story = Story.objects.create(title='Photo report', content='<p>Verified.</p>', author=self.writer, category=category, status='approved', featured_image=image, featured_image_alt='Test illustration')
            image.story = story
            image.save(update_fields=['story'])
            self.auth(self.writer)
            self.assertEqual(self.client.delete(f'/api/news/media/{image.pk}/').status_code, 400)
            self.auth(self.editor)
            self.assertEqual(self.client.post(f'/api/news/stories/{story.pk}/publish/', {}, format='json').status_code, 200)
            self.client.force_authenticate(user=None)
            public = self.client.get(image.api_url)
            self.assertEqual(public.status_code, 200)
            public.close()

    def test_reading_all_published_content_requires_no_account(self):
        for model, kind in [(Article, 'articles'), (BlogPost, 'blogs')]:
            item = model.objects.create(title=f'Open {kind}', content='Public reporting', author=self.writer, status='published')
            self.assertEqual(self.client.get(f'/api/{kind}/').status_code, 200)
            response = self.client.get(f'/api/{kind}/{item.slug}/')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['content'], 'Public reporting')
        category = Category.objects.create(name='Open news')
        story = Story.objects.create(title='Open news', content='<p>Public reporting</p>', author=self.writer, category=category, status='published')
        self.assertEqual(self.client.get('/api/news/public/').status_code, 200)
        self.assertEqual(self.client.get(f'/api/news/public/{story.pk}/').status_code, 200)
        for path in ['/api/users/accounts/', '/api/news/dashboard/', '/api/news/stories/']:
            self.assertEqual(self.client.get(path).status_code, 401)

    def test_public_article_api_never_exposes_internal_notes(self):
        import json
        item = Article.objects.create(title='Reviewed report', author=self.writer, status='published',
            content=json.dumps({'body': 'Public reporting', 'notes': 'PRIVATE SOURCE DETAILS', 'feedback': 'PRIVATE REVIEW'}),
            feedback='Internal editorial feedback')
        url = f'/api/articles/{item.slug}/'
        for user in [None, self.other]:
            self.client.force_authenticate(user=user)
            for endpoint in [url, '/api/articles/']:
                response = self.client.get(endpoint)
                self.assertEqual(response.status_code, 200)
                self.assertNotIn('PRIVATE', json.dumps(response.data))
                self.assertNotIn('Internal editorial feedback', json.dumps(response.data))
        for user in [self.writer, self.editor]:
            self.auth(user)
            self.assertIn('PRIVATE SOURCE DETAILS', self.client.get(url).data['content'])

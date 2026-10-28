"""News inbox API behavior and migration coverage."""
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import RequestFactory, TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient
from apps.news.models import Lead

FEED = b'''<feed xmlns="http://www.w3.org/2005/Atom"><entry>
<id>judgment-1</id><title>Constitutional petition</title>
<link href="https://new.kenyalaw.org/akn/ke/judgment/kehc/2026/1/"/>
<published>2026-09-01T10:00:00+03:00</published>
</entry></feed>'''


class InboxTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(username='editor', password='Test-pass-813!')
        self.user.groups.add(Group.objects.get(name='Editor'))
        self.lead = Lead.objects.create(
            external_id='judgment-1',
            title='Constitutional petition',
            original_url='https://new.kenyalaw.org/akn/ke/judgment/kehc/2026/1/',
        )
        self.url = f'/api/news/leads/{self.lead.pk}/'

    def authenticate(self):
        # Exercise the same token flow used by a frontend or Postman client.
        response = self.client.post('/api/users/login/', {'username': 'editor', 'password': 'Test-pass-813!'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])

    def test_jwt_editor_can_list_filter_and_review(self):
        self.assertEqual(self.client.get('/api/news/leads/').status_code, 401)
        self.authenticate()
        response = self.client.get('/api/news/leads/?status=new&search=Constitutional')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        for action, status in [('select', 'selected'), ('dismiss', 'dismissed')]:
            response = self.client.post(self.url + action + '/', {}, format='json')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['status'], status)
        self.assertEqual(self.client.get('/api/news/leads/?status=assigned').status_code, 400)
        self.assertEqual(self.client.get('/api/news/leads/?status=new').data['count'], 0)

    def test_removed_membership_revokes_same_token(self):
        self.authenticate()
        self.user.groups.clear()
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.assertEqual(self.client.post(self.url + 'select/', {}, format='json').status_code, 403)

    def test_reader_author_and_staff_do_not_gain_inbox_access(self):
        self.authenticate()
        self.user.groups.clear()
        self.user.is_staff = True
        self.user.save()
        for name in ('Reader', 'Author'):
            self.user.groups.set([Group.objects.get(name=name)])
            self.assertEqual(self.client.get(self.url).status_code, 403)
        # Author membership still works independently in user management.
        from apps.users.access import eligible_author
        self.assertTrue(eligible_author(self.user))

    def test_view_grant_does_not_allow_review(self):
        self.user.groups.clear()
        self.user.user_permissions.add(Permission.objects.get(content_type__app_label='news', codename='view_lead'))
        self.authenticate()
        self.assertEqual(self.client.get(self.url).status_code, 200)
        self.assertEqual(self.client.post(self.url + 'select/', {}, format='json').status_code, 403)

    def test_metadata_cannot_be_changed_and_retired_endpoints_are_gone(self):
        self.authenticate()
        self.assertEqual(self.client.patch(self.url, {'title': 'Changed'}, format='json').status_code, 405)
        for payload in ({'title': 'Changed'}, [], {'status': 'assigned'}):
            self.assertEqual(self.client.post(self.url + 'select/', payload, format='json').status_code, 400)
        for path in ('assignments/', 'sources/', 'topic-rules/', f'leads/{self.lead.pk}/assign/'):
            self.assertEqual(self.client.get('/api/news/' + path).status_code, 404)

    def test_admin_uses_same_review_permission(self):
        request = RequestFactory().get('/admin/news/lead/')
        request.user = self.user
        model_admin = admin.site._registry[Lead]
        self.assertTrue(model_admin.has_view_permission(request))
        self.assertTrue(model_admin.has_change_permission(request))
        self.assertFalse(model_admin.has_add_permission(request))
        self.assertFalse(model_admin.has_delete_permission(request))
        self.user.groups.clear()
        self.assertFalse(model_admin.has_change_permission(request))


class UpgradeTests(TransactionTestCase):
    def test_existing_database_preserves_kenya_law_and_discards_retired_data(self):
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes('news')
        executor.migrate([('news', '0006_simplify_news_mvp')])
        # Migration 0006 is deliberately irreversible. Build the previous schema
        # from scratch for this isolated migration test, then restore latest.
        executor.migrate([('news', None)], fake=True)
        with connection.schema_editor() as schema:
            schema.delete_model(Lead)
        executor = MigrationExecutor(connection)
        executor.migrate([('news', '0005_news_groups')])
        old = executor.loader.project_state([('news', '0005_news_groups')]).apps
        Source = old.get_model('news', 'Source')
        OldLead = old.get_model('news', 'Lead')
        law = Source.objects.create(slug='kenya-law', name='Kenya Law', feed_url='https://new.kenyalaw.org/feeds/judgments.xml')
        other = Source.objects.create(slug='judiciary', name='Judiciary', feed_url='https://judiciary.go.ke/feed/')
        values = dict(external_id='shared-id', title='Existing', original_url='https://new.kenyalaw.org/akn/ke/judgment/1', last_seen=timezone.now(), fingerprint='old')
        kept = OldLead.objects.create(source=law, status='assigned', **values)
        removed = OldLead.objects.create(source=other, **values)
        old.get_model('news', 'EditorialEvent').objects.create(lead=removed, actor_name='editor', action='select')
        try:
            executor = MigrationExecutor(connection)
            executor.migrate([('news', '0006_simplify_news_mvp')])
            self.assertEqual(list(Lead.objects.values_list('pk', 'status')), [(kept.pk, 'selected')])
            self.assertFalse(Permission.objects.filter(content_type__app_label='news', codename='assign_lead').exists())
            self.assertTrue(Group.objects.get(name='Editor').permissions.filter(codename='review_lead').exists())
        finally:
            MigrationExecutor(connection).migrate(latest)


class DashboardTests(TestCase):
    def setUp(self):
        from apps.news.models import Category, Story
        self.Story = Story
        User = get_user_model()
        self.author = User.objects.create_user(username='writer', email='writer@test.local', password='Writer-pass-813!')
        self.author.groups.add(Group.objects.get(name='Author'))
        self.other = User.objects.create_user(username='other', email='other@test.local')
        self.other.groups.add(Group.objects.get(name='Author'))
        self.editor = User.objects.create_user(username='reviewer', email='reviewer@test.local')
        self.editor.groups.add(Group.objects.get(name='Editor'))
        self.category = Category.objects.create(name='Courts')
        self.client = APIClient()
        self.base = '/api/news/stories/'
        self.payload = {'title': 'Court report', 'content': 'Full report', 'category': self.category.pk}

    def create_story(self):
        self.client.force_authenticate(self.author)
        response = self.client.post(self.base, self.payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['author'], self.author.pk)
        return f"{self.base}{response.data['id']}/"

    def test_author_crud_and_ownership(self):
        url = self.create_story()
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.patch(url, {'title': 'Updated'}, format='json').status_code, 200)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(self.base).data['count'], 0)
        for response in (self.client.get(url), self.client.patch(url, {'title': 'Stolen'}, format='json'),
                         self.client.delete(url), self.client.post(url + 'submit/', {}, format='json')):
            self.assertEqual(response.status_code, 404)
        self.client.force_authenticate(self.editor)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.client.force_authenticate(self.author)
        self.assertEqual(self.client.delete(url).status_code, 204)

    def test_submit_reject_revise_resubmit_approve(self):
        url = self.create_story()
        self.assertEqual(self.client.post(url + 'submit/', {}, format='json').data['status'], 'submitted')
        self.assertEqual(self.client.patch(url, {'title': 'Late edit'}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(url).status_code, 403)
        self.assertEqual(self.client.post(url + 'approve/', {}, format='json').status_code, 403)
        self.assertEqual(self.client.post(url + 'submit/', {}, format='json').status_code, 400)
        self.client.force_authenticate(self.editor)
        self.assertEqual(self.client.patch(url, {'content': 'Edited report'}, format='json').status_code, 200)
        self.assertEqual(self.client.post(url + 'reject/', {}, format='json').status_code, 400)
        response = self.client.post(url + 'reject/', {'feedback': 'Add sources'}, format='json')
        self.assertEqual(response.data['status'], 'rejected')
        self.assertEqual(response.data['reviewer'], self.editor.pk)
        self.client.force_authenticate(self.author)
        self.assertEqual(self.client.patch(url, {'content': 'Report with sources'}, format='json').status_code, 200)
        response = self.client.post(url + 'submit/', {}, format='json')
        self.assertEqual(response.data['feedback'], '')
        self.assertIsNone(response.data['reviewer'])
        self.client.force_authenticate(self.editor)
        self.assertEqual(self.client.post(url + 'approve/', {}, format='json').data['status'], 'approved')
        self.assertEqual(self.client.post(url + 'reject/', {'feedback': 'Again'}, format='json').status_code, 400)
        self.assertEqual(self.client.patch(url, {'title': 'Changed'}, format='json').status_code, 403)

    def test_workflow_fields_cannot_be_forged(self):
        self.client.force_authenticate(self.author)
        for field, value in [('author', self.other.pk), ('status', 'approved'), ('reviewer', self.editor.pk), ('feedback', 'Fake')]:
            self.assertEqual(self.client.post(self.base, {**self.payload, field: value}, format='json').status_code, 400)
        url = self.create_story()
        self.assertEqual(self.client.patch(url, {'status': 'approved'}, format='json').status_code, 400)
        self.author.groups.add(Group.objects.get(name='Editor'))
        self.client.post(url + 'submit/', {}, format='json')
        self.assertEqual(self.client.post(url + 'approve/', {}, format='json').status_code, 403)

    def test_categories_and_protected_deletion(self):
        self.client.force_authenticate(self.author)
        url = '/api/news/categories/'
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.post(url, {'name': 'Writer topics'}, format='json').status_code, 201)
        self.assertEqual(self.client.patch(f'{url}{self.category.pk}/', {'name': 'Renamed'}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(f'{url}{self.category.pk}/').status_code, 403)
        self.create_story()
        self.client.force_authenticate(self.editor)
        response = self.client.post(url, {'name': 'Politics'}, format='json')
        self.assertEqual(response.status_code, 201)
        detail = f"{url}{response.data['id']}/"
        self.assertEqual(self.client.patch(detail, {'name': 'Governance'}, format='json').status_code, 200)
        self.assertEqual(self.client.delete(detail).status_code, 204)
        self.assertEqual(self.client.delete(f'{url}{self.category.pk}/').status_code, 400)

    def test_jwt_access_and_live_revocation(self):
        self.assertEqual(self.client.get(self.base).status_code, 401)
        response = self.client.post('/api/users/login/', {'username': 'writer', 'password': 'Writer-pass-813!'}, format='json')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])
        self.assertEqual(self.client.get(self.base).status_code, 200)
        self.assertEqual(self.client.get(self.base + '?status=invalid').status_code, 400)
        self.author.groups.clear()
        self.assertEqual(self.client.get(self.base).status_code, 403)
        self.author.groups.add(Group.objects.get(name='Reader'))
        self.author.is_staff = True
        self.author.save()
        self.assertEqual(self.client.get(self.base).status_code, 403)

    def test_dashboard_capabilities_follow_live_permissions(self):
        url = '/api/news/dashboard/'
        self.assertEqual(self.client.get(url).status_code, 401)
        self.client.force_authenticate(self.author)
        self.assertEqual(self.client.get(url).data, {
            'id': self.author.pk, 'username': 'writer', 'can_write': True, 'can_review': False,
        })
        self.client.force_authenticate(self.editor)
        self.assertEqual(self.client.get(url).data['can_write'], False)
        self.assertEqual(self.client.get(url).data['can_review'], True)
        self.editor.groups.clear()
        self.assertEqual(self.client.get(url).status_code, 403)

    def test_writer_editor_and_conflicting_accounts_cannot_overlap(self):
        """Keep account credentials tied to one news role, including administrators."""
        self.client.force_authenticate(self.editor)
        self.assertEqual(self.client.post(self.base, self.payload, format='json').status_code, 403)
        self.client.force_authenticate(self.author)
        self.author.groups.add(Group.objects.get(name='Editor'))
        self.assertEqual(self.client.get('/api/news/dashboard/').status_code, 403)
        self.assertEqual(self.client.get(self.base).status_code, 403)
        self.assertEqual(self.client.post('/api/news/categories/', {'name': 'Conflict'}, format='json').status_code, 403)
        self.author.groups.remove(Group.objects.get(name='Editor'))
        self.assertEqual(self.client.get('/api/news/dashboard/').data['can_review'], False)
        self.editor.is_superuser = True
        self.editor.save()
        self.client.force_authenticate(self.editor)
        response = self.client.get('/api/news/dashboard/')
        self.assertEqual(response.data['can_write'], False)
        self.assertEqual(response.data['can_review'], True)
        self.assertEqual(self.client.post(self.base, self.payload, format='json').status_code, 403)


class RichNewsTests(TestCase):
    """Exercise formatted stories, validated uploads, and private image access."""

    def setUp(self):
        """Reuse role fixtures and isolate uploaded files from local app data."""
        import tempfile
        from django.core.files.storage import FileSystemStorage
        from apps.news.models import NewsImage
        DashboardTests.setUp(self)
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        field = NewsImage._meta.get_field('file')
        old_storage = field.storage
        field.storage = FileSystemStorage(location=directory.name)
        self.addCleanup(setattr, field, 'storage', old_storage)

    def image_file(self, name='photo.png', image_format='PNG'):
        """Generate a real raster image to test decoding and re-encoding."""
        from io import BytesIO
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile
        output = BytesIO()
        Image.new('RGB', (16, 12), '#246789').save(output, format=image_format)
        return SimpleUploadedFile(name, output.getvalue(), content_type='image/' + image_format.lower())

    def upload(self, user=None):
        """Upload a private image through the same multipart route as the UI."""
        self.client.force_authenticate(user or self.author)
        response = self.client.post('/api/news/images/', {'file': self.image_file()}, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_supported_formatting_is_preserved_and_active_html_is_removed(self):
        """Keep editorial formatting without scripts, handlers, or dangerous links."""
        self.client.force_authenticate(self.author)
        content = '<h2>Headline</h2><p><strong>Bold</strong> <em>italic</em> <u>underlined</u></p><ul><li>Item</li></ul><blockquote>Quote</blockquote><p><a href="https://example.com">Source</a></p><script>alert(1)</script><p onclick="evil()" style="color:red"><a href="javascript:evil()">bad</a></p>'
        response = self.client.post(self.base, {**self.payload, 'content': content}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        stored = response.data['content']
        for expected in ('<h2>', '<strong>', '<em>', '<u>', '<ul>', '<blockquote>', 'href="https://example.com"'):
            self.assertIn(expected, stored)
        for forbidden in ('<script', 'onclick', 'style=', 'javascript:'):
            self.assertNotIn(forbidden, stored)
        for empty in ('<p><br></p>', '<p>&nbsp;</p>'):
            self.assertEqual(self.client.post(self.base, {**self.payload, 'content': empty}, format='json').status_code, 400)

    def test_upload_formats_and_invalid_files(self):
        """Reject oversized, corrupt, and vector uploads; normalize raster bytes."""
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.assertEqual(self.client.post('/api/news/images/', {'file': self.image_file()}, format='multipart').status_code, 401)
        self.client.force_authenticate(self.author)
        for image_format in ('PNG', 'JPEG', 'WEBP'):
            response = self.client.post('/api/news/images/', {'file': self.image_file(image_format=image_format)}, format='multipart')
            self.assertEqual(response.status_code, 201)
            streamed = self.client.get(response.data['url'])
            self.assertEqual(streamed.status_code, 200)
            self.assertEqual(streamed['Content-Type'], 'image/webp')
            self.assertEqual(streamed['Cache-Control'], 'private, no-store')
            self.assertTrue(b''.join(streamed.streaming_content))
        for data in (b'not an image', b'<svg xmlns="http://www.w3.org/2000/svg"></svg>', b'x' * (5 * 1024 * 1024 + 1)):
            file = SimpleUploadedFile('fake.png', data, content_type='image/png')
            self.assertEqual(self.client.post('/api/news/images/', {'file': file}, format='multipart').status_code, 400)

    def test_featured_inline_images_persist_and_follow_story_permissions(self):
        """Drafts stay private; the editor receives image access after submission."""
        image = self.upload()
        content = f'<p>Report</p><figure><img src="{image["url"]}" alt="Court building"><figcaption>Photo credit</figcaption></figure>'
        payload = {**self.payload, 'content': content, 'featured_image': image['id'], 'featured_image_alt': 'Court building', 'featured_image_caption': 'Photo credit'}
        response = self.client.post(self.base, payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['featured_image_url'], image['url'])
        url = f'{self.base}{response.data["id"]}/'
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(image['url']).status_code, 404)
        self.assertEqual(self.client.post(self.base, payload, format='json').status_code, 400)
        self.client.force_authenticate(self.editor)
        self.assertEqual(self.client.get(image['url']).status_code, 404)
        self.client.force_authenticate(self.author)
        self.assertEqual(self.client.post(url + 'submit/', {}, format='json').status_code, 200)
        self.client.force_authenticate(self.editor)
        response = self.client.get(image['url'])
        self.assertEqual(response.status_code, 200)
        self.assertTrue(b''.join(response.streaming_content))
        replacement = self.upload(self.editor)
        self.assertEqual(self.client.patch(url, {'content': '<h2>Edited</h2><p>Checked report</p>', 'featured_image': replacement['id'], 'featured_image_alt': 'New image'}, format='json').status_code, 200)
        self.assertEqual(self.client.post(url + 'approve/', {}, format='json').status_code, 200)
        self.assertEqual(self.client.patch(url, {'featured_image': None}, format='json').status_code, 403)
        self.client.force_authenticate(self.author)
        self.assertEqual(self.client.get(url).json()['featured_image'], replacement['id'])
        response = self.client.get(replacement['url'])
        self.assertEqual(response.status_code, 200)
        self.assertTrue(b''.join(response.streaming_content))

    def test_images_require_alt_text_and_cannot_be_stolen_or_hotlinked(self):
        """Only authorized uploads can be attached, with descriptive alternatives."""
        image = self.upload()
        self.assertEqual(self.client.post(self.base, {**self.payload, 'featured_image': image['id']}, format='json').status_code, 400)
        for content in (f'<p>News</p><img src="{image["url"]}">', '<p>News</p><img src="https://example.com/photo.jpg" alt="Photo">', '<p>News</p><img src="data:image/png;base64,AAA" alt="Photo">'):
            self.assertEqual(self.client.post(self.base, {**self.payload, 'content': content}, format='json').status_code, 400)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(self.base, {**self.payload, 'featured_image': image['id'], 'featured_image_alt': 'Stolen'}, format='json').status_code, 400)
        self.assertEqual(self.client.get(image['url']).status_code, 404)

    def test_rejected_story_images_can_be_replaced_or_removed(self):
        """Authors can revise image choices when a story is returned for changes."""
        image = self.upload()
        response = self.client.post(self.base, {**self.payload, 'featured_image': image['id'], 'featured_image_alt': 'Original'}, format='json')
        url = f'{self.base}{response.data["id"]}/'
        self.client.post(url + 'submit/', {}, format='json')
        self.client.force_authenticate(self.editor)
        self.client.post(url + 'reject/', {'feedback': 'Replace photo'}, format='json')
        self.client.force_authenticate(self.author)
        response = self.client.patch(url, {'featured_image': None, 'featured_image_alt': '', 'featured_image_caption': ''}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['featured_image_url'])

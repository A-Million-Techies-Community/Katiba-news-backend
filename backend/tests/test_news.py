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
            MigrationExecutor(connection).migrate([('news', '0006_simplify_news_mvp')])

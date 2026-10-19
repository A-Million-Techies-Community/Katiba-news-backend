from io import StringIO
from unittest.mock import patch
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient
from apps.users.models import User
from apps.users.access import WORKSPACE_ADMIN


class NewsroomAdminTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='newsroom-admin', email='newsroom-admin@example.test', password='Newsroom-admin-password-782!')
        self.admin.groups.add(Group.objects.get(name=WORKSPACE_ADMIN))
        self.superuser = User.objects.create_superuser(username='system-owner', email='system@example.test', password='System-owner-password-783!')

    def test_separate_admin_signs_in_without_system_privileges(self):
        response = self.client.post('/api/users/login/', {'username': self.admin.username, 'password': 'Newsroom-admin-password-782!'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])
        me = self.client.get('/api/users/me/').data
        self.assertEqual(me['role'], 'Administrator')
        self.assertEqual(me['workspace_url'], '/workspace/admin')
        self.assertFalse(me['can_review'])
        self.assertFalse(me['is_author'])
        self.assertFalse(self.admin.is_staff)
        self.assertFalse(self.admin.is_superuser)
        self.assertEqual(self.client.get('/api/users/accounts/').status_code, 200)
        self.assertEqual(self.client.get('/api/users/staff-applications/review/').status_code, 200)
        self.assertEqual(self.client.get('/api/news/stories/').status_code, 403)
        self.client.force_login(self.admin)
        self.assertEqual(self.client.get('/admin/').status_code, 302)

    def test_newsroom_admin_cannot_manage_admin_or_superuser_accounts(self):
        self.client.force_authenticate(self.admin)
        for target in [self.admin, self.superuser]:
            response = self.client.patch(f'/api/users/accounts/{target.pk}/', {'is_active': False, 'newsroom_role': 'Author'}, format='json')
            self.assertEqual(response.status_code, 400)
            target.refresh_from_db()
            self.assertTrue(target.is_active)
        accounts = self.client.get('/api/users/accounts/').data
        self.assertNotIn(self.admin.pk, [item['id'] for item in accounts])
        self.assertNotIn(self.superuser.pk, [item['id'] for item in accounts])
        for extra in [{'is_superuser': True}, {'is_staff': True}, {'newsroom_role': 'Administrator'}, {'groups': [WORKSPACE_ADMIN]}]:
            response = self.client.post('/api/users/accounts/', {'username': 'escalation', 'email': 'escalation@example.test', 'password': 'Escalation-test-password-784!', 'newsroom_role': 'Author', **extra}, format='json')
            self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='escalation').exists())

    def test_superuser_has_separate_destination(self):
        self.client.force_authenticate(self.superuser)
        me = self.client.get('/api/users/me/').data
        self.assertEqual(me['role'], 'Superuser')
        self.assertEqual(me['workspace_url'], '/admin/')

    def test_removed_admin_membership_and_suspension_revoke_management(self):
        self.client.force_authenticate(self.admin)
        self.admin.groups.clear()
        self.assertEqual(self.client.get('/api/users/accounts/').status_code, 403)
        self.admin.groups.add(Group.objects.get(name=WORKSPACE_ADMIN))
        self.admin.is_active = False
        self.admin.save()
        self.assertEqual(self.client.get('/api/users/accounts/').status_code, 403)

    def test_createadmin_command_creates_only_newsroom_admin(self):
        with patch('apps.users.management.commands.createadmin.getpass', return_value='New-admin-password-942!'):
            call_command('createadmin', username='new-newsroom-admin', email='newadmin@example.test', stdout=StringIO())
        account = User.objects.get(username='new-newsroom-admin')
        self.assertTrue(account.check_password('New-admin-password-942!'))
        self.assertEqual(list(account.groups.values_list('name', flat=True)), [WORKSPACE_ADMIN])
        self.assertFalse(account.is_staff)
        self.assertFalse(account.is_superuser)

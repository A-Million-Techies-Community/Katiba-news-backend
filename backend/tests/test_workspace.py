"""Staff provisioning belongs to administrators; readers need no account."""
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient
from apps.users.models import User


class StaffAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin', email='admin@example.test', password='Administrator-password-829!')
        self.writer = User.objects.create_user(username='writer', email='writer@example.test')
        self.writer.groups.add(Group.objects.get(name='Author'))
        self.editor = User.objects.create_user(username='editor', email='editor@example.test')
        self.editor.groups.add(Group.objects.get(name='Editor'))

    def test_public_signup_and_application_endpoints_are_removed(self):
        for path in ['register/', 'contributor-application/', 'applications/']:
            self.assertEqual(self.client.post('/api/users/' + path, {}, format='json').status_code, 404)

    def test_only_admin_can_manage_writers_and_editors(self):
        self.assertEqual(self.client.get('/api/users/accounts/').status_code, 401)
        for actor in [self.writer, self.editor]:
            self.client.force_authenticate(actor)
            self.assertEqual(self.client.get('/api/users/accounts/').status_code, 403)
            self.assertEqual(self.client.patch(f'/api/users/accounts/{self.writer.pk}/', {'newsroom_role': 'Editor'}, format='json').status_code, 403)
        self.client.force_authenticate(self.admin)
        for role in ['Author', 'Editor']:
            response = self.client.post('/api/users/accounts/', {'username': 'new-' + role.lower(), 'email': 'new-' + role.lower() + '@example.test', 'password': 'New-staff-password-924!', 'newsroom_role': role}, format='json')
            self.assertEqual(response.status_code, 201, response.data)
            user = User.objects.get(pk=response.data['id'])
            self.assertTrue(user.groups.filter(name=role).exists())
            self.assertFalse(user.is_superuser)
            self.assertFalse(user.is_staff)
        response = self.client.patch(f'/api/users/accounts/{self.writer.pk}/', {'newsroom_role': 'Reader'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_server_directs_each_role_to_its_workspace(self):
        for actor, destination in [(self.admin, '/workspace/admin'), (self.writer, '/author/complete-profile'), (self.editor, '/news/dashboard/editor')]:
            self.client.force_authenticate(actor)
            self.assertEqual(self.client.get('/api/users/me/').data['workspace_url'], destination)

    def test_admin_can_suspend_editor_and_change_writer_access(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f'/api/users/accounts/{self.editor.pk}/', {'is_active': False}, format='json')
        self.assertEqual(response.status_code, 200)
        self.editor.refresh_from_db()
        self.assertFalse(self.editor.is_active)
        response = self.client.patch(f'/api/users/accounts/{self.writer.pk}/', {'newsroom_role': 'Editor'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.writer.refresh_from_db()
        self.assertEqual(list(self.writer.groups.values_list('name', flat=True)), ['Editor'])
        self.assertGreater(self.writer.auth_version, 0)

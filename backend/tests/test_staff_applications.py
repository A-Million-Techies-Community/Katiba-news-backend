from django.contrib.auth.models import Group
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from apps.users.models import User, StaffApplication


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class StaffApplicationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.admin = User.objects.create_user(username='application-admin', email='admin@example.test', password='Admin-password-924!')
        self.admin.groups.add(Group.objects.get(name='Workspace Administrator'))

    def payload(self, role='Writer'):
        return {'username': 'new-' + role.lower(), 'email': role.lower() + '@example.test', 'first_name': 'New', 'last_name': role,
                'password': 'Application-password-925!', 'requested_role': role,
                'experience': 'Several years of reporting and editing verified stories about public policy.', 'portfolio_url': 'https://example.test/work'}

    def apply(self, role='Writer'):
        result = self.client.post('/api/users/staff-applications/', self.payload(role), format='json')
        self.assertEqual(result.status_code, 201, result.data)
        self.assertNotIn('access', result.data)
        return StaffApplication.objects.get(requested_role=role)

    def login(self, role='Writer'):
        data = self.payload(role)
        return self.client.post('/api/users/login/', {'username': data['username'], 'password': data['password']}, format='json')

    def test_pending_applications_have_no_login_or_permissions(self):
        for role in ['Writer', 'Editor']:
            application = self.apply(role)
            account = application.user
            self.assertFalse(account.is_active)
            self.assertFalse(account.is_staff)
            self.assertFalse(account.is_superuser)
            self.assertFalse(account.groups.exists())
            self.assertFalse(account.user_permissions.exists())
            self.assertTrue(account.check_password(self.payload(role)['password']))
            self.assertEqual(self.login(role).status_code, 401)
        self.assertEqual(self.client.get('/api/users/staff-applications/').status_code, 405)
        self.assertEqual(self.client.get('/api/users/staff-applications/review/').status_code, 401)

    def test_approval_assigns_exact_role_and_emails_correct_sign_in(self):
        for role, group, login_path, destination in [('Writer', 'Author', '/writer/login', '/author/complete-profile'), ('Editor', 'Editor', '/editor/login', '/news/dashboard/editor')]:
            application = self.apply(role)
            self.client.force_authenticate(self.admin)
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(f'/api/users/staff-applications/{application.pk}/decision/', {'decision': 'approved'}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
            application.refresh_from_db()
            account = User.objects.get(pk=application.user_id)
            self.assertTrue(account.is_active)
            self.assertEqual(list(account.groups.values_list('name', flat=True)), [group])
            self.assertFalse(account.is_staff)
            self.assertFalse(account.is_superuser)
            self.assertEqual(application.reviewer_id, self.admin.pk)
            self.assertIsNotNone(application.reviewed_at)
            self.assertIn(login_path, mail.outbox[-1].body)
            self.assertNotIn(self.payload(role)['password'], mail.outbox[-1].body)
            self.client.force_authenticate(user=None)
            tokens = self.login(role)
            self.assertEqual(tokens.status_code, 200)
            self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + tokens.data['access'])
            self.assertEqual(self.client.get('/api/users/me/').data['workspace_url'], destination)
            self.client.credentials()
            self.client.force_authenticate(self.admin)
            self.assertEqual(self.client.post(f'/api/users/staff-applications/{application.pk}/decision/', {'decision': 'approved'}, format='json').status_code, 400)
            self.client.force_authenticate(user=None)

    def test_rejection_requires_feedback_and_preserves_disabled_account(self):
        application = self.apply('Editor')
        url = f'/api/users/staff-applications/{application.pk}/decision/'
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(url, {'decision': 'rejected'}, format='json').status_code, 400)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(url, {'decision': 'rejected', 'feedback': 'Please provide more editing experience.'}, format='json')
        self.assertEqual(response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.status, 'rejected')
        self.assertFalse(application.user.is_active)
        self.assertFalse(application.user.groups.exists())
        self.assertIn('Please provide more editing experience.', mail.outbox[-1].body)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.login('Editor').status_code, 401)

    def test_only_admin_can_view_or_decide(self):
        application = self.apply()
        url = f'/api/users/staff-applications/{application.pk}/decision/'
        self.assertEqual(self.client.post(url, {'decision': 'approved'}, format='json').status_code, 401)
        for group in ['Author', 'Editor']:
            user = User.objects.create_user(username='existing-' + group, email=group+'@example.test')
            user.groups.add(Group.objects.get(name=group))
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get('/api/users/staff-applications/review/').status_code, 403)
            self.assertEqual(self.client.post(url, {'decision': 'approved'}, format='json').status_code, 403)
        application.refresh_from_db()
        self.assertEqual(application.status, 'pending')

    def test_public_cannot_set_status_or_grant_privileges(self):
        for changes in [{'is_superuser': True}, {'status': 'approved'}, {'requested_role': 'Administrator'}, {'password': 'password'}]:
            response = self.client.post('/api/users/staff-applications/', {**self.payload(), **changes}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(StaffApplication.objects.exists())
        self.assertFalse(User.objects.filter(username='new-writer').exists())

    def test_duplicate_application_and_manual_activation_cannot_bypass_review(self):
        application = self.apply()
        self.assertEqual(self.client.post('/api/users/staff-applications/', self.payload(), format='json').status_code, 400)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f'/api/users/accounts/{application.user_id}/', {'is_active': True, 'newsroom_role': 'Editor'}, format='json')
        self.assertEqual(response.status_code, 400)
        ids = [account['id'] for account in self.client.get('/api/users/accounts/').data]
        self.assertNotIn(application.user_id, ids)
        application.user.refresh_from_db()
        self.assertFalse(application.user.is_active)

    def test_public_submission_is_rate_limited(self):
        for _ in range(5):
            self.assertEqual(self.client.post('/api/users/staff-applications/', {}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/users/staff-applications/', {}, format='json').status_code, 429)

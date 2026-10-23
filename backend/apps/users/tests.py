from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.admin.sites import site
from .models import User


class RegistrationRoleTests(TestCase):
    def test_public_signup_is_disabled(self):
        response = APIClient().post('/api/users/register/', {'username': 'visitor', 'password': 'Testing-password-123'}, format='json')
        self.assertEqual(response.status_code, 404)
        self.assertFalse(User.objects.exists())

    def test_only_superusers_can_administer_accounts(self):
        from django.test import RequestFactory
        editor = User.objects.create_user(username='editor', email='editor@example.org', role='EDITOR', is_staff=True)
        request = RequestFactory().get('/admin/users/user/')
        request.user = editor
        self.assertFalse(site._registry[User].has_change_permission(request, editor))
        editor.is_superuser = True
        self.assertTrue(site._registry[User].has_change_permission(request, editor))


class AuthenticationLifecycleTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(username='lifecycle', email='life@example.org', password='A-strong-Original-734!')

    def login(self):
        result = self.client.post('/api/users/login/', {'username': 'lifecycle', 'password': 'A-strong-Original-734!'}, format='json')
        self.assertEqual(result.status_code, 200)
        return result.data

    def test_refresh_rotation_and_logout_revoke_access_and_refresh(self):
        tokens = self.login()
        rotated = self.client.post('/api/users/token/refresh/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(rotated.status_code, 200)
        self.assertEqual(self.client.post('/api/users/token/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + rotated.data['access'])
        self.assertEqual(self.client.get('/api/users/me/').status_code, 200)
        self.assertEqual(self.client.post('/api/users/logout/').status_code, 204)
        self.assertEqual(self.client.get('/api/users/me/').status_code, 401)
        self.client.credentials()
        self.assertEqual(self.client.post('/api/users/token/refresh/', {'refresh': rotated.data['refresh']}, format='json').status_code, 401)

    def test_deactivation_rejects_login_access_and_refresh(self):
        tokens = self.login()
        self.user.is_active = False
        self.user.save()
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + tokens['access'])
        self.assertEqual(self.client.get('/api/users/me/').status_code, 401)
        self.client.credentials()
        self.assertEqual(self.client.post('/api/users/token/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)
        self.assertEqual(self.client.post('/api/users/login/', {'username': 'lifecycle', 'password': 'A-strong-Original-734!'}, format='json').status_code, 401)

    def test_password_recovery_is_private_single_use_and_revokes_tokens(self):
        from django.test import override_settings
        from django.core import mail
        import re
        tokens = self.login()
        with override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'):
            known = self.client.post('/api/users/password-reset/', {'email': 'life@example.org'}, format='json')
            unknown = self.client.post('/api/users/password-reset/', {'email': 'missing@example.org'}, format='json')
        self.assertEqual(known.data, unknown.data)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0].body
        uid = re.search(r'Account reference: (\S+)', message)[1]
        token = re.search(r'Recovery code: (\S+)', message)[1]
        payload = {'uid': uid, 'token': token, 'password': 'A-new-Recovery-pass-941!'}
        self.assertEqual(self.client.post('/api/users/password-reset/confirm/', payload, format='json').status_code, 200)
        self.assertEqual(self.client.post('/api/users/password-reset/confirm/', payload, format='json').status_code, 400)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + tokens['access'])
        self.assertEqual(self.client.get('/api/users/me/').status_code, 401)
        self.client.credentials()
        self.assertEqual(self.client.post('/api/users/token/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(payload['password']))

    def test_invalid_recovery_payloads_fail_without_server_error(self):
        for payload in ({'uid': '%%%','token': 'bad','password': 'Strong-password-421'},
                        {'uid': [], 'token': [], 'password': 'Strong-password-421'}, []):
            self.assertEqual(self.client.post('/api/users/password-reset/confirm/', payload, format='json').status_code, 400)

    def test_expired_recovery_code_and_inactive_recovery(self):
        from datetime import datetime, timedelta
        from unittest.mock import patch
        from django.test import override_settings
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.core import mail
        with patch.object(default_token_generator, '_now', return_value=datetime.now()-timedelta(hours=2)):
            token = default_token_generator.make_token(self.user)
        payload = {'uid': urlsafe_base64_encode(force_bytes(self.user.pk)), 'token': token, 'password': 'Another-strong-password-712!'}
        self.assertEqual(self.client.post('/api/users/password-reset/confirm/', payload, format='json').status_code, 400)
        self.user.is_active = False
        self.user.save()
        with override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'):
            # Initialise an empty outbox without sending a message.
            from django.core.mail import get_connection
            get_connection()
            before = len(mail.outbox)
            response = self.client.post('/api/users/password-reset/', {'email': self.user.email}, format='json')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(mail.outbox), before)

    def test_group_privileges_cannot_be_changed_by_news_administrators(self):
        from django.contrib.auth.models import Group
        from django.test import RequestFactory
        user = User.objects.create_user(username='news-admin', email='na@example.org', is_staff=True)
        user.groups.add(Group.objects.get(name='News Administrator'))
        request = RequestFactory().post('/admin/auth/group/')
        request.user = user
        self.assertFalse(site._registry[Group].has_change_permission(request))
        self.assertFalse(site._registry[User].has_change_permission(request))

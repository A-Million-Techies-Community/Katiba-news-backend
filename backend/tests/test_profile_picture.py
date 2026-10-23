import shutil
import tempfile
from io import BytesIO
from PIL import Image
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from apps.users.models import AuthorProfile


def photo(name='portrait.png', format='PNG'):
    buffer = BytesIO()
    Image.new('RGB', (32, 32), 'green').save(buffer, format=format)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=f'image/{format.lower()}')


class ProfilePictureTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.media_root = tempfile.mkdtemp()
        cls.settings_override = override_settings(MEDIA_ROOT=cls.media_root)
        cls.settings_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.settings_override.disable()
        shutil.rmtree(cls.media_root)
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.writer = User.objects.create_user(username='writer', email='writer@example.com')
        self.writer.groups.add(Group.objects.get(name='Author'))
        self.editor = User.objects.create_user(username='editor', email='editor@example.com')
        self.editor.groups.add(Group.objects.get(name='Editor'))
        self.reader = User.objects.create_user(username='reader', email='reader@example.com')
        self.url = '/api/users/me/photo/'

    def test_upload_is_persisted_and_visible_in_account_and_profile(self):
        self.client.force_authenticate(self.writer)
        response = self.client.put(self.url, {'profile_picture': photo()}, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        url = response.data['profile_picture_url']
        self.assertTrue(url.startswith(f'/media/profiles/{self.writer.pk}/'))
        profile = AuthorProfile.objects.get(user=self.writer)
        self.assertTrue(profile.profile_picture.storage.exists(profile.profile_picture.name))
        self.assertFalse(profile.onboarding_complete)
        self.assertEqual(self.client.get('/api/users/me/').data['profile_picture_url'], url)
        self.assertEqual(self.client.get('/api/users/author/profile/').data['profile_picture_url'], url)

    def test_editor_can_upload_and_remove_own_photo(self):
        self.client.force_authenticate(self.editor)
        response = self.client.put(self.url, {'profile_picture': photo()}, format='multipart')
        self.assertEqual(response.status_code, 200)
        profile = AuthorProfile.objects.get(user=self.editor)
        name, storage = profile.profile_picture.name, profile.profile_picture.storage
        self.assertEqual(self.client.delete(self.url).status_code, 200)
        profile.refresh_from_db()
        self.assertFalse(profile.profile_picture)
        self.assertFalse(storage.exists(name))
        self.assertIsNone(self.client.get('/api/users/me/').data['profile_picture_url'])

    def test_cannot_upload_for_another_user_or_complete_onboarding(self):
        self.client.force_authenticate(self.writer)
        response = self.client.put(self.url, {'profile_picture': photo(), 'user': self.editor.pk, 'onboarding_complete': True}, format='multipart')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(AuthorProfile.objects.filter(user=self.editor).exists())
        self.assertFalse(AuthorProfile.objects.get(user=self.writer).onboarding_complete)

    def test_anonymous_reader_and_inactive_accounts_cannot_upload(self):
        self.assertEqual(self.client.put(self.url, {'profile_picture': photo()}, format='multipart').status_code, 401)
        self.client.force_authenticate(self.reader)
        self.assertEqual(self.client.put(self.url, {'profile_picture': photo()}, format='multipart').status_code, 403)
        self.writer.is_active = False
        self.writer.save()
        self.client.force_authenticate(self.writer)
        self.assertEqual(self.client.put(self.url, {'profile_picture': photo()}, format='multipart').status_code, 403)

    def test_invalid_unsupported_missing_and_oversized_files_are_rejected(self):
        self.client.force_authenticate(self.writer)
        for file in [SimpleUploadedFile('fake.png', b'not an image'), photo('animated.gif', 'GIF')]:
            self.assertEqual(self.client.put(self.url, {'profile_picture': file}, format='multipart').status_code, 400)
        self.assertEqual(self.client.put(self.url, {}, format='multipart').status_code, 400)
        valid = photo()
        oversized = SimpleUploadedFile('large.png', valid.read() + b'0' * (5 * 1024 * 1024))
        self.assertEqual(self.client.put(self.url, {'profile_picture': oversized}, format='multipart').status_code, 400)
        self.assertFalse(AuthorProfile.objects.get(user=self.writer).profile_picture)

    def test_replacement_has_a_new_url(self):
        self.client.force_authenticate(self.writer)
        first = self.client.put(self.url, {'profile_picture': photo()}, format='multipart')
        old = AuthorProfile.objects.get(user=self.writer).profile_picture
        with self.captureOnCommitCallbacks(execute=True):
            second = self.client.put(self.url, {'profile_picture': photo()}, format='multipart')
        self.assertFalse(old.storage.exists(old.name))
        self.assertNotEqual(first.data['profile_picture_url'], second.data['profile_picture_url'])

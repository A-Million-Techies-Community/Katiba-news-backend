"""Create a newsroom administrator without Django superuser/staff privileges."""
from getpass import getpass
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, IntegrityError
from apps.users.models import User
from apps.users.access import WORKSPACE_ADMIN


class Command(BaseCommand):
    help = 'Create a newsroom Admin to manage Writer and Editor accounts and applications.'

    def add_arguments(self, parser):
        parser.add_argument('--username')
        parser.add_argument('--email')

    def handle(self, *args, **options):
        username = options['username'] or input('Admin username: ').strip()
        email = options['email'] or input('Email: ').strip()
        if not username or not email:
            raise CommandError('Username and email are required.')
        if User.objects.filter(username__iexact=username).exists() or User.objects.filter(email__iexact=email).exists():
            raise CommandError('This username or email already exists. No existing account was changed.')
        user = User(username=username, email=email, is_active=True, is_staff=False, is_superuser=False)
        password = getpass('Password: ')
        if password != getpass('Password (again): '):
            raise CommandError('Passwords did not match.')
        try:
            user.full_clean(exclude=['password'])
            validate_password(password, user)
        except ValidationError as error:
            raise CommandError('; '.join(error.messages))
        try:
            with transaction.atomic():
                user.set_password(password)
                user.save()
                user.groups.add(Group.objects.get(name=WORKSPACE_ADMIN))
        except IntegrityError:
            raise CommandError('This username or email already exists.')
        self.stdout.write(self.style.SUCCESS(f'Newsroom Admin "{username}" created. Sign in at /administration/login. This account has no Django admin access.'))

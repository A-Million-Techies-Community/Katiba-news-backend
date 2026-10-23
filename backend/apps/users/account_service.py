"""Administrator-managed writer and editor access."""
from django.contrib.auth.models import Group
from .models import AuthorProfile
from .access import WORKSPACE_ADMIN


def assign_newsroom_role(account, role, *, revoke=True):
    if account.is_superuser or account.groups.filter(name=WORKSPACE_ADMIN).exists() or role not in ('Author', 'Editor'):
        raise ValueError('Only ordinary accounts can be assigned a newsroom role.')
    account.groups.clear()
    account.user_permissions.clear()
    account.groups.add(Group.objects.get(name=role))
    account.is_staff = False
    if revoke:
        account.auth_version += 1
    account.save(update_fields=['is_staff', 'auth_version'])
    if role == 'Author':
        AuthorProfile.objects.get_or_create(user=account)

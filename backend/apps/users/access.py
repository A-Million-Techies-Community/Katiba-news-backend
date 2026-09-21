"""Shared authorization. Roles are legacy metadata; staff only controls admin login."""
READER = 'Reader'
AUTHOR = 'Author'
EDITOR = 'Editor'
NEWS_ADMIN = 'News Administrator'


def has_news_permission(user, codename):
    # Query current grants, avoiding stale per-instance permission caches after
    # membership changes. JWTs contain identity, never a frozen permission list.
    if not user.is_authenticated or not user.is_active:
        return False
    if user.is_superuser:
        return True
    lookup = {'content_type__app_label': 'news', 'codename': codename}
    return (user.user_permissions.filter(**lookup).exists() or
            user.groups.filter(permissions__content_type__app_label='news',
                               permissions__codename=codename).exists())


def eligible_author(user):
    return (user.is_active and user.groups.filter(name=AUTHOR).exists()
            and has_news_permission(user, 'view_assigned_lead'))

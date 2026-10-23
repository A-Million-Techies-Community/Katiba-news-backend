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
    return (user.is_authenticated and user.is_active and not user.is_superuser
            and not has_news_permission(user, 'review_lead') and user.groups.filter(name=AUTHOR).exists()
            and has_news_permission(user, 'view_assigned_lead'))


def editorial_access(user):
    return bool(user.is_authenticated and user.is_active
                and has_news_permission(user, 'review_lead')
                and not user.groups.filter(name=AUTHOR).exists()) or bool(user.is_authenticated and user.is_active and user.is_superuser)


WORKSPACE_ADMIN = 'Workspace Administrator'


def administer_newsroom(user):
    """People management is independent of editorial and Django admin access."""
    return bool(user.is_authenticated and user.is_active and
                (user.is_superuser or user.groups.filter(name=WORKSPACE_ADMIN).exists()))

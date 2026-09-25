from rest_framework.permissions import BasePermission

from .access import has_news_permission, eligible_author, READER


class IsReader(BasePermission):
    """
    Allows access only to authenticated and active users
    who belong to the Reader group.
    """

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user.is_authenticated
            and user.is_active
            and user.groups.filter(name=READER).exists()
        )


class IsAuthor(BasePermission):
    """
    Allows access only to authenticated users who are
    eligible to perform author-related actions.
    """

    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated
            and eligible_author(request.user)
        )


class IsEditor(BasePermission):
    """
    Allows access only to users who have the required
    editorial/newsroom permission.
    """

    def has_permission(self, request, view):
        return has_news_permission(request.user, "review_lead")
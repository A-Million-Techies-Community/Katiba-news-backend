from rest_framework.permissions import BasePermission
from .access import eligible_author

class IsAuthor(BasePermission):
    message = 'Writer access is required. Ask an administrator to check your membership.'

    def has_permission(self, request, view):
        return eligible_author(request.user)

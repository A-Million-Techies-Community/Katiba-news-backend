from rest_framework.permissions import BasePermission

from .models import User


class IsAuthor(BasePermission):
    message = "Author authentication is required."

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user.is_authenticated
            and user.is_active
            and user.role == User.Role.AUTHOR
        )
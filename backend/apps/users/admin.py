from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    readonly_fields = ('role',)
    fieldsets = UserAdmin.fieldsets + (
        ("Katiba News", {"fields": ("role",)}),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Katiba News", {"fields": ("email",)}),
    )

    list_display = ("username", "email", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    search_fields = ("username", "email")

    # User changes include permissions and staff status. Restrict account
    # administration to superusers to prevent delegated editors promoting peers.
    def has_add_permission(self, request):
        return request.user.is_active and request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_superuser


# Group membership and the permissions contained in groups are account privileges.
# Restrict the Group admin too; News Administrators manage content, not privileges.
from django.contrib.auth.models import Group
from django.contrib.auth.admin import GroupAdmin
admin.site.unregister(Group)


@admin.register(Group)
class RestrictedGroupAdmin(GroupAdmin):
    def has_add_permission(self, request):
        return request.user.is_active and request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_superuser

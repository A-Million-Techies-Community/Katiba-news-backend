"""Staff editors can review collected leads through Django admin."""
from django.contrib import admin
from apps.users.access import has_news_permission
from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('title', 'published_at', 'discovered_at', 'status')
    list_filter = ('status',)
    search_fields = ('title',)
    # Editors change status only; collected source attribution stays intact.
    readonly_fields = ('external_id', 'title', 'original_url', 'published_at', 'discovered_at')
    fields = (*readonly_fields, 'status')

    def has_module_permission(self, request):
        return self.has_view_permission(request)

    # Use the same live permission checks as the API. Staff status alone
    # permits admin login but does not grant access to the news inbox.
    def has_view_permission(self, request, obj=None):
        return has_news_permission(request.user, 'view_lead')

    def has_change_permission(self, request, obj=None):
        return has_news_permission(request.user, 'review_lead')

    # Metadata comes exclusively from the collector, including for superusers.
    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

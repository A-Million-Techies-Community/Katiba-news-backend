"""Staff editors can review collected leads through Django admin."""
from django.contrib import admin
from apps.users.access import has_news_permission
from .models import Category, Lead, Story


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    """Allow staff with news permissions to inspect and review collected leads."""
    list_display = ('title', 'published_at', 'discovered_at', 'status')
    list_filter = ('status',)
    search_fields = ('title',)
    # Editors change status only; collected source attribution stays intact.
    readonly_fields = ('external_id', 'title', 'original_url', 'published_at', 'discovered_at')
    fields = (*readonly_fields, 'status')

    def has_module_permission(self, request):
        """Show the lead admin section only to users who can view leads."""
        return self.has_view_permission(request)

    # Use the same live permission checks as the API. Staff status alone
    # permits admin login but does not grant access to the news inbox.
    def has_view_permission(self, request, obj=None):
        """Use the same live viewing grant as the news API."""
        return has_news_permission(request.user, 'view_lead')

    def has_change_permission(self, request, obj=None):
        """Require the news review grant to change a lead decision."""
        return has_news_permission(request.user, 'review_lead')

    # Metadata comes exclusively from the collector, including for superusers.
    def has_add_permission(self, request):
        """Keep lead creation reserved for the source collector."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Prevent collected leads from being deleted through admin."""
        return False


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Let staff editors manage the categories used by news stories."""
    list_display = ('name',)
    search_fields = ('name',)

    def has_view_permission(self, request, obj=None):
        """Require editorial access for category administration."""
        return has_news_permission(request.user, 'review_lead')

    def has_module_permission(self, request):
        """Show category administration only to authorized editors."""
        return self.has_view_permission(request)

    has_add_permission = has_view_permission
    has_change_permission = has_view_permission
    has_delete_permission = has_view_permission


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    """Inspection only: workflow mutations go through the validated news API."""
    list_display = ('title', 'author', 'category', 'status', 'updated_at')
    list_filter = ('status', 'category')
    search_fields = ('title', 'author__username')
    readonly_fields = tuple(field.name for field in Story._meta.fields)

    def get_queryset(self, request):
        """List submitted and reviewed stories while excluding private drafts."""
        return super().get_queryset(request).exclude(status=Story.Status.DRAFT)

    def has_view_permission(self, request, obj=None):
        """Require editorial access to inspect stories in admin."""
        return has_news_permission(request.user, 'review_lead')

    def has_module_permission(self, request):
        """Show story administration only to authorized editors."""
        return self.has_view_permission(request)

    def has_add_permission(self, request):
        """Require story creation through the validated dashboard API."""
        return False

    def has_change_permission(self, request, obj=None):
        """Keep story editing and review decisions in the dashboard API."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Keep ownership and status checks in the API deletion workflow."""
        return False

"""The MVP stores source metadata and one editorial decision per judgment."""
from django.db import models


class Lead(models.Model):
    class Status(models.TextChoices):
        NEW = 'new', 'New'
        SELECTED = 'selected', 'Selected'
        DISMISSED = 'dismissed', 'Dismissed'

    # Kenya Law's Atom ID is stable across repeated collections.
    external_id = models.CharField(max_length=1000, unique=True)
    title = models.TextField()
    original_url = models.URLField(max_length=1000)
    # Publication time comes from the feed; discovery time records our first import.
    published_at = models.DateTimeField(null=True, blank=True)
    discovered_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)

    class Meta:
        # The ID breaks timestamp ties so paginated results have stable ordering.
        ordering = ['-discovered_at', '-pk']
        # Keep the legacy grant used by the users app's Author membership check.
        # It does not expose any assignment endpoints in this MVP.
        permissions = [('review_lead', 'Select or dismiss source leads'),
                       ('view_assigned_lead', 'View own assigned source leads')]

    def __str__(self):
        return self.title

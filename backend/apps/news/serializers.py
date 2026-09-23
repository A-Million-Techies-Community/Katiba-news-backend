"""Source metadata is read-only; decisions use explicit API actions."""
from rest_framework import serializers
from .models import Lead


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        # Expose the local ID for API actions; keep the publisher ID internal.
        fields = ('id', 'title', 'original_url', 'published_at', 'discovered_at', 'status')
        # Reviews go through select/dismiss, never arbitrary metadata updates.
        read_only_fields = fields

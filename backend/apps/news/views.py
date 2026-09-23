"""Authenticated editor inbox; HTTP requests never trigger collection.

GET /api/news/leads/ lists metadata; append <id>/ for a single lead.
POST <id>/select/ or <id>/dismiss/ with {} changes the review decision.
Use the access token from /api/users/login/ as Authorization: Bearer <token>.
Editor grants control access; selecting a lead does not publish an article.
"""
from rest_framework import filters, serializers, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from apps.users.access import has_news_permission
from apps.users.authentication import VersionedJWTAuthentication
from .models import Lead
from .serializers import LeadSerializer


class LeadPermission(BasePermission):
    def has_permission(self, request, view):
        # Group changes take effect immediately. For unsupported methods,
        # authorize viewing first so DRF can return its normal HTTP 405.
        required = {None: 'view_lead', 'list': 'view_lead', 'retrieve': 'view_lead',
                    'metadata': 'view_lead', 'select': 'review_lead',
                    'dismiss': 'review_lead'}.get(view.action)
        return bool(required and has_news_permission(request.user, required))


class LeadPagination(PageNumberPagination):
    # Bound each response as the inbox grows; clients follow the next-page link.
    page_size = 25


class LeadViewSet(viewsets.ReadOnlyModelViewSet):
    # JWT supports API clients; session authentication supports the browsable API.
    authentication_classes = (VersionedJWTAuthentication, SessionAuthentication)
    permission_classes = (LeadPermission,)
    pagination_class = LeadPagination
    serializer_class = LeadSerializer
    queryset = Lead.objects.all()
    filter_backends = (filters.SearchFilter,)
    search_fields = ('title',)

    def get_queryset(self):
        queryset = super().get_queryset()
        status = self.request.query_params.get('status')
        # List filters must not hide a lead during a detail lookup or review action.
        if self.action == 'list' and status is not None:
            if status not in Lead.Status.values:
                raise serializers.ValidationError({'status': 'Use new, selected, or dismissed.'})
            queryset = queryset.filter(status=status)
        return queryset

    def set_status(self, request, status):
        # No arbitrary model edits: only the status named by the action changes.
        if not isinstance(request.data, dict) or request.data:
            raise serializers.ValidationError('Send an empty JSON object: {}.')
        lead = self.get_object()
        lead.status = status
        lead.save(update_fields=['status'])
        return Response(self.get_serializer(lead).data)

    @action(detail=True, methods=['post'])
    def select(self, request, pk=None):
        return self.set_status(request, Lead.Status.SELECTED)

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        return self.set_status(request, Lead.Status.DISMISSED)

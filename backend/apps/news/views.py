"""News dashboard CRUD, editorial workflow, and collected lead inbox.

GET /api/news/leads/ lists metadata; append <id>/ for a single lead.
POST <id>/select/ or <id>/dismiss/ with {} changes the review decision.
Use the access token from /api/users/login/ as Authorization: Bearer <token>.
Editor grants control access; selecting a lead does not publish an article.
"""
from django.db import transaction
from django.db.models import Q
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import filters, permissions, serializers, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.access import eligible_author, has_news_permission, editorial_access
from apps.users.authentication import VersionedJWTAuthentication
from .models import Category, Lead, NewsImage, Story
from .serializers import PublicStorySerializer, CategorySerializer, LeadSerializer, NewsImageUploadSerializer, ReviewSerializer, StorySerializer


class LeadPermission(BasePermission):
    """Map lead actions to the current user permission grants."""
    def has_permission(self, request, view):
        # Group changes take effect immediately. For unsupported methods,
        # authorize viewing first so DRF can return its normal HTTP 405.
        """Require viewing or review permission according to the requested action."""
        required = {None: 'view_lead', 'list': 'view_lead', 'retrieve': 'view_lead',
                    'metadata': 'view_lead', 'select': 'review_lead',
                    'dismiss': 'review_lead'}.get(view.action)
        return bool(required and has_news_permission(request.user, required))


class LeadPagination(PageNumberPagination):
    # Bound each response as the inbox grows; clients follow the next-page link.
    """Return up to 25 records per page for news API lists."""
    page_size = 25


class LeadViewSet(viewsets.ReadOnlyModelViewSet):
    # JWT supports API clients; session authentication supports the browsable API.
    """List source leads and allow authorized editors to select or dismiss them."""
    authentication_classes = (VersionedJWTAuthentication, SessionAuthentication)
    permission_classes = (LeadPermission,)
    pagination_class = LeadPagination
    serializer_class = LeadSerializer
    queryset = Lead.objects.all()
    filter_backends = (filters.SearchFilter,)
    search_fields = ('title',)

    def get_queryset(self):
        """Apply a validated status filter to lists without affecting detail lookups."""
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
        """Accept an empty payload and update only the lead review status."""
        if not isinstance(request.data, dict) or request.data:
            raise serializers.ValidationError('Send an empty JSON object: {}.')
        lead = self.get_object()
        lead.status = status
        lead.save(update_fields=['status'])
        return Response(self.get_serializer(lead).data)

    @action(detail=True, methods=['post'])
    def select(self, request, pk=None):
        """Mark the requested source lead as selected for editorial consideration."""
        return self.set_status(request, Lead.Status.SELECTED)

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        """Mark the requested source lead as dismissed."""
        return self.set_status(request, Lead.Status.DISMISSED)


def is_editor(user):
    """Allow review grants only when the account does not also have Author access."""
    return editorial_access(user)


def is_author(user):
    """Require Author access without editorial grants; each account has one newsroom role."""
    return (user.is_authenticated and eligible_author(user)
            and not has_news_permission(user, 'review_lead'))


class NewsroomPermission(permissions.BasePermission):
    """Restrict dashboard access to accounts with exactly one active newsroom role."""
    message = 'Use a separate Writer or Editor account. Accounts with conflicting newsroom roles cannot access this dashboard.'
    def has_permission(self, request, view):
        """Check authentication, account activity, and current newsroom access."""
        return bool(request.user.is_authenticated and request.user.is_active
                    and (is_author(request.user) or is_editor(request.user)))


class DashboardViewSet(viewsets.ModelViewSet):
    """Share authentication, permissions, and pagination across news CRUD views."""
    authentication_classes = (VersionedJWTAuthentication, SessionAuthentication)
    permission_classes = (NewsroomPermission,)
    pagination_class = LeadPagination


class CategoryViewSet(DashboardViewSet):
    """Let writers and editors create categories; editors maintain shared names."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def require_editor(self):
        """Reject category changes from users without editorial access."""
        if not is_editor(self.request.user):
            raise PermissionDenied('Only editors can manage categories.')

    def perform_create(self, serializer):
        """Allow authenticated writers and editors to add a news category."""
        serializer.save()

    def perform_update(self, serializer):
        """Save category changes after checking editor access."""
        self.require_editor()
        serializer.save()

    def perform_destroy(self, instance):
        """Delete an unused category or explain why its stories prevent deletion."""
        self.require_editor()
        try:
            instance.delete()
        except ProtectedError:
            raise serializers.ValidationError('This category is used by a news story.')


class StoryViewSet(DashboardViewSet):
    """Handle story CRUD and enforce the author-to-editor review workflow."""
    serializer_class = StorySerializer

    def get_queryset(self):
        """Limit story visibility by ownership and editorial access.

        Apply status filters to lists and lock rows during mutations where supported.
        """
        queryset = Story.objects.select_related('author', 'category', 'featured_image')
        user = self.request.user
        if is_editor(user):
            queryset = queryset.filter(Q(author=user) | ~Q(status=Story.Status.DRAFT))
        else:
            queryset = queryset.filter(author=user)
        status = self.request.query_params.get('status')
        if self.action == 'list' and status is not None:
            if status not in Story.Status.values:
                raise serializers.ValidationError({'status': 'Use draft, submitted, approved, rejected, or published.'})
            queryset = queryset.filter(status=status)
        # Serialize competing updates and review decisions on databases supporting row locks.
        if self.request.method in ('PUT', 'PATCH', 'DELETE', 'POST'):
            queryset = queryset.select_for_update(of=('self',))
        return queryset

    def perform_create(self, serializer):
        """Create a draft owned by the authenticated author."""
        if not is_author(self.request.user):
            raise PermissionDenied('Author access is required to create a story.')
        serializer.save(author=self.request.user)

    def can_edit(self, story):
        """Allow authors to edit their drafts or rejected work and editors to edit submissions."""
        user = self.request.user
        return ((story.author_id == user.pk and is_author(user)
                 and story.status in (Story.Status.DRAFT, Story.Status.REJECTED))
                or (is_editor(user) and story.status == Story.Status.SUBMITTED))

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Keep the story permission check and update in one transaction."""
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        """Save content only when ownership and workflow state allow editing."""
        if not self.can_edit(serializer.instance):
            raise PermissionDenied('Only own drafts/rejected stories or editor submissions can be edited.')
        serializer.save()

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Allow authors to delete only their own draft or rejected story."""
        story = self.get_object()
        if not (story.author_id == request.user.pk and is_author(request.user)
                and story.status in (Story.Status.DRAFT, Story.Status.REJECTED)):
            raise PermissionDenied('Only your own draft or rejected story can be deleted.')
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def submit(self, request, pk=None):
        """Submit an owned draft or rejected story and clear the previous review."""
        story = self.get_object()
        if not is_author(request.user) or story.author_id != request.user.pk:
            raise PermissionDenied('Only the author can submit this story.')
        if request.data != {}:
            raise serializers.ValidationError('Send an empty JSON object: {}.')
        if story.status not in (Story.Status.DRAFT, Story.Status.REJECTED):
            raise serializers.ValidationError('Only draft or rejected stories can be submitted.')
        story.status = Story.Status.SUBMITTED
        story.submitted_at = timezone.now()
        story.feedback = ''
        story.reviewer = None
        story.reviewed_at = None
        story.save()
        return Response(self.get_serializer(story).data)

    def review(self, request, decision):
        """Record an editor decision on a submitted story.

        Prevent self-review and require feedback when rejecting a submission.
        """
        if not is_editor(request.user):
            raise PermissionDenied('Editor access is required.')
        story = self.get_object()
        if story.author_id == request.user.pk:
            raise PermissionDenied('An editor cannot review their own story.')
        if story.status != Story.Status.SUBMITTED:
            raise serializers.ValidationError('Only submitted stories can be reviewed.')
        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        feedback = serializer.validated_data.get('feedback', '')
        if decision == Story.Status.REJECTED and not feedback:
            raise serializers.ValidationError({'feedback': 'Explain why the story was rejected.'})
        story.status = decision
        story.feedback = feedback
        story.reviewer = request.user
        story.reviewed_at = timezone.now()
        story.save()
        return Response(self.get_serializer(story).data)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def approve(self, request, pk=None):
        """Approve a submitted story without publishing it to the articles app."""
        return self.review(request, Story.Status.APPROVED)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def reject(self, request, pk=None):
        """Reject a submitted story with feedback for its author."""
        return self.review(request, Story.Status.REJECTED)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def publish(self, request, pk=None):
        if not is_editor(request.user):
            raise PermissionDenied('Editor access is required to publish.')
        story = self.get_object()
        if story.status != Story.Status.APPROVED:
            raise serializers.ValidationError('Only approved stories can be published.')
        if story.author_id == request.user.pk:
            raise PermissionDenied('You cannot publish your own story.')
        if request.data != {}:
            raise serializers.ValidationError('Send an empty JSON object.')
        story.status = Story.Status.PUBLISHED
        story.published_at = timezone.now()
        story.save(update_fields=['status', 'published_at', 'updated_at'])
        return Response(self.get_serializer(story).data)


class DashboardAccessView(APIView):
    """Expose current permissions so the frontend can choose the appropriate dashboard."""
    authentication_classes = (VersionedJWTAuthentication, SessionAuthentication)
    permission_classes = (NewsroomPermission,)

    def get(self, request):
        """Return user identity and current writer/editor dashboard capabilities."""
        return Response({
            'id': request.user.pk,
            'username': request.user.username,
            'can_write': bool(is_author(request.user)),
            'can_review': bool(is_editor(request.user)),
        })


class NewsImageUploadView(APIView):
    """Accept validated news images from authenticated writers and editors."""
    authentication_classes = (VersionedJWTAuthentication, SessionAuthentication)
    permission_classes = (NewsroomPermission,)

    def post(self, request):
        """Re-encode an upload and return its private image URL for the story editor."""
        serializer = NewsImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        image = NewsImage(uploaded_by=request.user, content_type='image/webp')
        image.file.save(f'{image.pk}.webp', serializer.validated_data['file'], save=False)
        try:
            image.save()
        except Exception:
            image.file.delete(save=False)
            raise
        return Response({'id': str(image.pk), 'url': image.api_url}, status=201)


class NewsImageView(APIView):
    """Serve image bytes only to people permitted to view the associated news story."""
    authentication_classes = (VersionedJWTAuthentication, SessionAuthentication)
    permission_classes = (permissions.AllowAny,)

    def get(self, request, pk):
        """Keep private draft images and unused uploads out of other accounts' reach."""
        images = NewsImage.objects.select_related('story')
        visible = Q(story__status=Story.Status.PUBLISHED)
        if request.user.is_authenticated:
            visible |= Q(story__author=request.user) | Q(story__isnull=True, uploaded_by=request.user)
        if is_editor(request.user):
            visible |= Q(story__isnull=False) & ~Q(story__status=Story.Status.DRAFT)
        image = get_object_or_404(images.filter(visible), pk=pk)
        response = FileResponse(image.file.open('rb'), content_type=image.content_type)
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response


class PublicStoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    serializer_class = PublicStorySerializer
    pagination_class = LeadPagination
    queryset = Story.objects.filter(status=Story.Status.PUBLISHED).select_related('author', 'category', 'featured_image')


class MediaLibrary(APIView):
    permission_classes = (NewsroomPermission,)

    def get(self, request):
        images = NewsImage.objects.filter(uploaded_by=request.user).select_related('story').order_by('-created_at')
        return Response([{'id': image.pk, 'url': image.api_url, 'story': image.story_id,
                          'created_at': image.created_at} for image in images])

    @transaction.atomic
    def delete(self, request, pk):
        image = get_object_or_404(NewsImage.objects.select_for_update(), pk=pk, uploaded_by=request.user)
        if image.story_id or image.featured_in.exists():
            raise serializers.ValidationError('Images attached to stories must be kept with their content.')
        image.delete()
        return Response(status=204)

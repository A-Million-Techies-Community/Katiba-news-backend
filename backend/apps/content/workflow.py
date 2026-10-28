"""Shared ownership, visibility and editorial lifecycle for articles and blogs."""
import json
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.access import eligible_author, editorial_access


class ContentAccess(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or eligible_author(request.user) or editorial_access(request.user)


def visible_content(model, request):
    query = model.objects.select_related('author', 'reviewer')
    user = request.user
    if editorial_access(user):
        query = query.exclude(status='draft')
    elif eligible_author(user):
        query = query.filter(Q(author=user) | Q(status='published'))
    else:
        query = query.filter(status='published')
    if request.query_params.get('mine') == 'true':
        query = query.filter(author=user) if user.is_authenticated else query.none()
    if request.query_params.get('status'):
        query = query.filter(status=request.query_params['status'])
    return query.order_by('-created_at', '-pk')


def validate_transition(user, instance, requested):
    current = instance.status if instance else 'draft'
    if instance and instance.author_id != user.pk and not editorial_access(user):
        raise PermissionDenied('You can change only your own content.')
    if editorial_access(user):
        if not instance or instance.author_id == user.pk:
            raise PermissionDenied('Editors review work submitted by other writers.')
        allowed = {'under_review': {'approved', 'rejected'}, 'approved': {'published'}}
        if requested != current and requested not in allowed.get(current, set()):
            raise serializers.ValidationError({'status': 'Review submitted work, then publish approved content.'})
        if requested == current and current != 'under_review':
            raise PermissionDenied('Only submissions under review can be edited.')
    else:
        if current not in ('draft', 'rejected'):
            raise PermissionDenied('Submitted, approved and published content is locked for writers.')
        if requested not in (('draft', 'under_review', 'rejected') if current == 'rejected' else ('draft', 'under_review')):
            raise PermissionDenied('Writers save drafts or submit for review; editors approve and publish.')


class ContentSerializerMixin:
    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and not editorial_access(request.user) and (not request.user.is_authenticated or instance.author_id != request.user.pk):
            for field in ('feedback', 'reviewer', 'reviewed_at'):
                data.pop(field, None)
            if instance._meta.app_label == 'articles':
                try:
                    content = json.loads(data.get('content', ''))
                except (ValueError, TypeError):
                    content = None
                if isinstance(content, dict):
                    for private_field in ('notes', 'feedback', 'reviewer', 'reviewed_at'):
                        content.pop(private_field, None)
                    data['content'] = json.dumps(content)
        return data

    def validate(self, attrs):
        attrs = super().validate(attrs)
        user = self.context['request'].user
        if len(attrs.get('content', '')) > 200_000:
            raise serializers.ValidationError({'content': 'Limit content to 200,000 characters.'})
        requested = attrs.get('status', self.instance.status if self.instance else 'draft')
        validate_transition(user, self.instance, requested)
        if requested == 'rejected' and not attrs.get('feedback', '').strip():
            raise serializers.ValidationError({'feedback': 'Give the writer feedback before returning their work.'})
        if not self.instance or requested != self.instance.status:
            if requested == 'under_review':
                attrs.update(feedback='', reviewer=None, reviewed_at=None, published_at=None)
            elif requested in ('approved', 'rejected'):
                attrs.update(reviewer=user, reviewed_at=timezone.now())
            elif requested == 'published':
                attrs['published_at'] = timezone.now()
        elif 'feedback' in attrs and not editorial_access(user):
            raise PermissionDenied('Editorial feedback can only be changed by an editor.')
        return attrs


class ContentListCreate(generics.ListCreateAPIView):
    permission_classes = [ContentAccess]

    def get_queryset(self):
        return visible_content(self.serializer_class.Meta.model, self.request)

    def perform_create(self, serializer):
        if not eligible_author(self.request.user):
            raise PermissionDenied('Writer access is required to create content.')
        if self.serializer_class.Meta.model.objects.filter(author=self.request.user).exclude(status='published').count() >= 200:
            raise serializers.ValidationError('Limit reached: remove unused drafts before creating more content.')
        serializer.save(author=self.request.user)


class ContentDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [ContentAccess]
    lookup_field = 'slug'

    def get_queryset(self):
        query = visible_content(self.serializer_class.Meta.model, self.request)
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            query = query.select_for_update(of=('self',))
        return query

    @transaction.atomic
    def update(self, *args, **kwargs):
        return super().update(*args, **kwargs)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.author_id != request.user.pk or obj.status not in ('draft', 'rejected'):
            raise PermissionDenied('Only your own draft or returned content can be deleted.')
        return super().destroy(request, *args, **kwargs)

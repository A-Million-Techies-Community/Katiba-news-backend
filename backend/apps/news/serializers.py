"""News content validation; workflow fields change through explicit actions."""
import re
import warnings
from html import unescape
from html.parser import HTMLParser
from io import BytesIO
from uuid import UUID

import bleach
from PIL import Image, ImageOps, UnidentifiedImageError
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils.html import escape
from rest_framework import serializers
from .models import Category, Lead, NewsImage, Story


class LeadSerializer(serializers.ModelSerializer):
    """Expose source metadata as read-only fields for the lead inbox."""
    class Meta:
        model = Lead
        # Expose the local ID for API actions; keep the publisher ID internal.
        fields = ('id', 'title', 'original_url', 'published_at', 'discovered_at', 'status')
        # Reviews go through select/dismiss, never arbitrary metadata updates.
        read_only_fields = fields


class CategorySerializer(serializers.ModelSerializer):
    """Validate category names and serialize category records."""
    class Meta:
        model = Category
        fields = ('id', 'name')


class StoryHTMLParser(HTMLParser):
    """Collect uploaded image IDs and visible text from sanitized story HTML."""
    def __init__(self):
        """Initialize independent image and text collections for each story."""
        super().__init__(convert_charrefs=True)
        self.image_ids = set()
        self.text = []

    def handle_starttag(self, tag, attrs):
        """Require inline images to reference a news upload and include alt text."""
        if tag == 'img':
            attrs = dict(attrs)
            match = re.fullmatch(r'/api/news/images/([0-9a-f-]{36})/', attrs.get('src', ''))
            if not match or not attrs.get('alt', '').strip():
                raise serializers.ValidationError({'content': 'Upload inline images through the news editor and provide alt text.'})
            try:
                self.image_ids.add(UUID(match.group(1)))
            except ValueError:
                raise serializers.ValidationError({'content': 'Invalid news image reference.'})

    def handle_data(self, data):
        """Collect text to reject formatted documents with no story text."""
        self.text.append(data)


class NewsImageUploadSerializer(serializers.Serializer):
    """Validate and re-encode JPEG, PNG, or WebP uploads before storing them."""
    file = serializers.FileField()

    def validate_file(self, upload):
        """Limit uploads to 5 MB and 20 megapixels, and discard embedded metadata."""
        if upload.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Use an image smaller than 5 MB.')
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                image = Image.open(upload)
                if image.format not in ('JPEG', 'PNG', 'WEBP'):
                    raise serializers.ValidationError('Use a JPEG, PNG, or WebP image.')
                if image.width * image.height > 20_000_000:
                    raise serializers.ValidationError('Use an image with at most 20 megapixels.')
                image.load()
                image = ImageOps.exif_transpose(image)
                image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
                image.info.clear()
                output = BytesIO()
                image.save(output, format='WEBP', quality=90)
                return ContentFile(output.getvalue(), name='image.webp')
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
            raise serializers.ValidationError('The file is not a valid image.')


class StorySerializer(serializers.ModelSerializer):
    """Validate editable story content and expose server-managed review details."""
    author_username = serializers.CharField(source='author.username', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    featured_image_url = serializers.SerializerMethodField()

    def get_featured_image_url(self, story):
        """Return the authenticated image route, or null when no featured image is set."""
        return story.featured_image.api_url if story.featured_image else None

    class Meta:
        model = Story
        fields = ('id', 'title', 'content', 'category', 'category_name', 'author',
                  'author_username', 'status', 'feedback', 'reviewer', 'submitted_at',
                  'reviewed_at', 'created_at', 'updated_at', 'featured_image',
                  'featured_image_url', 'featured_image_alt', 'featured_image_caption')
        read_only_fields = ('author', 'status', 'feedback', 'reviewer', 'submitted_at',
                            'reviewed_at', 'created_at', 'updated_at')

    def validate_content(self, value):
        """Keep supported formatting while stripping scripts, handlers, styles, and unsafe links."""
        if len(value) > 200_000:
            raise serializers.ValidationError('Limit story content to 200,000 characters.')
        if not re.search(r'</?[a-zA-Z][^>]*>', value):
            value = ''.join(f'<p>{escape(line)}</p>' for line in value.split('\n'))
        return bleach.clean(
            value,
            tags={'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3',
                  'ul', 'ol', 'li', 'blockquote', 'a', 'hr', 'figure', 'figcaption', 'img'},
            attributes={'a': ['href', 'title'], 'img': ['src', 'alt', 'title'], 'ol': ['start']},
            protocols={'http', 'https', 'mailto'}, strip=True,
        )

    def validate(self, attrs):
        """Protect workflow fields and validate ownership of every attached image."""
        protected = set(self.initial_data) & set(self.Meta.read_only_fields)
        if protected:
            raise serializers.ValidationError({key: 'This field is managed by the workflow.' for key in protected})
        content = attrs.get('content', self.instance.content if self.instance else '')
        parser = StoryHTMLParser()
        parser.feed(content)
        if not unescape(''.join(parser.text)).strip():
            raise serializers.ValidationError({'content': 'Write some story text before saving.'})
        image = attrs.get('featured_image', self.instance.featured_image if self.instance else None)
        if image:
            parser.image_ids.add(image.pk)
            alt = attrs.get('featured_image_alt', self.instance.featured_image_alt if self.instance else '')
            if not alt.strip():
                raise serializers.ValidationError({'featured_image_alt': 'Describe the featured image.'})
        user = self.context['request'].user
        images = NewsImage.objects.filter(pk__in=parser.image_ids)
        if images.count() != len(parser.image_ids):
            raise serializers.ValidationError({'content': 'A referenced image no longer exists.'})
        for image in images:
            own_upload = image.story_id is None and image.uploaded_by_id == user.pk
            attached = self.instance is not None and image.story_id == self.instance.pk
            if not (own_upload or attached):
                raise serializers.ValidationError({'content': 'Use your own uploads or images already attached to this story.'})
        self.image_ids = parser.image_ids
        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        """Attach validated images atomically, preventing reuse across private stories."""
        images = list(NewsImage.objects.select_for_update().filter(pk__in=self.image_ids))
        for image in images:
            if image.story_id is not None and (not self.instance or image.story_id != self.instance.pk):
                raise serializers.ValidationError({'content': 'This image is already attached to another story.'})
        story = super().save(**kwargs)
        NewsImage.objects.filter(pk__in=self.image_ids).update(story=story)
        return story


class ReviewSerializer(serializers.Serializer):
    """Validate feedback text; the review view requires it for rejection."""
    feedback = serializers.CharField(required=False, allow_blank=True, max_length=10000)

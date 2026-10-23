"""Collected leads, news categories, and author/editor submissions."""
import uuid
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import models, transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver


class Lead(models.Model):
    """Store collected source metadata and its editorial selection status."""
    class Status(models.TextChoices):
        """Define the review states available for a collected lead."""
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
        """Display the source headline in admin and model selections."""
        return self.title


class Category(models.Model):
    """Group news stories under a unique subject name."""
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'categories'

    def __str__(self):
        """Display the category name in forms and admin."""
        return self.name


def news_image_storage():
    """Resolve private upload storage from the project location on each installation."""
    return FileSystemStorage(location=settings.NEWS_UPLOAD_ROOT)


class NewsImage(models.Model):
    """Store a validated newsroom image, private to its uploader or linked story."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                                    related_name='news_images')
    story = models.ForeignKey('Story', null=True, blank=True, on_delete=models.CASCADE,
                              related_name='images')
    file = models.FileField(storage=news_image_storage)
    content_type = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def api_url(self):
        """Serve image bytes through the authenticated news API, never a public media URL."""
        return f'/api/news/images/{self.pk}/'


class Story(models.Model):
    """Store an author-owned story and its submission and review details."""
    class Status(models.TextChoices):
        """Define the draft, submission, and editorial decision states."""
        DRAFT = 'draft', 'Draft'
        SUBMITTED = 'submitted', 'Submitted'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        PUBLISHED = 'published', 'Published'

    title = models.CharField(max_length=255)
    content = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='stories')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='news_stories')
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    featured_image = models.ForeignKey(NewsImage, null=True, blank=True, on_delete=models.SET_NULL,
                                       related_name='featured_in')
    featured_image_alt = models.CharField(max_length=300, blank=True)
    featured_image_caption = models.CharField(max_length=500, blank=True)
    feedback = models.TextField(blank=True)
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                 related_name='reviewed_news_stories')
    published_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-pk']

    def __str__(self):
        """Display the story headline in admin and model selections."""
        return self.title


@receiver(post_delete, sender=NewsImage)
def remove_news_image_file(sender, instance, **kwargs):
    """Remove uploaded bytes after deletion commits, including deleted story images."""
    storage, name = instance.file.storage, instance.file.name
    if name:
        transaction.on_commit(lambda: storage.delete(name), using=kwargs.get('using'))

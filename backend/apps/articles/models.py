from django.db import models
from django.conf import settings
from django.utils.text import slugify

class Article(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        UNDER_REVIEW = 'under_review', 'Under Review'
        PUBLISHED = 'published', 'Published'

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True, db_index=True)
    content = models.TextField()
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT)
    
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='articles')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        """
        Flowchart Lifecycle Hook: Automatically converts the text header to a clean,
        UNIQUE web URL slug link before saving to the database.
        """
        if not self.slug:
            base_slug = slugify(self.title) or 'untitled'
            slug = base_slug
            counter = 1
            # 📍 Auto-resolves IntegrityError by checking collisions and appending integers
            while Article.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
            
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

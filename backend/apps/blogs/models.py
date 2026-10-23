from django.db import models
from django.conf import settings
from django.utils.text import slugify

class BlogPost(models.Model):
    # Core schema layout for user community blog articles
    status = models.CharField(max_length=15, default='draft', choices=[('draft', 'Draft'), ('under_review', 'Under review'), ('approved', 'Approved'), ('rejected', 'Needs changes'), ('published', 'Published')])
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True, db_index=True)
    content = models.TextField()
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blog_posts')
    feedback = models.TextField(blank=True)
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviewed_blogs')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:220] or 'untitled'
            self.slug = base
            counter = 1
            while BlogPost.objects.filter(slug=self.slug).exists():
                self.slug = f'{base}-{counter}'
                counter += 1
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class Comment(models.Model):
    # Maps user text interactions and relates comments to their unique parent blog posts
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blog_comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Like(models.Model):
    # Tracks distinct user choices to block duplicate voting on the same post
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blog_likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Enforces absolute database uniqueness constraints on a single post-user pair
        unique_together = ('post', 'user')

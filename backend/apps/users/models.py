from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        AUTHOR = "AUTHOR", "Author"

    email = models.EmailField(unique=True)
    auth_version = models.PositiveIntegerField(default=1)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.AUTHOR,
    )

    def __str__(self):
        return self.username



class AuthorProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="author_profile",
    )

    # Basic author information
    professional_title = models.CharField(max_length=120)
    preferred_byline = models.CharField(max_length=120, blank=True)
    organisation = models.CharField(max_length=160, blank=True)
    location = models.CharField(max_length=120)
    phone_number = models.CharField(max_length=40, blank=True)

    # Professional background
    years_of_experience = models.CharField(max_length=80, blank=True)
    highest_education = models.CharField(max_length=160, blank=True)
    journalism_training = models.TextField(blank=True)
    previous_media_experience = models.TextField(blank=True)

    # Online / portfolio information
    portfolio_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    published_work = models.TextField(blank=True)

    # Areas of expertise
    primary_expertise = models.CharField(max_length=160, blank=True)
    secondary_expertise = models.CharField(max_length=255, blank=True)
    reporting_beats = models.CharField(max_length=255, blank=True)
    content_types = models.CharField(max_length=255, blank=True)
    languages = models.CharField(max_length=255, blank=True)
    geographic_coverage = models.CharField(max_length=255, blank=True)

    # Writing and reporting experience
    writing_experience = models.TextField(blank=True)
    investigative_experience = models.TextField(blank=True)
    fact_checking_experience = models.TextField(blank=True)
    source_verification_experience = models.TextField(blank=True)

    # Katiba News interests
    topics_of_interest = models.TextField(blank=True)
    motivation_to_join = models.TextField(blank=True)

    # Professional and editorial information
    conflicts_of_interest = models.TextField(blank=True)
    editorial_standards_agreement = models.BooleanField(default=False)
    additional_information = models.TextField(blank=True)

    # Existing onboarding status
    biography = models.TextField()
    areas_of_expertise = models.CharField(max_length=255)
    onboarding_complete = models.BooleanField(default=False)

    def __str__(self):
        return f"Author profile: {self.user.username}"


class AuthorSettings(models.Model):
    """Private per-account preferences for the Katiba News author workspace."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="author_settings",
    )
    preferences = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.user.username}"


class StaffApplication(models.Model):
    class RequestedRole(models.TextChoices):
        WRITER = 'Writer', 'Writer'
        EDITOR = 'Editor', 'Editor'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending review'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='staff_application')
    requested_role = models.CharField(max_length=10, choices=RequestedRole.choices)
    experience = models.TextField(max_length=4000)
    portfolio_url = models.URLField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    feedback = models.TextField(blank=True, max_length=2000)
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_staff_applications')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-submitted_at', '-pk']

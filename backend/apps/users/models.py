from django.contrib.auth.models import AbstractUser, Group
from django.contrib.auth.password_validation import validate_password
from django.db import models, transaction


AUTHOR_GROUP = "Author"


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

    @classmethod
    def validate(cls, attrs):
        password = attrs.get("password")

        candidate = cls(
            **{
                key: value
                for key, value in attrs.items()
                if key != "password"
            }
        )

        validate_password(password, candidate)
        return attrs

    @classmethod
    @transaction.atomic
    def create(cls, validated_data):
        data = validated_data.copy()
        password = data.pop("password")
        data.pop("role", None)

        cls.validate(
            {
                **data,
                "password": password,
            }
        )

        user = cls(
            **data,
            role=cls.Role.AUTHOR,
            auth_version=1,
        )
        user.set_password(password)
        user.save()

        author_group, _ = Group.objects.get_or_create(
            name=AUTHOR_GROUP
        )
        user.groups.add(author_group)

        AuthorProfile.objects.get_or_create(user=user)
        return user


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
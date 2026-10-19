from rest_framework import serializers

from .models import AuthorProfile, User
from .access import eligible_author, editorial_access, administer_newsroom


class UserSerializer(serializers.ModelSerializer):
    workspace_url = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    is_author = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()
    is_administrator = serializers.SerializerMethodField()

    def get_workspace_url(self, user):
        if not user.is_active:
            return None
        if user.is_superuser:
            return '/admin/'
        if administer_newsroom(user):
            return '/workspace/admin'
        if eligible_author(user):
            return '/author/dashboard' if self.get_profile_complete(user) else '/author/complete-profile'
        if editorial_access(user):
            return '/news/dashboard/editor'
        return None

    def get_role(self, user):
        return 'Superuser' if user.is_superuser else 'Administrator' if administer_newsroom(user) else 'Author' if eligible_author(user) else 'Editor' if editorial_access(user) else None

    def get_is_author(self, user):
        return eligible_author(user)

    def get_can_review(self, user):
        return editorial_access(user)

    def get_is_administrator(self, user):
        return administer_newsroom(user)

    profile_complete = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "profile_complete", "is_author", "can_review", "is_administrator", "is_active", "workspace_url",
        )

    def get_profile_complete(self, user):
        try:
            return user.author_profile.onboarding_complete
        except AuthorProfile.DoesNotExist:
            return False


class AuthorProfileSerializer(serializers.ModelSerializer):

    class Meta:

        model = AuthorProfile

        fields = (
            # Basic author information
            "professional_title",
            "preferred_byline",
            "organisation",
            "location",
            "phone_number",

            # Professional background
            "years_of_experience",
            "highest_education",
            "journalism_training",
            "previous_media_experience",

            # Portfolio and professional profiles
            "portfolio_url",
            "linkedin_url",
            "published_work",

            # Expertise
            "primary_expertise",
            "secondary_expertise",
            "reporting_beats",
            "content_types",
            "languages",
            "geographic_coverage",

            # Writing and reporting experience
            "writing_experience",
            "investigative_experience",
            "fact_checking_experience",
            "source_verification_experience",

            # Katiba News interests
            "topics_of_interest",
            "motivation_to_join",

            # Professional and editorial information
            "conflicts_of_interest",
            "editorial_standards_agreement",
            "additional_information",

            # Existing fields
            "areas_of_expertise",
            "biography",
            "onboarding_complete",
        )

        read_only_fields = ("onboarding_complete",)
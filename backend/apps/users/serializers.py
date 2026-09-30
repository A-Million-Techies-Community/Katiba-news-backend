from rest_framework import serializers

from .models import AuthorProfile, User


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
        )

    def create(self, validated_data):
        return User.create(validated_data)


class UserSerializer(serializers.ModelSerializer):
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
            "profile_complete",
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
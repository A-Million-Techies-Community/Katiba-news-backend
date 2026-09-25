from rest_framework import serializers

from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer responsible for converting registration data
    between JSON requests and the User model.
    ```python
    The actual registration rules and account creation are
    handled by the User model.
    """

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
            "role",
        )


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer used when returning information about
    an authenticated user.
    ```python
    The password is intentionally excluded for security.
    """

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
        )
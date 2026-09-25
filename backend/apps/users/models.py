from django.contrib.auth.models import AbstractUser, Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import models, transaction

READER = "Reader"


class User(AbstractUser):
    """
    Custom user model for KATIBA News.
    ```python
    Users can have one of three roles:
    - Reader
    - Author
    - Editor
    """

    class Role(models.TextChoices):
        READER = "READER", "Reader"
        AUTHOR = "AUTHOR", "Author"
        EDITOR = "EDITOR", "Editor"

    email = models.EmailField(unique=True)

    auth_version = models.PositiveIntegerField(default=1)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.READER,
    )

    def __str__(self):
        """Return the username when the user is displayed."""
        return self.username

    @classmethod
    def validate_role(cls, role):
        """
        Prevent public registration as Author or Editor.
        """

        if role != cls.Role.READER:
            raise ValidationError(
                {
                    "role": [
                        "Newsroom roles must be assigned "
                        "by an administrator."
                    ]
                }
            )

        return role

    @classmethod
    def validate(cls, attrs):
        """
        Validate registration data.
        """

        role = attrs.get("role", cls.Role.READER)

        password = attrs.get("password")

        cls.validate_role(role)

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
        """
        Create a new Reader account.
        """

        data = validated_data.copy()

        password = data.pop("password")

        role = data.get("role", cls.Role.READER)

        cls.validate(
            {
                **data,
                "password": password,
                "role": role,
            }
        )

        data["role"] = cls.Role.READER

        data["auth_version"] = 1

        user = cls(**data)

        user.set_password(password)

        user.save()

        reader_group, _ = Group.objects.get_or_create(
            name=READER
        )

        user.groups.add(reader_group)

        return user
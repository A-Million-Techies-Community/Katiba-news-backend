from django.core.exceptions import ValidationError

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .permissions import IsAuthor, IsEditor, IsReader
from .serializers import UserRegistrationSerializer, UserSerializer


class RegisterView(APIView):
    """
    Handles public user registration.

    The serializer is responsible for receiving and checking
    the structure of the submitted data.

    The User model is responsible for the actual registration
    rules and creation of the user account.
    """

    def post(self, request):
        """
        Handle a POST request for creating a new user account.
        """

        serializer = UserRegistrationSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validated_data = serializer.validated_data.copy()
            user = User.create(validated_data)

        except ValidationError as exc:
            return Response(
                {
                    "detail": exc.messages
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "User registered successfully.",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    """
    Returns information about the currently
    authenticated user.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Handle GET requests to /api/users/me/.
        """

        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class ReaderOnlyView(APIView):
    """
    Test endpoint that can only be accessed
    by users with Reader permissions.
    """

    permission_classes = [IsReader]

    def get(self, request):
        """
        Handle GET requests from Reader users.
        """

        return Response(
            {
                "message": "Reader access granted."
            }
        )


class AuthorOnlyView(APIView):
    """
    Test endpoint that can only be accessed
    by users with Author permissions.
    """

    permission_classes = [IsAuthor]

    def get(self, request):
        """
        Handle GET requests from Author users.
        """

        return Response(
            {
                "message": "Author access granted."
            }
        )


class EditorOnlyView(APIView):
    """
    Test endpoint that can only be accessed
    by users with Editor permissions.
    """

    permission_classes = [IsEditor]

    def get(self, request):
        """
        Handle GET requests from Editor users.
        """

        return Response(
            {
                "message": "Editor access granted."
            }
        )
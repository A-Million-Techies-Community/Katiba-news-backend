from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuthorProfile
from .permissions import IsAuthor
from .serializers import (
    AuthorProfileSerializer,
    UserRegistrationSerializer,
    UserSerializer,
)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = serializer.save()
        except DjangoValidationError as error:
            return Response(
                {"password": error.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": (
                    "Author account created. "
                    "Sign in to complete your profile."
                ),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class AuthorProfileView(APIView):
    permission_classes = [IsAuthor]

    def get(self, request):
        profile, _ = AuthorProfile.objects.get_or_create(
            user=request.user
        )
        return Response(AuthorProfileSerializer(profile).data)

    def put(self, request):
        profile, _ = AuthorProfile.objects.get_or_create(
            user=request.user
        )
        serializer = AuthorProfileSerializer(
            profile,
            data=request.data,
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save(onboarding_complete=True)

        return Response(
            {
                "message": "Author profile completed.",
                "profile": serializer.data,
            }
        )


class AuthorDashboardView(APIView):
    permission_classes = [IsAuthor]

    def get(self, request):
        profile, _ = AuthorProfile.objects.get_or_create(
            user=request.user
        )

        if not profile.onboarding_complete:
            return Response(
                {
                    "detail": (
                        "Complete your author profile "
                        "before opening the dashboard."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "message": (
                    f"Welcome, {request.user.first_name or request.user.username}."
                ),
                "profile": AuthorProfileSerializer(profile).data,
            }
        )
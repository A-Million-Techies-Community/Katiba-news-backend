
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuthorProfile
from .permissions import IsAuthor
from .serializers import (
    AuthorProfileSerializer,
    UserSerializer,
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

class ProfilePicturePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        from .access import eligible_author, editorial_access
        return eligible_author(request.user) or editorial_access(request.user)


class ProfilePictureView(APIView):
    """A staff member can update only their own portrait, independently of onboarding."""
    permission_classes = [ProfilePicturePermission]

    def put(self, request):
        from .serializers import ProfilePictureSerializer
        profile, _ = AuthorProfile.objects.get_or_create(user=request.user)
        serializer = ProfilePictureSerializer(profile, data=request.data)
        serializer.is_valid(raise_exception=True)
        previous_name = profile.profile_picture.name
        storage = profile.profile_picture.storage
        serializer.save()
        if previous_name and previous_name != profile.profile_picture.name:
            from django.db import transaction
            transaction.on_commit(lambda: storage.delete(previous_name))
        request.user._state.fields_cache.pop('author_profile', None)
        return Response({'profile_picture_url': profile.profile_picture.url})

    def delete(self, request):
        profile, _ = AuthorProfile.objects.get_or_create(user=request.user)
        profile.profile_picture.delete(save=True)
        request.user._state.fields_cache.pop('author_profile', None)
        return Response({'profile_picture_url': None})

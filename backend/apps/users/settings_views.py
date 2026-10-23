from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuthorSettings


DEFAULT_PREFERENCES = {
    "notify_submission": True,
    "notify_feedback": True,
    "notify_publication": True,
    "warn_unsaved_edits": True,
    "default_category": "",
    "theme": "system",
    "density": "comfortable",
    "reduce_motion": False,
}

BOOLEAN_FIELDS = {
    "notify_submission",
    "notify_feedback",
    "notify_publication",
    "warn_unsaved_edits",
    "reduce_motion",
}


def merged_preferences(settings):
    return {**DEFAULT_PREFERENCES, **(settings.preferences or {})}


class AuthorSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings, _ = AuthorSettings.objects.get_or_create(user=request.user)
        return Response({
            "username": request.user.username,
            "email": request.user.email,
            "preferences": merged_preferences(settings),
        })

    def put(self, request):
        incoming = request.data.get("preferences")
        if not isinstance(incoming, dict):
            return Response(
                {"detail": "Send a preferences object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        unknown = set(incoming) - set(DEFAULT_PREFERENCES)
        if unknown:
            return Response(
                {"detail": f"Unknown preferences: {', '.join(sorted(unknown))}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current, _ = AuthorSettings.objects.get_or_create(user=request.user)
        preferences = merged_preferences(current)

        for key, value in incoming.items():
            if key in BOOLEAN_FIELDS and not isinstance(value, bool):
                return Response(
                    {"detail": f"{key} must be true or false."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if key == "theme" and value not in ("system", "light", "dark"):
                return Response(
                    {"detail": "Theme must be system, light, or dark."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if key == "density" and value not in ("comfortable", "compact"):
                return Response(
                    {"detail": "Density must be comfortable or compact."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if key == "default_category":
                if not isinstance(value, str) or len(value) > 100:
                    return Response(
                        {"detail": "Default category must be text of at most 100 characters."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            preferences[key] = value

        current.preferences = preferences
        current.save(update_fields=["preferences", "updated_at"])
        return Response({"preferences": preferences})


class AuthorPasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")
        confirm_password = request.data.get("confirm_password", "")

        if not all(isinstance(value, str) and value for value in (
            current_password, new_password, confirm_password
        )):
            return Response(
                {"detail": "Complete all password fields."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.check_password(current_password):
            return Response(
                {"detail": "Your current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {"detail": "The new passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=request.user)
        except ValidationError as exc:
            return Response(
                {"detail": " ".join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new_password)
        request.user.auth_version += 1
        request.user.save(update_fields=["password", "auth_version"])

        return Response({
            "detail": "Password changed. Please sign in again."
        })

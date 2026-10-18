from django.urls import path

from rest_framework_simplejwt.views import TokenObtainPairView

from .views import (
    AuthorDashboardView,
    AuthorProfileView,
    MeView,
    RegisterView,
)


from .settings_views import AuthorPasswordChangeView, AuthorSettingsView


urlpatterns = [
    path("author/settings/", AuthorSettingsView.as_view(), name="author-settings"),
    path("author/settings/password/", AuthorPasswordChangeView.as_view(), name="author-password-change"),
    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),
    path(
        "login/",
        TokenObtainPairView.as_view(),
        name="login",
    ),
    path(
        "me/",
        MeView.as_view(),
        name="me",
    ),
    path(
        "author/profile/",
        AuthorProfileView.as_view(),
        name="author-profile",
    ),
    path(
        "author/dashboard/",
        AuthorDashboardView.as_view(),
        name="author-dashboard",
    ),
    path(
        "author/",
        AuthorDashboardView.as_view(),
        name="author",
    ),
]
from django.urls import path

from rest_framework_simplejwt.views import TokenObtainPairView

from .views import (
    AuthorDashboardView,
    AuthorProfileView,
    MeView,
    RegisterView,
)


urlpatterns = [
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
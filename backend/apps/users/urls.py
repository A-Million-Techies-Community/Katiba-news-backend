from django.urls import path

from rest_framework_simplejwt.views import TokenObtainPairView

from .views import (
    AuthorOnlyView,
    EditorOnlyView,
    MeView,
    ReaderOnlyView,
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
        "reader/",
        ReaderOnlyView.as_view(),
        name="reader",
    ),
    path(
        "author/",
        AuthorOnlyView.as_view(),
        name="author",
    ),
    path(
        "editor/",
        EditorOnlyView.as_view(),
        name="editor",
    ),
]
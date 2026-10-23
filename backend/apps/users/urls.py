from django.urls import path

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .management_views import AccountManagement
from .application_views import SubmitApplication, ApplicationQueue, ApplicationDecision
from .session_views import LogoutView, PasswordResetView, PasswordResetConfirmView

from .views import (
    AuthorDashboardView,
    AuthorProfileView,
    MeView,
    ProfilePictureView,
)


from .settings_views import AuthorPasswordChangeView, AuthorSettingsView


urlpatterns = [
    path("me/photo/", ProfilePictureView.as_view(), name="profile-picture"),
    path('staff-applications/', SubmitApplication.as_view(), name='staff-application'),
    path('staff-applications/review/', ApplicationQueue.as_view(), name='staff-application-queue'),
    path('staff-applications/<int:pk>/decision/', ApplicationDecision.as_view(), name='staff-application-decision'),
    path('accounts/', AccountManagement.as_view(), name='account-management'),
    path('accounts/<int:pk>/', AccountManagement.as_view(), name='account-change'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('password-reset/', PasswordResetView.as_view(), name='password-reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path("author/settings/", AuthorSettingsView.as_view(), name="author-settings"),
    path("author/settings/password/", AuthorPasswordChangeView.as_view(), name="author-password-change"),
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
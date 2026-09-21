"""Versioned JWTs permit immediate account-wide logout and password-reset revocation."""
from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import get_md5_hash_password


class VersionedJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if validated_token.get('auth_version') != user.auth_version:
            raise AuthenticationFailed('Session expired. Sign in again.')
        return user


class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['auth_version'] = user.auth_version
        return token


class RefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        token = RefreshToken(attrs['refresh'])
        user = get_user_model().objects.filter(pk=token.get('user_id'), is_active=True).first()
        if (not user or token.get('auth_version') != user.auth_version
                or token.get('hash_password') != get_md5_hash_password(user.password)):
            raise AuthenticationFailed('Session expired. Sign in again.')
        return super().validate(attrs)

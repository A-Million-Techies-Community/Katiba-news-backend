"""Session revocation and non-enumerating password recovery."""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import F
from django.conf import settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import serializers, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle

User = get_user_model()

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        User.objects.filter(pk=request.user.pk).update(auth_version=F('auth_version') + 1)
        return Response(status=204)

class RecoveryInput(serializers.Serializer):
    email = serializers.EmailField()

class RecoveryConfirmInput(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True)

class PasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_recovery'

    def post(self, request):
        incoming = RecoveryInput(data=request.data)
        incoming.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=incoming.validated_data['email'], is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            send_mail('Reset your Katiba News password',
                f'Reset your password: {settings.PUBLIC_SITE_URL}/reset-password?uid={uid}&token={token}&next=/workspace\nAccount reference: {uid}\nRecovery code: {token}',
                settings.DEFAULT_FROM_EMAIL, [user.email])
        return Response({'detail': 'If this email belongs to an active account, password reset instructions have been sent.'})

class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_recovery'

    @transaction.atomic
    def post(self, request):
        incoming = RecoveryConfirmInput(data=request.data)
        incoming.is_valid(raise_exception=True)
        data = incoming.validated_data
        try:
            pk = int(urlsafe_base64_decode(data['uid']).decode())
            user = User.objects.select_for_update().get(pk=pk, is_active=True)
        except (ValueError, UnicodeError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError('Invalid or expired recovery code.')
        if not default_token_generator.check_token(user, data['token']):
            raise serializers.ValidationError('Invalid or expired recovery code.')
        try:
            validate_password(data['password'], user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'password': error.messages})
        user.set_password(data['password'])
        user.auth_version += 1
        user.save(update_fields=['password', 'auth_version'])
        return Response({'detail': 'Password updated. Sign in again.'})

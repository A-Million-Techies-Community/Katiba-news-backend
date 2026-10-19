"""Public Writer/Editor applications; only administrators can grant access."""
import logging
from django.conf import settings
from django.contrib.admin.models import LogEntry, CHANGE
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from .models import User, StaffApplication
from .management_views import AdministratorOnly
from .account_service import assign_newsroom_role


class ApplicationInput(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    requested_role = serializers.ChoiceField(choices=StaffApplication.RequestedRole.choices)
    experience = serializers.CharField(min_length=30, max_length=4000)
    portfolio_url = serializers.URLField(required=False, allow_blank=True)

    def validate(self, attrs):
        protected = set(self.initial_data) - set(self.fields)
        if protected:
            raise serializers.ValidationError('Only application details can be submitted. Access is assigned after administrator approval.')
        if User.objects.filter(username__iexact=attrs['username']).exists() or User.objects.filter(email__iexact=attrs['email']).exists():
            raise serializers.ValidationError('An account or application already uses this username or email. Sign in or contact the administrator about an existing application.')
        candidate = User(**{key: attrs[key] for key in ['username', 'email', 'first_name', 'last_name']})
        try:
            candidate.full_clean(exclude=['password'])
            validate_password(attrs['password'], candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.message_dict if hasattr(error, 'message_dict') else {'password': error.messages})
        return attrs


class ApplicationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    reviewer_username = serializers.CharField(source='reviewer.username', read_only=True, default=None)

    class Meta:
        model = StaffApplication
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'requested_role', 'experience', 'portfolio_url', 'status', 'feedback', 'submitted_at', 'reviewed_at', 'reviewer_username']
        read_only_fields = fields


def notify_decision(application):
    approved = application.status == StaffApplication.Status.APPROVED
    login = '/writer/login' if application.requested_role == 'Writer' else '/editor/login'
    message = (f'Your {application.requested_role.lower()} application has been approved.\n'
               f'Sign in with the username and password you chose: {settings.PUBLIC_SITE_URL}{login}\n'
               f'Username: {application.user.username}' if approved else
               f'Your {application.requested_role.lower()} application was not approved.\n\n{application.feedback}')
    recipient = application.user.email

    def send():
        try:
            send_mail('Katiba News application decision', message, settings.DEFAULT_FROM_EMAIL, [recipient])
        except Exception:
            logging.getLogger(__name__).exception('Failed to email staff application decision %s', application.pk)
    transaction.on_commit(send)


class SubmitApplication(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'staff_application'

    def post(self, request):
        incoming = ApplicationInput(data=request.data)
        incoming.is_valid(raise_exception=True)
        data = incoming.validated_data.copy()
        application_data = {key: data.pop(key) for key in ['requested_role', 'experience', 'portfolio_url'] if key in data}
        try:
            with transaction.atomic():
                user = User.objects.create_user(**data, is_active=False, is_staff=False, is_superuser=False)
                StaffApplication.objects.create(user=user, **application_data)
        except IntegrityError:
            raise serializers.ValidationError('An account or application already uses this username or email.')
        return Response({'detail': 'Application submitted for administrator review. You cannot sign in until it is approved. We will email you the decision.'}, status=201)


class ApplicationQueue(APIView):
    permission_classes = [AdministratorOnly]

    def get(self, request):
        query = StaffApplication.objects.select_related('user', 'reviewer')
        return Response(ApplicationSerializer(query, many=True).data)


class ApplicationDecision(APIView):
    permission_classes = [AdministratorOnly]

    @transaction.atomic
    def post(self, request, pk):
        application = get_object_or_404(StaffApplication.objects.select_for_update(), pk=pk)
        if application.status != StaffApplication.Status.PENDING:
            raise serializers.ValidationError('This application has already been reviewed.')
        decision = request.data.get('decision')
        feedback = request.data.get('feedback', '')
        if decision not in ['approved', 'rejected'] or not isinstance(feedback, str) or len(feedback) > 2000:
            raise serializers.ValidationError('Choose approved or rejected, with feedback of at most 2000 characters.')
        if decision == 'rejected' and not feedback.strip():
            raise serializers.ValidationError({'feedback': 'Explain why the application was not approved.'})
        account = User.objects.select_for_update().get(pk=application.user_id)
        if account.is_superuser or account.is_staff or account.groups.exists() or account.user_permissions.exists():
            raise serializers.ValidationError('This account already has assigned privileges. Manage its access separately.')
        if decision == 'approved':
            account.is_active = True
            account.save(update_fields=['is_active'])
            assign_newsroom_role(account, 'Author' if application.requested_role == 'Writer' else 'Editor')
        application.status = decision
        application.feedback = feedback.strip()
        application.reviewer = request.user
        application.reviewed_at = timezone.now()
        application.save()
        LogEntry.objects.log_actions(user_id=request.user.pk, queryset=User.objects.filter(pk=account.pk), action_flag=CHANGE,
            change_message=f'{application.requested_role} application {decision}')
        notify_decision(application)
        return Response(ApplicationSerializer(application).data)

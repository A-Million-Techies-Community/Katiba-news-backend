"""Administrator-only user lifecycle and safe newsroom role assignments."""
from django.contrib.admin.models import LogEntry, CHANGE, ADDITION
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User
from .access import administer_newsroom, WORKSPACE_ADMIN
from .account_service import assign_newsroom_role
from .serializers import UserSerializer


class AdministratorOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return administer_newsroom(request.user)


class AccountInput(serializers.Serializer):
    username = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(write_only=True, required=False)
    newsroom_role = serializers.ChoiceField(choices=['Author', 'Editor'], required=False)
    is_active = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if set(self.initial_data) - set(self.fields):
            raise serializers.ValidationError('Only writer and editor account details may be changed.')
        return attrs


class AccountManagement(APIView):
    permission_classes = [AdministratorOnly]

    def get(self, request):
        query = User.objects.filter(is_superuser=False, is_staff=False).exclude(groups__name=WORKSPACE_ADMIN).exclude(staff_application__status__in=['pending', 'rejected']).order_by('username')
        search = request.query_params.get('search', '').strip()
        if search:
            from django.db.models import Q
            query = query.filter(Q(username__icontains=search) | Q(email__icontains=search))
        return Response(UserSerializer(query, many=True).data)

    @transaction.atomic
    def post(self, request):
        return self.save_account(request)

    @transaction.atomic
    def patch(self, request, pk):
        account = get_object_or_404(User.objects.select_for_update(), pk=pk)
        if hasattr(account, 'staff_application') and account.staff_application.status != 'approved':
            raise serializers.ValidationError('Review this application before managing its account.')
        if account.is_superuser or account.is_staff or account.groups.filter(name=WORKSPACE_ADMIN).exists():
            raise serializers.ValidationError('Administrator accounts are managed through Django Admin, not this form.')
        return self.save_account(request, account)

    def save_account(self, request, account=None):
        incoming = AccountInput(data=request.data)
        incoming.is_valid(raise_exception=True)
        data = incoming.validated_data
        creating = account is None
        if creating and not all(data.get(key) for key in ['username', 'email', 'password', 'newsroom_role']):
            raise serializers.ValidationError('Username, email, password and newsroom role are required.')
        account = account or User()
        for key in ('username', 'email', 'is_active'):
            if key in data:
                setattr(account, key, data[key])
        if 'password' in data:
            try:
                validate_password(data['password'], account)
            except DjangoValidationError as error:
                raise serializers.ValidationError({'password': error.messages})
            account.set_password(data['password'])
        try:
            account.full_clean(exclude=['password'])
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.message_dict)
        account.auth_version += 1
        account.save()
        if 'newsroom_role' in data:
            assign_newsroom_role(account, data['newsroom_role'], revoke=False)
        LogEntry.objects.log_actions(user_id=request.user.pk, queryset=User.objects.filter(pk=account.pk),
            action_flag=ADDITION if creating else CHANGE,
            change_message='Account created' if creating else 'Account access updated; existing sessions revoked')
        return Response(UserSerializer(account).data, status=201 if creating else 200)

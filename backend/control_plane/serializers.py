from rest_framework import serializers
from authentication.models import User, UserType, SecurityLog
from .models import Tenant, Subscription
from django.utils import timezone


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'code', 'admin_email', 'contact_phone', 'industry', 'timezone', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubscriptionSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    remaining_days = serializers.SerializerMethodField()
    display_status = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            'id', 'tenant', 'tenant_name', 'plan_name', 'status', 'display_status',
            'valid_from', 'valid_until', 'remaining_days', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_remaining_days(self, obj):
        if not obj.valid_until:
            return None
        today = timezone.now().date()
        end = obj.valid_until.date() if hasattr(obj.valid_until, 'date') else obj.valid_until
        delta = (end - today).days
        return max(delta, 0)

    def get_display_status(self, obj):
        today = timezone.now().date()
        start = obj.valid_from.date() if obj.valid_from and hasattr(obj.valid_from, 'date') else obj.valid_from
        end = obj.valid_until.date() if obj.valid_until and hasattr(obj.valid_until, 'date') else obj.valid_until
        if start and today < start:
            return 'not_started'
        if end and today > end:
            return 'expired'
        return 'active'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'user_type', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class SecurityLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = SecurityLog
        fields = [
            'id', 'event_type', 'severity', 'user', 'user_email', 'company_id',
            'ip_address', 'user_agent', 'device_fingerprint', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class MasterAdminSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    subscription_start_date = serializers.DateField(source='tenant.subscription_start_date', read_only=True)
    subscription_end_date = serializers.DateField(source='tenant.subscription_end_date', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'surname', 'athens_tenant_id', 'tenant_name',
                  'subscription_start_date', 'subscription_end_date', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at', 'email', 'tenant_name',
                            'subscription_start_date', 'subscription_end_date']


class MasterAdminCreateSerializer(serializers.ModelSerializer):
    tenant_id = serializers.IntegerField(write_only=True)
    password = serializers.CharField(write_only=True)
    subscription_start_date = serializers.DateField(write_only=True, required=False, allow_null=True)
    subscription_end_date = serializers.DateField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['email', 'name', 'surname', 'tenant_id', 'password',
                  'subscription_start_date', 'subscription_end_date']

    def create(self, validated_data):
        tenant_id = validated_data.pop('tenant_id')
        password = validated_data.pop('password')
        subscription_start_date = validated_data.pop('subscription_start_date', None)
        subscription_end_date = validated_data.pop('subscription_end_date', None)

        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            raise serializers.ValidationError({'tenant_id': 'Tenant not found'})

        # Save subscription dates on the tenant (single source of truth)
        if subscription_start_date:
            tenant.subscription_start_date = subscription_start_date
        if subscription_end_date:
            tenant.subscription_end_date = subscription_end_date
        if subscription_start_date or subscription_end_date:
            tenant.save(update_fields=['subscription_start_date', 'subscription_end_date'])

        user = User.objects.create(
            **validated_data,
            user_type=UserType.MASTERADMIN,
            tenant=tenant,
            athens_tenant_id=tenant.id,
            company_id=tenant.id
        )
        user.set_password(password)
        user.save()
        return user

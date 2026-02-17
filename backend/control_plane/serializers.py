from rest_framework import serializers
from authentication.models import User, UserType, SecurityLog
from .models import Tenant, Subscription


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'code', 'admin_email', 'contact_phone', 'industry', 'timezone', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubscriptionSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'tenant', 'tenant_name', 'plan_name', 'status',
            'valid_from', 'valid_until', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


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

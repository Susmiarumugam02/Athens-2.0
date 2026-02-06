from rest_framework import serializers
from authentication.models import User, UserType, SecurityLog
from .models import Tenant, Subscription, MasterAdmin


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'code', 'is_active', 'created_at', 'updated_at']
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


class MasterAdminSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(write_only=True)
    user_password = serializers.CharField(write_only=True, required=False)
    user = UserSerializer(read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    
    class Meta:
        model = MasterAdmin
        fields = [
            'id', 'user', 'user_email', 'user_password', 'tenant', 'tenant_name',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        user_email = validated_data.pop('user_email')
        user_password = validated_data.pop('user_password', None)
        
        # Create user
        user = User.objects.create_user(
            email=user_email,
            password=user_password or User.objects.make_random_password(),
            user_type=UserType.MASTERADMIN,
            company_id=validated_data['tenant'].id
        )
        
        # Create master admin profile
        master = MasterAdmin.objects.create(user=user, **validated_data)
        return master


class SecurityLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = SecurityLog
        fields = [
            'id', 'event_type', 'severity', 'user', 'user_email', 'company_id',
            'ip_address', 'user_agent', 'device_fingerprint', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

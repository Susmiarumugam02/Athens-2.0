from rest_framework import serializers
from authentication.models import User, UserType, SecurityLog
from .models import Tenant, Subscription, MasterAdmin


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


class MasterAdminSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(write_only=True)
    user_password = serializers.CharField(write_only=True, required=False)
    user = UserSerializer(read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = MasterAdmin
        fields = [
            'id', 'user', 'user_email', 'user_password', 'email', 'tenant', 'tenant_name',
            'first_name', 'last_name', 'phone', 'designation', 'department',
            'role', 'timezone', 'language', 'notes',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        user_email = validated_data.pop('user_email')
        user_password = validated_data.pop('user_password', None)
        
        # Create user with admin_type for Athens compatibility
        user = User.objects.create_user(
            email=user_email,
            password=user_password or User.objects.make_random_password(),
            user_type=UserType.MASTERADMIN,
            company_id=validated_data['tenant'].id,
            admin_type='masteradmin'  # Athens compatibility
        )
        
        # Create master admin profile
        master = MasterAdmin.objects.create(user=user, **validated_data)
        
        # Auto-create AthensTenantLink with all modules
        from .models import AthensTenantLink, DEFAULT_ATHENS_MODULES
        AthensTenantLink.objects.get_or_create(
            tenant=validated_data['tenant'],
            defaults={
                'enabled_modules': DEFAULT_ATHENS_MODULES.copy(),
                'is_active': True,
                'created_by': user
            }
        )
        
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

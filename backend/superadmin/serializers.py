from rest_framework import serializers
from superadmin.models import (
    Role, Permission, RolePermission, UserRole, AuditLog,
    PasswordPolicy, TwoFactorSettings, IPRestriction, SessionSettings,
    Announcement, NotificationDelivery, SystemSettings, DatabaseBackup
)
from authentication.models import User


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'codename', 'name', 'description', 'module', 'action']


class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(source='role_permissions.permission', many=True, read_only=True)
    permission_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'is_system_role', 'permissions', 'permission_ids', 'created_at', 'updated_at']
        read_only_fields = ['is_system_role', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        permission_ids = validated_data.pop('permission_ids', [])
        role = Role.objects.create(**validated_data)
        
        if permission_ids:
            for perm_id in permission_ids:
                RolePermission.objects.create(role=role, permission_id=perm_id)
        
        return role
    
    def update(self, instance, validated_data):
        permission_ids = validated_data.pop('permission_ids', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if permission_ids is not None:
            # Clear existing permissions
            RolePermission.objects.filter(role=instance).delete()
            # Add new permissions
            for perm_id in permission_ids:
                RolePermission.objects.create(role=instance, permission_id=perm_id)
        
        return instance


class UserRoleSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    
    class Meta:
        model = UserRole
        fields = ['id', 'user', 'role', 'role_name', 'assigned_at', 'assigned_by']
        read_only_fields = ['assigned_at']


class SuperAdminUserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    role_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    
    def get_roles(self, obj):
        user_roles = UserRole.objects.filter(user=obj).select_related('role')
        return [{'id': ur.role.id, 'name': ur.role.name} for ur in user_roles]
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'user_type', 'is_active', 'requires_2fa', 
            'last_login', 'created_at', 'updated_at', 'roles', 'role_ids'
        ]
        read_only_fields = ['user_type', 'last_login', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        role_ids = validated_data.pop('role_ids', [])
        password = validated_data.pop('password', None)
        
        user = User.objects.create(**validated_data, user_type='superadmin')
        if password:
            user.set_password(password)
            user.save()
        
        # Assign roles
        request_user = self.context.get('request').user
        for role_id in role_ids:
            UserRole.objects.create(user=user, role_id=role_id, assigned_by=request_user)
        
        return user
    
    def update(self, instance, validated_data):
        role_ids = validated_data.pop('role_ids', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if role_ids is not None:
            UserRole.objects.filter(user=instance).delete()
            request_user = self.context.get('request').user
            for role_id in role_ids:
                UserRole.objects.create(user=instance, role_id=role_id, assigned_by=request_user)
        
        return instance


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'timestamp', 'user', 'user_email', 'action', 'module',
            'resource_type', 'resource_id', 'ip_address', 'user_agent',
            'request_data', 'response_data', 'status'
        ]


class PasswordPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = PasswordPolicy
        fields = [
            'id', 'min_length', 'require_uppercase', 'require_lowercase',
            'require_numbers', 'require_special_chars', 'expiry_days',
            'history_count', 'lockout_threshold', 'lockout_duration',
            'updated_at', 'updated_by'
        ]
        read_only_fields = ['updated_at', 'updated_by']


class TwoFactorSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TwoFactorSettings
        fields = [
            'id', 'enforce_for_all', 'enforce_for_roles', 'allow_backup_codes',
            'backup_codes_count', 'updated_at', 'updated_by'
        ]
        read_only_fields = ['updated_at', 'updated_by']


class IPRestrictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = IPRestriction
        fields = [
            'id', 'ip_address', 'ip_range', 'restriction_type', 'description',
            'is_active', 'created_at', 'created_by'
        ]
        read_only_fields = ['created_at', 'created_by']


class SessionSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionSettings
        fields = [
            'id', 'timeout_minutes', 'max_concurrent_sessions',
            'enable_device_tracking', 'updated_at', 'updated_by'
        ]
        read_only_fields = ['updated_at', 'updated_by']


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    
    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'message', 'type', 'target_audience', 'target_roles',
            'created_by', 'created_by_email', 'scheduled_at', 'expires_at',
            'is_active', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at']


class NotificationDeliverySerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    announcement_title = serializers.CharField(source='announcement.title', read_only=True)
    
    class Meta:
        model = NotificationDelivery
        fields = [
            'id', 'announcement', 'announcement_title', 'user', 'user_email',
            'delivery_status', 'delivered_at', 'read_at'
        ]


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            'id', 'system_name', 'timezone', 'date_format', 'language',
            'maintenance_mode', 'maintenance_message', 'updated_at', 'updated_by'
        ]
        read_only_fields = ['updated_at', 'updated_by']


class DatabaseBackupSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    
    class Meta:
        model = DatabaseBackup
        fields = [
            'id', 'filename', 'file_path', 'file_size', 'backup_type',
            'status', 'error_message', 'created_by', 'created_by_email',
            'created_at', 'completed_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'completed_at']

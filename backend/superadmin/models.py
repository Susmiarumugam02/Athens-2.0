from django.db import models
from django.utils import timezone
from authentication.models import User


class Role(models.Model):
    name = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True)
    is_system_role = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'superadmin_roles'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Permission(models.Model):
    codename = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    module = models.CharField(max_length=50, db_index=True)
    action = models.CharField(max_length=50)
    
    class Meta:
        db_table = 'superadmin_permissions'
        ordering = ['module', 'action']
        indexes = [
            models.Index(fields=['module', 'action']),
        ]
    
    def __str__(self):
        return f"{self.module}.{self.action}"


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'superadmin_role_permissions'
        unique_together = ['role', 'permission']
        indexes = [
            models.Index(fields=['role', 'permission']),
        ]


class UserRole(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='superadmin_roles')
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='assigned_roles')
    
    class Meta:
        db_table = 'superadmin_user_roles'
        unique_together = ['user', 'role']
        indexes = [
            models.Index(fields=['user']),
        ]


class AuditLog(models.Model):
    class Status(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILURE = 'failure', 'Failure'
    
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100, db_index=True)
    module = models.CharField(max_length=50, db_index=True)
    resource_type = models.CharField(max_length=50, blank=True)
    resource_id = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    request_data = models.JSONField(default=dict, blank=True)
    response_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUCCESS)
    
    class Meta:
        db_table = 'superadmin_audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['module', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.action} by {self.user} at {self.timestamp}"


class PasswordPolicy(models.Model):
    min_length = models.IntegerField(default=12)
    require_uppercase = models.BooleanField(default=True)
    require_lowercase = models.BooleanField(default=True)
    require_numbers = models.BooleanField(default=True)
    require_special_chars = models.BooleanField(default=True)
    expiry_days = models.IntegerField(default=90)
    history_count = models.IntegerField(default=5)
    lockout_threshold = models.IntegerField(default=5)
    lockout_duration = models.IntegerField(default=900)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'superadmin_password_policy'
    
    @classmethod
    def get_policy(cls):
        policy, _ = cls.objects.get_or_create(pk=1)
        return policy


class TwoFactorSettings(models.Model):
    enforce_for_all = models.BooleanField(default=False)
    enforce_for_roles = models.ManyToManyField(Role, blank=True)
    allow_backup_codes = models.BooleanField(default=True)
    backup_codes_count = models.IntegerField(default=10)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'superadmin_2fa_settings'
    
    @classmethod
    def get_settings(cls):
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings


class IPRestriction(models.Model):
    class RestrictionType(models.TextChoices):
        WHITELIST = 'whitelist', 'Whitelist'
        BLACKLIST = 'blacklist', 'Blacklist'
    
    ip_address = models.GenericIPAddressField()
    ip_range = models.CharField(max_length=50, blank=True)
    restriction_type = models.CharField(max_length=20, choices=RestrictionType.choices)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'superadmin_ip_restrictions'
        indexes = [
            models.Index(fields=['ip_address', 'is_active']),
        ]


class SessionSettings(models.Model):
    timeout_minutes = models.IntegerField(default=60)
    max_concurrent_sessions = models.IntegerField(default=3)
    enable_device_tracking = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'superadmin_session_settings'
    
    @classmethod
    def get_settings(cls):
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings


class Announcement(models.Model):
    class AnnouncementType(models.TextChoices):
        INFO = 'info', 'Info'
        WARNING = 'warning', 'Warning'
        CRITICAL = 'critical', 'Critical'
    
    class TargetAudience(models.TextChoices):
        ALL = 'all', 'All SuperAdmins'
        ROLES = 'roles', 'Specific Roles'
    
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=AnnouncementType.choices, default=AnnouncementType.INFO)
    target_audience = models.CharField(max_length=20, choices=TargetAudience.choices, default=TargetAudience.ALL)
    target_roles = models.ManyToManyField(Role, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'superadmin_announcements'
        ordering = ['-created_at']


class NotificationDelivery(models.Model):
    class DeliveryStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        DELIVERED = 'delivered', 'Delivered'
        READ = 'read', 'Read'
        FAILED = 'failed', 'Failed'
    
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='deliveries')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    delivery_status = models.CharField(max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.PENDING)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'superadmin_notification_deliveries'
        unique_together = ['announcement', 'user']
        indexes = [
            models.Index(fields=['user', 'delivery_status']),
        ]


class SystemSettings(models.Model):
    system_name = models.CharField(max_length=255, default='Athens 2.0')
    timezone = models.CharField(max_length=50, default='UTC')
    date_format = models.CharField(max_length=50, default='YYYY-MM-DD')
    language = models.CharField(max_length=10, default='en')
    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'superadmin_system_settings'
    
    @classmethod
    def get_settings(cls):
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings


class DatabaseBackup(models.Model):
    class BackupStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
    
    filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField(default=0)
    backup_type = models.CharField(max_length=50, default='manual')
    status = models.CharField(max_length=20, choices=BackupStatus.choices, default=BackupStatus.PENDING)
    error_message = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'superadmin_database_backups'
        ordering = ['-created_at']

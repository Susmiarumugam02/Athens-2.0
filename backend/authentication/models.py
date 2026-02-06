from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserType(models.TextChoices):
    SUPERADMIN = "superadmin", "Super Admin"
    MASTERADMIN = "masteradmin", "Master Admin"
    COMPANYUSER = "companyuser", "Company User"
    SERVICEUSER = "serviceuser", "Service User"


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("user_type", UserType.SUPERADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True, db_index=True)
    user_type = models.CharField(max_length=20, choices=UserType.choices, default=UserType.COMPANYUSER)
    company_id = models.IntegerField(null=True, blank=True, db_index=True)
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    requires_2fa = models.BooleanField(default=False)
    totp_secret = models.CharField(max_length=32, null=True, blank=True)
    
    password_changed_at = models.DateTimeField(null=True, blank=True)
    failed_login_count = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    
    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["company_id"]),
            models.Index(fields=["user_type"]),
        ]
    
    def __str__(self):
        return f"{self.email} ({self.user_type})"
    
    @property
    def is_locked(self):
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False
    
    @property
    def password_expired(self):
        if not self.password_changed_at:
            return False
        # 90 days password expiry
        expiry_days = 90
        return (timezone.now() - self.password_changed_at).days > expiry_days


class SecurityLog(models.Model):
    class EventType(models.TextChoices):
        LOGIN_SUCCESS = "login_success", "Login Success"
        LOGIN_FAILED = "login_failed", "Login Failed"
        LOGOUT = "logout", "Logout"
        PASSWORD_CHANGE = "password_change", "Password Change"
        ACCOUNT_LOCKED = "account_locked", "Account Locked"
        TENANT_CREATED = "tenant_created", "Tenant Created"
        TENANT_DISABLED = "tenant_disabled", "Tenant Disabled"
        SUBSCRIPTION_CHANGED = "subscription_changed", "Subscription Changed"
        MASTER_CREATED = "master_created", "Master Created"
        MASTER_DISABLED = "master_disabled", "Master Disabled"
    
    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"
        CRITICAL = "critical", "Critical"
    
    event_type = models.CharField(max_length=50, choices=EventType.choices)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.INFO)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    company_id = models.IntegerField(null=True, blank=True, db_index=True)
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    device_fingerprint = models.CharField(max_length=255, null=True, blank=True)
    
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = "security_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["event_type"]),
            models.Index(fields=["company_id"]),
            models.Index(fields=["user"]),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.created_at}"


class ServiceUserSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    session_key = models.CharField(max_length=255, unique=True, db_index=True)
    company_id = models.IntegerField(db_index=True)
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    last_activity = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "service_user_sessions"
        indexes = [
            models.Index(fields=["session_key"]),
            models.Index(fields=["user", "company_id"]),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.session_key[:8]}"

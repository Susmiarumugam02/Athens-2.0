from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

# Import tenant models
from .tenant_models import AthensTenant, TenantAuditLog, DEFAULT_MODULES, DEFAULT_MENUS  # noqa
from .tenant_resolver import TenantResolver, get_current_tenant  # noqa
from . import rbac_permissions  # noqa


class Project(models.Model):
    """Business Project Model for Athens modules"""
    GOVERNMENTS = 'governments'
    MANUFACTURING = 'manufacturing'
    CONSTRUCTION = 'construction'
    CHEMICAL = 'chemical'
    PORT_AND_MARITIME = 'port_and_maritime'
    POWER_AND_ENERGY = 'power_and_energy'
    LOGISTICS = 'logistics'
    SCHOOLS = 'schools'
    MINING = 'mining'
    OIL_AND_GAS = 'oil_and_gas'
    SHOPPING_MALL = 'shopping_mall'
    AVIATION = 'aviation'

    CATEGORY_CHOICES = [
        (GOVERNMENTS, 'Governments'),
        (MANUFACTURING, 'Manufacturing'),
        (CONSTRUCTION, 'Construction'),
        (CHEMICAL, 'Chemical'),
        (PORT_AND_MARITIME, 'Port and Maritime'),
        (POWER_AND_ENERGY, 'Power and Energy'),
        (LOGISTICS, 'Logistics'),
        (SCHOOLS, 'Schools'),
        (MINING, 'Mining'),
        (OIL_AND_GAS, 'Oil & Gas'),
        (SHOPPING_MALL, 'Shopping Mall'),
        (AVIATION, 'Aviation'),
    ]

    SUBSCRIBER_ROLE_CHOICES = [
        ('client', 'Client'),
        ('epc', 'EPC'),
    ]

    athens_tenant_id = models.UUIDField(null=True, blank=True)
    subscriber_role = models.CharField(
        max_length=10, 
        choices=SUBSCRIBER_ROLE_CHOICES, 
        help_text="Who is the subscriber: Client or EPC (REQUIRED)"
    )
    client_company_id = models.UUIDField(null=True, blank=True, help_text="Single client company (only one allowed)")
    epc_company_ids = models.JSONField(default=list, help_text="List of EPC company IDs (multiple if client subscriber, max 1 if EPC subscriber)")
    contractor_company_ids = models.JSONField(default=list, help_text="List of contractor company IDs (unlimited)")
    
    projectName = models.CharField(max_length=255)
    projectCategory = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    capacity = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    nearestPoliceStation = models.CharField(max_length=255, blank=True)
    nearestPoliceStationContact = models.CharField(max_length=255, blank=True)
    nearestHospital = models.CharField(max_length=255, blank=True)
    nearestHospitalContact = models.CharField(max_length=255, blank=True)
    commencementDate = models.DateField(null=True, blank=True)
    deadlineDate = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.projectName


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
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    user_type = models.CharField(max_length=20, choices=UserType.choices, default=UserType.COMPANYUSER)
    company_id = models.IntegerField(null=True, blank=True, db_index=True)
    
    # Athens compatibility fields
    name = models.CharField(max_length=150, null=True, blank=True)
    surname = models.CharField(max_length=150, null=True, blank=True)
    department = models.CharField(max_length=150, null=True, blank=True)
    designation = models.CharField(max_length=150, null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    grade = models.CharField(max_length=1, null=True, blank=True)
    created_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_users')
    project = models.ForeignKey('Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    
    # Tenant scoping for MasterAdmin users
    athens_tenant_id = models.UUIDField(null=True, blank=True, db_index=True, help_text="DEPRECATED: Legacy tenant ID. Use tenant FK.")
    tenant = models.ForeignKey(
        'control_plane.Tenant',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='masteradmin_users',
        db_index=True,
        help_text="Tenant for MasterAdmin scoping"
    )
    
    # Admin type for Athens module access compatibility
    admin_type = models.CharField(
        max_length=20,
        choices=[
            ('client', 'Client Admin'),
            ('epc', 'EPC Admin'),
            ('contractor', 'Contractor Admin'),
        ],
        null=True,
        blank=True,
        help_text="Admin type for Athens module access"
    )
    
    # Company details for project admins
    company_name = models.CharField(max_length=255, null=True, blank=True, help_text="Company name for project admin")
    registered_address = models.TextField(null=True, blank=True, help_text="Registered office address")
    company_logo = models.ImageField(upload_to='company_logos/', null=True, blank=True, help_text="Company logo")
    
    # Password management flags
    is_autogenerated_password = models.BooleanField(default=False, help_text="Whether password was auto-generated")
    is_password_reset_required = models.BooleanField(default=False, help_text="Whether user must reset password on first login")

    # Role type within company (admin = project admin, user = regular user)
    ROLE_TYPE_ADMIN = 'admin'
    ROLE_TYPE_USER = 'user'
    ROLE_TYPE_CHOICES = [
        ('admin', 'Admin'),
        ('user', 'User'),
    ]
    role_type = models.CharField(
        max_length=10, choices=ROLE_TYPE_CHOICES, default='admin',
        help_text="admin = project admin, user = regular user created by project admin"
    )

    # Company type inherited from creating admin
    COMPANY_TYPE_CHOICES = [
        ('client', 'Client'),
        ('epc', 'EPC'),
        ('contractor', 'Contractor'),
    ]
    company_type = models.CharField(
        max_length=20, choices=COMPANY_TYPE_CHOICES, null=True, blank=True,
        help_text="Company type: client / epc / contractor"
    )

    # Approval workflow
    APPROVAL_PENDING = 'pending'
    APPROVAL_APPROVED = 'approved'
    APPROVAL_REJECTED = 'rejected'
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    approval_status = models.CharField(
        max_length=20, choices=APPROVAL_STATUS_CHOICES, default='approved',
        help_text="Approval status for regular users created by project admins"
    )
    is_first_login = models.BooleanField(
        default=False,
        help_text="True until user completes profile form on first login"
    )
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    requires_2fa = models.BooleanField(default=False)
    totp_secret = models.CharField(max_length=32, null=True, blank=True)
    api_key = models.CharField(max_length=100, null=True, blank=True, unique=True)
    
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

    def get_full_name(self):
        full_name = ' '.join(filter(None, [self.name, self.surname]))
        return full_name.strip() or self.username or self.email

    def get_short_name(self):
        return self.name or self.username or self.email

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


# Alias for Athens module compatibility
CustomUser = User


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
        PROJECT_CREATED = "project_created", "Project Created"
        PROJECT_UPDATED = "project_updated", "Project Updated"
        PROJECT_STATUS_CHANGED = "project_status_changed", "Project Status Changed"
        PROJECT_MEMBER_ADDED = "project_member_added", "Project Member Added"
        PROJECT_MEMBER_UPDATED = "project_member_updated", "Project Member Updated"
        PROJECT_MEMBER_REMOVED = "project_member_removed", "Project Member Removed"
    
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


class UserDetail(models.Model):
    """Extended user profile for Athens modules"""
    athens_tenant_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Athens tenant identifier for multi-tenant isolation"
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user_detail')
    employee_id = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    father_or_spouse_name = models.CharField(max_length=255, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    nationality = models.CharField(max_length=100, blank=True)
    education_level = models.CharField(max_length=255, blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    email = models.EmailField(blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    uan = models.CharField(max_length=100, blank=True)
    pan = models.CharField(max_length=100, blank=True)
    pan_attachment = models.FileField(upload_to='pan_attachments/', null=True, blank=True)
    aadhaar = models.CharField(max_length=100, blank=True)
    aadhaar_attachment = models.FileField(upload_to='aadhaar_attachments/', null=True, blank=True)
    mark_of_identification = models.CharField(max_length=255, blank=True)
    photo = models.ImageField(upload_to='photos/', null=True, blank=True)
    specimen_signature = models.ImageField(upload_to='signatures/', null=True, blank=True)
    signature_template = models.ImageField(upload_to='signature_templates/', null=True, blank=True)
    signature_template_data = models.JSONField(null=True, blank=True, help_text="Stores template configuration data")
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_user_details')
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_details"

    def approve(self, approver):
        self.is_approved = True
        self.approved_by = approver
        self.approved_at = timezone.now()
        self.save()

    def __str__(self):
        return f"UserDetail for {self.user.username or self.user.email}"


class AdminDetail(models.Model):
    """Extended admin profile for Athens modules"""
    athens_tenant_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Athens tenant identifier for multi-tenant isolation"
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_detail')
    name = models.CharField(max_length=150, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    pan_number = models.CharField(max_length=100, blank=True, null=True)
    gst_number = models.CharField(max_length=100, blank=True, null=True)
    photo = models.ImageField(upload_to='admin_photos/', null=True, blank=True)
    logo = models.ImageField(upload_to='admin_logos/', null=True, blank=True)
    signature_template = models.ImageField(upload_to='admin_signature_templates/', null=True, blank=True)
    signature_template_data = models.JSONField(null=True, blank=True, help_text="Stores template configuration data")
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_admin_details')
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "admin_details"

    def save(self, *args, **kwargs):
        if not self.name and hasattr(self.user, 'name') and self.user.name:
            self.name = self.user.name
        super().save(*args, **kwargs)

    def __str__(self):
        return f"AdminDetail for {self.user.username or self.user.email}"

from django.db import models
from django.utils.text import slugify

# Default Athens modules
DEFAULT_ATHENS_MODULES = [
    "PTW", "INCIDENT", "SAFETY_OBS", "QUALITY", "ENVIRONMENT", 
    "INDUCTION", "JOB_TRAINING", "TBT", "INSPECTION", "MANPOWER",
    "WORKER", "ATTENDANCE", "MOM", "PERMISSIONS"
]


class Tenant(models.Model):
    name = models.CharField(max_length=255)
    code = models.SlugField(max_length=100, unique=True, db_index=True)
    
    # Additional tenant information
    admin_email = models.EmailField(max_length=255, blank=True, null=True)
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    industry = models.CharField(max_length=100, blank=True, null=True)
    timezone = models.CharField(max_length=100, default='UTC')
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True, related_name="created_tenants")
    
    class Meta:
        db_table = "tenants"
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def save(self, *args, **kwargs):
        if not self.code:
            self.code = slugify(self.name)
        super().save(*args, **kwargs)


class Subscription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past Due"
        CANCELLED = "cancelled", "Cancelled"
        TRIAL = "trial", "Trial"
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="subscriptions")
    plan_name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = "subscriptions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status"]),
        ]
    
    def __str__(self):
        return f"{self.tenant.name} - {self.plan_name} ({self.status})"


class MasterAdmin(models.Model):
    user = models.OneToOneField("authentication.User", on_delete=models.CASCADE, related_name="master_profile")
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="masters")
    
    # Personal Information
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    
    # Professional Information
    designation = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    
    # Access Control
    role = models.CharField(max_length=50, default='admin', choices=[
        ('admin', 'Administrator'),
        ('manager', 'Manager'),
        ('viewer', 'Viewer')
    ])
    
    # Additional Settings
    timezone = models.CharField(max_length=100, default='UTC')
    language = models.CharField(max_length=10, default='en', choices=[
        ('en', 'English'),
        ('es', 'Spanish'),
        ('fr', 'French'),
        ('de', 'German'),
        ('hi', 'Hindi')
    ])
    
    # Metadata
    notes = models.TextField(blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True, related_name="created_masters")
    
    class Meta:
        db_table = "master_admins"
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"{self.user.email} - {self.tenant.name}"


class AthensTenantLink(models.Model):
    """Links Tenant to Athens modules and configuration"""
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='athens_link')
    enabled_modules = models.JSONField(default=list, help_text="List of enabled Athens modules")
    enabled_menus = models.JSONField(default=list, help_text="List of enabled menu items")
    is_active = models.BooleanField(default=True)
    synced_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="created_athens_links")

    class Meta:
        verbose_name = "Athens Tenant Link"
        verbose_name_plural = "Athens Tenant Links"
        db_table = "athens_tenant_links"

    def __str__(self):
        return f"Athens Link - {self.tenant.name}"

    def save(self, *args, **kwargs):
        if not self.enabled_modules:
            self.enabled_modules = DEFAULT_ATHENS_MODULES.copy()
        super().save(*args, **kwargs)


class AthensModuleSubscription(models.Model):
    """Individual module subscriptions for tenants"""
    PLAN_TIER_CHOICES = [
        ('basic', 'Basic'),
        ('premium', 'Premium'),
        ('enterprise', 'Enterprise'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='athens_module_subscriptions')
    module_code = models.CharField(max_length=50)
    enabled = models.BooleanField(default=True)
    plan_tier = models.CharField(max_length=20, choices=PLAN_TIER_CHOICES, default='basic')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['tenant', 'module_code']]
        verbose_name = "Athens Module Subscription"
        verbose_name_plural = "Athens Module Subscriptions"
        db_table = "athens_module_subscriptions"

    def __str__(self):
        return f"{self.tenant.name} - {self.module_code} ({self.plan_tier})"


class AthensAuditLog(models.Model):
    """Audit log for Athens control plane actions"""
    ACTION_CHOICES = [
        ('tenant_created', 'Tenant Created'),
        ('tenant_updated', 'Tenant Updated'),
        ('tenant_suspended', 'Tenant Suspended'),
        ('tenant_reactivated', 'Tenant Reactivated'),
        ('tenant_synced', 'Tenant Synced'),
        ('modules_updated', 'Modules Updated'),
        ('master_created', 'Master Created'),
        ('master_updated', 'Master Updated'),
        ('master_deleted', 'Master Deleted'),
        ('subscription_updated', 'Subscription Updated'),
    ]

    actor = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=50)
    before_data = models.JSONField(null=True, blank=True)
    after_data = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Athens Audit Log"
        verbose_name_plural = "Athens Audit Logs"
        db_table = "athens_audit_logs"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} - {self.entity_type}:{self.entity_id} by {self.actor}"

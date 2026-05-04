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
    
    # Company profile fields (filled by MasterAdmin on first login)
    address = models.TextField(blank=True, null=True)
    company_type = models.CharField(max_length=50, blank=True, null=True)
    contact_name = models.CharField(max_length=100, blank=True, null=True)
    contact_designation = models.CharField(max_length=100, blank=True, null=True)
    profile_submitted = models.BooleanField(default=False)

    # Approval workflow
    APPROVAL_PENDING = 'pending'
    APPROVAL_APPROVED = 'approved'
    APPROVAL_REJECTED = 'rejected'
    APPROVAL_STATUS_CHOICES = [
        (APPROVAL_PENDING, 'Pending'),
        (APPROVAL_APPROVED, 'Approved'),
        (APPROVAL_REJECTED, 'Rejected'),
    ]
    approval_status = models.CharField(
        max_length=20,
        choices=APPROVAL_STATUS_CHOICES,
        default=APPROVAL_APPROVED,  # existing tenants stay approved
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='approved_tenants'
    )
    rejection_reason = models.TextField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    
    # Subscription window — controls access for ALL users under this tenant
    subscription_start_date = models.DateField(null=True, blank=True)
    subscription_end_date = models.DateField(null=True, blank=True)

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


class Service(models.Model):
    """External services that can be enabled for tenants"""
    SERVICE_TYPE_CHOICES = [
        ('hr_workforce', 'HR & Workforce Management'),
        ('finance', 'Finance & Accounting'),
        ('crm', 'Customer Relationship Management'),
        ('inventory', 'Inventory Management'),
        ('project', 'Project Management'),
        ('sustainability', 'Sustainability & ESG'),
        ('other', 'Other'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    code = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    service_type = models.CharField(max_length=50, choices=SERVICE_TYPE_CHOICES)
    base_url = models.CharField(max_length=255, help_text="Base URL path for the service")
    icon = models.CharField(max_length=50, default='cube')
    is_active = models.BooleanField(default=True)
    features = models.JSONField(default=dict, help_text="Service features by tier")
    pricing = models.JSONField(default=dict, help_text="Pricing by tier")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "services"
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.code:
            self.code = slugify(self.name)
        super().save(*args, **kwargs)


class TenantService(models.Model):
    """Links tenants to enabled services"""
    TIER_CHOICES = [
        ('starter', 'Starter'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tenant_services')
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='service_tenants')
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default='starter')
    is_enabled = models.BooleanField(default=True)
    credentials = models.JSONField(default=dict, help_text="Service-specific credentials")
    config = models.JSONField(default=dict, help_text="Service-specific configuration")
    enabled_at = models.DateTimeField(auto_now_add=True)
    disabled_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = "tenant_services"
        unique_together = [['tenant', 'service']]
        ordering = ['-enabled_at']
    
    def __str__(self):
        return f"{self.tenant.name} - {self.service.name} ({self.tier})"


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
        ('starter', 'Starter'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='athens_module_subscriptions')
    module_code = models.CharField(max_length=50)
    enabled = models.BooleanField(default=True)
    plan_tier = models.CharField(max_length=20, choices=PLAN_TIER_CHOICES, default='starter')
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


class CollaborationProject(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        PAUSED = 'paused', 'Paused'
        ENDED = 'ended', 'Ended'

    slug = models.SlugField(max_length=100, unique=True)
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.ACTIVE)
    created_by = models.ForeignKey(
        "authentication.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_collaboration_projects',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "collaboration_projects"

    def __str__(self):
        return self.title


class CollaborationMembership(models.Model):
    class Role(models.TextChoices):
        CLIENT = 'client', 'Client'
        EPC = 'epc', 'EPC'
        CONTRACTOR = 'contractor', 'Contractor'
        VIEWER = 'viewer', 'Viewer'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'

    collaboration_project = models.ForeignKey(
        CollaborationProject,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='collaboration_memberships')
    role = models.CharField(max_length=32, choices=Role.choices)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('collaboration_project', 'tenant')
        db_table = "collaboration_memberships"

    def __str__(self):
        return f"{self.collaboration_project_id}:{self.tenant_id}:{self.role}"


class CollaborationSharePolicy(models.Model):
    collaboration_project = models.ForeignKey(
        CollaborationProject,
        on_delete=models.CASCADE,
        related_name='share_policies',
    )
    domain = models.CharField(max_length=100)
    allowed_actions = models.JSONField(default=list)
    filters = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('collaboration_project', 'domain')
        db_table = "collaboration_share_policies"

    def __str__(self):
        return f"{self.collaboration_project_id}:{self.domain}"

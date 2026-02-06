from django.db import models
from django.utils.text import slugify


class Tenant(models.Model):
    name = models.CharField(max_length=255)
    code = models.SlugField(max_length=100, unique=True, db_index=True)
    
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
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True, related_name="created_masters")
    
    class Meta:
        db_table = "master_admins"
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"{self.user.email} - {self.tenant.name}"

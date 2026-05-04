"""
Contractor Compliance Models for CLRA Automation
Enables full statutory compliance tracking and contract labour management
"""
from django.db import models
from django.core.validators import MinValueValidator
from authentication.models import User, Project


class ContractorMaster(models.Model):
    """
    TABLE 1: Contractor Master Registry
    Replaces JSON contractor storage with relational structure
    Includes both Contractors and EPC companies for compliance tracking
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
    ]
    
    COMPANY_TYPE_CHOICES = [
        ('contractor', 'Contractor'),
        ('epc', 'EPC'),
    ]
    
    athens_tenant_id = models.IntegerField(db_index=True)
    company_type = models.CharField(max_length=20, choices=COMPANY_TYPE_CHOICES, default='contractor')
    company_name = models.CharField(max_length=255)
    company_address = models.TextField()
    contact_person = models.CharField(max_length=200)
    contact_number = models.CharField(max_length=20)
    email = models.EmailField()
    pan_number = models.CharField(max_length=20, blank=True)
    gst_number = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'contractor_master'
        unique_together = ['athens_tenant_id', 'company_name']
        indexes = [
            models.Index(fields=['athens_tenant_id', 'status']),
            models.Index(fields=['company_type']),
            models.Index(fields=['email']),
        ]
    
    def __str__(self):
        return f"{self.company_name} ({self.company_type.upper()})"


class ContractorCompliance(models.Model):
    """
    TABLE 2: Contractor Compliance Registry
    Handles statutory compliance per branch/factory
    Enables CLRA license tracking and worker limit validation
    """
    contractor = models.ForeignKey(ContractorMaster, on_delete=models.CASCADE, related_name='compliance_records')
    branch_id = models.IntegerField(help_text='Branch/Factory ID where contractor operates')
    
    # CLRA License Details
    clra_license_number = models.CharField(max_length=100)
    license_valid_from = models.DateField()
    license_valid_to = models.DateField()
    max_worker_limit = models.IntegerField(validators=[MinValueValidator(1)])
    
    # Statutory Registration
    pf_code = models.CharField(max_length=100, blank=True)
    esi_code = models.CharField(max_length=100, blank=True)
    labour_registration_number = models.CharField(max_length=100, blank=True)
    
    # Compliance Tracking
    last_return_filed = models.DateField(null=True, blank=True, help_text='Last CLRA return filing date')
    is_compliant = models.BooleanField(default=True)
    compliance_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'contractor_compliance'
        unique_together = ['contractor', 'branch_id']
        indexes = [
            models.Index(fields=['license_valid_to']),
            models.Index(fields=['is_compliant']),
        ]
    
    def __str__(self):
        return f"{self.contractor.company_name} - {self.clra_license_number}"
    
    @property
    def is_license_valid(self):
        from datetime import date
        return self.license_valid_from <= date.today() <= self.license_valid_to
    
    @property
    def days_to_expiry(self):
        from datetime import date
        if not self.is_license_valid:
            return 0
        return (self.license_valid_to - date.today()).days


class ContractLabourDeployment(models.Model):
    """
    TABLE 3: Contract Labour Deployment
    Tracks worker deployment under contractors
    Replaces JSON contractor_company_ids in Project model
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('terminated', 'Terminated'),
    ]
    
    athens_tenant_id = models.IntegerField(db_index=True)
    branch_id = models.IntegerField(help_text='Branch/Factory ID')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='contract_deployments')
    contractor_compliance = models.ForeignKey(ContractorCompliance, on_delete=models.PROTECT, related_name='deployments')
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='contract_deployments')
    
    # Deployment Details
    wage_rate = models.DecimalField(max_digits=10, decimal_places=2)
    deployment_start = models.DateField()
    deployment_end = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Work Order Reference
    work_order_number = models.CharField(max_length=100, blank=True)
    work_order_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'contract_labour_deployment'
        indexes = [
            models.Index(fields=['athens_tenant_id', 'status']),
            models.Index(fields=['project', 'status']),
            models.Index(fields=['contractor_compliance']),
            models.Index(fields=['deployment_start', 'deployment_end']),
        ]
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.contractor_compliance.contractor.company_name}"
    
    @property
    def is_active(self):
        from datetime import date
        if self.status != 'active':
            return False
        if self.deployment_end and self.deployment_end < date.today():
            return False
        return True


# Import Employee model for FK reference
from workforce.models import Employee

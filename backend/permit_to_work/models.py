from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from authentication.models import User
from ergon.models import Project


class PermitType(models.Model):
    """Permit categories and configurations"""
    RISK_LEVEL_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('extreme', 'Extreme'),
    ]
    
    PERMIT_CATEGORY_CHOICES = [
        ('hot_work', 'Hot Work'),
        ('confined_space', 'Confined Space'),
        ('electrical', 'Electrical Work'),
        ('height', 'Work at Height'),
        ('excavation', 'Excavation'),
        ('cold_work', 'Cold Work'),
    ]
    
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=PERMIT_CATEGORY_CHOICES)
    description = models.TextField(blank=True)
    color_code = models.CharField(max_length=20, default='#1890ff')
    risk_level = models.CharField(max_length=10, choices=RISK_LEVEL_CHOICES, default='low')
    validity_hours = models.PositiveIntegerField(default=24)
    requires_approval_levels = models.PositiveIntegerField(default=1)
    active = models.BooleanField(default=True)
    requires_gas_testing = models.BooleanField(default=False)
    requires_fire_watch = models.BooleanField(default=False)
    requires_isolation = models.BooleanField(default=False)
    requires_structured_isolation = models.BooleanField(default=False)
    requires_deisolation_on_closeout = models.BooleanField(default=False)
    requires_medical_surveillance = models.BooleanField(default=False)
    requires_training_verification = models.BooleanField(default=False)
    mandatory_ppe = models.JSONField(default=list, blank=True)
    safety_checklist = models.JSONField(default=list, blank=True)
    risk_factors = models.JSONField(default=list, blank=True)
    control_measures = models.JSONField(default=list, blank=True)
    emergency_procedures = models.JSONField(default=list, blank=True)
    form_template = models.JSONField(default=dict, blank=True)
    project_overrides_enabled = models.BooleanField(default=False)
    escalation_time_hours = models.PositiveIntegerField(default=4)
    min_personnel_required = models.PositiveIntegerField(default=1)
    max_validity_extensions = models.PositiveIntegerField(default=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'ptw_permittype'
        ordering = ['name']


class Permit(models.Model):
    """Core permit model with multi-tenant support"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
        ('rejected', 'Rejected'),
    ]
    
    # Multi-tenant
    athens_tenant_id = models.IntegerField(db_index=True)
    
    # Basic Information
    permit_number = models.CharField(max_length=50, unique=True)
    permit_type = models.ForeignKey(PermitType, on_delete=models.CASCADE, related_name='permits')
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField()
    location = models.CharField(max_length=255)
    
    # Time Information
    planned_start_time = models.DateTimeField()
    planned_end_time = models.DateTimeField()
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    
    # People
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='permits_created')
    issuer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='permits_issued')
    receiver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='permits_received')
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Risk Assessment
    probability = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], default=1)
    severity = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], default=1)
    risk_score = models.PositiveSmallIntegerField(default=1)
    risk_level = models.CharField(max_length=10, choices=PermitType.RISK_LEVEL_CHOICES, default='low')
    
    # Safety
    control_measures = models.TextField(blank=True)
    ppe_requirements = models.JSONField(default=list, blank=True)
    safety_checklist = models.JSONField(default=dict, blank=True)
    
    # QR Code
    qr_code = models.TextField(blank=True)
    
    # Project
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='permits', null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.permit_number} - {self.permit_type.name}"
    
    def calculate_risk_score(self):
        self.risk_score = self.probability * self.severity
        if self.risk_score <= 4:
            self.risk_level = 'low'
        elif self.risk_score <= 9:
            self.risk_level = 'medium'
        elif self.risk_score <= 16:
            self.risk_level = 'high'
        else:
            self.risk_level = 'extreme'
        return self.risk_score
    
    class Meta:
        db_table = 'ptw_permit'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['athens_tenant_id', 'status']),
            models.Index(fields=['permit_number']),
            models.Index(fields=['created_at']),
        ]


class WorkflowTemplate(models.Model):
    """Workflow definitions"""
    name = models.CharField(max_length=100)
    permit_type = models.ForeignKey(PermitType, on_delete=models.CASCADE, related_name='workflow_templates')
    risk_level = models.CharField(max_length=10, choices=PermitType.RISK_LEVEL_CHOICES)
    steps = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.permit_type.name}"
    
    class Meta:
        db_table = 'ptw_workflowtemplate'


class WorkflowInstance(models.Model):
    """Active workflows"""
    permit = models.OneToOneField(Permit, on_delete=models.CASCADE, related_name='workflow')
    template = models.ForeignKey(WorkflowTemplate, on_delete=models.CASCADE, related_name='instances', null=True, blank=True)
    current_step = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=20, default='active')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Workflow for {self.permit.permit_number}"
    
    class Meta:
        db_table = 'ptw_workflowinstance'


class WorkflowStep(models.Model):
    """Workflow step tracking"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]
    
    workflow = models.ForeignKey(WorkflowInstance, on_delete=models.CASCADE, related_name='steps')
    step_id = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    step_type = models.CharField(max_length=20)
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='workflow_assignments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    order = models.PositiveSmallIntegerField()
    completed_at = models.DateTimeField(null=True, blank=True)
    comments = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.name} - {self.workflow.permit.permit_number}"
    
    class Meta:
        db_table = 'ptw_workflowstep'
        ordering = ['order']
        unique_together = ['workflow', 'step_id']


class PermitExtension(models.Model):
    """Time extensions"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    permit = models.ForeignKey(Permit, on_delete=models.CASCADE, related_name='extensions')
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='requested_extensions')
    requested_at = models.DateTimeField(auto_now_add=True)
    original_end_time = models.DateTimeField()
    new_end_time = models.DateTimeField()
    extension_hours = models.PositiveIntegerField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approved_extensions')
    approved_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Extension for {self.permit.permit_number} (+{self.extension_hours}h)"
    
    class Meta:
        db_table = 'ptw_permitextension'


class DigitalSignature(models.Model):
    """E-signatures with JSON payload"""
    SIGNATURE_TYPE_CHOICES = [
        ('issuer', 'Permit Issuer'),
        ('receiver', 'Permit Receiver'),
        ('approver', 'Approver'),
        ('verifier', 'Verifier'),
    ]
    
    permit = models.ForeignKey(Permit, on_delete=models.CASCADE, related_name='signatures')
    signature_type = models.CharField(max_length=20, choices=SIGNATURE_TYPE_CHOICES)
    signatory = models.ForeignKey(User, on_delete=models.CASCADE, related_name='signatures')
    signature_payload = models.JSONField(null=True, blank=True)
    signed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.signature_type} by {self.signatory} for {self.permit.permit_number}"
    
    class Meta:
        db_table = 'ptw_digitalsignature'
        unique_together = ['permit', 'signature_type', 'signatory']
        ordering = ['-signed_at']


class PermitAudit(models.Model):
    """Audit trail"""
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    permit = models.ForeignKey(Permit, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    comments = models.TextField(blank=True)
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    
    def __str__(self):
        return f"{self.action} on {self.permit.permit_number} by {self.user}"
    
    class Meta:
        db_table = 'ptw_permitaudit'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['permit', '-timestamp']),
        ]


class GasReading(models.Model):
    """Gas testing records"""
    GAS_TYPE_CHOICES = [
        ('O2', 'Oxygen'),
        ('CO', 'Carbon Monoxide'),
        ('H2S', 'Hydrogen Sulfide'),
        ('CH4', 'Methane'),
    ]
    
    permit = models.ForeignKey(Permit, on_delete=models.CASCADE, related_name='gas_readings')
    gas_type = models.CharField(max_length=10, choices=GAS_TYPE_CHOICES)
    reading = models.FloatField()
    unit = models.CharField(max_length=10)
    status = models.CharField(max_length=10, choices=[('safe', 'Safe'), ('unsafe', 'Unsafe')])
    tested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='gas_tests')
    tested_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.gas_type}: {self.reading}{self.unit} - {self.permit.permit_number}"
    
    class Meta:
        db_table = 'ptw_gasreading'
        ordering = ['-tested_at']


class IsolationPointLibrary(models.Model):
    """LOTO points catalog"""
    POINT_TYPE_CHOICES = [
        ('valve', 'Valve'),
        ('breaker', 'Circuit Breaker'),
        ('switch', 'Switch'),
    ]
    
    athens_tenant_id = models.IntegerField(db_index=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='isolation_points', null=True, blank=True)
    point_code = models.CharField(max_length=50)
    point_type = models.CharField(max_length=20, choices=POINT_TYPE_CHOICES)
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.point_code} - {self.point_type}"
    
    class Meta:
        db_table = 'ptw_isolationpointlibrary'
        ordering = ['point_code']
        indexes = [
            models.Index(fields=['athens_tenant_id', 'point_code']),
        ]


class PermitIsolationPoint(models.Model):
    """Isolation assignments"""
    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('isolated', 'Isolated'),
        ('verified', 'Verified'),
        ('deisolated', 'De-isolated'),
    ]
    
    permit = models.ForeignKey(Permit, on_delete=models.CASCADE, related_name='isolation_points')
    point = models.ForeignKey(IsolationPointLibrary, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')
    isolated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='isolations_performed')
    isolated_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='isolations_verified')
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        name = self.point.point_code if self.point else 'Custom'
        return f"{name} - {self.permit.permit_number} ({self.status})"
    
    class Meta:
        db_table = 'ptw_permitisolationpoint'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['permit', 'status']),
        ]


class CloseoutChecklistTemplate(models.Model):
    """Closeout templates"""
    permit_type = models.ForeignKey(PermitType, on_delete=models.CASCADE, related_name='closeout_templates')
    name = models.CharField(max_length=100)
    risk_level = models.CharField(max_length=10, choices=PermitType.RISK_LEVEL_CHOICES, null=True, blank=True)
    items = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.permit_type.name}"
    
    class Meta:
        db_table = 'ptw_closeoutchecklisttemplate'
        ordering = ['permit_type', 'name']


class PermitCloseout(models.Model):
    """Closeout tracking"""
    permit = models.OneToOneField(Permit, on_delete=models.CASCADE, related_name='closeout')
    template = models.ForeignKey(CloseoutChecklistTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    checklist = models.JSONField(default=dict)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='closeouts_completed')
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        status = "Completed" if self.completed else "Pending"
        return f"Closeout for {self.permit.permit_number} - {status}"
    
    class Meta:
        db_table = 'ptw_permitcloseout'
        ordering = ['-created_at']

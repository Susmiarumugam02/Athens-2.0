from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from authentication.models import Project
from .status_utils import normalize_permit_status
import json
import uuid

User = get_user_model()

class PermitType(models.Model):
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
        ('chemical', 'Chemical Work'),
        ('crane_lifting', 'Crane & Lifting Operations'),
        ('cold_work', 'Cold Work'),
        ('specialized', 'Specialized Work'),
        ('marine', 'Marine Operations'),
        ('diving', 'Diving Operations'),
        ('blasting', 'Blasting & Explosives'),
        ('radiation', 'Radiation Work'),
        ('biological', 'Biological Hazards'),
        ('environmental', 'Environmental Work'),
        ('mining', 'Mining Operations'),
        ('oil_gas', 'Oil & Gas Operations'),
        ('nuclear', 'Nuclear Operations'),
        ('aerospace', 'Aerospace Operations'),
        ('airline', 'Airline Operations'),
        ('pharmaceutical', 'Pharmaceutical Work'),
        ('food_processing', 'Food Processing'),
        ('construction', 'Construction Work'),
        ('manufacturing', 'Manufacturing Operations'),
        ('utilities', 'Utilities Work'),
        ('transportation', 'Transportation Operations'),
    ]

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=PERMIT_CATEGORY_CHOICES)
    description = models.TextField(blank=True, null=True)
    color_code = models.CharField(max_length=20, default='#1890ff')
    is_active = models.BooleanField(default=True)
    risk_level = models.CharField(max_length=10, choices=RISK_LEVEL_CHOICES, default='low')
    validity_hours = models.PositiveIntegerField(default=24)
    requires_approval_levels = models.PositiveIntegerField(default=1)
    active = models.BooleanField(default=True)
    
    # Advanced configurations
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
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']

class PermitTypeTemplateOverride(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='permit_type_template_overrides')
    permit_type = models.ForeignKey(PermitType, on_delete=models.CASCADE, related_name='template_overrides')
    override_template = models.JSONField(default=dict, blank=True)
    override_prefill = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.project} - {self.permit_type} override"

    class Meta:
        unique_together = ('project', 'permit_type')

class Permit(models.Model):
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
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    WORK_NATURE_CHOICES = [
        ('day', 'Day Work'),
        ('night', 'Night Work'),
        ('both', 'Day & Night Work'),
    ]
    
    # Basic Information
    permit_number = models.CharField(max_length=50, unique=True)
    permit_type = models.ForeignKey(PermitType, on_delete=models.CASCADE, related_name='permits')
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField()
    work_order_id = models.CharField(max_length=50, blank=True)
    
    # Location Information
    location = models.CharField(max_length=255)
    gps_coordinates = models.CharField(max_length=100, blank=True)
    site_layout = models.FileField(upload_to='permit_layouts/', blank=True, null=True)
    
    # Time Information
    planned_start_time = models.DateTimeField()
    planned_end_time = models.DateTimeField()
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    
    # Work Nature
    work_nature = models.CharField(max_length=10, choices=WORK_NATURE_CHOICES, default='day')
    
    # People Information
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='permits_created')
    issuer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='permits_issued')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='permits_received')
    
    # Contact Information
    issuer_designation = models.CharField(max_length=100, blank=True)
    issuer_department = models.CharField(max_length=100, blank=True)
    issuer_contact = models.CharField(max_length=20, blank=True)
    receiver_designation = models.CharField(max_length=100, blank=True)
    receiver_department = models.CharField(max_length=100, blank=True)
    receiver_contact = models.CharField(max_length=20, blank=True)
    
    # Status and Priority
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    current_approval_level = models.PositiveSmallIntegerField(default=1)
    
    # Risk Assessment
    risk_assessment_id = models.CharField(max_length=50, blank=True)
    risk_assessment_completed = models.BooleanField(default=False)
    probability = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], default=1)
    severity = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], default=1)
    risk_score = models.PositiveSmallIntegerField(default=1)
    risk_level = models.CharField(max_length=10, choices=PermitType.RISK_LEVEL_CHOICES, default='low')
    
    # Safety Information
    control_measures = models.TextField(blank=True)
    ppe_requirements = models.JSONField(default=list, blank=True)
    special_instructions = models.TextField(blank=True)
    safety_checklist = models.JSONField(default=dict, blank=True)
    
    # Isolation Requirements
    requires_isolation = models.BooleanField(default=False)
    isolation_details = models.TextField(blank=True)
    isolation_verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='isolation_verifications')
    isolation_certificate = models.FileField(upload_to='isolation_certificates/', blank=True, null=True)
    
    # Authorization
    approver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='permits_to_approve')
    area_incharge = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='area_permits')
    department_head = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='dept_permits')
    
    # Documentation
    work_procedure = models.FileField(upload_to='work_procedures/', blank=True, null=True)
    method_statement = models.FileField(upload_to='method_statements/', blank=True, null=True)
    risk_assessment_doc = models.FileField(upload_to='risk_assessments/', blank=True, null=True)
    
    # QR Code and Mobile
    qr_code = models.TextField(blank=True)
    mobile_created = models.BooleanField(default=False)
    offline_id = models.CharField(max_length=100, blank=True)
    version = models.IntegerField(default=1, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Approval tracking
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='permits_approved')
    approval_comments = models.TextField(blank=True)
    
    # Verification tracking
    verifier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='permits_verified')
    verified_at = models.DateTimeField(null=True, blank=True)
    verification_comments = models.TextField(blank=True)
    
    # Project association
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='permits', null=True, blank=True)
    
    # Compliance and Audit
    compliance_standards = models.JSONField(default=list, blank=True)
    audit_trail = models.JSONField(default=list, blank=True)
    permit_parameters = models.JSONField(default=dict, blank=True)
    
    # Additional fields
    other_hazards = models.TextField(blank=True, default='', help_text='Additional hazards not covered in standard categories')
    
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

    def can_transition_to(self, new_status):
        current_status = normalize_permit_status(self.status)
        target_status = normalize_permit_status(new_status)
        valid_transitions = {
            'draft': ['submitted', 'cancelled'],
            'submitted': ['under_review', 'rejected', 'draft'],
            'under_review': ['approved', 'rejected', 'submitted'],
            'approved': ['active', 'cancelled'],
            'active': ['completed', 'suspended', 'expired'],
            'suspended': ['active', 'cancelled'],
            'completed': [],
            'cancelled': [],
            'expired': [],
            'rejected': ['draft']
        }
        return target_status in valid_transitions.get(current_status, [])

    def is_expired(self):
        return timezone.now() > self.planned_end_time and self.status == 'active'

    def get_duration_hours(self):
        if self.actual_start_time and self.actual_end_time:
            return (self.actual_end_time - self.actual_start_time).total_seconds() / 3600
        return (self.planned_end_time - self.planned_start_time).total_seconds() / 3600
    
    def is_within_work_hours(self, check_time=None):
        """Check if current time is within allowed work hours based on master settings"""
        from .utils import get_work_time_settings
        
        if not check_time:
            check_time = timezone.now().time()
        
        settings = get_work_time_settings()
        
        if self.work_nature == 'day':
            return settings['day_start'] <= check_time <= settings['day_end']
        elif self.work_nature == 'night':
            return check_time >= settings['night_start'] or check_time <= settings['night_end']
        else:  # both
            day_valid = settings['day_start'] <= check_time <= settings['day_end']
            night_valid = check_time >= settings['night_start'] or check_time <= settings['night_end']
            return day_valid or night_valid
    
    def get_work_hours_display(self):
        """Get human readable work hours from master settings"""
        from .utils import get_work_time_settings
        
        settings = get_work_time_settings()
        
        if self.work_nature == 'day':
            return f"Day Work: {settings['day_start'].strftime('%I:%M %p')} - {settings['day_end'].strftime('%I:%M %p')}"
        elif self.work_nature == 'night':
            return f"Night Work: {settings['night_start'].strftime('%I:%M %p')} - {settings['night_end'].strftime('%I:%M %p')}"
        else:
            return f"Day: {settings['day_start'].strftime('%I:%M %p')}-{settings['day_end'].strftime('%I:%M %p')}, Night: {settings['night_start'].strftime('%I:%M %p')}-{settings['night_end'].strftime('%I:%M %p')}"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['permit_number']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['permit_type']),
        ]

class WorkflowTemplate(models.Model):
    name = models.CharField(max_length=100)
    permit_type = models.ForeignKey(PermitType, on_delete=models.CASCADE, related_name='workflow_templates')
    risk_level = models.CharField(max_length=10, choices=PermitType.RISK_LEVEL_CHOICES)
    steps = models.JSONField(default=list)
    auto_escalation = models.BooleanField(default=True)
    parallel_processing = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.permit_type.name}"

class WorkflowInstance(models.Model):
    permit = models.OneToOneField(Permit, on_delete=models.CASCADE, related_name='workflow')
    template = models.ForeignKey(WorkflowTemplate, on_delete=models.CASCADE, related_name='instances', null=True, blank=True)
    current_step = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=20, default='active')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Workflow for {self.permit.permit_number}"

class WorkflowStep(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
        ('skipped', 'Skipped'),
    ]
    
    workflow = models.ForeignKey(WorkflowInstance, on_delete=models.CASCADE, related_name='steps')
    step_id = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    step_type = models.CharField(max_length=20)  # approval, review, verification, notification
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='workflow_assignments')
    role = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    order = models.PositiveSmallIntegerField()
    escalation_time = models.PositiveSmallIntegerField(null=True, blank=True)  # hours
    required = models.BooleanField(default=True)
    conditions = models.JSONField(default=list, blank=True)
    
    # Action tracking
    completed_at = models.DateTimeField(null=True, blank=True)
    comments = models.TextField(blank=True)
    signature = models.TextField(blank=True)
    attachments = models.JSONField(default=list, blank=True)
    
    def __str__(self):
        return f"{self.name} - {self.workflow.permit.permit_number}"
    
    class Meta:
        ordering = ['order']
        unique_together = ['workflow', 'step_id']

class PermitExtension(models.Model):
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
    justification = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approved_extensions')
    approved_at = models.DateTimeField(null=True, blank=True)
    comments = models.TextField(blank=True, null=True)
    
    # Work nature specific fields
    affects_work_nature = models.BooleanField(default=False)
    new_work_nature = models.CharField(max_length=10, choices=Permit.WORK_NATURE_CHOICES, blank=True)
    safety_reassessment_required = models.BooleanField(default=False)
    safety_reassessment_completed = models.BooleanField(default=False)
    additional_safety_measures = models.TextField(blank=True)
    
    def __str__(self):
        return f"Extension for {self.permit.permit_number} (+{self.extension_hours}h)"
    
    def save(self, *args, **kwargs):
        # Auto-calculate extension hours
        if self.original_end_time and self.new_end_time:
            self.extension_hours = int((self.new_end_time - self.original_end_time).total_seconds() / 3600)
        
        # Check if extension affects work nature (day to night or vice versa)
        if self.permit and self.new_end_time:
            original_nature = self.permit.work_nature
            # Logic to determine if extension crosses into different work hours
            self.affects_work_nature = self._check_work_nature_change()
            
        super().save(*args, **kwargs)
    
    def _check_work_nature_change(self):
        """Check if time extension changes work nature requirements"""
        from .utils import get_work_time_settings
        
        if not self.new_end_time:
            return False
        
        settings = get_work_time_settings()
        end_time = self.new_end_time.time()
        
        if self.permit.work_nature == 'day':
            # Day work extending into night hours
            return end_time > settings['day_end'] or end_time < settings['night_end']
        elif self.permit.work_nature == 'night':
            # Night work extending into day hours
            return settings['day_start'] <= end_time <= settings['day_end']
        
        return False

# Removed WorkTimeExtension model - time management handled centrally

class PermitWorker(models.Model):
    permit = models.ForeignKey(Permit, on_delete=models.CASCADE, related_name='assigned_workers')
    worker = models.ForeignKey('worker.Worker', on_delete=models.CASCADE, related_name='permit_assignments')
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='worker_assignments')
    assigned_at = models.DateTimeField(auto_now_add=True)
    role = models.CharField(max_length=50, blank=True)  # lead, assistant, observer
    competency_verified = models.BooleanField(default=False)
    training_valid = models.BooleanField(default=False)
    medical_clearance = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('permit', 'worker')
    
    def __str__(self):
        return f"{self.worker} assigned to {self.permit.permit_number}"


class PermitToolboxTalk(models.Model):
    permit = models.OneToOneField(Permit, on_delete=models.CASCADE, related_name='toolbox_talk')
    title = models.CharField(max_length=200, blank=True)
    conducted_at = models.DateTimeField(null=True, blank=True)
    conducted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='toolbox_talks_conducted'
    )
    document = models.FileField(upload_to='permit_toolbox_talks/', blank=True, null=True)
    url = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"TBT for {self.permit.permit_number}"


class PermitToolboxTalkAttendance(models.Model):
    tbt = models.ForeignKey(PermitToolboxTalk, on_delete=models.CASCADE, related_name='attendance')
    permit_worker = models.ForeignKey(PermitWorker, on_delete=models.CASCADE, related_name='tbt_attendance')
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    ack_signature = models.TextField(blank=True)

    class Meta:
        unique_together = ('tbt', 'permit_worker')

    def __str__(self):
        return f"TBT attendance for {self.permit_worker}"

class HazardLibrary(models.Model):
    category = models.CharField(max_length=50)
    hazard_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField()
    control_measures = models.JSONField(default=list)
    ppe_requirements = models.JSONField(default=list)
    risk_level = models.CharField(max_length=10, choices=PermitType.RISK_LEVEL_CHOICES)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.hazard_id} - {self.name}"
    
    class Meta:
        ordering = ['category', 'name']

class PermitHazard(models.Model):
    permit = models.ForeignKey(Permit, on_delete=models.CASCADE, related_name='identified_hazards')
    hazard = models.ForeignKey(HazardLibrary, on_delete=models.CASCADE, related_name='permit_instances')
    likelihood = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    severity = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    risk_score = models.PositiveSmallIntegerField()
    control_measures_applied = models.JSONField(default=list)
    residual_risk = models.PositiveSmallIntegerField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        self.risk_score = self.likelihood * self.severity
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.hazard.name} - {self.permit.permit_number}"

class GasReading(models.Model):
    GAS_TYPE_CHOICES = [
        ('O2', 'Oxygen'),
        ('CO', 'Carbon Monoxide'),
        ('H2S', 'Hydrogen Sulfide'),
        ('CH4', 'Methane'),
        ('CO2', 'Carbon Dioxide'),
        ('NH3', 'Ammonia'),
        ('Cl2', 'Chlorine'),
        ('SO2', 'Sulfur Dioxide'),
    ]
    
    permit = models.ForeignKey(Permit, on_delete=models.CASCADE, related_name='gas_readings')
    gas_type = models.CharField(max_length=10, choices=GAS_TYPE_CHOICES)
    reading = models.FloatField()
    unit = models.CharField(max_length=10)
    acceptable_range = models.CharField(max_length=50)
    status = models.CharField(max_length=10, choices=[('safe', 'Safe'), ('unsafe', 'Unsafe')])
    tested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='gas_tests')
    tested_at = models.DateTimeField(auto_now_add=True)
    equipment_used = models.CharField(max_length=100, blank=True)
    calibration_date = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.gas_type}: {self.reading}{self.unit} - {self.permit.permit_number}"
    
    class Meta:
        ordering = ['-tested_at']

class PermitPhoto(models.Model):
    PHOTO_TYPE_CHOICES = [
        ('before', 'Before Work'),
        ('during', 'During Work'),
        ('after', 'After Work'),
        ('incident', 'Incident'),
        ('equipment', 'Equipment'),
        ('ppe', 'PPE Verification'),
    ]
    
    permit = models.ForeignKey(Permit, on_delete=models.CASCADE, related_name='photos')
    photo = models.ImageField(upload_to='permit_photos/')
    photo_type = models.CharField(max_length=20, choices=PHOTO_TYPE_CHOICES)
    description = models.CharField(max_length=200, blank=True)
    taken_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='photos_taken')
    taken_at = models.DateTimeField(auto_now_add=True)
    gps_location = models.CharField(max_length=100, blank=True)
    offline_id = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return f"{self.photo_type} photo for {self.permit.permit_number}"
    
    class Meta:
        ordering = ['-taken_at']

class DigitalSignature(models.Model):
    SIGNATURE_TYPE_CHOICES = [
        ('requestor', 'Requestor'),
        ('verifier', 'Verifier'),
        ('issuer', 'Permit Issuer'),
        ('receiver', 'Permit Receiver'),
        ('approver', 'Approver'),
        ('safety_officer', 'Safety Officer'),
        ('area_manager', 'Area Manager'),
        ('witness', 'Witness'),
    ]
    
    permit = models.ForeignKey(Permit, on_delete=models.CASCADE, related_name='signatures')
    signature_type = models.CharField(max_length=20, choices=SIGNATURE_TYPE_CHOICES)
    signatory = models.ForeignKey(User, on_delete=models.CASCADE, related_name='signatures')
    signature_data = models.TextField()  # Base64 encoded signature (legacy)
    signature_payload = models.JSONField(null=True, blank=True)  # JSON strokes + metadata
    payload_version = models.PositiveSmallIntegerField(default=1)
    signed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_info = models.JSONField(default=dict, blank=True)
    
    def __str__(self):
        return f"{self.signature_type} signature by {self.signatory} for {self.permit.permit_number}"
    
    class Meta:
        unique_together = ['permit', 'signature_type', 'signatory']
        ordering = ['-signed_at']

class PermitAudit(models.Model):
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
        ('extended', 'Extended'),
        ('modified', 'Modified'),
        ('viewed', 'Viewed'),
        ('printed', 'Printed'),
        ('exported', 'Exported'),
    ]
    
    permit = models.ForeignKey(Permit, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    comments = models.TextField(blank=True, null=True)
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['permit', '-timestamp']),
            models.Index(fields=['action']),
            models.Index(fields=['user']),
        ]
    
    def __str__(self):
        return f"{self.action} on {self.permit.permit_number} by {self.user}"

class PermitApproval(models.Model):
    ACTION_CHOICES = [
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('request_changes', 'Request Changes'),
        ('delegate', 'Delegate'),
    ]
    
    permit = models.ForeignKey(Permit, on_delete=models.CASCADE, related_name='approvals')
    approver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='permit_approvals')
    approval_level = models.PositiveSmallIntegerField(default=1)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, null=True, blank=True)
    approved = models.BooleanField(null=True, blank=True)
    comments = models.TextField(blank=True, null=True)
    conditions = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    escalated_from = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='escalated_approvals')
    delegated_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='delegated_approvals')
    
    class Meta:
        ordering = ['approval_level', 'timestamp']
        unique_together = ['permit', 'approver', 'approval_level']
    
    def __str__(self):
        status = self.action or ("approved" if self.approved else "rejected" if self.approved is False else "pending")
        return f"Level {self.approval_level} {status} by {self.approver}"

class EscalationRule(models.Model):
    permit_type = models.ForeignKey(PermitType, on_delete=models.CASCADE, related_name='escalation_rules')
    step_name = models.CharField(max_length=100)
    time_limit_hours = models.PositiveIntegerField()
    escalate_to_role = models.CharField(max_length=50)
    notification_method = models.CharField(max_length=20, choices=[('email', 'Email'), ('sms', 'SMS'), ('both', 'Both')])
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.permit_type.name} - {self.step_name} escalation"

class NotificationTemplate(models.Model):
    TRIGGER_CHOICES = [
        ('permit_created', 'Permit Created'),
        ('approval_required', 'Approval Required'),
        ('permit_approved', 'Permit Approved'),
        ('permit_rejected', 'Permit Rejected'),
        ('permit_expired', 'Permit Expired'),
        ('escalation', 'Escalation'),
        ('reminder', 'Reminder'),
    ]
    
    name = models.CharField(max_length=100)
    trigger = models.CharField(max_length=30, choices=TRIGGER_CHOICES)
    subject = models.CharField(max_length=200)
    body = models.TextField()
    method = models.CharField(max_length=20, choices=[('email', 'Email'), ('sms', 'SMS'), ('push', 'Push'), ('all', 'All')])
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.name} - {self.trigger}"

class SystemIntegration(models.Model):
    INTEGRATION_TYPE_CHOICES = [
        ('erp', 'ERP System'),
        ('maintenance', 'Maintenance System'),
        ('safety', 'Safety System'),
        ('hr', 'HR System'),
        ('iot', 'IoT System'),
        ('notification', 'Notification System'),
        ('analytics', 'Analytics System'),
    ]
    
    STATUS_CHOICES = [
        ('connected', 'Connected'),
        ('disconnected', 'Disconnected'),
        ('error', 'Error'),
        ('syncing', 'Syncing'),
    ]
    
    name = models.CharField(max_length=100)
    integration_type = models.CharField(max_length=20, choices=INTEGRATION_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='disconnected')
    config = models.JSONField(default=dict)
    endpoints = models.JSONField(default=list)
    data_flow = models.CharField(max_length=20, choices=[('inbound', 'Inbound'), ('outbound', 'Outbound'), ('bidirectional', 'Bidirectional')])
    last_sync = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.name} - {self.integration_type}"

class AppliedOfflineChange(models.Model):
    """Track applied offline changes for idempotency"""
    device_id = models.CharField(max_length=255)
    offline_id = models.CharField(max_length=255)
    entity = models.CharField(max_length=50)
    server_id = models.IntegerField(null=True, blank=True)
    applied_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ptw_applied_offline_change'
        constraints = [
            models.UniqueConstraint(
                fields=['device_id', 'offline_id', 'entity'],
                name='unique_offline_change'
            )
        ]
        indexes = [
            models.Index(fields=['device_id', 'offline_id', 'entity'], name='ptw_applied_device_idx'),
        ]
    
    def __str__(self):
        return f"{self.entity} {self.offline_id} (device: {self.device_id})"

class ComplianceReport(models.Model):
    REPORT_TYPE_CHOICES = [
        ('daily', 'Daily Report'),
        ('weekly', 'Weekly Report'),
        ('monthly', 'Monthly Report'),
        ('audit', 'Audit Report'),
        ('incident', 'Incident Report'),
    ]
    
    name = models.CharField(max_length=100)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='generated_reports')
    generated_at = models.DateTimeField(auto_now_add=True)
    date_from = models.DateTimeField()
    date_to = models.DateTimeField()
    data = models.JSONField(default=dict)
    file_path = models.CharField(max_length=500, blank=True)
    
    def __str__(self):
        return f"{self.name} - {self.generated_at.strftime('%Y-%m-%d')}"

class CloseoutChecklistTemplate(models.Model):
    """Template for permit closeout checklists"""
    permit_type = models.ForeignKey(PermitType, on_delete=models.CASCADE, related_name='closeout_templates')
    name = models.CharField(max_length=100)
    risk_level = models.CharField(max_length=10, choices=PermitType.RISK_LEVEL_CHOICES, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    items = models.JSONField(default=list)  # [{"key": "tools_removed", "label": "...", "required": true}]
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        risk_str = f" ({self.risk_level})" if self.risk_level else ""
        return f"{self.name} - {self.permit_type.name}{risk_str}"
    
    class Meta:
        ordering = ['permit_type', 'risk_level', 'name']

class PermitCloseout(models.Model):
    """Tracks closeout checklist completion for a permit"""
    permit = models.OneToOneField(Permit, on_delete=models.CASCADE, related_name='closeout')
    template = models.ForeignKey(CloseoutChecklistTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    checklist = models.JSONField(default=dict)  # {"key": {"done": bool, "comments": str, "at": datetime, "by": user_id}}
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='closeouts_completed')
    remarks = models.TextField(blank=True)
    version = models.IntegerField(default=1, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        status = "Completed" if self.completed else "Pending"
        return f"Closeout for {self.permit.permit_number} - {status}"
    
    def get_missing_required_items(self):
        """Returns list of required items that are not completed"""
        if not self.template:
            return []
        
        missing = []
        for item in self.template.items:
            if item.get('required', False):
                key = item['key']
                if key not in self.checklist or not self.checklist[key].get('done', False):
                    missing.append(item['label'])
        return missing
    
    def is_complete(self):
        """Check if all required items are completed"""
        return len(self.get_missing_required_items()) == 0
    
    class Meta:
        ordering = ['-created_at']

class IsolationPointLibrary(models.Model):
    """Master catalog of isolation points (valves, breakers, LOTO points)"""
    POINT_TYPE_CHOICES = [
        ('valve', 'Valve'),
        ('breaker', 'Circuit Breaker'),
        ('switch', 'Switch'),
        ('disconnect', 'Disconnect'),
        ('line_blind', 'Line Blind'),
        ('fuse_pull', 'Fuse Pull'),
        ('other', 'Other'),
    ]
    
    ENERGY_TYPE_CHOICES = [
        ('electrical', 'Electrical'),
        ('mechanical', 'Mechanical'),
        ('hydraulic', 'Hydraulic'),
        ('pneumatic', 'Pneumatic'),
        ('chemical', 'Chemical'),
        ('thermal', 'Thermal'),
        ('gravity', 'Gravity'),
        ('radiation', 'Radiation'),
        ('other', 'Other'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='isolation_points', null=True, blank=True)
    site = models.CharField(max_length=100, blank=True)
    asset_tag = models.CharField(max_length=100, blank=True)
    point_code = models.CharField(max_length=50)
    point_type = models.CharField(max_length=20, choices=POINT_TYPE_CHOICES)
    energy_type = models.CharField(max_length=20, choices=ENERGY_TYPE_CHOICES)
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    isolation_method = models.TextField(blank=True)
    verification_method = models.TextField(blank=True)
    requires_lock = models.BooleanField(default=True)
    default_lock_count = models.PositiveIntegerField(default=1)
    ppe_required = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.point_code} - {self.point_type} ({self.energy_type})"
    
    class Meta:
        ordering = ['point_code']
        indexes = [
            models.Index(fields=['project', 'point_code']),
            models.Index(fields=['project', 'asset_tag']),
            models.Index(fields=['project', 'site']),
        ]
        unique_together = [['project', 'point_code']]

class PermitIsolationPoint(models.Model):
    """Isolation points assigned to a permit with verification tracking"""
    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('isolated', 'Isolated'),
        ('verified', 'Verified'),
        ('deisolated', 'De-isolated'),
        ('cancelled', 'Cancelled'),
    ]
    
    permit = models.ForeignKey(Permit, on_delete=models.CASCADE, related_name='isolation_points')
    point = models.ForeignKey(IsolationPointLibrary, on_delete=models.SET_NULL, null=True, blank=True, related_name='permit_assignments')
    custom_point_name = models.CharField(max_length=200, blank=True)
    custom_point_details = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')
    required = models.BooleanField(default=True)
    lock_applied = models.BooleanField(default=False)
    lock_count = models.PositiveIntegerField(default=0)
    lock_ids = models.JSONField(default=list, blank=True)
    isolated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='isolations_performed')
    isolated_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='isolations_verified')
    verified_at = models.DateTimeField(null=True, blank=True)
    verification_notes = models.TextField(blank=True)
    deisolated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deisolations_performed')
    deisolated_at = models.DateTimeField(null=True, blank=True)
    deisolated_notes = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    version = models.IntegerField(default=1, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        name = self.point.point_code if self.point else self.custom_point_name
        return f"{name} - {self.permit.permit_number} ({self.status})"
    
    class Meta:
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['permit', 'status']),
            models.Index(fields=['point']),
        ]

# Signals for audit trail and workflow management
@receiver(pre_save, sender=Permit)
def store_original_permit_data(sender, instance, **kwargs):
    if getattr(settings, 'DISABLE_MODEL_SIGNALS', False):
        return
    if instance.version is None:
        instance.version = 1

    if instance.pk:
        try:
            original = Permit.objects.get(pk=instance.pk)
            instance._original_status = original.status
            instance._original_data = {
                'status': original.status,
                'risk_score': original.risk_score,
                'risk_level': original.risk_level,
                'planned_start_time': original.planned_start_time.isoformat() if original.planned_start_time else None,
                'planned_end_time': original.planned_end_time.isoformat() if original.planned_end_time else None,
                'work_nature': original.work_nature,
            }
        except Permit.DoesNotExist:
            instance._original_status = None
            instance._original_data = {}
    else:
        instance._original_status = None
        instance._original_data = {}
    
    # Auto-calculate risk score
    instance.calculate_risk_score()
    
    # Generate permit number if not provided
    if not instance.permit_number:
        from datetime import datetime, time
        year = datetime.now().year
        count = Permit.objects.filter(created_at__year=year).count() + 1
        instance.permit_number = f"PTW-{year}-{count:06d}"
    
    # QR code data is generated after initial save to avoid regen on every update.

@receiver(post_save, sender=Permit)
def create_audit_log(sender, instance, created, **kwargs):
    if getattr(settings, 'DISABLE_MODEL_SIGNALS', False):
        return
    user = getattr(instance, '_current_user', None)
    if getattr(instance, '_skip_audit_log', False):
        instance._skip_audit_log = False
        return
    
    if created:
        PermitAudit.objects.create(
            permit=instance,
            action='created',
            user=user,
            comments=f"Permit {instance.permit_number} created",
            new_values={
                'status': instance.status,
                'permit_type': instance.permit_type.name if instance.permit_type else None,
                'location': instance.location,
            }
        )
    else:
        # Track status changes
        if hasattr(instance, '_original_status') and instance._original_status != instance.status:
            PermitAudit.objects.create(
                permit=instance,
                action=instance.status,
                user=user,
                comments=f"Status changed from {instance._original_status} to {instance.status}",
                old_values={'status': instance._original_status},
                new_values={'status': instance.status}
            )

    if created and not instance.qr_code:
        try:
            from .qr_utils import generate_permit_qr_data
            qr_code = generate_permit_qr_data(instance)
            Permit.objects.filter(pk=instance.pk).update(qr_code=qr_code)
            instance.qr_code = qr_code
        except Exception:
            pass

@receiver(post_save, sender=WorkflowStep)
def handle_workflow_step_completion(sender, instance, created, **kwargs):
    if getattr(settings, 'DISABLE_MODEL_SIGNALS', False):
        return
    if not created and instance.status in ['approved', 'completed']:
        # Check if all required steps are completed
        workflow = instance.workflow
        required_steps = workflow.steps.filter(required=True)
        completed_steps = required_steps.filter(status__in=['approved', 'completed'])
        
        if required_steps.count() == completed_steps.count():
            # All required steps completed, approve permit
            permit = workflow.permit
            if permit.can_transition_to('approved'):
                try:
                    from .canonical_workflow_manager import canonical_workflow_manager
                    approver = (
                        workflow.steps.filter(step_id='approval', status='approved')
                        .select_related('assignee')
                        .first()
                    )
                    if approver and approver.assignee:
                        canonical_workflow_manager.transition(
                            permit=permit,
                            new_status='approved',
                            user=approver.assignee,
                            action='approve'
                        )
                except Exception:
                    pass

@receiver(pre_save, sender=PermitExtension)
def store_original_extension_status(sender, instance, **kwargs):
    if getattr(settings, 'DISABLE_MODEL_SIGNALS', False):
        return
    if instance.pk:
        try:
            instance._original_status = PermitExtension.objects.get(pk=instance.pk).status
        except PermitExtension.DoesNotExist:
            instance._original_status = None
    else:
        instance._original_status = None
    
    # Calculate extension hours
    if instance.original_end_time and instance.new_end_time:
        instance.extension_hours = int((instance.new_end_time - instance.original_end_time).total_seconds() / 3600)

# Removed time extension signal handlers


# Webhook Models (PR17)
class WebhookEndpoint(models.Model):
    """Webhook configuration for outbound event notifications"""
    name = models.CharField(max_length=200)
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, null=True, blank=True, 
                                 help_text="Project scope (null = global)")
    url = models.URLField(max_length=500)
    secret = models.CharField(max_length=255, help_text="HMAC secret for signature")
    enabled = models.BooleanField(default=True)
    events = models.JSONField(default=list, help_text="List of event types to trigger")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='webhooks_created')
    
    # Status tracking
    last_sent_at = models.DateTimeField(null=True, blank=True)
    last_status_code = models.IntegerField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    
    class Meta:
        db_table = 'ptw_webhook_endpoint'
        indexes = [
            models.Index(fields=['project', 'enabled']),
            models.Index(fields=['enabled']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.url})"


class WebhookDeliveryLog(models.Model):
    """Log of webhook delivery attempts for debugging and idempotency"""
    webhook = models.ForeignKey(WebhookEndpoint, on_delete=models.CASCADE, related_name='deliveries')
    event = models.CharField(max_length=100)
    permit_id = models.IntegerField(null=True, blank=True)
    dedupe_key = models.CharField(max_length=255, help_text="event+permit_id+hour for idempotency")
    
    # Request/Response
    payload = models.JSONField()
    response_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    error = models.TextField(blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=[
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('pending', 'Pending')
    ], default='pending')
    
    sent_at = models.DateTimeField(auto_now_add=True)
    retry_count = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'ptw_webhook_delivery_log'
        constraints = [
            models.UniqueConstraint(
                fields=['webhook', 'dedupe_key'],
                name='unique_webhook_dedupe_key'
            )
        ]
        indexes = [
            models.Index(fields=['webhook', 'event']),
            models.Index(fields=['permit_id']),
            models.Index(fields=['sent_at']),
        ]
    
    def __str__(self):
        return f"{self.webhook.name} - {self.event} - {self.status}"

"""
PTW Phase 3 Models — Steps 21-35
All models are tenant-scoped via project FK (inherits from Permit).
"""
from django.db import models
from django.conf import settings
from django.utils import timezone

User = settings.AUTH_USER_MODEL


# ─────────────────────────────────────────────
# STEP 21 — Digital Twin / Site Map
# ─────────────────────────────────────────────
class SiteMap(models.Model):
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='site_maps')
    name = models.CharField(max_length=200)
    image = models.ImageField(upload_to='site_maps/', blank=True, null=True)
    width_meters = models.FloatField(default=100)
    height_meters = models.FloatField(default=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.project} - {self.name}"


class SiteZone(models.Model):
    ZONE_TYPE_CHOICES = [
        ('work', 'Work Zone'),
        ('hazard', 'Hazard Zone'),
        ('restricted', 'Restricted Area'),
        ('assembly', 'Assembly Point'),
        ('equipment', 'Equipment Area'),
        ('evacuation', 'Evacuation Route'),
    ]
    RISK_CHOICES = [('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('extreme', 'Extreme')]

    site_map = models.ForeignKey(SiteMap, on_delete=models.CASCADE, related_name='zones')
    name = models.CharField(max_length=200)
    zone_type = models.CharField(max_length=20, choices=ZONE_TYPE_CHOICES)
    risk_level = models.CharField(max_length=10, choices=RISK_CHOICES, default='low')
    color = models.CharField(max_length=20, default='#1890ff')
    # Polygon as list of {x, y} percent coords
    polygon = models.JSONField(default=list)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.site_map.name} - {self.name}"


class PermitZoneAssignment(models.Model):
    permit = models.ForeignKey('ptw.Permit', on_delete=models.CASCADE, related_name='zone_assignments')
    zone = models.ForeignKey(SiteZone, on_delete=models.CASCADE, related_name='permit_assignments')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('permit', 'zone')


# ─────────────────────────────────────────────
# STEP 22 — Conflict Detection Engine
# ─────────────────────────────────────────────
class ConflictRule(models.Model):
    SEVERITY_CHOICES = [('warning', 'Warning'), ('block', 'Block')]
    name = models.CharField(max_length=200)
    permit_type_a = models.ForeignKey('ptw.PermitType', on_delete=models.CASCADE, related_name='conflict_rules_a')
    permit_type_b = models.ForeignKey('ptw.PermitType', on_delete=models.CASCADE, related_name='conflict_rules_b')
    description = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='warning')
    recommendation = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class PermitConflict(models.Model):
    STATUS_CHOICES = [('open', 'Open'), ('overridden', 'Overridden'), ('resolved', 'Resolved')]
    permit_a = models.ForeignKey('ptw.Permit', on_delete=models.CASCADE, related_name='conflicts_as_a')
    permit_b = models.ForeignKey('ptw.Permit', on_delete=models.CASCADE, related_name='conflicts_as_b')
    rule = models.ForeignKey(ConflictRule, on_delete=models.SET_NULL, null=True, blank=True)
    conflict_score = models.FloatField(default=0)
    description = models.TextField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='open')
    overridden_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    override_reason = models.TextField(blank=True)
    detected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('permit_a', 'permit_b', 'rule')


# ─────────────────────────────────────────────
# STEP 23 — Weather Intelligence
# ─────────────────────────────────────────────
class WeatherReading(models.Model):
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='weather_readings')
    temperature_c = models.FloatField(null=True, blank=True)
    humidity_pct = models.FloatField(null=True, blank=True)
    wind_speed_kmh = models.FloatField(null=True, blank=True)
    wind_direction = models.CharField(max_length=10, blank=True)
    precipitation_mm = models.FloatField(null=True, blank=True)
    lightning_risk = models.BooleanField(default=False)
    visibility_km = models.FloatField(null=True, blank=True)
    aqi = models.IntegerField(null=True, blank=True)
    heat_index = models.FloatField(null=True, blank=True)
    risk_score = models.FloatField(default=0)  # 0-100
    risk_level = models.CharField(max_length=10, default='low')
    raw_data = models.JSONField(default=dict, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']
        get_latest_by = 'recorded_at'


class WeatherAlert(models.Model):
    ALERT_TYPE_CHOICES = [
        ('wind', 'High Wind'), ('rain', 'Heavy Rain'), ('lightning', 'Lightning'),
        ('heat', 'Extreme Heat'), ('aqi', 'Poor Air Quality'), ('visibility', 'Low Visibility'),
    ]
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='weather_alerts')
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    message = models.TextField()
    affected_permit_types = models.JSONField(default=list)
    auto_suspend = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)


# ─────────────────────────────────────────────
# STEP 24 — AI Approval Assistant
# ─────────────────────────────────────────────
class AIApprovalRecommendation(models.Model):
    RECOMMENDATION_CHOICES = [('approve', 'Approve'), ('reject', 'Reject'), ('modify', 'Request Modification')]
    permit = models.OneToOneField('ptw.Permit', on_delete=models.CASCADE, related_name='ai_recommendation')
    recommendation = models.CharField(max_length=10, choices=RECOMMENDATION_CHOICES)
    confidence_score = models.FloatField()  # 0-100
    reasoning = models.TextField()
    risk_factors = models.JSONField(default=list)
    missing_items = models.JSONField(default=list)
    suggestions = models.JSONField(default=list)
    generated_at = models.DateTimeField(auto_now_add=True)
    supervisor_override = models.BooleanField(default=False)
    override_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)


# ─────────────────────────────────────────────
# STEP 25 — Biometric & Face Validation
# ─────────────────────────────────────────────
class BiometricVerification(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('verified', 'Verified'), ('failed', 'Failed')]
    permit = models.ForeignKey('ptw.Permit', on_delete=models.CASCADE, related_name='biometric_verifications')
    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name='biometric_verifications')
    selfie_image = models.ImageField(upload_to='biometric/selfies/', blank=True, null=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    geofence_valid = models.BooleanField(default=False)
    face_match_score = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


# ─────────────────────────────────────────────
# STEP 26 — IoT & Sensor Integration
# ─────────────────────────────────────────────
class IoTDevice(models.Model):
    DEVICE_TYPE_CHOICES = [
        ('gas_detector', 'Gas Detector'), ('oxygen_monitor', 'Oxygen Monitor'),
        ('wearable', 'Wearable Sensor'), ('smart_helmet', 'Smart Helmet'),
        ('temperature', 'Temperature Sensor'), ('vibration', 'Vibration Sensor'),
    ]
    STATUS_CHOICES = [('online', 'Online'), ('offline', 'Offline'), ('alert', 'Alert')]
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='iot_devices')
    device_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPE_CHOICES)
    location = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='offline')
    last_reading = models.JSONField(default=dict, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    thresholds = models.JSONField(default=dict, blank=True)
    assigned_permit = models.ForeignKey('ptw.Permit', on_delete=models.SET_NULL, null=True, blank=True, related_name='iot_devices')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class IoTReading(models.Model):
    device = models.ForeignKey(IoTDevice, on_delete=models.CASCADE, related_name='readings')
    data = models.JSONField()
    is_alert = models.BooleanField(default=False)
    alert_message = models.TextField(blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']


# ─────────────────────────────────────────────
# STEP 27 — Emergency Response Engine
# ─────────────────────────────────────────────
class EmergencyPlan(models.Model):
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='emergency_plans')
    name = models.CharField(max_length=200)
    assembly_points = models.JSONField(default=list)
    evacuation_routes = models.JSONField(default=list)
    emergency_contacts = models.JSONField(default=list)
    rescue_procedures = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)


class EmergencyEvent(models.Model):
    STATUS_CHOICES = [('active', 'Active'), ('contained', 'Contained'), ('resolved', 'Resolved')]
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='emergency_events')
    permit = models.ForeignKey('ptw.Permit', on_delete=models.SET_NULL, null=True, blank=True, related_name='emergency_events')
    plan = models.ForeignKey(EmergencyPlan, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    ai_actions = models.JSONField(default=list)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='active')
    triggered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    triggered_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)


# ─────────────────────────────────────────────
# STEP 28 — Advanced Workflow Engine
# ─────────────────────────────────────────────
class WorkflowDefinition(models.Model):
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='workflow_definitions')
    name = models.CharField(max_length=200)
    permit_type = models.ForeignKey('ptw.PermitType', on_delete=models.CASCADE, related_name='workflow_definitions')
    stages = models.JSONField(default=list)  # [{id, name, type, role, conditions, escalation_hours}]
    auto_expiry_hours = models.IntegerField(default=24)
    revalidation_interval_hours = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


# ─────────────────────────────────────────────
# STEP 29 — AI Knowledge Learning System
# ─────────────────────────────────────────────
class AILearningRecord(models.Model):
    SOURCE_CHOICES = [
        ('permit', 'Completed Permit'), ('incident', 'Incident'), ('rejection', 'Rejected Permit'),
        ('audit', 'Audit Finding'), ('tbt', 'Toolbox Talk'), ('unsafe_act', 'Unsafe Act'),
    ]
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='ai_learning_records')
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    source_id = models.IntegerField()
    extracted_patterns = models.JSONField(default=list)
    hazard_predictions = models.JSONField(default=list)
    checklist_improvements = models.JSONField(default=list)
    feedback_score = models.FloatField(null=True, blank=True)
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['project', 'source_type'])]


# ─────────────────────────────────────────────
# STEP 30 — Enterprise Command Center
# ─────────────────────────────────────────────
class CommandCenterWidget(models.Model):
    WIDGET_TYPE_CHOICES = [
        ('active_permits', 'Active Permits'), ('live_incidents', 'Live Incidents'),
        ('risk_heatmap', 'Risk Heatmap'), ('weather', 'Weather'), ('iot_alerts', 'IoT Alerts'),
        ('workforce_score', 'Workforce Safety Score'), ('kpi', 'KPI Summary'),
    ]
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='command_widgets')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='command_widgets')
    widget_type = models.CharField(max_length=30, choices=WIDGET_TYPE_CHOICES)
    position = models.JSONField(default=dict)  # {x, y, w, h}
    config = models.JSONField(default=dict)
    is_visible = models.BooleanField(default=True)

    class Meta:
        unique_together = ('project', 'user', 'widget_type')


# ─────────────────────────────────────────────
# STEP 31 — Smart PPE Validation
# ─────────────────────────────────────────────
class PPERequirement(models.Model):
    permit_type = models.ForeignKey('ptw.PermitType', on_delete=models.CASCADE, related_name='ppe_requirements')
    risk_level = models.CharField(max_length=10, blank=True)
    required_ppe = models.JSONField(default=list)
    conditional_ppe = models.JSONField(default=list)  # [{condition, ppe_items}]
    compliance_score_weight = models.FloatField(default=1.0)
    updated_at = models.DateTimeField(auto_now=True)


class PPEComplianceLog(models.Model):
    permit = models.ForeignKey('ptw.Permit', on_delete=models.CASCADE, related_name='ppe_compliance_logs')
    worker = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    required_ppe = models.JSONField(default=list)
    present_ppe = models.JSONField(default=list)
    missing_ppe = models.JSONField(default=list)
    compliance_score = models.FloatField(default=0)
    ai_validated = models.BooleanField(default=False)
    checked_at = models.DateTimeField(auto_now_add=True)


# ─────────────────────────────────────────────
# STEP 32 — AI Safety Audit System
# ─────────────────────────────────────────────
class SafetyAudit(models.Model):
    STATUS_CHOICES = [('scheduled', 'Scheduled'), ('in_progress', 'In Progress'), ('completed', 'Completed')]
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='safety_audits')
    title = models.CharField(max_length=200)
    audit_type = models.CharField(max_length=50, default='general')
    questions = models.JSONField(default=list)
    findings = models.JSONField(default=list)
    score = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='scheduled')
    auditor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audits_conducted')
    scheduled_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    corrective_actions = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)


# ─────────────────────────────────────────────
# STEP 33 — Contractor Safety Intelligence
# ─────────────────────────────────────────────
class ContractorSafetyScore(models.Model):
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='contractor_scores')
    contractor_name = models.CharField(max_length=200)
    company_id = models.IntegerField(null=True, blank=True)
    total_permits = models.IntegerField(default=0)
    violations = models.IntegerField(default=0)
    incidents = models.IntegerField(default=0)
    rejected_permits = models.IntegerField(default=0)
    overdue_actions = models.IntegerField(default=0)
    training_compliance_pct = models.FloatField(default=100)
    risk_score = models.FloatField(default=0)  # 0-100, lower is better
    rank = models.IntegerField(null=True, blank=True)
    trend = models.CharField(max_length=10, default='stable')  # improving, stable, declining
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('project', 'contractor_name')


# ─────────────────────────────────────────────
# STEP 34 — Enterprise Notification Engine
# ─────────────────────────────────────────────
class NotificationChannel(models.Model):
    CHANNEL_CHOICES = [('in_app', 'In-App'), ('email', 'Email'), ('sms', 'SMS'), ('whatsapp', 'WhatsApp'), ('push', 'Push')]
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='notification_channels')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_channels')
    channel = models.CharField(max_length=15, choices=CHANNEL_CHOICES)
    address = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'channel')


class EnterpriseNotification(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('sent', 'Sent'), ('failed', 'Failed'), ('read', 'Read')]
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='enterprise_notifications')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enterprise_notifications')
    channel = models.CharField(max_length=15)
    event_type = models.CharField(max_length=50)
    subject = models.CharField(max_length=255)
    body = models.TextField()
    language = models.CharField(max_length=10, default='en')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    retry_count = models.IntegerField(default=0)
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['recipient', 'status'])]


# ─────────────────────────────────────────────
# STEP 35 — Global Search & AI Insights
# ─────────────────────────────────────────────
class SearchIndex(models.Model):
    ENTITY_CHOICES = [
        ('permit', 'Permit'), ('incident', 'Incident'), ('worker', 'Worker'),
        ('hazard', 'Hazard'), ('audit', 'Audit'), ('tbt', 'Toolbox Talk'),
    ]
    project = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='search_index')
    entity_type = models.CharField(max_length=20, choices=ENTITY_CHOICES)
    entity_id = models.IntegerField()
    title = models.CharField(max_length=500)
    content = models.TextField()
    tags = models.JSONField(default=list)
    risk_level = models.CharField(max_length=10, blank=True)
    status = models.CharField(max_length=30, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['project', 'entity_type']),
            models.Index(fields=['project', 'entity_type', 'entity_id']),
        ]
        unique_together = ('project', 'entity_type', 'entity_id')

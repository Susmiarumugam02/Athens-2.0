"""
AI Context Intelligence Models — Phases 1-10
Company, Project, Location context + vector-ready knowledge base
"""
from django.db import models
from django.conf import settings


# ─── Phase 1: Company Intelligence ────────────────────────────────────────────

class AICompanyProfile(models.Model):
    """AI-generated intelligence profile for a tenant company."""
    INDUSTRY_CHOICES = [
        ('oil_gas', 'Oil & Gas'), ('refinery', 'Refinery'), ('power', 'Power Plant'),
        ('construction', 'Heavy Construction'), ('epc', 'EPC'), ('mining', 'Mining'),
        ('chemical', 'Chemical'), ('pharmaceutical', 'Pharmaceutical'),
        ('manufacturing', 'Manufacturing'), ('utilities', 'Utilities'), ('other', 'Other'),
    ]
    RISK_CHOICES = [('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')]
    MATURITY_CHOICES = [
        ('reactive', 'Reactive'), ('managed', 'Managed'),
        ('proactive', 'Proactive'), ('resilient', 'Resilient'),
    ]

    tenant_id = models.IntegerField(unique=True, db_index=True)
    company_name = models.CharField(max_length=255)
    industry = models.CharField(max_length=30, choices=INDUSTRY_CHOICES, default='other')
    company_type = models.CharField(max_length=100, blank=True)  # EPC, Owner, Contractor
    safety_standards = models.JSONField(default=list)   # ['ISO 45001', 'OSHA', 'NFPA']
    work_categories = models.JSONField(default=list)    # ['hot_work', 'confined_space', ...]
    risk_category = models.CharField(max_length=10, choices=RISK_CHOICES, default='medium')
    safety_maturity = models.CharField(max_length=15, choices=MATURITY_CHOICES, default='managed')
    safety_maturity_score = models.FloatField(default=50.0)  # 0-100
    ai_summary = models.TextField(blank=True)
    priority_hazards = models.JSONField(default=list)   # AI-identified top hazards
    mandatory_ppe = models.JSONField(default=list)
    company_rules = models.JSONField(default=list)      # Key safety rules
    permit_requirements = models.JSONField(default=dict)  # per permit type overrides
    ai_context_blob = models.TextField(blank=True)      # Serialized context for prompt injection
    last_analyzed = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_company_profiles'

    def __str__(self):
        return f"{self.company_name} ({self.industry})"


class AICompanyKnowledge(models.Model):
    """Company safety knowledge base — SOPs, manuals, policies."""
    DOC_TYPE_CHOICES = [
        ('sop', 'SOP'), ('manual', 'Safety Manual'), ('policy', 'Safety Policy'),
        ('audit', 'Audit Report'), ('tbt', 'Toolbox Talk'), ('incident', 'Incident Report'),
        ('training', 'Training Material'), ('regulation', 'Regulation'), ('other', 'Other'),
    ]

    tenant_id = models.IntegerField(db_index=True)
    doc_type = models.CharField(max_length=20, choices=DOC_TYPE_CHOICES)
    title = models.CharField(max_length=255)
    content = models.TextField()
    tags = models.JSONField(default=list)           # ['hot_work', 'confined_space', ...]
    permit_types = models.JSONField(default=list)   # applicable permit types
    embedding = models.JSONField(default=list, blank=True)  # vector embedding (future)
    relevance_score = models.FloatField(default=1.0)
    is_active = models.BooleanField(default=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_company_knowledge'
        indexes = [
            models.Index(fields=['tenant_id', 'doc_type']),
            models.Index(fields=['tenant_id', 'is_active']),
        ]

    def __str__(self):
        return f"{self.title} ({self.doc_type})"


# ─── Phase 2: Project Intelligence ────────────────────────────────────────────

class AIProjectProfile(models.Model):
    """AI-generated intelligence profile for a project."""
    PHASE_CHOICES = [
        ('planning', 'Planning'), ('mobilization', 'Mobilization'),
        ('construction', 'Construction'), ('commissioning', 'Commissioning'),
        ('shutdown', 'Shutdown/Turnaround'), ('decommission', 'Decommissioning'),
        ('operations', 'Operations'), ('maintenance', 'Maintenance'),
    ]
    PROJECT_TYPE_CHOICES = [
        ('greenfield', 'Greenfield'), ('brownfield', 'Brownfield'),
        ('shutdown', 'Shutdown/Turnaround'), ('maintenance', 'Maintenance'),
        ('construction', 'Construction'), ('commissioning', 'Commissioning'),
        ('decommission', 'Decommissioning'), ('other', 'Other'),
    ]

    tenant_id = models.IntegerField(db_index=True)
    project_id = models.IntegerField(unique=True, db_index=True)
    project_name = models.CharField(max_length=255)
    project_type = models.CharField(max_length=20, choices=PROJECT_TYPE_CHOICES, default='other')
    phase = models.CharField(max_length=20, choices=PHASE_CHOICES, default='construction')
    risk_score = models.FloatField(default=50.0)    # 0-100
    safety_score = models.FloatField(default=75.0)  # 0-100
    ai_summary = models.TextField(blank=True)
    critical_activities = models.JSONField(default=list)
    high_risk_zones = models.JSONField(default=list)
    active_contractors = models.JSONField(default=list)
    simultaneous_ops_risk = models.BooleanField(default=False)
    shutdown_active = models.BooleanField(default=False)
    ai_context_blob = models.TextField(blank=True)
    last_analyzed = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_project_profiles'

    def __str__(self):
        return f"{self.project_name} ({self.project_type})"


class AIProjectRiskZone(models.Model):
    """AI-classified risk zones within a project."""
    ZONE_TYPE_CHOICES = [
        ('hot', 'Hot Zone'), ('restricted', 'Restricted'), ('confined', 'Confined Space'),
        ('hazardous_atm', 'Hazardous Atmosphere'), ('electrical', 'Electrical Risk'),
        ('height', 'Work at Height'), ('excavation', 'Excavation Zone'),
        ('crane', 'Crane Operating Zone'), ('assembly', 'Assembly Point'), ('normal', 'Normal'),
    ]

    project_profile = models.ForeignKey(
        AIProjectProfile, on_delete=models.CASCADE, related_name='risk_zones'
    )
    zone_name = models.CharField(max_length=200)
    zone_type = models.CharField(max_length=20, choices=ZONE_TYPE_CHOICES)
    risk_level = models.CharField(max_length=10, default='medium')
    hazards = models.JSONField(default=list)
    required_controls = models.JSONField(default=list)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'ai_project_risk_zones'


# ─── Phase 3: Location Intelligence ───────────────────────────────────────────

class AILocationProfile(models.Model):
    """AI-generated intelligence for a specific site location/area."""
    ZONE_CLASS_CHOICES = [
        ('hot_zone', 'Hot Zone'), ('restricted', 'Restricted Area'),
        ('confined_space', 'Confined Space'), ('hazardous_atm', 'Hazardous Atmosphere'),
        ('electrical_risk', 'Electrical Risk Area'), ('height_risk', 'Height Risk Area'),
        ('flammable', 'Flammable/Explosive Area'), ('normal', 'Normal Area'),
    ]

    tenant_id = models.IntegerField(db_index=True)
    project_id = models.IntegerField(null=True, blank=True, db_index=True)
    location_name = models.CharField(max_length=255, db_index=True)
    location_keywords = models.JSONField(default=list)  # ['diesel', 'storage', 'tank']
    zone_classification = models.CharField(max_length=20, choices=ZONE_CLASS_CHOICES, default='normal')
    risk_level = models.CharField(max_length=10, default='medium')
    auto_warnings = models.JSONField(default=list)      # AI-generated warnings for this location
    mandatory_controls = models.JSONField(default=list)
    mandatory_ppe = models.JSONField(default=list)
    gas_testing_required = models.BooleanField(default=False)
    hot_work_restricted = models.BooleanField(default=False)
    smoking_prohibited = models.BooleanField(default=False)
    nearby_hazards = models.JSONField(default=list)
    ai_summary = models.TextField(blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    geofence_radius_m = models.IntegerField(default=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_location_profiles'
        indexes = [
            models.Index(fields=['tenant_id', 'location_name']),
            models.Index(fields=['tenant_id', 'project_id']),
        ]

    def __str__(self):
        return f"{self.location_name} ({self.zone_classification})"


# ─── Phase 4: Contextual LLM Memory ───────────────────────────────────────────

class AIContextMemory(models.Model):
    """Persistent AI memory — patterns, rules, learned context per tenant."""
    MEMORY_TYPE_CHOICES = [
        ('company_rule', 'Company Rule'), ('project_standard', 'Project Standard'),
        ('location_hazard', 'Location Hazard'), ('permit_pattern', 'Permit Pattern'),
        ('incident_lesson', 'Incident Lesson'), ('sop_extract', 'SOP Extract'),
    ]

    tenant_id = models.IntegerField(db_index=True)
    project_id = models.IntegerField(null=True, blank=True, db_index=True)
    memory_type = models.CharField(max_length=20, choices=MEMORY_TYPE_CHOICES)
    key = models.CharField(max_length=255)          # searchable key
    content = models.TextField()                    # the memory content
    tags = models.JSONField(default=list)
    embedding = models.JSONField(default=list, blank=True)  # future vector
    relevance_score = models.FloatField(default=1.0)
    usage_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    source = models.CharField(max_length=50, default='ai')  # ai, manual, import
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_context_memory'
        indexes = [
            models.Index(fields=['tenant_id', 'memory_type']),
            models.Index(fields=['tenant_id', 'project_id']),
            models.Index(fields=['tenant_id', '-relevance_score']),
        ]

    def __str__(self):
        return f"{self.memory_type}: {self.key[:60]}"


# ─── Phase 5: Smart PTW Context Engine ────────────────────────────────────────

class AIContextRequest(models.Model):
    """Log of every AI context enrichment request for a PTW."""
    tenant_id = models.IntegerField(db_index=True)
    permit_id = models.IntegerField(null=True, blank=True, db_index=True)
    project_id = models.IntegerField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    company_context = models.JSONField(default=dict)
    project_context = models.JSONField(default=dict)
    location_context = models.JSONField(default=dict)
    combined_result = models.JSONField(default=dict)
    latency_ms = models.IntegerField(null=True, blank=True)
    source = models.CharField(max_length=20, default='gemini')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_context_requests'
        indexes = [
            models.Index(fields=['tenant_id', '-created_at']),
            models.Index(fields=['permit_id']),
        ]


# ─── Phase 6: AI Knowledge Training ───────────────────────────────────────────

class AITrainingRecord(models.Model):
    """Records used to train/improve AI context over time."""
    SOURCE_CHOICES = [
        ('permit', 'Completed Permit'), ('incident', 'Incident'),
        ('rejection', 'Rejected Permit'), ('audit', 'Audit Finding'),
        ('tbt', 'Toolbox Talk'), ('sop', 'SOP Document'),
    ]

    tenant_id = models.IntegerField(db_index=True)
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    source_id = models.IntegerField()
    extracted_patterns = models.JSONField(default=list)
    hazard_signals = models.JSONField(default=list)
    control_signals = models.JSONField(default=list)
    quality_score = models.FloatField(null=True, blank=True)  # 0-100
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_training_records'
        indexes = [models.Index(fields=['tenant_id', 'source_type', 'processed'])]

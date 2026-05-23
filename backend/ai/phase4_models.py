"""
Athens 2.0 — Phase 4 Models (Steps 36-50)
Industrial AI Operating System — all new tables
"""
from django.db import models
from django.conf import settings


# ─── Step 36: AI Orchestrator ──────────────────────────────────────────────────
class AIRequest(models.Model):
    """Central log for every AI request routed through the orchestrator."""
    STATUS = [('queued','Queued'),('processing','Processing'),('done','Done'),('failed','Failed')]
    tenant_id   = models.IntegerField(db_index=True)
    user        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action      = models.CharField(max_length=80)          # e.g. 'ptw_analyze', 'context_engine'
    module      = models.CharField(max_length=50, default='ptw')
    payload     = models.JSONField(default=dict)
    result      = models.JSONField(default=dict, blank=True)
    status      = models.CharField(max_length=15, choices=STATUS, default='queued')
    tokens_in   = models.IntegerField(default=0)
    tokens_out  = models.IntegerField(default=0)
    latency_ms  = models.IntegerField(null=True, blank=True)
    used_cache  = models.BooleanField(default=False)
    used_gemini = models.BooleanField(default=False)
    error       = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_requests'
        indexes  = [
            models.Index(fields=['tenant_id', '-created_at']),
            models.Index(fields=['action', 'status']),
        ]


# ─── Step 37: Vector Memory ────────────────────────────────────────────────────
class AIVectorMemory(models.Model):
    """Semantic memory store — text chunks with JSON-serialised embeddings."""
    ENTITY = [
        ('permit','Permit'),('incident','Incident'),('tbt','Toolbox Talk'),
        ('sop','SOP'),('audit','Audit'),('worker','Worker'),('contractor','Contractor'),
    ]
    tenant_id   = models.IntegerField(db_index=True)
    entity_type = models.CharField(max_length=20, choices=ENTITY)
    entity_id   = models.IntegerField()
    chunk_index = models.SmallIntegerField(default=0)
    text_chunk  = models.TextField()
    embedding   = models.JSONField(default=list)   # 768-dim list; swap for pgvector later
    metadata    = models.JSONField(default=dict)   # {permit_type, location, date, ...}
    relevance   = models.FloatField(default=1.0)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_vector_memory'
        indexes  = [
            models.Index(fields=['tenant_id', 'entity_type']),
            models.Index(fields=['tenant_id', 'entity_type', 'entity_id']),
        ]
        unique_together = [('tenant_id', 'entity_type', 'entity_id', 'chunk_index')]


# ─── Step 38: AI Safety Brain ──────────────────────────────────────────────────
class AISafetyBrainSnapshot(models.Model):
    """Periodic cross-module safety intelligence snapshot per tenant."""
    tenant_id           = models.IntegerField(db_index=True)
    enterprise_score    = models.FloatField(default=75.0)   # 0-100
    accident_probability= models.FloatField(default=20.0)   # 0-100
    unsafe_trends       = models.JSONField(default=list)
    high_risk_contractors=models.JSONField(default=list)
    recurring_failures  = models.JSONField(default=list)
    module_scores       = models.JSONField(default=dict)    # {ptw:80, incident:70, ...}
    predictions         = models.JSONField(default=list)
    ai_summary          = models.TextField(blank=True)
    generated_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_safety_brain_snapshots'
        ordering = ['-generated_at']
        indexes  = [models.Index(fields=['tenant_id', '-generated_at'])]


# ─── Step 39: Knowledge Graph ──────────────────────────────────────────────────
class AIKnowledgeEdge(models.Model):
    """Directed relationship edge in the industrial knowledge graph."""
    EDGE_TYPES = [
        ('worker_permit','Worker→Permit'),('worker_incident','Worker→Incident'),
        ('contractor_violation','Contractor→Violation'),('location_hazard','Location→Hazard'),
        ('permit_incident','Permit→Incident'),('equipment_failure','Equipment→Failure'),
        ('hazard_control','Hazard→Control'),
    ]
    tenant_id   = models.IntegerField(db_index=True)
    edge_type   = models.CharField(max_length=30, choices=EDGE_TYPES)
    from_type   = models.CharField(max_length=30)
    from_id     = models.IntegerField()
    to_type     = models.CharField(max_length=30)
    to_id       = models.IntegerField()
    weight      = models.FloatField(default=1.0)   # risk propagation weight
    metadata    = models.JSONField(default=dict)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_knowledge_edges'
        indexes  = [
            models.Index(fields=['tenant_id', 'edge_type']),
            models.Index(fields=['tenant_id', 'from_type', 'from_id']),
            models.Index(fields=['tenant_id', 'to_type', 'to_id']),
        ]


# ─── Step 40: Multi-Module AI Assistant ───────────────────────────────────────
class AIAssistantSession(models.Model):
    """Persistent multi-module AI assistant session."""
    tenant_id   = models.IntegerField(db_index=True)
    user        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    module      = models.CharField(max_length=50, default='general')
    context     = models.JSONField(default=dict)   # active project, permit, etc.
    messages    = models.JSONField(default=list)   # [{role, content, ts}]
    language    = models.CharField(max_length=10, default='en')
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_assistant_sessions'
        indexes  = [models.Index(fields=['tenant_id', 'user', '-updated_at'])]


# ─── Step 41: Document Intelligence ───────────────────────────────────────────
class AIDocumentIndex(models.Model):
    """AI-indexed document with extracted safety intelligence."""
    DOC_TYPES = [
        ('pdf','PDF'),('sop','SOP'),('manual','Manual'),('drawing','Drawing'),
        ('report','Report'),('policy','Policy'),('other','Other'),
    ]
    tenant_id       = models.IntegerField(db_index=True)
    project_id      = models.IntegerField(null=True, blank=True)
    doc_type        = models.CharField(max_length=20, choices=DOC_TYPES)
    title           = models.CharField(max_length=255)
    file_name       = models.CharField(max_length=255, blank=True)
    raw_text        = models.TextField(blank=True)
    ai_summary      = models.TextField(blank=True)
    extracted_hazards   = models.JSONField(default=list)
    extracted_controls  = models.JSONField(default=list)
    extracted_checklist = models.JSONField(default=list)
    compliance_gaps     = models.JSONField(default=list)
    tags            = models.JSONField(default=list)
    embedding       = models.JSONField(default=list, blank=True)
    indexed         = models.BooleanField(default=False)
    uploaded_by     = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_document_index'
        indexes  = [
            models.Index(fields=['tenant_id', 'doc_type']),
            models.Index(fields=['tenant_id', 'indexed']),
        ]


# ─── Step 42: Incident Command Center ─────────────────────────────────────────
class AIEmergencyEvent(models.Model):
    """AI-managed emergency event with auto-generated response plan."""
    SEVERITY = [('minor','Minor'),('moderate','Moderate'),('serious','Serious'),('critical','Critical')]
    STATUS   = [('active','Active'),('contained','Contained'),('resolved','Resolved')]

    tenant_id       = models.IntegerField(db_index=True)
    project_id      = models.IntegerField(null=True, blank=True)
    title           = models.CharField(max_length=255)
    description     = models.TextField()
    severity        = models.CharField(max_length=15, choices=SEVERITY, default='moderate')
    status          = models.CharField(max_length=15, choices=STATUS, default='active')
    ai_actions      = models.JSONField(default=list)
    evacuation_plan = models.JSONField(default=dict)
    assembly_points = models.JSONField(default=list)
    emergency_contacts = models.JSONField(default=list)
    notified_roles  = models.JSONField(default=list)
    triggered_by    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    triggered_at    = models.DateTimeField(auto_now_add=True)
    resolved_at     = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'ai_emergency_events'
        indexes  = [models.Index(fields=['tenant_id', 'status', '-triggered_at'])]


# ─── Step 43: Workforce Intelligence ──────────────────────────────────────────
class AIWorkerRiskProfile(models.Model):
    """AI-computed risk profile for each worker."""
    tenant_id           = models.IntegerField(db_index=True)
    worker_id           = models.IntegerField(unique=True, db_index=True)
    worker_name         = models.CharField(max_length=255)
    fatigue_score       = models.FloatField(default=0.0)    # 0-100
    behavior_score      = models.FloatField(default=75.0)   # 0-100 (higher=safer)
    training_gap_score  = models.FloatField(default=0.0)    # 0-100 (higher=more gaps)
    overall_risk        = models.CharField(max_length=10, default='low')
    unsafe_acts_count   = models.IntegerField(default=0)
    incidents_involved  = models.IntegerField(default=0)
    overtime_hours_week = models.FloatField(default=0.0)
    training_compliance = models.FloatField(default=100.0)  # %
    ai_flags            = models.JSONField(default=list)
    last_computed       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_worker_risk_profiles'
        indexes  = [models.Index(fields=['tenant_id', 'overall_risk'])]


# ─── Step 44: Contractor Intelligence ─────────────────────────────────────────
class AIContractorScore(models.Model):
    """AI-computed safety score for each contractor company."""
    tenant_id           = models.IntegerField(db_index=True)
    contractor_name     = models.CharField(max_length=255)
    company_id          = models.IntegerField(null=True, blank=True)
    total_permits       = models.IntegerField(default=0)
    violations          = models.IntegerField(default=0)
    incidents           = models.IntegerField(default=0)
    rejected_permits    = models.IntegerField(default=0)
    overdue_actions     = models.IntegerField(default=0)
    training_compliance = models.FloatField(default=100.0)
    audit_score         = models.FloatField(default=75.0)
    risk_score          = models.FloatField(default=0.0)    # 0-100 (higher=riskier)
    risk_category       = models.CharField(max_length=10, default='low')
    trend               = models.CharField(max_length=15, default='stable')
    ai_recommendations  = models.JSONField(default=list)
    rank                = models.IntegerField(null=True, blank=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_contractor_scores'
        unique_together = [('tenant_id', 'contractor_name')]
        indexes  = [models.Index(fields=['tenant_id', '-risk_score'])]


# ─── Step 45: AI Inspection Engine ────────────────────────────────────────────
class AIInspectionTemplate(models.Model):
    """AI-generated dynamic inspection template."""
    tenant_id   = models.IntegerField(db_index=True)
    title       = models.CharField(max_length=255)
    area        = models.CharField(max_length=255)
    inspection_type = models.CharField(max_length=100)
    questions   = models.JSONField(default=list)   # [{q, category, critical, ai_generated}]
    checklist   = models.JSONField(default=list)
    frequency   = models.CharField(max_length=50, blank=True)
    ai_generated= models.BooleanField(default=True)
    created_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_inspection_templates'
        indexes  = [models.Index(fields=['tenant_id', 'area'])]


# ─── Step 46: Digital Industrial Twin ─────────────────────────────────────────
class AIDigitalTwinZone(models.Model):
    """Zone definition for the digital industrial twin map."""
    ZONE_TYPES = [
        ('work','Work Zone'),('hazard','Hazard Zone'),('restricted','Restricted'),
        ('assembly','Assembly Point'),('equipment','Equipment'),('evacuation','Evacuation'),
    ]
    tenant_id   = models.IntegerField(db_index=True)
    project_id  = models.IntegerField(db_index=True)
    name        = models.CharField(max_length=200)
    zone_type   = models.CharField(max_length=20, choices=ZONE_TYPES)
    risk_level  = models.CharField(max_length=10, default='low')
    color       = models.CharField(max_length=20, default='#1890ff')
    polygon     = models.JSONField(default=list)   # [{x,y}] percent coords
    active_permits_count = models.IntegerField(default=0)
    is_active   = models.BooleanField(default=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_digital_twin_zones'
        indexes  = [models.Index(fields=['tenant_id', 'project_id'])]


# ─── Step 47: Predictive Maintenance ──────────────────────────────────────────
class AIEquipmentRisk(models.Model):
    """AI-predicted equipment failure risk."""
    tenant_id       = models.IntegerField(db_index=True)
    equipment_name  = models.CharField(max_length=255)
    equipment_id    = models.CharField(max_length=100, blank=True)
    failure_probability = models.FloatField(default=0.0)  # 0-100
    predicted_failure_date = models.DateField(null=True, blank=True)
    risk_level      = models.CharField(max_length=10, default='low')
    maintenance_overdue = models.BooleanField(default=False)
    last_inspection = models.DateField(null=True, blank=True)
    ai_recommendations = models.JSONField(default=list)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_equipment_risks'
        indexes  = [models.Index(fields=['tenant_id', '-failure_probability'])]


# ─── Step 49: Executive Analytics ─────────────────────────────────────────────
class AIExecutiveSummary(models.Model):
    """AI-generated executive safety summary (daily/weekly)."""
    PERIOD = [('daily','Daily'),('weekly','Weekly'),('monthly','Monthly')]
    tenant_id       = models.IntegerField(db_index=True)
    period          = models.CharField(max_length=10, choices=PERIOD, default='daily')
    enterprise_score= models.FloatField(default=75.0)
    summary_text    = models.TextField()
    key_insights    = models.JSONField(default=list)
    risk_predictions= models.JSONField(default=list)
    strategic_recommendations = models.JSONField(default=list)
    module_kpis     = models.JSONField(default=dict)
    generated_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_executive_summaries'
        ordering = ['-generated_at']
        indexes  = [models.Index(fields=['tenant_id', 'period', '-generated_at'])]


# ─── Step 50: AI Governance ────────────────────────────────────────────────────
class AIPromptVersion(models.Model):
    """Versioned prompt registry for governance and rollback."""
    name        = models.CharField(max_length=100, unique=True)
    version     = models.CharField(max_length=20)
    prompt_text = models.TextField()
    is_active   = models.BooleanField(default=True)
    created_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_prompt_versions'


class AIUsageQuota(models.Model):
    """Per-tenant AI usage quota and token tracking."""
    tenant_id       = models.IntegerField(unique=True, db_index=True)
    tokens_used_day = models.IntegerField(default=0)
    tokens_used_month = models.IntegerField(default=0)
    requests_day    = models.IntegerField(default=0)
    daily_limit     = models.IntegerField(default=10000)
    monthly_limit   = models.IntegerField(default=200000)
    is_throttled    = models.BooleanField(default=False)
    last_reset_day  = models.DateField(auto_now=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_usage_quotas'

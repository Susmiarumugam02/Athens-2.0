"""
Athens 2.0 — Phase 5 Models (Steps 51-65)
Autonomous Industrial AI Platform
"""
from django.db import models
from django.conf import settings


# ─── Step 51: AI Agents ────────────────────────────────────────────────────────
class AIAgent(models.Model):
    AGENT_TYPES = [
        ('ptw', 'PTW Agent'), ('incident', 'Incident Agent'),
        ('inspection', 'Inspection Agent'), ('workforce', 'Workforce Agent'),
        ('training', 'Training Agent'), ('audit', 'Audit Agent'),
        ('contractor', 'Contractor Agent'), ('emergency', 'Emergency Agent'),
        ('weather', 'Weather Agent'), ('compliance', 'Compliance Agent'),
    ]
    STATUS = [('idle', 'Idle'), ('running', 'Running'), ('paused', 'Paused'), ('error', 'Error')]

    tenant_id   = models.IntegerField(db_index=True)
    agent_type  = models.CharField(max_length=20, choices=AGENT_TYPES)
    name        = models.CharField(max_length=100)
    status      = models.CharField(max_length=10, choices=STATUS, default='idle')
    config      = models.JSONField(default=dict)   # thresholds, intervals, rules
    last_run    = models.DateTimeField(null=True, blank=True)
    last_result = models.JSONField(default=dict, blank=True)
    run_count   = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_agents'
        unique_together = [('tenant_id', 'agent_type')]
        indexes = [models.Index(fields=['tenant_id', 'status'])]

    def __str__(self):
        return f"{self.name} ({self.agent_type})"


class AIAgentAction(models.Model):
    """Every action taken or recommended by an AI agent."""
    ACTION_TYPES = [
        ('alert', 'Alert'), ('recommendation', 'Recommendation'),
        ('auto_suspend', 'Auto Suspend'), ('escalation', 'Escalation'),
        ('notification', 'Notification'), ('report', 'Report'),
    ]
    STATUS = [('pending', 'Pending'), ('applied', 'Applied'), ('dismissed', 'Dismissed')]

    agent       = models.ForeignKey(AIAgent, on_delete=models.CASCADE, related_name='actions')
    tenant_id   = models.IntegerField(db_index=True)
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    title       = models.CharField(max_length=255)
    description = models.TextField()
    entity_type = models.CharField(max_length=50, blank=True)  # permit, incident, worker
    entity_id   = models.IntegerField(null=True, blank=True)
    severity    = models.CharField(max_length=10, default='medium')
    payload     = models.JSONField(default=dict)
    status      = models.CharField(max_length=15, choices=STATUS, default='pending')
    applied_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_agent_actions'
        indexes = [
            models.Index(fields=['tenant_id', 'status', '-created_at']),
            models.Index(fields=['tenant_id', 'entity_type', 'entity_id']),
        ]


# ─── Step 52: Agent Message Bus ───────────────────────────────────────────────
class AIAgentMessage(models.Model):
    """Inter-agent communication messages."""
    tenant_id   = models.IntegerField(db_index=True)
    from_agent  = models.CharField(max_length=20)
    to_agent    = models.CharField(max_length=20)
    event_type  = models.CharField(max_length=80)   # e.g. 'confined_space_detected'
    payload     = models.JSONField(default=dict)
    processed   = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_agent_messages'
        indexes = [
            models.Index(fields=['tenant_id', 'to_agent', 'processed']),
            models.Index(fields=['tenant_id', '-created_at']),
        ]


# ─── Step 53: Real-Time Event Stream ──────────────────────────────────────────
class AIIndustrialEvent(models.Model):
    """Real-time industrial event log — feeds dashboards and agents."""
    EVENT_TYPES = [
        ('permit_created', 'Permit Created'), ('permit_approved', 'Permit Approved'),
        ('permit_suspended', 'Permit Suspended'), ('incident_reported', 'Incident Reported'),
        ('unsafe_act', 'Unsafe Act'), ('iot_alert', 'IoT Alert'),
        ('inspection_started', 'Inspection Started'), ('worker_checkin', 'Worker Check-In'),
        ('emergency_declared', 'Emergency Declared'), ('training_completed', 'Training Completed'),
        ('audit_finding', 'Audit Finding'), ('weather_alert', 'Weather Alert'),
    ]
    SEVERITY = [('info', 'Info'), ('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')]

    tenant_id   = models.IntegerField(db_index=True)
    project_id  = models.IntegerField(null=True, blank=True, db_index=True)
    event_type  = models.CharField(max_length=30, choices=EVENT_TYPES)
    severity    = models.CharField(max_length=10, choices=SEVERITY, default='info')
    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    entity_type = models.CharField(max_length=50, blank=True)
    entity_id   = models.IntegerField(null=True, blank=True)
    location    = models.CharField(max_length=255, blank=True)
    metadata    = models.JSONField(default=dict)
    ai_processed= models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_industrial_events'
        indexes = [
            models.Index(fields=['tenant_id', '-created_at']),
            models.Index(fields=['tenant_id', 'event_type', '-created_at']),
            models.Index(fields=['tenant_id', 'severity', '-created_at']),
        ]


# ─── Step 54: AI Safety Copilot ───────────────────────────────────────────────
class AICopilotSession(models.Model):
    """Persistent AI copilot session per user."""
    tenant_id   = models.IntegerField(db_index=True)
    user        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role        = models.CharField(max_length=50, blank=True)
    module      = models.CharField(max_length=50, default='general')
    context     = models.JSONField(default=dict)
    messages    = models.JSONField(default=list)   # [{role, content, ts, action}]
    language    = models.CharField(max_length=10, default='en')
    total_tokens= models.IntegerField(default=0)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_copilot_sessions'
        indexes = [models.Index(fields=['tenant_id', 'user', '-updated_at'])]


# ─── Step 55: Self-Learning Risk Engine ───────────────────────────────────────
class AIRiskLearningRecord(models.Model):
    """Feedback loop records for self-improving risk models."""
    SOURCE = [
        ('incident', 'Incident'), ('near_miss', 'Near Miss'),
        ('rejected_permit', 'Rejected Permit'), ('unsafe_obs', 'Unsafe Observation'),
        ('audit_finding', 'Audit Finding'), ('worker_behavior', 'Worker Behavior'),
    ]
    tenant_id       = models.IntegerField(db_index=True)
    source_type     = models.CharField(max_length=20, choices=SOURCE)
    source_id       = models.IntegerField()
    permit_type     = models.CharField(max_length=100, blank=True)
    location        = models.CharField(max_length=255, blank=True)
    hazard_signals  = models.JSONField(default=list)
    control_gaps    = models.JSONField(default=list)
    outcome         = models.CharField(max_length=50, blank=True)  # injury, near_miss, etc.
    severity_actual = models.CharField(max_length=20, blank=True)
    weight          = models.FloatField(default=1.0)   # learning weight
    processed       = models.BooleanField(default=False)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_risk_learning_records'
        indexes = [
            models.Index(fields=['tenant_id', 'source_type', 'processed']),
            models.Index(fields=['tenant_id', 'permit_type']),
        ]


# ─── Step 56: Advanced Digital Twin ───────────────────────────────────────────
class AIDigitalTwinSnapshot(models.Model):
    """Point-in-time snapshot of the digital twin state."""
    tenant_id       = models.IntegerField(db_index=True)
    project_id      = models.IntegerField(db_index=True)
    active_permits  = models.JSONField(default=list)
    worker_positions= models.JSONField(default=list)   # [{worker_id, zone, ts}]
    incident_hotspots=models.JSONField(default=list)
    iot_alerts      = models.JSONField(default=list)
    equipment_risks = models.JSONField(default=list)
    weather_zones   = models.JSONField(default=dict)
    heatmap_data    = models.JSONField(default=dict)   # {zone_id: risk_score}
    generated_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_digital_twin_snapshots'
        ordering = ['-generated_at']
        indexes = [models.Index(fields=['tenant_id', 'project_id', '-generated_at'])]


# ─── Step 57: Computer Vision ─────────────────────────────────────────────────
class AIVisionAnalysis(models.Model):
    """AI computer vision analysis result for images/frames."""
    ANALYSIS_TYPES = [
        ('ppe_detection', 'PPE Detection'), ('unsafe_act', 'Unsafe Act'),
        ('fire_smoke', 'Fire/Smoke'), ('barricade', 'Barricade Check'),
        ('crowd', 'Crowd Detection'), ('hazard', 'Hazard Recognition'),
        ('general', 'General Safety'),
    ]
    tenant_id       = models.IntegerField(db_index=True)
    project_id      = models.IntegerField(null=True, blank=True)
    analysis_type   = models.CharField(max_length=20, choices=ANALYSIS_TYPES)
    source          = models.CharField(max_length=20, default='upload')  # upload, cctv, mobile
    image_path      = models.CharField(max_length=500, blank=True)
    detections      = models.JSONField(default=list)   # [{label, confidence, bbox, severity}]
    ppe_violations  = models.JSONField(default=list)
    unsafe_acts     = models.JSONField(default=list)
    alerts_generated= models.JSONField(default=list)
    overall_severity= models.CharField(max_length=10, default='low')
    confidence      = models.FloatField(default=0.0)
    ai_summary      = models.TextField(blank=True)
    reviewed        = models.BooleanField(default=False)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_vision_analyses'
        indexes = [
            models.Index(fields=['tenant_id', 'analysis_type', '-created_at']),
            models.Index(fields=['tenant_id', 'overall_severity']),
        ]


# ─── Step 58: Predictive Analytics ────────────────────────────────────────────
class AIPredictiveInsight(models.Model):
    """AI-generated predictive insight for enterprise analytics."""
    INSIGHT_TYPES = [
        ('incident_forecast', 'Incident Forecast'),
        ('high_risk_project', 'High Risk Project'),
        ('contractor_risk', 'Contractor Risk'),
        ('fatigue_trend', 'Fatigue Trend'),
        ('training_failure', 'Training Failure'),
        ('permit_bottleneck', 'Permit Bottleneck'),
    ]
    tenant_id       = models.IntegerField(db_index=True)
    insight_type    = models.CharField(max_length=25, choices=INSIGHT_TYPES)
    title           = models.CharField(max_length=255)
    description     = models.TextField()
    probability     = models.FloatField(default=0.0)   # 0-100
    impact          = models.CharField(max_length=10, default='medium')
    timeframe_days  = models.IntegerField(default=30)
    entity_type     = models.CharField(max_length=50, blank=True)
    entity_id       = models.IntegerField(null=True, blank=True)
    supporting_data = models.JSONField(default=dict)
    recommendations = models.JSONField(default=list)
    acknowledged    = models.BooleanField(default=False)
    generated_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_predictive_insights'
        indexes = [
            models.Index(fields=['tenant_id', 'insight_type', '-generated_at']),
            models.Index(fields=['tenant_id', '-probability']),
        ]


# ─── Step 59: Compliance Engine ───────────────────────────────────────────────
class AIComplianceViolation(models.Model):
    """Auto-detected compliance violation."""
    SEVERITY = [('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')]
    STATUS   = [('open', 'Open'), ('in_progress', 'In Progress'), ('resolved', 'Resolved')]

    tenant_id       = models.IntegerField(db_index=True)
    violation_code  = models.CharField(max_length=50)
    standard        = models.CharField(max_length=100)  # OSHA, ISO 45001, Internal SOP
    description     = models.TextField()
    severity        = models.CharField(max_length=10, choices=SEVERITY, default='medium')
    status          = models.CharField(max_length=15, choices=STATUS, default='open')
    entity_type     = models.CharField(max_length=50, blank=True)
    entity_id       = models.IntegerField(null=True, blank=True)
    corrective_action = models.TextField(blank=True)
    due_date        = models.DateField(null=True, blank=True)
    resolved_at     = models.DateTimeField(null=True, blank=True)
    auto_detected   = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_compliance_violations'
        indexes = [
            models.Index(fields=['tenant_id', 'status', '-created_at']),
            models.Index(fields=['tenant_id', 'severity']),
        ]


# ─── Step 61: Knowledge OS ────────────────────────────────────────────────────
class AIKnowledgeChunk(models.Model):
    """Semantic knowledge chunk — the core of the Knowledge OS."""
    ENTITY_TYPES = [
        ('sop', 'SOP'), ('ptw', 'PTW'), ('incident', 'Incident'),
        ('audit', 'Audit'), ('tbt', 'Toolbox Talk'), ('inspection', 'Inspection'),
        ('engineering', 'Engineering Doc'), ('lesson', 'Lesson Learned'),
    ]
    tenant_id   = models.IntegerField(db_index=True)
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPES)
    entity_id   = models.IntegerField()
    title       = models.CharField(max_length=255)
    chunk_text  = models.TextField()
    chunk_index = models.SmallIntegerField(default=0)
    embedding   = models.JSONField(default=list, blank=True)
    tags        = models.JSONField(default=list)
    relevance   = models.FloatField(default=1.0)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_knowledge_chunks'
        indexes = [
            models.Index(fields=['tenant_id', 'entity_type']),
            models.Index(fields=['tenant_id', '-relevance']),
        ]
        unique_together = [('tenant_id', 'entity_type', 'entity_id', 'chunk_index')]


# ─── Step 62: Data Lake ────────────────────────────────────────────────────────
class AIDataLakeEntry(models.Model):
    """Unified data lake entry for AI analytics pipeline."""
    DATA_TYPES = [
        ('structured', 'Structured'), ('embedding', 'Embedding'),
        ('event', 'Event Stream'), ('image', 'Image'), ('log', 'Log'), ('iot', 'IoT'),
    ]
    tenant_id   = models.IntegerField(db_index=True)
    data_type   = models.CharField(max_length=15, choices=DATA_TYPES)
    source      = models.CharField(max_length=50)   # module name
    entity_type = models.CharField(max_length=50, blank=True)
    entity_id   = models.IntegerField(null=True, blank=True)
    payload     = models.JSONField(default=dict)
    size_bytes  = models.IntegerField(default=0)
    indexed     = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_data_lake'
        indexes = [
            models.Index(fields=['tenant_id', 'data_type', '-created_at']),
            models.Index(fields=['tenant_id', 'source', 'indexed']),
        ]


# ─── Step 64: Security & Trust ────────────────────────────────────────────────
class AIAuditTrail(models.Model):
    """Immutable AI decision audit trail for governance."""
    tenant_id   = models.IntegerField(db_index=True)
    user        = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    action      = models.CharField(max_length=100)
    module      = models.CharField(max_length=50)
    entity_type = models.CharField(max_length=50, blank=True)
    entity_id   = models.IntegerField(null=True, blank=True)
    prompt_hash = models.CharField(max_length=64, blank=True)  # SHA-256 of prompt
    input_hash  = models.CharField(max_length=64, blank=True)
    output_summary = models.TextField(blank=True)
    decision    = models.CharField(max_length=50, blank=True)
    reasoning   = models.TextField(blank=True)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_audit_trail'
        indexes = [
            models.Index(fields=['tenant_id', '-created_at']),
            models.Index(fields=['tenant_id', 'action']),
        ]


# ─── Step 65: Plugin/Extension Registry ───────────────────────────────────────
class AIPluginRegistry(models.Model):
    """Registry for future AI plugins — robotics, drones, wearables, edge AI."""
    PLUGIN_TYPES = [
        ('iot', 'IoT Device'), ('drone', 'Drone'), ('wearable', 'Smart Wearable'),
        ('robot', 'Robotics'), ('edge', 'Edge AI'), ('external', 'External API'),
    ]
    STATUS = [('registered', 'Registered'), ('active', 'Active'), ('inactive', 'Inactive')]

    tenant_id   = models.IntegerField(db_index=True)
    plugin_type = models.CharField(max_length=15, choices=PLUGIN_TYPES)
    name        = models.CharField(max_length=100)
    version     = models.CharField(max_length=20, default='1.0.0')
    endpoint    = models.URLField(blank=True)
    api_key_hash= models.CharField(max_length=64, blank=True)
    capabilities= models.JSONField(default=list)
    config      = models.JSONField(default=dict)
    status      = models.CharField(max_length=15, choices=STATUS, default='registered')
    last_ping   = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_plugin_registry'
        indexes = [models.Index(fields=['tenant_id', 'plugin_type', 'status'])]

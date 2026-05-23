from django.db import models
from django.conf import settings

# Import all phase models so Django discovers them for migrations
from .context_models import (  # noqa: F401
    AICompanyProfile, AICompanyKnowledge, AIProjectProfile, AIProjectRiskZone,
    AILocationProfile, AIContextMemory, AIContextRequest, AITrainingRecord,
)
from .phase4_models import (  # noqa: F401
    AIRequest, AIVectorMemory, AISafetyBrainSnapshot, AIKnowledgeEdge,
    AIAssistantSession, AIDocumentIndex, AIEmergencyEvent, AIWorkerRiskProfile,
    AIContractorScore, AIInspectionTemplate, AIDigitalTwinZone, AIEquipmentRisk,
    AIExecutiveSummary, AIPromptVersion, AIUsageQuota,
)
from .phase5_models import (  # noqa: F401
    AIAgent, AIAgentAction, AIAgentMessage, AIIndustrialEvent, AICopilotSession,
    AIRiskLearningRecord, AIDigitalTwinSnapshot, AIVisionAnalysis,
    AIPredictiveInsight, AIComplianceViolation, AIKnowledgeChunk,
    AIDataLakeEntry, AIAuditTrail, AIPluginRegistry,
)


class AIConversation(models.Model):
    """Stores AI chat sessions per user."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_conversations')
    tenant_id = models.IntegerField(null=True, blank=True, db_index=True)
    module = models.CharField(max_length=50, default='general')
    project = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_conversations'
        ordering = ['-updated_at']


class AIMessage(models.Model):
    ROLE_USER = 'user'
    ROLE_AI = 'assistant'
    ROLE_CHOICES = [(ROLE_USER, 'User'), (ROLE_AI, 'Assistant')]

    conversation = models.ForeignKey(AIConversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    tokens_used = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'ai_messages'
        ordering = ['created_at']


class AITranslation(models.Model):
    """Logs voice/text translations."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ai_translations')
    tenant_id = models.IntegerField(null=True, blank=True, db_index=True)
    source_language = models.CharField(max_length=10)
    original_text = models.TextField()
    translated_text = models.TextField()
    module = models.CharField(max_length=50, blank=True)
    field_name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_translations'
        ordering = ['-created_at']


class AIVoiceLog(models.Model):
    """Audit trail for voice assistant requests and translated output."""
    STATUS_SUCCESS = 'success'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [(STATUS_SUCCESS, 'Success'), (STATUS_FAILED, 'Failed')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ai_voice_logs')
    tenant_id = models.IntegerField(null=True, blank=True, db_index=True)
    module = models.CharField(max_length=50, blank=True)
    field_name = models.CharField(max_length=100, blank=True)
    source_language = models.CharField(max_length=10)
    transcript = models.TextField()
    professional_english = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SUCCESS)
    error_message = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_voice_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant_id', '-created_at']),
            models.Index(fields=['module', 'field_name']),
        ]


class AISuggestion(models.Model):
    """Logs AI suggestions made to users (PTW, incidents, etc.)."""
    TYPE_PTW = 'ptw'
    TYPE_INCIDENT = 'incident'
    TYPE_INSPECTION = 'inspection'
    TYPE_GENERAL = 'general'
    TYPE_CHOICES = [
        (TYPE_PTW, 'PTW'), (TYPE_INCIDENT, 'Incident'),
        (TYPE_INSPECTION, 'Inspection'), (TYPE_GENERAL, 'General'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ai_suggestions')
    tenant_id = models.IntegerField(null=True, blank=True, db_index=True)
    suggestion_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    input_text = models.TextField()
    suggestion_data = models.JSONField(default=dict)
    applied = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_suggestions'
        ordering = ['-created_at']


class AIHazardPattern(models.Model):
    """Tenant-aware hazard intelligence extracted from AI and PTW activity."""
    tenant_id = models.IntegerField(null=True, blank=True, db_index=True)
    module = models.CharField(max_length=50, default='ptw')
    permit_type = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=255, blank=True)
    work_nature = models.CharField(max_length=255, blank=True)
    hazard = models.CharField(max_length=255)
    controls = models.JSONField(default=list, blank=True)
    ppe = models.JSONField(default=list, blank=True)
    occurrence_count = models.PositiveIntegerField(default=1)
    risk_level = models.CharField(max_length=30, blank=True)
    source = models.CharField(max_length=50, default='ai')
    last_seen_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_hazard_patterns'
        ordering = ['-last_seen_at']
        indexes = [
            models.Index(fields=['tenant_id', 'module', 'permit_type']),
            models.Index(fields=['tenant_id', 'location']),
        ]


class AIRecommendation(models.Model):
    """Structured safety recommendations surfaced by Gemini."""
    TYPE_PPE = 'ppe'
    TYPE_CONTROL = 'control'
    TYPE_PRECAUTION = 'precaution'
    TYPE_WORKFLOW = 'workflow'
    TYPE_CHOICES = [
        (TYPE_PPE, 'PPE'),
        (TYPE_CONTROL, 'Control'),
        (TYPE_PRECAUTION, 'Precaution'),
        (TYPE_WORKFLOW, 'Workflow'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ai_recommendations')
    tenant_id = models.IntegerField(null=True, blank=True, db_index=True)
    module = models.CharField(max_length=50, blank=True)
    recommendation_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default=TYPE_CONTROL)
    context = models.JSONField(default=dict, blank=True)
    recommendations = models.JSONField(default=list)
    source = models.CharField(max_length=50, default='gemini')
    accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_recommendations'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant_id', 'module', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]


class AIIncidentPrediction(models.Model):
    """Predictive PTW incident intelligence snapshot."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ai_incident_predictions')
    tenant_id = models.IntegerField(null=True, blank=True, db_index=True)
    permit_id = models.IntegerField(null=True, blank=True, db_index=True)
    context = models.JSONField(default=dict, blank=True)
    prediction = models.JSONField(default=dict)
    probability_score = models.PositiveSmallIntegerField(default=0)
    severity_prediction = models.CharField(max_length=30, blank=True)
    source = models.CharField(max_length=50, default='gemini')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_incident_predictions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant_id', '-created_at']),
            models.Index(fields=['permit_id', '-created_at']),
        ]


class AIComplianceCheck(models.Model):
    """Audit-ready AI/PTW compliance validation result."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ai_compliance_checks')
    tenant_id = models.IntegerField(null=True, blank=True, db_index=True)
    permit_id = models.IntegerField(null=True, blank=True, db_index=True)
    module = models.CharField(max_length=50, default='ptw')
    context = models.JSONField(default=dict, blank=True)
    result = models.JSONField(default=dict)
    compliance_score = models.PositiveSmallIntegerField(default=0)
    blocking = models.BooleanField(default=False)
    source = models.CharField(max_length=50, default='gemini')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_compliance_checks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant_id', 'module', '-created_at']),
            models.Index(fields=['permit_id', '-created_at']),
        ]


class AIMediaAnalysis(models.Model):
    """AI analysis record for worksite images and uploaded safety documents."""
    MEDIA_IMAGE = 'image'
    MEDIA_DOCUMENT = 'document'
    MEDIA_CHOICES = [(MEDIA_IMAGE, 'Image'), (MEDIA_DOCUMENT, 'Document')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ai_media_analyses')
    tenant_id = models.IntegerField(null=True, blank=True, db_index=True)
    permit_id = models.IntegerField(null=True, blank=True, db_index=True)
    media_type = models.CharField(max_length=20, choices=MEDIA_CHOICES)
    file_name = models.CharField(max_length=255, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    analysis = models.JSONField(default=dict)
    severity = models.CharField(max_length=30, blank=True)
    source = models.CharField(max_length=50, default='gemini')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_media_analyses'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant_id', 'media_type', '-created_at']),
            models.Index(fields=['permit_id', '-created_at']),
        ]


class AIActivityLog(models.Model):
    """Audit log for all AI operations."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ai_activity_logs')
    tenant_id = models.IntegerField(null=True, blank=True, db_index=True)
    action = models.CharField(max_length=100)
    module = models.CharField(max_length=50, blank=True)
    input_summary = models.CharField(max_length=500, blank=True)
    success = models.BooleanField(default=True)
    latency_ms = models.IntegerField(null=True, blank=True)
    used_gemini = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_activity_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant_id', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

"""
Athens ML — Database Models
Model registry, prediction logs, feature store, anomaly records, telemetry.
All tables are tenant-isolated.
"""
from django.db import models
from django.conf import settings


class MLModel(models.Model):
    """Registry of trained ML models with versioning."""
    MODEL_TYPES = [
        ('incident_predictor', 'Incident Predictor'),
        ('worker_risk', 'Worker Risk Scorer'),
        ('contractor_risk', 'Contractor Risk Scorer'),
        ('risk_matrix', 'Smart Risk Matrix'),
        ('anomaly_detector', 'Anomaly Detector'),
        ('fatigue_predictor', 'Fatigue Predictor'),
        ('permit_risk', 'Permit Risk Scorer'),
        ('safety_forecaster', 'Safety Forecaster'),
    ]
    STATUS = [
        ('training', 'Training'),
        ('ready', 'Ready'),
        ('deployed', 'Deployed'),
        ('deprecated', 'Deprecated'),
        ('failed', 'Failed'),
    ]

    name = models.CharField(max_length=100)
    model_type = models.CharField(max_length=30, choices=MODEL_TYPES)
    version = models.CharField(max_length=20, default='1.0.0')
    status = models.CharField(max_length=15, choices=STATUS, default='training')
    tenant_id = models.IntegerField(null=True, blank=True, db_index=True,
                                    help_text='null = global model, int = tenant-specific')
    # Serialized model path (relative to ML_MODEL_DIR)
    model_path = models.CharField(max_length=500, blank=True)
    # Training metadata
    training_samples = models.IntegerField(default=0)
    feature_names = models.JSONField(default=list)
    hyperparameters = models.JSONField(default=dict)
    # Evaluation metrics
    accuracy = models.FloatField(null=True, blank=True)
    precision = models.FloatField(null=True, blank=True)
    recall = models.FloatField(null=True, blank=True)
    f1_score = models.FloatField(null=True, blank=True)
    roc_auc = models.FloatField(null=True, blank=True)
    # Drift detection
    baseline_distribution = models.JSONField(default=dict, blank=True)
    drift_threshold = models.FloatField(default=0.1)
    last_drift_check = models.DateTimeField(null=True, blank=True)
    drift_detected = models.BooleanField(default=False)

    trained_at = models.DateTimeField(null=True, blank=True)
    deployed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ml_models'
        unique_together = [('model_type', 'version', 'tenant_id')]
        indexes = [
            models.Index(fields=['model_type', 'status']),
            models.Index(fields=['tenant_id', 'model_type']),
        ]

    def __str__(self):
        return f"{self.name} v{self.version} ({self.status})"


class MLPrediction(models.Model):
    """Log of every ML prediction made — audit trail + feedback loop."""
    tenant_id = models.IntegerField(db_index=True)
    model = models.ForeignKey(MLModel, on_delete=models.SET_NULL, null=True, related_name='predictions')
    model_type = models.CharField(max_length=30, db_index=True)
    entity_type = models.CharField(max_length=50, blank=True)  # permit, worker, contractor
    entity_id = models.IntegerField(null=True, blank=True, db_index=True)
    # Input features (hashed for privacy)
    feature_vector = models.JSONField(default=dict)
    # Prediction output
    prediction_label = models.CharField(max_length=50, blank=True)  # high/medium/low
    prediction_score = models.FloatField()  # 0-100
    confidence = models.FloatField(default=0.0)  # 0-1
    explanation = models.JSONField(default=dict)  # SHAP-style feature importance
    # Feedback (for retraining)
    actual_outcome = models.CharField(max_length=50, blank=True)
    feedback_received = models.BooleanField(default=False)
    # Performance
    latency_ms = models.IntegerField(null=True, blank=True)
    used_fallback = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ml_predictions'
        indexes = [
            models.Index(fields=['tenant_id', 'model_type', '-created_at']),
            models.Index(fields=['tenant_id', 'entity_type', 'entity_id']),
        ]


class MLFeatureSnapshot(models.Model):
    """Cached feature vectors for entities — refreshed periodically."""
    ENTITY_TYPES = [
        ('worker', 'Worker'), ('contractor', 'Contractor'),
        ('permit', 'Permit'), ('project', 'Project'),
        ('location', 'Location'),
    ]
    tenant_id = models.IntegerField(db_index=True)
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPES)
    entity_id = models.IntegerField(db_index=True)
    features = models.JSONField(default=dict)
    feature_version = models.CharField(max_length=20, default='1.0')
    computed_at = models.DateTimeField(auto_now=True)
    valid_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'ml_feature_snapshots'
        unique_together = [('tenant_id', 'entity_type', 'entity_id')]
        indexes = [models.Index(fields=['tenant_id', 'entity_type'])]


class MLAnomalyRecord(models.Model):
    """Detected anomalies from the anomaly detection engine."""
    ANOMALY_TYPES = [
        ('permit_anomaly', 'Permit Anomaly'),
        ('attendance_spike', 'Attendance Spike'),
        ('unsafe_act_cluster', 'Unsafe Act Cluster'),
        ('contractor_behavior', 'Contractor Behavior'),
        ('incident_pattern', 'Incident Pattern'),
        ('work_combination', 'Unsafe Work Combination'),
        ('overtime_abuse', 'Overtime Abuse'),
    ]
    STATUS = [('open', 'Open'), ('reviewed', 'Reviewed'), ('false_positive', 'False Positive')]

    tenant_id = models.IntegerField(db_index=True)
    anomaly_type = models.CharField(max_length=30, choices=ANOMALY_TYPES)
    entity_type = models.CharField(max_length=50, blank=True)
    entity_id = models.IntegerField(null=True, blank=True)
    anomaly_score = models.FloatField()  # 0-1, higher = more anomalous
    severity = models.CharField(max_length=10, default='medium')
    description = models.TextField()
    feature_contributions = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUS, default='open')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ml_anomaly_records'
        indexes = [
            models.Index(fields=['tenant_id', 'anomaly_type', '-created_at']),
            models.Index(fields=['tenant_id', 'status']),
        ]


class MLTrainingJob(models.Model):
    """Training job tracking for async model training."""
    STATUS = [
        ('queued', 'Queued'), ('running', 'Running'),
        ('completed', 'Completed'), ('failed', 'Failed'),
    ]
    model_type = models.CharField(max_length=30)
    tenant_id = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=STATUS, default='queued')
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    config = models.JSONField(default=dict)
    result_model = models.ForeignKey(MLModel, on_delete=models.SET_NULL, null=True, blank=True)
    error_message = models.TextField(blank=True)
    samples_used = models.IntegerField(default=0)
    duration_seconds = models.FloatField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ml_training_jobs'
        indexes = [models.Index(fields=['model_type', 'status', '-created_at'])]


class MLTelemetry(models.Model):
    """ML system telemetry — latency, throughput, error rates."""
    tenant_id = models.IntegerField(null=True, blank=True, db_index=True)
    model_type = models.CharField(max_length=30)
    event_type = models.CharField(max_length=30)  # prediction, training, anomaly, error
    latency_ms = models.IntegerField(null=True, blank=True)
    success = models.BooleanField(default=True)
    error_code = models.CharField(max_length=50, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ml_telemetry'
        indexes = [
            models.Index(fields=['model_type', '-created_at']),
            models.Index(fields=['tenant_id', '-created_at']),
        ]

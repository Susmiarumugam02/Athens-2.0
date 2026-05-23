# Re-export all DB models so Django discovers them for migrations
from .db_models import (  # noqa: F401
    MLModel, MLPrediction, MLFeatureSnapshot,
    MLAnomalyRecord, MLTrainingJob, MLTelemetry,
)

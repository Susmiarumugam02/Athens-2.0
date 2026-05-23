"""
Safety automation hooks for high-risk ML predictions.

This module deliberately performs conservative, auditable actions only. It does
not silently mutate PTW approvals or create operational records that require
module-specific mandatory fields. Downstream modules can subscribe to the
MLAnomalyRecord audit trail to create inspections, toolbox talks, or approvals.
"""
from __future__ import annotations

from ml.db_models import MLAnomalyRecord


HIGH_RISK_THRESHOLD = 75


def record_high_risk_prediction(*, tenant_id: int, entity_type: str, entity_id: int,
                                score: float, description: str,
                                contributions: dict | None = None) -> bool:
    """Persist an auditable high-risk automation event once the threshold is met."""
    if score < HIGH_RISK_THRESHOLD:
        return False

    MLAnomalyRecord.objects.create(
        tenant_id=tenant_id,
        anomaly_type='work_combination' if entity_type == 'permit' else 'incident_pattern',
        entity_type=entity_type,
        entity_id=entity_id,
        anomaly_score=min(score / 100, 1.0),
        severity='critical' if score >= 90 else 'high',
        description=description,
        feature_contributions=contributions or {},
    )
    return True

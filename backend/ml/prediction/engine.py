"""
Athens ML — Prediction Engine
Serves real-time predictions from trained models.
Includes SHAP-style explanations, confidence scoring, and Gemini hybrid integration.
"""
import time
import logging
import numpy as np
from typing import Optional
from django.core.cache import cache
from django.utils import timezone

from ml.training.trainer import (
    load_model, model_exists,
    INCIDENT_FEATURES, WORKER_RISK_FEATURES,
    CONTRACTOR_FEATURES, ANOMALY_FEATURES,
)
from ml.feature_engineering.extractor import (
    extract_permit_features, extract_worker_features,
    extract_contractor_features, extract_project_features,
)

logger = logging.getLogger('athens.ml')

CACHE_TTL = 300  # 5 minutes


def _cache_key(prefix: str, tenant_id: int, entity_id) -> str:
    return f'ml:{prefix}:t{tenant_id}:{entity_id}'


def _score_to_label(score: float) -> str:
    if score >= 75:
        return 'critical'
    if score >= 55:
        return 'high'
    if score >= 35:
        return 'medium'
    return 'low'


def _feature_importance_explanation(model, feature_names: list, feature_vector: list) -> dict:
    """
    Approximate SHAP-style explanation using feature importances.
    Returns top contributing features.
    """
    try:
        clf = model.named_steps.get('clf') or model.named_steps.get('reg') or model.named_steps.get('detector')
        if hasattr(clf, 'feature_importances_'):
            importances = clf.feature_importances_
            contributions = {
                feature_names[i]: round(float(importances[i] * abs(feature_vector[i])), 4)
                for i in range(min(len(feature_names), len(feature_vector)))
            }
            # Return top 5 contributors
            return dict(sorted(contributions.items(), key=lambda x: x[1], reverse=True)[:5])
    except Exception:
        pass
    return {}


# ─── Incident Prediction ──────────────────────────────────────────────────────

def predict_incident_risk(permit_id: int, tenant_id: int) -> dict:
    """
    Predict incident probability for a permit.
    Returns score 0-100, label, confidence, explanation.
    """
    cache_key = _cache_key('incident', tenant_id, permit_id)
    cached = cache.get(cache_key)
    if cached:
        return {**cached, 'cached': True}

    t0 = time.time()
    features = extract_permit_features(permit_id, tenant_id)
    feature_vector = [float(features.get(col, 0) or 0) for col in INCIDENT_FEATURES]
    X = np.array([feature_vector], dtype=np.float32)

    result = {
        'permit_id': permit_id,
        'tenant_id': tenant_id,
        'incident_probability': 0.0,
        'risk_score': 0.0,
        'risk_label': 'low',
        'confidence': 0.0,
        'explanation': {},
        'features_used': len(INCIDENT_FEATURES),
        'model_source': 'fallback',
        'latency_ms': 0,
    }

    model = load_model('incident_predictor', tenant_id)
    if model:
        try:
            prob = float(model.predict_proba(X)[0][1])
            score = round(prob * 100, 2)
            result.update({
                'incident_probability': prob,
                'risk_score': score,
                'risk_label': _score_to_label(score),
                'confidence': round(max(prob, 1 - prob), 3),
                'explanation': _feature_importance_explanation(model, INCIDENT_FEATURES, feature_vector),
                'model_source': 'ml_model',
            })
        except Exception as e:
            logger.warning(f'[ML Predict] Incident prediction error: {e}')
            # Rule-based fallback
            result.update(_rule_based_incident_score(features))
    else:
        result.update(_rule_based_incident_score(features))

    result['latency_ms'] = int((time.time() - t0) * 1000)
    cache.set(cache_key, result, CACHE_TTL)
    _log_prediction('incident_predictor', tenant_id, 'permit', permit_id,
                    features, result['risk_score'], result['risk_label'],
                    result['confidence'], result['explanation'], result['latency_ms'],
                    result['model_source'] == 'fallback')
    return result


def _rule_based_incident_score(features: dict) -> dict:
    """Deterministic rule-based fallback when no ML model is available."""
    score = float(features.get('risk_score', 1)) * 4
    if features.get('is_hot_work') and features.get('is_confined_space'):
        score += 20
    if not features.get('has_gas_readings') and features.get('requires_gas_testing'):
        score += 15
    if features.get('is_night_work'):
        score += 10
    if features.get('simultaneous_permits_same_location', 0) > 2:
        score += 10
    if not features.get('has_isolation_details') and features.get('requires_isolation'):
        score += 12
    score = min(score, 100)
    return {
        'incident_probability': score / 100,
        'risk_score': round(score, 2),
        'risk_label': _score_to_label(score),
        'confidence': 0.6,
        'explanation': {'rule_based': True, 'risk_score': features.get('risk_score', 1)},
        'model_source': 'rules',
    }


# ─── Worker Risk Prediction ───────────────────────────────────────────────────

def predict_worker_risk(worker_id: int, tenant_id: int) -> dict:
    """Predict worker safety risk score."""
    cache_key = _cache_key('worker', tenant_id, worker_id)
    cached = cache.get(cache_key)
    if cached:
        return {**cached, 'cached': True}

    t0 = time.time()
    features = extract_worker_features(worker_id, tenant_id)
    feature_vector = [float(features.get(col, 0) or 0) for col in WORKER_RISK_FEATURES]
    X = np.array([feature_vector], dtype=np.float32)

    result = {
        'worker_id': worker_id,
        'fatigue_score': features.get('fatigue_score', 0),
        'behavior_risk_score': features.get('behavior_risk_score', 0),
        'training_gap_score': features.get('training_gap_score', 0),
        'overall_risk_score': 0.0,
        'risk_label': 'low',
        'confidence': 0.0,
        'explanation': {},
        'model_source': 'fallback',
        'latency_ms': 0,
        'key_signals': [],
    }

    model = load_model('worker_risk', tenant_id)
    if model:
        try:
            prob = float(model.predict_proba(X)[0][1])
            score = round(prob * 100, 2)
            result.update({
                'overall_risk_score': score,
                'risk_label': _score_to_label(score),
                'confidence': round(max(prob, 1 - prob), 3),
                'explanation': _feature_importance_explanation(model, WORKER_RISK_FEATURES, feature_vector),
                'model_source': 'ml_model',
            })
        except Exception as e:
            logger.warning(f'[ML Predict] Worker risk error: {e}')
            result.update(_rule_based_worker_score(features))
    else:
        result.update(_rule_based_worker_score(features))

    # Key signals for UI
    signals = []
    if features.get('fatigue_score', 0) > 60:
        signals.append({'signal': 'High fatigue risk', 'severity': 'high'})
    if features.get('overtime_hours_7d', 0) > 15:
        signals.append({'signal': f"Overtime: {features['overtime_hours_7d']:.0f}h this week", 'severity': 'medium'})
    if features.get('unsafe_acts_90d', 0) >= 3:
        signals.append({'signal': f"{features['unsafe_acts_90d']} unsafe acts (90d)", 'severity': 'high'})
    if features.get('days_since_last_training', 0) > 90:
        signals.append({'signal': 'Training overdue', 'severity': 'medium'})
    if features.get('consecutive_work_days', 0) >= 7:
        signals.append({'signal': f"{features['consecutive_work_days']} consecutive work days", 'severity': 'high'})
    result['key_signals'] = signals

    result['latency_ms'] = int((time.time() - t0) * 1000)
    cache.set(cache_key, result, CACHE_TTL)
    _log_prediction('worker_risk', tenant_id, 'worker', worker_id,
                    features, result['overall_risk_score'], result['risk_label'],
                    result['confidence'], result['explanation'], result['latency_ms'],
                    result['model_source'] == 'fallback')
    return result


def _rule_based_worker_score(features: dict) -> dict:
    score = (
        features.get('fatigue_score', 0) * 0.4 +
        features.get('behavior_risk_score', 0) * 0.4 +
        features.get('training_gap_score', 0) * 0.2
    )
    score = min(score, 100)
    return {
        'overall_risk_score': round(score, 2),
        'risk_label': _score_to_label(score),
        'confidence': 0.65,
        'explanation': {'rule_based': True},
        'model_source': 'rules',
    }


# ─── Contractor Risk Prediction ───────────────────────────────────────────────

def predict_contractor_risk(contractor_name: str, tenant_id: int) -> dict:
    """Predict contractor safety risk score."""
    cache_key = _cache_key('contractor', tenant_id, hashlib_short(contractor_name))
    cached = cache.get(cache_key)
    if cached:
        return {**cached, 'cached': True}

    t0 = time.time()
    features = extract_contractor_features(contractor_name, tenant_id)
    feature_vector = [float(features.get(col, 0) or 0) for col in CONTRACTOR_FEATURES]

    # Rule-based scoring (contractor model uses same RF structure)
    violation_rate = features.get('violation_rate', 0)
    incident_rate = features.get('incidents_90d', 0)
    rejection_rate = features.get('permit_rejection_rate', 0)

    score = min(
        violation_rate * 0.4 + incident_rate * 10 + rejection_rate * 0.3,
        100
    )

    result = {
        'contractor_name': contractor_name,
        'risk_score': round(score, 2),
        'risk_label': _score_to_label(score),
        'confidence': 0.7,
        'total_permits': features.get('total_permits_90d', 0),
        'incidents': features.get('incidents_90d', 0),
        'violation_rate': features.get('violation_rate', 0),
        'rejection_rate': features.get('permit_rejection_rate', 0),
        'trend': _compute_trend(contractor_name, tenant_id),
        'model_source': 'rules',
        'latency_ms': int((time.time() - t0) * 1000),
    }

    cache.set(cache_key, result, CACHE_TTL)
    return result


def _compute_trend(contractor_name: str, tenant_id: int) -> str:
    """Compare last 30d vs previous 30d violation rate."""
    try:
        from ptw.models import Permit
        from django.utils import timezone
        from datetime import timedelta
        now = timezone.now()
        recent = Permit.objects.filter(
            project__athens_tenant_id=tenant_id,
            receiver_designation__icontains=contractor_name[:20],
            created_at__gte=now - timedelta(days=30),
            status='rejected'
        ).count()
        older = Permit.objects.filter(
            project__athens_tenant_id=tenant_id,
            receiver_designation__icontains=contractor_name[:20],
            created_at__gte=now - timedelta(days=60),
            created_at__lt=now - timedelta(days=30),
            status='rejected'
        ).count()
        if recent > older + 1:
            return 'declining'
        if older > recent + 1:
            return 'improving'
    except Exception:
        pass
    return 'stable'


# ─── Anomaly Detection ────────────────────────────────────────────────────────

def detect_project_anomalies(project_id: int, tenant_id: int) -> dict:
    """Detect anomalies in project safety metrics."""
    t0 = time.time()
    features = extract_project_features(project_id, tenant_id)
    feature_vector = [float(features.get(col, 0) or 0) for col in ANOMALY_FEATURES]
    X = np.array([feature_vector], dtype=np.float32)

    result = {
        'project_id': project_id,
        'is_anomalous': False,
        'anomaly_score': 0.0,
        'severity': 'normal',
        'anomaly_signals': [],
        'model_source': 'rules',
        'latency_ms': 0,
    }

    model = load_model('anomaly_detector', tenant_id)
    if model:
        try:
            meta = _load_meta_safe('anomaly_detector', tenant_id)
            threshold = meta.get('threshold', -0.1)
            score = float(model.named_steps['detector'].score_samples(
                model.named_steps['scaler'].transform(X)
            )[0])
            is_anomalous = score < threshold
            # Normalize to 0-100 (lower score = more anomalous)
            anomaly_pct = max(0, min(100, (threshold - score) / abs(threshold + 0.001) * 100))
            result.update({
                'is_anomalous': is_anomalous,
                'anomaly_score': round(anomaly_pct, 2),
                'severity': _score_to_label(anomaly_pct) if is_anomalous else 'normal',
                'model_source': 'ml_model',
            })
        except Exception as e:
            logger.warning(f'[ML Anomaly] Detection error: {e}')
            result.update(_rule_based_anomaly(features))
    else:
        result.update(_rule_based_anomaly(features))

    # Anomaly signals
    signals = []
    if features.get('simultaneous_hot_confined'):
        signals.append('Simultaneous hot work + confined space detected')
    if features.get('overdue_permits', 0) > 3:
        signals.append(f"{features['overdue_permits']} overdue active permits")
    if features.get('incidents_30d', 0) > 2:
        signals.append(f"{features['incidents_30d']} incidents in 30 days")
    if features.get('permit_rejection_rate', 0) > 30:
        signals.append(f"High permit rejection rate: {features['permit_rejection_rate']:.0f}%")
    result['anomaly_signals'] = signals

    result['latency_ms'] = int((time.time() - t0) * 1000)

    # Persist anomaly if detected
    if result['is_anomalous'] and result['anomaly_score'] > 40:
        _persist_anomaly(tenant_id, 'permit_anomaly', 'project', project_id,
                         result['anomaly_score'] / 100, result['severity'],
                         '; '.join(signals) or 'Anomalous project safety pattern detected',
                         {col: feature_vector[i] for i, col in enumerate(ANOMALY_FEATURES)})

    return result


def _rule_based_anomaly(features: dict) -> dict:
    score = 0
    if features.get('simultaneous_hot_confined'):
        score += 40
    if features.get('overdue_permits', 0) > 3:
        score += 20
    if features.get('incidents_30d', 0) > 2:
        score += 25
    if features.get('permit_rejection_rate', 0) > 30:
        score += 15
    return {
        'is_anomalous': score > 40,
        'anomaly_score': min(score, 100),
        'severity': _score_to_label(score) if score > 40 else 'normal',
        'model_source': 'rules',
    }


# ─── Smart Risk Matrix ────────────────────────────────────────────────────────

def predict_smart_risk_score(permit_id: int, tenant_id: int) -> dict:
    """
    ML-enhanced risk score prediction.
    Augments the manual probability × severity with ML context.
    """
    features = extract_permit_features(permit_id, tenant_id)
    feature_vector = [float(features.get(col, 0) or 0) for col in INCIDENT_FEATURES]
    X = np.array([feature_vector], dtype=np.float32)

    manual_score = features.get('risk_score', 1)
    ml_score = manual_score  # default

    model = load_model('risk_matrix', tenant_id)
    if model:
        try:
            ml_score = float(model.predict(X)[0])
            ml_score = max(1, min(25, ml_score))
        except Exception:
            pass

    # Blend: 60% ML + 40% manual
    blended = round(0.6 * ml_score + 0.4 * manual_score, 2)
    risk_level = 'low'
    if blended > 16:
        risk_level = 'extreme'
    elif blended > 9:
        risk_level = 'high'
    elif blended > 4:
        risk_level = 'medium'

    return {
        'permit_id': permit_id,
        'manual_risk_score': manual_score,
        'ml_risk_score': round(ml_score, 2),
        'blended_risk_score': blended,
        'risk_level': risk_level,
        'ml_adjustment': round(ml_score - manual_score, 2),
        'model_source': 'ml_model' if model else 'manual',
    }


# ─── Batch Predictions ────────────────────────────────────────────────────────

def batch_predict_worker_risks(tenant_id: int, limit: int = 100) -> list[dict]:
    """Batch predict risk for all active workers in a tenant."""
    results = []
    try:
        from workforce.models import Employee
        employees = Employee.objects.filter(
            athens_tenant_id=tenant_id, status='active'
        )[:limit]
        for emp in employees:
            result = predict_worker_risk(emp.id, tenant_id)
            result['employee_name'] = emp.full_name
            result['department'] = emp.department.name if emp.department else ''
            results.append(result)
        results.sort(key=lambda x: x.get('overall_risk_score', 0), reverse=True)
    except Exception as e:
        logger.error(f'[ML Batch] Worker risk batch error: {e}')
    return results


def batch_predict_permit_risks(tenant_id: int, limit: int = 50) -> list[dict]:
    """Batch predict incident risk for active permits."""
    results = []
    try:
        from ptw.models import Permit
        permits = Permit.objects.filter(
            project__athens_tenant_id=tenant_id,
            status__in=['active', 'approved', 'submitted']
        ).select_related('permit_type')[:limit]
        for permit in permits:
            result = predict_incident_risk(permit.id, tenant_id)
            result['permit_number'] = permit.permit_number
            result['permit_type'] = permit.permit_type.name if permit.permit_type else ''
            result['location'] = permit.location
            results.append(result)
        results.sort(key=lambda x: x.get('risk_score', 0), reverse=True)
    except Exception as e:
        logger.error(f'[ML Batch] Permit risk batch error: {e}')
    return results


# ─── LLM + ML Hybrid ─────────────────────────────────────────────────────────

def get_ml_enhanced_ai_context(permit_id: int, tenant_id: int) -> dict:
    """
    Combine ML predictions with AI context for Gemini prompt injection.
    This is the LLM + ML hybrid integration point.
    """
    ml_incident = predict_incident_risk(permit_id, tenant_id)
    ml_risk = predict_smart_risk_score(permit_id, tenant_id)

    return {
        'ml_incident_probability': ml_incident.get('incident_probability', 0),
        'ml_risk_score': ml_risk.get('blended_risk_score', 1),
        'ml_risk_label': ml_incident.get('risk_label', 'low'),
        'ml_top_risk_factors': list(ml_incident.get('explanation', {}).keys())[:3],
        'ml_confidence': ml_incident.get('confidence', 0),
        'ml_source': ml_incident.get('model_source', 'fallback'),
    }


# ─── Helpers ──────────────────────────────────────────────────────────────────

def hashlib_short(s: str) -> str:
    import hashlib
    return hashlib.md5(s.encode()).hexdigest()[:12]


def _load_meta_safe(model_type: str, tenant_id: Optional[int]) -> dict:
    try:
        from ml.training.trainer import _load_meta
        return _load_meta(model_type, tenant_id)
    except Exception:
        return {}


def _log_prediction(model_type: str, tenant_id: int, entity_type: str,
                    entity_id: int, features: dict, score: float,
                    label: str, confidence: float, explanation: dict,
                    latency_ms: int, used_fallback: bool) -> None:
    try:
        from ml.db_models import MLPrediction
        MLPrediction.objects.create(
            tenant_id=tenant_id,
            model_type=model_type,
            entity_type=entity_type,
            entity_id=entity_id,
            feature_vector={k: v for k, v in features.items()
                            if isinstance(v, (int, float))},
            prediction_label=label,
            prediction_score=score,
            confidence=confidence,
            explanation=explanation,
            latency_ms=latency_ms,
            used_fallback=used_fallback,
        )
    except Exception:
        pass


def _persist_anomaly(tenant_id: int, anomaly_type: str, entity_type: str,
                     entity_id: int, score: float, severity: str,
                     description: str, contributions: dict) -> None:
    try:
        from ml.db_models import MLAnomalyRecord
        MLAnomalyRecord.objects.create(
            tenant_id=tenant_id,
            anomaly_type=anomaly_type,
            entity_type=entity_type,
            entity_id=entity_id,
            anomaly_score=score,
            severity=severity,
            description=description,
            feature_contributions=contributions,
        )
    except Exception:
        pass

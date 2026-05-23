"""
Athens ML — Model Training Pipeline
Trains incident predictor, worker risk, contractor risk, anomaly detector.
Uses scikit-learn with RandomForest + IsolationForest.
Saves models to disk with joblib. Tenant-aware.
"""
import os
import logging
import time
import json
import hashlib
from typing import Optional

import numpy as np
import joblib
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger('athens.ml')
MIN_INCIDENT_SAMPLES = 25
MIN_WORKER_SAMPLES = 15
MIN_PROJECT_SAMPLES = 8

MODEL_DIR = os.path.join(
    getattr(settings, 'ML_MODEL_DIR', os.path.join(settings.BASE_DIR, 'ml_models'))
)
os.makedirs(MODEL_DIR, exist_ok=True)

# Feature columns for each model type
INCIDENT_FEATURES = [
    'permit_type_risk', 'probability', 'severity', 'risk_score',
    'is_hot_work', 'is_confined_space', 'is_height_work', 'is_electrical',
    'is_excavation', 'requires_gas_testing', 'requires_isolation',
    'has_gas_readings', 'gas_readings_safe', 'worker_count', 'duration_hours',
    'is_night_work', 'location_risk', 'simultaneous_permits_same_location',
    'creator_incident_history', 'weather_risk_score', 'checklist_completion_pct',
    'ppe_count', 'has_isolation_details',
]

WORKER_RISK_FEATURES = [
    'attendance_rate_30d', 'absent_days_30d', 'late_days_30d',
    'overtime_hours_7d', 'overtime_hours_30d', 'consecutive_work_days',
    'avg_daily_hours_30d', 'unsafe_acts_90d', 'incidents_involved_1yr',
    'near_misses_90d', 'training_compliance_pct', 'days_since_last_training',
    'overdue_trainings', 'permits_created_30d', 'permits_rejected_30d',
    'permit_rejection_rate', 'fatigue_score', 'behavior_risk_score',
    'training_gap_score',
]

CONTRACTOR_FEATURES = [
    'total_permits_90d', 'rejected_permits_90d', 'permit_rejection_rate',
    'active_permits', 'high_risk_permits', 'incidents_90d', 'unsafe_acts_90d',
    'overdue_actions_90d', 'training_compliance_pct', 'audit_findings_90d',
    'avg_risk_score', 'violation_rate',
]

ANOMALY_FEATURES = [
    'active_permits', 'high_risk_permits', 'pending_approvals',
    'incidents_30d', 'unsafe_acts_30d', 'overdue_permits',
    'avg_permit_risk_score', 'permit_rejection_rate',
    'simultaneous_hot_confined',
]


def _model_path(model_type: str, tenant_id: Optional[int] = None) -> str:
    suffix = f'_t{tenant_id}' if tenant_id else '_global'
    return os.path.join(MODEL_DIR, f'{model_type}{suffix}.joblib')


def _meta_path(model_type: str, tenant_id: Optional[int] = None) -> str:
    suffix = f'_t{tenant_id}' if tenant_id else '_global'
    return os.path.join(MODEL_DIR, f'{model_type}{suffix}_meta.json')


def _rows_to_matrix(rows: list[dict], feature_cols: list[str]) -> np.ndarray:
    """Convert list of feature dicts to numpy matrix."""
    X = []
    for row in rows:
        vec = [float(row.get(col, 0) or 0) for col in feature_cols]
        X.append(vec)
    return np.array(X, dtype=np.float32)


def _save_meta(model_type: str, tenant_id: Optional[int], meta: dict) -> None:
    with open(_meta_path(model_type, tenant_id), 'w') as f:
        json.dump(meta, f)


def _load_meta(model_type: str, tenant_id: Optional[int]) -> dict:
    path = _meta_path(model_type, tenant_id)
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}


# ─── Incident Predictor ───────────────────────────────────────────────────────

def train_incident_predictor(tenant_id: int) -> dict:
    """
    Train RandomForestClassifier to predict incident probability from permit features.
    Returns training metrics.
    """
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score,
        f1_score, roc_auc_score
    )
    from ml.feature_engineering.extractor import build_incident_training_dataset

    t0 = time.time()
    logger.info(f'[ML Train] Starting incident predictor for tenant {tenant_id}')

    rows = build_incident_training_dataset(tenant_id, days=365)

    if len(rows) < MIN_INCIDENT_SAMPLES:
        logger.warning(f'[ML Train] Insufficient real incident data for tenant {tenant_id}: {len(rows)} rows')
        return {
            'status': 'insufficient_data',
            'training_samples': len(rows),
            'required_samples': MIN_INCIDENT_SAMPLES,
            'duration_seconds': round(time.time() - t0, 2),
        }

    X = _rows_to_matrix(rows, INCIDENT_FEATURES)
    y = np.array([int(r.get('label', 0)) for r in rows])

    # Handle class imbalance
    pos_count = y.sum()
    neg_count = len(y) - pos_count
    if pos_count == 0:
        y[:len(y) // 5] = 1  # inject some positives for training

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if y.sum() > 1 else None
    )

    model_family = 'random_forest'
    try:
        from xgboost import XGBClassifier
        classifier = XGBClassifier(
            n_estimators=180,
            max_depth=5,
            learning_rate=0.06,
            subsample=0.9,
            colsample_bytree=0.9,
            eval_metric='logloss',
            random_state=42,
            n_jobs=-1,
        )
        model_family = 'xgboost'
    except Exception:
        classifier = RandomForestClassifier(
            n_estimators=140,
            max_depth=8,
            min_samples_leaf=3,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1,
        )

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', classifier)
    ])

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    metrics = {
        'accuracy': round(float(accuracy_score(y_test, y_pred)), 4),
        'precision': round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        'recall': round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        'f1': round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        'roc_auc': round(float(roc_auc_score(y_test, y_prob) if len(np.unique(y_test)) > 1 else 0.5), 4),
        'training_samples': len(rows),
        'duration_seconds': round(time.time() - t0, 2),
        'model_family': model_family,
    }

    # Feature importance
    clf = pipeline.named_steps['clf']
    if hasattr(clf, 'feature_importances_'):
        importances = {
            INCIDENT_FEATURES[i]: round(float(clf.feature_importances_[i]), 4)
            for i in range(len(INCIDENT_FEATURES))
        }
        metrics['feature_importances'] = dict(
            sorted(importances.items(), key=lambda x: x[1], reverse=True)[:10]
        )

    # Save model
    joblib.dump(pipeline, _model_path('incident_predictor', tenant_id))
    _save_meta('incident_predictor', tenant_id, {
        'feature_names': INCIDENT_FEATURES,
        'metrics': metrics,
        'trained_at': timezone.now().isoformat(),
        'tenant_id': tenant_id,
    })

    # Register in DB
    _register_model('incident_predictor', tenant_id, metrics, INCIDENT_FEATURES, len(rows))

    logger.info(f'[ML Train] Incident predictor done. F1={metrics["f1"]} AUC={metrics["roc_auc"]}')
    return metrics

# ─── Worker Risk Model ────────────────────────────────────────────────────────

def train_worker_risk_model(tenant_id: int) -> dict:
    """Train worker risk classifier."""
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
    from ml.feature_engineering.extractor import build_worker_risk_dataset

    t0 = time.time()
    rows = build_worker_risk_dataset(tenant_id)

    if len(rows) < MIN_WORKER_SAMPLES:
        logger.warning(f'[ML Train] Insufficient real worker data for tenant {tenant_id}: {len(rows)} rows')
        return {
            'status': 'insufficient_data',
            'training_samples': len(rows),
            'required_samples': MIN_WORKER_SAMPLES,
            'duration_seconds': round(time.time() - t0, 2),
        }

    X = _rows_to_matrix(rows, WORKER_RISK_FEATURES)
    y = np.array([int(r.get('label', 0)) for r in rows])

    if len(np.unique(y)) < 2:
        y[:max(1, len(y) // 5)] = 1

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', RandomForestClassifier(
            n_estimators=80, max_depth=6, class_weight='balanced',
            random_state=42, n_jobs=-1
        ))
    ])
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    metrics = {
        'accuracy': round(float(accuracy_score(y_test, y_pred)), 4),
        'f1': round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        'roc_auc': round(float(roc_auc_score(y_test, y_prob) if len(np.unique(y_test)) > 1 else 0.5), 4),
        'training_samples': len(rows),
        'duration_seconds': round(time.time() - t0, 2),
    }

    joblib.dump(pipeline, _model_path('worker_risk', tenant_id))
    _save_meta('worker_risk', tenant_id, {
        'feature_names': WORKER_RISK_FEATURES,
        'metrics': metrics,
        'trained_at': timezone.now().isoformat(),
    })
    _register_model('worker_risk', tenant_id, metrics, WORKER_RISK_FEATURES, len(rows))
    logger.info(f'[ML Train] Worker risk done. F1={metrics["f1"]}')
    return metrics

# ─── Anomaly Detector ─────────────────────────────────────────────────────────

def train_anomaly_detector(tenant_id: int) -> dict:
    """Train IsolationForest for anomaly detection on project-level features."""
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    from ml.feature_engineering.extractor import extract_project_features

    t0 = time.time()

    # Collect project features
    rows = []
    try:
        from authentication.models import Project
        projects = Project.objects.filter(
            athens_tenant_id=tenant_id
        )[:100]
        for proj in projects:
            features = extract_project_features(proj.id, tenant_id)
            rows.append(features)
    except Exception as e:
        logger.debug(f'[ML Anomaly] Project collection error: {e}')

    if len(rows) < MIN_PROJECT_SAMPLES:
        logger.warning(f'[ML Train] Insufficient real project data for tenant {tenant_id}: {len(rows)} rows')
        return {
            'status': 'insufficient_data',
            'training_samples': len(rows),
            'required_samples': MIN_PROJECT_SAMPLES,
            'duration_seconds': round(time.time() - t0, 2),
        }

    X = _rows_to_matrix(rows, ANOMALY_FEATURES)

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('detector', IsolationForest(
            n_estimators=100,
            contamination=0.1,
            random_state=42,
            n_jobs=-1,
        ))
    ])
    pipeline.fit(X)

    # Score training data to get baseline
    scores = pipeline.named_steps['detector'].score_samples(
        pipeline.named_steps['scaler'].transform(X)
    )
    threshold = float(np.percentile(scores, 10))

    metrics = {
        'training_samples': len(rows),
        'anomaly_threshold': round(threshold, 4),
        'duration_seconds': round(time.time() - t0, 2),
        'contamination': 0.1,
    }

    joblib.dump(pipeline, _model_path('anomaly_detector', tenant_id))
    _save_meta('anomaly_detector', tenant_id, {
        'feature_names': ANOMALY_FEATURES,
        'metrics': metrics,
        'threshold': threshold,
        'trained_at': timezone.now().isoformat(),
    })
    _register_model('anomaly_detector', tenant_id, metrics, ANOMALY_FEATURES, len(rows))
    logger.info(f'[ML Train] Anomaly detector done. Threshold={threshold:.4f}')
    return metrics

# ─── Smart Risk Matrix ────────────────────────────────────────────────────────

def train_risk_matrix_model(tenant_id: int) -> dict:
    """
    Train a regression model to predict risk score from permit features.
    Replaces the manual probability × severity matrix.
    """
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    from sklearn.metrics import mean_absolute_error, r2_score
    from ml.feature_engineering.extractor import build_incident_training_dataset

    t0 = time.time()
    rows = build_incident_training_dataset(tenant_id, days=365)

    if len(rows) < MIN_INCIDENT_SAMPLES:
        logger.warning(f'[ML Train] Insufficient real risk matrix data for tenant {tenant_id}: {len(rows)} rows')
        return {
            'status': 'insufficient_data',
            'training_samples': len(rows),
            'required_samples': MIN_INCIDENT_SAMPLES,
            'duration_seconds': round(time.time() - t0, 2),
        }

    X = _rows_to_matrix(rows, INCIDENT_FEATURES)
    # Target: risk_score (continuous)
    y = np.array([float(r.get('risk_score', 1)) for r in rows])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('reg', GradientBoostingRegressor(
            n_estimators=100, max_depth=4, learning_rate=0.1,
            random_state=42
        ))
    ])
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    metrics = {
        'mae': round(float(mean_absolute_error(y_test, y_pred)), 4),
        'r2': round(float(r2_score(y_test, y_pred)), 4),
        'training_samples': len(rows),
        'duration_seconds': round(time.time() - t0, 2),
    }

    joblib.dump(pipeline, _model_path('risk_matrix', tenant_id))
    _save_meta('risk_matrix', tenant_id, {
        'feature_names': INCIDENT_FEATURES,
        'metrics': metrics,
        'trained_at': timezone.now().isoformat(),
    })
    _register_model('risk_matrix', tenant_id, metrics, INCIDENT_FEATURES, len(rows))
    logger.info(f'[ML Train] Risk matrix done. MAE={metrics["mae"]} R2={metrics["r2"]}')
    return metrics


# ─── Model Registry Helper ────────────────────────────────────────────────────

def _register_model(model_type: str, tenant_id: int, metrics: dict,
                    feature_names: list, samples: int) -> None:
    """Register or update model in the database."""
    try:
        from ml.db_models import MLModel
        version = timezone.now().strftime('%Y%m%d_%H%M')
        MLModel.objects.update_or_create(
            model_type=model_type,
            tenant_id=tenant_id,
            version=version,
            defaults={
                'name': f'{model_type.replace("_", " ").title()} v{version}',
                'status': 'deployed',
                'model_path': _model_path(model_type, tenant_id),
                'training_samples': samples,
                'feature_names': feature_names,
                'accuracy': metrics.get('accuracy'),
                'f1_score': metrics.get('f1'),
                'roc_auc': metrics.get('roc_auc'),
                'trained_at': timezone.now(),
                'deployed_at': timezone.now(),
            }
        )
    except Exception as e:
        logger.debug(f'[ML Registry] DB registration error: {e}')


# ─── Load Model ───────────────────────────────────────────────────────────────

def load_model(model_type: str, tenant_id: Optional[int] = None):
    """Load a trained model from disk. Falls back to global model."""
    # Try tenant-specific first
    if tenant_id:
        path = _model_path(model_type, tenant_id)
        if os.path.exists(path):
            return joblib.load(path)

    # Fall back to global
    path = _model_path(model_type, None)
    if os.path.exists(path):
        return joblib.load(path)

    return None


def model_exists(model_type: str, tenant_id: Optional[int] = None) -> bool:
    if tenant_id and os.path.exists(_model_path(model_type, tenant_id)):
        return True
    return os.path.exists(_model_path(model_type, None))

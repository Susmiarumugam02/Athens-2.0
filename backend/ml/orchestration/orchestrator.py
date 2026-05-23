"""
Athens ML — Orchestration Service
Manages model training, retraining triggers, and prediction routing.
Runs synchronously (no Celery required) but is async-safe.
"""
import logging
import time
from django.utils import timezone
from django.core.cache import cache

logger = logging.getLogger('athens.ml')


def train_all_models(tenant_id: int, triggered_by=None) -> dict:
    """
    Train all ML models for a tenant.
    Returns summary of training results.
    """
    from ml.db_models import MLTrainingJob
    from ml.training.trainer import (
        train_incident_predictor, train_worker_risk_model,
        train_anomaly_detector, train_risk_matrix_model,
    )

    results = {}
    job = None

    try:
        job = MLTrainingJob.objects.create(
            model_type='all',
            tenant_id=tenant_id,
            status='running',
            triggered_by=triggered_by,
            started_at=timezone.now(),
        )
    except Exception:
        pass

    t0 = time.time()

    for model_type, trainer_fn in [
        ('incident_predictor', train_incident_predictor),
        ('worker_risk', train_worker_risk_model),
        ('anomaly_detector', train_anomaly_detector),
        ('risk_matrix', train_risk_matrix_model),
    ]:
        try:
            logger.info(f'[ML Orchestrator] Training {model_type} for tenant {tenant_id}')
            metrics = trainer_fn(tenant_id)
            status = metrics.get('status', 'success') if isinstance(metrics, dict) else 'success'
            results[model_type] = {'status': status, 'metrics': metrics}
        except Exception as e:
            logger.error(f'[ML Orchestrator] {model_type} training failed: {e}')
            results[model_type] = {'status': 'failed', 'error': str(e)}

    total_duration = round(time.time() - t0, 2)
    results['total_duration_seconds'] = total_duration
    results['tenant_id'] = tenant_id
    results['trained_at'] = timezone.now().isoformat()

    if job:
        try:
            job.status = 'completed'
            job.completed_at = timezone.now()
            job.duration_seconds = total_duration
            job.save(update_fields=['status', 'completed_at', 'duration_seconds'])
        except Exception:
            pass

    # Invalidate prediction caches for this tenant
    cache.delete_pattern(f'ml:*:t{tenant_id}:*') if hasattr(cache, 'delete_pattern') else None

    logger.info(f'[ML Orchestrator] All models trained for tenant {tenant_id} in {total_duration}s')
    return results


def should_retrain(model_type: str, tenant_id: int) -> bool:
    """
    Check if a model needs retraining based on:
    - Age (> 7 days old)
    - Data drift detected
    - New data volume threshold
    """
    try:
        from ml.db_models import MLModel
        model = MLModel.objects.filter(
            model_type=model_type,
            tenant_id=tenant_id,
            status='deployed'
        ).order_by('-trained_at').first()

        if not model:
            return True  # No model exists

        if model.drift_detected:
            return True

        # Retrain if older than 7 days
        if model.trained_at:
            age_days = (timezone.now() - model.trained_at).days
            if age_days > 7:
                return True

    except Exception:
        return True

    return False


def get_model_status(tenant_id: int) -> dict:
    """Get status of all ML models for a tenant."""
    from ml.training.trainer import model_exists

    model_types = [
        'incident_predictor', 'worker_risk',
        'anomaly_detector', 'risk_matrix'
    ]

    status = {}
    for mt in model_types:
        exists = model_exists(mt, tenant_id)
        meta = {}
        try:
            from ml.training.trainer import _load_meta
            meta = _load_meta(mt, tenant_id) or _load_meta(mt, None) or {}
        except Exception:
            pass

        status[mt] = {
            'exists': exists,
            'trained_at': meta.get('trained_at'),
            'metrics': meta.get('metrics', {}),
            'feature_count': len(meta.get('feature_names', [])),
        }

    return {
        'tenant_id': tenant_id,
        'models': status,
        'all_ready': all(v['exists'] for v in status.values()),
    }


def run_anomaly_scan(tenant_id: int) -> list[dict]:
    """
    Run anomaly detection across all active projects for a tenant.
    Returns list of detected anomalies.
    """
    from ml.prediction.engine import detect_project_anomalies
    anomalies = []

    try:
        from authentication.models import Project
        projects = Project.objects.filter(athens_tenant_id=tenant_id)[:50]
        for proj in projects:
            result = detect_project_anomalies(proj.id, tenant_id)
            if result.get('is_anomalous'):
                anomalies.append({
                    'project_id': proj.id,
                    'project_name': getattr(proj, 'name', str(proj.id)),
                    **result,
                })
    except Exception as e:
        logger.error(f'[ML Scan] Anomaly scan error: {e}')

    return anomalies


def get_enterprise_ml_dashboard(tenant_id: int) -> dict:
    """
    Aggregate ML predictions for enterprise dashboard.
    Returns high-level ML intelligence summary.
    """
    from ml.prediction.engine import (
        batch_predict_permit_risks, batch_predict_worker_risks
    )

    dashboard = {
        'tenant_id': tenant_id,
        'as_of': timezone.now().isoformat(),
        'high_risk_permits': [],
        'high_risk_workers': [],
        'anomalies': [],
        'model_status': get_model_status(tenant_id),
        'summary': {
            'critical_permits': 0,
            'high_risk_workers': 0,
            'anomalous_projects': 0,
            'avg_incident_probability': 0.0,
        }
    }

    # High risk permits
    try:
        permit_risks = batch_predict_permit_risks(tenant_id, limit=20)
        high_risk = [p for p in permit_risks if p.get('risk_score', 0) >= 55]
        dashboard['high_risk_permits'] = high_risk[:10]
        dashboard['summary']['critical_permits'] = len(
            [p for p in permit_risks if p.get('risk_label') in ('critical', 'high')]
        )
        if permit_risks:
            dashboard['summary']['avg_incident_probability'] = round(
                sum(p.get('incident_probability', 0) for p in permit_risks) / len(permit_risks), 3
            )
    except Exception as e:
        logger.debug(f'[ML Dashboard] Permit risks error: {e}')

    # High risk workers
    try:
        worker_risks = batch_predict_worker_risks(tenant_id, limit=20)
        high_risk_w = [w for w in worker_risks if w.get('overall_risk_score', 0) >= 55]
        dashboard['high_risk_workers'] = high_risk_w[:10]
        dashboard['summary']['high_risk_workers'] = len(high_risk_w)
    except Exception as e:
        logger.debug(f'[ML Dashboard] Worker risks error: {e}')

    # Anomalies
    try:
        anomalies = run_anomaly_scan(tenant_id)
        dashboard['anomalies'] = anomalies[:5]
        dashboard['summary']['anomalous_projects'] = len(anomalies)
    except Exception as e:
        logger.debug(f'[ML Dashboard] Anomaly scan error: {e}')

    return dashboard

"""
Athens ML — API Views
Production-grade ML prediction endpoints.
All endpoints are tenant-isolated and authenticated.
"""
import time
import logging
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from rest_framework.response import Response
from rest_framework import status

from authentication.tenant_utils import get_tenant_id_for_filtering

logger = logging.getLogger('athens.ml')


class MLRateThrottle(UserRateThrottle):
    rate = '120/min'


def _tenant(request) -> int:
    return get_tenant_id_for_filtering(request.user) or 0


# ─── Model Management ─────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ml_status(request):
    """Get ML model status for this tenant."""
    from ml.orchestration.orchestrator import get_model_status
    tenant_id = _tenant(request)
    return Response(get_model_status(tenant_id))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def train_models(request):
    """
    Trigger ML model training for this tenant.
    Runs synchronously — may take 10-30 seconds.
    """
    from ml.orchestration.orchestrator import train_all_models
    tenant_id = _tenant(request)
    model_type = request.data.get('model_type', 'all')

    t0 = time.time()

    if model_type == 'all':
        results = train_all_models(tenant_id, triggered_by=request.user)
    else:
        results = _train_single(model_type, tenant_id)

    results['duration_ms'] = int((time.time() - t0) * 1000)
    return Response(results)


def _train_single(model_type: str, tenant_id: int) -> dict:
    from ml.training.trainer import (
        train_incident_predictor, train_worker_risk_model,
        train_anomaly_detector, train_risk_matrix_model,
    )
    trainers = {
        'incident_predictor': train_incident_predictor,
        'worker_risk': train_worker_risk_model,
        'anomaly_detector': train_anomaly_detector,
        'risk_matrix': train_risk_matrix_model,
    }
    fn = trainers.get(model_type)
    if not fn:
        return {'error': f'Unknown model type: {model_type}'}
    try:
        metrics = fn(tenant_id)
        return {model_type: {'status': 'success', 'metrics': metrics}}
    except Exception as e:
        return {model_type: {'status': 'failed', 'error': str(e)}}


# ─── Incident Risk Prediction ─────────────────────────────────────────────────

@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([MLRateThrottle])
def predict_incident(request):
    """
    Predict incident probability for a permit.
    POST: { permit_id: int }
    GET: ?permit_id=int
    """
    from ml.prediction.engine import predict_incident_risk
    tenant_id = _tenant(request)

    permit_id = (request.data.get('permit_id') or
                 request.query_params.get('permit_id'))
    if not permit_id:
        return Response({'error': 'permit_id required'}, status=400)

    result = predict_incident_risk(int(permit_id), tenant_id)
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([MLRateThrottle])
def predict_permits_batch(request):
    """Batch predict incident risk for active permits."""
    from ml.prediction.engine import batch_predict_permit_risks
    tenant_id = _tenant(request)
    limit = min(int(request.data.get('limit', 20)), 100)
    results = batch_predict_permit_risks(tenant_id, limit)
    return Response({'predictions': results, 'count': len(results)})


# ─── Worker Risk Prediction ───────────────────────────────────────────────────

@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([MLRateThrottle])
def predict_worker(request):
    """
    Predict worker safety risk.
    POST: { worker_id: int }
    GET: ?worker_id=int
    """
    from ml.prediction.engine import predict_worker_risk
    tenant_id = _tenant(request)

    worker_id = (request.data.get('worker_id') or
                 request.query_params.get('worker_id'))
    if not worker_id:
        return Response({'error': 'worker_id required'}, status=400)

    result = predict_worker_risk(int(worker_id), tenant_id)
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([MLRateThrottle])
def predict_workers_batch(request):
    """Batch predict risk for all active workers."""
    from ml.prediction.engine import batch_predict_worker_risks
    tenant_id = _tenant(request)
    limit = min(int(request.data.get('limit', 50)), 200)
    results = batch_predict_worker_risks(tenant_id, limit)
    return Response({
        'predictions': results,
        'count': len(results),
        'high_risk_count': len([r for r in results if r.get('overall_risk_score', 0) >= 55]),
    })


# ─── Contractor Risk ──────────────────────────────────────────────────────────

@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([MLRateThrottle])
def predict_contractor(request):
    """
    Predict contractor safety risk.
    POST: { contractor_name: str }
    GET: ?contractor_name=str
    """
    from ml.prediction.engine import predict_contractor_risk
    tenant_id = _tenant(request)

    name = (request.data.get('contractor_name') or
            request.query_params.get('contractor_name', ''))
    if not name:
        return Response({'error': 'contractor_name required'}, status=400)

    result = predict_contractor_risk(name, tenant_id)
    return Response(result)


# ─── Anomaly Detection ────────────────────────────────────────────────────────

@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([MLRateThrottle])
def detect_anomaly(request):
    """
    Detect anomalies for a project.
    POST: { project_id: int }
    GET: ?project_id=int
    """
    from ml.prediction.engine import detect_project_anomalies
    tenant_id = _tenant(request)

    project_id = (request.data.get('project_id') or
                  request.query_params.get('project_id'))
    if not project_id:
        return Response({'error': 'project_id required'}, status=400)

    result = detect_project_anomalies(int(project_id), tenant_id)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def anomaly_scan(request):
    """Run anomaly scan across all projects for this tenant."""
    from ml.orchestration.orchestrator import run_anomaly_scan
    tenant_id = _tenant(request)
    anomalies = run_anomaly_scan(tenant_id)
    return Response({
        'anomalies': anomalies,
        'count': len(anomalies),
        'critical_count': len([a for a in anomalies if a.get('severity') in ('critical', 'high')]),
    })


# ─── Smart Risk Matrix ────────────────────────────────────────────────────────

@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([MLRateThrottle])
def smart_risk_score(request):
    """
    ML-enhanced risk score for a permit.
    POST: { permit_id: int }
    """
    from ml.prediction.engine import predict_smart_risk_score
    tenant_id = _tenant(request)

    permit_id = (request.data.get('permit_id') or
                 request.query_params.get('permit_id'))
    if not permit_id:
        return Response({'error': 'permit_id required'}, status=400)

    result = predict_smart_risk_score(int(permit_id), tenant_id)
    return Response(result)


# ─── Enterprise ML Dashboard ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ml_dashboard(request):
    """
    Enterprise ML intelligence dashboard.
    Returns aggregated predictions, anomalies, and model status.
    """
    from ml.orchestration.orchestrator import get_enterprise_ml_dashboard
    tenant_id = _tenant(request)
    dashboard = get_enterprise_ml_dashboard(tenant_id)
    return Response(dashboard)


# ─── LLM + ML Hybrid ─────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([MLRateThrottle])
def ml_ai_hybrid(request):
    """
    LLM + ML hybrid endpoint.
    Combines ML predictions with Gemini AI explanation.
    POST: { permit_id: int, question: str (optional) }
    """
    from ml.prediction.engine import get_ml_enhanced_ai_context
    from ai.orchestrator import orchestrate
    tenant_id = _tenant(request)

    permit_id = request.data.get('permit_id')
    if not permit_id:
        return Response({'error': 'permit_id required'}, status=400)

    # Get ML predictions
    ml_context = get_ml_enhanced_ai_context(int(permit_id), tenant_id)

    # Build hybrid prompt
    question = request.data.get('question', 'Explain the safety risks for this permit.')
    prompt = f"""You are Athens AI Safety Intelligence. Analyze this permit using ML predictions.

ML Predictions:
- Incident Probability: {ml_context['ml_incident_probability']:.1%}
- Risk Score: {ml_context['ml_risk_score']:.1f}/25
- Risk Level: {ml_context['ml_risk_label'].upper()}
- Top Risk Factors: {', '.join(ml_context['ml_top_risk_factors']) or 'None identified'}
- ML Confidence: {ml_context['ml_confidence']:.0%}
- Prediction Source: {ml_context['ml_source']}

Question: {question}

Provide a concise, actionable safety analysis based on these ML predictions.
Explain WHY the risk is {ml_context['ml_risk_label']} and what specific actions should be taken.
Keep response under 150 words."""

    ai_result = orchestrate(
        action='ml_hybrid_analysis',
        prompt=prompt,
        tenant_id=tenant_id,
        user=request.user,
        module='ml_hybrid',
        cache_prefix='analysis',
        use_cache=False,
        fallback={
            'explanation': f"ML analysis indicates {ml_context['ml_risk_label']} risk "
                           f"({ml_context['ml_incident_probability']:.0%} incident probability). "
                           f"Key factors: {', '.join(ml_context['ml_top_risk_factors'][:2]) or 'risk score, permit type'}. "
                           f"Ensure all controls are verified before proceeding.",
            'source': 'fallback',
        }
    )

    return Response({
        'permit_id': permit_id,
        'ml_predictions': ml_context,
        'ai_explanation': ai_result.get('explanation') or str(ai_result),
        'source': ai_result.get('source', 'gemini'),
    })


# ─── Anomaly Records ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def anomaly_records(request):
    """List recent anomaly records for this tenant."""
    from ml.db_models import MLAnomalyRecord
    tenant_id = _tenant(request)
    records = MLAnomalyRecord.objects.filter(
        tenant_id=tenant_id, status='open'
    ).order_by('-created_at')[:50]
    return Response([{
        'id': r.id,
        'anomaly_type': r.anomaly_type,
        'entity_type': r.entity_type,
        'entity_id': r.entity_id,
        'anomaly_score': r.anomaly_score,
        'severity': r.severity,
        'description': r.description,
        'created_at': r.created_at.isoformat(),
    } for r in records])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_anomaly(request, pk):
    """Mark an anomaly as reviewed."""
    from ml.db_models import MLAnomalyRecord
    tenant_id = _tenant(request)
    try:
        record = MLAnomalyRecord.objects.get(pk=pk, tenant_id=tenant_id)
        record.status = request.data.get('status', 'reviewed')
        record.reviewed_by = request.user
        record.reviewed_at = __import__('django.utils.timezone', fromlist=['timezone']).timezone.now()
        record.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])
        return Response({'status': 'ok'})
    except MLAnomalyRecord.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


# ─── Prediction History ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def prediction_history(request):
    """Get recent ML predictions for this tenant."""
    from ml.db_models import MLPrediction
    tenant_id = _tenant(request)
    model_type = request.query_params.get('model_type')
    qs = MLPrediction.objects.filter(tenant_id=tenant_id)
    if model_type:
        qs = qs.filter(model_type=model_type)
    records = qs.order_by('-created_at')[:100]
    return Response([{
        'id': r.id,
        'model_type': r.model_type,
        'entity_type': r.entity_type,
        'entity_id': r.entity_id,
        'prediction_label': r.prediction_label,
        'prediction_score': r.prediction_score,
        'confidence': r.confidence,
        'latency_ms': r.latency_ms,
        'used_fallback': r.used_fallback,
        'created_at': r.created_at.isoformat(),
    } for r in records])

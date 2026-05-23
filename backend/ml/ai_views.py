"""
Athens AI Platform API.

Secure, tenant-isolated API facade for predictive safety workflows.
Routes are exposed at /ai/... and reuse the production ML feature pipeline.
"""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from authentication.tenant_utils import get_tenant_id_for_filtering
from ml.feature_engineering.extractor import extract_permit_features, extract_project_features
from ml.orchestration.orchestrator import get_enterprise_ml_dashboard
from ml.prediction.engine import (
    detect_project_anomalies,
    predict_incident_risk,
    predict_smart_risk_score,
    predict_worker_risk,
)
from ml.services.automation import record_high_risk_prediction


class AISafetyThrottle(UserRateThrottle):
    rate = '120/min'


def _tenant_id(request):
    tenant_id = get_tenant_id_for_filtering(request.user)
    if not tenant_id:
        return None
    return tenant_id


def _require_tenant(request):
    tenant_id = _tenant_id(request)
    if not tenant_id:
        return None, Response({'error': 'Tenant context required'}, status=status.HTTP_403_FORBIDDEN)
    return tenant_id, None


def _risk_level(score: float) -> str:
    if score >= 75:
        return 'HIGH'
    if score >= 45:
        return 'MEDIUM'
    return 'LOW'


def _recommended_controls(features: dict, risk_level: str) -> list[str]:
    actions = []
    if risk_level == 'HIGH':
        actions.append('Supervisor approval required')
        actions.append('Increase field safety monitoring frequency')
    if features.get('requires_gas_testing') and not features.get('has_gas_readings'):
        actions.append('Gas testing mandatory before work starts')
    if features.get('requires_isolation') and not features.get('has_isolation_details'):
        actions.append('Verify isolation plan and attach isolation evidence')
    if features.get('is_electrical'):
        actions.append('Additional electrical PPE and LOTO verification required')
    if features.get('is_height_work'):
        actions.append('Fall protection and anchor-point inspection required')
    if features.get('is_night_work'):
        actions.append('Night shift lighting and fatigue controls required')
    if not actions:
        actions.append('Continue standard PTW controls and toolbox briefing')
    return actions


def _predicted_incident(features: dict) -> str:
    if features.get('is_electrical'):
        return 'Electrical Arc Flash'
    if features.get('is_hot_work'):
        return 'Fire or Burn Injury'
    if features.get('is_confined_space'):
        return 'Confined Space Exposure'
    if features.get('is_height_work'):
        return 'Fall from Height'
    if features.get('is_excavation'):
        return 'Excavation Collapse or Struck By'
    return 'General Safety Incident'


def _similar_incidents(permit_id: int, tenant_id: int) -> list[dict]:
    try:
        from ptw.models import Permit
        from incidentmanagement.models import Incident

        permit = Permit.objects.get(id=permit_id, project__athens_tenant_id=tenant_id)
        incidents = Incident.objects.filter(
            project__athens_tenant_id=tenant_id,
            project_id=permit.project_id,
            location__icontains=permit.location[:20],
            date_time_incident__gte=timezone.now() - timedelta(days=365),
        ).order_by('-date_time_incident')[:5]
        return [
            {
                'id': str(item.id),
                'incident_id': item.incident_id,
                'title': item.title,
                'incident_type': item.incident_type,
                'severity': item.severity_level,
                'date': item.date_time_incident.isoformat(),
                'location': item.location,
            }
            for item in incidents
        ]
    except Exception:
        return []


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AISafetyThrottle])
def predict_incident(request):
    tenant_id, error = _require_tenant(request)
    if error:
        return error

    permit_id = request.data.get('permit_id')
    if not permit_id:
        return Response({'error': 'permit_id required'}, status=status.HTTP_400_BAD_REQUEST)

    prediction = predict_incident_risk(int(permit_id), tenant_id)
    features = extract_permit_features(int(permit_id), tenant_id)
    score = float(prediction.get('risk_score', 0))
    level = _risk_level(score)
    actions = _recommended_controls(features, level)

    record_high_risk_prediction(
        tenant_id=tenant_id,
        entity_type='permit',
        entity_id=int(permit_id),
        score=score,
        description=f'High incident probability detected for permit {permit_id}',
        contributions=prediction.get('explanation', {}),
    )

    return Response({
        'risk_level': level,
        'incident_probability': round(float(prediction.get('incident_probability', 0)) * 100, 2),
        'risk_score': score,
        'severity_prediction': prediction.get('risk_label', 'low').upper(),
        'predicted_incident': _predicted_incident(features),
        'recommended_actions': actions,
        'confidence': prediction.get('confidence', 0),
        'model_source': prediction.get('model_source'),
        'explanation': prediction.get('explanation', {}),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AISafetyThrottle])
def analyze_ptw(request):
    tenant_id, error = _require_tenant(request)
    if error:
        return error

    permit_id = request.data.get('permit_id')
    if not permit_id:
        return Response({'error': 'permit_id required'}, status=status.HTTP_400_BAD_REQUEST)

    incident = predict_incident_risk(int(permit_id), tenant_id)
    smart_risk = predict_smart_risk_score(int(permit_id), tenant_id)
    features = extract_permit_features(int(permit_id), tenant_id)
    level = _risk_level(float(incident.get('risk_score', 0)))
    controls = _recommended_controls(features, level)

    hazard_map = {
        'is_electrical': 'Electrical energy / arc flash',
        'is_hot_work': 'Ignition source / fire exposure',
        'is_confined_space': 'Oxygen deficiency or toxic atmosphere',
        'is_height_work': 'Fall from height',
        'is_excavation': 'Excavation collapse / underground services',
    }
    predicted_hazards = [label for key, label in hazard_map.items() if features.get(key)]

    return Response({
        'permit_id': int(permit_id),
        'risk_level': level,
        'incident_probability': round(float(incident.get('incident_probability', 0)) * 100, 2),
        'predicted_hazards': predicted_hazards,
        'recommended_controls': controls,
        'recommended_ppe': _recommended_ppe(features),
        'recommended_toolbox_talks': _recommended_toolbox_talks(features),
        'smart_risk': smart_risk,
        'similar_previous_incidents': _similar_incidents(int(permit_id), tenant_id),
        'model_source': incident.get('model_source'),
    })


def _recommended_ppe(features: dict) -> list[str]:
    ppe = {'Safety helmet', 'Safety shoes', 'Reflective jacket'}
    if features.get('is_electrical'):
        ppe.update({'Arc-rated face shield', 'Insulated gloves'})
    if features.get('is_hot_work'):
        ppe.update({'Fire-resistant clothing', 'Welding shield'})
    if features.get('is_height_work'):
        ppe.update({'Full body harness', 'Double lanyard'})
    if features.get('is_confined_space'):
        ppe.update({'Gas detector', 'Respiratory protection'})
    return sorted(ppe)


def _recommended_toolbox_talks(features: dict) -> list[str]:
    talks = ['PTW compliance briefing']
    if features.get('is_electrical'):
        talks.append('Electrical isolation and arc flash prevention')
    if features.get('is_hot_work'):
        talks.append('Hot work fire watch and spark containment')
    if features.get('is_confined_space'):
        talks.append('Confined space entry and rescue readiness')
    if features.get('is_height_work'):
        talks.append('Working at height and fall protection')
    return talks


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AISafetyThrottle])
def detect_anomaly(request):
    tenant_id, error = _require_tenant(request)
    if error:
        return error
    project_id = request.data.get('project_id')
    if not project_id:
        return Response({'error': 'project_id required'}, status=status.HTTP_400_BAD_REQUEST)
    return Response(detect_project_anomalies(int(project_id), tenant_id))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def risk_dashboard(request):
    tenant_id, error = _require_tenant(request)
    if error:
        return error
    return Response(get_enterprise_ml_dashboard(tenant_id))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([AISafetyThrottle])
def worker_risk(request, worker_id: int):
    tenant_id, error = _require_tenant(request)
    if error:
        return error
    return Response(predict_worker_risk(worker_id, tenant_id))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([AISafetyThrottle])
def project_risk(request, project_id: int):
    tenant_id, error = _require_tenant(request)
    if error:
        return error
    features = extract_project_features(project_id, tenant_id)
    anomaly = detect_project_anomalies(project_id, tenant_id)
    score = max(
        float(features.get('avg_permit_risk_score', 0)) * 4,
        float(anomaly.get('anomaly_score', 0)),
    )
    return Response({
        'project_id': project_id,
        'risk_score': round(min(score, 100), 2),
        'risk_level': _risk_level(score),
        'features': features,
        'anomaly': anomaly,
    })

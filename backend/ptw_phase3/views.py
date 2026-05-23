"""
PTW Phase 3 Views — Steps 21-35
Full CRUD + AI-powered endpoints for all Phase 3 models.
"""
import logging
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from authentication.tenant_utils import get_tenant_id_for_filtering
from .models import (
    SiteMap, SiteZone, PermitZoneAssignment,
    ConflictRule, PermitConflict,
    WeatherReading, WeatherAlert,
    AIApprovalRecommendation,
    IoTDevice, IoTReading,
    EmergencyPlan, EmergencyEvent,
    WorkflowDefinition,
    CommandCenterWidget,
    SafetyAudit,
    ContractorSafetyScore,
    EnterpriseNotification,
    SearchIndex,
)
from .serializers import (
    SiteMapSerializer, SiteZoneSerializer, PermitZoneAssignmentSerializer,
    ConflictRuleSerializer, PermitConflictSerializer,
    WeatherReadingSerializer, WeatherAlertSerializer,
    AIApprovalRecommendationSerializer,
    IoTDeviceSerializer, IoTReadingSerializer,
    EmergencyPlanSerializer, EmergencyEventSerializer,
    WorkflowDefinitionSerializer,
    CommandCenterWidgetSerializer,
    SafetyAuditSerializer,
    ContractorSafetyScoreSerializer,
    EnterpriseNotificationSerializer,
    SearchIndexSerializer,
)

logger = logging.getLogger('athens.ptw_phase3')


# ─── Site Maps ─────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def site_maps(request):
    if request.method == 'GET':
        project_id = request.query_params.get('project_id')
        qs = SiteMap.objects.filter(is_active=True)
        if project_id:
            qs = qs.filter(project_id=project_id)
        return Response(SiteMapSerializer(qs, many=True).data)
    serializer = SiteMapSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def site_map_detail(request, pk):
    try:
        obj = SiteMap.objects.get(pk=pk)
    except SiteMap.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        return Response(SiteMapSerializer(obj).data)
    if request.method == 'PUT':
        s = SiteMapSerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=400)
    obj.is_active = False
    obj.save()
    return Response(status=204)


# ─── Weather ───────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def weather_readings(request):
    if request.method == 'GET':
        project_id = request.query_params.get('project_id')
        qs = WeatherReading.objects.all()
        if project_id:
            qs = qs.filter(project_id=project_id)
        return Response(WeatherReadingSerializer(qs[:20], many=True).data)
    s = WeatherReadingSerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=201)
    return Response(s.errors, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def weather_alerts(request):
    project_id = request.query_params.get('project_id')
    qs = WeatherAlert.objects.filter(is_active=True)
    if project_id:
        qs = qs.filter(project_id=project_id)
    return Response(WeatherAlertSerializer(qs, many=True).data)


# ─── AI Approval Recommendation ───────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def ai_approval_recommendation(request, permit_id=None):
    if request.method == 'GET' and permit_id:
        try:
            obj = AIApprovalRecommendation.objects.get(permit_id=permit_id)
            return Response(AIApprovalRecommendationSerializer(obj).data)
        except AIApprovalRecommendation.DoesNotExist:
            # Generate on-the-fly via AI
            return _generate_approval_recommendation(request, permit_id)

    if request.method == 'POST':
        permit_id = request.data.get('permit_id')
        if not permit_id:
            return Response({'error': 'permit_id required'}, status=400)
        return _generate_approval_recommendation(request, permit_id)

    return Response({'error': 'Not found'}, status=404)


def _generate_approval_recommendation(request, permit_id):
    from ptw.models import Permit
    from ai.orchestrator import orchestrate
    from ai.phase4_prompts import approval_assistant_prompt

    try:
        permit = Permit.objects.select_related('permit_type').get(id=permit_id)
    except Permit.DoesNotExist:
        return Response({'error': 'Permit not found'}, status=404)

    tenant_id = get_tenant_id_for_filtering(request.user)
    context = {
        'permit_number': permit.permit_number,
        'permit_type': permit.permit_type.name if permit.permit_type else '',
        'description': permit.description,
        'location': permit.location,
        'risk_score': permit.risk_score,
        'risk_level': permit.risk_level,
        'ppe_requirements': permit.ppe_requirements,
        'control_measures': permit.control_measures,
        'status': permit.status,
    }

    result = orchestrate(
        action='approval_recommendation',
        prompt=approval_assistant_prompt(context),
        tenant_id=tenant_id,
        user=request.user,
        module='ptw_phase3',
        cache_prefix='analysis',
        use_cache=False,
        fallback={
            'recommendation': 'review',
            'confidence_score': 50.0,
            'reasoning': 'Manual review required — AI analysis unavailable.',
            'risk_factors': [],
            'missing_items': [],
            'suggestions': ['Verify all mandatory fields are complete'],
        },
    )

    obj, _ = AIApprovalRecommendation.objects.update_or_create(
        permit_id=permit_id,
        defaults={
            'recommendation': result.get('recommendation', 'review'),
            'confidence_score': float(result.get('confidence_score', 50)),
            'reasoning': result.get('reasoning', ''),
            'risk_factors': result.get('risk_factors', []),
            'missing_items': result.get('missing_items', []),
            'suggestions': result.get('suggestions', []),
        },
    )
    return Response(AIApprovalRecommendationSerializer(obj).data)


# ─── IoT Devices ───────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def iot_devices(request):
    if request.method == 'GET':
        project_id = request.query_params.get('project_id')
        qs = IoTDevice.objects.filter(is_active=True)
        if project_id:
            qs = qs.filter(project_id=project_id)
        return Response(IoTDeviceSerializer(qs, many=True).data)
    s = IoTDeviceSerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=201)
    return Response(s.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def iot_reading(request, device_id):
    try:
        device = IoTDevice.objects.get(pk=device_id)
    except IoTDevice.DoesNotExist:
        return Response({'error': 'Device not found'}, status=404)

    reading = IoTReading.objects.create(
        device=device,
        data=request.data.get('data', {}),
        is_alert=request.data.get('is_alert', False),
        alert_message=request.data.get('alert_message', ''),
    )
    device.last_reading = request.data.get('data', {})
    device.last_seen = timezone.now()
    device.status = 'alert' if reading.is_alert else 'online'
    device.save(update_fields=['last_reading', 'last_seen', 'status'])

    if reading.is_alert:
        # Broadcast via WebSocket
        try:
            from ai.consumers import broadcast_ai_event
            tenant_id = get_tenant_id_for_filtering(request.user)
            broadcast_ai_event(tenant_id, 'ai_alert', {
                'type': 'iot_alert',
                'device': device.name,
                'message': reading.alert_message,
                'data': reading.data,
            })
        except Exception:
            pass

    return Response(IoTReadingSerializer(reading).data, status=201)


# ─── Emergency ─────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def emergency_plans(request):
    if request.method == 'GET':
        project_id = request.query_params.get('project_id')
        qs = EmergencyPlan.objects.filter(is_active=True)
        if project_id:
            qs = qs.filter(project_id=project_id)
        return Response(EmergencyPlanSerializer(qs, many=True).data)
    s = EmergencyPlanSerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=201)
    return Response(s.errors, status=400)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def emergency_events(request):
    if request.method == 'GET':
        project_id = request.query_params.get('project_id')
        qs = EmergencyEvent.objects.filter(status='active')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return Response(EmergencyEventSerializer(qs, many=True).data)

    # Trigger emergency — dispatch AI emergency agent
    tenant_id = get_tenant_id_for_filtering(request.user)
    from ai.agents import run_emergency_agent
    result = run_emergency_agent(tenant_id, {
        'title': request.data.get('title', 'Emergency'),
        'description': request.data.get('description', ''),
        'project_id': request.data.get('project_id'),
    })

    # Broadcast
    try:
        from ai.consumers import broadcast_ai_event
        broadcast_ai_event(tenant_id, 'emergency_alert', result)
    except Exception:
        pass

    return Response(result, status=201)


# ─── Command Center Dashboard ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def command_center_snapshot(request):
    """Real-time enterprise command center snapshot."""
    tenant_id = get_tenant_id_for_filtering(request.user)
    now = timezone.now()

    snapshot = {
        'as_of': now.isoformat(),
        'active_permits': 0,
        'pending_approvals': 0,
        'high_risk_permits': 0,
        'open_incidents': 0,
        'active_workers': 0,
        'iot_alerts': 0,
        'weather_risk': 'low',
        'contractor_scores': [],
        'recent_events': [],
        'ai_insights': [],
        'emergency_active': False,
    }

    try:
        from ptw.models import Permit
        snapshot['active_permits'] = Permit.objects.filter(
            status__in=['active', 'approved']
        ).count()
        snapshot['pending_approvals'] = Permit.objects.filter(
            status__in=['submitted', 'under_review']
        ).count()
        snapshot['high_risk_permits'] = Permit.objects.filter(
            status__in=['active', 'approved'],
            risk_level__in=['high', 'extreme'],
        ).count()
    except Exception:
        pass

    try:
        from incidentmanagement.models import Incident
        snapshot['open_incidents'] = Incident.objects.filter(
            status__in=['open', 'under_investigation']
        ).count()
    except Exception:
        pass

    try:
        snapshot['iot_alerts'] = IoTDevice.objects.filter(status='alert').count()
    except Exception:
        pass

    try:
        from ai.phase5_models import AIIndustrialEvent, AIPredictiveInsight
        events = AIIndustrialEvent.objects.filter(
            tenant_id=tenant_id
        ).order_by('-created_at').values(
            'id', 'event_type', 'severity', 'title', 'created_at'
        )[:10]
        snapshot['recent_events'] = [
            {**e, 'created_at': e['created_at'].isoformat()} for e in events
        ]
        insights = AIPredictiveInsight.objects.filter(
            tenant_id=tenant_id, acknowledged=False
        ).order_by('-probability').values(
            'id', 'insight_type', 'title', 'probability', 'impact'
        )[:5]
        snapshot['ai_insights'] = list(insights)
    except Exception:
        pass

    try:
        from ai.phase4_models import AISafetyBrainSnapshot
        brain = AISafetyBrainSnapshot.objects.filter(
            tenant_id=tenant_id
        ).order_by('-generated_at').first()
        if brain:
            snapshot['enterprise_score'] = brain.enterprise_score
            snapshot['accident_probability'] = brain.accident_probability
            snapshot['unsafe_trends'] = brain.unsafe_trends[:5]
    except Exception:
        pass

    snapshot['emergency_active'] = EmergencyEvent.objects.filter(
        status='active'
    ).exists()

    return Response(snapshot)


# ─── Safety Brain ──────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def safety_brain(request):
    """Get or generate AI safety brain snapshot."""
    from ai.phase4_models import AISafetyBrainSnapshot
    from ai.orchestrator import orchestrate

    tenant_id = get_tenant_id_for_filtering(request.user)

    if request.method == 'GET':
        snapshot = AISafetyBrainSnapshot.objects.filter(
            tenant_id=tenant_id
        ).order_by('-generated_at').first()
        if not snapshot:
            return Response({'message': 'No snapshot yet. POST to generate.'}, status=404)
        return Response({
            'enterprise_score': snapshot.enterprise_score,
            'accident_probability': snapshot.accident_probability,
            'unsafe_trends': snapshot.unsafe_trends,
            'high_risk_contractors': snapshot.high_risk_contractors,
            'recurring_failures': snapshot.recurring_failures,
            'module_scores': snapshot.module_scores,
            'predictions': snapshot.predictions,
            'ai_summary': snapshot.ai_summary,
            'generated_at': snapshot.generated_at.isoformat(),
        })

    # Generate new snapshot
    from ai.phase5_prompts import safety_brain_prompt
    data = _collect_brain_data(tenant_id)
    result = orchestrate(
        action='safety_brain_snapshot',
        prompt=safety_brain_prompt(data),
        tenant_id=tenant_id,
        user=request.user,
        module='safety_brain',
        cache_prefix='brain',
        use_cache=False,
        fallback={
            'enterprise_score': 70.0,
            'accident_probability': 25.0,
            'unsafe_trends': [],
            'high_risk_contractors': [],
            'recurring_failures': [],
            'module_scores': {},
            'predictions': [],
            'ai_summary': 'Safety brain analysis unavailable — Gemini not configured.',
        },
    )

    snapshot = AISafetyBrainSnapshot.objects.create(
        tenant_id=tenant_id,
        enterprise_score=float(result.get('enterprise_score', 70)),
        accident_probability=float(result.get('accident_probability', 25)),
        unsafe_trends=result.get('unsafe_trends', []),
        high_risk_contractors=result.get('high_risk_contractors', []),
        recurring_failures=result.get('recurring_failures', []),
        module_scores=result.get('module_scores', {}),
        predictions=result.get('predictions', []),
        ai_summary=result.get('ai_summary', ''),
    )

    # Broadcast to command center
    try:
        from ai.consumers import broadcast_ai_event
        broadcast_ai_event(tenant_id, 'ai_event', {
            'type': 'safety_brain_updated',
            'enterprise_score': snapshot.enterprise_score,
        })
    except Exception:
        pass

    return Response({
        'enterprise_score': snapshot.enterprise_score,
        'accident_probability': snapshot.accident_probability,
        'unsafe_trends': snapshot.unsafe_trends,
        'ai_summary': snapshot.ai_summary,
        'generated_at': snapshot.generated_at.isoformat(),
        'source': result.get('source', 'gemini'),
    })


def _collect_brain_data(tenant_id: int) -> dict:
    data = {
        'active_permits': 0, 'high_risk_permits': 0,
        'open_incidents': 0, 'pending_approvals': 0,
        'iot_alerts': 0, 'contractor_violations': 0,
    }
    try:
        from ptw.models import Permit
        data['active_permits'] = Permit.objects.filter(status__in=['active', 'approved']).count()
        data['high_risk_permits'] = Permit.objects.filter(
            status__in=['active', 'approved'], risk_level__in=['high', 'extreme']
        ).count()
        data['pending_approvals'] = Permit.objects.filter(
            status__in=['submitted', 'under_review']
        ).count()
    except Exception:
        pass
    try:
        from incidentmanagement.models import Incident
        data['open_incidents'] = Incident.objects.filter(
            status__in=['open', 'under_investigation']
        ).count()
    except Exception:
        pass
    data['iot_alerts'] = IoTDevice.objects.filter(status='alert').count()
    return data


# ─── AI Agent Dispatch ─────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dispatch_agent(request):
    """Dispatch an AI agent by type."""
    from ai.agents import dispatch_agent as _dispatch
    tenant_id = get_tenant_id_for_filtering(request.user)
    agent_type = request.data.get('agent_type', 'ptw')
    payload = request.data.get('payload', {})
    result = _dispatch(tenant_id, agent_type, payload)
    return Response(result)


# ─── Global Search ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search(request):
    """AI-powered semantic search across all modules."""
    query = request.query_params.get('q', '').strip()
    if not query:
        return Response({'error': 'q parameter required'}, status=400)

    tenant_id = get_tenant_id_for_filtering(request.user)
    entity_types = request.query_params.getlist('types') or None

    try:
        from ai.vector_memory import semantic_search
        results = semantic_search(tenant_id, query, entity_types, top_k=10)
        return Response({'query': query, 'results': results, 'count': len(results)})
    except Exception as e:
        logger.error(f'[Search] Error: {e}')
        return Response({'query': query, 'results': [], 'count': 0})


# ─── Contractor Safety Scores ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contractor_scores(request):
    project_id = request.query_params.get('project_id')
    qs = ContractorSafetyScore.objects.all()
    if project_id:
        qs = qs.filter(project_id=project_id)
    return Response(ContractorSafetyScoreSerializer(qs.order_by('risk_score'), many=True).data)


# ─── Notifications ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_notifications(request):
    qs = EnterpriseNotification.objects.filter(
        recipient=request.user
    ).order_by('-created_at')[:50]
    return Response(EnterpriseNotificationSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, pk):
    EnterpriseNotification.objects.filter(
        pk=pk, recipient=request.user
    ).update(status='read', read_at=timezone.now())
    return Response({'status': 'ok'})

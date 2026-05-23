"""
Athens AI — Context Intelligence Views
Company, Project, Location profile management + Smart Context Engine.
"""
import time
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from authentication.tenant_utils import get_tenant_id_for_filtering
from .context_models import (
    AICompanyProfile, AIProjectProfile, AILocationProfile,
    AIContextMemory, AIContextRequest,
)
from .context_prompts import (
    company_profile_prompt, project_profile_prompt,
    location_profile_prompt, smart_context_engine_prompt,
)
from .orchestrator import orchestrate, get_context_for_ptw
from .gemini_service import is_available

logger = logging.getLogger('athens.ai')


# ─── Company Intelligence ──────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def company_intelligence(request):
    tenant_id = get_tenant_id_for_filtering(request.user)

    if request.method == 'GET':
        try:
            profile = AICompanyProfile.objects.get(tenant_id=tenant_id)
            return Response({
                'tenant_id': profile.tenant_id,
                'company_name': profile.company_name,
                'industry': profile.industry,
                'risk_category': profile.risk_category,
                'safety_maturity': profile.safety_maturity,
                'safety_maturity_score': profile.safety_maturity_score,
                'priority_hazards': profile.priority_hazards,
                'mandatory_ppe': profile.mandatory_ppe,
                'company_rules': profile.company_rules,
                'safety_standards': profile.safety_standards,
                'ai_summary': profile.ai_summary,
                'last_analyzed': profile.last_analyzed,
            })
        except AICompanyProfile.DoesNotExist:
            return Response({'message': 'No profile yet. POST to generate.'}, status=404)

    # Generate/update company profile
    company_data = {
        'company_name': request.data.get('company_name', ''),
        'industry': request.data.get('industry', 'other'),
        'company_type': request.data.get('company_type', ''),
        'work_categories': request.data.get('work_categories', []),
        'safety_standards': request.data.get('safety_standards', []),
    }

    result = orchestrate(
        action='company_profile',
        prompt=company_profile_prompt(company_data),
        tenant_id=tenant_id,
        user=request.user,
        module='context_engine',
        cache_prefix='context',
        fallback={
            'ai_summary': f"Company profile for {company_data['company_name']}.",
            'industry_classification': company_data['industry'],
            'risk_category': 'medium',
            'safety_maturity': 'managed',
            'safety_maturity_score': 50.0,
            'priority_hazards': [],
            'mandatory_ppe': ['Safety helmet', 'Safety boots', 'Hi-vis vest'],
            'company_rules': [],
            'permit_intelligence': {},
            'context_injection': '',
        },
    )

    from django.utils import timezone
    profile, _ = AICompanyProfile.objects.update_or_create(
        tenant_id=tenant_id,
        defaults={
            'company_name': company_data['company_name'],
            'industry': result.get('industry_classification', company_data['industry']),
            'company_type': company_data['company_type'],
            'safety_standards': company_data['safety_standards'],
            'work_categories': company_data['work_categories'],
            'risk_category': result.get('risk_category', 'medium'),
            'safety_maturity': result.get('safety_maturity', 'managed'),
            'safety_maturity_score': float(result.get('safety_maturity_score', 50)),
            'ai_summary': result.get('ai_summary', ''),
            'priority_hazards': result.get('priority_hazards', []),
            'mandatory_ppe': result.get('mandatory_ppe', []),
            'company_rules': result.get('company_rules', []),
            'permit_requirements': result.get('permit_intelligence', {}),
            'ai_context_blob': result.get('context_injection', ''),
            'last_analyzed': timezone.now(),
        },
    )
    return Response({
        'tenant_id': profile.tenant_id,
        'company_name': profile.company_name,
        'industry': profile.industry,
        'risk_category': profile.risk_category,
        'safety_maturity': profile.safety_maturity,
        'priority_hazards': profile.priority_hazards,
        'ai_summary': profile.ai_summary,
        'source': result.get('source', 'gemini'),
    })


# ─── Project Intelligence ──────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def project_intelligence(request, project_id=None):
    tenant_id = get_tenant_id_for_filtering(request.user)

    if request.method == 'GET':
        pid = project_id or request.query_params.get('project_id')
        if not pid:
            profiles = AIProjectProfile.objects.filter(tenant_id=tenant_id)
            return Response([{
                'project_id': p.project_id,
                'project_name': p.project_name,
                'project_type': p.project_type,
                'risk_score': p.risk_score,
                'safety_score': p.safety_score,
                'phase': p.phase,
            } for p in profiles])
        try:
            profile = AIProjectProfile.objects.get(project_id=pid)
            return Response({
                'project_id': profile.project_id,
                'project_name': profile.project_name,
                'project_type': profile.project_type,
                'phase': profile.phase,
                'risk_score': profile.risk_score,
                'safety_score': profile.safety_score,
                'critical_activities': profile.critical_activities,
                'high_risk_zones': profile.high_risk_zones,
                'simultaneous_ops_risk': profile.simultaneous_ops_risk,
                'shutdown_active': profile.shutdown_active,
                'ai_summary': profile.ai_summary,
            })
        except AIProjectProfile.DoesNotExist:
            return Response({'message': 'No profile yet.'}, status=404)

    # Generate project profile
    project_data = {
        'project_name': request.data.get('project_name', ''),
        'project_type': request.data.get('project_type', 'other'),
        'phase': request.data.get('phase', 'construction'),
        'industry': request.data.get('industry', 'industrial'),
        'active_contractors': request.data.get('active_contractors', []),
        'description': request.data.get('description', ''),
    }
    pid = request.data.get('project_id') or project_id

    result = orchestrate(
        action='project_profile',
        prompt=project_profile_prompt(project_data),
        tenant_id=tenant_id,
        user=request.user,
        module='context_engine',
        cache_prefix='context',
        fallback={
            'ai_summary': f"Project profile for {project_data['project_name']}.",
            'risk_score': 50.0,
            'safety_score': 75.0,
            'critical_activities': [],
            'high_risk_zones': [],
            'simultaneous_ops_risk': False,
            'shutdown_considerations': [],
            'project_specific_controls': [],
            'context_injection': '',
        },
    )

    from django.utils import timezone
    profile, _ = AIProjectProfile.objects.update_or_create(
        project_id=pid,
        defaults={
            'tenant_id': tenant_id,
            'project_name': project_data['project_name'],
            'project_type': project_data['project_type'],
            'phase': project_data['phase'],
            'risk_score': float(result.get('risk_score', 50)),
            'safety_score': float(result.get('safety_score', 75)),
            'ai_summary': result.get('ai_summary', ''),
            'critical_activities': result.get('critical_activities', []),
            'high_risk_zones': result.get('high_risk_zones', []),
            'simultaneous_ops_risk': bool(result.get('simultaneous_ops_risk', False)),
            'ai_context_blob': result.get('context_injection', ''),
            'last_analyzed': timezone.now(),
        },
    )
    return Response({
        'project_id': profile.project_id,
        'project_name': profile.project_name,
        'risk_score': profile.risk_score,
        'safety_score': profile.safety_score,
        'critical_activities': profile.critical_activities,
        'ai_summary': profile.ai_summary,
        'source': result.get('source', 'gemini'),
    })


# ─── Location Intelligence ─────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def location_intelligence(request):
    tenant_id = get_tenant_id_for_filtering(request.user)

    if request.method == 'GET':
        location = request.query_params.get('location', '')
        qs = AILocationProfile.objects.filter(tenant_id=tenant_id)
        if location:
            qs = qs.filter(location_name__icontains=location)
        return Response([{
            'id': loc.id,
            'location_name': loc.location_name,
            'zone_classification': loc.zone_classification,
            'risk_level': loc.risk_level,
            'gas_testing_required': loc.gas_testing_required,
            'hot_work_restricted': loc.hot_work_restricted,
            'auto_warnings': loc.auto_warnings,
        } for loc in qs[:50]])

    # Generate location profile
    location = request.data.get('location_name', '').strip()
    if not location:
        return Response({'error': 'location_name required'}, status=400)

    context = {
        'industry': request.data.get('industry', 'industrial'),
        'project_type': request.data.get('project_type', ''),
    }

    result = orchestrate(
        action='location_profile',
        prompt=location_profile_prompt(location, context),
        tenant_id=tenant_id,
        user=request.user,
        module='context_engine',
        cache_prefix='context',
        fallback={
            'zone_classification': 'normal',
            'risk_level': 'medium',
            'location_keywords': [],
            'auto_warnings': [],
            'mandatory_controls': [],
            'mandatory_ppe': [],
            'gas_testing_required': False,
            'hot_work_restricted': False,
            'smoking_prohibited': True,
            'nearby_hazards': [],
            'ai_summary': f'Location profile for {location}.',
        },
    )

    profile, _ = AILocationProfile.objects.update_or_create(
        tenant_id=tenant_id,
        location_name=location,
        defaults={
            'project_id': request.data.get('project_id'),
            'location_keywords': result.get('location_keywords', []),
            'zone_classification': result.get('zone_classification', 'normal'),
            'risk_level': result.get('risk_level', 'medium'),
            'auto_warnings': result.get('auto_warnings', []),
            'mandatory_controls': result.get('mandatory_controls', []),
            'mandatory_ppe': result.get('mandatory_ppe', []),
            'gas_testing_required': bool(result.get('gas_testing_required', False)),
            'hot_work_restricted': bool(result.get('hot_work_restricted', False)),
            'smoking_prohibited': bool(result.get('smoking_prohibited', True)),
            'nearby_hazards': result.get('nearby_hazards', []),
            'ai_summary': result.get('ai_summary', ''),
        },
    )
    return Response({
        'id': profile.id,
        'location_name': profile.location_name,
        'zone_classification': profile.zone_classification,
        'risk_level': profile.risk_level,
        'auto_warnings': profile.auto_warnings,
        'gas_testing_required': profile.gas_testing_required,
        'hot_work_restricted': profile.hot_work_restricted,
        'ai_summary': profile.ai_summary,
        'source': result.get('source', 'gemini'),
    })


# ─── Smart Context Engine ──────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def smart_context_engine(request):
    """
    Combine company + project + location + weather + memory context
    for the most intelligent PTW analysis possible.
    """
    t0 = time.time()
    tenant_id = get_tenant_id_for_filtering(request.user)
    permit_context = request.data.get('permit', {})
    project_id = request.data.get('project_id')
    location = permit_context.get('location', '')

    # Retrieve all context
    ctx = get_context_for_ptw(tenant_id, project_id, location, permit_context.get('permit_type', ''))
    ctx['permit'] = permit_context

    # Add weather if available
    if project_id:
        try:
            from ptw_phase3.models import WeatherReading
            weather = WeatherReading.objects.filter(project_id=project_id).latest()
            ctx['weather'] = {
                'temperature_c': weather.temperature_c,
                'wind_speed_kmh': weather.wind_speed_kmh,
                'lightning_risk': weather.lightning_risk,
                'risk_level': weather.risk_level,
            }
        except Exception:
            ctx['weather'] = {}

    result = orchestrate(
        action='smart_context_engine',
        prompt=smart_context_engine_prompt(ctx),
        tenant_id=tenant_id,
        user=request.user,
        module='context_engine',
        cache_prefix='context',
        use_cache=False,
        fallback={
            'hazards': [],
            'controls': [],
            'ppe_requirements': [],
            'checklist': [],
            'risk': {'probability': 2, 'severity': 2, 'score': 4, 'level': 'Low'},
            'context_warnings': [],
            'approval_recommendations': [],
            'confidence': 'low',
            'context_sources': [],
            'ai_recommendation': 'review',
            'ai_reasoning': 'Context engine unavailable.',
        },
    )

    # Log context request
    try:
        AIContextRequest.objects.create(
            tenant_id=tenant_id,
            permit_id=permit_context.get('permit_id'),
            project_id=project_id,
            location=location,
            company_context=ctx.get('company', {}),
            project_context=ctx.get('project', {}),
            location_context=ctx.get('location', {}),
            combined_result=result,
            latency_ms=int((time.time() - t0) * 1000),
            source=result.get('source', 'gemini'),
        )
    except Exception:
        pass

    return Response(result)


# ─── Context Memory ────────────────────────────────────────────────────────────

@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def context_memory(request):
    tenant_id = get_tenant_id_for_filtering(request.user)

    if request.method == 'GET':
        memory_type = request.query_params.get('type')
        qs = AIContextMemory.objects.filter(tenant_id=tenant_id, is_active=True)
        if memory_type:
            qs = qs.filter(memory_type=memory_type)
        return Response([{
            'id': m.id,
            'memory_type': m.memory_type,
            'key': m.key,
            'content': m.content,
            'relevance_score': m.relevance_score,
            'usage_count': m.usage_count,
        } for m in qs.order_by('-relevance_score')[:50]])

    if request.method == 'POST':
        memory = AIContextMemory.objects.create(
            tenant_id=tenant_id,
            memory_type=request.data.get('memory_type', 'company_rule'),
            key=request.data.get('key', ''),
            content=request.data.get('content', ''),
            tags=request.data.get('tags', []),
            source='manual',
        )
        return Response({'id': memory.id, 'key': memory.key}, status=201)

    if request.method == 'DELETE':
        pk = request.query_params.get('id')
        if pk:
            AIContextMemory.objects.filter(pk=pk, tenant_id=tenant_id).update(is_active=False)
        return Response(status=204)


# ─── Vector Search ─────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vector_search(request):
    """Semantic search over tenant knowledge base."""
    tenant_id = get_tenant_id_for_filtering(request.user)
    query = request.data.get('query', '').strip()
    if not query:
        return Response({'error': 'query required'}, status=400)

    entity_types = request.data.get('entity_types')
    top_k = min(int(request.data.get('top_k', 5)), 20)

    from .vector_memory import semantic_search
    results = semantic_search(tenant_id, query, entity_types, top_k)
    return Response({'query': query, 'results': results, 'count': len(results)})


# ─── Index Document ────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def index_document(request):
    """Index a document into vector memory for semantic search."""
    tenant_id = get_tenant_id_for_filtering(request.user)
    title = request.data.get('title', '').strip()
    content = request.data.get('content', '').strip()
    doc_type = request.data.get('doc_type', 'sop')
    doc_id = request.data.get('doc_id', 0)
    tags = request.data.get('tags', [])

    if not content:
        return Response({'error': 'content required'}, status=400)

    from .vector_memory import index_knowledge_doc
    index_knowledge_doc(tenant_id, doc_id, title, content, doc_type, tags)
    return Response({'status': 'indexed', 'title': title, 'doc_type': doc_type})

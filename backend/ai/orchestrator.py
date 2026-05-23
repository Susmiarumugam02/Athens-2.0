"""
Athens AI Orchestrator — centralized AI routing, caching, context injection, retries.
Single entry point for ALL Gemini calls across the platform.
"""
import hashlib
import json
import logging
import time
from typing import Any

from django.core.cache import cache
from django.utils import timezone

from .gemini_service import gemini_json, gemini_generate, gemini_audio_json, is_available
from .models import AIActivityLog

logger = logging.getLogger('athens.ai')

# Cache TTLs (seconds)
_TTL = {
    'context': 3600,      # company/project/location profiles
    'analysis': 300,      # PTW analysis
    'translate': 86400,   # translations
    'search': 600,        # search results
    'brain': 1800,        # safety brain snapshots
    'copilot': 0,         # never cache copilot (conversational)
}


def _cache_key(prefix: str, tenant_id: int, payload: str) -> str:
    h = hashlib.sha256(payload.encode()).hexdigest()[:20]
    return f'athens_ai:{prefix}:t{tenant_id}:{h}'


def _quota_ok(tenant_id: int) -> bool:
    """Check per-tenant daily quota. Soft limit — never hard-blocks."""
    try:
        from .phase4_models import AIUsageQuota
        quota, _ = AIUsageQuota.objects.get_or_create(tenant_id=tenant_id)
        today = timezone.now().date()
        if quota.last_reset_day < today:
            quota.requests_day = 0
            quota.tokens_used_day = 0
            quota.is_throttled = False
        quota.requests_day += 1
        quota.save(update_fields=['requests_day', 'tokens_used_day', 'is_throttled', 'last_reset_day'])
        return not quota.is_throttled
    except Exception:
        return True


def _log_request(tenant_id: int, user, action: str, module: str,
                 latency_ms: int, used_gemini: bool, used_cache: bool,
                 success: bool, error: str = '') -> None:
    try:
        from .phase4_models import AIRequest
        AIRequest.objects.create(
            tenant_id=tenant_id, user=user, action=action, module=module,
            status='done' if success else 'failed',
            latency_ms=latency_ms, used_gemini=used_gemini,
            used_cache=used_cache, error=error[:500] if error else '',
        )
        AIActivityLog.objects.create(
            user=user, tenant_id=tenant_id, action=action, module=module,
            success=success, latency_ms=latency_ms, used_gemini=used_gemini,
        )
    except Exception:
        pass


def orchestrate(
    action: str,
    prompt: str,
    tenant_id: int,
    user=None,
    module: str = 'ai',
    cache_prefix: str = 'analysis',
    use_cache: bool = True,
    fallback: dict | None = None,
) -> dict:
    """
    Central AI orchestration call.
    1. Check quota
    2. Check cache
    3. Call Gemini with retry
    4. Log result
    5. Return structured JSON
    """
    t0 = time.time()
    used_cache_hit = False

    if not _quota_ok(tenant_id):
        logger.warning(f'[Orchestrator] Tenant {tenant_id} throttled')
        return fallback or {'error': 'AI quota exceeded', 'source': 'quota_limit'}

    cache_key = _cache_key(cache_prefix, tenant_id, prompt) if use_cache else None
    ttl = _TTL.get(cache_prefix, 300)

    if use_cache and ttl > 0 and cache_key:
        cached = cache.get(cache_key)
        if cached:
            used_cache_hit = True
            _log_request(tenant_id, user, action, module,
                         int((time.time() - t0) * 1000), False, True, True)
            return cached

    result = None
    if is_available():
        result = gemini_json(prompt, cache_prefix=cache_prefix, use_cache=False, fallback=None)

    if result is None:
        result = fallback or {'source': 'fallback'}
        success = False
        error = 'Gemini unavailable or returned empty'
    else:
        result.setdefault('source', 'gemini')
        success = True
        error = ''
        if use_cache and ttl > 0 and cache_key:
            cache.set(cache_key, result, ttl)

    latency = int((time.time() - t0) * 1000)
    _log_request(tenant_id, user, action, module, latency,
                 bool(result.get('source') == 'gemini'), used_cache_hit, success, error)
    return result


def orchestrate_audio(
    prompt: str,
    audio_bytes: bytes,
    mime_type: str,
    tenant_id: int,
    user=None,
    module: str = 'ptw',
) -> dict:
    """Audio-specific orchestration (voice assistant)."""
    t0 = time.time()
    if not is_available():
        return {'error': 'Gemini unavailable', 'source': 'fallback'}
    result = gemini_audio_json(prompt, audio_bytes=audio_bytes, mime_type=mime_type, fallback=None) or {}
    _log_request(tenant_id, user, 'voice_audio', module,
                 int((time.time() - t0) * 1000), True, False, bool(result))
    return result


def get_context_for_ptw(tenant_id: int, project_id: int | None,
                         location: str, permit_type: str) -> dict:
    """
    Retrieve cached company + project + location context for PTW enrichment.
    Returns merged context dict ready for prompt injection.
    """
    from .context_models import AICompanyProfile, AIProjectProfile, AILocationProfile, AIContextMemory

    ctx: dict[str, Any] = {}

    # Company context
    try:
        cp = AICompanyProfile.objects.get(tenant_id=tenant_id)
        ctx['company'] = {
            'industry': cp.industry, 'risk_category': cp.risk_category,
            'priority_hazards': cp.priority_hazards, 'company_rules': cp.company_rules,
            'safety_standards': cp.safety_standards, 'mandatory_ppe': cp.mandatory_ppe,
        }
    except AICompanyProfile.DoesNotExist:
        ctx['company'] = {}

    # Project context
    if project_id:
        try:
            pp = AIProjectProfile.objects.get(project_id=project_id)
            ctx['project'] = {
                'project_type': pp.project_type, 'phase': pp.phase,
                'risk_score': pp.risk_score, 'shutdown_active': pp.shutdown_active,
                'simultaneous_ops_risk': pp.simultaneous_ops_risk,
                'critical_activities': pp.critical_activities,
                'high_risk_zones': pp.high_risk_zones,
            }
        except AIProjectProfile.DoesNotExist:
            ctx['project'] = {}

    # Location context
    if location:
        loc = AILocationProfile.objects.filter(
            tenant_id=tenant_id, location_name__icontains=location[:50]
        ).first()
        if loc:
            ctx['location'] = {
                'location_name': loc.location_name,
                'zone_classification': loc.zone_classification,
                'risk_level': loc.risk_level,
                'auto_warnings': loc.auto_warnings,
                'gas_testing_required': loc.gas_testing_required,
                'hot_work_restricted': loc.hot_work_restricted,
                'nearby_hazards': loc.nearby_hazards,
            }
        else:
            ctx['location'] = {}

    # Memory snippets (top 5 most relevant)
    memories = AIContextMemory.objects.filter(
        tenant_id=tenant_id, is_active=True
    ).order_by('-relevance_score')[:5]
    ctx['memory_snippets'] = [m.content for m in memories]

    return ctx

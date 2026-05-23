"""
Athens AI — API Views
All AI endpoints. Gemini API key never leaves this layer.
"""
import time
import logging
import base64
from django.utils import timezone
from django.db.models import Count, Q
from django.db.models import F
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from rest_framework.response import Response
from rest_framework import status

from authentication.tenant_utils import get_tenant_id_for_filtering
from .gemini_service import MODEL_FLASH, MODEL_PRO, gemini_json, gemini_generate, gemini_audio_json, gemini_file_json, is_available
from .prompts import (
    ptw_analyze_prompt, ptw_validate_prompt, translate_to_english_prompt,
    chat_prompt, incident_analyze_prompt, inspection_assist_prompt,
    voice_audio_to_english_prompt,
    smart_autofill_prompt, safety_recommendations_prompt,
    workflow_guidance_prompt, hazard_prediction_prompt,
    incident_prediction_prompt, compliance_validation_prompt,
    image_safety_analysis_prompt, document_safety_analysis_prompt,
)
from .models import (
    AIConversation, AIMessage, AITranslation, AIVoiceLog, AISuggestion,
    AIHazardPattern, AIRecommendation, AIIncidentPrediction,
    AIComplianceCheck, AIMediaAnalysis, AIActivityLog,
)
# Rule-based fallback (works without API key)
from ptw.ai_service import analyze_work_description, validate_permit
from ptw.models import Permit

logger = logging.getLogger('athens.ai')


class AIRateThrottle(UserRateThrottle):
    rate = '60/min'


def _log(user, action, module='', input_summary='', success=True, latency_ms=None, used_gemini=False, tenant_id=None):
    try:
        AIActivityLog.objects.create(
            user=user, tenant_id=tenant_id, action=action, module=module,
            input_summary=input_summary[:500], success=success,
            latency_ms=latency_ms, used_gemini=used_gemini,
        )
    except Exception:
        pass  # Never let logging break the response


def _safe_list(value):
    if isinstance(value, list):
        return value
    if not value:
        return []
    return [str(value)]


def _contains_indic_text(text):
    return any(
        '\u0900' <= char <= '\u097f' or  # Devanagari
        '\u0b80' <= char <= '\u0bff'     # Tamil
        for char in text
    )


def _normalize_professional_english(text):
    text = (text or '').strip()
    if not text:
        return ''
    if text[-1] not in '.!?':
        text += '.'
    return text[0].upper() + text[1:] if text else text


def _detected_language_code(language_name):
    language = (language_name or 'Unknown').lower()
    if 'tamil' in language:
        return 'ta'
    if 'hindi' in language:
        return 'hi'
    if 'english' in language:
        return 'en'
    return 'auto'


def _remember_hazard_patterns(result, tenant_id, module='ptw', context=None):
    context = context or {}
    for hazard in _safe_list(result.get('hazards') or result.get('predicted_hazards')):
        if isinstance(hazard, dict):
            hazard_name = hazard.get('hazard')
        else:
            hazard_name = str(hazard)
        if not hazard_name:
            continue
        try:
            pattern, created = AIHazardPattern.objects.get_or_create(
                tenant_id=tenant_id,
                module=module,
                permit_type=str(context.get('permit_type') or context.get('permit_type_category') or '')[:100],
                location=str(context.get('location') or '')[:255],
                hazard=hazard_name[:255],
                defaults={
                    'work_nature': str(context.get('work_nature') or '')[:255],
                    'controls': _safe_list(result.get('controls') or result.get('critical_controls')),
                    'ppe': _safe_list(result.get('ppe_requirements') or result.get('ppe')),
                    'risk_level': (result.get('risk') or {}).get('level', '') if isinstance(result.get('risk'), dict) else '',
                    'source': result.get('source', 'ai'),
                }
            )
            if not created:
                pattern.occurrence_count = F('occurrence_count') + 1
                pattern.controls = _safe_list(result.get('controls') or result.get('critical_controls'))
                pattern.ppe = _safe_list(result.get('ppe_requirements') or result.get('ppe'))
                pattern.save(update_fields=['occurrence_count', 'controls', 'ppe', 'last_seen_at'])
        except Exception:
            logger.debug('[Athens AI] hazard pattern persistence skipped', exc_info=True)


def _permit_context(permit):
    if not permit:
        return {}
    return {
        'permit_id': permit.id,
        'permit_number': permit.permit_number,
        'permit_type': permit.permit_type.category if permit.permit_type else '',
        'permit_type_name': permit.permit_type.name if permit.permit_type else '',
        'description': permit.description,
        'location': permit.location,
        'work_nature': permit.work_nature,
        'status': permit.status,
        'probability': permit.probability,
        'severity': permit.severity,
        'risk_score': permit.risk_score,
        'risk_level': permit.risk_level,
        'hazards': permit.other_hazards,
        'control_measures': permit.control_measures,
        'ppe_requirements': permit.ppe_requirements,
        'safety_checklist': permit.safety_checklist,
        'requires_isolation': permit.requires_isolation,
        'planned_start_time': permit.planned_start_time.isoformat() if permit.planned_start_time else None,
        'planned_end_time': permit.planned_end_time.isoformat() if permit.planned_end_time else None,
    }


def _score_from_risk(permit):
    base = min(int((permit.risk_score or 1) * 4), 80)
    if permit.status in ('active', 'approved'):
        base += 5
    if permit.planned_end_time and timezone.now() > permit.planned_end_time and permit.status in ('active', 'approved'):
        base += 15
    return min(base, 100)


# ─── PTW AI Assist ─────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def ptw_assist(request):
    """
    Main PTW AI endpoint.
    Actions: analyze, validate, checklist, translate_voice, translate_voice_audio
    Uses Gemini when available, falls back to rule-based engine.
    """
    action = request.data.get('action', 'analyze')
    tenant_id = get_tenant_id_for_filtering(request.user)
    t0 = time.time()

    if action == 'analyze':
        description = request.data.get('description', '').strip()
        permit_type = request.data.get('permit_type_category', '')
        project = request.data.get('project', '')

        if not description:
            return Response({'error': 'description is required'}, status=400)

        used_gemini = False
        if is_available() and len(description) >= 10:
            result = gemini_json(
                ptw_analyze_prompt(description, permit_type, project),
                cache_prefix='ptw_analyze',
                fallback=None,
            )
            if result:
                used_gemini = True
                # Ensure required keys exist
                result.setdefault('detected_categories', [])
                result.setdefault('hazards', [])
                result.setdefault('controls', [])
                result.setdefault('ppe_requirements', [])
                result.setdefault('checklist', [])
                result.setdefault('permits_needed', [])
                result.setdefault('emergency_procedures', [])
                result.setdefault('toolbox_topics', [])
                result.setdefault('risk', {'probability': 2, 'severity': 2, 'score': 4, 'level': 'Low'})
                result['confidence'] = 'high'
                result['source'] = 'gemini'
            else:
                result = None

        if not result:
            # Rule-based fallback
            result = analyze_work_description(description, permit_type)
            result['source'] = 'rules'

        # Log suggestion
        try:
            AISuggestion.objects.create(
                user=request.user, tenant_id=tenant_id,
                suggestion_type='ptw', input_text=description[:500],
                suggestion_data=result,
            )
        except Exception:
            pass
        _remember_hazard_patterns(
            result, tenant_id, 'ptw',
            {'permit_type_category': permit_type, 'project': project, 'work_nature': description},
        )

        _log(request.user, 'ptw_analyze', 'ptw', description[:100],
             latency_ms=int((time.time() - t0) * 1000), used_gemini=used_gemini, tenant_id=tenant_id)
        return Response(result)

    elif action == 'validate':
        used_gemini = False
        result = None

        if is_available():
            permit_data = {
                'description': request.data.get('description', ''),
                'ppe_requirements': request.data.get('ppe_requirements', []),
                'checklist_count': len([v for v in (request.data.get('safety_checklist') or {}).values() if v]),
                'probability': request.data.get('probability', 1),
                'severity': request.data.get('severity', 1),
                'hazards': request.data.get('hazards', ''),
                'control_measures': request.data.get('control_measures', ''),
            }
            result = gemini_json(
                ptw_validate_prompt(permit_data),
                cache_prefix='ptw_validate',
                use_cache=False,  # validation should not be cached
                fallback=None,
            )
            if result:
                used_gemini = True

        if not result:
            result = validate_permit(request.data)

        _log(request.user, 'ptw_validate', 'ptw', '', latency_ms=int((time.time() - t0) * 1000),
             used_gemini=used_gemini, tenant_id=tenant_id)
        return Response(result)

    elif action == 'translate_voice':
        transcript = request.data.get('transcript', '').strip()
        lang = request.data.get('language', 'auto')
        module = request.data.get('module', 'ptw')
        field_name = request.data.get('field_name', '')

        if not transcript:
            return Response({'error': 'transcript is required'}, status=400)

        logger.info(f'[Voice Text] transcript="{transcript[:120]}" lang={lang} field={field_name}')

        used_gemini = False
        result = None

        if is_available():
            raw = gemini_json(
                translate_to_english_prompt(transcript, lang),
                cache_prefix='translate',
                fallback=None,
            ) or {}
            logger.info(f'[Voice Text] Gemini raw keys: {list(raw.keys())}')
            # Accept multiple key variants Gemini may return
            professional_text = (
                raw.get('professional_english')
                or raw.get('translated_english')
                or raw.get('translation')
                or raw.get('english_text')
                or ''
            )
            if raw and professional_text:
                used_gemini = True
                detected_language = raw.get('detected_language') or lang
                result = {
                    'original': transcript,
                    'professional_english': professional_text,
                    'detected_activities': raw.get('detected_activities', []),
                    'detected_language': detected_language,
                    'language': _detected_language_code(detected_language),
                    'conversion_note': f'Detected: {detected_language} → Converted to English',
                    'source': 'gemini',
                }
                logger.info(f'[Voice Text] Gemini success: "{professional_text[:100]}"')
                try:
                    AITranslation.objects.create(
                        user=request.user, tenant_id=tenant_id,
                        source_language=result['language'], original_text=transcript,
                        translated_text=professional_text,
                        module=module, field_name=field_name,
                    )
                    AIVoiceLog.objects.create(
                        user=request.user, tenant_id=tenant_id,
                        module=module, field_name=field_name,
                        source_language=result['language'], transcript=transcript,
                        professional_english=professional_text,
                    )
                except Exception:
                    pass
            else:
                logger.warning(f'[Voice Text] Gemini returned no usable text. raw={str(raw)[:200]}')

        if not result:
            # Always return something — never block the user
            # For Indic text: return as-is (frontend fallback handles it)
            # For English/romanized: normalize and return
            normalized = _normalize_professional_english(transcript)
            is_indic = _contains_indic_text(transcript)
            result = {
                'original': transcript,
                'professional_english': normalized,
                'detected_activities': [],
                'detected_language': 'Unknown' if is_indic else 'English',
                'language': 'auto' if is_indic else 'en',
                'conversion_note': 'AI conversion unavailable — raw transcript used',
                'source': 'fallback',
            }
            logger.info(f'[Voice Text] Fallback result: "{normalized[:100]}"')
            try:
                AIVoiceLog.objects.create(
                    user=request.user, tenant_id=tenant_id,
                    module=module, field_name=field_name,
                    source_language=result['language'], transcript=transcript,
                    professional_english=normalized,
                )
            except Exception:
                pass

        _log(request.user, 'translate_voice', 'ptw', transcript[:100],
             latency_ms=int((time.time() - t0) * 1000), used_gemini=used_gemini, tenant_id=tenant_id)
        return Response(result)

    elif action == 'translate_voice_audio':
        audio_base64 = request.data.get('audio_base64', '')
        mime_type = request.data.get('mime_type', 'audio/webm')
        module = request.data.get('module', 'ptw')
        field_name = request.data.get('field_name', '')

        if not audio_base64:
            return Response({'error': 'audio_base64 is required'}, status=400)
        if not is_available():
            return Response({'error': 'Gemini is required for multilingual voice conversion.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            if ',' in audio_base64:
                audio_base64 = audio_base64.split(',', 1)[1]
            audio_bytes = base64.b64decode(audio_base64)
        except Exception:
            return Response({'error': 'Invalid audio data'}, status=400)

        logger.info(f'[Voice] Audio bytes={len(audio_bytes)} mime={mime_type} field={field_name}')

        raw = gemini_audio_json(
            voice_audio_to_english_prompt(module, field_name),
            audio_bytes=audio_bytes,
            mime_type=mime_type,
            fallback=None,
        ) or {}

        logger.info(f'[Voice] Gemini raw keys: {list(raw.keys())}')

        # Accept all key variants Gemini may return
        professional = _normalize_professional_english(
            raw.get('translated_english')
            or raw.get('professional_english')
            or raw.get('translation')
            or raw.get('english_text')
            or ''
        )
        detected_language = raw.get('detected_language') or 'Unknown'
        original_transcript = raw.get('original_transcript') or raw.get('transcript') or ''

        logger.info(f'[Voice] professional="{professional}" lang={detected_language}')

        if not professional or _contains_indic_text(professional):
            logger.warning(f'[Voice] Invalid professional English. raw={str(raw)[:300]}')
            try:
                AIVoiceLog.objects.create(
                    user=request.user, tenant_id=tenant_id,
                    module=module, field_name=field_name,
                    source_language=_detected_language_code(detected_language),
                    transcript=original_transcript,
                    status='failed',
                    error_message=f'Gemini did not return valid professional English. raw={str(raw)[:200]}',
                )
            except Exception:
                pass
            return Response({'error': 'Voice could not be converted to professional English.'}, status=502)

        payload = {
            'original': original_transcript,
            'professional_english': professional,
            'detected_activities': raw.get('detected_activities', []),
            'safety_keywords': raw.get('safety_keywords', []),
            'detected_language': detected_language,
            'language': _detected_language_code(detected_language),
            'conversion_note': f'Detected: {detected_language} → Converted to English',
            'source': 'gemini',
        }

        try:
            AITranslation.objects.create(
                user=request.user, tenant_id=tenant_id,
                source_language=payload['language'],
                original_text=payload['original'],
                translated_text=professional,
                module=module,
                field_name=field_name,
            )
            AIVoiceLog.objects.create(
                user=request.user, tenant_id=tenant_id,
                module=module, field_name=field_name,
                source_language=payload['language'],
                transcript=payload['original'],
                professional_english=professional,
            )
        except Exception:
            pass

        _log(request.user, 'translate_voice_audio', module, payload['original'][:100],
             latency_ms=int((time.time() - t0) * 1000), used_gemini=True, tenant_id=tenant_id)
        return Response(payload)

    return Response({'error': f'Unknown action: {action}'}, status=400)


# ─── AI Chat ───────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def ai_chat(request):
    """
    Context-aware AI chat assistant.
    Maintains conversation history per session.
    """
    message = request.data.get('message', '').strip()
    module = request.data.get('module', 'general')
    project = request.data.get('project', '')
    conversation_id = request.data.get('conversation_id')
    tenant_id = get_tenant_id_for_filtering(request.user)
    t0 = time.time()

    if not message:
        return Response({'error': 'message is required'}, status=400)

    # Load or create conversation
    conversation = None
    history = []
    if conversation_id:
        try:
            conversation = AIConversation.objects.get(
                id=conversation_id, user=request.user
            )
            msgs = conversation.messages.order_by('-created_at')[:12]
            history = [{'role': m.role, 'content': m.content} for m in reversed(msgs)]
        except AIConversation.DoesNotExist:
            pass

    if not conversation:
        conversation = AIConversation.objects.create(
            user=request.user, tenant_id=tenant_id, module=module, project=project
        )

    # Save user message
    AIMessage.objects.create(conversation=conversation, role='user', content=message)

    # Generate response
    used_gemini = False
    reply = None

    if is_available():
        ctx = {
            'module': module,
            'role': getattr(request.user, 'user_type', 'user'),
            'project': project,
            'history': history,
        }
        reply = gemini_generate(
            chat_prompt(message, ctx),
            use_cache=False,  # chat responses should not be cached
            cache_prefix='chat',
        )
        if reply:
            used_gemini = True

    if not reply:
        reply = _fallback_chat(message, module)

    # Save AI response
    AIMessage.objects.create(conversation=conversation, role='assistant', content=reply)

    _log(request.user, 'ai_chat', module, message[:100],
         latency_ms=int((time.time() - t0) * 1000), used_gemini=used_gemini, tenant_id=tenant_id)

    return Response({
        'reply': reply,
        'conversation_id': conversation.id,
        'source': 'gemini' if used_gemini else 'fallback',
    })


def _fallback_chat(message: str, module: str) -> str:
    """Simple rule-based fallback when Gemini is unavailable."""
    msg = message.lower()
    if 'ptw' in msg or 'permit' in msg:
        return ('For Permit to Work: ensure hazard identification, PPE selection, '
                'risk assessment, and supervisor approval are complete before starting work.')
    if 'incident' in msg:
        return ('For incident reporting: secure the area, provide first aid, '
                'notify supervisor immediately, and document all details accurately.')
    if 'inspection' in msg:
        return ('For inspections: follow the checklist systematically, '
                'document findings with photos, and raise corrective actions promptly.')
    if 'ppe' in msg:
        return ('PPE selection depends on the hazard. Common requirements: '
                'helmet, safety boots, gloves, hi-vis vest. Add respirator, harness, '
                'or face shield based on specific hazards.')
    return ('I am Athens AI, your EHS assistant. I can help with PTW, incidents, '
            'inspections, safety observations, and general EHS guidance. '
            'Please configure GEMINI_API_KEY for full AI capabilities.')


# ─── Incident AI ───────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def incident_assist(request):
    """AI-powered incident investigation assistance."""
    description = request.data.get('description', '').strip()
    incident_type = request.data.get('incident_type', '')
    tenant_id = get_tenant_id_for_filtering(request.user)
    t0 = time.time()

    if not description:
        return Response({'error': 'description is required'}, status=400)

    used_gemini = False
    result = None

    if is_available():
        result = gemini_json(
            incident_analyze_prompt(description, incident_type),
            cache_prefix='incident',
            fallback=None,
        )
        if result:
            used_gemini = True
            result['source'] = 'gemini'

    if not result:
        result = {
            'immediate_actions': ['Secure the area', 'Provide first aid', 'Notify supervisor', 'Preserve evidence'],
            'root_causes': ['To be determined through investigation'],
            'contributing_factors': ['To be identified'],
            'corrective_actions': ['Conduct full investigation', 'Implement corrective measures'],
            'preventive_measures': ['Review safety procedures', 'Conduct toolbox talk'],
            'severity_assessment': 'Moderate',
            'investigation_questions': ['What happened?', 'When did it happen?', 'Who was involved?', 'What were the conditions?'],
            'regulatory_reporting': False,
            'source': 'fallback',
        }

    _log(request.user, 'incident_assist', 'incident', description[:100],
         latency_ms=int((time.time() - t0) * 1000), used_gemini=used_gemini, tenant_id=tenant_id)
    return Response(result)


# ─── Inspection AI ─────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def inspection_assist(request):
    """AI-powered inspection checklist generation."""
    area = request.data.get('area', '').strip()
    inspection_type = request.data.get('inspection_type', '')
    tenant_id = get_tenant_id_for_filtering(request.user)
    t0 = time.time()

    if not area:
        return Response({'error': 'area is required'}, status=400)

    used_gemini = False
    result = None

    if is_available():
        result = gemini_json(
            inspection_assist_prompt(area, inspection_type),
            cache_prefix='inspection',
            fallback=None,
        )
        if result:
            used_gemini = True
            result['source'] = 'gemini'

    if not result:
        result = {
            'checklist_items': [
                {'item': 'Check PPE availability and condition', 'category': 'PPE', 'critical': True},
                {'item': 'Inspect work area for hazards', 'category': 'Housekeeping', 'critical': True},
                {'item': 'Verify emergency equipment', 'category': 'Emergency', 'critical': True},
                {'item': 'Check tool and equipment condition', 'category': 'Equipment', 'critical': False},
                {'item': 'Confirm permits are in place', 'category': 'Documentation', 'critical': True},
            ],
            'common_findings': ['Missing PPE', 'Poor housekeeping', 'Blocked emergency exits'],
            'regulatory_references': ['ISO 45001', 'Local safety regulations'],
            'frequency': 'Daily',
            'source': 'fallback',
        }

    _log(request.user, 'inspection_assist', 'inspection', area[:100],
         latency_ms=int((time.time() - t0) * 1000), used_gemini=used_gemini, tenant_id=tenant_id)
    return Response(result)


# ─── Enterprise AI Engines ────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def translate_assist(request):
    """Dedicated Tamil/Hindi/English translation endpoint for all modules."""
    text = request.data.get('text', '').strip()
    language = request.data.get('language', 'auto')
    module = request.data.get('module', 'general')
    field_name = request.data.get('field_name', '')
    tenant_id = get_tenant_id_for_filtering(request.user)
    t0 = time.time()

    if not text:
        return Response({'error': 'text is required'}, status=400)

    used_gemini = False
    result = None
    if is_available():
        result = gemini_json(
            translate_to_english_prompt(text, language),
            cache_prefix='translate',
            fallback=None,
        )
        if result:
            used_gemini = True

    if not result and _contains_indic_text(text):
        return Response(
            {'error': 'Gemini is required to convert Tamil/Hindi text to English.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    professional = _normalize_professional_english((result or {}).get('professional_english') or text)
    payload = {
        'original': text,
        'professional_english': professional,
        'detected_activities': (result or {}).get('detected_activities', []),
        'safety_keywords': (result or {}).get('safety_keywords', []),
        'detected_language': (result or {}).get('detected_language') or language,
        'language': _detected_language_code((result or {}).get('detected_language') or language),
        'source': 'gemini' if used_gemini else 'fallback',
    }
    try:
        AITranslation.objects.create(
            user=request.user, tenant_id=tenant_id, source_language=language,
            original_text=text, translated_text=professional,
            module=module, field_name=field_name,
        )
    except Exception:
        pass
    _log(request.user, 'translate', module, text[:100], latency_ms=int((time.time() - t0) * 1000),
         used_gemini=used_gemini, tenant_id=tenant_id)
    return Response(payload)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def smart_autofill(request):
    """Generate PTW smart defaults from permit/project context."""
    tenant_id = get_tenant_id_for_filtering(request.user)
    t0 = time.time()
    context = {
        'permit_type': request.data.get('permit_type', ''),
        'location': request.data.get('location', ''),
        'contractor': request.data.get('contractor', ''),
        'department': request.data.get('department', ''),
        'project': request.data.get('project', ''),
        'work_nature': request.data.get('work_nature', ''),
        'description': request.data.get('description', ''),
    }
    used_gemini = False
    result = None

    if is_available():
        result = gemini_json(smart_autofill_prompt(context), cache_prefix='smart_autofill', fallback=None)
        if result:
            used_gemini = True

    if not result:
        analyzed = analyze_work_description(
            context.get('description') or context.get('work_nature') or context.get('permit_type'),
            context.get('permit_type'),
        )
        result = {
            'hazards': analyzed.get('hazards', []),
            'ppe_requirements': analyzed.get('ppe_requirements', []),
            'checklist': analyzed.get('checklist', []),
            'emergency_contacts': ['Area supervisor', 'EHS officer', 'Emergency response team'],
            'emergency_precautions': analyzed.get('emergency_procedures', []),
            'isolation_requirements': ['Apply LOTO where energy sources are present'] if 'electrical' in analyzed.get('detected_categories', []) else [],
            'gas_testing_requirements': ['O2, LEL, H2S and CO gas test before work'] if any(cat in analyzed.get('detected_categories', []) for cat in ['hot_work', 'confined_space']) else [],
            'risk_controls': analyzed.get('controls', []),
            'toolbox_talks': analyzed.get('toolbox_topics', []),
            'required_documents': analyzed.get('permits_needed', []),
            'work_procedures': ['Brief workforce', 'Verify controls', 'Obtain approval', 'Monitor work execution'],
            'work_nature': context.get('work_nature') or 'day',
            'permit_category': (analyzed.get('detected_categories') or ['general'])[0],
            'source': 'rules',
        }
    else:
        result['source'] = 'gemini'
        result.setdefault('hazards', [])
        result.setdefault('ppe_requirements', [])
        result.setdefault('checklist', [])
        result.setdefault('emergency_contacts', [])
        result.setdefault('emergency_precautions', [])
        result.setdefault('isolation_requirements', [])
        result.setdefault('gas_testing_requirements', [])
        result.setdefault('risk_controls', [])
        result.setdefault('toolbox_talks', [])
        result.setdefault('required_documents', [])
        result.setdefault('work_procedures', [])
        result.setdefault('work_nature', context.get('work_nature') or 'day')
        result.setdefault('permit_category', context.get('permit_type') or 'general')

    try:
        AISuggestion.objects.create(
            user=request.user, tenant_id=tenant_id, suggestion_type='ptw',
            input_text=str(context)[:500], suggestion_data=result,
        )
    except Exception:
        pass
    _remember_hazard_patterns(result, tenant_id, 'ptw', context)
    _log(request.user, 'smart_autofill', 'ptw', str(context)[:100],
         latency_ms=int((time.time() - t0) * 1000), used_gemini=used_gemini, tenant_id=tenant_id)
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def safety_recommendations(request):
    """AI safety engine for PPE, controls, isolation, rescue, and gas testing."""
    tenant_id = get_tenant_id_for_filtering(request.user)
    t0 = time.time()
    context = request.data if isinstance(request.data, dict) else {}
    module = context.get('module', 'general')
    used_gemini = False
    result = None

    if is_available():
        result = gemini_json(safety_recommendations_prompt(context), cache_prefix='safety_recommendations', fallback=None)
        if result:
            used_gemini = True

    if not result:
        analyzed = analyze_work_description(context.get('description', ''), context.get('permit_type', ''))
        result = {
            'ppe': analyzed.get('ppe_requirements', []),
            'controls': analyzed.get('controls', []),
            'precautions': analyzed.get('checklist', []),
            'isolation_steps': ['Identify energy sources', 'Apply LOTO', 'Verify zero energy'],
            'fire_watch': {'required': 'hot_work' in analyzed.get('detected_categories', []), 'reason': 'Required for hot work or ignition sources'},
            'standby_personnel': ['Supervisor', 'EHS representative'],
            'barricading': ['Barricade work area and restrict unauthorized access'],
            'rescue_plan': ['Confirm emergency response and rescue equipment before work'],
            'gas_testing': ['Perform gas testing when hot work, confined space, or gas release risk exists'],
            'source': 'rules',
        }
    else:
        result['source'] = 'gemini'

    try:
        AIRecommendation.objects.create(
            user=request.user, tenant_id=tenant_id, module=module,
            recommendation_type='control', context=context, recommendations=result,
            source=result['source'],
        )
    except Exception:
        pass
    _log(request.user, 'safety_recommendations', module, str(context)[:100],
         latency_ms=int((time.time() - t0) * 1000), used_gemini=used_gemini, tenant_id=tenant_id)
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def workflow_guidance(request):
    """Context-aware module workflow guidance."""
    tenant_id = get_tenant_id_for_filtering(request.user)
    t0 = time.time()
    context = dict(request.data)
    context['role'] = context.get('role') or getattr(request.user, 'user_type', 'user')
    module = context.get('module', 'general')
    used_gemini = False
    result = None

    if is_available():
        result = gemini_json(workflow_guidance_prompt(context), cache_prefix='workflow_guidance', fallback=None)
        if result:
            used_gemini = True

    if not result:
        result = {
            'next_steps': ['Complete required fields', 'Review risks and controls', 'Submit for approval'],
            'required_inputs': ['Work description', 'Hazards', 'Controls', 'PPE', 'Approver'],
            'approval_guidance': ['Route to the responsible supervisor and EHS approver'],
            'risk_checks': ['Verify risk score and mandatory controls before submission'],
            'warnings': [],
            'source': 'fallback',
        }
    else:
        result['source'] = 'gemini'

    _log(request.user, 'workflow_guidance', module, str(context)[:100],
         latency_ms=int((time.time() - t0) * 1000), used_gemini=used_gemini, tenant_id=tenant_id)
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def hazard_prediction(request):
    """Predict likely hazards from current work/project context."""
    tenant_id = get_tenant_id_for_filtering(request.user)
    t0 = time.time()
    context = request.data if isinstance(request.data, dict) else {}
    used_gemini = False
    result = None

    if is_available():
        result = gemini_json(hazard_prediction_prompt(context), cache_prefix='hazard_prediction', fallback=None)
        if result:
            used_gemini = True

    if not result:
        analyzed = analyze_work_description(context.get('description', ''), context.get('permit_type', ''))
        result = {
            'predicted_hazards': [{'hazard': h, 'likelihood': 'Medium', 'reason': 'Matched work activity pattern'} for h in analyzed.get('hazards', [])],
            'critical_controls': analyzed.get('controls', []),
            'early_warning_indicators': ['Unexpected change in work conditions', 'Missing controls', 'Unauthorized access'],
            'recommended_monitoring': ['Supervisor field verification', 'EHS spot check', 'Permit condition review'],
            'source': 'rules',
        }
    else:
        result['source'] = 'gemini'

    _remember_hazard_patterns({'predicted_hazards': result.get('predicted_hazards', []), 'critical_controls': result.get('critical_controls', []), 'source': result['source']}, tenant_id, 'ptw', context)
    _log(request.user, 'hazard_prediction', context.get('module', 'ptw'), str(context)[:100],
         latency_ms=int((time.time() - t0) * 1000), used_gemini=used_gemini, tenant_id=tenant_id)
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def incident_prediction(request):
    """Predict incidents, near misses, and escalation signals for PTW."""
    tenant_id = get_tenant_id_for_filtering(request.user)
    t0 = time.time()
    permit = None
    permit_id = request.data.get('permit_id')
    if permit_id:
        try:
            permit = Permit.objects.select_related('permit_type', 'project').get(id=permit_id)
        except Permit.DoesNotExist:
            return Response({'error': 'permit not found'}, status=404)

    context = {**_permit_context(permit), **dict(request.data)}
    used_gemini = False
    result = None
    if is_available():
        result = gemini_json(incident_prediction_prompt(context), cache_prefix='incident_prediction', fallback=None)
        if result:
            used_gemini = True

    if not result:
        risk_score = _score_from_risk(permit) if permit else 35
        level = 'Critical' if risk_score >= 80 else 'High' if risk_score >= 60 else 'Medium' if risk_score >= 35 else 'Low'
        analyzed = analyze_work_description(context.get('description', ''), context.get('permit_type', ''))
        result = {
            'incident_probability_score': risk_score,
            'severity_prediction': level,
            'possible_incidents': analyzed.get('hazards', [])[:6],
            'near_misses': ['Dropped object', 'Unauthorized entry', 'Control bypass'],
            'unsafe_conditions': analyzed.get('controls', [])[:4],
            'risk_escalation_triggers': ['Work exceeds approved time', 'Controls not verified', 'Weather or site condition changes'],
            'recommendations': analyzed.get('checklist', [])[:8],
            'confidence': 70 if permit else 45,
            'warning_level': 'critical' if risk_score >= 80 else 'warning' if risk_score >= 60 else 'watch',
            'source': 'rules',
        }
    else:
        result['source'] = 'gemini'

    try:
        AIIncidentPrediction.objects.create(
            user=request.user, tenant_id=tenant_id, permit_id=permit.id if permit else None,
            context=context, prediction=result,
            probability_score=int(result.get('incident_probability_score') or 0),
            severity_prediction=result.get('severity_prediction', ''),
            source=result['source'],
        )
    except Exception:
        pass
    _log(request.user, 'incident_prediction', 'ptw', str(context)[:100],
         latency_ms=int((time.time() - t0) * 1000), used_gemini=used_gemini, tenant_id=tenant_id)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def live_monitoring(request):
    """Live PTW monitoring snapshot for dashboards and supervisors."""
    project = getattr(request.user, 'project', None)
    qs = Permit.objects.select_related('permit_type')
    if project:
        qs = qs.filter(project=project)
    now = timezone.now()
    active = qs.filter(status__in=['approved', 'active', 'suspended'])
    high_risk = active.filter(Q(risk_level__in=['high', 'extreme']) | Q(risk_score__gte=10))
    expired = active.filter(planned_end_time__lt=now)
    pending = qs.filter(status__in=['submitted', 'under_review', 'pending_verification', 'pending_approval'])
    expiring_soon = active.filter(planned_end_time__gte=now, planned_end_time__lte=now + timezone.timedelta(hours=2))

    def item(permit):
        return {
            'id': permit.id,
            'permit_number': permit.permit_number,
            'status': permit.status,
            'risk_level': permit.risk_level,
            'location': permit.location,
            'permit_type': permit.permit_type.name if permit.permit_type else '',
            'planned_end_time': permit.planned_end_time,
            'alert': 'expired' if permit.planned_end_time < now else 'high_risk' if permit.risk_score >= 10 else 'watch',
        }

    return Response({
        'as_of': now,
        'counts': {
            'active': active.count(),
            'expired': expired.count(),
            'pending_approvals': pending.count(),
            'high_risk': high_risk.count(),
            'expiring_soon': expiring_soon.count(),
        },
        'alerts': [item(p) for p in list(expired[:10]) + list(high_risk.exclude(id__in=expired.values('id'))[:10])],
        'expiring_soon': [item(p) for p in expiring_soon[:10]],
        'source': 'live-query',
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def compliance_validation(request):
    """AI compliance validation with deterministic blocking checks."""
    tenant_id = get_tenant_id_for_filtering(request.user)
    t0 = time.time()
    permit = None
    permit_id = request.data.get('permit_id')
    if permit_id:
        try:
            permit = Permit.objects.select_related('permit_type').prefetch_related('gas_readings').get(id=permit_id)
        except Permit.DoesNotExist:
            return Response({'error': 'permit not found'}, status=404)

    context = {**_permit_context(permit), **dict(request.data)}
    deterministic_violations = []
    if permit:
        if permit.permit_type.requires_gas_testing and not permit.gas_readings.filter(status='safe').exists():
            deterministic_violations.append({'code': 'GAS_TEST_REQUIRED', 'severity': 'High', 'message': 'Safe gas test is required.', 'correction': 'Record safe gas readings before approval.'})
        if (permit.permit_type.requires_isolation or permit.requires_isolation) and not permit.isolation_details.strip():
            deterministic_violations.append({'code': 'ISOLATION_REQUIRED', 'severity': 'High', 'message': 'Isolation details are missing.', 'correction': 'Add isolation details and verify LOTO.'})
        if permit.permit_type.mandatory_ppe:
            current = {str(p).lower() for p in (permit.ppe_requirements or [])}
            missing = [p for p in permit.permit_type.mandatory_ppe if str(p).lower() not in current]
            if missing:
                deterministic_violations.append({'code': 'PPE_MISSING', 'severity': 'Medium', 'message': f'Missing mandatory PPE: {", ".join(missing)}', 'correction': 'Add mandatory PPE to permit.'})

    used_gemini = False
    result = None
    if is_available():
        result = gemini_json(compliance_validation_prompt(context), cache_prefix='compliance_validation', fallback=None)
        if result:
            used_gemini = True

    if not result:
        score = max(0, 100 - len(deterministic_violations) * 20)
        result = {
            'compliance_score': score,
            'blocking': any(v['severity'] in ('High', 'Critical') for v in deterministic_violations),
            'violations': deterministic_violations,
            'missing_requirements': [v['message'] for v in deterministic_violations],
            'recommended_corrections': [v['correction'] for v in deterministic_violations],
            'audit_notes': ['Deterministic PTW dependency validation completed.'],
            'standards': ['Internal PTW rules', 'ISO 45001-aligned controls'],
            'source': 'rules',
        }
    else:
        result['violations'] = deterministic_violations + result.get('violations', [])
        result['blocking'] = bool(result.get('blocking')) or any(v['severity'] in ('High', 'Critical') for v in deterministic_violations)
        result.setdefault('compliance_score', max(0, 100 - len(result['violations']) * 12))
        result['source'] = 'gemini'

    try:
        AIComplianceCheck.objects.create(
            user=request.user, tenant_id=tenant_id, permit_id=permit.id if permit else None,
            context=context, result=result,
            compliance_score=int(result.get('compliance_score') or 0),
            blocking=bool(result.get('blocking')),
            source=result['source'],
        )
    except Exception:
        pass
    _log(request.user, 'compliance_validation', 'ptw', str(context)[:100],
         latency_ms=int((time.time() - t0) * 1000), used_gemini=used_gemini, tenant_id=tenant_id)
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def worker_validation(request):
    """Validate PTW worker assignment readiness from existing worker assignment fields."""
    permit_id = request.data.get('permit_id')
    if not permit_id:
        return Response({'error': 'permit_id is required'}, status=400)
    try:
        permit = Permit.objects.prefetch_related('assigned_workers__worker').get(id=permit_id)
    except Permit.DoesNotExist:
        return Response({'error': 'permit not found'}, status=404)

    issues = []
    workers = []
    for assignment in permit.assigned_workers.all():
        worker = assignment.worker
        worker_issues = []
        if not assignment.competency_verified:
            worker_issues.append('Competency not verified')
        if not assignment.training_valid:
            worker_issues.append('Training validity not confirmed')
        if not assignment.medical_clearance:
            worker_issues.append('Medical clearance not confirmed')
        if worker_issues:
            issues.append({'worker_id': worker.id, 'worker_name': str(worker), 'issues': worker_issues})
        workers.append({
            'assignment_id': assignment.id,
            'worker_id': worker.id,
            'worker_name': str(worker),
            'eligible': not worker_issues,
            'issues': worker_issues,
        })
    return Response({
        'eligible': len(issues) == 0,
        'blocking': len(issues) > 0,
        'workers': workers,
        'issues': issues,
        'recommended_actions': ['Verify competency, training validity, and medical clearance for blocked workers.'] if issues else [],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def image_analysis(request):
    """Analyze uploaded worksite image for PTW safety hazards."""
    tenant_id = get_tenant_id_for_filtering(request.user)
    upload = request.FILES.get('image')
    if not upload:
        return Response({'error': 'image is required'}, status=400)
    if not is_available():
        return Response({'error': 'Gemini is required for image safety analysis.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    context = {'permit_id': request.data.get('permit_id'), 'module': 'ptw', 'file_name': upload.name}
    result = gemini_file_json(
        image_safety_analysis_prompt(context),
        file_bytes=upload.read(),
        mime_type=upload.content_type or 'image/jpeg',
        fallback=None,
    )
    if not result:
        return Response({'error': 'Image could not be analyzed.'}, status=502)
    result.setdefault('overall_severity', 'Medium')
    try:
        AIMediaAnalysis.objects.create(
            user=request.user, tenant_id=tenant_id, permit_id=context.get('permit_id') or None,
            media_type='image', file_name=upload.name, mime_type=upload.content_type or '',
            analysis=result, severity=result.get('overall_severity', ''), source='gemini',
        )
    except Exception:
        pass
    return Response({**result, 'source': 'gemini'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def document_analysis(request):
    """Analyze PTW support documents for hazards and compliance gaps."""
    tenant_id = get_tenant_id_for_filtering(request.user)
    upload = request.FILES.get('document')
    if not upload:
        return Response({'error': 'document is required'}, status=400)
    if not is_available():
        return Response({'error': 'Gemini is required for document safety analysis.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    context = {'permit_id': request.data.get('permit_id'), 'module': 'ptw', 'file_name': upload.name}
    result = gemini_file_json(
        document_safety_analysis_prompt(context),
        file_bytes=upload.read(),
        mime_type=upload.content_type or 'application/pdf',
        fallback=None,
    )
    if not result:
        return Response({'error': 'Document could not be analyzed.'}, status=502)
    result.setdefault('overall_severity', 'Medium')
    try:
        AIMediaAnalysis.objects.create(
            user=request.user, tenant_id=tenant_id, permit_id=context.get('permit_id') or None,
            media_type='document', file_name=upload.name, mime_type=upload.content_type or '',
            analysis=result, severity=result.get('overall_severity', ''), source='gemini',
        )
    except Exception:
        pass
    return Response({**result, 'source': 'gemini'})


# ─── AI Copilot ───────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def ai_copilot(request):
    """
    Persistent AI safety copilot — role-aware, context-aware, multilingual.
    Maintains session per user with full conversation history.
    """
    from .phase5_models import AICopilotSession
    from .phase5_prompts import copilot_prompt
    from .orchestrator import orchestrate

    tenant_id = get_tenant_id_for_filtering(request.user)
    message = request.data.get('message', '').strip()
    module = request.data.get('module', 'general')
    language = request.data.get('language', 'en')
    session_id = request.data.get('session_id')
    context = request.data.get('context', {})
    t0 = time.time()

    if not message:
        return Response({'error': 'message is required'}, status=400)

    # Load or create session
    session = None
    if session_id:
        try:
            session = AICopilotSession.objects.get(id=session_id, user=request.user)
        except AICopilotSession.DoesNotExist:
            pass

    if not session:
        session = AICopilotSession.objects.create(
            tenant_id=tenant_id,
            user=request.user,
            role=getattr(request.user, 'user_type', 'user'),
            module=module,
            language=language,
            context=context,
        )

    # Build history from session messages
    history = session.messages[-12:] if session.messages else []

    # Add user message to history
    import hashlib as _hashlib
    from django.utils import timezone as _tz
    user_entry = {'role': 'user', 'content': message, 'ts': _tz.now().isoformat()}
    session.messages = (session.messages or []) + [user_entry]

    # Generate response
    role = getattr(request.user, 'user_type', 'user')
    ctx = {**context, 'module': module, 'role': role}
    result = orchestrate(
        action='copilot_chat',
        prompt=copilot_prompt(message, ctx, history, role),
        tenant_id=tenant_id,
        user=request.user,
        module=module,
        cache_prefix='copilot',
        use_cache=False,
        fallback=None,
    )

    # Extract reply — copilot returns plain text, not JSON
    if isinstance(result, dict):
        reply = result.get('reply') or result.get('response') or result.get('ai_summary') or str(result)
    else:
        reply = str(result) if result else _fallback_chat(message, module)

    if not reply or reply == '{}':
        reply = _fallback_chat(message, module)

    # Save AI response to session
    ai_entry = {'role': 'assistant', 'content': reply, 'ts': _tz.now().isoformat()}
    session.messages = session.messages + [ai_entry]
    session.save(update_fields=['messages', 'updated_at'])

    _log(request.user, 'copilot_chat', module, message[:100],
         latency_ms=int((time.time() - t0) * 1000), used_gemini=True, tenant_id=tenant_id)

    return Response({
        'reply': reply,
        'session_id': session.id,
        'source': result.get('source', 'gemini') if isinstance(result, dict) else 'gemini',
    })


# ─── Executive Summary ─────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def executive_summary(request):
    """AI-generated executive safety summary (daily/weekly/monthly)."""
    from .phase4_models import AIExecutiveSummary
    from .phase4_prompts import executive_summary_prompt
    from .orchestrator import orchestrate

    tenant_id = get_tenant_id_for_filtering(request.user)

    if request.method == 'GET':
        period = request.query_params.get('period', 'weekly')
        summary = AIExecutiveSummary.objects.filter(
            tenant_id=tenant_id, period=period
        ).order_by('-generated_at').first()
        if not summary:
            return Response({'message': 'No summary yet. POST to generate.'}, status=404)
        return Response({
            'period': summary.period,
            'enterprise_score': summary.enterprise_score,
            'summary_text': summary.summary_text,
            'key_insights': summary.key_insights,
            'risk_predictions': summary.risk_predictions,
            'strategic_recommendations': summary.strategic_recommendations,
            'module_kpis': summary.module_kpis,
            'generated_at': summary.generated_at.isoformat(),
        })

    # Generate new summary
    period = request.data.get('period', 'weekly')
    kpi_data = {
        'period': period,
        'enterprise_score': request.data.get('enterprise_score', 75),
        'active_permits': request.data.get('active_permits', 0),
        'open_incidents': request.data.get('open_incidents', 0),
        'overdue_actions': request.data.get('overdue_actions', 0),
        'training_compliance': request.data.get('training_compliance', 100),
        'high_risk_contractors': request.data.get('high_risk_contractors', 0),
        'audit_score': request.data.get('audit_score', 75),
    }

    # Auto-collect from DB if not provided
    try:
        from ptw.models import Permit
        kpi_data['active_permits'] = kpi_data['active_permits'] or Permit.objects.filter(
            status__in=['active', 'approved']
        ).count()
    except Exception:
        pass

    result = orchestrate(
        action='executive_summary',
        prompt=executive_summary_prompt(kpi_data),
        tenant_id=tenant_id,
        user=request.user,
        module='executive',
        cache_prefix='brain',
        use_cache=False,
        fallback={
            'summary_text': 'Executive summary generation requires Gemini AI configuration.',
            'key_insights': ['Configure GEMINI_API_KEY for AI-powered insights'],
            'risk_predictions': [],
            'strategic_recommendations': ['Review active permits and open incidents'],
            'positive_trends': [],
            'concern_areas': [],
        },
    )

    summary = AIExecutiveSummary.objects.create(
        tenant_id=tenant_id,
        period=period,
        enterprise_score=float(kpi_data.get('enterprise_score', 75)),
        summary_text=result.get('summary_text', ''),
        key_insights=result.get('key_insights', []),
        risk_predictions=result.get('risk_predictions', []),
        strategic_recommendations=result.get('strategic_recommendations', []),
        module_kpis=kpi_data,
    )
    return Response({
        'period': summary.period,
        'enterprise_score': summary.enterprise_score,
        'summary_text': summary.summary_text,
        'key_insights': summary.key_insights,
        'risk_predictions': summary.risk_predictions,
        'strategic_recommendations': summary.strategic_recommendations,
        'generated_at': summary.generated_at.isoformat(),
        'source': result.get('source', 'gemini'),
    }, status=201)


# ─── Agent Management ──────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def agent_management(request):
    """List agents or dispatch a specific agent."""
    from .phase5_models import AIAgent, AIAgentAction
    from .agents import dispatch_agent

    tenant_id = get_tenant_id_for_filtering(request.user)

    if request.method == 'GET':
        agents = AIAgent.objects.filter(tenant_id=tenant_id)
        return Response([{
            'id': a.id,
            'agent_type': a.agent_type,
            'name': a.name,
            'status': a.status,
            'run_count': a.run_count,
            'error_count': a.error_count,
            'last_run': a.last_run.isoformat() if a.last_run else None,
            'is_active': a.is_active,
        } for a in agents])

    # Dispatch agent
    agent_type = request.data.get('agent_type', 'ptw')
    payload = request.data.get('payload', {})
    result = dispatch_agent(tenant_id, agent_type, payload)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agent_actions(request):
    """List pending AI agent actions for the current tenant."""
    from .phase5_models import AIAgentAction
    tenant_id = get_tenant_id_for_filtering(request.user)
    status_filter = request.query_params.get('status', 'pending')
    qs = AIAgentAction.objects.filter(tenant_id=tenant_id)
    if status_filter:
        qs = qs.filter(status=status_filter)
    qs = qs.order_by('-created_at')[:50]
    return Response([{
        'id': a.id,
        'action_type': a.action_type,
        'title': a.title,
        'description': a.description,
        'severity': a.severity,
        'entity_type': a.entity_type,
        'entity_id': a.entity_id,
        'status': a.status,
        'created_at': a.created_at.isoformat(),
    } for a in qs])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dismiss_agent_action(request, action_id):
    """Dismiss or apply an AI agent action."""
    from .phase5_models import AIAgentAction
    tenant_id = get_tenant_id_for_filtering(request.user)
    new_status = request.data.get('status', 'dismissed')
    if new_status not in ('applied', 'dismissed'):
        return Response({'error': 'status must be applied or dismissed'}, status=400)
    updated = AIAgentAction.objects.filter(
        id=action_id, tenant_id=tenant_id
    ).update(status=new_status, applied_by=request.user)
    if not updated:
        return Response({'error': 'Not found'}, status=404)
    return Response({'status': new_status})


# ─── Knowledge Search (RAG) ────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AIRateThrottle])
def knowledge_search(request):
    """RAG-powered knowledge search with AI-synthesized answer."""
    from .vector_memory import semantic_search, retrieve_context_for_prompt
    from .phase5_prompts import knowledge_search_prompt
    from .orchestrator import orchestrate

    tenant_id = get_tenant_id_for_filtering(request.user)
    query = request.data.get('query', '').strip()
    if not query:
        return Response({'error': 'query is required'}, status=400)

    entity_types = request.data.get('entity_types')
    top_k = min(int(request.data.get('top_k', 5)), 20)
    t0 = time.time()

    # Semantic search
    chunks = semantic_search(tenant_id, query, entity_types, top_k)

    # AI synthesis if Gemini available
    ai_answer = None
    if is_available() and chunks:
        ctx = {
            'role': getattr(request.user, 'user_type', 'user'),
            'module': request.data.get('module', 'general'),
        }
        result = orchestrate(
            action='knowledge_search',
            prompt=knowledge_search_prompt(query, ctx, chunks),
            tenant_id=tenant_id,
            user=request.user,
            module='knowledge',
            cache_prefix='search',
            use_cache=True,
            fallback=None,
        )
        if result and isinstance(result, dict):
            ai_answer = result.get('answer') or result.get('response') or str(result)
        elif isinstance(result, str):
            ai_answer = result

    _log(request.user, 'knowledge_search', 'knowledge', query[:100],
         latency_ms=int((time.time() - t0) * 1000), used_gemini=bool(ai_answer), tenant_id=tenant_id)

    return Response({
        'query': query,
        'chunks': chunks,
        'ai_answer': ai_answer,
        'count': len(chunks),
        'source': 'gemini+vector' if ai_answer else 'vector',
    })


# ─── AI Activity Log ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_activity_log(request):
    """Return AI activity log for the current tenant."""
    tenant_id = get_tenant_id_for_filtering(request.user)
    qs = AIActivityLog.objects.filter(tenant_id=tenant_id).order_by('-created_at')[:100]
    return Response([{
        'id': a.id,
        'action': a.action,
        'module': a.module,
        'success': a.success,
        'latency_ms': a.latency_ms,
        'used_gemini': a.used_gemini,
        'created_at': a.created_at.isoformat(),
    } for a in qs])


# ─── Health & Status ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_health(request):
    """AI service health check."""
    available = is_available()
    return Response({
        'status': 'ok',
        'gemini_available': available,
        'model_flash': MODEL_FLASH if available else None,
        'model_pro': MODEL_PRO if available else None,
        'fallback_mode': not available,
        'message': 'Gemini AI active' if available else 'Running in fallback mode — set GEMINI_API_KEY to enable Gemini',
    })


# ─── Conversation History ──────────────────────────────────────────────────────

@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def conversation_history(request, conversation_id=None):
    """Get or delete conversation history."""
    if request.method == 'GET':
        if conversation_id:
            try:
                conv = AIConversation.objects.get(id=conversation_id, user=request.user)
                messages = conv.messages.order_by('created_at').values('role', 'content', 'created_at')
                return Response({'conversation_id': conv.id, 'messages': list(messages)})
            except AIConversation.DoesNotExist:
                return Response({'error': 'Not found'}, status=404)
        else:
            convs = AIConversation.objects.filter(user=request.user).order_by('-updated_at')[:20]
            return Response([{'id': c.id, 'module': c.module, 'updated_at': c.updated_at} for c in convs])

    elif request.method == 'DELETE':
        if conversation_id:
            AIConversation.objects.filter(id=conversation_id, user=request.user).delete()
        else:
            AIConversation.objects.filter(user=request.user).delete()
        return Response({'message': 'Deleted'})

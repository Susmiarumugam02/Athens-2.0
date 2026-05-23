"""
Athens AI Agents Runtime — event-driven autonomous agents.
Each agent runs as a lightweight function triggered by events or periodic tasks.
No Celery required — agents run synchronously on API calls and can be
queued via Django management commands or cron.
"""
import logging
import time
from django.utils import timezone

logger = logging.getLogger('athens.ai')


def _save_action(agent, tenant_id: int, action_type: str, title: str,
                 description: str, severity: str = 'medium',
                 entity_type: str = '', entity_id: int | None = None,
                 payload: dict | None = None) -> None:
    from .phase5_models import AIAgentAction
    AIAgentAction.objects.create(
        agent=agent, tenant_id=tenant_id,
        action_type=action_type, title=title,
        description=description, severity=severity,
        entity_type=entity_type, entity_id=entity_id,
        payload=payload or {},
    )


def _post_message(tenant_id: int, from_agent: str, to_agent: str,
                  event_type: str, payload: dict) -> None:
    from .phase5_models import AIAgentMessage
    AIAgentMessage.objects.create(
        tenant_id=tenant_id, from_agent=from_agent,
        to_agent=to_agent, event_type=event_type, payload=payload,
    )


def _get_or_create_agent(tenant_id: int, agent_type: str, name: str):
    from .phase5_models import AIAgent
    agent, _ = AIAgent.objects.get_or_create(
        tenant_id=tenant_id, agent_type=agent_type,
        defaults={'name': name, 'status': 'idle', 'is_active': True},
    )
    return agent


# ─── PTW Agent ─────────────────────────────────────────────────────────────────

def run_ptw_agent(tenant_id: int) -> dict:
    """
    Scans active permits for anomalies, conflicts, missing requirements.
    Returns summary of actions taken.
    """
    from ptw.models import Permit
    from .phase5_prompts import ptw_agent_prompt
    from .orchestrator import orchestrate

    agent = _get_or_create_agent(tenant_id, 'ptw', 'PTW Safety Agent')
    agent.status = 'running'
    agent.save(update_fields=['status'])
    actions_created = 0

    try:
        now = timezone.now()
        # Scope to tenant via project
        active_qs = Permit.objects.filter(
            status__in=['active', 'approved', 'submitted', 'under_review']
        ).select_related('permit_type', 'project')

        # Build data snapshot
        data = {
            'active_count': active_qs.count(),
            'high_risk_count': active_qs.filter(risk_level__in=['high', 'extreme']).count(),
            'expiring_soon': active_qs.filter(
                planned_end_time__lte=now + timezone.timedelta(hours=2),
                planned_end_time__gte=now,
            ).count(),
            'overdue_approvals': Permit.objects.filter(
                status='submitted',
                submitted_at__lte=now - timezone.timedelta(hours=4),
            ).count(),
            'missing_signatures': active_qs.filter(
                permit_type__requires_gas_testing=True,
                gas_readings__isnull=True,
            ).count(),
        }

        result = orchestrate(
            action='ptw_agent_scan',
            prompt=ptw_agent_prompt(data),
            tenant_id=tenant_id,
            module='ptw_agent',
            cache_prefix='analysis',
            use_cache=False,
            fallback={
                'anomalies': [],
                'conflicts': [],
                'recommendations': ['Review active permits for compliance'],
                'auto_actions': [],
                'agent_summary': f"Scanned {data['active_count']} active permits.",
            },
        )

        # Create agent actions for anomalies
        for anomaly in result.get('anomalies', [])[:10]:
            _save_action(
                agent, tenant_id, 'alert',
                f"PTW Anomaly: {anomaly.get('issue', 'Unknown')}",
                str(anomaly),
                severity=anomaly.get('severity', 'medium'),
                entity_type='permit',
                entity_id=anomaly.get('permit_id'),
            )
            actions_created += 1

        # Notify emergency agent of conflicts
        for conflict in result.get('conflicts', [])[:5]:
            _post_message(tenant_id, 'ptw', 'emergency',
                          'permit_conflict_detected', conflict)

        agent.last_result = result if isinstance(result, dict) else {}
        agent.run_count += 1
        agent.status = 'idle'
        agent.last_run = timezone.now()
        agent.save(update_fields=['last_result', 'run_count', 'status', 'last_run'])
        return {'status': 'ok', 'actions_created': actions_created, 'summary': result.get('agent_summary', '')}

    except Exception as e:
        logger.error(f'[PTWAgent] Error: {e}')
        agent.status = 'error'
        agent.error_count += 1
        agent.save(update_fields=['status', 'error_count'])
        return {'status': 'error', 'error': str(e)}


# ─── Incident Agent ────────────────────────────────────────────────────────────

def run_incident_agent(tenant_id: int) -> dict:
    from .phase5_prompts import incident_agent_prompt
    from .orchestrator import orchestrate

    agent = _get_or_create_agent(tenant_id, 'incident', 'Incident Intelligence Agent')
    agent.status = 'running'
    agent.save(update_fields=['status'])

    try:
        from incidentmanagement.models import Incident
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        qs = Incident.objects.filter(created_at__gte=thirty_days_ago)

        data = {
            'open_count': qs.filter(status__in=['open', 'under_investigation']).count(),
            'overdue_investigations': qs.filter(
                status='under_investigation',
                created_at__lte=timezone.now() - timezone.timedelta(days=7),
            ).count(),
            'repeat_locations': [],
            'repeat_contractors': [],
            'severity_dist': {},
            'unassigned': qs.filter(assigned_investigator__isnull=True).count(),
        }

        result = orchestrate(
            action='incident_agent_scan',
            prompt=incident_agent_prompt(data),
            tenant_id=tenant_id,
            module='incident_agent',
            cache_prefix='analysis',
            use_cache=False,
            fallback={
                'patterns': [], 'high_risk_locations': [],
                'high_risk_contractors': [], 'predictions': [],
                'recommendations': ['Review open incidents'], 'escalations': [],
            },
        )

        agent.last_result = result if isinstance(result, dict) else {}
        agent.run_count += 1
        agent.status = 'idle'
        agent.last_run = timezone.now()
        agent.save(update_fields=['last_result', 'run_count', 'status', 'last_run'])
        return {'status': 'ok', 'result': result}

    except Exception as e:
        logger.error(f'[IncidentAgent] Error: {e}')
        agent.status = 'error'
        agent.error_count += 1
        agent.save(update_fields=['status', 'error_count'])
        return {'status': 'error', 'error': str(e)}


# ─── Emergency Agent ───────────────────────────────────────────────────────────

def run_emergency_agent(tenant_id: int, event_data: dict) -> dict:
    from .phase5_prompts import emergency_agent_prompt
    from .orchestrator import orchestrate
    from .phase4_models import AIEmergencyEvent

    agent = _get_or_create_agent(tenant_id, 'emergency', 'Emergency Response Agent')

    result = orchestrate(
        action='emergency_response',
        prompt=emergency_agent_prompt(event_data),
        tenant_id=tenant_id,
        module='emergency_agent',
        cache_prefix='analysis',
        use_cache=False,
        fallback={
            'severity_classification': 'moderate',
            'immediate_actions': ['Evacuate area', 'Call emergency services', 'Notify supervisor'],
            'evacuation_required': True,
            'assembly_points': ['Main assembly point'],
            'emergency_contacts': ['Site Manager', 'EHS Officer', 'Emergency Services'],
            'broadcast_message': 'Emergency declared. Please evacuate to assembly point immediately.',
        },
    )

    # Persist emergency event
    AIEmergencyEvent.objects.create(
        tenant_id=tenant_id,
        project_id=event_data.get('project_id'),
        title=event_data.get('title', 'Emergency Event'),
        description=event_data.get('description', ''),
        severity=result.get('severity_classification', 'moderate'),
        ai_actions=result.get('immediate_actions', []),
        evacuation_plan=result.get('evacuation_plan', {}),
        assembly_points=result.get('assembly_points', []),
        emergency_contacts=result.get('emergency_contacts', []),
    )

    agent.last_result = result
    agent.run_count += 1
    agent.last_run = timezone.now()
    agent.save(update_fields=['last_result', 'run_count', 'last_run'])
    return result


# ─── Compliance Agent ──────────────────────────────────────────────────────────

def run_compliance_agent(tenant_id: int) -> dict:
    """Scan for compliance violations across active permits."""
    from ptw.models import Permit
    from .phase5_models import AIComplianceViolation
    from django.utils import timezone

    agent = _get_or_create_agent(tenant_id, 'compliance', 'Compliance Agent')
    violations_created = 0

    try:
        now = timezone.now()
        # Check for expired active permits
        expired = Permit.objects.filter(
            status='active', planned_end_time__lt=now
        )
        for permit in expired[:20]:
            AIComplianceViolation.objects.get_or_create(
                tenant_id=tenant_id,
                violation_code='PERMIT_EXPIRED',
                entity_type='permit',
                entity_id=permit.id,
                defaults={
                    'standard': 'Internal PTW Policy',
                    'description': f'Permit {permit.permit_number} is active but past planned end time.',
                    'severity': 'high',
                    'corrective_action': 'Close or extend the permit immediately.',
                },
            )
            violations_created += 1

        # Check permits missing required gas tests
        missing_gas = Permit.objects.filter(
            status__in=['active', 'approved'],
            permit_type__requires_gas_testing=True,
            gas_readings__isnull=True,
        ).distinct()
        for permit in missing_gas[:20]:
            AIComplianceViolation.objects.get_or_create(
                tenant_id=tenant_id,
                violation_code='GAS_TEST_MISSING',
                entity_type='permit',
                entity_id=permit.id,
                defaults={
                    'standard': 'PTW Gas Testing Requirement',
                    'description': f'Permit {permit.permit_number} requires gas testing but none recorded.',
                    'severity': 'critical',
                    'corrective_action': 'Conduct gas testing before work proceeds.',
                },
            )
            violations_created += 1

        agent.last_run = timezone.now()
        agent.run_count += 1
        agent.status = 'idle'
        agent.save(update_fields=['last_run', 'run_count', 'status'])
        return {'status': 'ok', 'violations_created': violations_created}

    except Exception as e:
        logger.error(f'[ComplianceAgent] Error: {e}')
        agent.status = 'error'
        agent.error_count += 1
        agent.save(update_fields=['status', 'error_count'])
        return {'status': 'error', 'error': str(e)}


# ─── Agent Dispatcher ──────────────────────────────────────────────────────────

def dispatch_agent(tenant_id: int, agent_type: str, payload: dict | None = None) -> dict:
    """Dispatch a specific agent by type."""
    payload = payload or {}
    dispatch_map = {
        'ptw': lambda: run_ptw_agent(tenant_id),
        'incident': lambda: run_incident_agent(tenant_id),
        'emergency': lambda: run_emergency_agent(tenant_id, payload),
        'compliance': lambda: run_compliance_agent(tenant_id),
    }
    fn = dispatch_map.get(agent_type)
    if not fn:
        return {'status': 'error', 'error': f'Unknown agent type: {agent_type}'}
    return fn()

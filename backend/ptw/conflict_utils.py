"""
Conflict resolution utilities for offline sync
"""
from django.utils import timezone
from .models import Permit, PermitIsolationPoint, PermitCloseout, AppliedOfflineChange
from .status_utils import normalize_permit_status


def check_idempotency(device_id, offline_id, entity):
    """Check if change already applied"""
    return AppliedOfflineChange.objects.filter(
        device_id=device_id,
        offline_id=offline_id,
        entity=entity
    ).first()


def record_applied_change(device_id, offline_id, entity, server_id):
    """Record applied change for idempotency"""
    AppliedOfflineChange.objects.get_or_create(
        device_id=device_id,
        offline_id=offline_id,
        entity=entity,
        defaults={'server_id': server_id}
    )


def detect_permit_conflicts(permit, client_data, client_version):
    """Detect conflicts in permit update"""
    if client_version is None:
        return {'reason': 'missing_client_version', 'fields': {}}
    
    if permit.version != client_version:
        conflicts = {}
        
        # Check scalar fields
        for field in ['title', 'description', 'location', 'control_measures']:
            if field in client_data:
                server_val = getattr(permit, field, '')
                client_val = client_data[field]
                if server_val != client_val:
                    conflicts[field] = {
                        'client': client_val,
                        'server': server_val,
                        'merge_hint': 'last_write_wins'
                    }
        
        # Check JSON set fields
        if 'ppe_requirements' in client_data:
            server_ppe = set(permit.ppe_requirements or [])
            client_ppe = set(client_data['ppe_requirements'] or [])
            if server_ppe != client_ppe:
                conflicts['ppe_requirements'] = {
                    'client': list(client_ppe),
                    'server': list(server_ppe),
                    'merge_hint': 'set_merge'
                }
        
        # Check safety checklist
        if 'safety_checklist' in client_data:
            server_check = permit.safety_checklist or {}
            client_check = client_data['safety_checklist'] or {}
            if server_check != client_check:
                conflicts['safety_checklist'] = {
                    'client': client_check,
                    'server': server_check,
                    'merge_hint': 'true_wins'
                }
        
        if conflicts:
            return {'reason': 'stale_version', 'fields': conflicts}
    
    return None


def merge_permit_fields(permit, client_data, merge_strategy='safe'):
    """Merge permit fields with conflict resolution"""
    if merge_strategy == 'set_merge':
        # Union merge for PPE requirements
        if 'ppe_requirements' in client_data:
            server_ppe = set(permit.ppe_requirements or [])
            client_ppe = set(client_data['ppe_requirements'] or [])
            permit.ppe_requirements = list(server_ppe | client_ppe)
    
    elif merge_strategy == 'true_wins':
        # For safety checklist, True wins
        if 'safety_checklist' in client_data:
            server_check = permit.safety_checklist or {}
            client_check = client_data['safety_checklist'] or {}
            merged = {}
            all_keys = set(server_check.keys()) | set(client_check.keys())
            for key in all_keys:
                merged[key] = server_check.get(key, False) or client_check.get(key, False)
            permit.safety_checklist = merged


def validate_status_transition(permit, new_status, user):
    """Validate status transition with compliance checks"""
    normalized_status = normalize_permit_status(new_status)
    if not permit.can_transition_to(normalized_status):
        return False, f"Invalid transition from {permit.status} to {normalized_status}"
    
    # Additional validation for specific transitions
    if normalized_status == 'completed':
        from .validators import validate_closeout_completion
        try:
            validate_closeout_completion(permit)
        except Exception as e:
            return False, str(e)
    
    return True, None


def detect_isolation_conflicts(isolation_point, client_data, client_version):
    """Detect conflicts in isolation point update"""
    if client_version is None:
        return {'reason': 'missing_client_version'}
    
    if isolation_point.version != client_version:
        # Check status progression
        status_order = ['assigned', 'isolated', 'verified', 'deisolated']
        try:
            server_idx = status_order.index(isolation_point.status)
            client_status = client_data.get('status', isolation_point.status)
            client_idx = status_order.index(client_status)
            
            if client_idx < server_idx:
                return {
                    'reason': 'stale_version',
                    'detail': f'Server already at {isolation_point.status}, cannot regress to {client_status}'
                }
        except ValueError:
            pass
        
        # Check lock_ids for merge
        if 'lock_ids' in client_data:
            server_locks = set(isolation_point.lock_ids or [])
            client_locks = set(client_data['lock_ids'] or [])
            if server_locks != client_locks:
                return {
                    'reason': 'stale_version',
                    'fields': {
                        'lock_ids': {
                            'client': list(client_locks),
                            'server': list(server_locks),
                            'merge_hint': 'set_merge'
                        }
                    }
                }
    
    return None


def merge_isolation_lock_ids(isolation_point, client_data):
    """Merge lock IDs using union"""
    if 'lock_ids' in client_data:
        server_locks = set(isolation_point.lock_ids or [])
        client_locks = set(client_data['lock_ids'] or [])
        isolation_point.lock_ids = list(server_locks | client_locks)


def detect_closeout_conflicts(closeout, client_data, client_version):
    """Detect conflicts in closeout update"""
    if client_version is None:
        return {'reason': 'missing_client_version'}
    
    if closeout.version != client_version:
        # Merge checklist with True wins
        if 'checklist' in client_data:
            server_check = closeout.checklist or {}
            client_check = client_data['checklist'] or {}
            if server_check != client_check:
                return {
                    'reason': 'stale_version',
                    'fields': {
                        'checklist': {
                            'client': client_check,
                            'server': server_check,
                            'merge_hint': 'true_wins'
                        }
                    }
                }
    
    return None


def merge_closeout_checklist(closeout, client_data):
    """Merge closeout checklist with True wins strategy"""
    if 'checklist' in client_data:
        server_check = closeout.checklist or {}
        client_check = client_data['checklist'] or {}
        merged = {}
        all_keys = set(server_check.keys()) | set(client_check.keys())
        for key in all_keys:
            server_item = server_check.get(key, {})
            client_item = client_check.get(key, {})
            # True wins for 'done' field
            merged[key] = {
                'done': server_item.get('done', False) or client_item.get('done', False),
                'comments': client_item.get('comments') or server_item.get('comments', ''),
            }
        closeout.checklist = merged


def get_server_state(entity, server_id, project=None):
    """Get minimal server state for conflict resolution"""
    if entity == 'permit':
        queryset = Permit.objects
        if project is not None:
            queryset = queryset.filter(project=project)
        permit = queryset.get(id=server_id)
        return {
            'id': permit.id,
            'version': permit.version,
            'status': permit.status,
            'title': permit.title,
            'description': permit.description,
            'location': permit.location,
            'ppe_requirements': permit.ppe_requirements,
            'safety_checklist': permit.safety_checklist,
            'updated_at': permit.updated_at.isoformat()
        }
    elif entity == 'isolation_point':
        queryset = PermitIsolationPoint.objects
        if project is not None:
            queryset = queryset.filter(permit__project=project)
        point = queryset.get(id=server_id)
        return {
            'id': point.id,
            'version': point.version,
            'status': point.status,
            'lock_ids': point.lock_ids,
            'updated_at': point.updated_at.isoformat()
        }
    elif entity == 'closeout':
        queryset = PermitCloseout.objects
        if project is not None:
            queryset = queryset.filter(permit__project=project)
        closeout = queryset.get(id=server_id)
        return {
            'id': closeout.id,
            'version': closeout.version,
            'checklist': closeout.checklist,
            'completed': closeout.completed,
            'updated_at': closeout.updated_at.isoformat()
        }
    return {}

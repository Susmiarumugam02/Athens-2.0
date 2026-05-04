import logging
import time
from functools import wraps
from django.utils import timezone

logger = logging.getLogger('ptw')


def log_ptw_event(event_name, **fields):
    """
    Log PTW event with structured fields.
    Avoids logging sensitive data (signatures, attachments, raw payloads).
    """
    safe_fields = {
        'event': event_name,
        'timestamp': timezone.now().isoformat(),
    }
    
    # Only include safe fields
    safe_keys = [
        'user_id', 'project_id', 'permit_id', 'endpoint', 'duration_ms',
        'status_code', 'outcome', 'conflict_count', 'applied_count',
        'rejected_count', 'permit_count', 'detailed', 'device_id',
        'error_type', 'export_type'
    ]
    
    for key in safe_keys:
        if key in fields:
            safe_fields[key] = fields[key]
    
    logger.info(f"PTW_EVENT: {event_name}", extra=safe_fields)


def time_endpoint(event_name):
    """Decorator to time endpoint execution and log results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.monotonic()
            outcome = 'success'
            status_code = 200
            extra_fields = {}
            
            try:
                result = func(*args, **kwargs)
                if hasattr(result, 'status_code'):
                    status_code = result.status_code
                    if status_code >= 400:
                        outcome = 'error'
                return result
            except Exception as e:
                outcome = 'exception'
                status_code = 500
                extra_fields['error_type'] = type(e).__name__
                raise
            finally:
                duration_ms = int((time.monotonic() - start_time) * 1000)
                
                # Extract request context if available
                request = args[0] if args and hasattr(args[0], 'user') else None
                if request:
                    extra_fields['user_id'] = getattr(request.user, 'id', None)
                    extra_fields['project_id'] = getattr(getattr(request.user, 'project', None), 'id', None)
                
                log_ptw_event(
                    event_name,
                    duration_ms=duration_ms,
                    outcome=outcome,
                    status_code=status_code,
                    **extra_fields
                )
        
        return wrapper
    return decorator


class PTWJobRun:
    """Lightweight in-memory job run tracker (can be persisted to DB if needed)"""
    _runs = {}
    
    @classmethod
    def record_run(cls, job_name, success=True, error=None, duration_ms=None):
        """Record job run"""
        cls._runs[job_name] = {
            'last_run_at': timezone.now().isoformat(),
            'last_success_at': timezone.now().isoformat() if success else cls._runs.get(job_name, {}).get('last_success_at'),
            'last_error': str(error) if error else None,
            'last_duration_ms': duration_ms,
            'success': success
        }
        
        log_ptw_event(
            f'job_{job_name}',
            outcome='success' if success else 'error',
            duration_ms=duration_ms,
            error_type=type(error).__name__ if error else None
        )
    
    @classmethod
    def get_runs(cls):
        """Get all job runs"""
        return cls._runs.copy()
    
    @classmethod
    def get_run(cls, job_name):
        """Get specific job run"""
        return cls._runs.get(job_name)

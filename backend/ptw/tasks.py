from celery import shared_task
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from .workflow_manager import workflow_manager
from .canonical_workflow_manager import canonical_workflow_manager
from .models import Permit, WorkflowStep, EscalationRule, WebhookDeliveryLog
from authentication.models_notification import Notification
from .notification_utils import create_ptw_notification
from .observability import PTWJobRun
from .webhook_dispatcher import send_webhook_request
import logging
import time

logger = logging.getLogger(__name__)


def _background_jobs_disabled() -> bool:
    return getattr(settings, 'DISABLE_BACKGROUND_JOBS', False)


def _skip_if_disabled(task_name: str) -> bool:
    if _background_jobs_disabled():
        logger.warning("Background jobs disabled; skipping %s", task_name)
        return True
    return False


@shared_task(autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, max_retries=3)
def check_expiring_permits():
    """
    Celery task to check for permits nearing expiration and send alerts
    Runs every 30 minutes
    """
    if _skip_if_disabled("check_expiring_permits"):
        return
    start_time = time.monotonic()
    try:
        workflow_manager.check_expiring_permits()
        logger.info("Expiring permits check completed successfully")
        duration_ms = int((time.monotonic() - start_time) * 1000)
        PTWJobRun.record_run('check_expiring_permits', success=True, duration_ms=duration_ms)
    except Exception as e:
        duration_ms = int((time.monotonic() - start_time) * 1000)
        PTWJobRun.record_run('check_expiring_permits', success=False, error=e, duration_ms=duration_ms)
        logger.error(f"Error checking expiring permits: {str(e)}")
        raise

@shared_task(autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, max_retries=3)
def check_overdue_workflow_tasks():
    """
    Celery task to check for overdue workflow tasks and send escalation notifications
    Runs every hour
    """
    if _skip_if_disabled("check_overdue_workflow_tasks"):
        return
    start_time = time.monotonic()
    if not getattr(settings, 'ESCALATIONS_ENABLED', False):
        logger.info("Escalations disabled, skipping check")
        return
    
    try:
        from authentication.models import CustomUser
        
        # Get active escalation rules
        active_rules = EscalationRule.objects.filter(is_active=True).select_related('permit_type')
        
        # Build a map of permit_type -> step_name -> time_limit
        escalation_map = {}
        for rule in active_rules:
            if rule.permit_type_id not in escalation_map:
                escalation_map[rule.permit_type_id] = {}
            escalation_map[rule.permit_type_id][rule.step_name] = {
                'time_limit_hours': rule.time_limit_hours,
                'escalate_to_role': rule.escalate_to_role
            }
        
        # Get overdue workflow steps
        overdue_steps = WorkflowStep.objects.filter(
            status='pending',
            workflow__permit__status__in=['submitted', 'under_review']
        ).select_related('workflow__permit__permit_type', 'assignee')
        
        escalated_count = 0
        
        for step in overdue_steps:
            permit = step.workflow.permit
            
            # Check if this step has an escalation rule
            permit_rules = escalation_map.get(permit.permit_type_id, {})
            step_rule = permit_rules.get(step.name)
            
            if not step_rule:
                # Use default 4 hour threshold if no rule
                time_limit = 4
            else:
                time_limit = step_rule['time_limit_hours']
            
            # Calculate how long step has been pending
            hours_pending = (timezone.now() - step.workflow.started_at).total_seconds() / 3600
            
            if hours_pending < time_limit:
                continue
            
            # Check if already escalated today
            dedupe_key = f"{step.id}_{timezone.now().strftime('%Y-%m-%d')}"
            existing = Notification.objects.filter(
                notification_type='ptw_overdue',
                data__step_id=step.id,
                data__dedupe_key=dedupe_key
            ).exists()
            
            if existing:
                continue
            
            # Send overdue notification to assignee
            if step.assignee:
                Notification.objects.create(
                    user=step.assignee,
                    title='Overdue PTW Task',
                    message=f'Permit {permit.permit_number} - {step.name} is overdue ({int(hours_pending)} hours)',
                    notification_type='ptw_overdue',
                    link=f'/dashboard/ptw/view/{permit.id}',
                    data={
                        'permit_id': permit.id,
                        'permit_number': permit.permit_number,
                        'step_id': step.id,
                        'step_name': step.name,
                        'overdue_hours': int(hours_pending),
                        'dedupe_key': dedupe_key
                    }
                )
                escalated_count += 1
            
            # Escalate to higher authority if severely overdue (2x time limit)
            if hours_pending >= (time_limit * 2):
                # Find project admins or higher grade users
                if permit.project:
                    from authentication.models import AdminUser
                    escalation_users = AdminUser.objects.filter(
                        project=permit.project,
                        grade__in=['a', 'b'],  # Grade A or B
                        is_active=True
                    ).select_related('user')
                    
                    for admin_user in escalation_users:
                        Notification.objects.create(
                            user=admin_user.user,
                            title='Escalated PTW Task',
                            message=f'Permit {permit.permit_number} - {step.name} is severely overdue ({int(hours_pending)} hours)',
                            notification_type='ptw_escalated',
                            link=f'/dashboard/ptw/view/{permit.id}',
                            data={
                                'permit_id': permit.id,
                                'permit_number': permit.permit_number,
                                'step_name': step.name,
                                'assignee': step.assignee.username if step.assignee else 'Unassigned',
                                'overdue_hours': int(hours_pending),
                                'dedupe_key': f"escalated_{dedupe_key}"
                            }
                        )
                        escalated_count += 1
        
        logger.info(f"Processed overdue workflow tasks, sent {escalated_count} notifications")
        duration_ms = int((time.monotonic() - start_time) * 1000)
        PTWJobRun.record_run('check_overdue_workflow_tasks', success=True, duration_ms=duration_ms)
        
    except Exception as e:
        duration_ms = int((time.monotonic() - start_time) * 1000)
        PTWJobRun.record_run('check_overdue_workflow_tasks', success=False, error=e, duration_ms=duration_ms)
        logger.error(f"Error checking overdue workflow tasks: {str(e)}", exc_info=True)
        raise

@shared_task(autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, max_retries=3)
def auto_expire_permits():
    """
    Celery task to automatically expire permits that have passed their end time
    Runs every hour
    """
    if _skip_if_disabled("auto_expire_permits"):
        return
    try:
        expired_permits = Permit.objects.filter(
            status='active',
            planned_end_time__lt=timezone.now()
        )
        
        for permit in expired_permits:
            canonical_workflow_manager.transition(
                permit=permit,
                new_status='expired',
                user=None,
                action='auto_expire',
                system=True
            )
            
            # Send expiration notification to creator using utility
            create_ptw_notification(
                user_id=permit.created_by_id,
                event_type='ptw_expired',
                permit=permit,
                extra_data={'expired_at': permit.planned_end_time.isoformat()}
            )
        
        logger.info(f"Auto-expired {expired_permits.count()} permits")
        
    except Exception as e:
        logger.error(f"Error auto-expiring permits: {str(e)}", exc_info=True)

@shared_task
def generate_daily_ptw_report():
    """
    Celery task to generate daily PTW summary report
    Runs daily at 6 AM
    """
    if _skip_if_disabled("generate_daily_ptw_report"):
        return
    try:
        from django.db.models import Count, Q
        from datetime import date
        
        today = date.today()
        
        # Get daily statistics
        stats = {
            'total_permits': Permit.objects.filter(created_at__date=today).count(),
            'active_permits': Permit.objects.filter(status='active').count(),
            'pending_verification': Permit.objects.filter(status='submitted').count(),
            'pending_approval': Permit.objects.filter(status='under_review').count(),
            'expired_permits': Permit.objects.filter(status='expired', planned_end_time__date=today).count(),
            'completed_permits': Permit.objects.filter(status='completed', actual_end_time__date=today).count(),
        }
        
        # Send summary to all project admins
        from authentication.models import AdminUser
        project_admins = AdminUser.objects.filter(
            grade='a',  # Grade A users
            is_active=True
        ).select_related('user')
        
        for admin in project_admins:
            if Notification:
                Notification.objects.create(
                    user=admin.user,
                    title='Daily PTW Summary',
                    message=f'Daily PTW report for {today.strftime("%B %d, %Y")}',
                    notification_type='ptw_daily_report',
                    data=stats
                )
        
        logger.info(f"Generated daily PTW report with stats: {stats}")
        
    except Exception as e:
        logger.error(f"Error generating daily PTW report: {str(e)}")

@shared_task
def cleanup_old_notifications():
    """
    Celery task to cleanup old PTW notifications
    Runs weekly
    """
    if _skip_if_disabled("cleanup_old_notifications"):
        return
    try:
        # Delete notifications older than 30 days
        old_notifications = Notification.objects.filter(
            notification_type__startswith='ptw_',
            created_at__lt=timezone.now() - timedelta(days=30)
        )

        count = old_notifications.count()
        old_notifications.delete()

        logger.info(f"Cleaned up {count} old PTW notifications")
        
    except Exception as e:
        logger.error(f"Error cleaning up old notifications: {str(e)}", exc_info=True)

@shared_task
def check_pending_closeout_and_isolation():
    """
    Celery task to check for permits with pending closeout or isolation
    Runs every 4 hours
    """
    if _skip_if_disabled("check_pending_closeout_and_isolation"):
        return
    try:
        from .models import PermitCloseout, PermitIsolationPoint
        
        # Check active permits that need closeout
        active_permits = Permit.objects.filter(
            status='active',
            planned_end_time__lt=timezone.now() + timedelta(hours=2)  # Ending within 2 hours
        ).select_related('permit_type')
        
        for permit in active_permits:
            # Check if closeout template exists and not completed
            try:
                closeout = permit.closeout
                if not closeout.completed and closeout.template:
                    # Notify about closeout requirement
                    from .notification_utils import notify_closeout_required
                    notify_closeout_required(permit)
            except PermitCloseout.DoesNotExist:
                pass
        
        # Check permits with unverified isolation points
        if getattr(settings, 'ESCALATIONS_ENABLED', False):
            permits_with_isolation = Permit.objects.filter(
                status__in=['under_review', 'approved'],
                permit_type__requires_structured_isolation=True
            ).prefetch_related('isolation_points')
            
            for permit in permits_with_isolation:
                pending_points = permit.isolation_points.filter(
                    required=True,
                    status__in=['assigned', 'isolated']
                )
                
                if pending_points.exists():
                    # Notify about pending isolation
                    from .notification_utils import notify_isolation_pending
                    notify_isolation_pending(permit, list(pending_points))
        
        logger.info("Completed check for pending closeout and isolation")
        
    except Exception as e:
        logger.error(f"Error checking pending closeout/isolation: {str(e)}", exc_info=True)


@shared_task(autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, max_retries=3)
def deliver_webhook_event(log_id):
    """Deliver webhook payload asynchronously."""
    if _skip_if_disabled("deliver_webhook_event"):
        return
    log = WebhookDeliveryLog.objects.select_related('webhook').get(id=log_id)
    if log.status == 'success':
        return
    send_webhook_request(log, log.webhook, log.payload, log.event, timeout=10)

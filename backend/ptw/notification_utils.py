"""
PTW Notification Utilities
Handles creation of notifications for PTW events with idempotency
"""
from django.utils import timezone
from django.conf import settings
from authentication.models_notification import Notification
from authentication.models import CustomUser
import hashlib
import logging

logger = logging.getLogger(__name__)

# PTW-specific notification types (extend existing types)
PTW_NOTIFICATION_TYPES = {
    'ptw_created': 'PTW Created',
    'ptw_submitted': 'PTW Submitted',
    'ptw_verification': 'PTW Verification Required',
    'ptw_approval': 'PTW Approval Required',
    'ptw_approved': 'PTW Approved',
    'ptw_rejected': 'PTW Rejected',
    'ptw_activated': 'PTW Activated',
    'ptw_completed': 'PTW Completed',
    'ptw_expired': 'PTW Expired',
    'ptw_expiring': 'PTW Expiring Soon',
    'ptw_closeout_required': 'PTW Closeout Required',
    'ptw_isolation_pending': 'PTW Isolation Pending',
    'ptw_escalated': 'PTW Task Escalated',
    'ptw_overdue': 'PTW Task Overdue',
}


def generate_dedupe_key(user_id, event_type, permit_id, extra=None):
    """Generate unique key for notification deduplication"""
    # Include date to allow same notification type per day
    date_str = timezone.now().strftime('%Y-%m-%d')
    key_parts = [str(user_id), event_type, str(permit_id), date_str]
    if extra:
        key_parts.append(str(extra))
    key_string = '|'.join(key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()


def create_ptw_notification(
    user_id,
    event_type,
    permit,
    message=None,
    extra_data=None,
    sender_id=None,
    dedupe_extra=None
):
    """
    Create a PTW notification with idempotency
    
    Args:
        user_id: Recipient user ID
        event_type: Type of event (e.g., 'ptw_verification')
        permit: Permit instance
        message: Custom message (optional, will generate default)
        extra_data: Additional data dict
        sender_id: Sender user ID (optional)
        dedupe_extra: Extra string for deduplication key (optional)
    
    Returns:
        Notification instance or None if duplicate
    """
    if not getattr(settings, 'NOTIFICATIONS_ENABLED', True):
        return None
    
    try:
        # Check for duplicate
        dedupe_key = generate_dedupe_key(user_id, event_type, permit.id, dedupe_extra)
        
        # Check if notification with this dedupe key exists today
        existing = Notification.objects.filter(
            user_id=user_id,
            notification_type=event_type,
            data__dedupe_key=dedupe_key,
            created_at__date=timezone.now().date()
        ).first()
        
        if existing:
            logger.debug(f"Skipping duplicate notification: {dedupe_key}")
            return None
        
        # Generate default message if not provided
        if not message:
            message = _generate_default_message(event_type, permit)
        
        # Prepare data
        data = {
            'permit_id': permit.id,
            'permit_number': permit.permit_number,
            'permit_type': permit.permit_type.name if permit.permit_type else 'Unknown',
            'dedupe_key': dedupe_key,
        }
        if extra_data:
            data.update(extra_data)
        
        # Create notification
        notification = Notification.objects.create(
            user_id=user_id,
            title=PTW_NOTIFICATION_TYPES.get(event_type, 'PTW Notification'),
            message=message,
            notification_type=event_type,
            data=data,
            link=f'/dashboard/ptw/view/{permit.id}',
            sender_id=sender_id
        )
        
        logger.info(f"Created PTW notification: {event_type} for user {user_id}, permit {permit.permit_number}")
        return notification
        
    except Exception as e:
        logger.error(f"Error creating PTW notification: {str(e)}")
        return None


def _generate_default_message(event_type, permit):
    """Generate default message based on event type"""
    messages = {
        'ptw_created': f'Permit {permit.permit_number} has been created',
        'ptw_submitted': f'Permit {permit.permit_number} has been submitted for review',
        'ptw_verification': f'Permit {permit.permit_number} requires your verification',
        'ptw_approval': f'Permit {permit.permit_number} requires your approval',
        'ptw_approved': f'Permit {permit.permit_number} has been approved',
        'ptw_rejected': f'Permit {permit.permit_number} has been rejected',
        'ptw_activated': f'Permit {permit.permit_number} is now active',
        'ptw_completed': f'Permit {permit.permit_number} has been completed',
        'ptw_expired': f'Permit {permit.permit_number} has expired',
        'ptw_expiring': f'Permit {permit.permit_number} is expiring soon',
        'ptw_closeout_required': f'Permit {permit.permit_number} requires closeout completion',
        'ptw_isolation_pending': f'Permit {permit.permit_number} has pending isolation verification',
        'ptw_escalated': f'Permit {permit.permit_number} task has been escalated',
        'ptw_overdue': f'Permit {permit.permit_number} task is overdue',
    }
    return messages.get(event_type, f'Update on permit {permit.permit_number}')


def notify_permit_created(permit):
    """Notify when permit is created"""
    # Notify creator
    create_ptw_notification(
        user_id=permit.created_by_id,
        event_type='ptw_created',
        permit=permit,
        sender_id=permit.created_by_id
    )


def notify_permit_submitted(permit):
    """Notify when permit is submitted for workflow"""
    # Notify creator
    create_ptw_notification(
        user_id=permit.created_by_id,
        event_type='ptw_submitted',
        permit=permit,
        sender_id=permit.created_by_id
    )


def notify_verifier_assigned(permit, verifier_id):
    """Notify when verifier is assigned"""
    create_ptw_notification(
        user_id=verifier_id,
        event_type='ptw_verification',
        permit=permit,
        extra_data={'action_required': True}
    )


def notify_approver_assigned(permit, approver_id):
    """Notify when approver is assigned"""
    create_ptw_notification(
        user_id=approver_id,
        event_type='ptw_approval',
        permit=permit,
        extra_data={'action_required': True}
    )


def notify_permit_approved(permit, approver_id):
    """Notify when permit is approved"""
    # Notify creator
    create_ptw_notification(
        user_id=permit.created_by_id,
        event_type='ptw_approved',
        permit=permit,
        sender_id=approver_id
    )
    
    # Notify verifier if exists
    if permit.verifier_id:
        create_ptw_notification(
            user_id=permit.verifier_id,
            event_type='ptw_approved',
            permit=permit,
            sender_id=approver_id
        )


def notify_permit_rejected(permit, rejector_id, reason=None):
    """Notify when permit is rejected"""
    message = f'Permit {permit.permit_number} has been rejected'
    if reason:
        message += f': {reason}'
    
    # Notify creator
    create_ptw_notification(
        user_id=permit.created_by_id,
        event_type='ptw_rejected',
        permit=permit,
        message=message,
        sender_id=rejector_id,
        extra_data={'reason': reason} if reason else None
    )


def notify_permit_activated(permit):
    """Notify when permit is activated"""
    # Notify creator and issuer
    for user_id in [permit.created_by_id, permit.issuer_id]:
        if user_id:
            create_ptw_notification(
                user_id=user_id,
                event_type='ptw_activated',
                permit=permit
            )


def notify_closeout_required(permit):
    """Notify when closeout is required"""
    # Notify creator, issuer, and area_incharge
    for user_id in [permit.created_by_id, permit.issuer_id, permit.area_incharge_id]:
        if user_id:
            create_ptw_notification(
                user_id=user_id,
                event_type='ptw_closeout_required',
                permit=permit,
                extra_data={'action_required': True}
            )


def notify_isolation_pending(permit, pending_points):
    """Notify when isolation points need verification"""
    # Notify creator and verifier
    message = f'Permit {permit.permit_number} has {len(pending_points)} isolation point(s) pending verification'
    
    for user_id in [permit.created_by_id, permit.verifier_id]:
        if user_id:
            create_ptw_notification(
                user_id=user_id,
                event_type='ptw_isolation_pending',
                permit=permit,
                message=message,
                extra_data={
                    'pending_count': len(pending_points),
                    'action_required': True
                }
            )

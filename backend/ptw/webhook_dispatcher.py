"""
Webhook dispatcher for PTW events
"""
import hmac
import hashlib
import json
import requests
from datetime import datetime
from django.utils import timezone
from django.db import models
from .models import WebhookEndpoint, WebhookDeliveryLog


def trigger_webhooks(event, permit, context=None):
    """
    Trigger webhooks for a given event
    
    Args:
        event: Event name (e.g., 'permit_approved')
        permit: Permit instance
        context: Additional context dict
    """
    webhooks = WebhookEndpoint.objects.filter(
        enabled=True,
        events__contains=[event]
    ).filter(
        models.Q(project=permit.project) | models.Q(project__isnull=True)
    )
    
    for webhook in webhooks:
        queue_webhook(webhook, event, permit, context)


def send_webhook(webhook, event, permit, context=None):
    """Send a single webhook synchronously."""
    payload = _build_payload(event, permit, context)
    dedupe_key = _build_dedupe_key(webhook.id, event, permit.id)
    
    if WebhookDeliveryLog.objects.filter(webhook=webhook, dedupe_key=dedupe_key).exists():
        return
    
    log = WebhookDeliveryLog.objects.create(
        webhook=webhook,
        event=event,
        permit_id=permit.id,
        dedupe_key=dedupe_key,
        payload=payload,
        status='pending'
    )
    
    send_webhook_request(log, webhook, payload, event, timeout=10)


def queue_webhook(webhook, event, permit, context=None):
    """Queue a webhook for async delivery with fallback to sync."""
    payload = _build_payload(event, permit, context)
    dedupe_key = _build_dedupe_key(webhook.id, event, permit.id)
    
    if WebhookDeliveryLog.objects.filter(webhook=webhook, dedupe_key=dedupe_key).exists():
        return
    
    log = WebhookDeliveryLog.objects.create(
        webhook=webhook,
        event=event,
        permit_id=permit.id,
        dedupe_key=dedupe_key,
        payload=payload,
        status='queued'
    )
    
    task = _get_delivery_task()
    if task is not None:
        task.delay(log.id)
        return
    
    send_webhook_request(log, webhook, payload, event, timeout=5)


def send_webhook_request(log, webhook, payload, event, timeout=10):
    """Send webhook request and update delivery log."""
    log.status = 'pending'
    log.save(update_fields=['status'])
    
    try:
        signature = sign_payload(payload, webhook.secret)
        response = requests.post(
            webhook.url,
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'X-Athens-Signature': f'sha256={signature}',
                'X-Athens-Event': event
            },
            timeout=timeout
        )
        
        log.response_code = response.status_code
        log.response_body = response.text[:1000]
        log.status = 'success' if 200 <= response.status_code < 300 else 'failed'
        log.save()
        
        webhook.last_sent_at = timezone.now()
        webhook.last_status_code = response.status_code
        if log.status == 'failed':
            webhook.last_error = f"HTTP {response.status_code}: {response.text[:200]}"
        else:
            webhook.last_error = ''
        webhook.save()
    except Exception as e:
        log.status = 'failed'
        log.error = str(e)
        log.retry_count = (log.retry_count or 0) + 1
        log.save()
        
        webhook.last_error = str(e)
        webhook.save()


def _get_delivery_task():
    try:
        from .tasks import deliver_webhook_event
        return deliver_webhook_event
    except Exception:
        return None


def _build_payload(event, permit, context=None):
    return {
        'event': event,
        'timestamp': timezone.now().isoformat(),
        'permit_id': permit.id,
        'permit_number': permit.permit_number,
        'project_id': permit.project_id,
        'data': {
            'status': permit.status,
            'permit_type': permit.permit_type.name if permit.permit_type else None,
            'location': permit.location,
            'risk_level': permit.permit_type.risk_level if permit.permit_type else None,
            **(context or {})
        }
    }


def _build_dedupe_key(webhook_id, event, permit_id):
    hour_bucket = timezone.now().strftime('%Y%m%d%H')
    return f"{webhook_id}:{event}:{permit_id}:{hour_bucket}"


def sign_payload(payload, secret):
    """Generate HMAC SHA256 signature"""
    message = json.dumps(payload, sort_keys=True).encode('utf-8')
    signature = hmac.new(
        secret.encode('utf-8'),
        message,
        hashlib.sha256
    ).hexdigest()
    return signature

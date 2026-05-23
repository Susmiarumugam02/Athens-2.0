"""
Chat notification utilities — stub implementation.
WebSocket/push notifications are not available in this deployment.
All functions return success silently so chat still works via polling.
"""
from django.contrib.auth import get_user_model

User = get_user_model()


def notify_message_sent(message_instance):
    return {'status': 'success'}


def notify_messages_read(message_ids, reader_user_id):
    return {'status': 'success'}


def notify_typing_status(user_id, other_user_id, is_typing=True):
    return {'status': 'success'}


def get_chat_notification_summary(user_id):
    try:
        from .models import Message
        from django.db.models import Q
        unread = Message.objects.filter(receiver_id=user_id, status__in=['sent', 'delivered']).count()
        return {'status': 'success', 'total_unread': unread, 'senders_summary': {}}
    except Exception as e:
        return {'status': 'error', 'error': str(e), 'total_unread': 0, 'senders_summary': {}}

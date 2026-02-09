"""
Chat-specific notification utilities for the chatbox app.
This module provides functions to send real-time notifications for chat events.
"""

from authentication.notification_utils import (
    send_chat_message_notification,
    send_chat_message_delivered_notification,
    send_chat_message_read_notification,
    send_chat_status_update_websocket
)
from django.contrib.auth import get_user_model

User = get_user_model()

def notify_message_sent(message_instance):
    """
    Send notifications when a message is successfully sent
    
    Args:
        message_instance: The Message model instance that was created
    """
    try:
        # Send notification to receiver about new message
        has_file = bool(message_instance.file)
        
        notification = send_chat_message_notification(
            receiver_id=message_instance.receiver.id,
            sender_id=message_instance.sender.id,
            message_content=message_instance.content,
            message_id=message_instance.id,
            has_file=has_file
        )
        
        # Send delivery confirmation to sender
        delivery_notification = send_chat_message_delivered_notification(
            sender_id=message_instance.sender.id,
            receiver_id=message_instance.receiver.id,
            message_id=message_instance.id
        )
        
        # Send real-time status update to sender (for immediate UI feedback)
        send_chat_status_update_websocket(
            user_id=message_instance.sender.id,
            message_id=message_instance.id,
            status='delivered',
            other_user_id=message_instance.receiver.id
        )
        
        return {
            'message_notification': notification,
            'delivery_notification': delivery_notification,
            'status': 'success'
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e)
        }

def notify_messages_read(message_ids, reader_user_id):
    """
    Send notifications when messages are marked as read
    
    Args:
        message_ids: List of message IDs that were read
        reader_user_id: ID of the user who read the messages
    """
    try:
        from .models import Message
        
        # Get unique senders of the read messages
        messages = Message.objects.filter(
            id__in=message_ids,
            receiver_id=reader_user_id
        ).select_related('sender')
        
        # Group messages by sender
        senders_messages = {}
        for message in messages:
            sender_id = message.sender.id
            if sender_id not in senders_messages:
                senders_messages[sender_id] = []
            senders_messages[sender_id].append(message.id)
        
        # Send read notifications to each sender
        notifications_sent = []
        for sender_id, msg_ids in senders_messages.items():
            notification = send_chat_message_read_notification(
                sender_id=sender_id,
                receiver_id=reader_user_id,
                message_ids=msg_ids
            )
            
            # Send real-time status update to sender
            for msg_id in msg_ids:
                send_chat_status_update_websocket(
                    user_id=sender_id,
                    message_id=msg_id,
                    status='read',
                    other_user_id=reader_user_id
                )
            
            notifications_sent.append({
                'sender_id': sender_id,
                'message_ids': msg_ids,
                'notification': notification
            })
        
        return {
            'status': 'success',
            'notifications_sent': notifications_sent
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e)
        }

def notify_typing_status(user_id, other_user_id, is_typing=True):
    """
    Send real-time typing indicator updates
    
    Args:
        user_id: ID of the user who is typing
        other_user_id: ID of the user who should see the typing indicator
        is_typing: Boolean indicating if user is typing or stopped typing
    """
    try:
        send_chat_status_update_websocket(
            user_id=other_user_id,
            message_id=None,  # No specific message for typing indicators
            status='typing' if is_typing else 'stopped_typing',
            other_user_id=user_id
        )
        
        return {'status': 'success'}
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e)
        }

def get_chat_notification_summary(user_id):
    """
    Get a summary of unread chat notifications for a user
    
    Args:
        user_id: ID of the user
        
    Returns:
        Dictionary with chat notification summary
    """
    try:
        from authentication.models_notification import Notification
        
        # Get unread chat notifications
        chat_notifications = Notification.objects.filter(
            user_id=user_id,
            read=False,
            notification_type__in=['chat_message', 'chat_file_shared']
        ).select_related('sender')
        
        # Group by sender
        senders_summary = {}
        total_unread = 0
        
        for notification in chat_notifications:
            sender_id = notification.sender.id if notification.sender else None
            if sender_id:
                if sender_id not in senders_summary:
                    sender_name = getattr(notification.sender, 'name', None) or notification.sender.username
                    senders_summary[sender_id] = {
                        'sender_name': sender_name,
                        'unread_count': 0,
                        'latest_message': None,
                        'latest_timestamp': None
                    }
                
                senders_summary[sender_id]['unread_count'] += 1
                total_unread += 1
                
                # Update latest message info
                if (not senders_summary[sender_id]['latest_timestamp'] or 
                    notification.created_at > senders_summary[sender_id]['latest_timestamp']):
                    senders_summary[sender_id]['latest_message'] = notification.message
                    senders_summary[sender_id]['latest_timestamp'] = notification.created_at
        
        return {
            'status': 'success',
            'total_unread': total_unread,
            'senders_summary': senders_summary
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'total_unread': 0,
            'senders_summary': {}
        }

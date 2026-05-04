#!/usr/bin/env python3
"""
Cleanup script for old MOM notifications with incorrect link formats
Run this to remove old notifications and test the new system
"""

import os
import sys
from django.setup import setup as django_setup

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django_setup()

from authentication.models_notification import Notification

def cleanup_old_mom_notifications():
    """Clean up old MOM notifications with incorrect link formats"""
    
    try:
        # Find notifications with old link format
        old_notifications = Notification.objects.filter(
            link__contains='/mom/meeting/'
        )
        
        count = old_notifications.count()
        
        if count > 0:
            # Show some examples
            for notif in old_notifications[:5]:
            
            # Delete old notifications
            deleted_count = old_notifications.delete()[0]
        else:
        
        # Show current MOM notifications
        current_notifications = Notification.objects.filter(
            notification_type='meeting_invitation'
        ).order_by('-created_at')[:10]
        
        for notif in current_notifications:
        
        
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    cleanup_old_mom_notifications()

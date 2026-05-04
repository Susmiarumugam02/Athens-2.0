from datetime import time
from django.conf import settings

def get_work_time_settings():
    """Get work time settings from master admin configuration"""
    # Default work hours - these should come from admin settings
    default_settings = {
        'day_start': time(8, 0),    # 8:00 AM
        'day_end': time(18, 0),     # 6:00 PM
        'night_start': time(20, 0), # 8:00 PM
        'night_end': time(6, 0),    # 6:00 AM
    }
    
    # TODO: Replace with actual admin settings lookup
    # This should query the master admin settings table
    # For now, return defaults
    return default_settings

def is_permit_expired_by_work_hours(permit):
    """Check if permit is expired based on work nature and master time settings"""
    from django.utils import timezone
    
    current_time = timezone.now().time()
    settings = get_work_time_settings()
    
    if permit.work_nature == 'day':
        # Day work expires at day_end time
        return current_time > settings['day_end']
    elif permit.work_nature == 'night':
        # Night work expires at night_end time (6 AM)
        return current_time > settings['night_end'] and current_time < settings['night_start']
    
    return False
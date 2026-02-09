from authentication.notification_utils import send_websocket_notification

def send_meeting_invitation_notification(participant_user_id, meeting_data, scheduler_user_id):
    """
    Send notification when participant is invited to a meeting
    """
    try:
        title = "📅 New Meeting Invitation"
        message = f"You have been invited to: {meeting_data.get('title', 'a meeting')} on {meeting_data.get('meeting_datetime', 'TBD')}"
        
        data = {
            'momId': meeting_data.get('id'),
            'title': meeting_data.get('title'),
            'meetingDateTime': meeting_data.get('meeting_datetime'),
            'location': meeting_data.get('location'),
            'agenda': meeting_data.get('agenda'),
            'requiresResponse': True,
            'actions': ['accept', 'reject']
        }
        
        link = f"/dashboard/mom/response/{meeting_data.get('id')}/{participant_user_id}"
        
        return send_websocket_notification(
            user_id=participant_user_id,
            title=title,
            message=message,
            notification_type='meeting_invitation',
            data=data,
            link=link,
            sender_id=scheduler_user_id
        )
        
    except Exception as e:
        return None

def send_meeting_response_notification(scheduler_user_id, participant_data, meeting_data, response_status, sender_id):
    """
    Send notification when participant responds to meeting invitation
    """
    try:
        participant_name = participant_data.get('name', 'A participant')
        meeting_title = meeting_data.get('title', 'the meeting')
        
        title = f"📋 Meeting Response: {response_status.title()}"
        message = f"{participant_name} has {response_status} the invitation for '{meeting_title}'"
        
        data = {
            'momId': meeting_data.get('id'),
            'participantId': sender_id,
            'participantName': participant_name,
            'status': response_status,
            'meetingTitle': meeting_title,
            'responseType': 'participant_response'
        }
        
        link = f"/dashboard/mom/view/{meeting_data.get('id')}"
        
        return send_websocket_notification(
            user_id=scheduler_user_id,
            title=title,
            message=message,
            notification_type='meeting_response',
            data=data,
            link=link,
            sender_id=sender_id
        )
        
    except Exception as e:
        return None

def send_meeting_completion_notification(participant_user_id, meeting_data, scheduler_user_id):
    """
    Send notification when meeting is completed
    """
    try:
        title = "✅ Meeting Completed"
        message = f"The meeting '{meeting_data.get('title', 'Meeting')}' has been completed"
        
        data = {
            'momId': meeting_data.get('id'),
            'title': meeting_data.get('title'),
            'completedAt': meeting_data.get('completed_at'),
            'duration': meeting_data.get('duration_minutes'),
            'notificationType': 'meeting_completed'
        }
        
        link = f"/dashboard/mom/summary/{meeting_data.get('id')}"
        
        return send_websocket_notification(
            user_id=participant_user_id,
            title=title,
            message=message,
            notification_type='meeting_completed',
            data=data,
            link=link,
            sender_id=scheduler_user_id
        )
        
    except Exception as e:
        return None

def send_task_assignment_notification(assigned_user_id, task_data, meeting_data, assigner_user_id):
    """
    Send notification when task is assigned during meeting
    """
    try:
        title = "📋 New Task Assigned"
        message = f"You have been assigned a task from meeting '{meeting_data.get('title', 'Meeting')}': {task_data.get('point', 'Task')}"
        
        data = {
            'momId': meeting_data.get('id'),
            'taskId': task_data.get('id'),
            'task': task_data.get('point'),
            'dueDate': task_data.get('dueDate'),
            'meetingTitle': meeting_data.get('title'),
            'notificationType': 'task_assigned'
        }
        
        link = f"/dashboard/mom/tasks/{task_data.get('id')}"
        
        return send_websocket_notification(
            user_id=assigned_user_id,
            title=title,
            message=message,
            notification_type='task_assigned',
            data=data,
            link=link,
            sender_id=assigner_user_id
        )
        
    except Exception as e:
        return None

def send_meeting_reminder_notification(participant_user_id, meeting_data, scheduler_user_id):
    """
    Send reminder notification before meeting starts
    """
    try:
        title = "⏰ Meeting Reminder"
        message = f"Reminder: Meeting '{meeting_data.get('title', 'Meeting')}' starts soon at {meeting_data.get('location', 'TBD')}"
        
        data = {
            'momId': meeting_data.get('id'),
            'title': meeting_data.get('title'),
            'meetingDateTime': meeting_data.get('meeting_datetime'),
            'location': meeting_data.get('location'),
            'notificationType': 'meeting_reminder'
        }
        
        link = f"/dashboard/mom/live/{meeting_data.get('id')}"
        
        return send_websocket_notification(
            user_id=participant_user_id,
            title=title,
            message=message,
            notification_type='meeting_reminder',
            data=data,
            link=link,
            sender_id=scheduler_user_id
        )
        
    except Exception as e:
        return None
# Stub — WebSocket notifications not available in this deployment.
# All functions return None silently; MoM CRUD still works fully.

def send_websocket_notification(user_id, title, message, notification_type, data=None, link=None, sender_id=None):
    return None


def send_meeting_invitation_notification(participant_user_id, meeting_data, scheduler_user_id):
    return None


def send_meeting_response_notification(scheduler_user_id, participant_data, meeting_data, response_status, sender_id):
    return None


def send_meeting_completion_notification(participant_user_id, meeting_data, scheduler_user_id):
    return None


def send_task_assignment_notification(assigned_user_id, task_data, meeting_data, assigner_user_id):
    return None


def send_meeting_reminder_notification(participant_user_id, meeting_data, scheduler_user_id):
    return None

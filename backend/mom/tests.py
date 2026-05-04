from rest_framework.test import APITestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from .models import Mom
from authentication.models_notification import Notification
from authentication.notification_views import NotificationCreateView
from mom.views import MomLiveView, MomLiveAttendanceUpdateView, MomCompleteView
from tests_common.context import create_project, create_user
from tests_common.request import jwt_request
from tests_common.channels import in_memory_channels
import os

User = get_user_model()

class MomLiveFeatureTests(APITestCase):
    def setUp(self):
        self.project, self.tenant_id = create_project()

        # Create users with secure credentials from environment
        admin_password = os.environ.get('TEST_ADMIN_PASSWORD', 'secure_test_admin_pass_123!')
        participant1_password = os.environ.get('TEST_PARTICIPANT1_PASSWORD', 'secure_test_participant1_pass_123!')
        participant2_password = os.environ.get('TEST_PARTICIPANT2_PASSWORD', 'secure_test_participant2_pass_123!')
        
        self.admin_user = create_user(
            User,
            "adminuser",
            admin_password,
            self.project,
            self.tenant_id,
        )
        self.participant1 = create_user(
            User,
            "participant1",
            participant1_password,
            self.project,
            self.tenant_id,
        )
        self.participant2 = create_user(
            User,
            "participant2",
            participant2_password,
            self.project,
            self.tenant_id,
        )
        self.other_project, self.other_tenant_id = create_project(name="Other Project")
        self.other_user = create_user(
            User,
            "otheruser",
            "secure_other_pass_123!",
            self.other_project,
            self.other_tenant_id,
        )

        # Create a Mom instance
        self.mom = Mom.objects.create(
            title='Test Meeting',
            agenda='Test Agenda',
            meeting_datetime='2025-06-01T10:00:00Z',
            scheduled_by=self.admin_user,
            points_to_discuss='Initial points',
            project=self.project,
        )
        self.mom.participants.set([self.participant1, self.participant2])

    def test_live_requires_auth(self):
        request = jwt_request(None, 'get', f'/api/v1/mom/{self.mom.id}/live/')
        response = MomLiveView.as_view()(request, pk=self.mom.id)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_live_denies_other_project(self):
        request = jwt_request(self.other_user, 'get', f'/api/v1/mom/{self.mom.id}/live/')
        response = MomLiveView.as_view()(request, pk=self.mom.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_live_meeting_data(self):
        request = jwt_request(self.admin_user, 'get', f'/api/v1/mom/{self.mom.id}/live/')
        response = MomLiveView.as_view()(request, pk=self.mom.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('points_to_discuss', response.data)
        self.assertIn('participants', response.data)
        self.assertEqual(len(response.data['participants']), 2)

    def test_attendance_requires_auth(self):
        request = jwt_request(None, 'put', f'/api/v1/mom/{self.mom.id}/live/attendance/')
        response = MomLiveAttendanceUpdateView.as_view()(request, pk=self.mom.id)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_attendance_and_points(self):
        payload = {
            'points_to_discuss': 'Updated points',
            'attendance': [
                {'id': self.participant1.id, 'attended': True},
                {'id': self.participant2.id, 'attended': False},
            ]
        }
        request = jwt_request(
            self.admin_user,
            'put',
            f'/api/v1/mom/{self.mom.id}/live/attendance/',
            data=payload,
        )
        response = MomLiveAttendanceUpdateView.as_view()(request, pk=self.mom.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.mom.refresh_from_db()
        self.assertEqual(self.mom.points_to_discuss, 'Updated points')
        # Check attendance records
        self.assertTrue(self.mom.participant_attendances.filter(user=self.participant1, attended=True).exists())
        self.assertTrue(self.mom.participant_attendances.filter(user=self.participant2, attended=False).exists())

    def test_mark_meeting_complete(self):
        payload = {
            'completed_at': '2025-06-01T11:00:00Z',
            'duration_minutes': 60
        }
        request = jwt_request(
            self.admin_user,
            'put',
            f'/api/v1/mom/{self.mom.id}/complete/',
            data=payload,
        )
        response = MomCompleteView.as_view()(request, pk=self.mom.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_complete_denies_other_project(self):
        payload = {
            'completed_at': '2025-06-01T11:00:00Z',
            'duration_minutes': 60
        }
        request = jwt_request(
            self.other_user,
            'put',
            f'/api/v1/mom/{self.mom.id}/complete/',
            data=payload,
        )
        response = MomCompleteView.as_view()(request, pk=self.mom.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @in_memory_channels()
    def test_send_notification(self):
        payload = {
            'user_id': self.participant1.id,
            'title': 'Test Notification',
            'message': 'This is a test notification',
            'type': 'meeting',
            'data': {'momId': self.mom.id},
            'link': '/dashboard/mom/view/{}'.format(self.mom.id)
        }
        request = jwt_request(
            self.admin_user,
            'post',
            '/authentication/notifications/create/',
            data=payload,
        )
        response = NotificationCreateView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Notification.objects.filter(user=self.participant1, title='Test Notification').exists())

    def test_live_route_smoke(self):
        url = reverse('mom-live', kwargs={'pk': self.mom.id})
        response = APIClient().get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

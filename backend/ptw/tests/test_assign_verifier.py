from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import CustomUser
from tests_common.fixtures import create_test_project
from ptw.models import Permit, PermitType, WorkflowInstance, WorkflowStep


@override_settings(
    SECURE_SSL_REDIRECT=False,
    MIDDLEWARE=[
        'corsheaders.middleware.CorsMiddleware',
        'django.middleware.security.SecurityMiddleware',
        'django.contrib.sessions.middleware.SessionMiddleware',
        'django.middleware.common.CommonMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
    ]
)
class AssignVerifierAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.project = create_test_project()
        self.other_project = create_test_project(name='Other Project')

        self.requestor = CustomUser.objects.create_user(
            username='requestor',
            email='requestor@example.com',
            password='testpass123',
            user_type='adminuser',
            admin_type='epcuser',
            grade='C',
            project=self.project
        )

        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work',
            risk_level='high',
            is_active=True
        )

        self.permit = Permit.objects.create(
            permit_type=self.permit_type,
            title='Test Permit',
            description='Test permit',
            location='Test Location',
            created_by=self.requestor,
            project=self.project,
            status='submitted',
            risk_level='high',
            probability=4,
            severity=4,
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timezone.timedelta(hours=8)
        )

        self.workflow = WorkflowInstance.objects.create(
            permit=self.permit,
            template=None,
            current_step=1,
            status='active'
        )
        WorkflowStep.objects.create(
            workflow=self.workflow,
            step_id='verifier_selection',
            name='Select Verifier',
            step_type='selection',
            assignee=self.requestor,
            role='requestor',
            order=1,
            required=True,
            status='pending'
        )

        self.verifier = CustomUser.objects.create_user(
            username='verifier',
            email='verifier@example.com',
            password='testpass123',
            user_type='adminuser',
            admin_type='epcuser',
            grade='B',
            project=self.project
        )
        self.other_user = CustomUser.objects.create_user(
            username='otheruser',
            email='otheruser@example.com',
            password='testpass123',
            user_type='adminuser',
            admin_type='epcuser',
            grade='B',
            project=self.project
        )
        self.other_project_user = CustomUser.objects.create_user(
            username='otherprojectuser',
            email='otherprojectuser@example.com',
            password='testpass123',
            user_type='adminuser',
            admin_type='epcuser',
            grade='B',
            project=self.other_project
        )

    def _url(self):
        return f'/api/v1/ptw/permits/{self.permit.id}/workflow/assign-verifier/'

    def test_assign_verifier_success(self):
        self.client.force_authenticate(user=self.requestor)
        response = self.client.post(self._url(), {'verifier_id': self.verifier.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.permit.refresh_from_db()
        self.assertEqual(self.permit.verifier_id, self.verifier.id)

    def test_assign_verifier_missing_id_returns_400(self):
        self.client.force_authenticate(user=self.requestor)
        response = self.client.post(self._url(), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assign_verifier_wrong_project_returns_400(self):
        self.client.force_authenticate(user=self.requestor)
        response = self.client.post(self._url(), {'verifier_id': self.other_project_user.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assign_verifier_non_requestor_forbidden(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post(self._url(), {'verifier_id': self.verifier.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assign_verifier_after_verification_blocked(self):
        self.permit.status = 'under_review'
        self.permit.save(update_fields=['status'])
        self.client.force_authenticate(user=self.requestor)
        response = self.client.post(self._url(), {'verifier_id': self.verifier.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assign_verifier_accepts_legacy_key(self):
        self.client.force_authenticate(user=self.requestor)
        response = self.client.post(self._url(), {'verifier': self.verifier.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

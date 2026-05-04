"""
Tests for permit creation defaults and QR code generation.
"""
import base64
import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import Project
from ptw import qr_utils
from ptw.models import Permit, PermitType

User = get_user_model()


class PermitCreationAndQrTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name='Permit Project', code='PTW')
        self.user = User.objects.create_user(
            username='permituser',
            password='pass123',
            project=self.project,
        )
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work',
            risk_level='high',
            is_active=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_permit_sets_version_default(self):
        start_time = timezone.now() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        payload = {
            'permit_type': self.permit_type.id,
            'description': 'Test permit',
            'location': 'Test Location',
            'planned_start_time': start_time.isoformat(),
            'planned_end_time': end_time.isoformat(),
            'work_nature': 'day',
            'risk_assessment_completed': True,
            'probability': 1,
            'severity': 1,
            'control_measures': 'Controls',
            'ppe_requirements': ['helmet'],
            'safety_checklist': {'Checklist item': True},
            'requires_isolation': False,
            'mobile_created': False,
            'offline_id': '',
        }

        response = self.client.post('/api/v1/ptw/permits/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        permit = Permit.objects.latest('id')
        self.assertEqual(permit.version, 1)

    def test_generate_qr_code_rejects_unsaved_permit(self):
        response = self.client.get('/api/v1/ptw/permits/new/generate_qr_code/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_generate_qr_code_returns_payload(self):
        if qr_utils.qrcode is None:
            self.skipTest('qrcode library not installed')

        permit = Permit.objects.create(
            permit_type=self.permit_type,
            description='QR permit',
            location='QR Location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(hours=1),
            work_nature='day',
            probability=1,
            severity=1,
            control_measures='Controls',
            created_by=self.user,
            project=self.project,
        )

        response = self.client.get(f'/api/v1/ptw/permits/{permit.id}/generate_qr_code/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('qr_image', response.data)
        self.assertIn('qr_data', response.data)
        self.assertIn('mobile_url', response.data)

        decoded = json.loads(base64.b64decode(response.data['qr_data']).decode())
        self.assertEqual(decoded['permit_id'], permit.id)

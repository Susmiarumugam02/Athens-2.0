from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from authentication.models import Project
from ptw.models import Permit, PermitType
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class ThrottlingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        self.project = Project.objects.create(name='Test Project')
        self.user.project = self.project
        self.user.save()
        self.client.force_authenticate(user=self.user)
        
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work',
            risk_level='high'
        )
    
    @override_settings(REST_FRAMEWORK={'DEFAULT_THROTTLE_RATES': {'ptw_sync': '2/min'}})
    def test_sync_throttle_limit(self):
        """Test sync endpoint throttles after limit"""
        payload = {
            'device_id': 'test_device',
            'client_time': timezone.now().isoformat(),
            'changes': []
        }
        
        # First 2 requests should succeed
        response1 = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        self.assertEqual(response1.status_code, 200)
        
        response2 = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        self.assertEqual(response2.status_code, 200)
        
        # Third request should be throttled
        response3 = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        self.assertEqual(response3.status_code, 429)
        self.assertIn('Retry-After', response3.headers or {})
    
    @override_settings(REST_FRAMEWORK={'DEFAULT_THROTTLE_RATES': {'ptw_bulk_export': '2/hour'}})
    def test_bulk_export_throttle_limit(self):
        """Test bulk export endpoint throttles after limit"""
        permit = Permit.objects.create(
            permit_number='PTW-2024-001',
            permit_type=self.permit_type,
            title='Test',
            description='Test',
            location='Test',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(hours=8),
            created_by=self.user,
            project=self.project
        )
        
        payload = {'permit_ids': [permit.id]}
        
        # First 2 requests should succeed
        response1 = self.client.post('/api/v1/ptw/permits/bulk_export_pdf/', payload, format='json')
        self.assertIn(response1.status_code, [200, 404])  # 404 if export utils not available
        
        response2 = self.client.post('/api/v1/ptw/permits/bulk_export_pdf/', payload, format='json')
        self.assertIn(response2.status_code, [200, 404])
        
        # Third request should be throttled
        response3 = self.client.post('/api/v1/ptw/permits/bulk_export_pdf/', payload, format='json')
        self.assertEqual(response3.status_code, 429)

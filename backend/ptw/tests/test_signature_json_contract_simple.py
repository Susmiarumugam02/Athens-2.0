from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from ptw.models import Permit, PermitType, DigitalSignature
from authentication.models import Project
from django.utils import timezone
import json

User = get_user_model()

class SignatureJSONContractTest(TestCase):
    """Prove signatures are JSON-only end-to-end in production runtime"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.project = Project.objects.create(
            projectName='Test Project',
            projectCategory='test',
            capacity='100MW',
            location='Test Location',
            latitude=0.0,
            longitude=0.0,
            nearestPoliceStation='Test Police',
            nearestPoliceStationContact='123456789',
            nearestHospital='Test Hospital',
            nearestHospitalContact='987654321',
            commencementDate='2024-01-01',
            deadlineDate='2024-12-31'
        )
        
        self.requestor = User.objects.create_user(
            username='requestor',
            email='requestor@test.com',
            project=self.project,
            admin_type='contractor',
            user_type='admin'
        )
        
        self.permit_type = PermitType.objects.create(
            name='Test Permit',
            category='hot_work'
        )
        
        self.permit = Permit.objects.create(
            permit_number='TEST-001',
            permit_type=self.permit_type,
            description='Test permit',
            location='Test location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timezone.timedelta(hours=8),
            created_by=self.requestor,
            project=self.project,
            status='submitted'
        )
    
    def test_json_only_contract_requestor(self):
        """Test that requestor signature returns JSON-only data with no legacy image fields"""
        
        self.client.force_authenticate(user=self.requestor)
        
        signature_payload = {
            'type': 'stroke_v1',
            'width': 300,
            'height': 100,
            'strokes': [
                {
                    'points': [
                        {'x': 10, 'y': 20},
                        {'x': 30, 'y': 40},
                        {'x': 50, 'y': 60}
                    ],
                    'color': '#000',
                    'width': 2
                }
            ]
        }
        
        # Add requestor signature
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/add_signature/',
            {
                'signature_type': 'requestor',
                'signature_payload': signature_payload
            },
            format='json'
        )
        
        if response.status_code != status.HTTP_201_CREATED:
            print(f"Error: {response.status_code} - {response.data}")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Get permit detail and verify JSON-only contract
        response = self.client.get(f'/api/v1/ptw/permits/{self.permit.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertIn('signatures_by_type', data)
        self.assertIn('requestor', data['signatures_by_type'])
        
        sig_data = data['signatures_by_type']['requestor']
        
        # MUST HAVE: JSON payload
        self.assertIn('signature_payload', sig_data)
        self.assertIsInstance(sig_data['signature_payload'], dict)
        self.assertEqual(sig_data['signature_payload']['type'], 'stroke_v1')
        self.assertIn('strokes', sig_data['signature_payload'])
        self.assertIsInstance(sig_data['signature_payload']['strokes'], list)
        
        # MUST HAVE: payload version
        self.assertIn('payload_version', sig_data)
        self.assertEqual(sig_data['payload_version'], 1)
        
        # MUST HAVE: signed_at as ISO string
        self.assertIn('signed_at', sig_data)
        self.assertIsInstance(sig_data['signed_at'], str)
        
        # MUST NOT HAVE: legacy image fields
        legacy_fields = [
            'signature_data', 'signature_image_url', 'signature_card_url',
            'signature_render_mode', 'signature_image', 'card_url'
        ]
        for field in legacy_fields:
            if field in sig_data:
                self.assertIsNone(sig_data[field], f"Legacy field {field} must be null")
    
    def test_database_contract_json_only(self):
        """Test that database stores JSON payload correctly"""
        self.client.force_authenticate(user=self.requestor)
        
        signature_payload = {
            'type': 'stroke_v1',
            'strokes': [{'points': [{'x': 10, 'y': 20}]}]
        }
        
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/add_signature/',
            {
                'signature_type': 'requestor',
                'signature_payload': signature_payload
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check database directly
        signature = DigitalSignature.objects.get(
            permit=self.permit,
            signature_type='requestor'
        )
        
        # Verify JSON payload stored correctly
        self.assertIsNotNone(signature.signature_payload)
        self.assertEqual(signature.payload_version, 1)
        self.assertEqual(signature.signature_payload['type'], 'stroke_v1')
        self.assertIn('payload_hash', signature.signature_payload)
        
        # Legacy signature_data should be empty or null
        self.assertTrue(not signature.signature_data or signature.signature_data.strip() == '')
    
    def test_api_response_structure(self):
        """Test that API response has correct JSON structure"""
        # Create signature directly in database
        import hashlib
        signature_payload = {
            'type': 'stroke_v1',
            'strokes': [{'points': [{'x': 10, 'y': 20}]}]
        }
        canonical_json = json.dumps(signature_payload, sort_keys=True, separators=(',', ':'))
        payload_hash = hashlib.sha256(canonical_json.encode()).hexdigest()
        signature_payload['payload_hash'] = payload_hash
        
        DigitalSignature.objects.create(
            permit=self.permit,
            signature_type='requestor',
            signatory=self.requestor,
            signature_payload=signature_payload,
            payload_version=1,
            ip_address='127.0.0.1',
            device_info={}
        )
        
        self.client.force_authenticate(user=self.requestor)
        response = self.client.get(f'/api/v1/ptw/permits/{self.permit.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify response structure
        data = response.data
        self.assertIn('signatures_by_type', data)
        self.assertIn('requestor', data['signatures_by_type'])
        
        sig_data = data['signatures_by_type']['requestor']
        
        # Verify all required fields are present
        required_fields = ['signature_payload', 'payload_version', 'signed_at', 'signatory']
        for field in required_fields:
            self.assertIn(field, sig_data, f"Required field {field} missing from response")
        
        # Verify signature_payload structure
        payload = sig_data['signature_payload']
        self.assertEqual(payload['type'], 'stroke_v1')
        self.assertIn('strokes', payload)
        self.assertIn('payload_hash', payload)
        
        print("✅ JSON-only signature contract verified successfully")
"""
Test contract to ensure signatures are JSON-only (no legacy image fields)
"""
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from ptw.models import Permit, PermitType, DigitalSignature
from ptw.serializers import PermitSerializer, DigitalSignatureSerializer
from authentication.models import Project

User = get_user_model()


class SignatureJSONOnlyContractTest(TestCase):
    """
    CRITICAL: This test MUST FAIL if any legacy signature fields are returned
    """
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test project
        self.project = Project.objects.create(
            projectName="Test Project",
            projectCategory="construction",
            capacity="100MW",
            location="Test Location",
            nearestPoliceStation="Test Police Station",
            nearestPoliceStationContact="123-456-7890",
            nearestHospital="Test Hospital",
            nearestHospitalContact="098-765-4321",
            commencementDate="2024-01-01",
            deadlineDate="2024-12-31"
        )
        
        # Create test users
        self.requestor = User.objects.create_user(
            username='requestor',
            email='requestor@test.com',
            user_type='user',
            admin_type='contractoruser',
            grade='C',
            project=self.project
        )
        
        self.verifier = User.objects.create_user(
            username='verifier',
            email='verifier@test.com',
            user_type='user',
            admin_type='epcuser',
            grade='B',
            project=self.project
        )
        
        self.approver = User.objects.create_user(
            username='approver',
            email='approver@test.com',
            user_type='projectadmin',
            admin_type='clientuser',
            grade='A',
            project=self.project
        )
        
        # Create permit type
        self.permit_type = PermitType.objects.create(
            name="Test Permit",
            category="electrical",
            risk_level="medium"
        )
        
        # Create test permit
        from datetime import datetime, timezone as dt_timezone
        self.permit = Permit.objects.create(
            permit_number="TEST-001",
            permit_type=self.permit_type,
            title="Test Permit",
            description="Test permit for signature contract",
            location="Test Location",
            planned_start_time=datetime.now(dt_timezone.utc),
            planned_end_time=datetime.now(dt_timezone.utc),
            created_by=self.requestor,
            receiver=self.requestor,
            verifier=self.verifier,
            approver=self.approver,
            project=self.project,
            status='submitted'
        )
    
    def test_digital_signature_serializer_json_only(self):
        """Test DigitalSignatureSerializer returns ONLY JSON fields"""
        # Create signature with JSON payload
        signature_payload = {
            "type": "stroke_v1",
            "strokes": [
                {
                    "points": [
                        {"x": 10, "y": 50},
                        {"x": 50, "y": 30},
                        {"x": 90, "y": 50}
                    ],
                    "color": "#000000",
                    "width": 2
                }
            ],
            "width": 200,
            "height": 80
        }
        
        signature = DigitalSignature.objects.create(
            permit=self.permit,
            signature_type='requestor',
            signatory=self.requestor,
            signature_payload=signature_payload,
            payload_version=1,
            signature_data=''  # Legacy field should be empty
        )
        
        # Serialize signature
        serializer = DigitalSignatureSerializer(signature)
        data = serializer.data
        
        # MUST have JSON fields
        self.assertIn('signature_payload', data)
        self.assertIn('payload_version', data)
        self.assertEqual(data['payload_version'], 1)
        self.assertIsInstance(data['signature_payload'], dict)
        self.assertEqual(data['signature_payload']['type'], 'stroke_v1')
        
        # MUST NOT have legacy fields - HARD FAILURE if present
        FORBIDDEN_LEGACY_FIELDS = [
            'signature_data', 'signature_image_url', 'signature_render_mode',
            'card_image', 'signature_image', 'card_url', 'template_url'
        ]
        
        for field in FORBIDDEN_LEGACY_FIELDS:
            self.assertNotIn(field, data, 
                f"CRITICAL: Legacy field '{field}' found in signature serializer output. "
                f"This violates the JSON-only contract!")

    def test_permit_signatures_by_type_json_only(self):
        """Test signatures_by_type returns ONLY JSON fields"""
        # Create signature with JSON payload
        signature_payload = {
            "type": "stroke_v1",
            "strokes": [
                {
                    "points": [
                        {"x": 10, "y": 50},
                        {"x": 50, "y": 30},
                        {"x": 90, "y": 50}
                    ],
                    "color": "#000000",
                    "width": 2
                }
            ],
            "width": 200,
            "height": 80
        }
        
        DigitalSignature.objects.create(
            permit=self.permit,
            signature_type='requestor',
            signatory=self.requestor,
            signature_payload=signature_payload,
            payload_version=1,
            signature_data=''  # Legacy field should be empty
        )
        
        # Serialize permit
        serializer = PermitSerializer(self.permit)
        data = serializer.data
        
        # Check signatures_by_type structure
        self.assertIn('signatures_by_type', data)
        self.assertIn('requestor', data['signatures_by_type'])
        
        requestor_sig = data['signatures_by_type']['requestor']
        self.assertIsNotNone(requestor_sig)
        
        # MUST have JSON fields
        self.assertIn('signature_payload', requestor_sig)
        self.assertIn('payload_version', requestor_sig)
        self.assertEqual(requestor_sig['payload_version'], 1)
        
        # MUST NOT have legacy fields - HARD FAILURE if present
        FORBIDDEN_LEGACY_FIELDS = [
            'signature_data', 'signature_image_url', 'signature_render_mode',
            'card_image', 'signature_image', 'card_url', 'template_url'
        ]
        
        for field in FORBIDDEN_LEGACY_FIELDS:
            self.assertNotIn(field, requestor_sig, 
                f"CRITICAL: Legacy field '{field}' found in signatures_by_type output. "
                f"This violates the JSON-only contract!")

    def test_add_signature_api_json_only(self):
        """Test add_signature API accepts and stores ONLY JSON payload"""
        self.client.force_authenticate(user=self.requestor)
        
        # Send JSON payload
        signature_payload = {
            "type": "stroke_v1",
            "strokes": [
                {
                    "points": [
                        {"x": 10, "y": 50},
                        {"x": 50, "y": 30},
                        {"x": 90, "y": 50}
                    ],
                    "color": "#000000",
                    "width": 2
                }
            ],
            "width": 200,
            "height": 80
        }
        
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/add_signature/',
            {
                'signature_type': 'requestor',
                'signature_payload': signature_payload,
                'payload_version': 1
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify signature was stored with JSON payload
        signature = DigitalSignature.objects.get(
            permit=self.permit,
            signature_type='requestor'
        )
        
        self.assertIsNotNone(signature.signature_payload)
        self.assertEqual(signature.payload_version, 1)
        self.assertEqual(signature.signature_payload['type'], 'stroke_v1')
        
        # Legacy signature_data should be empty
        self.assertTrue(not signature.signature_data or signature.signature_data.strip() == '')
        
        # Check API response contains signatures_by_type with JSON-only fields
        signatures_by_type = response.data.get('signatures_by_type', {})
        if 'requestor' in signatures_by_type:
            requestor_sig = signatures_by_type['requestor']
            
            # MUST have JSON fields
            self.assertIn('signature_payload', requestor_sig)
            self.assertIn('payload_version', requestor_sig)
            
            # MUST NOT have legacy fields
            FORBIDDEN_LEGACY_FIELDS = [
                'signature_data', 'signature_image_url', 'signature_render_mode',
                'card_image', 'signature_image', 'card_url', 'template_url'
            ]
            
            for field in FORBIDDEN_LEGACY_FIELDS:
                self.assertNotIn(field, requestor_sig, 
                    f"CRITICAL: Legacy field '{field}' found in API response. "
                    f"This violates the JSON-only contract!")

    def test_reject_legacy_signature_data(self):
        """Test API rejects requests with legacy signature_data field"""
        self.client.force_authenticate(user=self.requestor)
        
        # Try to send legacy signature_data
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/add_signature/',
            {
                'signature_type': 'requestor',
                'signature_data': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
            },
            format='json'
        )
        
        # Should reject legacy format
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_require_valid_json_payload(self):
        """Test API requires valid JSON payload with strokes"""
        self.client.force_authenticate(user=self.requestor)
        
        # Test missing signature_payload
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/add_signature/',
            {
                'signature_type': 'requestor'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('MISSING_SIGNATURE_PAYLOAD', response.data['error']['code'])
        
        # Test invalid payload structure
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/add_signature/',
            {
                'signature_type': 'requestor',
                'signature_payload': {'invalid': 'structure'}
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('INVALID_PAYLOAD', response.data['error']['code'])
        
        # Test empty strokes
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/add_signature/',
            {
                'signature_type': 'requestor',
                'signature_payload': {
                    'type': 'stroke_v1',
                    'strokes': []
                }
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('MISSING_SIGNATURE_PAYLOAD', response.data['error']['code'])
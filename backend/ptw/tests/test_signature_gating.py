"""
Tests for digital signature gating in PTW workflow.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import Project
from ptw.models import Permit, PermitType, DigitalSignature
from ptw.signature_validators import validate_required_signatures_for_action, validate_signature_authorization
from rest_framework.exceptions import ValidationError
import json

User = get_user_model()


class SignatureGatingTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create project
        self.project = Project.objects.create(
            projectName="Test Project",
            projectCategory="construction",
            capacity="100MW",
            location="Test Location",
            nearestPoliceStation="Test Police",
            nearestPoliceStationContact="123456789",
            nearestHospital="Test Hospital",
            nearestHospitalContact="987654321",
            commencementDate="2024-01-01",
            deadlineDate="2024-12-31"
        )
        
        # Create users
        self.requestor = User.objects.create_user(
            username='requestor',
            email='requestor@test.com',
            password='testpass123',
            user_type='adminuser',
            project=self.project,
            admin_type='contractoruser',
            grade='C'
        )
        
        self.verifier = User.objects.create_user(
            username='verifier',
            email='verifier@test.com',
            password='testpass123',
            user_type='adminuser',
            project=self.project,
            admin_type='epcuser',
            grade='B'
        )
        
        self.approver = User.objects.create_user(
            username='approver',
            email='approver@test.com',
            password='testpass123',
            user_type='adminuser',
            project=self.project,
            admin_type='clientuser',
            grade='A'
        )
        
        # Create permit type
        self.permit_type = PermitType.objects.create(
            name="Hot Work",
            category="hot_work",
            risk_level="medium"
        )
        
        # Create permit
        self.permit = Permit.objects.create(
            permit_number="PTW-2024-000001",
            permit_type=self.permit_type,
            title="Test Hot Work",
            description="Test permit for signature gating",
            location="Test Location",
            planned_start_time="2024-01-01T08:00:00Z",
            planned_end_time="2024-01-01T17:00:00Z",
            created_by=self.requestor,
            project=self.project,
            verifier=self.verifier,
            approver=self.approver
        )
        
        self.client = APIClient()
        
    def create_signature(self, user, signature_type):
        """Helper to create a digital signature"""
        return DigitalSignature.objects.create(
            permit=self.permit,
            signature_type=signature_type,
            signatory=user,
            signature_data="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        )
    
    def test_initiate_workflow_without_requestor_signature_fails(self):
        """Test that workflow initiation fails without requestor signature"""
        with self.assertRaises(ValidationError) as context:
            validate_required_signatures_for_action(self.permit, 'initiate_workflow', self.requestor)
        
        error = context.exception.detail
        self.assertIn('signature', error)
        self.assertEqual(error['signature']['missing'], ['requestor'])
        self.assertIn('Requestor digital signature is required', error['signature']['message'])
    
    def test_initiate_workflow_with_requestor_signature_succeeds(self):
        """Test that workflow initiation succeeds with requestor signature"""
        self.create_signature(self.requestor, 'requestor')
        
        # Should not raise ValidationError
        try:
            validate_required_signatures_for_action(self.permit, 'initiate_workflow', self.requestor)
        except ValidationError:
            self.fail("validate_required_signatures_for_action raised ValidationError unexpectedly")
    
    def test_verify_without_verifier_signature_fails(self):
        """Test that verification fails without verifier signature"""
        with self.assertRaises(ValidationError) as context:
            validate_required_signatures_for_action(self.permit, 'verify', self.verifier)
        
        error = context.exception.detail
        self.assertIn('signature', error)
        self.assertEqual(error['signature']['missing'], ['verifier'])
        self.assertIn('Verifier digital signature is required', error['signature']['message'])
    
    def test_verify_with_verifier_signature_succeeds(self):
        """Test that verification succeeds with verifier signature"""
        self.create_signature(self.verifier, 'verifier')
        
        # Should not raise ValidationError
        try:
            validate_required_signatures_for_action(self.permit, 'verify', self.verifier)
        except ValidationError:
            self.fail("validate_required_signatures_for_action raised ValidationError unexpectedly")
    
    def test_approve_without_approver_signature_fails(self):
        """Test that approval fails without approver signature"""
        with self.assertRaises(ValidationError) as context:
            validate_required_signatures_for_action(self.permit, 'approve', self.approver)
        
        error = context.exception.detail
        self.assertIn('signature', error)
        self.assertEqual(error['signature']['missing'], ['approver'])
        self.assertIn('Approver digital signature is required', error['signature']['message'])
    
    def test_approve_with_approver_signature_succeeds(self):
        """Test that approval succeeds with approver signature"""
        self.create_signature(self.approver, 'approver')
        
        # Should not raise ValidationError
        try:
            validate_required_signatures_for_action(self.permit, 'approve', self.approver)
        except ValidationError:
            self.fail("validate_required_signatures_for_action raised ValidationError unexpectedly")
    
    def test_unauthorized_user_cannot_add_approver_signature(self):
        """Test that non-authorized user cannot add approver signature"""
        with self.assertRaises(ValidationError) as context:
            validate_signature_authorization(self.permit, 'approver', self.requestor)
        
        error = context.exception.detail
        self.assertIn('signature_type', error)
        self.assertIn('Only the assigned approver can sign', error['signature_type'])
    
    def test_unknown_signature_type_validation(self):
        """Test validation of unknown signature types"""
        self.client.force_authenticate(user=self.requestor)
        
        response = self.client.post(f'/api/v1/ptw/permits/{self.permit.id}/add_signature/', {
            'signature_type': 'invalid_type',
            'signature_data': 'data:image/png;base64,test'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid signature type', response.data.get('error', {}).get('message', ''))


class SignatureAPITestCase(TestCase):
    def setUp(self):
        """Set up test data for API tests"""
        # Create project
        self.project = Project.objects.create(
            projectName="Test Project",
            projectCategory="construction",
            capacity="100MW",
            location="Test Location",
            nearestPoliceStation="Test Police",
            nearestPoliceStationContact="123456789",
            nearestHospital="Test Hospital",
            nearestHospitalContact="987654321",
            commencementDate="2024-01-01",
            deadlineDate="2024-12-31"
        )
        
        # Create users
        self.requestor = User.objects.create_user(
            username='requestor',
            email='requestor@test.com',
            password='testpass123',
            user_type='adminuser',
            project=self.project,
            admin_type='contractoruser',
            grade='C'
        )
        
        self.verifier = User.objects.create_user(
            username='verifier',
            email='verifier@test.com',
            password='testpass123',
            user_type='adminuser',
            project=self.project,
            admin_type='epcuser',
            grade='B'
        )
        
        # Create permit type
        self.permit_type = PermitType.objects.create(
            name="Hot Work",
            category="hot_work",
            risk_level="medium"
        )
        
        # Create permit
        self.permit = Permit.objects.create(
            permit_number="PTW-2024-000001",
            permit_type=self.permit_type,
            title="Test Hot Work",
            description="Test permit for signature gating",
            location="Test Location",
            planned_start_time="2024-01-01T08:00:00Z",
            planned_end_time="2024-01-01T17:00:00Z",
            created_by=self.requestor,
            project=self.project,
            verifier=self.verifier
        )
        
        self.client = APIClient()
        self.signature_data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    def test_add_signature_endpoint_validation(self):
        """Test add_signature endpoint validation"""
        self.client.force_authenticate(user=self.requestor)
        
        # Test missing signature_type
        response = self.client.post(f'/api/v1/ptw/permits/{self.permit.id}/add_signature/', {
            'signature_data': self.signature_data
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test missing signature_data
        response = self.client.post(f'/api/v1/ptw/permits/{self.permit.id}/add_signature/', {
            'signature_type': 'requestor'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test invalid signature_type
        response = self.client.post(f'/api/v1/ptw/permits/{self.permit.id}/add_signature/', {
            'signature_type': 'invalid',
            'signature_data': self.signature_data
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_add_signature_authorization(self):
        """Test signature authorization in add_signature endpoint"""
        # Requestor can add requestor signature
        self.client.force_authenticate(user=self.requestor)
        response = self.client.post(f'/api/v1/ptw/permits/{self.permit.id}/add_signature/', {
            'signature_type': 'requestor',
            'signature_data': self.signature_data
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verifier cannot add requestor signature
        self.client.force_authenticate(user=self.verifier)
        response = self.client.post(f'/api/v1/ptw/permits/{self.permit.id}/add_signature/', {
            'signature_type': 'requestor',
            'signature_data': self.signature_data
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_signature_idempotency(self):
        """Test that duplicate signatures return existing signature"""
        self.client.force_authenticate(user=self.requestor)
        
        # First signature creation
        response1 = self.client.post(f'/api/v1/ptw/permits/{self.permit.id}/add_signature/', {
            'signature_type': 'requestor',
            'signature_data': self.signature_data
        })
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Second signature creation (should return existing)
        response2 = self.client.post(f'/api/v1/ptw/permits/{self.permit.id}/add_signature/', {
            'signature_type': 'requestor',
            'signature_data': self.signature_data
        })
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertIn('Signature already exists', response2.data['message'])
        
        # Should be same signature ID
        self.assertEqual(response1.data['id'], response2.data['signature']['id'])

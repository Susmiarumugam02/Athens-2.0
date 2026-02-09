"""
Test signature mapping and enforcement in canonical workflow manager
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from authentication.models import Project
from ptw.models import Permit, PermitType, DigitalSignature
from ptw.canonical_workflow_manager import canonical_workflow_manager
from ptw.signature_service import signature_service
from ptw.unified_error_handling import PTWValidationError, PTWPermissionError
from unittest.mock import patch

User = get_user_model()

class SignatureMappingTest(TestCase):
    def setUp(self):
        # Create project
        self.project = Project.objects.create(
            projectName='Test Project',
            projectCategory='construction',
            capacity='100MW',
            location='Test Location',
            nearestPoliceStation='Test Police Station',
            nearestPoliceStationContact='123456789',
            nearestHospital='Test Hospital',
            nearestHospitalContact='987654321',
            commencementDate='2024-01-01',
            deadlineDate='2024-12-31'
        )
        
        # Create users
        self.requestor = User.objects.create_user(
            username='requestor',
            email='requestor@test.com',
            user_type='adminuser',
            project=self.project
        )
        
        self.verifier = User.objects.create_user(
            username='verifier',
            email='verifier@test.com',
            user_type='projectadmin',
            project=self.project
        )
        
        self.approver = User.objects.create_user(
            username='approver',
            email='approver@test.com',
            user_type='projectadmin',
            project=self.project
        )
        
        # Create permit type
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work'
        )
        
        # Create permit
        self.permit = Permit.objects.create(
            permit_number='PTW-001',
            permit_type=self.permit_type,
            project=self.project,
            created_by=self.requestor,
            verifier=self.verifier,
            approver=self.approver,
            location='Test Location',
            work_description='Test work',
            status='draft'
        )
    
    def test_submit_requires_requestor_signature(self):
        """Test that submitting requires requestor signature"""
        with self.assertRaises(PTWValidationError) as cm:
            canonical_workflow_manager.transition(
                permit=self.permit,
                new_status='pending_verification',
                user=self.requestor,
                action='initiate_workflow'
            )
        
        self.assertIn('Missing required signatures', str(cm.exception))
        self.assertIn('requestor', str(cm.exception))
    
    def test_verify_requires_verifier_signature(self):
        """Test that verification requires verifier signature"""
        # Add requestor signature
        with patch.object(signature_service, '_generate_signature_data', return_value='mock_signature'):
            signature_service.add_signature(self.permit, 'requestor', self.requestor)
        
        # Transition to pending verification
        canonical_workflow_manager.transition(
            permit=self.permit,
            new_status='pending_verification',
            user=self.requestor,
            action='initiate_workflow'
        )
        
        # Try to verify without verifier signature
        with self.assertRaises(PTWValidationError) as cm:
            canonical_workflow_manager.transition(
                permit=self.permit,
                new_status='pending_approval',
                user=self.verifier,
                action='verify_approve'
            )
        
        self.assertIn('Missing required signatures', str(cm.exception))
        self.assertIn('verifier', str(cm.exception))
    
    def test_approve_requires_approver_signature(self):
        """Test that approval requires approver signature"""
        # Add required signatures
        with patch.object(signature_service, '_generate_signature_data', return_value='mock_signature'):
            signature_service.add_signature(self.permit, 'requestor', self.requestor)
            signature_service.add_signature(self.permit, 'verifier', self.verifier)
        
        # Transition through workflow
        canonical_workflow_manager.transition(
            permit=self.permit,
            new_status='pending_verification',
            user=self.requestor,
            action='initiate_workflow'
        )
        
        canonical_workflow_manager.transition(
            permit=self.permit,
            new_status='pending_approval',
            user=self.verifier,
            action='verify_approve'
        )
        
        # Try to approve without approver signature
        with self.assertRaises(PTWValidationError) as cm:
            canonical_workflow_manager.transition(
                permit=self.permit,
                new_status='approved',
                user=self.approver,
                action='approve_approve'
            )
        
        self.assertIn('Missing required signatures', str(cm.exception))
        self.assertIn('approver', str(cm.exception))
    
    def test_wrong_signer_rejected(self):
        """Test that wrong signer is rejected"""
        with patch.object(signature_service, '_generate_signature_data', return_value='mock_signature'):
            # Try to add verifier signature as requestor
            with self.assertRaises(PTWPermissionError) as cm:
                signature_service.add_signature(self.permit, 'verifier', self.requestor)
            
            self.assertIn('must be signed by', str(cm.exception))
    
    def test_success_path_with_all_signatures(self):
        """Test successful workflow with all required signatures"""
        with patch.object(signature_service, '_generate_signature_data', return_value='mock_signature'):
            # Add all required signatures
            signature_service.add_signature(self.permit, 'requestor', self.requestor)
            signature_service.add_signature(self.permit, 'verifier', self.verifier)
            signature_service.add_signature(self.permit, 'approver', self.approver)
        
        # Complete workflow
        canonical_workflow_manager.transition(
            permit=self.permit,
            new_status='pending_verification',
            user=self.requestor,
            action='initiate_workflow'
        )
        
        canonical_workflow_manager.transition(
            permit=self.permit,
            new_status='pending_approval',
            user=self.verifier,
            action='verify_approve'
        )
        
        canonical_workflow_manager.transition(
            permit=self.permit,
            new_status='approved',
            user=self.approver,
            action='approve_approve'
        )
        
        self.permit.refresh_from_db()
        self.assertEqual(self.permit.status, 'approved')
    
    def test_invalid_signature_type_rejected(self):
        """Test that invalid signature types are rejected"""
        with self.assertRaises(Exception) as cm:
            signature_service.add_signature(self.permit, 'invalid_type', self.requestor)
        
        self.assertIn('Invalid signature type', str(cm.exception))
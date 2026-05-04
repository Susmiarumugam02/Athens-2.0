"""
Basic test for consolidated PTW architecture
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from authentication.models import Project
from ptw.models import Permit, PermitType
from ptw.canonical_workflow_manager import canonical_workflow_manager
from ptw.signature_service import signature_service
from ptw.ptw_permissions import ptw_permissions
from ptw.unified_error_handling import PTWWorkflowError, PTWPermissionError

User = get_user_model()

class ConsolidatedArchitectureTest(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name='Test Project')
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            admin_type='epcuser',
            grade='B',
            project=self.project
        )
        
        self.permit_type = PermitType.objects.create(
            name='Test Permit Type',
            category='hot_work'
        )
        
        self.permit = Permit.objects.create(
            permit_number='TEST-001',
            permit_type=self.permit_type,
            title='Test Permit',
            description='Test Description',
            location='Test Location',
            planned_start_time='2024-01-01T10:00:00Z',
            planned_end_time='2024-01-01T18:00:00Z',
            created_by=self.user,
            project=self.project,
            status='draft'
        )
    
    def test_canonical_workflow_manager_enforces_transitions(self):
        """Test that canonical workflow manager enforces valid transitions"""
        # Valid transition should work
        permit = canonical_workflow_manager.transition(
            permit=self.permit,
            target_status='submitted',
            actor=self.user,
            comments='Test submission'
        )
        self.assertEqual(permit.status, 'submitted')
        
        # Invalid transition should fail
        with self.assertRaises(PTWWorkflowError):
            canonical_workflow_manager.transition(
                permit=self.permit,
                target_status='completed',  # Invalid: submitted -> completed
                actor=self.user
            )
    
    def test_permission_helper_enforces_project_scoping(self):
        """Test that permission helper enforces project scoping"""
        # Same project should allow view
        self.assertTrue(ptw_permissions.can_view_permit(self.user, self.permit))
        
        # Different project should deny
        other_project = Project.objects.create(name='Other Project')
        other_permit = Permit.objects.create(
            permit_number='OTHER-001',
            permit_type=self.permit_type,
            title='Other Permit',
            description='Other Description',
            location='Other Location',
            planned_start_time='2024-01-01T10:00:00Z',
            planned_end_time='2024-01-01T18:00:00Z',
            created_by=self.user,
            project=other_project,
            status='draft'
        )
        self.assertFalse(ptw_permissions.can_view_permit(self.user, other_permit))
    
    def test_signature_service_validates_authorization(self):
        """Test that signature service validates authorization"""
        from ptw.unified_error_handling import PTWPermissionError
        
        # User should be able to sign as requestor (created_by)
        try:
            signature = signature_service.add_signature(
                permit=self.permit,
                signature_type='requestor',
                user=self.user
            )
            self.assertEqual(signature.signature_type, 'requestor')
            self.assertEqual(signature.signatory, self.user)
        except Exception as e:
            self.fail(f"Requestor signature should succeed: {e}")
        
        # User should not be able to sign as verifier (not assigned)
        with self.assertRaises(PTWPermissionError):
            signature_service.add_signature(
                permit=self.permit,
                signature_type='verifier',
                user=self.user
            )
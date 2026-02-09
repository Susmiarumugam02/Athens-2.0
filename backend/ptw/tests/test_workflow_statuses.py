from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from authentication.models import Project
from ptw.models import Permit, PermitType, WorkflowStep
from ptw.workflow_manager import workflow_manager
from django.contrib.auth import get_user_model


User = get_user_model()


class WorkflowStatusTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name='PTW Project', code='PTW')
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work',
            risk_level='high'
        )

        self.requestor = User.objects.create_user(
            username='requestor',
            password='pass123',
            user_type='adminuser',
            admin_type='epcuser',
            grade='C',
            project=self.project
        )
        self.verifier = User.objects.create_user(
            username='verifier',
            password='pass123',
            user_type='adminuser',
            admin_type='epcuser',
            grade='B',
            project=self.project
        )
        self.approver = User.objects.create_user(
            username='approver',
            password='pass123',
            user_type='adminuser',
            admin_type='epcuser',
            grade='A',
            project=self.project
        )

        self.permit = Permit.objects.create(
            permit_number='PTW-STATUS-001',
            permit_type=self.permit_type,
            description='Workflow status test',
            location='Test Area',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(hours=8),
            created_by=self.requestor,
            project=self.project,
            status='draft'
        )

    def test_initiate_sets_submitted_status(self):
        workflow_manager.initiate_workflow(self.permit, self.requestor)
        self.permit.refresh_from_db()
        self.assertEqual(self.permit.status, 'submitted')

    def test_verification_sets_under_review_status(self):
        workflow_manager.initiate_workflow(self.permit, self.requestor)
        workflow_manager.assign_verifier(self.permit, self.verifier, self.requestor)
        workflow_manager.verify_permit(
            self.permit,
            self.verifier,
            action='approve',
            comments='ok',
            selected_approver=self.approver
        )
        self.permit.refresh_from_db()
        self.assertEqual(self.permit.status, 'under_review')

    def test_approval_sets_approved_status_and_skips_others(self):
        workflow_manager.initiate_workflow(self.permit, self.requestor)
        workflow_manager.assign_verifier(self.permit, self.verifier, self.requestor)
        workflow_manager.verify_permit(
            self.permit,
            self.verifier,
            action='approve',
            comments='ok',
            selected_approver=self.approver
        )
        workflow_manager.approve_permit(
            self.permit,
            self.approver,
            action='approve',
            comments='approved'
        )

        self.permit.refresh_from_db()
        self.assertEqual(self.permit.status, 'approved')
        self.assertFalse(
            WorkflowStep.objects.filter(workflow__permit=self.permit, status='obsolete').exists()
        )

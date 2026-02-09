"""
Tests for PR9 - Notifications and Escalations
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from ptw.models import Permit, PermitType, WorkflowStep, WorkflowInstance, EscalationRule
from ptw.notification_utils import (
    create_ptw_notification, notify_permit_submitted, notify_verifier_assigned,
    notify_approver_assigned, notify_permit_approved, notify_permit_rejected
)
from ptw.tasks import check_overdue_workflow_tasks, auto_expire_permits
from authentication.models_notification import Notification
from authentication.models import Project

User = get_user_model()


class NotificationUtilsTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            name='Test',
            surname='User'
        )
        
        self.project = Project.objects.create(
            name='Test Project',
            code='TEST'
        )
        self.user.project = self.project
        self.user.save()
        
        self.permit_type = PermitType.objects.create(
            name='Test Permit',
            category='electrical',
            risk_level='high'
        )
        
        self.permit = Permit.objects.create(
            permit_type=self.permit_type,
            description='Test work',
            location='Test location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(hours=8),
            created_by=self.user,
            project=self.project
        )
    
    def test_create_ptw_notification(self):
        """Test creating PTW notification"""
        notification = create_ptw_notification(
            user_id=self.user.id,
            event_type='ptw_created',
            permit=self.permit
        )
        
        self.assertIsNotNone(notification)
        self.assertEqual(notification.user_id, self.user.id)
        self.assertEqual(notification.notification_type, 'ptw_created')
        self.assertEqual(notification.data['permit_id'], self.permit.id)
        self.assertIn('/dashboard/ptw/view/', notification.link)
    
    def test_notification_idempotency(self):
        """Test that duplicate notifications are not created"""
        # Create first notification
        notif1 = create_ptw_notification(
            user_id=self.user.id,
            event_type='ptw_created',
            permit=self.permit
        )
        
        # Try to create duplicate
        notif2 = create_ptw_notification(
            user_id=self.user.id,
            event_type='ptw_created',
            permit=self.permit
        )
        
        self.assertIsNotNone(notif1)
        self.assertIsNone(notif2)  # Should be None due to deduplication
        
        # Check only one notification exists
        count = Notification.objects.filter(
            user=self.user,
            notification_type='ptw_created',
            data__permit_id=self.permit.id
        ).count()
        self.assertEqual(count, 1)
    
    def test_notify_permit_submitted(self):
        """Test notification when permit is submitted"""
        notify_permit_submitted(self.permit)
        
        notification = Notification.objects.filter(
            user=self.user,
            notification_type='ptw_submitted'
        ).first()
        
        self.assertIsNotNone(notification)
        self.assertIn(self.permit.permit_number, notification.message)
    
    def test_notify_verifier_assigned(self):
        """Test notification when verifier is assigned"""
        verifier = User.objects.create_user(
            username='verifier',
            email='verifier@example.com',
            password='testpass123'
        )
        
        notify_verifier_assigned(self.permit, verifier.id)
        
        notification = Notification.objects.filter(
            user=verifier,
            notification_type='ptw_verification'
        ).first()
        
        self.assertIsNotNone(notification)
        self.assertTrue(notification.data.get('action_required'))
    
    def test_notify_permit_approved(self):
        """Test notification when permit is approved"""
        approver = User.objects.create_user(
            username='approver',
            email='approver@example.com',
            password='testpass123'
        )
        
        notify_permit_approved(self.permit, approver.id)
        
        # Creator should receive notification
        notification = Notification.objects.filter(
            user=self.user,
            notification_type='ptw_approved'
        ).first()
        
        self.assertIsNotNone(notification)
        self.assertIn('approved', notification.message.lower())


class EscalationTaskTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            name='Test',
            surname='User'
        )
        
        self.project = Project.objects.create(
            name='Test Project',
            code='TEST'
        )
        self.user.project = self.project
        self.user.save()
        
        self.permit_type = PermitType.objects.create(
            name='Test Permit',
            category='electrical',
            risk_level='high'
        )
        
        self.permit = Permit.objects.create(
            permit_type=self.permit_type,
            description='Test work',
            location='Test location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='submitted'
        )
        
        # Create workflow
        self.workflow = WorkflowInstance.objects.create(
            permit=self.permit,
            status='active',
            started_at=timezone.now() - timedelta(hours=5)  # 5 hours ago
        )
        
        # Create overdue workflow step
        self.step = WorkflowStep.objects.create(
            workflow=self.workflow,
            step_id='verification',
            name='Verification',
            step_type='verification',
            assignee=self.user,
            status='pending',
            order=1
        )
        
        # Create escalation rule
        self.escalation_rule = EscalationRule.objects.create(
            permit_type=self.permit_type,
            step_name='Verification',
            time_limit_hours=4,
            escalate_to_role='manager',
            is_active=True
        )
    
    def test_escalation_task_creates_notification(self):
        """Test that escalation task creates notifications for overdue steps"""
        # Enable escalations
        with self.settings(ESCALATIONS_ENABLED=True):
            check_overdue_workflow_tasks()
        
        # Check if overdue notification was created
        notification = Notification.objects.filter(
            user=self.user,
            notification_type='ptw_overdue'
        ).first()
        
        self.assertIsNotNone(notification)
        self.assertIn('overdue', notification.message.lower())
    
    def test_escalation_idempotency(self):
        """Test that escalation task doesn't create duplicate notifications"""
        with self.settings(ESCALATIONS_ENABLED=True):
            # Run task twice
            check_overdue_workflow_tasks()
            check_overdue_workflow_tasks()
        
        # Should only have one notification
        count = Notification.objects.filter(
            user=self.user,
            notification_type='ptw_overdue',
            data__step_id=self.step.id
        ).count()
        
        self.assertLessEqual(count, 1)


class AutoExpirePermitsTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.project = Project.objects.create(
            name='Test Project',
            code='TEST'
        )
        
        self.permit_type = PermitType.objects.create(
            name='Test Permit',
            category='electrical'
        )
        
        # Create expired permit
        self.permit = Permit.objects.create(
            permit_type=self.permit_type,
            description='Test work',
            location='Test location',
            planned_start_time=timezone.now() - timedelta(hours=10),
            planned_end_time=timezone.now() - timedelta(hours=2),  # Expired 2 hours ago
            created_by=self.user,
            project=self.project,
            status='active'
        )
    
    def test_auto_expire_permits_task(self):
        """Test that auto_expire_permits task expires permits and sends notifications"""
        auto_expire_permits()
        
        # Check permit status changed
        self.permit.refresh_from_db()
        self.assertEqual(self.permit.status, 'expired')
        
        # Check notification was created
        notification = Notification.objects.filter(
            user=self.user,
            notification_type='ptw_expired'
        ).first()
        
        self.assertIsNotNone(notification)
        self.assertIn(self.permit.permit_number, notification.message)

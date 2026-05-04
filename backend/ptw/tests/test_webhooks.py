from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, Mock
from ..models import WebhookEndpoint, WebhookDeliveryLog
from ..webhook_dispatcher import sign_payload, send_webhook, trigger_webhooks
from ..models import Permit, PermitType
from authentication.models import Project

User = get_user_model()


class WebhookSignatureTest(TestCase):
    def test_signature_generation(self):
        """Test HMAC signature is generated correctly"""
        payload = {'event': 'test', 'data': 'value'}
        secret = 'test_secret_key'
        
        sig1 = sign_payload(payload, secret)
        sig2 = sign_payload(payload, secret)
        
        # Same payload + secret = same signature
        self.assertEqual(sig1, sig2)
        
        # Different secret = different signature
        sig3 = sign_payload(payload, 'different_secret')
        self.assertNotEqual(sig1, sig3)


class WebhookCRUDTest(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name='Test Project')
        self.admin_user = User.objects.create_user(
            username='admin',
            password='pass',
            usertype='clientuser',
            grade='A',
            project=self.project
        )
        self.client.force_login(self.admin_user)
    
    def test_create_webhook(self):
        """Test webhook creation via API"""
        response = self.client.post('/api/v1/ptw/webhooks/', {
            'name': 'Test Webhook',
            'url': 'https://example.com/webhook',
            'secret': 'my_secret_key',
            'enabled': True,
            'events': ['permit_approved', 'permit_rejected'],
            'project': self.project.id
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(WebhookEndpoint.objects.count(), 1)
        
        webhook = WebhookEndpoint.objects.first()
        self.assertEqual(webhook.name, 'Test Webhook')
        self.assertEqual(webhook.created_by, self.admin_user)
    
    def test_non_admin_cannot_create_webhook(self):
        """Test non-admin users cannot create webhooks"""
        regular_user = User.objects.create_user(
            username='regular',
            password='pass',
            usertype='contractoruser',
            grade='C',
            project=self.project
        )
        self.client.force_login(regular_user)
        
        response = self.client.post('/api/v1/ptw/webhooks/', {
            'name': 'Test',
            'url': 'https://example.com/webhook',
            'secret': 'secret',
            'events': ['permit_approved']
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 403)


class WebhookDeliveryTest(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name='Test Project')
        self.user = User.objects.create_user(
            username='user',
            password='pass',
            project=self.project
        )
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            risk_level='high'
        )
        self.permit = Permit.objects.create(
            permit_number='PTW-001',
            permit_type=self.permit_type,
            project=self.project,
            created_by=self.user,
            title='Test Permit',
            description='Test Description',
            location='Test Location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(hours=1),
            status='approved'
        )
        self.webhook = WebhookEndpoint.objects.create(
            name='Test Webhook',
            url='https://example.com/webhook',
            secret='test_secret',
            enabled=True,
            events=['permit_approved'],
            project=self.project
        )
    
    @patch('requests.post')
    def test_webhook_delivery_success(self, mock_post):
        """Test successful webhook delivery"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = 'OK'
        mock_post.return_value = mock_response
        
        send_webhook(self.webhook, 'permit_approved', self.permit)
        
        # Check request was made
        self.assertTrue(mock_post.called)
        call_args = mock_post.call_args
        
        # Check signature header
        headers = call_args[1]['headers']
        self.assertIn('X-Athens-Signature', headers)
        self.assertTrue(headers['X-Athens-Signature'].startswith('sha256='))
        
        # Check log created
        self.assertEqual(WebhookDeliveryLog.objects.count(), 1)
        log = WebhookDeliveryLog.objects.first()
        self.assertEqual(log.status, 'success')
        self.assertEqual(log.response_code, 200)
    
    @patch('requests.post')
    def test_webhook_delivery_failure(self, mock_post):
        """Test failed webhook delivery"""
        mock_post.side_effect = Exception('Connection timeout')
        
        send_webhook(self.webhook, 'permit_approved', self.permit)
        
        # Check log created with error
        log = WebhookDeliveryLog.objects.first()
        self.assertEqual(log.status, 'failed')
        self.assertIn('Connection timeout', log.error)
    
    @patch('requests.post')
    def test_webhook_idempotency(self, mock_post):
        """Test webhook is not sent twice for same event"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = 'OK'
        mock_post.return_value = mock_response
        
        # Send twice
        send_webhook(self.webhook, 'permit_approved', self.permit)
        send_webhook(self.webhook, 'permit_approved', self.permit)
        
        # Should only be called once
        self.assertEqual(mock_post.call_count, 1)
        self.assertEqual(WebhookDeliveryLog.objects.count(), 1)

    @patch('ptw.webhook_dispatcher._get_delivery_task')
    @patch('ptw.webhook_dispatcher.requests.post')
    def test_trigger_webhooks_fallback_timeout(self, mock_post, mock_task):
        """Fallback sends synchronously with strict timeout when no task is available"""
        mock_task.return_value = None
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = 'OK'
        mock_post.return_value = mock_response

        trigger_webhooks('permit_approved', self.permit)

        self.assertTrue(mock_post.called)
        timeout = mock_post.call_args[1].get('timeout')
        self.assertEqual(timeout, 5)

    @patch('ptw.webhook_dispatcher._get_delivery_task')
    def test_trigger_webhooks_queues_delivery(self, mock_task):
        """Queue mode creates delivery logs and calls task delay"""
        task = Mock()
        task.delay = Mock()
        mock_task.return_value = task

        trigger_webhooks('permit_approved', self.permit)

        self.assertTrue(task.delay.called)
        log = WebhookDeliveryLog.objects.first()
        self.assertEqual(log.status, 'queued')


class WebhookProjectScopingTest(TestCase):
    def setUp(self):
        self.project1 = Project.objects.create(name='Project 1')
        self.project2 = Project.objects.create(name='Project 2')
        
        self.user1 = User.objects.create_user(
            username='user1',
            password='pass',
            project=self.project1
        )
        self.user2 = User.objects.create_user(
            username='user2',
            password='pass',
            project=self.project2
        )
        
        self.permit_type = PermitType.objects.create(name='Test', risk_level='low')
        
        self.permit1 = Permit.objects.create(
            permit_number='PTW-001',
            permit_type=self.permit_type,
            project=self.project1,
            created_by=self.user1,
            title='Test Permit',
            description='Test Description',
            location='Loc1',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(hours=1),
            status='approved'
        )
        
        self.webhook1 = WebhookEndpoint.objects.create(
            name='Webhook 1',
            url='https://example.com/webhook1',
            secret='secret1',
            enabled=True,
            events=['permit_approved'],
            project=self.project1
        )
        
        self.webhook2 = WebhookEndpoint.objects.create(
            name='Webhook 2',
            url='https://example.com/webhook2',
            secret='secret2',
            enabled=True,
            events=['permit_approved'],
            project=self.project2
        )
    
    @patch('ptw.webhook_dispatcher._get_delivery_task')
    @patch('requests.post')
    def test_only_correct_project_webhook_fires(self, mock_post, mock_task):
        """Test only webhooks for correct project are triggered"""
        mock_task.return_value = None
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = 'OK'
        mock_post.return_value = mock_response
        
        trigger_webhooks('permit_approved', self.permit1)
        
        # Only webhook1 should fire (project1)
        self.assertEqual(WebhookDeliveryLog.objects.count(), 1)
        log = WebhookDeliveryLog.objects.first()
        self.assertEqual(log.webhook, self.webhook1)


class WebhookDedupePerEndpointTest(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name='Test Project')
        self.user = User.objects.create_user(
            username='user',
            password='pass',
            project=self.project
        )
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            risk_level='high'
        )
        self.permit = Permit.objects.create(
            permit_number='PTW-001',
            permit_type=self.permit_type,
            project=self.project,
            created_by=self.user,
            title='Test Permit',
            description='Test Description',
            location='Test Location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(hours=1),
            status='approved'
        )
        self.webhook1 = WebhookEndpoint.objects.create(
            name='Webhook 1',
            url='https://example.com/webhook1',
            secret='secret1',
            enabled=True,
            events=['permit_approved'],
            project=self.project
        )
        self.webhook2 = WebhookEndpoint.objects.create(
            name='Webhook 2',
            url='https://example.com/webhook2',
            secret='secret2',
            enabled=True,
            events=['permit_approved'],
            project=self.project
        )

    @patch('ptw.webhook_dispatcher._get_delivery_task')
    @patch('ptw.webhook_dispatcher.requests.post')
    def test_dedupe_is_per_webhook(self, mock_post, mock_task):
        mock_task.return_value = None
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = 'OK'
        mock_post.return_value = mock_response

        trigger_webhooks('permit_approved', self.permit)
        self.assertEqual(WebhookDeliveryLog.objects.count(), 2)

        trigger_webhooks('permit_approved', self.permit)
        self.assertEqual(WebhookDeliveryLog.objects.count(), 2)

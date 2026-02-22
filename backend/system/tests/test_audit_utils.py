"""
Unit tests for centralized audit logging
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from system.audit_utils import audit_log, _get_client_ip, AuditLogMixin


class TestAuditLogFunction:
    """Test audit_log() function"""
    
    def test_audit_log_captures_user_info(self):
        """Test that audit_log captures user information"""
        request = Mock()
        request.user = Mock(is_authenticated=True, id=1, email='test@example.com')
        request.META = {'REMOTE_ADDR': '127.0.0.1', 'HTTP_USER_AGENT': 'TestAgent'}
        request.tenant = Mock(id=100)
        
        with patch('control_plane.models.AthensAuditLog') as mock_log:
            mock_log.objects.create = Mock(return_value=Mock())
            
            result = audit_log(
                request,
                'test.action',
                target_type='TestModel',
                target_id=42,
                status='SUCCESS',
                meta={'key': 'value'}
            )
            
            assert result is True
            mock_log.objects.create.assert_called_once()
            call_kwargs = mock_log.objects.create.call_args[1]
            assert call_kwargs['actor_id'] == 1
            assert call_kwargs['action'] == 'test.action'
            assert call_kwargs['entity_type'] == 'TestModel'
            assert call_kwargs['entity_id'] == '42'
    
    def test_audit_log_handles_anonymous_user(self):
        """Test that audit_log handles unauthenticated users"""
        request = Mock()
        request.user = Mock(is_authenticated=False)
        request.META = {'REMOTE_ADDR': '127.0.0.1'}
        
        with patch('control_plane.models.AthensAuditLog') as mock_log:
            mock_log.objects.create = Mock(return_value=Mock())
            
            result = audit_log(request, 'test.action')
            
            assert result is True
            call_kwargs = mock_log.objects.create.call_args[1]
            assert call_kwargs['actor_id'] is None
    
    def test_audit_log_never_raises_exception(self):
        """Test that audit_log never raises exceptions"""
        request = Mock()
        request.user = Mock(is_authenticated=True, id=1, email='test@example.com')
        request.META = {}
        
        with patch('control_plane.models.AthensAuditLog') as mock_log:
            mock_log.objects.create.side_effect = Exception("Database error")
            
            # Should not raise, should return False
            result = audit_log(request, 'test.action')
            assert result is False
    
    def test_get_client_ip_handles_proxy(self):
        """Test IP extraction with X-Forwarded-For header"""
        request = Mock()
        request.META = {'HTTP_X_FORWARDED_FOR': '1.2.3.4, 5.6.7.8'}
        
        ip = _get_client_ip(request)
        assert ip == '1.2.3.4'
    
    def test_get_client_ip_fallback_to_remote_addr(self):
        """Test IP extraction fallback to REMOTE_ADDR"""
        request = Mock()
        request.META = {'REMOTE_ADDR': '9.10.11.12'}
        
        ip = _get_client_ip(request)
        assert ip == '9.10.11.12'
    
    def test_get_client_ip_handles_missing_headers(self):
        """Test IP extraction with missing headers"""
        request = Mock()
        request.META = {}
        
        ip = _get_client_ip(request)
        assert ip is None


class TestAuditLogMixin:
    """Test AuditLogMixin for DRF ViewSets"""
    
    def test_mixin_logs_on_create(self):
        """Test that mixin logs on perform_create"""
        mixin = AuditLogMixin()
        mixin.audit_action_map = {'create': 'resource.create'}
        mixin.audit_target_type = 'Resource'
        mixin.request = Mock()
        mixin.request.user = Mock(is_authenticated=True, id=1, email='test@example.com')
        mixin.request.META = {}
        
        serializer = Mock()
        instance = Mock(pk=123)
        serializer.save.return_value = instance
        
        with patch('system.audit_utils.audit_log') as mock_audit:
            result = mixin.perform_create(serializer)
            
            assert result == instance
            mock_audit.assert_called_once()
            call_args = mock_audit.call_args
            assert call_args[0][1] == 'resource.create'
            assert call_args[1]['target_id'] == 123
    
    def test_mixin_logs_on_update(self):
        """Test that mixin logs on perform_update"""
        mixin = AuditLogMixin()
        mixin.audit_action_map = {'update': 'resource.update'}
        mixin.audit_target_type = 'Resource'
        mixin.request = Mock()
        mixin.request.user = Mock(is_authenticated=True, id=1, email='test@example.com')
        mixin.request.META = {}
        
        serializer = Mock()
        instance = Mock(pk=456)
        serializer.save.return_value = instance
        
        with patch('system.audit_utils.audit_log') as mock_audit:
            result = mixin.perform_update(serializer)
            
            assert result == instance
            mock_audit.assert_called_once()
            call_args = mock_audit.call_args
            assert call_args[0][1] == 'resource.update'
    
    def test_mixin_logs_on_destroy(self):
        """Test that mixin logs on perform_destroy"""
        mixin = AuditLogMixin()
        mixin.audit_action_map = {'destroy': 'resource.delete'}
        mixin.audit_target_type = 'Resource'
        mixin.request = Mock()
        mixin.request.user = Mock(is_authenticated=True, id=1, email='test@example.com')
        mixin.request.META = {}
        
        instance = Mock(pk=789)
        instance.delete = Mock()
        
        with patch('system.audit_utils.audit_log') as mock_audit:
            mixin.perform_destroy(instance)
            
            instance.delete.assert_called_once()
            mock_audit.assert_called_once()
            call_args = mock_audit.call_args
            assert call_args[0][1] == 'resource.delete'

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from authentication.models import User, UserType
from superadmin.models import AuditLog, Role, Announcement


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def superadmin_user(db):
    return User.objects.create_user(
        email='superadmin@test.com',
        password='testpass123',
        user_type=UserType.SUPERADMIN,
        is_active=True
    )


@pytest.fixture
def authenticated_client(api_client, superadmin_user):
    api_client.force_authenticate(user=superadmin_user)
    return api_client


@pytest.mark.django_db
class TestAuditLogging:
    """Test that critical actions create audit log entries"""
    
    def test_user_create_logs_audit(self, authenticated_client, superadmin_user):
        initial_count = AuditLog.objects.count()
        
        data = {
            'email': 'newuser@test.com',
            'password': 'testpass123',
            'role_ids': []
        }
        response = authenticated_client.post('/api/superadmin/users/', data)
        assert response.status_code == status.HTTP_201_CREATED
        
        assert AuditLog.objects.count() == initial_count + 1
        log = AuditLog.objects.latest('timestamp')
        assert log.action == 'users.create'
        assert log.module == 'users'
        assert log.user == superadmin_user
        assert log.status == 'success'
    
    def test_role_create_logs_audit(self, authenticated_client, superadmin_user):
        initial_count = AuditLog.objects.count()
        
        data = {'name': 'Test Role', 'description': 'Test'}
        response = authenticated_client.post('/api/superadmin/roles/', data)
        assert response.status_code == status.HTTP_201_CREATED
        
        assert AuditLog.objects.count() == initial_count + 1
        log = AuditLog.objects.latest('timestamp')
        assert log.action == 'roles.create'
        assert log.module == 'roles'
    
    def test_password_policy_update_logs_audit(self, authenticated_client):
        initial_count = AuditLog.objects.count()
        
        data = {'min_length': 12}
        response = authenticated_client.put('/api/superadmin/security/password-policy/', data)
        assert response.status_code == status.HTTP_200_OK
        
        assert AuditLog.objects.count() == initial_count + 1
        log = AuditLog.objects.latest('timestamp')
        assert log.action == 'security.update_password_policy'
        assert log.module == 'security'
    
    def test_maintenance_toggle_logs_audit(self, authenticated_client):
        initial_count = AuditLog.objects.count()
        
        response = authenticated_client.post('/api/superadmin/settings/maintenance/')
        assert response.status_code == status.HTTP_200_OK
        
        assert AuditLog.objects.count() == initial_count + 1
        log = AuditLog.objects.latest('timestamp')
        assert log.action == 'settings.toggle_maintenance_mode'
        assert log.module == 'settings'
    
    def test_announcement_create_logs_audit(self, authenticated_client):
        initial_count = AuditLog.objects.count()
        
        data = {
            'title': 'Test Announcement',
            'message': 'Test message',
            'type': 'info',
            'target_audience': 'all'
        }
        response = authenticated_client.post('/api/superadmin/announcements/', data)
        assert response.status_code == status.HTTP_201_CREATED
        
        assert AuditLog.objects.count() == initial_count + 1
        log = AuditLog.objects.latest('timestamp')
        assert log.action == 'notifications.create_announcement'
        assert log.module == 'notifications'
    
    def test_ip_restriction_create_logs_audit(self, authenticated_client):
        initial_count = AuditLog.objects.count()
        
        data = {
            'ip_address': '192.168.1.1',
            'restriction_type': 'whitelist',
            'description': 'Test IP'
        }
        response = authenticated_client.post('/api/superadmin/security/ip-restrictions/', data)
        assert response.status_code == status.HTTP_201_CREATED
        
        assert AuditLog.objects.count() == initial_count + 1
        log = AuditLog.objects.latest('timestamp')
        assert log.action == 'security.create_ip_restriction'
        assert log.module == 'security'

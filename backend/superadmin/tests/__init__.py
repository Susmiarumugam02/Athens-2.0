import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from authentication.models import User, UserType
from superadmin.models import Role, Permission, RolePermission, UserRole


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def superadmin_user(db):
    """Create a superadmin user"""
    user = User.objects.create_user(
        email='superadmin@test.com',
        password='testpass123',
        user_type=UserType.SUPERADMIN,
        is_active=True
    )
    return user


@pytest.fixture
def authenticated_client(api_client, superadmin_user):
    """Return an authenticated API client"""
    api_client.force_authenticate(user=superadmin_user)
    return api_client


@pytest.fixture
def sample_role(db):
    """Create a sample role"""
    return Role.objects.create(
        name='Test Role',
        description='Test role description'
    )


@pytest.fixture
def sample_permission(db):
    """Create a sample permission"""
    return Permission.objects.create(
        codename='test.view',
        name='Test View',
        module='test',
        action='view'
    )


class TestDashboardAPI:
    def test_dashboard_stats_requires_auth(self, api_client):
        """Test that dashboard stats requires authentication"""
        url = reverse('dashboard-stats')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_dashboard_stats_success(self, authenticated_client):
        """Test dashboard stats returns data"""
        url = reverse('dashboard-stats')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'total_users' in response.data
        assert 'active_sessions' in response.data


class TestRolesAPI:
    def test_list_roles(self, authenticated_client, sample_role):
        """Test listing roles"""
        url = reverse('superadmin-roles-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
    
    def test_create_role(self, authenticated_client):
        """Test creating a role"""
        url = reverse('superadmin-roles-list')
        data = {
            'name': 'New Role',
            'description': 'New role description'
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Role'
    
    def test_cannot_delete_system_role(self, authenticated_client):
        """Test that system roles cannot be deleted"""
        role = Role.objects.create(
            name='System Role',
            is_system_role=True
        )
        url = reverse('superadmin-roles-detail', args=[role.id])
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestPermissionsAPI:
    def test_list_permissions(self, authenticated_client, sample_permission):
        """Test listing permissions"""
        url = reverse('superadmin-permissions-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
    
    def test_filter_permissions_by_module(self, authenticated_client, sample_permission):
        """Test filtering permissions by module"""
        url = reverse('superadmin-permissions-list')
        response = authenticated_client.get(url, {'module': 'test'})
        assert response.status_code == status.HTTP_200_OK
        assert all(p['module'] == 'test' for p in response.data)


class TestUsersAPI:
    def test_list_users(self, authenticated_client, superadmin_user):
        """Test listing users"""
        url = reverse('superadmin-users-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
    
    def test_reset_password(self, authenticated_client, superadmin_user):
        """Test resetting user password"""
        url = reverse('superadmin-users-reset-password', args=[superadmin_user.id])
        response = authenticated_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'temporary_password' in response.data


class TestAuditLogsAPI:
    def test_list_audit_logs(self, authenticated_client):
        """Test listing audit logs"""
        url = reverse('superadmin-audit-logs-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data

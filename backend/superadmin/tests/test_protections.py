import pytest
from rest_framework import status
from rest_framework.test import APIClient
from authentication.models import User, UserType
from superadmin.models import Role, Permission, UserRole, Announcement, NotificationDelivery


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
class TestProtectedBehaviors:
    """Test protected business logic and guard rails"""
    
    def test_system_role_cannot_be_deleted(self, authenticated_client):
        # Create a system role
        role = Role.objects.create(
            name='System Role',
            description='Test',
            is_system_role=True
        )
        
        response = authenticated_client.delete(f'/api/superadmin/roles/{role.id}/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'system role' in response.data['error'].lower()
        
        # Verify role still exists
        assert Role.objects.filter(id=role.id).exists()
    
    def test_role_with_users_cannot_be_deleted(self, authenticated_client, superadmin_user):
        # Create role and assign to user
        role = Role.objects.create(name='Test Role', description='Test')
        UserRole.objects.create(user=superadmin_user, role=role, assigned_by=superadmin_user)
        
        response = authenticated_client.delete(f'/api/superadmin/roles/{role.id}/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'assigned users' in response.data['error'].lower()
        
        # Verify role still exists
        assert Role.objects.filter(id=role.id).exists()
    
    def test_role_without_users_can_be_deleted(self, authenticated_client):
        role = Role.objects.create(name='Empty Role', description='Test')
        
        response = authenticated_client.delete(f'/api/superadmin/roles/{role.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify role deleted
        assert not Role.objects.filter(id=role.id).exists()
    
    def test_ip_restriction_crud(self, authenticated_client):
        # Create
        data = {
            'ip_address': '10.0.0.1',
            'restriction_type': 'blacklist',
            'description': 'Test restriction'
        }
        response = authenticated_client.post('/api/superadmin/security/ip-restrictions/', data)
        assert response.status_code == status.HTTP_201_CREATED
        restriction_id = response.data['id']
        
        # Read
        response = authenticated_client.get(f'/api/superadmin/security/ip-restrictions/{restriction_id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['ip_address'] == '10.0.0.1'
        
        # Delete
        response = authenticated_client.delete(f'/api/superadmin/security/ip-restrictions/{restriction_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
    
    def test_announcement_auto_creates_deliveries_for_all(self, authenticated_client, superadmin_user):
        # Create additional superadmin users
        User.objects.create_user(
            email='admin2@test.com',
            password='test',
            user_type=UserType.SUPERADMIN,
            is_active=True
        )
        User.objects.create_user(
            email='admin3@test.com',
            password='test',
            user_type=UserType.SUPERADMIN,
            is_active=True
        )
        
        data = {
            'title': 'Test Announcement',
            'message': 'Test message',
            'type': 'info',
            'target_audience': 'all'
        }
        response = authenticated_client.post('/api/superadmin/announcements/', data)
        assert response.status_code == status.HTTP_201_CREATED
        announcement_id = response.data['id']
        
        # Verify deliveries created for all superadmin users
        deliveries = NotificationDelivery.objects.filter(announcement_id=announcement_id)
        assert deliveries.count() == 3  # 3 superadmin users
        assert all(d.delivery_status == 'pending' for d in deliveries)
    
    def test_announcement_auto_creates_deliveries_for_roles(self, authenticated_client, superadmin_user):
        # Create role and assign to user
        role = Role.objects.create(name='Test Role', description='Test')
        UserRole.objects.create(user=superadmin_user, role=role, assigned_by=superadmin_user)
        
        # Create another user without the role
        User.objects.create_user(
            email='admin2@test.com',
            password='test',
            user_type=UserType.SUPERADMIN,
            is_active=True
        )
        
        data = {
            'title': 'Test Announcement',
            'message': 'Test message',
            'type': 'info',
            'target_audience': 'roles',
            'target_roles': [role.id]
        }
        response = authenticated_client.post('/api/superadmin/announcements/', data)
        assert response.status_code == status.HTTP_201_CREATED
        announcement_id = response.data['id']
        
        # Verify deliveries created only for users with the role
        deliveries = NotificationDelivery.objects.filter(announcement_id=announcement_id)
        assert deliveries.count() == 1  # Only superadmin_user has the role
        assert deliveries.first().user == superadmin_user


@pytest.mark.django_db
class TestCRUDOperations:
    """Test basic CRUD operations work correctly"""
    
    def test_user_crud(self, authenticated_client):
        # Create
        data = {
            'email': 'testuser@test.com',
            'password': 'testpass123',
            'role_ids': []
        }
        response = authenticated_client.post('/api/superadmin/users/', data)
        assert response.status_code == status.HTTP_201_CREATED
        user_id = response.data['id']
        
        # Read
        response = authenticated_client.get(f'/api/superadmin/users/{user_id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == 'testuser@test.com'
        
        # Update
        data = {'is_active': False}
        response = authenticated_client.patch(f'/api/superadmin/users/{user_id}/', data)
        assert response.status_code == status.HTTP_200_OK
        
        # Delete
        response = authenticated_client.delete(f'/api/superadmin/users/{user_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
    
    def test_role_crud(self, authenticated_client):
        # Create
        data = {'name': 'Test Role', 'description': 'Test description'}
        response = authenticated_client.post('/api/superadmin/roles/', data)
        assert response.status_code == status.HTTP_201_CREATED
        role_id = response.data['id']
        
        # Read
        response = authenticated_client.get(f'/api/superadmin/roles/{role_id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Test Role'
        
        # Update
        data = {'description': 'Updated description'}
        response = authenticated_client.patch(f'/api/superadmin/roles/{role_id}/', data)
        assert response.status_code == status.HTTP_200_OK
        
        # Delete (should work since no users assigned)
        response = authenticated_client.delete(f'/api/superadmin/roles/{role_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
    
    def test_announcement_crud(self, authenticated_client):
        # Create
        data = {
            'title': 'Test',
            'message': 'Test message',
            'type': 'info',
            'target_audience': 'all'
        }
        response = authenticated_client.post('/api/superadmin/announcements/', data)
        assert response.status_code == status.HTTP_201_CREATED
        announcement_id = response.data['id']
        
        # Read
        response = authenticated_client.get(f'/api/superadmin/announcements/{announcement_id}/')
        assert response.status_code == status.HTTP_200_OK
        
        # Update
        data = {'title': 'Updated Title'}
        response = authenticated_client.patch(f'/api/superadmin/announcements/{announcement_id}/', data)
        assert response.status_code == status.HTTP_200_OK
        
        # Delete
        response = authenticated_client.delete(f'/api/superadmin/announcements/{announcement_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

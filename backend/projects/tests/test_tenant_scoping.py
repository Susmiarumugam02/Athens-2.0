"""
Integration tests for tenant scoping in Projects module.
Verifies tenant isolation and permission correctness using canonical tenant helper.
"""
import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import User, UserType
from control_plane.models import Tenant
from projects.models import Project, ProjectMembership


@pytest.mark.django_db
class ProjectTenantScopingTests(TestCase):
    """Test tenant isolation and scoping for Projects module."""
    
    def setUp(self):
        """Create test tenants, users, and projects."""
        # Create tenants
        self.tenant_a = Tenant.objects.create(
            name="Tenant A",
            is_active=True
        )
        self.tenant_b = Tenant.objects.create(
            name="Tenant B",
            is_active=True
        )
        
        # Create MasterAdmin users (use tenant FK)
        self.master_a = User.objects.create_user(
            email="master_a@example.com",
            password="testpass123",
            user_type=UserType.MASTERADMIN,
            tenant=self.tenant_a,
            company_id=self.tenant_a.id
        )
        self.master_b = User.objects.create_user(
            email="master_b@example.com",
            password="testpass123",
            user_type=UserType.MASTERADMIN,
            tenant=self.tenant_b,
            company_id=self.tenant_b.id
        )
        
        # Create CompanyUser for tenant A
        self.company_user_a = User.objects.create_user(
            email="user_a@example.com",
            password="testpass123",
            user_type=UserType.COMPANYUSER,
            company_id=self.tenant_a.id
        )
        
        # Create SuperAdmin
        self.superadmin = User.objects.create_user(
            email="super@example.com",
            password="testpass123",
            user_type=UserType.SUPERADMIN
        )
        
        # Create projects for each tenant
        self.project_a = Project.objects.create(
            company=self.tenant_a,
            name="Project A",
            code="proj-a",
            created_by=self.master_a
        )
        self.project_b = Project.objects.create(
            company=self.tenant_b,
            name="Project B",
            code="proj-b",
            created_by=self.master_b
        )
        
        # Add company_user_a as member of project_a
        ProjectMembership.objects.create(
            project=self.project_a,
            user=self.company_user_a,
            role="member",
            is_active=True,
            created_by=self.master_a
        )
        
        self.client = APIClient()
    
    def test_tenant_isolation_masteradmin_cannot_see_other_tenant_projects(self):
        """Test 1: Tenant A MasterAdmin cannot see Tenant B projects."""
        self.client.force_authenticate(user=self.master_a)
        response = self.client.get('/api/projects/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        project_ids = [p['id'] for p in response.data]
        
        # Should see only tenant A projects
        self.assertIn(self.project_a.id, project_ids)
        self.assertNotIn(self.project_b.id, project_ids)
    
    def test_correct_scoping_masteradmin_sees_own_tenant_projects(self):
        """Test 2: Tenant A MasterAdmin sees only Tenant A projects."""
        self.client.force_authenticate(user=self.master_a)
        response = self.client.get('/api/projects/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.project_a.id)
        self.assertEqual(response.data[0]['name'], "Project A")
    
    def test_permission_blocks_cross_tenant_access(self):
        """Test 3: Tenant A MasterAdmin cannot access Tenant B project by ID."""
        self.client.force_authenticate(user=self.master_a)
        response = self.client.get(f'/api/projects/{self.project_b.id}/')
        
        # Should return 404 (not in queryset) or 403 (permission denied)
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
    
    def test_superadmin_sees_all_projects(self):
        """Test 4: SuperAdmin sees projects from all tenants."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/projects/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        project_ids = [p['id'] for p in response.data]
        
        # Should see both tenant projects
        self.assertIn(self.project_a.id, project_ids)
        self.assertIn(self.project_b.id, project_ids)
    
    def test_company_user_sees_only_member_projects(self):
        """Test 5: CompanyUser sees only projects they are members of."""
        self.client.force_authenticate(user=self.company_user_a)
        response = self.client.get('/api/projects/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.project_a.id)
    
    def test_project_creation_uses_canonical_tenant(self):
        """Test 6: Project creation uses canonical tenant from helper."""
        self.client.force_authenticate(user=self.master_a)
        response = self.client.post('/api/projects/', {
            'name': 'New Project A',
            'code': 'new-proj-a'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify project is scoped to correct tenant
        project = Project.objects.get(id=response.data['id'])
        self.assertEqual(project.company_id, self.tenant_a.id)
    
    def test_cross_tenant_member_addition_blocked(self):
        """Test 7: Cannot add user from Tenant B to Tenant A project."""
        # Create user in tenant B
        user_b = User.objects.create_user(
            email="user_b@example.com",
            password="testpass123",
            user_type=UserType.COMPANYUSER,
            company_id=self.tenant_b.id
        )
        
        self.client.force_authenticate(user=self.master_a)
        response = self.client.post(f'/api/projects/{self.project_a.id}/members/', {
            'user_id': user_b.id,
            'role': 'member'
        })
        
        # Should fail - user not in same tenant
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('not in same company', response.data['error'])

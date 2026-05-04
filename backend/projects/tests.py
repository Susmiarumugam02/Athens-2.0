import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from authentication.models import User, UserType, SecurityLog
from control_plane.models import Tenant
from projects.models import Project, ProjectMembership


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def superadmin_user(db):
    return User.objects.create_user(
        email="superadmin@athens.com",
        password="test123",
        user_type=UserType.SUPERADMIN,
        is_staff=True
    )


@pytest.fixture
def tenant1(db, superadmin_user):
    return Tenant.objects.create(
        name="Company A",
        code="company-a",
        created_by=superadmin_user
    )


@pytest.fixture
def tenant2(db, superadmin_user):
    return Tenant.objects.create(
        name="Company B",
        code="company-b",
        created_by=superadmin_user
    )


@pytest.fixture
def masteradmin_user(db, tenant1):
    return User.objects.create_user(
        email="master@companya.com",
        password="test123",
        user_type=UserType.MASTERADMIN,
        company_id=tenant1.id
    )


@pytest.fixture
def masteradmin_user2(db, tenant2):
    return User.objects.create_user(
        email="master@companyb.com",
        password="test123",
        user_type=UserType.MASTERADMIN,
        company_id=tenant2.id
    )


@pytest.fixture
def companyuser(db, tenant1):
    return User.objects.create_user(
        email="user@companya.com",
        password="test123",
        user_type=UserType.COMPANYUSER,
        company_id=tenant1.id
    )


@pytest.mark.django_db
class TestProjectCreation:
    def test_masteradmin_can_create_project_in_own_company(self, api_client, masteradmin_user, tenant1):
        api_client.force_authenticate(user=masteradmin_user)
        
        response = api_client.post(reverse("project-list"), {
            "name": "Project Alpha",
            "status": "active"
        })
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Project Alpha"
        assert response.data["company"] == tenant1.id
        
        # Check audit log
        log = SecurityLog.objects.filter(event_type="project_created").first()
        assert log is not None
        assert log.user == masteradmin_user
    
    def test_masteradmin_cannot_create_project_in_other_company(self, api_client, masteradmin_user, tenant2):
        api_client.force_authenticate(user=masteradmin_user)
        
        # Try to create project - it will use masteradmin's company_id automatically
        response = api_client.post(reverse("project-list"), {
            "name": "Project Beta",
            "status": "active"
        })
        
        # Should succeed but in their own company, not tenant2
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["company"] != tenant2.id
        assert response.data["company"] == masteradmin_user.company_id


@pytest.mark.django_db
class TestProjectVisibility:
    def test_companyuser_can_only_see_member_projects(self, api_client, companyuser, tenant1, masteradmin_user):
        # Create two projects
        project1 = Project.objects.create(
            company=tenant1,
            name="Project 1",
            code="proj1",
            created_by=masteradmin_user
        )
        project2 = Project.objects.create(
            company=tenant1,
            name="Project 2",
            code="proj2",
            created_by=masteradmin_user
        )
        
        # Add companyuser only to project1
        ProjectMembership.objects.create(
            project=project1,
            user=companyuser,
            role="member",
            created_by=masteradmin_user
        )
        
        api_client.force_authenticate(user=companyuser)
        response = api_client.get(reverse("project-list"))
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["id"] == project1.id
    
    def test_superadmin_can_list_all_projects(self, api_client, superadmin_user, tenant1, tenant2, masteradmin_user, masteradmin_user2):
        Project.objects.create(company=tenant1, name="Project A", code="proja", created_by=masteradmin_user)
        Project.objects.create(company=tenant2, name="Project B", code="projb", created_by=masteradmin_user2)
        
        api_client.force_authenticate(user=superadmin_user)
        response = api_client.get(reverse("project-list"))
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2


@pytest.mark.django_db
class TestProjectMembers:
    def test_add_member_creates_audit_log(self, api_client, masteradmin_user, tenant1, companyuser):
        project = Project.objects.create(
            company=tenant1,
            name="Test Project",
            code="test",
            created_by=masteradmin_user
        )
        
        api_client.force_authenticate(user=masteradmin_user)
        response = api_client.post(
            reverse("project-members", kwargs={"pk": project.id}),
            {"user_id": companyuser.id, "role": "member"}
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Check audit log
        log = SecurityLog.objects.filter(event_type="project_member_added").first()
        assert log is not None
        assert log.metadata["target_user_id"] == companyuser.id
        assert log.metadata["role"] == "member"

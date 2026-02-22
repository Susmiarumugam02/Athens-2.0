from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from authentication.models import User, UserType, SecurityLog
from authentication.permissions import IsSuperAdminOrMasterAdmin
from authentication.tenant_utils import get_tenant_id_for_filtering, require_tenant
from system.api_response import ok, fail
from .models import Project, ProjectMembership
from .serializers import ProjectSerializer, ProjectMembershipSerializer, AddMemberSerializer
from .permissions import IsProjectMemberOrAdmin


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsProjectMemberOrAdmin]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        user = self.request.user
        queryset = Project.objects.select_related("company", "created_by").prefetch_related("memberships")
        
        tenant_id = get_tenant_id_for_filtering(user)
        
        # Superadmin sees all (tenant_id is None)
        if tenant_id is None:
            pass
        # MasterAdmin sees only their company
        elif user.user_type == UserType.MASTERADMIN:
            queryset = queryset.filter(company_id=tenant_id)
        # CompanyUser sees only projects they are members of
        elif user.user_type == UserType.COMPANYUSER:
            queryset = queryset.filter(
                company_id=tenant_id,
                memberships__user=user,
                memberships__is_active=True
            ).distinct()
        else:
            queryset = queryset.none()
        
        # Filters
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(code__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        user = self.request.user
        
        # Only MasterAdmin and Superadmin can create
        if user.user_type not in [UserType.SUPERADMIN, UserType.MASTERADMIN]:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only MasterAdmin can create projects")
        
        # Get tenant (required for project creation)
        tenant, err = require_tenant(user)
        if err:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(err)
        
        # Set company from canonical tenant
        project = serializer.save(
            company_id=tenant.id,
            created_by=user
        )
        
        # Log event
        SecurityLog.objects.create(
            event_type="project_created",
            severity="info",
            user=user,
            company_id=tenant.id,
            ip_address=self.request.META.get("REMOTE_ADDR"),
            user_agent=self.request.META.get("HTTP_USER_AGENT"),
            metadata={
                "project_id": project.id,
                "project_name": project.name,
                "project_code": project.code,
            }
        )
    
    def perform_update(self, serializer):
        user = self.request.user
        project = serializer.save()
        
        SecurityLog.objects.create(
            event_type="project_updated",
            severity="info",
            user=user,
            company_id=project.company_id,
            ip_address=self.request.META.get("REMOTE_ADDR"),
            user_agent=self.request.META.get("HTTP_USER_AGENT"),
            metadata={
                "project_id": project.id,
                "project_name": project.name,
            }
        )
    
    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        project = self.get_object()
        project.status = "active"
        project.save()
        
        SecurityLog.objects.create(
            event_type="project_status_changed",
            severity="info",
            user=request.user,
            company_id=project.company_id,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT"),
            metadata={
                "project_id": project.id,
                "project_name": project.name,
                "new_status": "active",
            }
        )
        
        return ok(data={"status": "activated"}, request=request)
    
    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        project = self.get_object()
        project.status = "inactive"
        project.save()
        
        SecurityLog.objects.create(
            event_type="project_status_changed",
            severity="info",
            user=request.user,
            company_id=project.company_id,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT"),
            metadata={
                "project_id": project.id,
                "project_name": project.name,
                "new_status": "inactive",
            }
        )
        
        return ok(data={"status": "deactivated"}, request=request)
    
    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        project = self.get_object()
        project.status = "archived"
        project.save()
        
        SecurityLog.objects.create(
            event_type="project_status_changed",
            severity="info",
            user=request.user,
            company_id=project.company_id,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT"),
            metadata={
                "project_id": project.id,
                "project_name": project.name,
                "new_status": "archived",
            }
        )
        
        return ok(data={"status": "archived"}, request=request)
    
    @action(detail=True, methods=["get", "post"])
    def members(self, request, pk=None):
        project = self.get_object()
        
        if request.method == "GET":
            memberships = project.memberships.select_related("user").all()
            serializer = ProjectMembershipSerializer(memberships, many=True)
            return ok(data=serializer.data, request=request)
        
        elif request.method == "POST":
            serializer = AddMemberSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            user_id = serializer.validated_data["user_id"]
            role = serializer.validated_data["role"]
            
            # Verify user exists and belongs to same tenant
            tenant_id = get_tenant_id_for_filtering(request.user)
            try:
                user = User.objects.get(id=user_id)
                user_tenant_id = get_tenant_id_for_filtering(user)
                if user_tenant_id != project.company_id:
                    raise User.DoesNotExist
            except User.DoesNotExist:
                return fail(
                    'INVALID_USER',
                    'User not found or not in same company',
                    status=400,
                    request=request
                )
            
            # Create or update membership
            membership, created = ProjectMembership.objects.update_or_create(
                project=project,
                user=user,
                defaults={
                    "role": role,
                    "is_active": True,
                    "created_by": request.user
                }
            )
            
            SecurityLog.objects.create(
                event_type="project_member_added",
                severity="info",
                user=request.user,
                company_id=project.company_id,
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT"),
                metadata={
                    "project_id": project.id,
                    "project_name": project.name,
                    "target_user_id": user.id,
                    "target_user_email": user.email,
                    "role": role,
                }
            )
            
            result_serializer = ProjectMembershipSerializer(membership)
            return ok(data=result_serializer.data, status=201, request=request)


class ProjectMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMembershipSerializer
    permission_classes = [IsSuperAdminOrMasterAdmin]
    http_method_names = ["get", "patch", "delete"]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        user = self.request.user
        queryset = ProjectMembership.objects.select_related("project", "user")
        
        tenant_id = get_tenant_id_for_filtering(user)
        
        # Superadmin sees all (tenant_id is None)
        if tenant_id is None:
            pass
        # MasterAdmin sees only their company's projects
        elif user.user_type == UserType.MASTERADMIN:
            queryset = queryset.filter(project__company_id=tenant_id)
        else:
            queryset = queryset.none()
        
        return queryset
    
    def perform_update(self, serializer):
        membership = serializer.save()
        
        SecurityLog.objects.create(
            event_type="project_member_updated",
            severity="info",
            user=self.request.user,
            company_id=membership.project.company_id,
            ip_address=self.request.META.get("REMOTE_ADDR"),
            user_agent=self.request.META.get("HTTP_USER_AGENT"),
            metadata={
                "project_id": membership.project.id,
                "project_name": membership.project.name,
                "target_user_id": membership.user.id,
                "target_user_email": membership.user.email,
                "role": membership.role,
                "is_active": membership.is_active,
            }
        )
    
    def perform_destroy(self, instance):
        # Soft delete by setting is_active=False
        instance.is_active = False
        instance.save()
        
        SecurityLog.objects.create(
            event_type="project_member_removed",
            severity="info",
            user=self.request.user,
            company_id=instance.project.company_id,
            ip_address=self.request.META.get("REMOTE_ADDR"),
            user_agent=self.request.META.get("HTTP_USER_AGENT"),
            metadata={
                "project_id": instance.project.id,
                "project_name": instance.project.name,
                "target_user_id": instance.user.id,
                "target_user_email": instance.user.email,
            }
        )

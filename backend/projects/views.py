from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from authentication.models import User, UserType, SecurityLog
from .models import Project, ProjectMembership
from .serializers import ProjectSerializer, ProjectMembershipSerializer, AddMemberSerializer
from .permissions import IsMasterAdminOrSuperAdmin, IsProjectMemberOrAdmin


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsProjectMemberOrAdmin]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Project.objects.select_related("company", "created_by").prefetch_related("memberships")
        
        # Superadmin sees all
        if user.user_type == UserType.SUPERADMIN:
            pass
        # MasterAdmin sees only their company
        elif user.user_type == UserType.MASTERADMIN:
            queryset = queryset.filter(company_id=user.company_id)
        # CompanyUser sees only projects they are members of
        elif user.user_type == UserType.COMPANYUSER:
            queryset = queryset.filter(
                company_id=user.company_id,
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
        
        # Set company from user's company_id
        project = serializer.save(
            company_id=user.company_id,
            created_by=user
        )
        
        # Log event
        SecurityLog.objects.create(
            event_type="project_created",
            severity="info",
            user=user,
            company_id=user.company_id,
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
        
        return Response({"status": "activated"})
    
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
        
        return Response({"status": "deactivated"})
    
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
        
        return Response({"status": "archived"})
    
    @action(detail=True, methods=["get", "post"])
    def members(self, request, pk=None):
        project = self.get_object()
        
        if request.method == "GET":
            memberships = project.memberships.select_related("user").all()
            serializer = ProjectMembershipSerializer(memberships, many=True)
            return Response(serializer.data)
        
        elif request.method == "POST":
            serializer = AddMemberSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            user_id = serializer.validated_data["user_id"]
            role = serializer.validated_data["role"]
            
            # Verify user exists and belongs to same company
            try:
                user = User.objects.get(id=user_id, company_id=project.company_id)
            except User.DoesNotExist:
                return Response(
                    {"error": "User not found or not in same company"},
                    status=status.HTTP_400_BAD_REQUEST
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
            return Response(result_serializer.data, status=status.HTTP_201_CREATED)


class ProjectMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMembershipSerializer
    permission_classes = [IsMasterAdminOrSuperAdmin]
    http_method_names = ["get", "patch", "delete"]
    
    def get_queryset(self):
        user = self.request.user
        queryset = ProjectMembership.objects.select_related("project", "user")
        
        # Superadmin sees all
        if user.user_type == UserType.SUPERADMIN:
            pass
        # MasterAdmin sees only their company's projects
        elif user.user_type == UserType.MASTERADMIN:
            queryset = queryset.filter(project__company_id=user.company_id)
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

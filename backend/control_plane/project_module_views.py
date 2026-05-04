from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .project_modules import ProjectModule
from system.utils import get_current_tenant
from rest_framework import serializers
from authentication.permissions import IsMasterAdmin, IsCompanyUser

class ProjectModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectModule
        fields = '__all__'
        read_only_fields = ['id', 'enabled_by', 'enabled_at', 'updated_at']

class ProjectModuleViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectModuleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        tenant, error = get_current_tenant(self.request.user)
        if not tenant:
            return ProjectModule.objects.none()
        
        project_id = self.request.query_params.get('project_id')
        qs = ProjectModule.objects.filter(athens_tenant_id=tenant.id)
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        if not tenant:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No tenant assigned')
        serializer.save(
            athens_tenant_id=tenant.id,
            enabled_by=self.request.user
        )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsMasterAdmin])
    def toggle(self, request):
        """Toggle module enablement for a project (MasterAdmin only)"""
        project_id = request.data.get('project_id')
        module_code = request.data.get('module_code')
        is_enabled = request.data.get('is_enabled', True)
        
        if not project_id or not module_code:
            return Response(
                {'error': 'project_id and module_code required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tenant, _ = get_current_tenant(request.user)
        if not tenant:
            return Response({'error': 'No tenant assigned'}, status=status.HTTP_403_FORBIDDEN)
        
        with transaction.atomic():
            module, created = ProjectModule.objects.update_or_create(
                project_id=project_id,
                module_code=module_code,
                athens_tenant_id=tenant.id,
                defaults={
                    'is_enabled': is_enabled,
                    'enabled_by': request.user
                }
            )
        
        return Response(ProjectModuleSerializer(module).data)

    @action(detail=False, methods=['post'], url_path='bulk-save', permission_classes=[IsAuthenticated, IsMasterAdmin])
    def bulk_save(self, request):
        """
        Atomically save ALL module states for a project in a single transaction.
        Payload: { project_id: int, modules: [{ module_code: str, is_enabled: bool }, ...] }
        """
        project_id = request.data.get('project_id')
        modules = request.data.get('modules', [])

        if not project_id:
            return Response({'error': 'project_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(modules, list) or len(modules) == 0:
            return Response({'error': 'modules list is required and must not be empty'}, status=status.HTTP_400_BAD_REQUEST)

        tenant, _ = get_current_tenant(request.user)
        if not tenant:
            return Response({'error': 'No tenant assigned'}, status=status.HTTP_403_FORBIDDEN)

        saved = []
        with transaction.atomic():
            for item in modules:
                module_code = item.get('module_code')
                is_enabled = item.get('is_enabled', False)
                if not module_code:
                    continue
                obj, _ = ProjectModule.objects.update_or_create(
                    project_id=project_id,
                    module_code=module_code,
                    athens_tenant_id=tenant.id,
                    defaults={
                        'is_enabled': bool(is_enabled),
                        'enabled_by': request.user,
                    }
                )
                saved.append(obj)

        return Response(ProjectModuleSerializer(saved, many=True).data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], permission_classes=[IsMasterAdmin | IsCompanyUser])
    def enabled(self, request):
        """Get enabled modules for current user's projects"""
        user = request.user
        
        # For company users, get modules for their project
        if IsCompanyUser().has_permission(request, self):
            if not hasattr(user, 'project') or not user.project:
                return Response([])
            
            modules = ProjectModule.objects.filter(
                project_id=user.project.id,
                is_enabled=True
            ).values('project_id', 'module_code')
            return Response(list(modules))
        
        # For masteradmin, get all modules for their tenant
        if IsMasterAdmin().has_permission(request, self):
            if not user.tenant:
                return Response([])
            
            modules = ProjectModule.objects.filter(
                athens_tenant_id=user.tenant.id,
                is_enabled=True
            ).values('project_id', 'module_code')
            return Response(list(modules))
        
        return Response([])

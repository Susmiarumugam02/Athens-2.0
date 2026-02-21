from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .project_modules import ProjectModule
from system.utils import get_current_tenant
from rest_framework import serializers

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
        if error:
            return ProjectModule.objects.none()
        
        project_id = self.request.query_params.get('project_id')
        qs = ProjectModule.objects.filter(athens_tenant_id=tenant.id)
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(
            athens_tenant_id=tenant.id,
            enabled_by=self.request.user
        )
    
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """Toggle module enablement for a project"""
        project_id = request.data.get('project_id')
        module_code = request.data.get('module_code')
        is_enabled = request.data.get('is_enabled', True)
        
        if not project_id or not module_code:
            return Response(
                {'error': 'project_id and module_code required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tenant, _ = get_current_tenant(request.user)
        
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
    
    @action(detail=False, methods=['get'])
    def enabled(self, request):
        """Get enabled modules for current user's projects"""
        user = request.user
        
        # For company users, get modules for their project
        if user.user_type == 'companyuser':
            if not hasattr(user, 'project') or not user.project:
                return Response([])
            
            modules = ProjectModule.objects.filter(
                project_id=user.project.id,
                is_enabled=True
            ).values('project_id', 'module_code')
            return Response(list(modules))
        
        # For masteradmin, get all modules for their tenant
        if user.user_type == 'masteradmin':
            if not user.tenant:
                return Response([])
            
            modules = ProjectModule.objects.filter(
                athens_tenant_id=user.tenant.id,
                is_enabled=True
            ).values('project_id', 'module_code')
            return Response(list(modules))
        
        return Response([])

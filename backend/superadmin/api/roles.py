from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from superadmin.models import Role, Permission, RolePermission
from superadmin.serializers import RoleSerializer, PermissionSerializer
from superadmin.permissions import IsSuperAdmin
from superadmin.services.audit import AuditLogMixin


class RoleViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    audit_module = 'roles'
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        if instance.is_system_role:
            return Response(
                {'error': 'Cannot delete system role'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if role has users
        if instance.userrole_set.exists():
            return Response(
                {'error': 'Cannot delete role with assigned users'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def assign_permissions(self, request, pk=None):
        """Assign permissions to a role"""
        role = self.get_object()
        permission_ids = request.data.get('permission_ids', [])
        
        # Clear existing permissions
        RolePermission.objects.filter(role=role).delete()
        
        # Add new permissions
        for perm_id in permission_ids:
            RolePermission.objects.create(role=role, permission_id=perm_id)
        
        return Response({'message': 'Permissions assigned successfully'})


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by module
        module = self.request.query_params.get('module')
        if module:
            queryset = queryset.filter(module=module)
        
        return queryset.order_by('module', 'action')
    
    @action(detail=False, methods=['get'])
    def modules(self, request):
        """Get list of all modules"""
        modules = Permission.objects.values_list('module', flat=True).distinct()
        return Response(list(modules))

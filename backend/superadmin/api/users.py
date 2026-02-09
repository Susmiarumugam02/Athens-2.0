from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from django.db.models import Q

from authentication.models import User, UserType, ServiceUserSession
from superadmin.models import UserRole
from superadmin.serializers import SuperAdminUserSerializer
from superadmin.permissions import IsSuperAdmin, HasSuperAdminPermission
from superadmin.services.audit import log_audit, get_client_ip, get_user_agent, AuditLogMixin


class SuperAdminUserViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = SuperAdminUserSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    audit_module = 'users'
    
    def get_queryset(self):
        queryset = User.objects.filter(user_type=UserType.SUPERADMIN)
        
        # Search
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search)
            )
        
        # Filter by role
        role_id = self.request.query_params.get('role')
        if role_id:
            queryset = queryset.filter(superadmin_roles__role_id=role_id)
        
        # Filter by status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.distinct().order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset user password and force password change on next login"""
        user = self.get_object()
        
        # Generate temporary password
        import secrets
        import string
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        
        user.set_password(temp_password)
        user.password_changed_at = None  # Force password change
        user.save()
        
        log_audit(
            user=request.user,
            action='users.reset_password',
            module='users',
            resource_type='User',
            resource_id=str(user.id),
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
        
        return Response({
            'message': 'Password reset successfully',
            'temporary_password': temp_password
        })
    
    @action(detail=True, methods=['get'])
    def sessions(self, request, pk=None):
        """Get active sessions for a user"""
        user = self.get_object()
        sessions = ServiceUserSession.objects.filter(
            user=user,
            expires_at__gt=timezone.now()
        ).order_by('-last_activity')
        
        session_data = [{
            'id': session.id,
            'session_key': session.session_key[:8] + '...',
            'ip_address': session.ip_address,
            'user_agent': session.user_agent,
            'created_at': session.created_at,
            'last_activity': session.last_activity,
            'expires_at': session.expires_at,
        } for session in sessions]
        
        return Response(session_data)
    
    @action(detail=True, methods=['post'], url_path='sessions/(?P<session_id>[^/.]+)/revoke')
    def revoke_session(self, request, pk=None, session_id=None):
        """Revoke a specific session"""
        user = self.get_object()
        
        try:
            session = ServiceUserSession.objects.get(id=session_id, user=user)
            session.delete()
            
            log_audit(
                user=request.user,
                action='users.revoke_session',
                module='users',
                resource_type='Session',
                resource_id=session_id,
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
            )
            
            return Response({'message': 'Session revoked successfully'})
        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Enable/disable user"""
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        
        log_audit(
            user=request.user,
            action='users.toggle_status',
            module='users',
            resource_type='User',
            resource_id=str(user.id),
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            request_data={'is_active': user.is_active},
        )
        
        return Response({
            'message': f"User {'enabled' if user.is_active else 'disabled'} successfully",
            'is_active': user.is_active
        })

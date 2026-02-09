from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone

from superadmin.models import (
    PasswordPolicy, TwoFactorSettings, IPRestriction, SessionSettings
)
from superadmin.serializers import (
    PasswordPolicySerializer, TwoFactorSettingsSerializer,
    IPRestrictionSerializer, SessionSettingsSerializer
)
from superadmin.permissions import IsSuperAdmin
from superadmin.services.audit import log_audit, get_client_ip, get_user_agent
from authentication.models import ServiceUserSession


class PasswordPolicyView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get(self, request):
        policy = PasswordPolicy.get_policy()
        serializer = PasswordPolicySerializer(policy)
        return Response(serializer.data)
    
    def put(self, request):
        policy = PasswordPolicy.get_policy()
        serializer = PasswordPolicySerializer(policy, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            
            log_audit(
                user=request.user,
                action='security.update_password_policy',
                module='security',
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                request_data=request.data,
            )
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TwoFactorSettingsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get(self, request):
        settings = TwoFactorSettings.get_settings()
        serializer = TwoFactorSettingsSerializer(settings)
        return Response(serializer.data)
    
    def put(self, request):
        settings = TwoFactorSettings.get_settings()
        serializer = TwoFactorSettingsSerializer(settings, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            
            log_audit(
                user=request.user,
                action='security.update_2fa_settings',
                module='security',
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                request_data=request.data,
            )
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class IPRestrictionViewSet(viewsets.ModelViewSet):
    queryset = IPRestriction.objects.all()
    serializer_class = IPRestrictionSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        
        log_audit(
            user=self.request.user,
            action='security.create_ip_restriction',
            module='security',
            resource_type='IPRestriction',
            resource_id=str(instance.id),
            ip_address=get_client_ip(self.request),
            user_agent=get_user_agent(self.request),
            request_data=self.request.data,
        )
    
    def perform_destroy(self, instance):
        log_audit(
            user=self.request.user,
            action='security.delete_ip_restriction',
            module='security',
            resource_type='IPRestriction',
            resource_id=str(instance.id),
            ip_address=get_client_ip(self.request),
            user_agent=get_user_agent(self.request),
        )
        instance.delete()


class SessionSettingsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get(self, request):
        settings = SessionSettings.get_settings()
        serializer = SessionSettingsSerializer(settings)
        return Response(serializer.data)
    
    def put(self, request):
        settings = SessionSettings.get_settings()
        serializer = SessionSettingsSerializer(settings, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            
            log_audit(
                user=request.user,
                action='security.update_session_settings',
                module='security',
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                request_data=request.data,
            )
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ActiveSessionsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get(self, request):
        """Get all active sessions"""
        sessions = ServiceUserSession.objects.filter(
            expires_at__gt=timezone.now()
        ).select_related('user').order_by('-last_activity')
        
        session_data = [{
            'id': session.id,
            'user_email': session.user.email,
            'user_id': session.user.id,
            'session_key': session.session_key[:8] + '...',
            'ip_address': session.ip_address,
            'user_agent': session.user_agent,
            'created_at': session.created_at,
            'last_activity': session.last_activity,
            'expires_at': session.expires_at,
        } for session in sessions[:100]]  # Limit to 100
        
        return Response({
            'count': sessions.count(),
            'sessions': session_data
        })
    
    def post(self, request):
        """Revoke all sessions or specific sessions"""
        session_ids = request.data.get('session_ids', [])
        
        if session_ids:
            count = ServiceUserSession.objects.filter(id__in=session_ids).delete()[0]
        else:
            count = ServiceUserSession.objects.all().delete()[0]
        
        log_audit(
            user=request.user,
            action='security.revoke_sessions',
            module='security',
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            request_data={'count': count},
        )
        
        return Response({'message': f'{count} sessions revoked successfully'})

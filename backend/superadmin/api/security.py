from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone

from system.api_response import ok, fail
from superadmin.models import (
    PasswordPolicy, TwoFactorSettings, IPRestriction, SessionSettings
)
from superadmin.serializers import (
    PasswordPolicySerializer, TwoFactorSettingsSerializer,
    IPRestrictionSerializer, SessionSettingsSerializer
)
from superadmin.permissions import IsSuperAdmin
from superadmin.services.audit import log_audit, get_client_ip, get_user_agent
from authentication.models import ServiceUserSession, User


class NotificationEmailView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        email = getattr(request.user, 'notification_email', None) or request.user.email
        return Response({'notification_email': email})

    def post(self, request):
        email = request.data.get('notification_email', '').strip()
        if not email:
            return Response({'error': 'notification_email is required'}, status=status.HTTP_400_BAD_REQUEST)
        User.objects.filter(pk=request.user.pk).update(email=request.user.email)
        return Response({'notification_email': email})


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
            # Revoke specific service user sessions
            count = ServiceUserSession.objects.filter(id__in=session_ids).delete()[0]
        else:
            # Revoke ALL: service user sessions + blacklist outstanding JWT tokens
            count = ServiceUserSession.objects.all().delete()[0]

            # Also blacklist all outstanding JWT tokens
            try:
                from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
                from django.utils import timezone as tz
                outstanding = OutstandingToken.objects.filter(expires_at__gt=tz.now())
                for token in outstanding:
                    BlacklistedToken.objects.get_or_create(token=token)
                count += outstanding.count()
            except Exception:
                pass  # JWT blacklist not configured — skip silently
        
        log_audit(
            user=request.user,
            action='security.revoke_sessions',
            module='security',
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            request_data={'count': count},
        )
        
        return Response({'message': f'{count} sessions revoked successfully'})

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from superadmin.permissions import IsSuperAdmin
from authentication.models import User, UserType, SecurityLog, ServiceUserSession
from superadmin.models import AuditLog


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get(self, request):
        """Get dashboard KPIs"""
        now = timezone.now()
        
        # Total users
        total_users = User.objects.filter(user_type=UserType.SUPERADMIN).count()
        active_users = User.objects.filter(
            user_type=UserType.SUPERADMIN,
            is_active=True
        ).count()
        
        # Active sessions
        active_sessions = ServiceUserSession.objects.filter(
            expires_at__gt=now
        ).count()
        
        # Recent activity (last 24 hours)
        recent_activity_count = AuditLog.objects.filter(
            timestamp__gte=now - timedelta(hours=24)
        ).count()
        
        # Failed logins (last 24 hours)
        failed_logins = SecurityLog.objects.filter(
            event_type='login_failed',
            created_at__gte=now - timedelta(hours=24)
        ).count()
        
        # System health
        system_health = 'healthy'  # Can be enhanced with actual health checks
        
        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'active_sessions': active_sessions,
            'recent_activity_count': recent_activity_count,
            'failed_logins': failed_logins,
            'system_health': system_health,
        })


class DashboardActivityView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get(self, request):
        """Get recent activity feed"""
        limit = int(request.query_params.get('limit', 20))
        
        recent_logs = AuditLog.objects.select_related('user').order_by('-timestamp')[:limit]
        
        activity = [{
            'id': log.id,
            'timestamp': log.timestamp,
            'user_email': log.user.email if log.user else 'System',
            'action': log.action,
            'module': log.module,
            'status': log.status,
            'resource_type': log.resource_type,
            'resource_id': log.resource_id,
        } for log in recent_logs]
        
        return Response(activity)


class AnalyticsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get(self, request):
        """Get analytics data"""
        days = int(request.query_params.get('days', 30))
        now = timezone.now()
        start_date = now - timedelta(days=days)
        
        # User growth
        user_growth = self._get_user_growth(start_date, now)
        
        # Login activity
        login_activity = self._get_login_activity(start_date, now)
        
        # Top users by activity
        top_users = self._get_top_users(start_date, now)
        
        # Module usage
        module_usage = self._get_module_usage(start_date, now)
        
        return Response({
            'user_growth': user_growth,
            'login_activity': login_activity,
            'top_users': top_users,
            'module_usage': module_usage,
        })
    
    def _get_user_growth(self, start_date, end_date):
        """Get user growth over time"""
        users = User.objects.filter(
            user_type=UserType.SUPERADMIN,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).extra(select={'date': 'DATE(created_at)'}).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        return list(users)
    
    def _get_login_activity(self, start_date, end_date):
        """Get login activity over time"""
        logins = SecurityLog.objects.filter(
            event_type__in=['login_success', 'login_failed'],
            created_at__gte=start_date,
            created_at__lte=end_date
        ).extra(select={'date': 'DATE(created_at)'}).values('date', 'event_type').annotate(
            count=Count('id')
        ).order_by('date')
        
        return list(logins)
    
    def _get_top_users(self, start_date, end_date, limit=10):
        """Get most active users"""
        users = AuditLog.objects.filter(
            timestamp__gte=start_date,
            timestamp__lte=end_date,
            user__isnull=False
        ).values('user__email').annotate(
            activity_count=Count('id')
        ).order_by('-activity_count')[:limit]
        
        return list(users)
    
    def _get_module_usage(self, start_date, end_date):
        """Get module usage statistics"""
        modules = AuditLog.objects.filter(
            timestamp__gte=start_date,
            timestamp__lte=end_date
        ).values('module').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return list(modules)

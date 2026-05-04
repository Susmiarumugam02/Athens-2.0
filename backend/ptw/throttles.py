from rest_framework.throttling import UserRateThrottle
from django.conf import settings


class PTWSyncThrottle(UserRateThrottle):
    scope = 'ptw_sync'
    
    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class PTWBulkExportThrottle(UserRateThrottle):
    scope = 'ptw_bulk_export'


class PTWKpiThrottle(UserRateThrottle):
    scope = 'ptw_kpi'


class PTWNotificationsThrottle(UserRateThrottle):
    scope = 'ptw_notifications'

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('api/auth/', include('authentication.urls')),
    path('api/control-plane/', include('control_plane.urls')),
    path('api/system/', include('system.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/superadmin/', include('superadmin.urls')),
    
    path('admin/', admin.site.urls),
]

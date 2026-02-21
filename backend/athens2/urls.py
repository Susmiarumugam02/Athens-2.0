from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from authentication.company_settings import (
    company_details, upload_logo, company_documents, delete_document
)

urlpatterns = [
    path('api/auth/', include('authentication.urls')),
    path('api/control-plane/', include('control_plane.urls')),
    path('api/system/', include('system.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/superadmin/', include('superadmin.urls')),
    path('api/workforce/', include('workforce.urls')),
    path('api/ergon/', include('ergon.urls')),
    
    # Company settings endpoints
    path('api/company/details/', company_details, name='company-details'),
    path('api/company/logo/', upload_logo, name='company-logo'),
    path('api/company/documents/', company_documents, name='company-documents'),
    path('api/company/documents/<int:doc_id>/', delete_document, name='delete-document'),
    
    path('admin/', admin.site.urls),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

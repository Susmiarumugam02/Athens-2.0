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
    path('api/ergon/manpower/', include('ergon_manpower.urls')),
    path('api/safety-observation/', include('safetyobservation.urls')),
    path('api/induction-training/', include('inductiontraining.urls')),
    path('api/job-training/', include('jobtraining.urls')),
    path('api/tbt/', include('tbt.urls')),
    
    # Company settings endpoints (under /api/auth/ for consistency)
    path('api/auth/company/details/', company_details, name='company-details'),
    path('api/auth/company/logo/', upload_logo, name='company-logo'),
    path('api/auth/company/documents/', company_documents, name='company-documents'),
    path('api/auth/company/documents/<int:doc_id>/', delete_document, name='delete-document'),
    
    path('admin/', admin.site.urls),
]

# Conditionally add PTW routes
if getattr(settings, 'FEATURE_PTW_ENABLED', False):
    urlpatterns.insert(7, path('api/ptw/', include('permit_to_work.urls')))

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

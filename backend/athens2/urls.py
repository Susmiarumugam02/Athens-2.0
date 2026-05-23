from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from authentication.company_settings import (
    company_details, upload_logo, company_documents, delete_document
)
from authentication.projectadmin.views import complete_profile as submit_user_profile

urlpatterns = [
    path('api/auth/', include('authentication.urls')),
    path('api/notifications/', include('authentication.notification_urls')),
    path('api/control-plane/', include('control_plane.urls')),
    path('api/system/', include('system.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/superadmin/', include('superadmin.urls')),
    path('api/workforce/', include('workforce.urls')),
    path('api/ergon/', include('ergon.urls')),
    path('api/ergon/manpower/', include('ergon_manpower.urls')),
    path('api/v1/quality/', include('quality.urls')),
    path('api/quality/', include('quality.urls')),
    path('api/v1/safetyobservation/', include('safetyobservation.urls')),
    path('api/safety-observation/', include('safetyobservation.urls')),
    path('api/induction-training/', include('inductiontraining.urls')),
    path('api/job-training/', include('jobtraining.urls')),
    path('api/tbt/', include('tbt.urls')),
    path('api/chatbox/', include('chatbox.urls')),
    path('api/voice-translator/', include('voice_translator.urls')),
    path('api/ai/', include('ai_bot.simple_urls')),
    path('', include('mom.urls')),  # MoM uses full paths like /api/v1/mom/
    
    # Company settings endpoints (under /api/auth/ for consistency)
    path('api/auth/company/details/', company_details, name='company-details'),
    path('api/auth/company/logo/', upload_logo, name='company-logo'),
    path('api/auth/company/documents/', company_documents, name='company-documents'),
    path('api/auth/company/documents/<int:doc_id>/', delete_document, name='delete-document'),
    
    path('admin/', admin.site.urls),
]

# PTW routes
urlpatterns.insert(7, path('api/ptw/', include('ptw.urls')))

# Admin Attendance routes
urlpatterns += [path('api/admin-attendance/', include('admin_attendance.urls'))]

# Training Management routes
urlpatterns += [path('api/training/', include('training_management.urls'))]

# Athens AI routes
urlpatterns += [path('api/gemini/', include('ai.urls'))]

# PTW Phase 3 routes
urlpatterns += [path('api/ptw-phase3/', include('ptw_phase3.urls'))]

# Athens ML routes
urlpatterns += [path('api/ml/', include('ml.urls'))]
urlpatterns += [path('ai/', include('ml.ai_urls'))]
urlpatterns += [
    path('api/user/profile/submit', submit_user_profile, name='user-profile-submit'),
    path('api/user/profile/submit/', submit_user_profile, name='user-profile-submit-slash'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

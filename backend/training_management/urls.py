from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TrainingViewSet, TrainingAttendanceViewSet,
    my_induction_trainings, complete_online_training, project_users,
    attendance_status,
)
from .attendance_verification import (
    generate_otp, verify_otp, verify_qr,
    generate_qr_session, get_qr_session,
    request_admin_verification, verify_geolocation,
    admin_approve_attendance, live_attendance_count,
    generate_qr, validate_qr, mark_attendance,
)

router = DefaultRouter()
router.register(r'trainings', TrainingViewSet, basename='training')
router.register(r'attendances', TrainingAttendanceViewSet, basename='attendance')

training_create = TrainingViewSet.as_view({'post': 'create'})

urlpatterns = [
    path('', include(router.urls)),
    path('create', training_create, name='training-create'),
    path('create/', training_create, name='training-create-slash'),
    path('my-induction/', my_induction_trainings, name='my-induction-trainings'),
    path('complete/<int:training_id>/', complete_online_training, name='complete-online-training'),
    path('project-users/', project_users, name='project-users'),
    # Contract endpoints used by the QR induction workflow
    path('generate-qr', generate_qr, name='generate-qr'),
    path('generate-qr/', generate_qr, name='generate-qr-slash'),
    path('<int:training_id>/generate-qr', generate_qr_session, name='generate-qr-contract'),
    path('<int:training_id>/generate-qr/', generate_qr_session, name='generate-qr-contract-slash'),
    path('validate-qr', validate_qr, name='validate-qr'),
    path('validate-qr/', validate_qr, name='validate-qr-slash'),
    path('mark-attendance', mark_attendance, name='mark-attendance'),
    path('mark-attendance/', mark_attendance, name='mark-attendance-slash'),
    path('attendance-status', attendance_status, name='attendance-status'),
    path('attendance-status/', attendance_status, name='attendance-status-slash'),
    # QR session endpoints
    path('trainings/<int:training_id>/generate-qr/', generate_qr_session, name='generate-qr-session'),
    path('trainings/<int:training_id>/qr-session/', get_qr_session, name='get-qr-session'),
    # Attendance verification endpoints
    path('trainings/<int:training_id>/generate-otp/', generate_otp, name='generate-otp'),
    path('trainings/<int:training_id>/verify-otp/', verify_otp, name='verify-otp'),
    path('trainings/<int:training_id>/verify-qr/', verify_qr, name='verify-qr'),
    path('trainings/<int:training_id>/request-admin-verification/', request_admin_verification, name='request-admin-verification'),
    path('trainings/<int:training_id>/verify-geolocation/', verify_geolocation, name='verify-geolocation'),
    path('trainings/<int:training_id>/approve/<int:user_id>/', admin_approve_attendance, name='admin-approve-attendance'),
    path('trainings/<int:training_id>/live-count/', live_attendance_count, name='live-attendance-count'),
]

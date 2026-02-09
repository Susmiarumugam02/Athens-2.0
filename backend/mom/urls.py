from django.urls import path
from .views import (
    MomCreateView,
    MomUpdateView,
    MomListView,
    MomDeleteView,
    DepartmentsListView,
    UsersByDepartmentListView,
    CsrfTokenView,
    ParticipantResponseView,
    ParticipantAcceptView,
    ParticipantRejectView,
    ParticipantListView,
    MomLiveView,
    MomLiveAttendanceUpdateView,
    MomCompleteView,
    MomAddParticipantsView,
    MeetingInfoView,
)

urlpatterns = [
    path('api/v1/mom/schedule/', MomCreateView.as_view(), name='mom-schedule'),
    path('api/v1/mom/list/', MomListView.as_view(), name='mom-list'),
    path('api/v1/mom/<int:pk>/', MomUpdateView.as_view(), name='mom-update'),  # Use MomUpdateView for GET, PUT, PATCH
    path('api/v1/mom/<int:pk>/delete/', MomDeleteView.as_view(), name='mom-delete'),
    path('api/v1/mom/<int:mom_id>/participants/<int:user_id>/response/', ParticipantResponseView.as_view(), name='participant-response'),
    path('api/v1/mom/<int:mom_id>/response/<int:user_id>/accept/', ParticipantAcceptView.as_view(), name='participant-accept'),
    path('api/v1/mom/<int:mom_id>/response/<int:user_id>/reject/', ParticipantRejectView.as_view(), name='participant-reject'),
    path('api/v1/mom/<int:mom_id>/participants/', ParticipantListView.as_view(), name='participant-list'),
    path('api/v1/mom/<int:pk>/live/', MomLiveView.as_view(), name='mom-live'),
    path('api/v1/mom/<int:pk>/live/attendance/', MomLiveAttendanceUpdateView.as_view(), name='mom-live-attendance-update'),
    path('api/v1/mom/<int:pk>/complete/', MomCompleteView.as_view(), name='mom-complete'),
    path('api/v1/mom/<int:pk>/participants/add/', MomAddParticipantsView.as_view(), name='mom-add-participants'),
    path('api/v1/mom/<int:mom_id>/info/', MeetingInfoView.as_view(), name='meeting-info'),
    path('api/v1/mom/csrf-token/', CsrfTokenView.as_view(), name='csrf-token'),
    path('api/v1/users/', UsersByDepartmentListView.as_view(), name='users-by-department'),  # Added endpoint for users by department
    
    # Note: Notification endpoints have been moved to /auth/notifications/
    # All MOM notifications now use the common WebSocket notification system
]

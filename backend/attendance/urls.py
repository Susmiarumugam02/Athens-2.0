from django.urls import path

from .views import AttendanceEventBulkView, AttendanceSyncStatusView


urlpatterns = [
    path("events/bulk/", AttendanceEventBulkView.as_view(), name="attendance-events-bulk"),
    path("sync-status/", AttendanceSyncStatusView.as_view(), name="attendance-sync-status"),
]

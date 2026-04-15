from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'entries', views.ManpowerEntryViewSet, basename='manpower-entry')
router.register(r'work-types', views.WorkTypeViewSet, basename='work-type')
router.register(r'daily-summary', views.DailyManpowerSummaryViewSet, basename='daily-summary')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard-stats/', views.dashboard_stats, name='manpower-dashboard-stats'),
]

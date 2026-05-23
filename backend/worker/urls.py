from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkerViewSet, check_user_permissions, debug_worker_data

router = DefaultRouter()
router.register(r'', WorkerViewSet, basename='worker')

urlpatterns = [
    path('', include(router.urls)),
    path('check-permissions/', check_user_permissions, name='check-user-permissions'),
    path('debug/', debug_worker_data, name='debug-worker-data'),
]

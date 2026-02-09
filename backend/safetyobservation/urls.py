from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SafetyObservationViewSet

router = DefaultRouter()
router.register(r'', SafetyObservationViewSet, basename='safetyobservation')

urlpatterns = [
    path('', include(router.urls)),
]

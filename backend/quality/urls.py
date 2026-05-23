from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (QualityStandardViewSet, QualityTemplateViewSet, QualityInspectionViewSet,
                   QualityDefectViewSet, QualityObservationViewSet, QualityFixingViewSet,
                   QualityActivityLogViewSet, SupplierQualityViewSet, QualityMetricsViewSet,
                   QualityAlertViewSet)

router = DefaultRouter()
router.register(r'standards', QualityStandardViewSet)
router.register(r'templates', QualityTemplateViewSet)
router.register(r'inspections', QualityInspectionViewSet)
router.register(r'defects', QualityDefectViewSet)
router.register(r'observations', QualityObservationViewSet)
router.register(r'fixings', QualityFixingViewSet)
router.register(r'activity-logs', QualityActivityLogViewSet)
router.register(r'suppliers', SupplierQualityViewSet)
router.register(r'metrics', QualityMetricsViewSet)
router.register(r'alerts', QualityAlertViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

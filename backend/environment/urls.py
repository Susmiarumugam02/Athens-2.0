from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EnvironmentAspectViewSet, GenerationDataViewSet, EmissionFactorViewSet,
    GHGActivityViewSet, WasteManifestViewSet, BiodiversityEventViewSet,
    ESGPolicyViewSet, GrievanceViewSet, ESGReportViewSet,
    EnvironmentalMonitoringViewSet, CarbonFootprintViewSet, WaterManagementViewSet,
    EnergyManagementViewSet, EnvironmentalIncidentViewSet, SustainabilityTargetViewSet
)

router = DefaultRouter()
# Core ESG Components
router.register(r'aspects', EnvironmentAspectViewSet, basename='environment-aspect')
router.register(r'generation', GenerationDataViewSet, basename='generation-data')
router.register(r'emission-factors', EmissionFactorViewSet, basename='emission-factor')
router.register(r'ghg-activities', GHGActivityViewSet, basename='ghg-activity')
router.register(r'waste-manifests', WasteManifestViewSet, basename='waste-manifest')
router.register(r'biodiversity-events', BiodiversityEventViewSet, basename='biodiversity-event')
router.register(r'policies', ESGPolicyViewSet, basename='esg-policy')
router.register(r'grievances', GrievanceViewSet, basename='grievance')
router.register(r'reports', ESGReportViewSet, basename='esg-report')

# Advanced Environmental Management
router.register(r'monitoring', EnvironmentalMonitoringViewSet, basename='environmental-monitoring')
router.register(r'carbon-footprint', CarbonFootprintViewSet, basename='carbon-footprint')
router.register(r'water-management', WaterManagementViewSet, basename='water-management')
router.register(r'energy-management', EnergyManagementViewSet, basename='energy-management')
router.register(r'environmental-incidents', EnvironmentalIncidentViewSet, basename='environmental-incident')
router.register(r'sustainability-targets', SustainabilityTargetViewSet, basename='sustainability-target')

urlpatterns = [
    path('', include(router.urls)),
]
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'permit-types', views.PermitTypeViewSet, basename='permittype')
router.register(r'permits', views.PermitViewSet, basename='permit')
router.register(r'extensions', views.PermitExtensionViewSet, basename='extension')
router.register(r'signatures', views.DigitalSignatureViewSet, basename='signature')
router.register(r'audit-logs', views.PermitAuditViewSet, basename='audit')
router.register(r'gas-readings', views.GasReadingViewSet, basename='gasreading')
router.register(r'isolation-library', views.IsolationPointLibraryViewSet, basename='isolation-library')
router.register(r'isolation-points', views.PermitIsolationPointViewSet, basename='isolation-point')
router.register(r'closeout-templates', views.CloseoutChecklistTemplateViewSet, basename='closeout-template')
router.register(r'closeouts', views.PermitCloseoutViewSet, basename='closeout')

urlpatterns = [
    path('', include(router.urls)),
]

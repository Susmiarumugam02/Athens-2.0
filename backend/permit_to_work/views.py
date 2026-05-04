from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from system.api_response import ok, fail
from .models import (
    PermitType, Permit, WorkflowTemplate, WorkflowInstance, WorkflowStep,
    PermitExtension, DigitalSignature, PermitAudit, GasReading,
    IsolationPointLibrary, PermitIsolationPoint, CloseoutChecklistTemplate, PermitCloseout
)
from .serializers import (
    PermitTypeSerializer, PermitSerializer, WorkflowTemplateSerializer,
    WorkflowInstanceSerializer, WorkflowStepSerializer, PermitExtensionSerializer,
    DigitalSignatureSerializer, PermitAuditSerializer, GasReadingSerializer,
    IsolationPointLibrarySerializer, PermitIsolationPointSerializer,
    CloseoutChecklistTemplateSerializer, PermitCloseoutSerializer
)


class PermitTypeViewSet(viewsets.ModelViewSet):
    """Permit types - no tenant filtering (global)"""
    queryset = PermitType.objects.filter(is_active=True)
    serializer_class = PermitTypeSerializer
    permission_classes = [IsAuthenticated]


class PermitViewSet(viewsets.ModelViewSet):
    """Permits with multi-tenant filtering"""
    serializer_class = PermitSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'permit_type', 'location']
    
    def get_queryset(self):
        user = self.request.user
        return Permit.objects.filter(athens_tenant_id=user.athens_tenant_id)
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit permit for approval"""
        permit = self.get_object()
        if permit.status != 'draft':
            return fail('INVALID_STATUS', 'Only draft permits can be submitted', status=400, request=request)
        
        permit.status = 'submitted'
        permit.submitted_at = timezone.now()
        permit.save()
        
        # Create audit log
        PermitAudit.objects.create(
            permit=permit,
            action='submitted',
            user=request.user,
            comments='Permit submitted for approval'
        )
        
        return ok(data={'message': 'Permit submitted successfully'}, request=request)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve permit"""
        permit = self.get_object()
        if permit.status != 'submitted':
            return fail('INVALID_STATUS', 'Only submitted permits can be approved', status=400, request=request)
        
        permit.status = 'approved'
        permit.approved_at = timezone.now()
        permit.save()
        
        PermitAudit.objects.create(
            permit=permit,
            action='approved',
            user=request.user,
            comments=request.data.get('comments', '')
        )
        
        return ok(data={'message': 'Permit approved successfully'}, request=request)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject permit"""
        permit = self.get_object()
        if permit.status not in ['submitted', 'under_review']:
            return fail('INVALID_STATUS', 'Invalid status for rejection', status=400, request=request)
        
        permit.status = 'rejected'
        permit.save()
        
        PermitAudit.objects.create(
            permit=permit,
            action='rejected',
            user=request.user,
            comments=request.data.get('comments', '')
        )
        
        return ok(data={'message': 'Permit rejected'}, request=request)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate approved permit"""
        permit = self.get_object()
        if permit.status != 'approved':
            return fail('INVALID_STATUS', 'Only approved permits can be activated', status=400, request=request)
        
        permit.status = 'active'
        permit.actual_start_time = timezone.now()
        permit.save()
        
        PermitAudit.objects.create(
            permit=permit,
            action='active',
            user=request.user,
            comments='Permit activated'
        )
        
        return ok(data={'message': 'Permit activated'}, request=request)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete permit"""
        permit = self.get_object()
        if permit.status != 'active':
            return fail('INVALID_STATUS', 'Only active permits can be completed', status=400, request=request)
        
        permit.status = 'completed'
        permit.actual_end_time = timezone.now()
        permit.save()
        
        PermitAudit.objects.create(
            permit=permit,
            action='completed',
            user=request.user,
            comments='Permit completed'
        )
        
        return ok(data={'message': 'Permit completed'}, request=request)


class PermitExtensionViewSet(viewsets.ModelViewSet):
    """Permit extensions"""
    serializer_class = PermitExtensionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return PermitExtension.objects.filter(permit__athens_tenant_id=user.athens_tenant_id)
    
    @action(detail=True, methods=['post'])
    def approve_extension(self, request, pk=None):
        """Approve extension"""
        extension = self.get_object()
        if extension.status != 'pending':
            return fail('INVALID_STATUS', 'Only pending extensions can be approved', status=400, request=request)
        
        extension.status = 'approved'
        extension.approved_by = request.user
        extension.approved_at = timezone.now()
        extension.save()
        
        # Update permit end time
        permit = extension.permit
        permit.planned_end_time = extension.new_end_time
        permit.save()
        
        return ok(data={'message': 'Extension approved'}, request=request)


class DigitalSignatureViewSet(viewsets.ModelViewSet):
    """Digital signatures"""
    serializer_class = DigitalSignatureSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return DigitalSignature.objects.filter(permit__athens_tenant_id=user.athens_tenant_id)


class PermitAuditViewSet(viewsets.ReadOnlyModelViewSet):
    """Audit logs - read only"""
    serializer_class = PermitAuditSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return PermitAudit.objects.filter(permit__athens_tenant_id=user.athens_tenant_id)


class GasReadingViewSet(viewsets.ModelViewSet):
    """Gas readings"""
    serializer_class = GasReadingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return GasReading.objects.filter(permit__athens_tenant_id=user.athens_tenant_id)


class IsolationPointLibraryViewSet(viewsets.ModelViewSet):
    """Isolation point library"""
    serializer_class = IsolationPointLibrarySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return IsolationPointLibrary.objects.filter(athens_tenant_id=user.athens_tenant_id)


class PermitIsolationPointViewSet(viewsets.ModelViewSet):
    """Permit isolation points"""
    serializer_class = PermitIsolationPointSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return PermitIsolationPoint.objects.filter(permit__athens_tenant_id=user.athens_tenant_id)


class CloseoutChecklistTemplateViewSet(viewsets.ModelViewSet):
    """Closeout templates"""
    serializer_class = CloseoutChecklistTemplateSerializer
    permission_classes = [IsAuthenticated]
    queryset = CloseoutChecklistTemplate.objects.filter(is_active=True)


class PermitCloseoutViewSet(viewsets.ModelViewSet):
    """Permit closeouts"""
    serializer_class = PermitCloseoutSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return PermitCloseout.objects.filter(permit__athens_tenant_id=user.athens_tenant_id)

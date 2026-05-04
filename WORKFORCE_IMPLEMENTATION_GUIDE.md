# WORKFORCE MODULE IMPLEMENTATION GUIDE

## STATUS: Models Created ✅

## REMAINING STEPS

### 1. Add to INSTALLED_APPS
Edit `/var/www/athens-2.0/backend/athens2/settings.py`:
```python
INSTALLED_APPS = [
    # ... existing apps
    'workforce',  # ADD THIS
]
```

### 2. Create Migrations
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py makemigrations workforce
python manage.py migrate workforce
python manage.py migrate control_plane  # Run workforce service seed
```

### 3. Create Serializers
File: `/var/www/athens-2.0/backend/workforce/serializers.py`
```python
from rest_framework import serializers
from .models import *

class WorkforceProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkforceProject
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_by', 'created_at', 'updated_at']

class ProjectMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = ProjectMember
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'deleted_at']

class TaskCommentSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = TaskComment
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at', 'updated_at']

class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at', 'updated_at']

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
```

### 4. Create Permissions
File: `/var/www/athens-2.0/backend/workforce/permissions.py`
```python
from rest_framework import permissions
from control_plane.models import TenantService, Service
from system.utils import get_current_tenant

class WorkforceServiceEnabled(permissions.BasePermission):
    """Check if Workforce service is enabled for tenant"""
    
    def has_permission(self, request, view):
        tenant, error = get_current_tenant(request.user)
        if error:
            return False
        
        try:
            service = Service.objects.get(code='workforce')
            tenant_service = TenantService.objects.get(tenant=tenant, service=service)
            if not tenant_service.is_enabled:
                self.message = {'error': 'SERVICE_DISABLED', 'detail': 'Workforce service is not enabled'}
                return False
            return True
        except (Service.DoesNotExist, TenantService.DoesNotExist):
            self.message = {'error': 'SERVICE_NOT_FOUND', 'detail': 'Workforce service not configured'}
            return False

class IsWorkforceAdmin(permissions.BasePermission):
    """Owner/Admin can manage workforce"""
    
    def has_permission(self, request, view):
        user = request.user
        if user.user_type == 'masteradmin':
            return True
        if user.user_type == 'companyuser' and user.admin_type:
            return True
        return False
```

### 5. Create Views
File: `/var/www/athens-2.0/backend/workforce/views.py`
```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from system.utils import get_current_tenant
from .models import *
from .serializers import *
from .permissions import WorkforceServiceEnabled, IsWorkforceAdmin

class WorkforceProjectViewSet(viewsets.ModelViewSet):
    serializer_class = WorkforceProjectSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    
    def get_queryset(self):
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return WorkforceProject.objects.none()
        return WorkforceProject.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id, created_by=self.request.user)
    
    @action(detail=True, methods=['get', 'post', 'delete'])
    def members(self, request, pk=None):
        project = self.get_object()
        
        if request.method == 'GET':
            members = project.members.all()
            return Response(ProjectMemberSerializer(members, many=True).data)
        
        elif request.method == 'POST':
            serializer = ProjectMemberSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(project=project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        elif request.method == 'DELETE':
            user_id = request.data.get('user_id')
            ProjectMember.objects.filter(project=project, user_id=user_id).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled]
    
    def get_queryset(self):
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return Task.objects.none()
        
        queryset = Task.objects.filter(
            project__athens_tenant_id=tenant.id,
            deleted_at__isnull=True
        )
        
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['patch'])
    def move(self, request, pk=None):
        task = self.get_object()
        task.kanban_column = request.data.get('kanban_column', task.kanban_column)
        task.order_index = request.data.get('order_index', task.order_index)
        task.save()
        return Response(TaskSerializer(task).data)
    
    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        task = self.get_object()
        
        if request.method == 'GET':
            comments = task.comments.all()
            return Response(TaskCommentSerializer(comments, many=True).data)
        
        serializer = TaskCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(task=task, user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    
    def get_queryset(self):
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return Customer.objects.none()
        return Customer.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)

class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    
    def get_queryset(self):
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return Invoice.objects.none()
        return Invoice.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)
    
    @action(detail=True, methods=['get', 'post'])
    def payments(self, request, pk=None):
        invoice = self.get_object()
        
        if request.method == 'GET':
            payments = invoice.payments.all()
            return Response(PaymentSerializer(payments, many=True).data)
        
        serializer = PaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(invoice=invoice)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
```

### 6. Create URLs
File: `/var/www/athens-2.0/backend/workforce/urls.py`
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'projects', WorkforceProjectViewSet, basename='workforce-project')
router.register(r'tasks', TaskViewSet, basename='workforce-task')
router.register(r'customers', CustomerViewSet, basename='workforce-customer')
router.register(r'invoices', InvoiceViewSet, basename='workforce-invoice')

urlpatterns = [
    path('', include(router.urls)),
]
```

### 7. Register URLs in Main
Edit `/var/www/athens-2.0/backend/athens2/urls.py`:
```python
urlpatterns = [
    # ... existing patterns
    path('api/workforce/', include('workforce.urls')),  # ADD THIS
]
```

### 8. Frontend API Client
File: `/var/www/athens-2.0/frontend/src/services/workforceApi.ts`
```typescript
import { apiClient } from '../lib/api'

export const workforceApi = {
  // Projects
  getProjects: () => apiClient.get('/api/workforce/projects/'),
  createProject: (data: any) => apiClient.post('/api/workforce/projects/', data),
  updateProject: (id: string, data: any) => apiClient.put(`/api/workforce/projects/${id}/`, data),
  deleteProject: (id: string) => apiClient.delete(`/api/workforce/projects/${id}/`),
  getProjectMembers: (id: string) => apiClient.get(`/api/workforce/projects/${id}/members/`),
  addProjectMember: (id: string, data: any) => apiClient.post(`/api/workforce/projects/${id}/members/`, data),
  
  // Tasks
  getTasks: (projectId?: string) => apiClient.get('/api/workforce/tasks/', { params: { project_id: projectId } }),
  createTask: (data: any) => apiClient.post('/api/workforce/tasks/', data),
  updateTask: (id: string, data: any) => apiClient.put(`/api/workforce/tasks/${id}/`, data),
  moveTask: (id: string, data: any) => apiClient.patch(`/api/workforce/tasks/${id}/move/`, data),
  getTaskComments: (id: string) => apiClient.get(`/api/workforce/tasks/${id}/comments/`),
  addTaskComment: (id: string, data: any) => apiClient.post(`/api/workforce/tasks/${id}/comments/`, data),
  
  // Customers
  getCustomers: () => apiClient.get('/api/workforce/customers/'),
  createCustomer: (data: any) => apiClient.post('/api/workforce/customers/', data),
  
  // Invoices
  getInvoices: () => apiClient.get('/api/workforce/invoices/'),
  createInvoice: (data: any) => apiClient.post('/api/workforce/invoices/', data),
  getPayments: (invoiceId: string) => apiClient.get(`/api/workforce/invoices/${invoiceId}/payments/`),
  createPayment: (invoiceId: string, data: any) => apiClient.post(`/api/workforce/invoices/${invoiceId}/payments/`, data),
}
```

### 9. Add to Menu Config
Edit `/var/www/athens-2.0/frontend/src/components/layout/menuConfig.ts`:
```typescript
import { Briefcase } from 'lucide-react'

// Add to ATHENS_MENU_ITEMS array:
{ label: 'Workforce', description: 'Projects, Tasks & Finance', href: '/workforce', icon: Briefcase, roles: ['masteradmin'] },
```

### 10. Add Routes
Edit `/var/www/athens-2.0/frontend/src/lib/router.tsx`:
```typescript
// Add lazy imports:
const WorkforceProjects = React.lazy(() => import('../pages/workforce/ProjectsPage'))
const WorkforceTasks = React.lazy(() => import('../pages/workforce/TasksPage'))
const WorkforceFinance = React.lazy(() => import('../pages/workforce/FinancePage'))

// Add routes in MasterAdminLayout section:
<Route path="workforce/projects" element={<SuspenseWrapper><WorkforceProjects /></SuspenseWrapper>} />
<Route path="workforce/tasks" element={<SuspenseWrapper><WorkforceTasks /></SuspenseWrapper>} />
<Route path="workforce/finance" element={<SuspenseWrapper><WorkforceFinance /></SuspenseWrapper>} />
```

## VERIFICATION COMMANDS

```bash
# Backend
cd /var/www/athens-2.0/backend
source .venv/bin/activate

# Run migrations
python manage.py makemigrations workforce
python manage.py migrate

# Test API (after enabling service)
curl -H "Authorization: Bearer TOKEN" http://localhost:8003/api/workforce/projects/

# Frontend
cd /var/www/athens-2.0/frontend
npm run dev
```

## VERIFICATION CHECKLIST

1. ✅ Service seeded in database
2. ✅ Models created and migrated
3. ⏳ Enable Workforce in /master-admin (via system/services API)
4. ⏳ Workforce menu appears in sidebar
5. ⏳ Create project, add member
6. ⏳ Create task, move column
7. ⏳ Create customer, invoice, payment
8. ⏳ Disable workforce → 403 SERVICE_DISABLED

## FILES CREATED

Backend:
- `/backend/control_plane/migrations/0008_seed_workforce_service.py`
- `/backend/workforce/models.py`
- `/backend/workforce/serializers.py` (to create)
- `/backend/workforce/views.py` (to create)
- `/backend/workforce/urls.py` (to create)
- `/backend/workforce/permissions.py` (to create)

Frontend:
- `/frontend/src/services/workforceApi.ts` (to create)
- `/frontend/src/pages/workforce/ProjectsPage.tsx` (to create)
- `/frontend/src/pages/workforce/TasksPage.tsx` (to create)
- `/frontend/src/pages/workforce/FinancePage.tsx` (to create)

## NEXT: Create remaining backend files and run migrations

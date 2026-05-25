from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='ergon-project')
router.register(r'departments', DepartmentViewSet, basename='ergon-department')
router.register(r'task-categories', TaskCategoryViewSet, basename='ergon-task-category')
router.register(r'tasks', TaskViewSet, basename='ergon-task')
router.register(r'contacts', ContactViewSet, basename='ergon-contact')
router.register(r'followups', FollowupViewSet, basename='ergon-followup')
router.register(r'daily-planner', DailyPlannerViewSet, basename='ergon-daily-planner')
router.register(r'manpower', ManpowerViewSet, basename='ergon-manpower')
router.register(r'machinery', MachineryViewSet, basename='ergon-machinery')
router.register(r'resource-allocations', ResourceAllocationViewSet, basename='ergon-resource-allocation')
router.register(r'advances', AdvanceViewSet, basename='ergon-advance')
router.register(r'expenses', ExpenseViewSet, basename='ergon-expense')
router.register(r'ledger', LedgerEntryViewSet, basename='ergon-ledger')
router.register(r'customers', CustomerViewSet, basename='ergon-customer')
router.register(r'invoices', InvoiceViewSet, basename='ergon-invoice')

urlpatterns = [
    path('', include(router.urls)),
]

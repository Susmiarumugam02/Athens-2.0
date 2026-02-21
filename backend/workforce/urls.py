from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()

# MODULE 1: EMPLOYEE & WORKFORCE MANAGEMENT
router.register(r'departments', DepartmentViewSet, basename='workforce-department')
router.register(r'designations', DesignationViewSet, basename='workforce-designation')
router.register(r'employees', EmployeeViewSet, basename='workforce-employee')

# MODULE 2: ATTENDANCE & WORK HOURS MANAGEMENT
router.register(r'shifts', ShiftScheduleViewSet, basename='workforce-shift')
router.register(r'holidays', HolidayViewSet, basename='workforce-holiday')
router.register(r'attendance', AttendanceViewSet, basename='workforce-attendance')

# MODULE 3: PAYROLL & WAGE MANAGEMENT
router.register(r'payroll-cycles', PayrollCycleViewSet, basename='workforce-payroll-cycle')
router.register(r'payroll-entries', PayrollEntryViewSet, basename='workforce-payroll-entry')
router.register(r'payroll-settings', PayrollSettingsViewSet, basename='workforce-payroll-settings')
router.register(r'bonus-records', BonusRecordViewSet, basename='workforce-bonus')
router.register(r'fines', FineViewSet, basename='workforce-fine')
router.register(r'advances', AdvanceViewSet, basename='workforce-advance')

# LEGACY ENDPOINTS
router.register(r'profiles', EmployeeProfileViewSet, basename='workforce-profile')
router.register(r'leave-types', LeaveTypeViewSet, basename='workforce-leavetype')
router.register(r'leave-balances', LeaveBalanceViewSet, basename='workforce-leavebalance')
router.register(r'leave-requests', LeaveRequestViewSet, basename='workforce-leaverequest')

urlpatterns = [
    path('', include(router.urls)),
]

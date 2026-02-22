#!/usr/bin/env python3
"""Add CRUD method overrides to ViewSets for envelope support"""

CRUD_METHODS = '''
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
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)
'''

READONLY_METHODS = '''
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
'''

import re
import sys

def add_crud_to_viewset(content, viewset_name, is_readonly=False):
    """Add CRUD methods after ViewSet class definition"""
    methods = READONLY_METHODS if is_readonly else CRUD_METHODS
    
    # Find the ViewSet class
    pattern = rf'(class {viewset_name}\([^)]+\):.*?\n(?:    """[^"]*""".*?\n)?(?:    [^\n]+\n)*?)(    def |class |\Z)'
    
    def replacer(match):
        class_def = match.group(1)
        next_item = match.group(2)
        
        # Check if CRUD methods already exist
        if 'def list(self' in class_def or 'def retrieve(self' in class_def:
            return match.group(0)  # Already has CRUD methods
        
        return class_def + methods + '\n' + next_item
    
    return re.sub(pattern, replacer, content, flags=re.DOTALL)

def process_file(filepath, viewsets):
    """Process a file and add CRUD methods to specified ViewSets"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Ensure ok import exists
    if 'from system.api_response import ok' not in content:
        content = content.replace(
            'from rest_framework.response import Response',
            'from rest_framework.response import Response\nfrom system.api_response import ok, fail'
        )
    
    for viewset_name, is_readonly in viewsets:
        content = add_crud_to_viewset(content, viewset_name, is_readonly)
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✅ Processed {filepath}")

# Define ViewSets to process
PROJECTS_VIEWSETS = [
    ('ProjectViewSet', False),
    ('ProjectMembershipViewSet', False),
]

WORKFORCE_VIEWSETS = [
    ('DepartmentViewSet', False),
    ('DesignationViewSet', False),
    ('EmployeeViewSet', False),
    ('ShiftScheduleViewSet', False),
    ('HolidayViewSet', False),
    ('AttendanceViewSet', False),
    ('PayrollCycleViewSet', False),
    ('PayrollEntryViewSet', True),
    ('PayrollSettingsViewSet', False),
    ('BonusRecordViewSet', False),
    ('FineViewSet', False),
    ('AdvanceViewSet', False),
    ('EmployeeProfileViewSet', False),
    ('LeaveTypeViewSet', False),
    ('LeaveBalanceViewSet', False),
    ('LeaveRequestViewSet', False),
]

ERGON_VIEWSETS = [
    ('ProjectViewSet', False),
    ('DepartmentViewSet', False),
    ('TaskCategoryViewSet', False),
    ('TaskViewSet', False),
    ('ContactViewSet', False),
    ('FollowupViewSet', False),
    ('ManpowerViewSet', False),
    ('MachineryViewSet', False),
    ('AdvanceViewSet', False),
    ('ExpenseViewSet', False),
    ('LedgerEntryViewSet', False),
    ('CustomerViewSet', False),
    ('InvoiceViewSet', False),
    ('DailyPlannerViewSet', False),
]

if __name__ == '__main__':
    base = '/var/www/athens-2.0/backend'
    
    print("Adding CRUD overrides to ViewSets...")
    process_file(f'{base}/projects/views.py', PROJECTS_VIEWSETS)
    process_file(f'{base}/workforce/views.py', WORKFORCE_VIEWSETS)
    process_file(f'{base}/ergon/views.py', ERGON_VIEWSETS)
    print("\n✅ All ViewSets processed!")

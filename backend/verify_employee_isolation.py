#!/usr/bin/env python
"""
Multi-Tenant Isolation Diagnostic Script
Identifies the root cause of employee data leakage
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'athens2.settings')
django.setup()

from authentication.models import User
from workforce.models import Employee
from workforce.views import _get_role_isolated_employees
from django.db.models import Q

print("=" * 80)
print("MULTI-TENANT ISOLATION DIAGNOSTIC")
print("=" * 80)
print()

# Find Barath's admin account
print("[1] FINDING BARATH'S ADMIN ACCOUNT")
print("-" * 80)
barath_candidates = User.objects.filter(
    Q(email__icontains='barath') | Q(username__icontains='barath') | Q(name__icontains='barath')
)
print(f"Found {barath_candidates.count()} candidates:")
for user in barath_candidates:
    print(f"  - ID: {user.id}, Email: {user.email}, Type: {user.user_type}, Admin Type: {user.admin_type}, Project: {user.project_id}")

if not barath_candidates.exists():
    print("❌ No Barath admin found!")
    sys.exit(1)

barath = barath_candidates.first()
print(f"\n✅ Using: {barath.email} (ID: {barath.id})")
print()

# Check Barath's details
print("[2] BARATH'S ADMIN DETAILS")
print("-" * 80)
print(f"User Type: {barath.user_type}")
print(f"Admin Type: {barath.admin_type}")
print(f"Role Type: {getattr(barath, 'role_type', 'N/A')}")
print(f"Project ID: {barath.project_id}")
print(f"Project: {barath.project.projectName if barath.project else 'None'}")
print(f"Company ID: {getattr(barath, 'company_id', 'N/A')}")
print(f"Tenant ID: {barath.tenant_id if hasattr(barath, 'tenant_id') else 'N/A'}")
print(f"Athens Tenant ID: {getattr(barath, 'athens_tenant_id', 'N/A')}")
print()

# Check employees created by Barath
print("[3] EMPLOYEES CREATED BY BARATH")
print("-" * 80)
barath_employees = Employee.objects.filter(created_by_admin=barath)
print(f"Total: {barath_employees.count()}")
for emp in barath_employees:
    print(f"  ✓ ID: {emp.id}, Name: {emp.full_name}, Code: {emp.employee_code}")
    print(f"    - created_by_admin_type: {emp.created_by_admin_type}")
    print(f"    - organization_type: {emp.organization_type}")
    print(f"    - athens_tenant_id: {emp.athens_tenant_id}")
    print(f"    - status: {emp.status}")
print()

# Check Employee ID 8 (should be visible)
print("[4] EMPLOYEE ID 8 (SHOULD BE VISIBLE)")
print("-" * 80)
emp_8 = Employee.objects.filter(id=8).first()
if emp_8:
    print(f"✓ Found: {emp_8.full_name}")
    print(f"  - Employee Code: {emp_8.employee_code}")
    print(f"  - Created By: {emp_8.created_by_admin.email if emp_8.created_by_admin else 'None'}")
    print(f"  - Created By Admin Type: {emp_8.created_by_admin_type}")
    print(f"  - Organization Type: {emp_8.organization_type}")
    print(f"  - Athens Tenant ID: {emp_8.athens_tenant_id}")
    print(f"  - Status: {emp_8.status}")
else:
    print("❌ Employee ID 8 not found!")
print()

# Check Employee ID 38 (should NOT be visible)
print("[5] EMPLOYEE ID 38 (SHOULD NOT BE VISIBLE)")
print("-" * 80)
emp_38 = Employee.objects.filter(id=38).first()
if emp_38:
    print(f"⚠️  Found: {emp_38.full_name}")
    print(f"  - Employee Code: {emp_38.employee_code}")
    print(f"  - Created By: {emp_38.created_by_admin.email if emp_38.created_by_admin else 'None'}")
    print(f"  - Created By Admin Type: {emp_38.created_by_admin_type}")
    print(f"  - Organization Type: {emp_38.organization_type}")
    print(f"  - Athens Tenant ID: {emp_38.athens_tenant_id}")
    print(f"  - Status: {emp_38.status}")
    
    # Check if it matches Barath's criteria
    print(f"\n  Isolation Check:")
    print(f"  - Same tenant? {emp_38.athens_tenant_id == getattr(barath, 'athens_tenant_id', None)}")
    print(f"  - Same admin type? {emp_38.created_by_admin_type == barath.admin_type}")
    print(f"  - Same project? {emp_38.created_by_admin.project_id == barath.project_id if emp_38.created_by_admin else False}")
else:
    print("✓ Employee ID 38 not found (good if it shouldn't be visible)")
print()

# Test isolation function
print("[6] TESTING _get_role_isolated_employees() FUNCTION")
print("-" * 80)
isolated_employees = _get_role_isolated_employees(barath)
print(f"Total isolated employees: {isolated_employees.count()}")
print(f"\nEmployee IDs returned:")
for emp in isolated_employees.order_by('id'):
    print(f"  - ID: {emp.id}, Name: {emp.full_name}, Type: {emp.created_by_admin_type}, Org: {emp.organization_type}")

# Check if ID 38 is in the results
if isolated_employees.filter(id=38).exists():
    print(f"\n❌ PROBLEM: Employee ID 38 IS in isolated results (should NOT be)")
else:
    print(f"\n✅ GOOD: Employee ID 38 is NOT in isolated results")

if isolated_employees.filter(id=8).exists():
    print(f"✅ GOOD: Employee ID 8 IS in isolated results (should be)")
else:
    print(f"❌ PROBLEM: Employee ID 8 is NOT in isolated results (should be)")
print()

# Check all employees with same name
print("[7] ALL EMPLOYEES NAMED 'SUSMITHA'")
print("-" * 80)
susmitha_employees = Employee.objects.filter(full_name__icontains='susmitha')
print(f"Total: {susmitha_employees.count()}")
for emp in susmitha_employees:
    print(f"  - ID: {emp.id}, Name: {emp.full_name}, Code: {emp.employee_code}")
    print(f"    Created By: {emp.created_by_admin.email if emp.created_by_admin else 'None'}")
    print(f"    Admin Type: {emp.created_by_admin_type}, Org Type: {emp.organization_type}")
    print(f"    Tenant: {emp.athens_tenant_id}, Status: {emp.status}")
    print()

# Summary
print("=" * 80)
print("DIAGNOSTIC SUMMARY")
print("=" * 80)
print(f"Barath Admin Type: {barath.admin_type}")
print(f"Barath Project: {barath.project_id}")
print(f"Employees Barath should see: {barath_employees.count()}")
print(f"Employees isolation function returns: {isolated_employees.count()}")
print()

if isolated_employees.count() > barath_employees.count():
    print("⚠️  WARNING: Isolation function returns MORE employees than expected!")
    print("   This indicates a data leakage issue.")
    extra_ids = set(isolated_employees.values_list('id', flat=True)) - set(barath_employees.values_list('id', flat=True))
    print(f"   Extra employee IDs: {extra_ids}")
elif isolated_employees.count() < barath_employees.count():
    print("⚠️  WARNING: Isolation function returns FEWER employees than expected!")
    print("   Some employees may be missing isolation fields.")
else:
    print("✅ Isolation function returns correct number of employees")

print()
print("=" * 80)
print("DIAGNOSTIC COMPLETE")
print("=" * 80)

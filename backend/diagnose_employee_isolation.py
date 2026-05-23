#!/usr/bin/env python
"""
CRITICAL SECURITY DIAGNOSTIC: Employee Management Isolation
Investigates reported cross-tenant/cross-project employee data leakage.
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'athens2.settings')
django.setup()

from authentication.models import User
from workforce.models import Employee
from django.db.models import Q

print("=" * 80)
print("EMPLOYEE ISOLATION SECURITY DIAGNOSTIC")
print("=" * 80)

# Find Meena (EPC Admin)
print("\n[1] FINDING MEENA (EPC ADMIN)")
print("-" * 80)
meena_users = User.objects.filter(
    Q(email__icontains='meena') | Q(name__icontains='meena')
)
print(f"Found {meena_users.count()} users matching 'Meena':")
for u in meena_users:
    print(f"  - ID: {u.id}, Email: {u.email}, Name: {u.name}")
    print(f"    user_type: {u.user_type}, admin_type: {u.admin_type}")
    print(f"    project: {u.project}, company_id: {u.company_id}")
    print(f"    tenant: {u.tenant}")

if not meena_users.exists():
    print("\n❌ MEENA NOT FOUND - Cannot proceed with diagnostic")
    sys.exit(1)

meena = meena_users.first()
print(f"\n✓ Using Meena: ID={meena.id}, Email={meena.email}")

# Find Harini (Employee Code 002)
print("\n[2] FINDING HARINI (EMPLOYEE CODE 002)")
print("-" * 80)
harini_employees = Employee.objects.filter(
    Q(employee_code='002') | Q(employee_code='0002') | Q(full_name__icontains='harini')
).exclude(status='inactive')
print(f"Found {harini_employees.count()} employees matching 'Harini' or code '002':")
for e in harini_employees:
    print(f"  - ID: {e.id}, Code: {e.employee_code}, Name: {e.full_name}")
    print(f"    tenant_id: {e.athens_tenant_id}")
    print(f"    created_by_admin: {e.created_by_admin_id} ({e.created_by_admin})")
    print(f"    created_by_admin_type: {e.created_by_admin_type}")
    print(f"    organization_type: {e.organization_type}")
    print(f"    status: {e.status}")

# Check ALL employees in Meena's tenant
print(f"\n[3] ALL EMPLOYEES IN MEENA'S TENANT (tenant_id={meena.company_id or 'N/A'})")
print("-" * 80)
if meena.tenant:
    tenant_id = meena.tenant.id
elif meena.company_id:
    tenant_id = meena.company_id
else:
    tenant_id = meena.id

all_employees = Employee.objects.filter(
    athens_tenant_id=tenant_id
).exclude(status='inactive').order_by('employee_code')
print(f"Total employees in tenant {tenant_id}: {all_employees.count()}")
for e in all_employees[:20]:  # Show first 20
    print(f"  - [{e.employee_code}] {e.full_name}")
    print(f"    Created by: Admin ID {e.created_by_admin_id} (type: {e.created_by_admin_type})")
    print(f"    Organization: {e.organization_type}")

# Apply isolation filter (same as EmployeeViewSet.get_queryset)
print(f"\n[4] APPLYING ISOLATION FILTER FOR MEENA")
print("-" * 80)
print(f"Meena's details:")
print(f"  - user_type: {meena.user_type}")
print(f"  - admin_type: {meena.admin_type}")
print(f"  - project: {meena.project}")
print(f"  - company_id: {meena.company_id}")

qs = Employee.objects.filter(
    athens_tenant_id=tenant_id
).exclude(status='inactive')

if meena.user_type == 'superadmin':
    print("  → SuperAdmin: sees ALL employees")
    isolated_employees = qs
elif meena.user_type == 'masteradmin':
    print("  → MasterAdmin: sees ALL employees in tenant")
    isolated_employees = qs
elif meena.admin_type in ('client', 'epc', 'contractor'):
    print(f"  → {meena.admin_type.upper()} Admin: applying isolation filter")
    isolated_employees = qs.filter(
        Q(created_by_admin=meena) |
        Q(created_by_admin_type=meena.admin_type, created_by_admin__project=meena.project)
    )
else:
    print("  → Regular user: NO ACCESS")
    isolated_employees = qs.none()

print(f"\nIsolated employee count: {isolated_employees.count()}")
print("Employees Meena SHOULD see:")
for e in isolated_employees.order_by('employee_code'):
    print(f"  - [{e.employee_code}] {e.full_name}")
    print(f"    Created by: Admin ID {e.created_by_admin_id} (type: {e.created_by_admin_type})")

# Check if Harini is in the isolated list
print(f"\n[5] CROSS-CHECK: IS HARINI VISIBLE TO MEENA?")
print("-" * 80)
if harini_employees.exists():
    harini = harini_employees.first()
    is_visible = isolated_employees.filter(id=harini.id).exists()
    print(f"Harini (ID {harini.id}, Code {harini.employee_code}):")
    print(f"  - Created by: Admin ID {harini.created_by_admin_id} ({harini.created_by_admin})")
    print(f"  - Admin type: {harini.created_by_admin_type}")
    print(f"  - Organization: {harini.organization_type}")
    print(f"  - Visible to Meena: {'❌ YES (BUG!)' if is_visible else '✅ NO (CORRECT)'}")
    
    if is_visible:
        print("\n⚠️  SECURITY ISSUE CONFIRMED: Harini should NOT be visible to Meena")
        print("Root cause analysis:")
        if harini.created_by_admin_id == meena.id:
            print("  - Harini was created by Meena (created_by_admin matches)")
        if harini.created_by_admin_type == meena.admin_type:
            print(f"  - Harini's admin_type ({harini.created_by_admin_type}) matches Meena's ({meena.admin_type})")
            if harini.created_by_admin and harini.created_by_admin.project == meena.project:
                print(f"  - Harini's creator project matches Meena's project ({meena.project})")
        if harini.organization_type == meena.admin_type:
            print(f"  - Harini's organization_type ({harini.organization_type}) matches Meena's admin_type ({meena.admin_type})")
else:
    print("Harini not found in database")

# Check for NULL/empty isolation fields
print(f"\n[6] CHECKING FOR MISSING ISOLATION DATA")
print("-" * 80)
missing_admin = Employee.objects.filter(
    athens_tenant_id=tenant_id,
    created_by_admin__isnull=True
).exclude(status='inactive').count()
missing_admin_type = Employee.objects.filter(
    athens_tenant_id=tenant_id,
    created_by_admin_type__in=['', 'unknown']
).exclude(status='inactive').count()
missing_org_type = Employee.objects.filter(
    athens_tenant_id=tenant_id,
    organization_type__in=['', 'unknown']
).exclude(status='inactive').count()

print(f"Employees with missing isolation fields:")
print(f"  - created_by_admin NULL: {missing_admin}")
print(f"  - created_by_admin_type empty/unknown: {missing_admin_type}")
print(f"  - organization_type empty/unknown: {missing_org_type}")

if missing_admin > 0 or missing_admin_type > 0 or missing_org_type > 0:
    print("\n⚠️  WARNING: Some employees have incomplete isolation metadata")
    print("This may cause incorrect visibility across projects/organizations")

print("\n" + "=" * 80)
print("DIAGNOSTIC COMPLETE")
print("=" * 80)

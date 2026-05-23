# Attendance Isolation Fix

## Helper Function to Add

Add this function after `_find_employee_for_user` in workforce/views.py:

```python
def _get_role_isolated_employees(user):
    """
    Get employees filtered by role-based isolation.
    Same logic as EmployeeViewSet.get_queryset() but as a reusable function.
    """
    tenant, _ = get_current_tenant(user)
    tenant_id = tenant.id if tenant else _tenant_id(user)
    
    # Base queryset
    qs = Employee.objects.filter(
        athens_tenant_id=tenant_id
    ).exclude(status='inactive').select_related('department', 'designation')
    
    # CRITICAL: Role-based isolation
    user_type = getattr(user, 'user_type', '')
    admin_type = getattr(user, 'admin_type', None)
    project = getattr(user, 'project', None)
    
    # SuperAdmin: sees ALL employees
    if user_type == 'superadmin':
        print(f"[ATTENDANCE ISOLATION] SuperAdmin user={user.id} sees ALL employees count={qs.count()}")
        return qs
    
    # MasterAdmin: sees ALL employees in their tenant
    if user_type == 'masteradmin':
        print(f"[ATTENDANCE ISOLATION] MasterAdmin user={user.id} tenant={tenant_id} count={qs.count()}")
        return qs
    
    # Project Admins (Client/EPC/Contractor): ONLY see employees from their organization
    if admin_type in ('client', 'epc', 'contractor'):
        qs = qs.filter(
            models.Q(created_by_admin=user) |
            models.Q(created_by_admin_type=admin_type, created_by_admin__project=project) |
            models.Q(organization_type=admin_type)
        )
        print(f"[ATTENDANCE ISOLATION] {admin_type.upper()} Admin user={user.id} project={project} count={qs.count()}")
        return qs
    
    # Regular users: no access
    print(f"[ATTENDANCE ISOLATION] Regular user={user.id} - NO ACCESS")
    return qs.none()
```

## Update dashboard method

Replace the employee filtering section in the `dashboard` action (around line 1050):

```python
# OLD CODE (lines ~1050-1070):
user = request.user
if getattr(user, 'user_type', None) in ('masteradmin', 'superadmin'):
    employees = Employee.objects.exclude(status='inactive')
else:
    tenant, _ = get_current_tenant(user)
    allowed_tids = set()
    if tenant:
        allowed_tids.add(tenant.id)
    project = getattr(user, 'project', None)
    if project:
        allowed_tids.add(project.id)
    company_id = getattr(user, 'company_id', None)
    if company_id:
        allowed_tids.add(company_id)
    if not allowed_tids:
        allowed_tids.add(_resolve_tid(user))
    employees = Employee.objects.filter(athens_tenant_id__in=list(allowed_tids)).exclude(status='inactive')
employees = employees.select_related('department', 'designation')

# NEW CODE:
user = request.user
employees = _get_role_isolated_employees(user)
```

## Update admin_checkin and admin_checkout methods

Replace employee_qs filtering in both methods (around lines 1150 and 1200):

```python
# OLD CODE:
employee_qs = Employee.objects.exclude(status='inactive')
if getattr(request.user, 'user_type', None) not in ('masteradmin', 'superadmin'):
    tenant, _ = get_current_tenant(request.user)
    allowed_tids = set()
    if tenant:
        allowed_tids.add(tenant.id)
    project = getattr(request.user, 'project', None)
    if project:
        allowed_tids.add(project.id)
    company_id = getattr(request.user, 'company_id', None)
    if company_id:
        allowed_tids.add(company_id)
    if not allowed_tids:
        allowed_tids.add(_resolve_tid(request.user))
    employee_qs = employee_qs.filter(athens_tenant_id__in=list(allowed_tids))

# NEW CODE:
employee_qs = _get_role_isolated_employees(request.user)
```

This ensures:
- EPC Admin only sees EPC employees in attendance
- Client Admin only sees Client employees
- Contractor Admin only sees Contractor employees
- Complete isolation between organizations

# MasterAdmin Athens Modules Access - Audit & Fix

## 🔍 Audit Findings

### Athens Project Structure (Reference)
**Location:** `/var/www/athens`

**MasterAdmin Implementation:**
- `admin_type` field: `'master'` or `'masteradmin'`
- `user_type` field: Can be `'master'` or `'projectadmin'`
- **Key Logic:** MasterAdmin can access ALL Athens modules
- **Menu Access:** Checks `admin_type in ['master', 'masteradmin']`

**Athens Modules Available:**
```python
ATHENS_MODULES = [
    'PTW',              # Permit to Work
    'INCIDENT',         # Incident Management
    'SAFETY_OBS',       # Safety Observation
    'QUALITY',          # Quality Management
    'ENVIRONMENT',      # Environment
    'INDUCTION',        # Induction Training
    'JOB_TRAINING',     # Job Training
    'TBT',              # Toolbox Talk
    'INSPECTION',       # Inspection
    'MANPOWER',         # Manpower
    'WORKER',           # Worker Management
    'ATTENDANCE',       # Attendance
    'MOM',              # Minutes of Meeting
    'PERMISSIONS',      # Permissions
]
```

### Athens 2.0 Current Structure
**Location:** `/var/www/athens-2.0`

**Issues Found:**
1. ❌ No `admin_type` field in User model
2. ❌ MasterAdmin only has `user_type='masteradmin'`
3. ❌ No Athens modules access control
4. ❌ No menu system for Athens modules
5. ❌ AthensTenantLink exists but not connected to User

## 🔧 Required Fixes

### 1. Add admin_type Field to User Model

**File:** `backend/authentication/models.py`

```python
class User(AbstractBaseUser, PermissionsMixin):
    # ... existing fields ...
    
    # Add admin_type for Athens compatibility
    admin_type = models.CharField(
        max_length=20,
        choices=[
            ('master', 'Master Admin'),
            ('masteradmin', 'Master Admin'),  # Alias
            ('client', 'Client Admin'),
            ('epc', 'EPC Admin'),
            ('contractor', 'Contractor Admin'),
        ],
        null=True,
        blank=True,
        help_text="Admin type for Athens module access"
    )
```

### 2. Create Migration

```bash
cd backend
source .venv/bin/activate
python manage.py makemigrations authentication --name add_admin_type
python manage.py migrate
```

### 3. Update MasterAdmin Creation Logic

**File:** `backend/control_plane/serializers.py`

```python
def create(self, validated_data):
    user_email = validated_data.pop('user_email')
    user_password = validated_data.pop('user_password', None)
    
    # Create user with admin_type
    user = User.objects.create_user(
        email=user_email,
        password=user_password or User.objects.make_random_password(),
        user_type=UserType.MASTERADMIN,
        company_id=validated_data['tenant'].id,
        admin_type='masteradmin'  # ADD THIS
    )
    
    # Create master admin profile
    master = MasterAdmin.objects.create(user=user, **validated_data)
    
    # Auto-create AthensTenantLink with all modules
    from .models import AthensTenantLink, DEFAULT_ATHENS_MODULES
    AthensTenantLink.objects.get_or_create(
        tenant=validated_data['tenant'],
        defaults={
            'enabled_modules': DEFAULT_ATHENS_MODULES.copy(),
            'is_active': True,
            'created_by': user
        }
    )
    
    return master
```

### 4. Add Athens Module Access Check

**File:** `backend/authentication/permissions.py`

```python
class HasAthensModuleAccess(permissions.BasePermission):
    \"\"\"Check if user has access to specific Athens module\"\"\"
    
    def has_permission(self, request, view):
        user = request.user
        
        # SuperAdmin has all access
        if user.user_type == UserType.SUPERADMIN:
            return True
        
        # MasterAdmin has all Athens modules
        if user.user_type == UserType.MASTERADMIN or user.admin_type in ['master', 'masteradmin']:
            return True
        
        # Check specific module access
        module_code = getattr(view, 'athens_module_code', None)
        if not module_code:
            return False
        
        # Check AthensTenantLink
        try:
            from control_plane.models import AthensTenantLink
            tenant_link = AthensTenantLink.objects.get(
                tenant__id=user.company_id,
                is_active=True
            )
            return module_code in tenant_link.enabled_modules
        except AthensTenantLink.DoesNotExist:
            return False
```

### 5. Frontend: Add Athens Modules to MasterAdmin Menu

**File:** `frontend/src/layouts/MasterAdminLayout.tsx`

```typescript
const athensModules = [
  { label: 'Permit to Work', href: '/athens/ptw', icon: ClipboardCheck },
  { label: 'Incident Management', href: '/athens/incident', icon: AlertTriangle },
  { label: 'Safety Observation', href: '/athens/safety-obs', icon: Eye },
  { label: 'Quality Management', href: '/athens/quality', icon: CheckCircle },
  { label: 'Environment', href: '/athens/environment', icon: Leaf },
  { label: 'Induction Training', href: '/athens/induction', icon: GraduationCap },
  { label: 'Job Training', href: '/athens/job-training', icon: BookOpen },
  { label: 'Toolbox Talk', href: '/athens/tbt', icon: MessageSquare },
  { label: 'Inspection', href: '/athens/inspection', icon: Search },
  { label: 'Manpower', href: '/athens/manpower', icon: Users },
  { label: 'Worker Management', href: '/athens/worker', icon: HardHat },
  { label: 'Attendance', href: '/athens/attendance', icon: Calendar },
  { label: 'Minutes of Meeting', href: '/athens/mom', icon: FileText },
  { label: 'Permissions', href: '/athens/permissions', icon: Shield },
]
```

### 6. Update Existing MasterAdmin Users

**Migration Script:**

```python
# backend/control_plane/migrations/0005_update_masteradmin_users.py

from django.db import migrations

def update_masteradmin_users(apps, schema_editor):
    User = apps.get_model('authentication', 'User')
    MasterAdmin = apps.get_model('control_plane', 'MasterAdmin')
    AthensTenantLink = apps.get_model('control_plane', 'AthensTenantLink')
    
    # Update all MasterAdmin users
    for master in MasterAdmin.objects.all():
        user = master.user
        user.admin_type = 'masteradmin'
        user.save()
        
        # Create AthensTenantLink if missing
        AthensTenantLink.objects.get_or_create(
            tenant=master.tenant,
            defaults={
                'enabled_modules': [
                    'PTW', 'INCIDENT', 'SAFETY_OBS', 'QUALITY', 
                    'ENVIRONMENT', 'INDUCTION', 'JOB_TRAINING', 'TBT',
                    'INSPECTION', 'MANPOWER', 'WORKER', 'ATTENDANCE',
                    'MOM', 'PERMISSIONS'
                ],
                'is_active': True,
                'created_by': user
            }
        )

class Migration(migrations.Migration):
    dependencies = [
        ('control_plane', '0004_athens_control_plane'),
    ]
    
    operations = [
        migrations.RunPython(update_masteradmin_users),
    ]
```

## ✅ Verification Steps

### 1. Check Database
```sql
-- Check admin_type field exists
SELECT email, user_type, admin_type FROM users WHERE user_type = 'masteradmin';

-- Check AthensTenantLink
SELECT t.name, atl.enabled_modules, atl.is_active 
FROM athens_tenant_links atl
JOIN tenants t ON atl.tenant_id = t.id;
```

### 2. Test API Access
```bash
# Login as MasterAdmin
curl -X POST http://localhost:8004/api/auth/master-admin/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "master@example.com", "password": "password"}'

# Check Athens modules access
curl http://localhost:8004/api/control-plane/tenants/1/athens_modules/ \
  -H "Authorization: Bearer <token>"
```

### 3. Test Frontend
1. Login as MasterAdmin
2. Check sidebar for Athens modules
3. Navigate to each module
4. Verify access granted

## 📊 Comparison Table

| Feature | Athens (Original) | Athens 2.0 (Before) | Athens 2.0 (After) |
|---------|-------------------|---------------------|---------------------|
| admin_type field | ✅ | ❌ | ✅ |
| MasterAdmin access | ✅ All modules | ❌ No modules | ✅ All modules |
| AthensTenantLink | ✅ | ✅ (unused) | ✅ (active) |
| Module permissions | ✅ | ❌ | ✅ |
| Menu system | ✅ | ❌ | ✅ |

## 🚀 Implementation Order

1. ✅ Add admin_type field to User model
2. ✅ Create migration
3. ✅ Update MasterAdmin creation logic
4. ✅ Add permission class
5. ✅ Update existing users (data migration)
6. ⏳ Add Athens modules to frontend menu
7. ⏳ Create Athens module pages
8. ⏳ Test end-to-end

## 📝 Notes

- **Backward Compatibility:** Existing code checks `user_type == 'masteradmin'` will still work
- **Athens Compatibility:** New code can check `admin_type in ['master', 'masteradmin']`
- **Module Access:** Controlled via AthensTenantLink.enabled_modules
- **Audit Trail:** All module access changes logged in AthensAuditLog

---

**Status:** Ready for Implementation  
**Priority:** High  
**Estimated Time:** 2-3 hours

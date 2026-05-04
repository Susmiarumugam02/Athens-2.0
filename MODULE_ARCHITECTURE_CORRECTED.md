# Module Architecture - Corrected Structure

## Overview
ERGON and Workforce are **category names**, not individual modules. Each category contains multiple components/sub-modules that can be independently enabled/disabled per project.

## Architecture Hierarchy

```
Project
  └── Module Categories
       ├── ERGON (Operations & Finance)
       │    ├── Task Management
       │    ├── Daily Planner
       │    ├── Follow-ups
       │    ├── Advance/Expenses
       │    ├── Manpower/Machinery
       │    └── Financial Ledger
       │
       ├── Workforce (HR & Attendance)
       │    ├── Profile Management
       │    ├── Attendance
       │    └── Leave Management
       │
       └── Other Modules
            ├── Permit to Work
            ├── Incident Management
            ├── Safety Observation
            └── Training
```

## Module Component Codes

### ERGON Category Components
| Code | Name | Description |
|------|------|-------------|
| `ergon_tasks` | Task Management | Create and manage tasks |
| `ergon_planner` | Daily Planner | Daily task execution with SLA tracking |
| `ergon_followups` | Follow-ups | Track task follow-ups and reminders |
| `ergon_advance` | Advance/Expenses | Manage advances and expenses |
| `ergon_manpower` | Manpower/Machinery | Resource allocation |
| `ergon_ledger` | Financial Ledger | Financial tracking |

### Workforce Category Components
| Code | Name | Description |
|------|------|-------------|
| `workforce_profile` | Profile Management | Employee profiles |
| `workforce_attendance` | Attendance | Track attendance |
| `workforce_leave` | Leave Management | Leave requests and approvals |

### Other Modules
| Code | Name | Description |
|------|------|-------------|
| `ptw` | Permit to Work | Safety permits |
| `incident` | Incident Management | Report and track incidents |
| `safety` | Safety Observation | Safety observations |
| `training` | Training | Employee training |

## Database Schema

### ProjectModule Model
```python
class ProjectModule(models.Model):
    MODULE_CHOICES = [
        # ERGON Category Components
        ('ergon_tasks', 'ERGON - Task Management'),
        ('ergon_planner', 'ERGON - Daily Planner'),
        ('ergon_followups', 'ERGON - Follow-ups'),
        ('ergon_advance', 'ERGON - Advance/Expenses'),
        ('ergon_manpower', 'ERGON - Manpower/Machinery'),
        ('ergon_ledger', 'ERGON - Financial Ledger'),
        
        # Workforce Category Components
        ('workforce_profile', 'Workforce - Profile Management'),
        ('workforce_attendance', 'Workforce - Attendance'),
        ('workforce_leave', 'Workforce - Leave Management'),
        
        # Other Modules
        ('ptw', 'Permit to Work'),
        ('incident', 'Incident Management'),
        ('safety', 'Safety Observation'),
        ('training', 'Training'),
    ]
    
    project_id = models.IntegerField(db_index=True)
    athens_tenant_id = models.IntegerField(db_index=True)
    module_code = models.CharField(max_length=50, choices=MODULE_CHOICES)
    is_enabled = models.BooleanField(default=True)
```

## Frontend Implementation

### Module Enablement UI (MasterAdmin)
Located at: `/master-admin/projects/{id}/modules`

Shows categories with their components:
```
┌─ ERGON ─────────────────────────────────────┐
│ Operations & Finance Management             │
├─────────────────────────────────────────────┤
│ ☑ Task Management                      [ON] │
│ ☑ Daily Planner                        [ON] │
│ ☐ Follow-ups                          [OFF] │
│ ☐ Advance/Expenses                    [OFF] │
│ ☐ Manpower/Machinery                  [OFF] │
│ ☐ Financial Ledger                    [OFF] │
└─────────────────────────────────────────────┘

┌─ Workforce ─────────────────────────────────┐
│ HR, Attendance & Leave Management           │
├─────────────────────────────────────────────┤
│ ☑ Profile Management                   [ON] │
│ ☑ Attendance                           [ON] │
│ ☐ Leave Management                    [OFF] │
└─────────────────────────────────────────────┘
```

### Company Dashboard
Shows category cards if ANY component is enabled:

```
┌─────────────────┐  ┌─────────────────┐
│  ⚡ ERGON       │  │  👥 Workforce   │
│                 │  │                 │
│  Operations &   │  │  HR, Attendance │
│  Finance Mgmt   │  │  & Leave Mgmt   │
│                 │  │                 │
│  6 components   │  │  3 components   │
└─────────────────┘  └─────────────────┘
```

### Menu Items (Sidebar)
Menu items are filtered by component enablement:

```
Dashboard
─────────────
ERGON
  ├─ Task Management      (if ergon_tasks enabled)
  ├─ Daily Planner        (if ergon_planner enabled)
  ├─ Follow-ups           (if ergon_followups enabled)
  ├─ Advance/Expenses     (if ergon_advance enabled)
  ├─ Manpower/Machinery   (if ergon_manpower enabled)
  └─ Financial Ledger     (if ergon_ledger enabled)

Workforce
  ├─ Profile Management   (if workforce_profile enabled)
  ├─ Attendance           (if workforce_attendance enabled)
  └─ Leave Management     (if workforce_leave enabled)
```

## API Endpoints

### Get Enabled Modules
```
GET /api/control-plane/project-modules/enabled/
```

Returns array of enabled component codes:
```json
[
  { "module_code": "ergon_tasks", "is_enabled": true },
  { "module_code": "ergon_planner", "is_enabled": true },
  { "module_code": "workforce_profile", "is_enabled": true },
  { "module_code": "workforce_attendance", "is_enabled": true }
]
```

### Toggle Module Component
```
POST /api/control-plane/project-modules/toggle/
{
  "project_id": 1,
  "module_code": "ergon_planner",
  "is_enabled": true
}
```

## Permission Checks

### Backend Permission Classes
```python
# Check if specific component is enabled
class ErgonTasksEnabled(BasePermission):
    def has_permission(self, request, view):
        return check_module_enabled(request.user, 'ergon_tasks')

class ErgonPlannerEnabled(BasePermission):
    def has_permission(self, request, view):
        return check_module_enabled(request.user, 'ergon_planner')
```

### Frontend Route Guards
```typescript
// Menu item with component requirement
{
  label: 'Daily Planner',
  href: '/app/ergon/planner',
  moduleRequired: 'ergon_planner'
}
```

## Migration Path

### From Old Structure
Old structure treated ERGON and Workforce as single modules:
- `ergon` → Split into 6 components
- `workforce` → Split into 3 components

### Migration Strategy
1. ✅ Update `ProjectModule.MODULE_CHOICES` with component codes
2. ✅ Create migration `0010_update_module_components.py`
3. ✅ Apply migration to update field choices
4. ⏳ Data migration: Convert existing `ergon`/`workforce` entries to component entries
5. ⏳ Update frontend to use new component codes
6. ⏳ Update permission checks to use component codes

## Key Differences

### Before (Incorrect)
```
ERGON = Single Module
Workforce = Single Module
```

### After (Correct)
```
ERGON = Category containing 6 components
Workforce = Category containing 3 components
```

## Benefits of Component-Based Architecture

1. **Granular Control**: Enable only needed components per project
2. **Flexible Licensing**: Charge per component instead of entire category
3. **Progressive Rollout**: Enable components gradually as features are ready
4. **Better UX**: Users see only relevant menu items
5. **Clearer Permissions**: Component-level access control

## Files Updated

### Backend
- ✅ `/backend/control_plane/project_modules.py` - Updated MODULE_CHOICES
- ✅ `/backend/control_plane/migrations/0010_update_module_components.py` - Migration

### Frontend
- ✅ `/frontend/src/pages/masteradmin/ProjectModules.tsx` - Category-based UI
- ✅ `/frontend/src/components/layout/menuConfig.ts` - Component-based menu items
- ✅ `/frontend/src/pages/company/DashboardSimple.tsx` - Category cards with component count

## Next Steps

1. Create data migration to convert existing module entries
2. Update all permission checks to use component codes
3. Update Menu Management to handle component-level visibility
4. Update documentation to reflect component architecture
5. Test component enablement flow end-to-end

---

**Status**: ✅ Architecture Corrected | ⏳ Data Migration Pending | ⏳ Permission Updates Pending

# Django Admin - Service Tier Management

## ✅ Now Available

Django Admin now has **TenantService** registered with a proper tier dropdown!

---

## How to Use

### Step 1: Access Django Admin
```
http://localhost:8004/admin/
or
https://www.ai-athens.cloud/admin/
```

### Step 2: Login
- Username: Your superadmin email
- Password: Your superadmin password

### Step 3: Navigate to Tenant Services
```
Home → Control Plane → Tenant Services
```

### Step 4: Change Tier

**Method A: Quick Edit (List View)**
1. Find the service you want to change
2. Click the **tier dropdown** in the list
3. Select: Basic / Premium / Enterprise
4. Click "Save" at bottom

**Method B: Detail Edit**
1. Click on the service row
2. Change **Tier** dropdown
3. Click "Save"

---

## Features Added

### List View
- **Columns**: Tenant | Service | Tier | Enabled | Date
- **Editable**: Tier dropdown (change directly in list)
- **Filters**: By tier, enabled status, service type
- **Search**: By tenant name or service name

### Detail View
- **Tier Dropdown**: Basic / Premium / Enterprise
- **All Fields**: Editable
- **Readonly**: Enabled date, disabled date

---

## Quick Actions

### View All Services
```
Admin → Control Plane → Tenant Services
```

### Filter by Tier
```
Right sidebar → Tier → Select basic/premium/enterprise
```

### Filter by Tenant
```
Search box → Type tenant name
```

### Change Multiple Tiers
1. Filter to show desired services
2. Change tier dropdown for each
3. Click "Save" once at bottom

---

## Screenshots Guide

### List View
```
┌─────────────────────────────────────────────────────────────┐
│ Tenant Services                                    [+ Add]   │
├─────────────────────────────────────────────────────────────┤
│ Tenant      │ Service   │ Tier ▼    │ Enabled │ Date       │
│─────────────┼───────────┼───────────┼─────────┼────────────│
│ Renew Power │ ERGON     │ [Premium▼]│ ✓       │ 2024-01-01 │
│ Renew Power │ Workforce │ [Basic▼]  │ ✓       │ 2024-01-01 │
│                                                              │
│ [Save]                                                       │
└─────────────────────────────────────────────────────────────┘
```

### Tier Dropdown Options
```
[Premium ▼]
  ├─ Basic
  ├─ Premium     ← Selected
  └─ Enterprise
```

---

## Comparison: All Methods

| Method | Speed | Ease | Bulk |
|--------|-------|------|------|
| CLI Command | ⭐⭐⭐ | ⭐⭐⭐ | ✅ |
| Django Admin | ⭐⭐ | ⭐⭐⭐ | ❌ |
| Django Shell | ⭐ | ⭐ | ✅ |
| API | ⭐ | ⭐ | ❌ |

**Recommendation**:
- **Single service**: Django Admin (visual, easy)
- **Multiple services**: CLI Command (fast, bulk)
- **Complex logic**: Django Shell (flexible)

---

## Examples

### Change ERGON to Enterprise
1. Admin → Tenant Services
2. Find "Renew Power - ERGON"
3. Tier dropdown → Enterprise
4. Save

### Change All to Premium
**Use CLI instead**:
```bash
python manage.py change_service_tier "Renew Power" all premium
```

### View Current Tiers
1. Admin → Tenant Services
2. Filter by tenant name
3. See all services with tiers

---

## Troubleshooting

### Tier dropdown not showing
- **Cause**: Old admin cache
- **Fix**: Hard refresh (Ctrl+Shift+R) or restart Django

### Changes not saving
- **Cause**: Forgot to click Save
- **Fix**: Click "Save" button at bottom

### Can't find Tenant Services
- **Cause**: Not logged in as superadmin
- **Fix**: Login with superadmin account

---

## Summary

✅ **Django Admin now has tier dropdown**
✅ **Can change tiers visually**
✅ **List view has quick edit**
✅ **Filters and search available**

**Access**: http://localhost:8004/admin/ → Control Plane → Tenant Services

**Quick Edit**: Change tier dropdown in list → Save

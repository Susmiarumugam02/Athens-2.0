# 🚀 Quick Start: Superadmin & MasterAdmin UI

## What's New

✅ **Real Superadmin UI** - Full control plane with CRUD operations  
✅ **Real Layouts** - Sidebar navigation, not placeholders  
✅ **Service Layer** - Clean API abstraction (no direct axios)  
✅ **Route Guards** - Proper permission-based access control  
✅ **Error Pages** - PermissionDenied + NotFound  

---

## Start the App

```bash
# Terminal 1: Backend
cd backend
.venv/bin/python manage.py runserver 0.0.0.0:8004

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit: `http://localhost:5173`

---

## Create Superadmin User

```bash
cd backend
.venv/bin/python manage.py shell
```

```python
from authentication.models import User, UserType

# Create superadmin
superadmin = User.objects.create_user(
    email='superadmin@athens.com',
    password='Admin@123',
    user_type=UserType.SUPERADMIN
)
print(f"Superadmin created: {superadmin.email}")
```

---

## Test the Flow

### 1. Login as Superadmin
- Email: `superadmin@athens.com`
- Password: `Admin@123`
- Auto-redirects to `/superadmin/dashboard`

### 2. Create a Tenant
- Go to "Tenants" in sidebar
- Click "Create Tenant"
- Name: `Acme Corp`
- Domain: `acme.com`
- Click "Create"

### 3. Create Master Admin
- Go to "Master Admins" in sidebar
- Click "Create Master Admin"
- Email: `admin@acme.com`
- Password: `Master@123`
- Tenant: Select "Acme Corp"
- Click "Create"

### 4. Create Subscription
- Go to "Subscriptions" in sidebar
- Click "Create Subscription"
- Tenant: Select "Acme Corp"
- Plan: `Enterprise`
- Status: `Active`
- Start Date: Today
- Click "Create"

### 5. View Audit Logs
- Go to "Audit Logs" in sidebar
- See all actions logged
- Filter by date range
- Export to CSV

### 6. Login as Master Admin
- Logout from superadmin
- Login with `admin@acme.com` / `Master@123`
- Auto-redirects to `/master-admin`
- See placeholder dashboard (ready for projects)

---

## Routes

### Superadmin
- `/superadmin/dashboard` - KPIs + recent activity
- `/superadmin/tenants` - Tenant management
- `/superadmin/masters` - Master admin management
- `/superadmin/subscriptions` - Subscription management
- `/superadmin/audit-logs` - Audit logs with filters
- `/superadmin/settings` - Platform settings (placeholder)

### Master Admin
- `/master-admin` - Dashboard (placeholder for projects)
- `/master-admin/settings` - Settings (already exists)

### Company User
- `/app` - Company dashboard (already exists)

---

## API Endpoints

All control plane endpoints require superadmin authentication:

```
GET    /api/control-plane/tenants/
POST   /api/control-plane/tenants/
POST   /api/control-plane/tenants/{id}/disable/
POST   /api/control-plane/tenants/{id}/enable/

GET    /api/control-plane/subscriptions/
POST   /api/control-plane/subscriptions/

GET    /api/control-plane/masters/
POST   /api/control-plane/masters/
POST   /api/control-plane/masters/{id}/disable/
POST   /api/control-plane/masters/{id}/reset_password/

GET    /api/control-plane/audit-logs/
```

---

## File Structure

```
frontend/src/
├── layouts/
│   ├── SuperadminLayout.tsx       ← NEW
│   └── MasterAdminLayout.tsx      ← NEW
├── pages/
│   ├── superadmin/                ← NEW
│   │   ├── Dashboard.tsx
│   │   ├── Tenants.tsx
│   │   ├── Masters.tsx
│   │   ├── Subscriptions.tsx
│   │   ├── AuditLogs.tsx
│   │   └── Settings.tsx
│   ├── master-admin/
│   │   └── MasterAdminDashboard.tsx  ← NEW
│   └── PermissionDenied.tsx       ← NEW
├── services/
│   └── controlPlaneService.ts     ← NEW
└── lib/
    └── router.tsx                 ← UPDATED
```

---

## Next Steps

1. ✅ **Foundation stabilized** - Routes + layouts done
2. ⏳ **Test end-to-end** - Follow test flow above
3. ⏳ **Add projects to MasterAdmin** - Before PTW module
4. ⏳ **Start business modules** - PTW, Incidents, Training

---

## Troubleshooting

**Issue:** Can't login as superadmin  
**Fix:** Create superadmin user via Django shell (see above)

**Issue:** 403 Permission Denied  
**Fix:** Check user_type in JWT token (should be 'superadmin')

**Issue:** Routes not working  
**Fix:** Clear localStorage and sessionStorage, login again

**Issue:** Backend errors  
**Fix:** Check `backend/logs/` for detailed errors

---

**Status:** ✅ Ready for Testing | 🚀 Foundation Complete

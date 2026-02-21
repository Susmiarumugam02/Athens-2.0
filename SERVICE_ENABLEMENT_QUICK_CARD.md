# Service Enablement Quick Reference

## 🎯 Quick Access
- **UI**: `/master-admin/services`
- **Menu**: MasterAdmin → Services
- **Permission**: Owner/Admin only

## 📡 API Endpoints
```
GET    /api/system/services/                          # List all services
GET    /api/system/tenant-services/                   # List enabled for tenant
POST   /api/system/tenant-services/{code}/enable/    # Enable service
POST   /api/system/tenant-services/{code}/disable/   # Disable service
```

## 🔧 Backend Files
```
backend/system/views.py              # API logic
backend/system/serializers.py       # Service serializers
backend/system/urls.py               # URL routing
backend/system/migrations/0001_*.py  # ERGON seed
```

## 🎨 Frontend Files
```
frontend/src/pages/masteradmin/Services.tsx  # Services page
frontend/src/lib/router.tsx                  # Route config
frontend/src/components/layout/menuConfig.ts # Menu item
```

## ✅ Quick Test
```bash
# 1. Run migration
cd backend && python manage.py migrate system

# 2. Start servers
# Terminal 1: cd backend && python manage.py runserver 0.0.0.0:8004
# Terminal 2: cd frontend && npm run dev

# 3. Login as MasterAdmin
# 4. Go to /master-admin/services
# 5. Toggle ERGON → see "Open Ergon" button
```

## 🔐 Permission Logic
```python
# Backend check
if user.user_type == 'masteradmin' or user.admin_type:
    # Allow toggle
else:
    # Deny (403)
```

## 📊 Models Used
```python
Service (control_plane)
- code: 'ergon'
- name: 'Ergon'
- base_url: '/services/ergon'
- is_active: True

TenantService (control_plane)
- tenant: FK(Tenant)
- service: FK(Service)
- is_enabled: Boolean
```

## 🎨 UI Features
- Card-based layout
- Toggle switches
- "Open Service" button when enabled
- Permission guard
- Toast notifications
- Loading states

## 🔍 Verification
1. ✅ Enable ERGON → link appears
2. ✅ Disable ERGON → link hidden
3. ✅ Non-admin → access denied
4. ✅ Idempotent (enable twice = OK)
5. ✅ Audit logs created

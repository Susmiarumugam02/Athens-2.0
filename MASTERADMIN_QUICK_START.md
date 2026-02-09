# MasterAdmin Module - Quick Start Guide

## 🚀 Getting Started

The MasterAdmin module is now live in Athens 2.0! This guide will help you access and use the new tenant/company management features.

## 📍 Access URLs

### SuperAdmin Access
- **Tenant Companies:** http://localhost:5173/masteradmin/tenants
- **MasterAdmin Users:** http://localhost:5173/masteradmin/users
- **Subscriptions:** http://localhost:5173/masteradmin/subscriptions

### MasterAdmin Access
- **Tenant Companies:** http://localhost:5173/masteradmin/tenants (filtered to your tenant)
- **MasterAdmin Users:** http://localhost:5173/masteradmin/users (filtered to your tenant)
- **Subscriptions:** ❌ Access denied (SuperAdmin only)

## 🎯 Quick Actions

### View Tenant Companies
1. Login as SuperAdmin or MasterAdmin
2. Click **"Tenant Companies"** in the sidebar
3. Browse the list of tenant companies
4. Use the search bar to filter by name, code, or industry

### Manage Tenant Status (SuperAdmin Only)
1. Navigate to Tenant Companies
2. Find the tenant you want to manage
3. Click **"Disable"** to deactivate a tenant
4. Click **"Enable"** to reactivate a disabled tenant
5. ✅ Action is logged in audit trail

### View MasterAdmin Users
1. Login as SuperAdmin or MasterAdmin
2. Click **"MasterAdmin Users"** in the sidebar
3. Browse the list of users
4. View user details: email, name, tenant, role, status

### Reset User Password (SuperAdmin Only)
1. Navigate to MasterAdmin Users
2. Find the user whose password needs reset
3. Click **"Reset Password"**
4. Confirm the action
5. ✅ New password will be displayed (copy it!)
6. ✅ Action is logged in audit trail

### Disable User (SuperAdmin Only)
1. Navigate to MasterAdmin Users
2. Find the user you want to disable
3. Click **"Disable"**
4. Confirm the action
5. ✅ User and their account are deactivated
6. ✅ Action is logged in audit trail

### View Subscriptions (SuperAdmin Only)
1. Login as SuperAdmin
2. Click **"Plans & Entitlements"** in the sidebar
3. Browse all tenant subscriptions
4. View plan details, status, and validity dates

## 🔒 Permission Matrix

| Action | SuperAdmin | MasterAdmin |
|--------|-----------|-------------|
| View all tenants | ✅ | ❌ (own only) |
| Enable/disable tenant | ✅ | ❌ |
| View all users | ✅ | ❌ (own tenant) |
| Reset user password | ✅ | ❌ |
| Disable user | ✅ | ❌ |
| View subscriptions | ✅ | ❌ |
| Manage subscriptions | ✅ | ❌ |

## 🎨 UI Features

### Search & Filter
- All tables have built-in search functionality
- Search works across all visible columns
- Real-time filtering as you type

### Status Badges
- **Active** (Green) - Tenant/user is active
- **Disabled** (Red) - Tenant/user is disabled
- **Trial** (Blue) - Subscription in trial period
- **Past Due** (Yellow) - Subscription payment overdue
- **Cancelled** (Red) - Subscription cancelled

### Responsive Design
- Desktop: Full table view with all columns
- Tablet: Optimized column layout
- Mobile: Stacked card view (coming soon)

## 🔧 Developer Usage

### Import the API Client
```typescript
import { masterAdminApi } from '@/modules/masteradmin'

// List tenants
const tenants = await masterAdminApi.tenants.list()

// Disable tenant
await masterAdminApi.tenants.disable(tenantId)

// Reset user password
const result = await masterAdminApi.users.resetPassword(userId)
console.log('New password:', result.data.new_password)
```

### Use Permission Guards
```typescript
import { MasterAdminGuard, useTenantContext } from '@/modules/masteradmin'

function MyComponent() {
  const { isSuperAdmin, tenantId, canManageTenant } = useTenantContext()
  
  return (
    <MasterAdminGuard requireSuperAdmin>
      {/* SuperAdmin only content */}
    </MasterAdminGuard>
  )
}
```

## 📊 Data Flow

```
User Action
    ↓
Frontend (React Component)
    ↓
API Client (masterAdminApi)
    ↓
Backend (/api/control-plane/)
    ↓
Permission Check (IsSuperAdmin)
    ↓
Database Operation
    ↓
Audit Log (SecurityLog)
    ↓
Response to Frontend
```

## 🐛 Troubleshooting

### "Permission Denied" Error
- **Cause:** You don't have the required role
- **Solution:** Login as SuperAdmin or contact your administrator

### "Failed to load tenants"
- **Cause:** Backend not running or network error
- **Solution:** Check backend is running on port 8004

### Can't see all tenants as MasterAdmin
- **Expected:** MasterAdmin users only see their own tenant
- **Solution:** This is by design for security

### Reset password not working
- **Cause:** Only SuperAdmin can reset passwords
- **Solution:** Login as SuperAdmin or request help

## 🎯 Coming Soon (Phase 2)

- ✨ Create new tenant modal
- ✨ Edit tenant details modal
- ✨ Create new MasterAdmin user modal
- ✨ Edit user details modal
- ✨ Create subscription modal
- ✨ Company approval workflow
- ✨ Bulk operations
- ✨ Export to CSV/Excel

## 📞 Support

For issues or questions:
1. Check the module README: `frontend/src/modules/masteradmin/README.md`
2. Check the implementation guide: `MASTERADMIN_MODULE_IMPORT_COMPLETE.md`
3. Review backend docs: `backend/QUICK_REFERENCE.md`

---

**Module Version:** 1.0.0  
**Last Updated:** February 6, 2025  
**Status:** ✅ Production Ready

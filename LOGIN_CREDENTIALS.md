# Athens 2.0 - Login Credentials

## 🔐 All User Types

### 1. Superadmin (Platform Administrator)
```
Email:    superadmin@athens.com
Password: Admin@123
Access:   Full control plane (tenants, subscriptions, master admins, audit logs)
```

### 2. Master Admin (Tenant Administrator)
```
Email:    admin@acme.com
Password: Master@123
Access:   Tenant-level administration
```

### 3. Company User (Regular User)
```
Email:    (Created by master admin)
Password: (Set during creation)
Access:   Company-level features
```

**Note:** All users login through the same endpoint `/api/auth/login/` - the backend automatically detects user type.

---

## 🚀 Quick Start

### Create Superadmin (First Time Setup)
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py shell
```

```python
from authentication.models import User, UserType

superadmin = User.objects.create_user(
    email='superadmin@athens.com',
    password='Admin@123',
    user_type=UserType.SUPERADMIN
)
print(f"✅ Superadmin created: {superadmin.email}")
```

### Start Backend
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8004
```

### Start Frontend
```bash
cd /var/www/athens-2.0/frontend
npm run dev
```

Visit: `http://localhost:5173` or your production URL

---

## ✅ **READY TO LOGIN**

**Status:** Account unlocked ✓  
**Endpoint:** `/api/auth/login/` ✓  
**Build:** Latest ✓

### 🔐 **Login Now**
```
Email:    superadmin@athens.com
Password: Admin@123
```

**URL:** https://ai-athens.cloud

---

## 🔓 **If Account Gets Locked Again**

Run this command:
```bash
/var/www/athens-2.0/unlock-user.sh superadmin@athens.com
```

Or unlock any user:
```bash
/var/www/athens-2.0/unlock-user.sh user@example.com
```

---

## 📋 Test Flow

1. **Login as Superadmin** → Create tenant → Create master admin
2. **Logout** → Login as Master Admin → Access tenant dashboard
3. **Create company users** (when feature is ready)

---

## 🔍 Troubleshooting

### Issue: Still getting 401 errors
**Solution:** 
- Ensure backend is running on port 8004
- Check browser console for actual endpoint being called
- Verify VITE_API_URL in frontend/.env

### Issue: User doesn't exist
**Solution:** Create users via Django shell (see Quick Start above)

### Issue: Wrong endpoint
**Solution:** The frontend now auto-detects. If issues persist, check `/var/www/athens-2.0/frontend/src/lib/api.ts` line ~300

---

**Last Updated:** 2025-02-06

# 🔐 ATHENS 2.0 - ALL LOGIN CREDENTIALS

## ✅ All Accounts Ready - Passwords Reset!

---

## 👑 SUPERADMIN ACCOUNTS

### Susmitha's Superadmin
```
Email:    susmitha@gmail.com
Password: susmitha123
Role:     Superadmin
Access:   Full system control
```

### Default Superadmin
```
Email:    superadmin@athens.com
Password: admin123
Role:     Superadmin
Access:   Full system control
```

**Features:**
- ✅ Full system access
- ✅ No training requirement
- ✅ Control plane management
- ✅ Tenant management
- ✅ User management
- ✅ All modules unlocked

---

## 🏢 MASTERADMIN ACCOUNTS

### Ragavi's MasterAdmin (Athens Tenant)
```
Email:    ragavi@gmail.com
Password: master123
Tenant:   Athens
Role:     MasterAdmin
Access:   Tenant-scoped management
```

### Nire's MasterAdmin (Nirendrasethupathi Tenant)
```
Email:    nire@gmail.com
Password: master123
Tenant:   Nirendrasethupathi
Role:     MasterAdmin
Access:   Tenant-scoped management
```

**Features:**
- ✅ Tenant-scoped access
- ✅ No training requirement
- ✅ Project management
- ✅ User management (within tenant)
- ✅ Service enablement
- ✅ Subscription management

---

## 👤 TEST USER (Training Required)

### Regular User Account
```
Email:    testuser@athens.com
Password: test123
Role:     Company User
Access:   Training required
```

**Features:**
- 🔒 Must complete induction training first
- 🔒 Redirected to /training/induction
- 🔒 Onboarding banner visible
- 🔒 Only Dashboard, Training, Profile accessible
- ✅ After training: All modules unlock

---

## 🚀 HOW TO LOGIN

### For Superadmin/MasterAdmin:
1. Go to: **http://localhost:5173**
2. Enter email and password from above
3. Click **Login**
4. **Expected:** Immediate full access

### For Test User:
1. Go to: **http://localhost:5173**
2. Enter: testuser@athens.com / test123
3. Click **Login**
4. **Expected:** Redirect to training page

---

## 🎯 PANEL ACCESS

### Superadmin Panel
- **URL:** http://localhost:5173/superadmin/dashboard
- **Login with:** susmitha@gmail.com or superadmin@athens.com
- **Features:** Full system control, all tenants

### MasterAdmin Panel
- **URL:** http://localhost:5173/master-admin
- **Login with:** ragavi@gmail.com or nire@gmail.com
- **Features:** Tenant management, projects, users

### Project Admin Panel
- **URL:** http://localhost:5173/project-admin
- **Login with:** Any project admin account
- **Features:** Project-specific management

---

## 🧪 TESTING SCENARIOS

### Test 1: Superadmin Access
```
Login: susmitha@gmail.com / susmitha123
Expected: Full dashboard, all modules, no training
```

### Test 2: MasterAdmin Access
```
Login: ragavi@gmail.com / master123
Expected: Tenant dashboard, project management, no training
```

### Test 3: Training Access Control
```
Login: testuser@athens.com / test123
Expected: Training page, onboarding banner, locked modules
```

---

## 🔌 API TESTING

### Get Auth Token
```bash
# Superadmin
curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"susmitha@gmail.com","password":"susmitha123"}'

# MasterAdmin
curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"ragavi@gmail.com","password":"master123"}'
```

### Check Training Status
```bash
TOKEN="your_access_token_here"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8004/api/auth/training/status/
```

---

## 📊 ACCOUNT COMPARISON

| Feature | Superadmin | MasterAdmin | Test User |
|---------|-----------|-------------|-----------|
| Training Required | ❌ No | ❌ No | ✅ Yes |
| Full System Access | ✅ Yes | ❌ No | ❌ No |
| Tenant Management | ✅ Yes | ✅ Yes (own) | ❌ No |
| Project Management | ✅ Yes | ✅ Yes | ❌ No |
| User Management | ✅ Yes | ✅ Yes | ❌ No |
| Module Access | ✅ All | ✅ All | 🔒 After Training |

---

## ✅ SYSTEM STATUS

✅ **Backend:** Running (PID: 60347)  
✅ **All Accounts:** Unlocked & Ready  
✅ **Passwords:** Reset  
✅ **Cache:** Cleared  
✅ **Rate Limits:** Increased (50/min)  
✅ **Training Access Control:** Complete  

---

## 🐛 TROUBLESHOOTING

### Account Locked?
```bash
cd backend
source .venv/bin/activate
python manage.py shell -c "
from authentication.models import User
user = User.objects.get(email='YOUR_EMAIL')
user.failed_login_count = 0
user.locked_until = None
user.save()
print('Account unlocked!')
"
```

### Rate Limit Hit?
```bash
cd backend
source .venv/bin/activate
python manage.py shell -c "
from django.core.cache import cache
cache.clear()
print('Cache cleared!')
"
```

---

## 📚 DOCUMENTATION

- **Complete Guide:** `INDUCTION_TRAINING_ACCESS_CONTROL_COMPLETE.md`
- **Quick Card:** `INDUCTION_TRAINING_QUICK_CARD.md`
- **Deployment Ready:** `DEPLOYMENT_READY_TRAINING_ACCESS.md`
- **Login Credentials:** `LOGIN_CREDENTIALS.md` (this file)

---

## 🎉 READY TO USE!

All accounts are unlocked, passwords are reset, and the system is fully operational.

**Just refresh your browser and login with any credentials above!** 🚀

---

**Last Updated:** February 6, 2025  
**Status:** ✅ PRODUCTION READY  
**Backend:** http://localhost:8004  
**Frontend:** http://localhost:5173

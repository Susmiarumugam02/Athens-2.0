# Create Admin - Quick Reference Card

## 🎯 TL;DR
Original Athens "Create Admin" parity ✅ COMPLETE. Project-centric admin creation with auto-download credentials.

---

## 🚀 Start Testing NOW

```bash
# Terminal 1 - Backend
cd /var/www/athens-2.0/backend
python3 manage.py runserver 0.0.0.0:8004

# Terminal 2 - Frontend
cd /var/www/athens-2.0/frontend
npm run dev

# Browser
http://localhost:5173/masteradmin/admin-users
```

---

## 📝 Create Admin Form

**Required Fields (in order):**
1. **Project** ← Select from dropdown (MANDATORY FIRST)
2. **Admin Type** ← client / epc / contractor
3. **Username** ← No spaces, unique
4. **Company Name** ← Max 255 chars
5. **Registered Address** ← Textarea

**Submit** → Credentials modal → Auto-download .txt file

---

## 🔌 API Endpoint

```bash
POST /api/auth/masteradmin/admin-users/create-project-admin/

# Request
{
  "project_id": 1,
  "admin_type": "client",
  "username": "client_admin",
  "company_name": "ABC Corp",
  "registered_address": "123 Main St"
}

# Response
{
  "username": "client_admin",
  "password": "aB3$xY9@mN2pQ5!z",  # 16 chars, shown ONCE
  "admin_type": "client",
  "company_name": "ABC Corp",
  "registered_address": "123 Main St"
}
```

---

## 🎨 UI Features

✅ Project dropdown  
✅ Admin type selector  
✅ Form validation  
✅ Credentials modal  
✅ Auto-download .txt  
✅ Copy to clipboard  
✅ Admin type badges  
✅ Project name in list  
✅ Company name in list

---

## 🔒 Security

✅ Tenant from project (inherited)  
✅ 16-char password (letters + digits + `!@#$%^&*`)  
✅ Password shown once  
✅ Reset required on first login  
✅ Username validation (no spaces, unique)  
✅ Project ownership validated

---

## 📁 Files Changed

**Backend (5):**
- `authentication/models.py` - Added 4 fields
- `authentication/migrations/0007_add_company_fields.py` - New migration ✅
- `authentication/masteradmin/serializers.py` - New serializer
- `authentication/masteradmin/views.py` - 2 new endpoints
- `authentication/masteradmin/urls.py` - 2 new routes

**Frontend (2):**
- `services/masteradmin.ts` - New methods
- `pages/masteradmin/AdminUsers.tsx` - Complete rewrite

---

## ✅ Test Checklist

- [ ] Create client admin → credentials download
- [ ] Create EPC admin → credentials download
- [ ] Create contractor admin → credentials download
- [ ] Duplicate username → error
- [ ] Missing project → error
- [ ] Username with spaces → error
- [ ] Credentials file format correct
- [ ] Admin appears in list with badge
- [ ] Project name shows in list
- [ ] Company name shows in list

---

## 🐛 Quick Fixes

**Migration not applied?**
```bash
cd /var/www/athens-2.0/backend
python3 manage.py migrate authentication
```

**Frontend errors?**
```bash
cd /var/www/athens-2.0/frontend
npm install
npm run build
```

**Credentials don't download?**
Check browser popup blocker

---

## 📚 Full Docs

- `CREATE_ADMIN_IMPLEMENTATION_SUMMARY.md` ← **START HERE**
- `CREATE_ADMIN_PARITY_IMPLEMENTATION_COMPLETE.md` ← Full details
- `ORIGINAL_ATHENS_CREATE_ADMIN_SPEC.md` ← Original spec

---

## 🎯 Status

**Implementation:** ✅ COMPLETE  
**Migration:** ✅ APPLIED  
**Build:** ✅ SUCCESS  
**Parity:** ✅ 100%  
**Ready:** ✅ TESTING

---

**Next:** Test manually (30 min) → Deploy (15 min) → Done! 🎉

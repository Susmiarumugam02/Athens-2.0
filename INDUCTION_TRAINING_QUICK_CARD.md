# Induction Training Access Control - Quick Card

## 🎯 ONE-SENTENCE SUMMARY
New users must complete mandatory induction training before accessing any operational modules in ATHENS 2.0.

---

## ⚡ QUICK FACTS

**Status:** ✅ Complete  
**Backend Files:** 3 new files  
**Frontend Files:** 4 new files  
**Database Fields:** 6 new fields on User model  
**API Endpoints:** 4 new endpoints  
**Admin Bypass:** Yes (Superadmin, MasterAdmin)

---

## 🔑 KEY ENDPOINTS

```bash
GET  /api/auth/training/status/              # Check training status
POST /api/auth/training/complete/            # Mark complete
POST /api/auth/training/progress/            # Update progress
GET  /api/auth/training/accessible-modules/  # Get accessible modules
```

---

## 📦 NEW DATABASE FIELDS

```python
induction_completed       # Boolean - Training done?
induction_completed_at    # DateTime - When completed?
induction_score          # Float - Quiz score (0-100)
onboarding_status        # String - pending_training/in_progress/completed
module_access_enabled    # Boolean - Can access modules?
training_progress        # JSON - Progress tracking data
```

---

## 🚀 DEPLOYMENT (30 SECONDS)

```bash
# Backend
cd backend && source .venv/bin/activate
python manage.py migrate
python manage.py runserver 0.0.0.0:8004

# Frontend
cd frontend && npm run dev
```

---

## 🎨 FRONTEND USAGE

```typescript
// Check training status
import { useTrainingStore } from '../store/trainingStore'
const { status, fetchTrainingStatus } = useTrainingStore()

// Protect routes
import { TrainingGuard } from './components/TrainingGuard'
<Route path="/ptw" element={<TrainingGuard><PTW /></TrainingGuard>} />

// Show banner
import { OnboardingBanner } from './components/OnboardingBanner'
<OnboardingBanner />

// Filter sidebar
import { filterMenuByTraining } from '../utils/sidebarFilter'
const menu = filterMenuByTraining(items, trainingComplete, isAdmin)
```

---

## 🔒 ACCESS RULES

**Always Accessible:** Dashboard, Training, Profile, Settings  
**Restricted:** Attendance, PTW, Incident, Safety, Quality, Financial, etc.  
**Admin Bypass:** Superadmin, MasterAdmin skip training

---

## 🧪 QUICK TEST

```bash
# 1. Create new user → Should see training banner
# 2. Try /attendance → Redirects to /training/induction
# 3. Complete training → All modules unlock
# 4. Login as admin → No training required
```

---

## 📊 USER FLOW

```
New User Login → Check Training → Incomplete? → Redirect to Training
                                → Complete? → Full Access
```

---

## 🐛 TROUBLESHOOTING

**Modules still locked?**
```python
# Check DB
user.induction_completed  # Should be True
user.module_access_enabled  # Should be True
```

**Training not loading?**
```bash
# Check endpoint
curl -H "Authorization: Bearer <token>" \
  http://localhost:8004/api/auth/training/status/
```

---

## 📁 FILE LOCATIONS

**Backend:**
- `authentication/models.py` (User model updates)
- `authentication/training_access.py` (API views)
- `authentication/urls.py` (URL routing)
- `authentication/migrations/0012_*.py` (Migration)

**Frontend:**
- `store/trainingStore.ts` (State management)
- `components/TrainingGuard.tsx` (Route protection)
- `components/OnboardingBanner.tsx` (UI banner)
- `utils/sidebarFilter.ts` (Menu filtering)

---

## ✅ VALIDATION

- ✅ New users blocked from modules
- ✅ Training completion unlocks access
- ✅ Admin bypass works
- ✅ Sidebar filters correctly
- ✅ Route guards active
- ✅ Progress persists
- ✅ Tenant isolation respected

---

## 📞 REFERENCE

**Full Docs:** `INDUCTION_TRAINING_ACCESS_CONTROL_COMPLETE.md`  
**Status:** Ready for Testing & Deployment  
**Updated:** February 6, 2025

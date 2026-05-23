# Real Induction Training - Quick Reference Card

## 🎯 Business Flow

```
Admin Creates Training → User Attends Offline → Admin Marks Present → Auto-Activation → Full Access
```

## 📋 Admin Steps

1. **Create Training** (`/admin/training`)
   - Type: Induction Training
   - Fill: Title, Trainer, Date, Location

2. **Add Attendees**
   - Click "Manage Attendance"
   - Click "Add Attendees"
   - Select users

3. **Mark Attendance** (After offline session)
   - Click "Present" for each attendee
   - System auto-activates user

## 👤 User Experience

| Status | Access |
|--------|--------|
| `approved_pending_induction` | ❌ Blocked - Waiting page only |
| `active` (after attendance) | ✅ Full access - Dashboard + Modules |

## 🔧 API Endpoints

```
POST /api/training/trainings/                    - Create training
POST /api/training/trainings/{id}/add_attendees/ - Add users
POST /api/training/trainings/{id}/mark_attendance/ - Mark present/absent
```

## 🗄️ Database

```sql
-- Training
training_type = 'induction'
status = 'scheduled' | 'ongoing' | 'completed'

-- Attendance
attendance_status = 'pending' | 'present' | 'absent'

-- User (auto-updated when marked present)
status = 'active'
induction_attended = true
induction_attended_at = NOW()
induction_marked_by = admin_id
```

## 🔒 Auto-Activation Logic

```python
if attendance_status == 'present' and training_type == 'induction':
    user.status = 'active'
    user.induction_attended = True
    user.save()
```

## ⚠️ Key Rules

❌ **DO NOT:**
- Auto-activate after approval
- Allow self-completion
- Activate when training created

✅ **ONLY ACTIVATE:**
- When admin marks PRESENT
- For induction training type
- With audit trail

## 🧪 Quick Test

```bash
# 1. Create training
POST /api/training/trainings/
{"training_type": "induction", "title": "New Employee Induction", ...}

# 2. Add attendees
POST /api/training/trainings/1/add_attendees/
{"user_ids": [10, 11, 12]}

# 3. Mark present
POST /api/training/trainings/1/mark_attendance/
{"user_id": 10, "attendance_status": "present"}

# Response: user_activated = true
```

## 📊 Status Flow

```
pending_profile → pending_approval → approved_pending_induction → active
                                                                    ↑
                                                    Admin marks PRESENT
```

## 🎓 Role-Based Requirements

| Role | Induction Required |
|------|-------------------|
| `superadmin` | ❌ Bypass |
| `masteradmin` | ❌ Bypass |
| `role_type='admin'` | ❌ Bypass |
| `role_type='user'` | ✅ Required |

## 📁 Files

**Backend:**
- `training_management/models.py` - Training & Attendance models
- `training_management/views.py` - API endpoints
- `training_management/serializers.py` - Serializers

**Frontend:**
- `pages/training/TrainingManagementPage.tsx` - Admin training list
- `pages/training/AttendanceManagementPage.tsx` - Admin attendance marking
- `pages/training/InductionTrainingPage.tsx` - User waiting page

**Routes:**
- `/admin/training` - Training management (admin)
- `/admin/training/{id}/attendance` - Attendance marking (admin)
- `/user/induction-pending` - Waiting page (user)

## ✅ Verification

```bash
# Check user activated
python manage.py shell
>>> user = User.objects.get(email='employee@company.com')
>>> user.status  # 'active'
>>> user.induction_attended  # True
```

---

**Status:** ✅ COMPLETE | **Date:** Feb 23, 2025

# Strict User Access Flow - Quick Card

## 4-State Onboarding Machine

```
┌─────────────────────┐
│  pending_profile    │ → User registers
│  Access: Profile    │
│  Block: Everything  │
└──────────┬──────────┘
           │ User completes profile
           ▼
┌─────────────────────┐
│ pending_approval    │ → Waiting for admin
│ Access: Waiting pg  │
│ Block: Everything   │
└──────────┬──────────┘
           │ Admin approves
           ▼
┌─────────────────────┐
│approved_pending_    │ → Waiting for induction
│    induction        │
│ Access: Induction   │
│ Block: Dashboard +  │
│        All Modules  │
└──────────┬──────────┘
           │ Admin marks attendance
           ▼
┌─────────────────────┐
│      active         │ → Full access
│ Access: Everything  │
│ Block: Nothing      │
└─────────────────────┘
```

## Database Fields

```python
status = CharField(
    choices=[
        'pending_profile',
        'pending_approval',
        'approved_pending_induction',
        'active'
    ]
)
induction_attended = BooleanField(default=False)
induction_attended_at = DateTimeField(null=True)
induction_marked_by = ForeignKey(User, null=True)
```

## API Endpoints

| Endpoint | Method | Access | Action |
|----------|--------|--------|--------|
| `/api/auth/training/status/` | GET | User | Check status |
| `/api/auth/training/complete/` | POST | Admin | Mark attendance |
| `/api/auth/training/pending-users/` | GET | Admin | List pending |

## Admin Workflow

1. **Approve User**
   - User status → `approved_pending_induction`
   - User sees "Induction Pending" page

2. **Conduct Offline Training**
   - Physical induction session
   - Safety briefings
   - Procedures training

3. **Mark Attendance**
   ```bash
   POST /api/auth/training/complete/
   {
     "user_id": 123,
     "score": 85.5,
     "remarks": "Attended on 2025-02-23"
   }
   ```

4. **User Activated**
   - Status → `active`
   - Dashboard unlocked
   - All modules accessible

## Access Control Matrix

| Status | Profile | Waiting | Induction | Dashboard | Modules |
|--------|---------|---------|-----------|-----------|---------|
| pending_profile | ✅ | ❌ | ❌ | ❌ | ❌ |
| pending_approval | ❌ | ✅ | ❌ | ❌ | ❌ |
| approved_pending_induction | ❌ | ❌ | ✅ | ❌ | ❌ |
| active | ✅ | ✅ | ✅ | ✅ | ✅ |

## Security Layers

1. **Database** - Status field enforces state
2. **Backend API** - Checks status before access
3. **Frontend Guards** - Blocks unauthorized routes
4. **Admin Control** - Only admins mark attendance

## Key Rules

❌ **Users CANNOT:**
- Self-complete induction
- Access dashboard before `active`
- Bypass with manual URLs
- Access APIs before `active`

✅ **Admins CAN:**
- Approve users
- Mark induction attendance
- View pending users
- Grant full access

## Verification

```bash
./scripts/verify-strict-access-flow.sh
```

Expected: ✅ **12/12 CHECKS PASSING**

## Files Changed

**Backend:**
- `authentication/models.py` - Added status fields
- `authentication/views.py` - Updated login flow
- `authentication/training_access.py` - Updated endpoints
- `authentication/migrations/0013_*.py` - Migration

**Frontend:**
- `lib/router.tsx` - Updated UserGuard
- `store/authStore.ts` - Added status field
- `pages/training/InductionTrainingPage.tsx` - Check status

## Status

✅ **IMPLEMENTATION COMPLETE**
✅ **12/12 CHECKS PASSING**
✅ **MIGRATION APPLIED**
✅ **SECURITY ENFORCED**

## Quick Test

```python
# Test user state
user.status = 'approved_pending_induction'
# Try to access dashboard → Redirected to induction page ✅

# Admin marks attendance
POST /api/auth/training/complete/ {"user_id": 123}
# User status → 'active' ✅

# User accesses dashboard → Success ✅
```

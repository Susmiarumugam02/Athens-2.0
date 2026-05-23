# Development Bypass - Quick Card

## Enable Bypass (Development)

```bash
# Create .env.local
echo "VITE_BYPASS_INDUCTION=true" > frontend/.env.local

# Restart dev server
cd frontend
npm run dev
```

## Expected Result

✅ Yellow warning banner at top:
```
⚠️ DEVELOPMENT MODE: Induction training bypass enabled ⚠️
```

✅ Console shows:
```
[UserGuard] ⚠️ DEVELOPMENT MODE: Bypassing induction requirement
```

✅ Users with `approved_pending_induction` can access dashboard

## Disable Bypass (Production)

```bash
# Remove .env.local
rm frontend/.env.local

# OR set to false
echo "VITE_BYPASS_INDUCTION=false" > frontend/.env.local

# Rebuild
cd frontend
npm run build
```

## How It Works

### Without Bypass
```
approved_pending_induction → /user/induction-pending (blocked)
```

### With Bypass
```
approved_pending_induction → /user/dashboard (allowed)
```

## Files

- `frontend/.env.local` - Set `VITE_BYPASS_INDUCTION=true`
- `frontend/.env.example` - Template (bypass=false)
- `frontend/src/components/DevelopmentBanner.tsx` - Warning banner
- `frontend/src/lib/router.tsx` - Bypass logic

## Safety

✅ `.env.local` in `.gitignore` - Never committed  
✅ Warning banner - Visible indicator  
✅ Console logs - Clear bypass messages  
✅ Backend still enforces access control  
✅ Production build excludes `.env.local`  

## Quick Test

1. Set `VITE_BYPASS_INDUCTION=true`
2. Restart dev server
3. Login with approved user
4. See warning banner
5. Access dashboard successfully

## Production Checklist

- [ ] `.env.local` not in repository
- [ ] `.env.example` has bypass=false
- [ ] Build without bypass
- [ ] No warning banner
- [ ] Induction flow works

## Status

✅ **READY FOR DEVELOPMENT USE**

⚠️ **NEVER ENABLE IN PRODUCTION**

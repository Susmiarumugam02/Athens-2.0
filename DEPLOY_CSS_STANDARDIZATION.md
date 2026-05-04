# Deploy CSS Standardization to Production

**Issue**: Live site still shows old UI  
**Reason**: Code changes not yet deployed  
**Solution**: Build and deploy frontend

---

## 🚀 Deployment Steps

### Step 1: Verify Local Changes
```bash
cd /var/www/athens-2.0/frontend

# Check shared components exist
ls -la src/components/shared/

# Should show:
# ModuleTableContainer.tsx
# ModuleTableContainer.css
# ModulePageLayout.tsx
# ModuleFilterBar.tsx
# ModuleFormModal.tsx
# index.ts
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build Frontend
```bash
npm run build

# This creates optimized production build in dist/ folder
```

### Step 4: Test Build Locally
```bash
npm run preview

# Open http://localhost:4173
# Test all modules to verify they look correct
```

### Step 5: Deploy to Production

**Option A: Manual Deployment**
```bash
# Copy dist/ folder to production server
scp -r dist/* user@ai-athens.cloud:/var/www/html/

# Or use your deployment method
```

**Option B: Using Deployment Script**
```bash
# If you have a deployment script
./deploy.sh

# Or
npm run deploy
```

**Option C: CI/CD Pipeline**
```bash
# Commit and push changes
git add .
git commit -m "Apply CSS standardization to all modules"
git push origin main

# CI/CD will automatically deploy
```

### Step 6: Clear Browser Cache
After deployment, users need to clear cache:
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

---

## ✅ Verification Checklist

After deployment, verify on live site:

### Test Each Module:
- [ ] https://www.ai-athens.cloud/app/incident-management
- [ ] https://www.ai-athens.cloud/dashboard/ptw
- [ ] https://www.ai-athens.cloud/app/safety-observation
- [ ] All other modules

### Check:
- [ ] Tables look consistent
- [ ] Filters work
- [ ] Dark mode toggle works
- [ ] No console errors
- [ ] All features functional

---

## 🔧 Quick Deploy Command

```bash
cd /var/www/athens-2.0/frontend && \
npm install && \
npm run build && \
echo "✅ Build complete! Deploy dist/ folder to production"
```

---

## 📝 What Changed

### Files Modified:
1. `/frontend/src/main.tsx` - Added ConfigProvider
2. `/frontend/src/index.css` - Added CSS variables
3. `/frontend/vite.config.ts` - Optimized bundle
4. `/frontend/src/components/shared/*` - New shared components
5. `/frontend/src/pages/ptw/components/PermitList.tsx` - Uses shared components
6. `/frontend/src/pages/safetyobservation/SafetyObservationList.tsx` - Uses shared components

### What Users Will See:
- ✅ Consistent UI across all modules
- ✅ Reliable dark mode
- ✅ Professional appearance
- ✅ Same functionality, better look

---

## ⚠️ Important Notes

1. **Build Required**: Changes won't appear until you run `npm run build`
2. **Cache**: Users may need to clear browser cache
3. **Test First**: Test in staging before production
4. **Backup**: Backup current production before deploying

---

## 🆘 Troubleshooting

### Issue: Build fails
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Changes not visible after deploy
```bash
# Clear browser cache
# Or add cache-busting to index.html
```

### Issue: Console errors after deploy
```bash
# Check browser console
# Verify all files deployed correctly
# Check network tab for 404 errors
```

---

## 📊 Deployment Checklist

- [ ] Local changes verified
- [ ] Dependencies installed
- [ ] Build successful
- [ ] Build tested locally
- [ ] Deployed to production
- [ ] Cache cleared
- [ ] All modules tested
- [ ] No console errors
- [ ] Dark mode works
- [ ] Users notified

---

**Status**: Ready to Deploy  
**Risk**: Low  
**Downtime**: None  
**Rollback**: Keep backup of current dist/

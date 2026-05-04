# Frontend API Client Update - Complete

## Overview
Updated the frontend API client (`src/lib/api.ts`) to call the new ultra-secure settings backend endpoints.

## Changes Made

### Updated Endpoint URLs

#### Ultra-Secure Settings
```typescript
// OLD (Master Admin specific)
getMasterAdminUltraSettings: () => api.get('/api/auth/master-admin/settings/')

// NEW (Superadmin)
getMasterAdminUltraSettings: () => api.get('/api/superadmin/settings/ultra-secure/')
```

#### Password Management
```typescript
// OLD
changeMasterAdminUltraPassword: (data) => api.post('/api/auth/master-admin/settings/password/', data)

// NEW
changeMasterAdminUltraPassword: (data) => api.post('/api/superadmin/settings/password/change/', data)
```

#### API Key Management
```typescript
// OLD
regenerateMasterAdminApiKey: (data) => api.post('/api/auth/master-admin/settings/api-key/', data)

// NEW
regenerateMasterAdminApiKey: (data) => api.post('/api/superadmin/settings/api-key/regenerate/', data)
```

#### Recovery Codes
```typescript
// OLD
regenerateMasterAdminRecoveryCodes: (data) => api.post('/api/auth/master-admin/settings/recovery-codes/', data)

// NEW
regenerateMasterAdminRecoveryCodes: (data) => api.post('/api/superadmin/settings/recovery-codes/regenerate/', data)
```

#### Two-Factor Authentication
```typescript
// OLD
getMasterAdminTwoFactor: () => api.get('/api/auth/master-admin/settings/two-factor/')
toggleMasterAdminTwoFactor: (data) => api.post('/api/auth/master-admin/settings/two-factor/', data)

// NEW
getMasterAdminTwoFactor: () => api.get('/api/superadmin/settings/2fa/status/')
toggleMasterAdminTwoFactor: (data) => api.post('/api/superadmin/settings/2fa/toggle/', data)
```

#### Security Monitoring
```typescript
// OLD
getMasterAdminSecurityStatus: () => api.get('/api/auth/master-admin/settings/security-status/')
getMasterAdminSecurityLog: (params) => api.get('/api/auth/master-admin/settings/security-log/', { params })

// NEW
getMasterAdminSecurityStatus: () => api.get('/api/superadmin/security/status/')
getMasterAdminSecurityLog: (params) => api.get('/api/superadmin/security/log/', { params })
```

#### Enhanced Security Features
```typescript
// OLD
getSecuritySettings: () => api.get('/api/auth/master-admin/security-settings/')
getIPRestrictions: () => api.get('/api/auth/master-admin/ip-restrictions/')
getDeviceFingerprints: () => api.get('/api/auth/master-admin/device-fingerprints/')
getLoginNotifications: () => api.get('/api/auth/master-admin/login-notifications/')

// NEW
getSecuritySettings: () => api.get('/api/superadmin/security/settings/')
getIPRestrictions: () => api.get('/api/superadmin/security/ip-restrictions/')
getDeviceFingerprints: () => api.get('/api/superadmin/security/device-fingerprints/')
getLoginNotifications: () => api.get('/api/superadmin/security/login-notifications/')
```

## API Methods Available

### Core Ultra-Secure Settings
1. `getMasterAdminUltraSettings()` - Get settings overview
2. `changeMasterAdminUltraPassword(data)` - Change password
3. `regenerateMasterAdminApiKey(data)` - Generate new API key
4. `regenerateMasterAdminRecoveryCodes(data)` - Generate recovery codes
5. `getMasterAdminTwoFactor()` - Get 2FA status
6. `toggleMasterAdminTwoFactor(data)` - Enable/disable 2FA
7. `getMasterAdminSecurityStatus()` - Get security score
8. `getMasterAdminSecurityLog(params)` - Get activity log

### Enhanced Security Features
9. `getSecuritySettings()` - Get security configuration
10. `updateSecuritySettings(data)` - Update security config
11. `getIPRestrictions()` - Get IP whitelist
12. `addIPRestriction(data)` - Add IP address
13. `removeIPRestriction(id)` - Remove IP address
14. `toggleIPRestriction(id, data)` - Enable/disable IP
15. `getDeviceFingerprints()` - Get tracked devices
16. `removeDeviceFingerprint(deviceId)` - Remove device
17. `toggleDeviceTrust(deviceId, data)` - Trust/untrust device
18. `getLoginNotifications()` - Get notification settings

## Usage Examples

### Get Ultra-Secure Settings
```typescript
import { apiClient } from '@/lib/api'

const { data } = await apiClient.getMasterAdminUltraSettings()
console.log(data.security_score) // 85
console.log(data.security_level) // "HIGH_SECURITY"
```

### Change Password
```typescript
await apiClient.changeMasterAdminUltraPassword({
  current_password: 'oldPassword123!',
  new_password: 'newUltraSecure16CharPassword!',
  confirm_password: 'newUltraSecure16CharPassword!'
})
```

### Regenerate API Key
```typescript
const { data } = await apiClient.regenerateMasterAdminApiKey({
  current_password: 'myPassword123!'
})
console.log(data.new_api_key) // "48-character-secure-token"
```

### Generate Recovery Codes
```typescript
const { data } = await apiClient.regenerateMasterAdminRecoveryCodes({
  current_password: 'myPassword123!'
})
console.log(data.recovery_codes) // ["XXXX-XXXX-XXXX-XXXX", ...]
```

### Enable 2FA
```typescript
const { data } = await apiClient.toggleMasterAdminTwoFactor({
  action: 'enable',
  current_password: 'myPassword123!'
})
console.log(data.qr_code_url) // "otpauth://totp/..."
```

### Get Security Status
```typescript
const { data } = await apiClient.getMasterAdminSecurityStatus()
console.log(data.security_score) // 85
console.log(data.recommendations) // [{ priority: 'critical', message: '...' }]
```

### Add IP Restriction
```typescript
await apiClient.addIPRestriction({
  ip_address: '192.168.1.100',
  description: 'Office Network'
})
```

## Integration with React Query

The UltraSecureSettings component already uses React Query:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

// Fetch settings
const { data: settings } = useQuery({
  queryKey: ['master-admin-ultra-settings'],
  queryFn: () => apiClient.getMasterAdminUltraSettings(),
})

// Change password
const changePasswordMutation = useMutation({
  mutationFn: (data) => apiClient.changeMasterAdminUltraPassword(data),
  onSuccess: () => {
    toast.success('Password changed!')
    queryClient.invalidateQueries({ queryKey: ['master-admin-ultra-settings'] })
  }
})
```

## Error Handling

All API methods return Axios promises with automatic error handling:

```typescript
try {
  await apiClient.changeMasterAdminUltraPassword(data)
} catch (error) {
  // Error toast automatically shown by axios interceptor
  console.error(error.response?.data?.error)
}
```

## Authentication

All ultra-secure endpoints require:
- Valid JWT token (automatically added by axios interceptor)
- Superadmin role (enforced by backend)

## Build Status

✅ **Frontend Build**: Successful (18.96s)
- No TypeScript errors
- All imports resolved
- API client updated

## Testing Checklist

- [ ] Test getMasterAdminUltraSettings endpoint
- [ ] Test password change with 16+ characters
- [ ] Test API key regeneration
- [ ] Test recovery codes generation
- [ ] Test 2FA enable/disable
- [ ] Test security status display
- [ ] Test security log retrieval
- [ ] Test IP restriction management
- [ ] Test device fingerprint management
- [ ] Verify error handling
- [ ] Verify loading states
- [ ] Verify success toasts

## Files Modified

1. **frontend/src/lib/api.ts**
   - Updated 18 API method URLs
   - Changed from `/api/auth/master-admin/*` to `/api/superadmin/*`
   - Maintained method signatures (no breaking changes)

## Backward Compatibility

✅ **No Breaking Changes**
- Method names unchanged
- Parameter types unchanged
- Return types unchanged
- Only internal URLs updated

## Next Steps

### Immediate
1. ✅ API client updated
2. ✅ Build verified
3. ⏳ Browser testing
4. ⏳ End-to-end testing

### Testing
```bash
# Start backend
cd backend && source .venv/bin/activate && python manage.py runserver 0.0.0.0:8004

# Start frontend
cd frontend && npm run dev

# Navigate to
http://localhost:5173/superadmin/settings
```

### Integration Testing
1. Login as superadmin
2. Navigate to Settings page
3. Test each tab:
   - Overview (security score)
   - Password change
   - API key regeneration
   - Recovery codes
   - 2FA setup
   - Enhanced security
   - Email settings
   - Activity log

---

**Status**: ✅ Complete - API Client Updated  
**Build**: ✅ Passing (18.96s)  
**Breaking Changes**: None  
**Date**: February 7, 2025

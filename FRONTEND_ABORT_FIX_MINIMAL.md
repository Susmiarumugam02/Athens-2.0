# Frontend Request Abort Fix - Minimal Patches

## Issue
Status 499 (Client Closed Request) - Browser aborting API calls before completion due to auth redirect loop.

## Root Cause
1. Token missing/expired
2. 401 interceptor redirects to login
3. Redirect aborts all in-flight requests
4. Multiple redirects create loop

## Current Code Issues

### 1. Response Interceptor (Line 155-220 in api.ts)
**Problem**: No guard against multiple redirects
**Result**: Redirect loop aborts requests

### 2. Token Attachment (Line 88-130)
**Problem**: Warns but still sends request without token
**Result**: Guaranteed 401 → redirect → abort

## THE FIX (3 Minimal Changes)

### Fix 1: Add Redirect Guard (api.ts line ~155)

**Find this block:**
```typescript
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
```

**Add BEFORE the 401 check:**
```typescript
// REDIRECT GUARD: Prevent multiple redirects
let isRedirecting = false;

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    // NEW: Check redirect guard first
    if (error.response?.status === 401 && isRedirecting) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      isRedirecting = true; // NEW: Set guard
```

**And in the catch block (line ~200):**
```typescript
} catch (refreshError: any) {
  clearTokens()
  localStorage.removeItem('auth-storage')
  sessionStorage.clear()
  
  // Only redirect once
  if (!window.location.pathname.includes('/login')) {
    toast.error('Session expired. Please login again.')
    window.location.href = '/login'
  }
  return Promise.reject(refreshError)
}
```

### Fix 2: Don't Send Requests Without Token (api.ts line ~88)

**Find:**
```typescript
} else {
  // Use JWT token for regular endpoints (including Athens)
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    // Only warn for non-public endpoints
    const isPublicEndpoint = config.url?.includes('/health/') || 
                            config.url?.includes('/validate-token/')
    if (!isPublicEndpoint) {
      console.warn('[API] Making authenticated request without token:', config.url)
    }
  }
}
```

**Replace with:**
```typescript
} else {
  // Use JWT token for regular endpoints (including Athens)
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    // Block request if no token (except public endpoints)
    const isPublicEndpoint = config.url?.includes('/health/') || 
                            config.url?.includes('/validate-token/')
    if (!isPublicEndpoint) {
      console.error('[API] Blocking request without token:', config.url)
      // Redirect to login instead of sending doomed request
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(new Error('No authentication token'))
    }
  }
}
```

### Fix 3: Check Token Before Module Fetches

**In any component that fetches on mount (like useEnabledModules), add:**

```typescript
useEffect(() => {
  const token = localStorage.getItem('access_token') || 
                sessionStorage.getItem('access_token');
  
  if (!token) {
    console.warn('No token found, skipping fetch');
    return;
  }
  
  // Now safe to fetch
  fetchData();
}, []);
```

## Quick User Fix (Immediate)

**User should:**
1. Open DevTools (F12)
2. Application tab → Clear storage → Clear site data
3. Close browser completely
4. Open in Incognito: `https://www.ai-athens.cloud`
5. Log in fresh
6. Test safety observation

## Verification

After fixes, check nginx logs:
```bash
sudo tail -f /var/log/nginx/access.log | grep safety-observation
```

**Should see:**
- `200` responses (success)
- NOT `499` (client abort)

## Files to Modify

1. `/var/www/athens-2.0/frontend/src/lib/api.ts` - Add redirect guard + block no-token requests
2. Any component using `useEffect` for API calls - Add token check

## Expected Result

- No more 499 errors
- Clean 401 → redirect to login (once)
- No request storms
- No abort loops

---

**Priority**: HIGH
**Effort**: 15 minutes
**Impact**: Eliminates all request abort issues

# Token Authentication Debug Guide

## Issue
Users are getting 401 errors on API requests after login, indicating authentication tokens aren't working properly.

## Debug Steps

### 1. Check if tokens are stored after login
Open browser console and run:
```javascript
// Check sessionStorage
console.log('Access Token:', sessionStorage.getItem('_at'))
console.log('Refresh Token:', sessionStorage.getItem('_rt'))

// Check localStorage
console.log('Access Token (LS):', localStorage.getItem('_at'))
console.log('Refresh Token (LS):', localStorage.getItem('_rt'))

// Check auth store
console.log('Auth Storage:', localStorage.getItem('auth-storage'))
```

### 2. Check if Authorization header is being sent
In browser DevTools Network tab:
1. Make any API request (e.g., load projects)
2. Click on the request
3. Go to "Headers" tab
4. Look for `Authorization: Bearer <token>` in Request Headers

### 3. Verify token format
Tokens should be base64 encoded JWT. Run in console:
```javascript
const token = sessionStorage.getItem('_at')
if (token) {
  const decoded = atob(token) // Decrypt from tokenManager
  console.log('Decoded token:', decoded)
  
  // JWT tokens have 3 parts separated by dots
  const parts = decoded.split('.')
  console.log('Token parts:', parts.length) // Should be 3
}
```

### 4. Test token manually
```bash
# Get the actual token value (not base64 encoded)
TOKEN="<paste-decoded-token-here>"

# Test with curl
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8004/api/authentication/project/list/
```

## Common Issues

### Issue 1: Token not stored
**Symptom:** sessionStorage._at is null after login
**Fix:** Check if login response contains `access` and `refresh` fields

### Issue 2: Token not sent in headers
**Symptom:** Authorization header missing in Network tab
**Fix:** Check request interceptor in api.ts is working

### Issue 3: Token expired
**Symptom:** Token exists but returns 401
**Fix:** Token refresh should happen automatically, check refresh token endpoint

### Issue 4: Wrong endpoint
**Symptom:** 404 instead of 401
**Fix:** Verify API endpoints match backend URLs

## Quick Fix

If tokens aren't working, try:
1. Logout completely
2. Clear all storage: `localStorage.clear(); sessionStorage.clear()`
3. Login again
4. Check if tokens are stored
5. Make an API request and verify Authorization header is sent

# API Guardrails - Service Layer Pattern

## 🚨 STRICT RULE: No Direct axios Calls

### ✅ CORRECT Pattern

**Pages/Components:**
```typescript
// ✅ GOOD - Import from service layer
import { controlPlaneService } from '../services/controlPlaneService'

const MyComponent = () => {
  const loadData = async () => {
    const res = await controlPlaneService.getTenants()
    setData(res.data)
  }
}
```

**Services:**
```typescript
// ✅ GOOD - Only services can call apiClient
import { apiClient } from '../lib/api'

export const myService = {
  getData: () => apiClient.get('/api/my-endpoint/')
}
```

### ❌ INCORRECT Pattern

```typescript
// ❌ BAD - Direct axios/apiClient call in component
import { apiClient } from '../lib/api'

const MyComponent = () => {
  const loadData = async () => {
    const res = await apiClient.get('/api/tenants/')  // ❌ NO!
  }
}
```

---

## 📁 Service Layer Structure

```
frontend/src/services/
├── controlPlaneService.ts      # Superadmin APIs (tenants, masters, subs)
├── authService.ts              # (Future) Auth APIs
├── projectService.ts           # (Future) Project APIs
├── ptwService.ts               # (Future) PTW APIs
└── incidentService.ts          # (Future) Incident APIs
```

---

## 🎯 Benefits

1. **Single Source of Truth** - All API contracts in one place
2. **Easy to Mock** - Test components without backend
3. **Type Safety** - TypeScript interfaces for all data
4. **Centralized Error Handling** - Consistent error messages
5. **Easy Refactoring** - Change API without touching components
6. **Code Review** - Easy to spot API changes

---

## 📝 Service Template

```typescript
import { apiClient } from '../lib/api'

// Define interfaces
export interface MyEntity {
  id: number
  name: string
  created_at: string
}

// Export service
export const myService = {
  // List
  getAll: () => 
    apiClient.get<MyEntity[]>('/api/my-entities/'),
  
  // Get one
  getById: (id: number) => 
    apiClient.get<MyEntity>(`/api/my-entities/${id}/`),
  
  // Create
  create: (data: Omit<MyEntity, 'id' | 'created_at'>) => 
    apiClient.post<MyEntity>('/api/my-entities/', data),
  
  // Update
  update: (id: number, data: Partial<MyEntity>) => 
    apiClient.patch<MyEntity>(`/api/my-entities/${id}/`, data),
  
  // Delete
  delete: (id: number) => 
    apiClient.delete(`/api/my-entities/${id}/`),
}
```

---

## 🔍 Enforcement (Optional)

### ESLint Rule (Future)
```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [{
        "group": ["**/lib/api"],
        "message": "Import from services/ instead of using apiClient directly"
      }]
    }]
  }
}
```

### Code Review Checklist
- [ ] No `apiClient` imports in pages/
- [ ] No `apiClient` imports in components/
- [ ] All API calls go through services/
- [ ] New endpoints added to appropriate service file

---

## 📚 Existing Services

### controlPlaneService.ts
```typescript
// Tenants
getTenants()
createTenant(data)
disableTenant(id)
enableTenant(id)

// Subscriptions
getSubscriptions()
createSubscription(data)

// Master Admins
getMasters()
createMaster(data)
disableMaster(id)
resetMasterPassword(id)

// Audit Logs
getAuditLogs(params)
```

### lib/api.ts (apiClient)
```typescript
// Generic methods (only for services/)
apiClient.get(url, config)
apiClient.post(url, data, config)
apiClient.put(url, data)
apiClient.patch(url, data)
apiClient.delete(url, config)

// Legacy methods (being migrated to services/)
apiClient.login()
apiClient.getCompanies()
// ... etc
```

---

## 🚀 Migration Plan

### Phase 1: New Code (Current)
- ✅ All new features use service layer
- ✅ controlPlaneService.ts created
- ✅ No direct apiClient in new pages

### Phase 2: Existing Code (Future)
- ⏳ Move auth APIs to authService.ts
- ⏳ Move company APIs to companyService.ts
- ⏳ Move HR APIs to hrService.ts
- ⏳ Move Finance APIs to financeService.ts
- ⏳ Move CRM APIs to crmService.ts

### Phase 3: Cleanup (Future)
- ⏳ Remove legacy methods from apiClient
- ⏳ Keep only generic methods (get, post, put, patch, delete)
- ⏳ Add ESLint rule for enforcement

---

## ✅ Checklist for New Features

When adding a new feature:

1. **Create service file** (if doesn't exist)
   - [ ] Create `src/services/myFeatureService.ts`
   - [ ] Define TypeScript interfaces
   - [ ] Export service object with methods

2. **Add API methods**
   - [ ] Use `apiClient.get/post/put/patch/delete`
   - [ ] Add TypeScript return types
   - [ ] Handle errors in service (optional)

3. **Use in components**
   - [ ] Import from service file
   - [ ] Call service methods
   - [ ] Handle loading/error states in component

4. **Document**
   - [ ] Add JSDoc comments to service methods
   - [ ] Update this file with new service

---

**Rule:** Only `src/services/*` can import `apiClient` from `lib/api`

**Enforcement:** Code review + (optional) ESLint rule

**Status:** ✅ Active | 🚀 Foundation v1

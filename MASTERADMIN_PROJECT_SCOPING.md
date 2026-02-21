# MasterAdmin Project-Scoped Architecture - Implementation Summary

## Problem Identified
MasterAdmin was accessing ERGON and Workforce globally across all projects, but should only manage modules for specific projects they own.

## Solution Implemented

### 1. Project Context Store
**File:** `/frontend/src/store/projectContext.ts`
- Zustand store with persistence
- Stores selected project across page navigation
- Provides `selectedProject`, `setSelectedProject`, `clearProject`

### 2. Project Selector Component
**File:** `/frontend/src/components/masteradmin/ProjectSelector.tsx`
- Dropdown to select project
- Shows warning if no project selected
- Persists selection in store

### 3. Updated ERGON Page
**File:** `/frontend/src/pages/masteradmin/Ergon.tsx`
- Added ProjectSelector at top
- Shows project context banner
- Blocks access to modules until project selected
- Fixed route: `/master-admin/ergon/daily-planner`

### 4. Updated Daily Planner
**File:** `/frontend/src/pages/ergon/DailyPlannerPage.tsx`
- Reads project context
- Redirects to ERGON page if no project selected
- Shows project banner at top
- Filters tasks by selected project

## Architecture Flow

```
MasterAdmin Dashboard
  ↓
ERGON/Workforce Page
  ↓
[Project Selector] ← Select Project
  ↓
Project Context Stored
  ↓
Daily Planner / Tasks / etc.
  ↓
Data filtered by selected project
```

## Backend Changes Needed

### Add project_id filter to API calls:
```python
# ergon/views.py - DailyPlannerViewSet
def get_queryset(self):
    tenant, error = get_current_tenant(self.request.user)
    if error:
        return DailyTask.objects.none()
    
    date = self.request.query_params.get('date', timezone.now().date())
    project_id = self.request.query_params.get('project_id')  # NEW
    
    qs = DailyTask.objects.filter(
        athens_tenant_id=tenant.id,
        user=self.request.user,
        scheduled_date=date
    )
    
    if project_id:  # NEW
        qs = qs.filter(task__project_id=project_id)  # NEW
    
    return qs.select_related('task', 'user')
```

## Frontend API Update Needed

```typescript
// services/ergonApi.ts
getDailyTasks: (date: string, projectId?: number) => 
  apiClient.get('/api/ergon/daily-planner/', { 
    params: { date, project_id: projectId } 
  }),
```

## User Experience

1. MasterAdmin logs in
2. Navigates to ERGON or Workforce
3. Sees project selector dropdown
4. Selects their project
5. Project context persists across navigation
6. All data filtered by selected project
7. Can switch projects anytime

## Benefits

✅ **Multi-project isolation** - MasterAdmin only sees their project data  
✅ **Clear context** - Always shows which project is active  
✅ **Persistent selection** - Project choice saved in localStorage  
✅ **Better UX** - Clear workflow with project selection first  
✅ **Scalable** - Easy to add more project-scoped modules  

## Files Created/Modified

### Created:
- `/frontend/src/store/projectContext.ts`
- `/frontend/src/components/masteradmin/ProjectSelector.tsx`

### Modified:
- `/frontend/src/pages/masteradmin/Ergon.tsx`
- `/frontend/src/pages/ergon/DailyPlannerPage.tsx`

## Next Steps

1. ✅ Frontend project context - DONE
2. ⏳ Backend project filtering - TODO
3. ⏳ Load projects from API - TODO
4. ⏳ Apply same pattern to Workforce - TODO
5. ⏳ Add project permissions check - TODO

## Status

**Frontend:** ✅ 80% Complete  
**Backend:** ⏳ Needs project_id filtering  
**Overall:** 🔄 In Progress

---

**Last Updated:** February 18, 2025  
**Implementation:** Amazon Q Developer

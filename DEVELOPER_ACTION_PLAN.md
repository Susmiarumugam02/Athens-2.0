# Developer Action Plan - Apply Shared Components

**Status**: ✅ Infrastructure Ready - Modules Need Migration  
**Effort**: 15 minutes per module  
**Priority**: High

---

## 🎯 Current Status

### ✅ Complete:
- Shared components created
- CSS variables defined
- ConfigProvider configured
- Vite optimized
- Documentation complete

### 🔄 To Do:
- Apply shared components to 11 modules
- Remove old CSS files
- Test each module

---

## 📋 Quick Migration Steps (Per Module)

### Step 1: Add Import (1 line)
```typescript
import { ModuleTableContainer, ModulePageLayout } from '@/components/shared';
```

### Step 2: Replace Table (1 change)
```typescript
// Before
<Table columns={columns} dataSource={data} />

// After
<ModuleTableContainer columns={columns} dataSource={data} />
```

### Step 3: Wrap Page (1 change)
```typescript
// Before
<div style={{ padding: '24px' }}>

// After
<ModulePageLayout breadcrumbs={[...]}>
```

### Step 4: Test (2 minutes)
- Open module in browser
- Verify it looks like Incident Management
- Test CRUD operations

---

## 🚀 Module-by-Module Instructions

### 1. PTW (Permit to Work)

**File**: `/frontend/src/pages/ptw/components/PermitList.tsx`

```typescript
// Add at top
import { ModuleTableContainer } from '@/components/shared';

// Find the <Table> component and replace with:
<ModuleTableContainer
  columns={columns}
  dataSource={permits}
  rowKey="id"
  loading={loading}
  pagination={pagination}
  highlightRowCondition={(record) => 
    record.status === 'pending' && record.assigned_to_me
  }
/>
```

**File**: `/frontend/src/pages/ptw/PermitsPage.tsx`

```typescript
// Add at top
import { ModulePageLayout } from '@/components/shared';

// Wrap the return with:
<ModulePageLayout 
  breadcrumbs={[
    { title: 'Home' },
    { title: 'PTW' },
    { title: 'Permits' }
  ]}
>
  {/* existing content */}
</ModulePageLayout>
```

---

### 2. Safety Observations

**File**: `/frontend/src/pages/safetyobservation/SafetyObservationList.tsx`

```typescript
// Add at top
import { ModuleTableContainer } from '@/components/shared';

// Replace <Table> with:
<ModuleTableContainer
  columns={columns}
  dataSource={observations}
  rowKey="id"
  loading={loading}
  pagination={pagination}
  highlightRowCondition={(record) => 
    record.status === 'open' && record.assigned_to_me
  }
/>
```

**File**: `/frontend/src/pages/safetyobservation/SafetyObservationLanding.tsx`

```typescript
// Add at top
import { ModulePageLayout } from '@/components/shared';

// Wrap return with:
<ModulePageLayout 
  breadcrumbs={[
    { title: 'Home' },
    { title: 'Safety Observations' }
  ]}
>
  {/* existing content */}
</ModulePageLayout>
```

---

### 3. TBT (Toolbox Talk)

**File**: `/frontend/src/pages/toolboxtalk/components/TBTList.tsx` (if exists)

```typescript
import { ModuleTableContainer } from '@/components/shared';

<ModuleTableContainer
  columns={columns}
  dataSource={tbts}
  rowKey="id"
  loading={loading}
  pagination={pagination}
/>
```

---

### 4. Induction Training

**File**: `/frontend/src/pages/inductiontraining/components/InductionList.tsx` (if exists)

```typescript
import { ModuleTableContainer } from '@/components/shared';

<ModuleTableContainer
  columns={columns}
  dataSource={inductions}
  rowKey="id"
  loading={loading}
  pagination={pagination}
/>
```

---

### 5. Environment (ESG)

**File**: `/frontend/src/pages/esg/components/EnvironmentList.tsx` (if exists)

```typescript
import { ModuleTableContainer } from '@/components/shared';

<ModuleTableContainer
  columns={columns}
  dataSource={records}
  rowKey="id"
  loading={loading}
  pagination={pagination}
/>
```

---

### 6. Quality

**File**: `/frontend/src/pages/quality/components/QualityList.tsx` (if exists)

```typescript
import { ModuleTableContainer } from '@/components/shared';

<ModuleTableContainer
  columns={columns}
  dataSource={inspections}
  rowKey="id"
  loading={loading}
  pagination={pagination}
/>
```

---

### 7. Inspection

**File**: `/frontend/src/pages/inspection/components/InspectionList.tsx` (if exists)

```typescript
import { ModuleTableContainer } from '@/components/shared';

<ModuleTableContainer
  columns={columns}
  dataSource={inspections}
  rowKey="id"
  loading={loading}
  pagination={pagination}
/>
```

---

### 8. Job Training

**File**: `/frontend/src/pages/jobtraining/components/JobTrainingList.tsx` (if exists)

```typescript
import { ModuleTableContainer } from '@/components/shared';

<ModuleTableContainer
  columns={columns}
  dataSource={trainings}
  rowKey="id"
  loading={loading}
  pagination={pagination}
/>
```

---

### 9. MOM (Minutes of Meeting)

**File**: `/frontend/src/pages/mom/components/MOMList.tsx` (if exists)

```typescript
import { ModuleTableContainer } from '@/components/shared';

<ModuleTableContainer
  columns={columns}
  dataSource={meetings}
  rowKey="id"
  loading={loading}
  pagination={pagination}
/>
```

---

### 10. Workforce

**File**: `/frontend/src/pages/workforce/EmployeeManagementPage.tsx`

```typescript
import { ModuleTableContainer } from '@/components/shared';

// Find the employee table and replace with:
<ModuleTableContainer
  columns={employeeColumns}
  dataSource={employees}
  rowKey="id"
  loading={loading}
  pagination={pagination}
/>
```

**Repeat for**:
- `AttendancePage.tsx`
- `LeaveManagementPage.tsx`
- `PayrollWagesPage.tsx`

---

### 11. ERGON

**File**: `/frontend/src/pages/ergon/TaskManagementPage.tsx`

```typescript
import { ModuleTableContainer } from '@/components/shared';

<ModuleTableContainer
  columns={taskColumns}
  dataSource={tasks}
  rowKey="id"
  loading={loading}
  pagination={pagination}
  highlightRowCondition={(record) => 
    record.assigned_to === currentUserId
  }
/>
```

**Repeat for**:
- `DailyPlannerPage.tsx`
- `FollowupsPage.tsx`
- `AdvanceExpensesPage.tsx`

---

## ✅ Testing Checklist (Per Module)

After each module migration:

- [ ] Module loads without errors
- [ ] Table displays data correctly
- [ ] Filters work
- [ ] Search works
- [ ] Pagination works
- [ ] Create/Edit/Delete work
- [ ] Dark mode toggle works
- [ ] UI looks like Incident Management
- [ ] No console errors

---

## 🎯 Priority Order

### Week 1 (High Priority):
1. **PTW** - Most used module
2. **Safety Observations** - Critical for safety
3. **TBT** - Regular usage

### Week 2 (Medium Priority):
4. **Induction Training**
5. **Environment**
6. **Quality**
7. **Inspection**

### Week 3 (Lower Priority):
8. **Job Training**
9. **MOM**
10. **Workforce** (multiple pages)
11. **ERGON** (multiple pages)

---

## 🚀 Quick Commands

### Start Development:
```bash
cd /var/www/athens-2.0/frontend
npm run dev
```

### Test Module:
```bash
# Open browser to:
http://localhost:5173/app/[module-name]
```

### Verify Changes:
```bash
cd /var/www/athens-2.0
./scripts/verify-module-standardization.sh
```

### Build for Production:
```bash
cd frontend
npm run build
```

---

## 💡 Tips

### Do:
- ✅ Copy-paste the examples above
- ✅ Test after each module
- ✅ Compare with Incident Management
- ✅ Keep existing functionality

### Don't:
- ❌ Change component logic
- ❌ Remove existing features
- ❌ Add new inline styles
- ❌ Create new CSS files

---

## 🆘 Troubleshooting

### Import Error:
```typescript
// If you get import error, check path:
import { ModuleTableContainer } from '@/components/shared';
// Should resolve to: /frontend/src/components/shared/
```

### Table Not Styled:
```typescript
// Make sure you're using ModuleTableContainer, not Table:
<ModuleTableContainer {...props} />  // ✅ Correct
<Table {...props} />                  // ❌ Wrong
```

### Dark Mode Not Working:
```bash
# Check CSS variables are loaded:
grep "color-ui-base" frontend/src/index.css
# Should return results
```

---

## 📞 Need Help?

1. Check `QUICK_IMPLEMENTATION_GUIDE.md`
2. Look at Incident Management code
3. Review shared component code
4. Run verification script

---

## 🎉 When Complete

After all modules are migrated:

1. Run full verification:
```bash
./scripts/verify-module-standardization.sh
```

2. Test all modules manually

3. Deploy to staging

4. Get approval

5. Deploy to production

---

**Status**: 🔄 Ready to Start  
**Effort**: 15 min × 11 modules = 2.75 hours  
**Impact**: Consistent UI across entire app  

**Let's do this!** 🚀

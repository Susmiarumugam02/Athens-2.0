# Quick Implementation Guide - Module CSS Standardization

**Goal**: Make all modules look like Incident Management  
**Time**: 15 minutes per module

---

## ✅ Shared Components Created

All components are in `/frontend/src/components/shared/`:

1. **ModuleTableContainer** - Standardized table with dark mode
2. **ModulePageLayout** - Page wrapper with breadcrumbs
3. **ModuleFilterBar** - Filter section wrapper
4. **ModuleFormModal** - Modal wrapper

---

## 🚀 How to Use (3 Steps)

### Step 1: Import Components

```typescript
import {
  ModuleTableContainer,
  ModulePageLayout,
  ModuleFilterBar,
  ModuleFormModal,
} from '@/components/shared';
```

### Step 2: Replace Table

**Before**:
```typescript
<Table
  columns={columns}
  dataSource={data}
  rowKey="id"
  loading={loading}
  pagination={pagination}
/>
```

**After**:
```typescript
<ModuleTableContainer
  columns={columns}
  dataSource={data}
  rowKey="id"
  loading={loading}
  pagination={pagination}
  highlightRowCondition={(record) => record.assigned_to_me}
/>
```

### Step 3: Wrap Page

**Before**:
```typescript
<div style={{ padding: '24px' }}>
  <Breadcrumb items={breadcrumbs} />
  {/* content */}
</div>
```

**After**:
```typescript
<ModulePageLayout breadcrumbs={breadcrumbs}>
  {/* content */}
</ModulePageLayout>
```

---

## 📋 Module Migration Examples

### PTW Module

**File**: `/frontend/src/pages/ptw/components/PermitList.tsx`

```typescript
// Add import
import { ModuleTableContainer } from '@/components/shared';

// Replace Table component
<ModuleTableContainer
  columns={columns}
  dataSource={permits}
  rowKey="id"
  loading={loading}
  pagination={pagination}
  highlightRowCondition={(record) => 
    record.assigned_to === currentUserId
  }
/>
```

**File**: `/frontend/src/pages/ptw/PermitsPage.tsx`

```typescript
// Add import
import { ModulePageLayout } from '@/components/shared';

// Wrap page
<ModulePageLayout 
  breadcrumbs={[
    { title: 'Home' },
    { title: 'PTW' },
    { title: 'Permits' }
  ]}
>
  <PermitList />
</ModulePageLayout>
```

---

### Safety Observations Module

**File**: `/frontend/src/pages/safetyobservation/SafetyObservationList.tsx`

```typescript
// Add import
import { ModuleTableContainer } from '@/components/shared';

// Replace Table
<ModuleTableContainer
  columns={columns}
  dataSource={observations}
  rowKey="id"
  loading={loading}
  pagination={pagination}
  highlightRowCondition={(record) => 
    record.status === 'pending' && record.assigned_to_me
  }
/>
```

---

### TBT Module

**File**: `/frontend/src/pages/tbt/components/TBTList.tsx`

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

## 🎨 Styling Features

### Automatic Features:
- ✅ Dark mode support
- ✅ Hover effects
- ✅ Consistent colors
- ✅ Responsive design
- ✅ Row highlighting

### Row Highlighting:
```typescript
// Highlight rows based on condition
<ModuleTableContainer
  highlightRowCondition={(record) => {
    // Your condition here
    return record.assigned_to_me;
    // or
    return record.status === 'urgent';
    // or
    return record.priority === 'high';
  }}
/>
```

---

## 📊 Before & After Comparison

### Before (Each Module Different):
```typescript
// PTW
<Table style={{ background: '#fff' }} />

// Safety Obs
<Table className="custom-table" />

// TBT
<div className="table-wrapper">
  <Table />
</div>
```

### After (All Modules Same):
```typescript
// PTW, Safety Obs, TBT - All identical
<ModuleTableContainer
  columns={columns}
  dataSource={data}
/>
```

---

## ✅ Checklist for Each Module

- [ ] Import shared components
- [ ] Replace `<Table>` with `<ModuleTableContainer>`
- [ ] Wrap page with `<ModulePageLayout>`
- [ ] Remove custom CSS files (if any)
- [ ] Remove inline styles for tables
- [ ] Test UI looks like Incident Management
- [ ] Test dark mode works
- [ ] Test all features work

---

## 🧪 Testing

### Visual Test:
1. Open module in browser
2. Compare with Incident Management
3. Should look identical

### Functional Test:
1. Create record
2. Edit record
3. Delete record
4. Filter/search
5. Pagination
6. Dark mode toggle

### All should work exactly the same!

---

## 🎯 Priority Order

### Week 1:
1. ✅ Incident Management (template - already done)
2. 🔄 PTW (high usage)
3. 🔄 Safety Observations (high usage)

### Week 2:
4. 🔄 TBT
5. 🔄 Induction Training
6. 🔄 Environment

### Week 3:
7. 🔄 Quality
8. 🔄 Job Training
9. 🔄 Manpower

---

## 💡 Tips

### Do:
- ✅ Use shared components
- ✅ Keep existing functionality
- ✅ Test after each change
- ✅ Compare with Incident Management

### Don't:
- ❌ Create new CSS files
- ❌ Add inline styles
- ❌ Change component logic
- ❌ Break existing features

---

## 🆘 Troubleshooting

### Issue: Table doesn't look right
**Solution**: Check CSS variables are loaded in `index.css`

### Issue: Dark mode doesn't work
**Solution**: Verify `ConfigProvider` is in `main.tsx`

### Issue: Highlighting doesn't work
**Solution**: Check `highlightRowCondition` function returns boolean

### Issue: Build errors
**Solution**: Check import path: `@/components/shared`

---

## 📞 Support

**Questions?** Check:
1. Incident Management module (reference implementation)
2. Shared components code
3. This guide

**Still stuck?** Compare your code with Incident Management line-by-line.

---

**Status**: ✅ Ready to Use | **Effort**: 15 min/module | **Impact**: Consistent UI

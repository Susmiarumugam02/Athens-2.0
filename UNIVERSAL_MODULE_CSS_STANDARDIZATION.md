# Universal Module CSS Standardization Strategy

**Goal**: Apply Incident Management CSS/UI style to all modules  
**Modules**: PTW, Safety Observations, TBT, Induction Training, Environment, Quality, etc.

---

## 🎯 Strategy Overview

### Approach: Shared Component Library
Instead of copying CSS to each module, create **reusable components** that all modules use.

**Benefits**:
- ✅ Single source of truth
- ✅ Consistent UI across all modules
- ✅ Easy to maintain
- ✅ No code duplication

---

## 📦 Shared Components to Create

### 1. **ModuleTableContainer** (Replaces IncidentList.css)

**File**: `/frontend/src/components/shared/ModuleTableContainer.tsx`

```typescript
import { Table, ConfigProvider } from 'antd';
import type { TableProps } from 'antd';
import './ModuleTableContainer.css';

interface ModuleTableContainerProps<T> extends TableProps<T> {
  highlightRowCondition?: (record: T) => boolean;
}

export function ModuleTableContainer<T extends object>({
  highlightRowCondition,
  rowClassName,
  ...props
}: ModuleTableContainerProps<T>) {
  return (
    <ConfigProvider
      theme={{
        components: {
          Table: {
            headerBg: 'var(--color-ui-active)',
            headerColor: 'var(--color-text-base)',
            rowHoverBg: 'var(--color-ui-hover)',
            borderColor: 'var(--color-border)',
          },
        },
      }}
    >
      <div className="module-table-container">
        <Table
          {...props}
          rowClassName={(record, index) => {
            const customClass = typeof rowClassName === 'function' 
              ? rowClassName(record, index) 
              : rowClassName || '';
            const highlightClass = highlightRowCondition?.(record) 
              ? 'row-highlighted' 
              : '';
            return `${customClass} ${highlightClass}`.trim();
          }}
        />
      </div>
    </ConfigProvider>
  );
}
```

**File**: `/frontend/src/components/shared/ModuleTableContainer.css`

```css
/* Universal table styling for all modules */
.module-table-container {
  background-color: var(--color-ui-base) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 8px !important;
  overflow: hidden !important;
}

.dark .module-table-container {
  background-color: var(--color-ui-base) !important;
  border-color: var(--color-border) !important;
}

/* Highlighted row (e.g., assigned to me) */
.row-highlighted {
  background-color: #f6ffed !important;
  border-left: 3px solid #52c41a;
}

.row-highlighted:hover {
  background-color: #f0f9ff !important;
}

.dark .row-highlighted {
  background-color: rgba(82, 196, 26, 0.1) !important;
}

.dark .row-highlighted:hover {
  background-color: rgba(82, 196, 26, 0.15) !important;
}

/* Table header */
.ant-table-thead > tr > th {
  background-color: var(--color-ui-active) !important;
  color: var(--color-text-base) !important;
  font-weight: 600;
  border-bottom: 1px solid var(--color-border) !important;
}

/* Table row hover */
.ant-table-tbody > tr:hover > td {
  background-color: var(--color-ui-hover) !important;
}

.dark .ant-table-tbody > tr:hover > td {
  background-color: var(--color-ui-hover) !important;
}

/* Dark mode table cells */
.dark .ant-table-tbody > tr > td {
  border-bottom: 1px solid var(--color-border) !important;
  color: var(--color-text-base) !important;
}
```

---

### 2. **ModulePageLayout** (Standard page wrapper)

**File**: `/frontend/src/components/shared/ModulePageLayout.tsx`

```typescript
import { ReactNode } from 'react';
import { Breadcrumb, Space } from 'antd';

interface ModulePageLayoutProps {
  children: ReactNode;
  breadcrumbs?: { title: string }[];
  actions?: ReactNode;
}

export function ModulePageLayout({ 
  children, 
  breadcrumbs, 
  actions 
}: ModulePageLayoutProps) {
  return (
    <div style={{ padding: '24px' }}>
      {breadcrumbs && (
        <Breadcrumb 
          style={{ marginBottom: '16px' }} 
          items={breadcrumbs} 
        />
      )}
      
      {actions && (
        <div style={{ 
          marginBottom: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          {actions}
        </div>
      )}
      
      {children}
    </div>
  );
}
```

---

### 3. **ModuleFilterBar** (Standard filters)

**File**: `/frontend/src/components/shared/ModuleFilterBar.tsx`

```typescript
import { ReactNode } from 'react';
import { Row, Col } from 'antd';

interface ModuleFilterBarProps {
  children: ReactNode;
}

export function ModuleFilterBar({ children }: ModuleFilterBarProps) {
  return (
    <div style={{ 
      marginBottom: 16, 
      padding: '16px', 
      backgroundColor: '#fff', 
      borderRadius: '8px' 
    }}>
      <Row gutter={16}>
        {children}
      </Row>
    </div>
  );
}
```

---

### 4. **ModuleFormModal** (Standard modal wrapper)

**File**: `/frontend/src/components/shared/ModuleFormModal.tsx`

```typescript
import { Modal, ModalProps } from 'antd';
import { ReactNode } from 'react';

interface ModuleFormModalProps extends ModalProps {
  children: ReactNode;
}

export function ModuleFormModal({ 
  children, 
  ...props 
}: ModuleFormModalProps) {
  return (
    <Modal
      {...props}
      destroyOnClose
      centered
    >
      {children}
    </Modal>
  );
}
```

---

## 🔄 Migration Plan

### Phase 1: Create Shared Components (Week 1)

**Tasks**:
1. Create `/frontend/src/components/shared/` directory
2. Implement 4 shared components above
3. Test with Incident Management module
4. Verify UI remains identical

**Files to Create**:
- `ModuleTableContainer.tsx` + `.css`
- `ModulePageLayout.tsx`
- `ModuleFilterBar.tsx`
- `ModuleFormModal.tsx`
- `index.ts` (exports)

---

### Phase 2: Migrate PTW Module (Week 2)

**Before**:
```typescript
// PTW PermitList.tsx
<Table
  columns={columns}
  dataSource={permits}
  // ... inline styles
/>
```

**After**:
```typescript
// PTW PermitList.tsx
import { ModuleTableContainer } from '@/components/shared';

<ModuleTableContainer
  columns={columns}
  dataSource={permits}
  highlightRowCondition={(record) => record.assigned_to_me}
/>
```

**Files to Update**:
- `PermitList.tsx` - Use ModuleTableContainer
- `PermitsPage.tsx` - Use ModulePageLayout
- `EnhancedPermitForm.tsx` - Use ModuleFormModal
- Remove `PTWStandardPrint.css` (if not print-specific)

---

### Phase 3: Migrate Safety Observations (Week 3)

**Files to Update**:
- `SafetyObservationList.tsx` - Use ModuleTableContainer
- `SafetyObservationLanding.tsx` - Use ModulePageLayout
- `SafetyObservationForm.tsx` - Use ModuleFormModal

---

### Phase 4: Migrate Remaining Modules (Week 4-5)

**Modules**:
- TBT (Toolbox Talk)
- Induction Training
- Environment
- Quality
- Job Training
- Manpower

**Pattern** (same for all):
1. Replace table with `ModuleTableContainer`
2. Wrap page with `ModulePageLayout`
3. Use `ModuleFilterBar` for filters
4. Use `ModuleFormModal` for forms

---

## 📋 Module-by-Module Checklist

### PTW (Permit to Work)
- [ ] PermitList.tsx → ModuleTableContainer
- [ ] PermitsPage.tsx → ModulePageLayout
- [ ] EnhancedPermitForm.tsx → ModuleFormModal
- [ ] Remove inline styles
- [ ] Test UI identical

### Safety Observations
- [ ] SafetyObservationList.tsx → ModuleTableContainer
- [ ] SafetyObservationLanding.tsx → ModulePageLayout
- [ ] SafetyObservationForm.tsx → ModuleFormModal
- [ ] Remove inline styles
- [ ] Test UI identical

### TBT (Toolbox Talk)
- [ ] TBTList.tsx → ModuleTableContainer
- [ ] TBTPage.tsx → ModulePageLayout
- [ ] TBTForm.tsx → ModuleFormModal

### Induction Training
- [ ] InductionList.tsx → ModuleTableContainer
- [ ] InductionPage.tsx → ModulePageLayout
- [ ] InductionForm.tsx → ModuleFormModal

### Environment
- [ ] EnvironmentList.tsx → ModuleTableContainer
- [ ] EnvironmentPage.tsx → ModulePageLayout
- [ ] EnvironmentForm.tsx → ModuleFormModal

### Quality
- [ ] QualityList.tsx → ModuleTableContainer
- [ ] QualityPage.tsx → ModulePageLayout
- [ ] QualityForm.tsx → ModuleFormModal

---

## 🎨 Design Tokens (Already in index.css)

All modules will use these CSS variables:

```css
:root {
  --color-ui-base: #ffffff;
  --color-border: #eef0f4;
  --color-text-base: #1e293b;
  --color-ui-active: #fafafa;
  --color-ui-hover: #f7f8fa;
  --color-primary: #1890ff;
}

.dark {
  --color-ui-base: #1A1D26;
  --color-border: #2C313D;
  --color-text-base: #e3e4e8;
  --color-ui-active: #242833;
  --color-ui-hover: #242833;
  --color-primary: #5865f2;
}
```

---

## 🚀 Quick Start Guide

### For Each Module:

**Step 1: Import shared components**
```typescript
import {
  ModuleTableContainer,
  ModulePageLayout,
  ModuleFilterBar,
  ModuleFormModal,
} from '@/components/shared';
```

**Step 2: Replace table**
```typescript
// Before
<Table columns={columns} dataSource={data} />

// After
<ModuleTableContainer columns={columns} dataSource={data} />
```

**Step 3: Wrap page**
```typescript
// Before
<div style={{ padding: '24px' }}>
  {/* content */}
</div>

// After
<ModulePageLayout breadcrumbs={[...]}>
  {/* content */}
</ModulePageLayout>
```

**Step 4: Test**
- UI should look identical to Incident Management
- Dark mode should work
- All features should work

---

## 📊 Expected Results

### Before Standardization:
- 10+ modules with different styles
- Inconsistent spacing, colors, layouts
- Hard to maintain
- Dark mode issues

### After Standardization:
- All modules look identical
- Consistent spacing, colors, layouts
- Easy to maintain (change once, apply everywhere)
- Dark mode works everywhere

---

## 🔍 Verification Script

```bash
# Run this after each module migration
npm run dev

# Check each module:
# 1. List page looks like Incident Management
# 2. Form modal looks consistent
# 3. Filters work
# 4. Dark mode works
# 5. Table highlighting works
```

---

## 💡 Benefits

### For Developers:
- ✅ Write less code
- ✅ Consistent patterns
- ✅ Easy to maintain
- ✅ Reusable components

### For Users:
- ✅ Consistent UI across all modules
- ✅ Familiar patterns
- ✅ Better UX
- ✅ Reliable dark mode

### For Business:
- ✅ Faster development
- ✅ Lower maintenance cost
- ✅ Professional appearance
- ✅ Scalable architecture

---

## 📁 File Structure

```
frontend/src/
├── components/
│   └── shared/
│       ├── ModuleTableContainer.tsx
│       ├── ModuleTableContainer.css
│       ├── ModulePageLayout.tsx
│       ├── ModuleFilterBar.tsx
│       ├── ModuleFormModal.tsx
│       └── index.ts
├── pages/
│   ├── incidentmanagement/  ✅ Template
│   ├── ptw/                 🔄 Migrate
│   ├── safetyobservation/   🔄 Migrate
│   ├── tbt/                 🔄 Migrate
│   ├── inductiontraining/   🔄 Migrate
│   ├── environment/         🔄 Migrate
│   └── quality/             🔄 Migrate
```

---

## 🎯 Success Criteria

- [ ] All modules use shared components
- [ ] UI looks identical across modules
- [ ] Dark mode works everywhere
- [ ] No inline styles for theme values
- [ ] No duplicate CSS files
- [ ] Easy to add new modules

---

**Status**: 📋 Strategy Ready | **Timeline**: 5 weeks | **Impact**: All Modules

# UI Standard Operating Procedures (SOP)

**Status:** 🔒 Locked  
**Effective Date:** February 7, 2025  
**Purpose:** Prevent reintroduction of Athens legacy UI patterns

---

## 🎯 Core Principles

1. **SAP-First:** All UI components must use SAP design system
2. **No Legacy:** Never import from `@/components/ui-legacy`
3. **Consistent Layout:** Use layout-level containers, not page-level
4. **Proper Scroll:** Follow scroll container structure rules

---

## 📋 Component Import Rules

### ✅ ALLOWED

```typescript
// Import from shim layer (recommended)
import { Button, Modal, Input } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

// Import directly from SAP (also allowed)
import { Button } from '@/ui/sap/components/Button'
import { DataTable } from '@/ui/sap/components/DataTable'

// Import from SAP barrel
import { Button, Modal, Input } from '@/ui/sap'
```

### ❌ FORBIDDEN

```typescript
// NEVER import from ui-legacy
import { Button } from '@/components/ui-legacy/Button' // ❌ BLOCKED BY ESLINT

// NEVER import legacy CSS
import './index.css' // ❌ Use SAP CSS only
import '@/styles/legacy.css' // ❌ Use SAP CSS only
```

---

## 🏗️ Layout Structure Rules

### Layout Hierarchy

```
Root Container (flex h-screen flex-col overflow-hidden)
  ├─> Header (shrink-0)
  └─> Main Layout (flex flex-1 min-h-0)
        ├─> Sidebar (fixed lg:relative)
        └─> Main Content (flex-1 min-w-0)
              └─> Scroll Container (flex-1 min-h-0 overflow-y-auto)
                    └─> Content Wrapper (max-w-[1600px] mx-auto px-6 py-6)
                          └─> <Outlet /> or Page Content
```

### Critical CSS Classes

**Root Container:**
```css
.flex.h-screen.flex-col.overflow-hidden
```

**Scroll Container:**
```css
.flex-1.min-h-0.overflow-y-auto
```
- `min-h-0` is **CRITICAL** - allows shrinking below content size

**Content Wrapper:**
```css
.max-w-[1600px].mx-auto.px-6.py-6
```

---

## 📄 Page Component Rules

### ✅ CORRECT: No Container Wrapper

```typescript
// src/pages/MyPage.tsx
export default function MyPage() {
  return (
    <div className="space-y-6">
      <h1>My Page</h1>
      {/* Content */}
    </div>
  )
}
```

**Why:** Layout provides container automatically

---

### ❌ WRONG: Page-Level Container

```typescript
// src/pages/MyPage.tsx
export default function MyPage() {
  return (
    <div className="container mx-auto px-4"> {/* ❌ DON'T DO THIS */}
      <h1>My Page</h1>
      {/* Content */}
    </div>
  )
}
```

**Why:** Creates nested containers, breaks layout consistency

---

## 🗂️ Table Component Rules

### ✅ CORRECT: Use DataTable Component

```typescript
import { DataTable } from '@/components/ui/DataTable'

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <h1>Users</h1>
      <DataTable
        columns={columns}
        data={data}
        // ... props
      />
    </div>
  )
}
```

---

### ❌ WRONG: Custom Table Without DataTable

```typescript
export default function UsersPage() {
  return (
    <div className="space-y-6">
      <h1>Users</h1>
      <table className="w-full"> {/* ❌ Use DataTable instead */}
        {/* ... */}
      </table>
    </div>
  )
}
```

**Exception:** Use custom table only if DataTable doesn't meet requirements

---

## 🪟 Modal Component Rules

### ✅ CORRECT: Use Modal or AppDialog

```typescript
import { Modal } from '@/components/ui/Modal'
// OR
import { AppDialog } from '@/components/ui/AppDialog'

export default function MyPage() {
  const [open, setOpen] = useState(false)
  
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal open={open} onOpenChange={setOpen}>
        {/* Content */}
      </Modal>
    </>
  )
}
```

---

### ❌ WRONG: Custom Modal Implementation

```typescript
export default function MyPage() {
  return (
    <div className="fixed inset-0 z-50"> {/* ❌ Use Modal component */}
      {/* Custom modal */}
    </div>
  )
}
```

**Why:** Breaks z-index hierarchy, accessibility, and consistency

---

## 🎨 Styling Rules

### ✅ CORRECT: Use Tailwind + SAP Tokens

```typescript
export default function MyComponent() {
  return (
    <div className="bg-background text-foreground rounded-lg p-4">
      <h2 className="text-xl font-semibold">Title</h2>
      <p className="text-muted-foreground">Description</p>
    </div>
  )
}
```

**SAP Tokens:**
- `bg-background` / `text-foreground`
- `bg-card` / `text-card-foreground`
- `bg-primary` / `text-primary-foreground`
- `text-muted-foreground`
- `border-border`

---

### ❌ WRONG: Hardcoded Colors

```typescript
export default function MyComponent() {
  return (
    <div className="bg-white text-gray-900"> {/* ❌ Use tokens */}
      <h2 className="text-blue-600">Title</h2> {/* ❌ Use primary */}
    </div>
  )
}
```

**Why:** Breaks dark mode, inconsistent with design system

---

## 🆕 Adding New Components

### Step 1: Create in SAP

```bash
# Create component in SAP
src/ui/sap/components/NewComponent.tsx
```

### Step 2: Export from SAP Barrel

```typescript
// src/ui/sap/index.ts
export * from "./components/NewComponent";
```

### Step 3: Create Shim (Optional)

```typescript
// src/components/ui/NewComponent.tsx
export * from '@/ui/sap/components/NewComponent';
```

### Step 4: Use Anywhere

```typescript
import { NewComponent } from '@/components/ui/NewComponent'
// OR
import { NewComponent } from '@/ui/sap'
```

---

## 🔍 Verification

### Run Checks

```bash
# ESLint check
npm run lint

# UI pattern check
npm run ui:check

# Build check
npm run build
```

### Expected Output

```
✅ UI Pattern Check PASSED
   No legacy UI patterns detected
```

---

## 🚨 Common Violations

### Violation 1: Legacy UI Import

```typescript
import { Button } from '@/components/ui-legacy/Button' // ❌
```

**Fix:**
```typescript
import { Button } from '@/components/ui/Button' // ✅
```

---

### Violation 2: Legacy CSS Import

```typescript
import './legacy.css' // ❌
```

**Fix:**
```typescript
// Remove import, use SAP CSS only
```

---

### Violation 3: Page-Level Container

```typescript
<div className="container mx-auto px-4"> {/* ❌ */}
```

**Fix:**
```typescript
<div className="space-y-6"> {/* ✅ */}
```

---

### Violation 4: Custom Modal

```typescript
<div className="fixed inset-0 z-50"> {/* ❌ */}
```

**Fix:**
```typescript
<Modal open={open} onOpenChange={setOpen}> {/* ✅ */}
```

---

## 📊 Scroll Container Checklist

When creating scrollable areas:

- [ ] Root has `overflow-hidden`
- [ ] Scroll container has `flex-1 min-h-0 overflow-y-auto`
- [ ] Parent has `flex flex-col` or `flex flex-row`
- [ ] No nested scroll containers (unless intentional)
- [ ] Test scroll behavior on mobile

---

## 🔄 Rollback Procedures

### If SAP Component Breaks

**Option 1: Fix SAP Component**
```bash
# Edit SAP component
src/ui/sap/components/BrokenComponent.tsx
```

**Option 2: Temporary Rollback**
```bash
# Copy legacy component to SAP
cp src/components/ui-legacy/Component.tsx src/ui/sap/components/
```

**Option 3: Full Rollback (Emergency)**
```bash
# Restore all legacy components
rm src/components/ui/*.tsx
cp -r src/components/ui-legacy/* src/components/ui/
npm run build
```

---

## 📚 Reference Documentation

- **[SAP_COMPONENT_TAKEOVER_COMPLETE.md](./SAP_COMPONENT_TAKEOVER_COMPLETE.md)** - Component system
- **[SAP_LAYOUT_SHELL_TAKEOVER_COMPLETE.md](./SAP_LAYOUT_SHELL_TAKEOVER_COMPLETE.md)** - Layout system
- **[CSS_NEUTRALIZATION_SUMMARY.md](./CSS_NEUTRALIZATION_SUMMARY.md)** - CSS architecture

---

## 🛡️ Enforcement

### ESLint Rules

```javascript
// eslint.config.js
'no-restricted-imports': ['error', {
  patterns: [{
    group: ['**/components/ui-legacy/**'],
    message: 'Use @/components/ui/* or @/ui/sap/* instead'
  }]
}]
```

### CI Check Script

```bash
npm run ui:check
```

Runs automatically in CI/CD pipeline to catch violations.

---

## ✅ Compliance Checklist

Before merging code:

- [ ] No imports from `@/components/ui-legacy`
- [ ] No legacy CSS imports
- [ ] No page-level container wrappers
- [ ] Uses SAP components via `@/components/ui/*` or `@/ui/sap/*`
- [ ] Follows scroll container structure
- [ ] Uses SAP design tokens (not hardcoded colors)
- [ ] `npm run ui:check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

---

## 📞 Support

### Questions?

1. Check this SOP first
2. Review reference documentation
3. Ask in #frontend-dev channel
4. Create issue with "UI SOP" label

### Reporting Violations

If you find code violating this SOP:

1. Run `npm run ui:check` to confirm
2. Create issue with "UI SOP Violation" label
3. Include file path and violation type
4. Suggest fix if possible

---

## 🔒 SOP Lock Status

**Status:** 🔒 **LOCKED**  
**Enforced by:**
- ESLint rules
- CI check script (`npm run ui:check`)
- Code review process

**Changes to this SOP require:**
- Frontend team approval
- Update to enforcement rules
- Documentation update

---

**Last Updated:** February 7, 2025  
**Maintained by:** Athens 2.0 Frontend Team  
**Version:** 1.0.0

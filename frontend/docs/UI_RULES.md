# Athens 2.0 UI Design Rules

**SAP-Python Visual System** – Enforced consistency across all pages.

---

## 10 Non-Negotiable Rules

### 1. **Canvas Background**
All protected layouts MUST use:
```tsx
<div className="min-h-screen bg-app-canvas">
```
Never use `bg-background` or `bg-white` on layout root.

### 2. **Card Styling**
All cards use rounded corners + soft shadows:
```tsx
<Card className="rounded-2xl shadow-lg">
```
For KPI/stat cards with gradients:
```tsx
<Card className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary shadow-lg">
```

### 3. **Sidebar Navigation**
- Items: `rounded-xl` (pill shape)
- Active state: `bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow`
- Inactive: `hover:bg-muted/60`
- Icons wrapped in containers:
```tsx
<span className="mr-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
  <Icon className="w-5 h-5" />
</span>
```

### 4. **Header/Top Bar**
Always translucent with backdrop blur:
```tsx
<header className="sticky top-0 z-40 bg-background/70 backdrop-blur border-b">
```

### 5. **Status Indicators**
Use pill badges with soft backgrounds:
```tsx
<span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700">
  System Online
</span>
```

### 6. **Content Width**
Main content must be centered with breathing room:
```tsx
<main className="mx-auto max-w-7xl px-6 py-6">
```

### 7. **Typography Scale**
- Use semantic tokens: `text-foreground`, `text-muted-foreground`
- Never hardcode colors like `text-gray-900`
- Desktop h1/h2 auto-scaled via CSS (no manual classes needed)

### 8. **Icon Badges**
Icons in cards need soft containers:
```tsx
<div className="rounded-xl bg-white/20 p-3 backdrop-blur">
  <Icon className="w-6 h-6 text-primary-foreground" />
</div>
```

### 9. **Color Tokens Only**
NEVER use:
- `bg-blue-500`, `text-gray-600`, etc.

ALWAYS use:
- `bg-primary`, `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`

### 10. **Spacing Consistency**
- Page wrapper: `space-y-6`
- Grid gaps: `gap-6`
- Card padding: `p-6` (standard), `p-12` (hero/empty states)

---

## Quick Reference

### ✅ Correct Pattern
```tsx
<div className="min-h-screen bg-app-canvas">
  <main className="mx-auto max-w-7xl px-6 py-6">
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-lg p-6">
        <h2 className="text-foreground">Title</h2>
        <p className="text-muted-foreground">Description</p>
      </Card>
    </div>
  </main>
</div>
```

### ❌ Wrong Pattern
```tsx
<div className="min-h-screen bg-white">
  <main className="p-4">
    <Card className="p-6">
      <h2 className="text-gray-900">Title</h2>
      <p className="text-gray-600">Description</p>
    </Card>
  </main>
</div>
```

---

## Enforcement

Before merging any UI PR:
1. Check layout uses `bg-app-canvas`
2. Verify no hardcoded colors (gray-*, blue-*, etc.)
3. Confirm cards use `rounded-2xl`
4. Test header has `backdrop-blur`
5. Validate content width constraint

**Violation = Instant reject.**

---

**Last Updated:** February 6, 2025  
**Version:** ui-parity-v1

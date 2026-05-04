# CSS Architecture - Visual Diagram

## Current State (After Neutralization)

```
┌─────────────────────────────────────────────────────────────┐
│                      src/main.tsx                           │
│                    (Application Entry)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌───────────────────────┐   ┌──────────────────────────┐
    │  SAP Design System    │   │  Athens Legacy CSS       │
    │  ✅ ACTIVE (default)  │   │  ⚠️ INACTIVE (gated)     │
    └───────────────────────┘   └──────────────────────────┘
                │                           │
                │                           │
                ▼                           ▼
    @/styles/sap/enable-sap.css    if (VITE_USE_ATHENS_STYLES)
                │                      ./index.css
                │
                ▼
    @/styles/sap/_sap-entry.css
                │
                ├─────────────────────────────────┐
                │                                 │
                ▼                                 ▼
    @/styles/sap/index.css          @/styles/sap/mobile-responsive.css
    ┌─────────────────────┐         @/styles/sap/zIndex.css
    │ @tailwind base;     │
    │ @tailwind components│
    │ @tailwind utilities │
    │                     │
    │ + SAP variables     │
    │ + SAP components    │
    │ + SAP animations    │
    └─────────────────────┘
```

---

## Legacy State (Before Neutralization)

```
┌─────────────────────────────────────────────────────────────┐
│                      src/main.tsx                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────────┐
                              │                     │
                              ▼                     ▼
                  @/styles/sap/enable-sap.css   ./index.css
                              │                     │
                              │                     │
                              ▼                     ▼
                    ┌─────────────────┐   ┌─────────────────┐
                    │ @tailwind base; │   │ @tailwind base; │
                    │ @tailwind ...   │   │ @tailwind ...   │
                    └─────────────────┘   └─────────────────┘
                              │                     │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ⚠️ CONFLICT: Duplicate
                                 Tailwind directives
                                 + CSS variable collision

┌─────────────────────────────────────────────────────────────┐
│                      src/App.tsx                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                        ./App.css
                              │
                              ▼
                    ❌ File not found
                       (dead import)
```

---

## File Status Matrix

| File Path | Status | Contains | Active |
|-----------|--------|----------|--------|
| `src/styles/sap/enable-sap.css` | ✅ Entry | Import chain | Yes |
| `src/styles/sap/_sap-entry.css` | ✅ Orchestrator | Imports | Yes |
| `src/styles/sap/index.css` | ✅ Core | @tailwind + SAP styles | Yes |
| `src/styles/sap/mobile-responsive.css` | ✅ Utility | Mobile styles | Yes |
| `src/styles/sap/zIndex.css` | ✅ Utility | Z-index system | Yes |
| `src/index.css` | ⚠️ Legacy | @tailwind + Athens styles | No (gated) |
| `src/index.athens.bak.css` | ⚠️ Backup | Athens backup | No |
| `src/styles/zIndex.css` | ⚠️ Legacy | Athens z-index | No |
| `src/styles/mobile-responsive.css` | ⚠️ Legacy | Athens mobile | No |
| `src/App.css` | ❌ Missing | N/A | No |

---

## Import Flow (Active)

```
main.tsx
  │
  └─> @/styles/sap/enable-sap.css
        │
        └─> @/styles/sap/_sap-entry.css
              │
              ├─> @/styles/sap/index.css
              │     │
              │     ├─> @tailwind base
              │     ├─> @tailwind components
              │     ├─> @tailwind utilities
              │     ├─> :root { --density, --font-base, ... }
              │     ├─> body { font-family: Inter, ... }
              │     ├─> .bg-app-canvas { ... }
              │     └─> animations, utilities, print styles
              │
              ├─> @/styles/sap/mobile-responsive.css
              │     └─> Mobile-specific utilities
              │
              └─> @/styles/sap/zIndex.css
                    └─> Z-index CSS variables
```

---

## Rollback Flow (Emergency)

```
.env.local
  │
  └─> VITE_USE_ATHENS_STYLES=true
        │
        └─> main.tsx
              │
              ├─> @/styles/sap/enable-sap.css (still active)
              │
              └─> ./index.css (now active)
                    │
                    └─> ⚠️ CONFLICT: Both stylesheets active
                        - Duplicate @tailwind directives
                        - Conflicting CSS variables
                        - Inconsistent styling
```

---

## CSS Variable Namespaces

### SAP Variables (Active)
```css
:root {
  --density: 1;
  --font-base: 16px;
  --radius: 12px;
  --shadow-strength: 1;
  --space-1, --space-2, ... --space-12
  --btn-h, --input-h, --card-pad
}
```

### Athens Variables (Inactive)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --card, --card-foreground
  --secondary, --muted, --accent
  --destructive, --border, --input, --ring
  --z-overlay, --z-sidebar, --z-modal, ...
}
```

**No collision** - Athens variables not loaded by default.

---

## Component Styling Strategy

```
Component
  │
  ├─> Tailwind Utility Classes (from SAP CSS)
  │     └─> bg-app-canvas, btn-primary, status-badge, etc.
  │
  ├─> CSS Variables (from SAP CSS)
  │     └─> var(--density), var(--space-4), etc.
  │
  └─> Inline Styles (component-specific)
        └─> Dynamic values, conditional styling
```

---

## Build Output

### CSS Bundle (Production)
```
dist/assets/index-[hash].css
  │
  ├─> Tailwind base (reset, normalize)
  ├─> Tailwind components (from SAP CSS)
  ├─> Tailwind utilities (from SAP CSS)
  ├─> SAP custom styles
  ├─> SAP animations
  └─> SAP print styles

Total: ~18KB (minified + gzipped)
```

### Without Neutralization (Hypothetical)
```
dist/assets/index-[hash].css
  │
  ├─> Tailwind base (DUPLICATE)
  ├─> Tailwind components (DUPLICATE)
  ├─> Tailwind utilities (DUPLICATE)
  ├─> SAP custom styles
  ├─> Athens custom styles (CONFLICT)
  ├─> SAP animations
  └─> Athens animations (CONFLICT)

Total: ~33KB (minified + gzipped)
Conflicts: CSS variable collisions, specificity wars
```

---

## Decision Tree

```
                    User opens app
                          │
                          ▼
              Is VITE_USE_ATHENS_STYLES=true?
                          │
                ┌─────────┴─────────┐
                │                   │
               No                  Yes
                │                   │
                ▼                   ▼
        Load SAP CSS only    Load SAP + Athens CSS
        ✅ Recommended       ⚠️ Conflicts expected
                │                   │
                ▼                   ▼
        Consistent styling   Inconsistent styling
        Single source        Duplicate directives
        Optimized bundle     Larger bundle
```

---

## Maintenance Guidelines

### Adding New Styles
1. ✅ Add to `src/styles/sap/index.css` (SAP system)
2. ❌ Do NOT add to `src/index.css` (Athens legacy)
3. ✅ Use Tailwind utilities when possible
4. ✅ Follow SAP design tokens (--density, --space-*, etc.)

### Modifying Existing Styles
1. ✅ Modify SAP CSS files only
2. ❌ Do NOT modify Athens CSS files
3. ✅ Test with `npm run build` and `npm run dev`
4. ✅ Verify mobile responsive behavior

### Removing Legacy CSS (After 30 Days)
```bash
# Safe to delete after verification period
rm src/index.css
rm src/index.athens.bak.css
rm src/styles/zIndex.css
rm src/styles/mobile-responsive.css

# Remove rollback mechanism from main.tsx
# Remove VITE_USE_ATHENS_STYLES check
```

---

**Last Updated:** February 6, 2025  
**Maintained by:** Athens 2.0 Frontend Team

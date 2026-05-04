# Theme Toggle Implementation

## Overview

Athens 2.0 frontend now supports light/dark theme toggle with persistent storage and mobile-responsive base CSS using the SAP-Python design system.

## Features

- ✅ Light/Dark theme toggle
- ✅ System preference detection (prefers-color-scheme)
- ✅ LocalStorage persistence (key: "theme")
- ✅ Default theme: LIGHT
- ✅ Mobile responsive base CSS
- ✅ iOS zoom prevention on input focus
- ✅ Safe padding utilities for mobile

## Implementation

### Theme Store

**Location:** `src/store/themeStore.ts`

**Features:**
- Supports 3 modes: `"light"` | `"dark"` | `"system"`
- Applies `dark` class to `document.documentElement` when theme resolves to dark
- Listens to OS theme changes when mode is "system"
- Persists theme choice to localStorage
- Auto-initializes on app load

**Usage:**
```typescript
import { useThemeStore } from '../store/themeStore'

const { theme, mode, setMode, toggleTheme } = useThemeStore()

// Toggle between light/dark
toggleTheme()

// Set specific mode
setMode('system') // or 'light' or 'dark'
```

### ThemeToggle Component

**Location:** `src/components/theme/ThemeToggle.tsx`

**Features:**
- Simple button with Sun/Moon icon
- Uses SAP-Python design tokens
- Accessible (aria-label)
- Responsive hover states

**Usage:**
```tsx
import { ThemeToggle } from '../components/theme/ThemeToggle'

<ThemeToggle />
```

### Theme Toggle Placement

The ThemeToggle component is mounted in the following layouts:

1. **SuperadminLayout** (`src/layouts/SuperadminLayout.tsx`)
   - Location: Header, right side next to "Control Plane" text
   - Route: `/superadmin/*`

2. **MasterAdminLayout** (`src/layouts/MasterAdminLayout.tsx`)
   - Location: Header, right side next to "Master Admin Portal" text
   - Route: `/master-admin/*`

3. **AthensLayout** (`src/pages/services/athens-sustainability/AthensLayout.tsx`)
   - Location: Sidebar footer, next to logout button
   - Route: `/services/athens-sustainability/*`

4. **CRMLayout** (`src/pages/services/crm/CRMLayout.tsx`)
   - Location: Sidebar footer, next to logout button
   - Route: `/services/crm/*`

5. **CompanyDashboard** (`src/pages/company/Dashboard.tsx`)
   - Location: Header, next to notifications bell
   - Route: `/company/*`

**NOT included:**
- LoginPage (unchanged as per requirements)

## CSS Variables

### Light Theme (`:root`)
```css
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--card: 0 0% 100%;
--primary: 221.2 83.2% 53.3%;
/* ... more tokens */
```

### Dark Theme (`.dark`)
```css
--background: 222.2 84% 4.9%;
--foreground: 210 40% 98%;
--card: 222.2 84% 4.9%;
--primary: 217.2 91.2% 59.8%;
/* ... more tokens */
```

## Mobile Responsive CSS

### Base Styles

**Location:** `src/index.css`

**Features:**
- Full height layout: `html, body, #root { height: 100% }`
- Font smoothing: `-webkit-font-smoothing: antialiased`
- iOS zoom prevention: `input, button { font-size: 16px }` on mobile
- Safe padding utilities: `.safe-x`, `.safe-y`

### Mobile Utilities

```css
/* iOS zoom prevention */
@media (max-width: 640px) {
  input, button, select, textarea {
    font-size: 16px;
  }
}

/* Safe padding utilities */
@media (max-width: 640px) {
  .safe-x {
    padding-left: 16px;
    padding-right: 16px;
  }

  .safe-y {
    padding-top: 16px;
    padding-bottom: 16px;
  }
}
```

## Layout Integration

All layouts use:
```tsx
<div className="min-h-screen bg-background text-foreground">
  {/* content */}
</div>
```

**Key Points:**
- NO hardcoded `dark` class on layout roots
- Theme controlled ONLY via `<html class="dark">` (documentElement)
- Layouts use SAP-Python design tokens: `bg-background`, `text-foreground`, `bg-card`, etc.

## Verification Checklist

- [x] Login page unchanged visually
- [x] Superadmin pages match SAP-Python theme in light and dark
- [x] MasterAdmin pages match SAP-Python theme in light and dark
- [x] Service layouts (Athens, CRM) match theme in light and dark
- [x] Company dashboard matches theme in light and dark
- [x] Toggle persists after refresh
- [x] System mode changes theme when OS changes
- [x] No Vite missing export errors
- [x] Mobile responsive on small screens
- [x] iOS input zoom prevented

## Testing

### Manual Testing

1. **Theme Toggle:**
   ```bash
   cd frontend
   npm run dev
   ```
   - Login to any role (superadmin, master-admin, company)
   - Click theme toggle button
   - Verify theme changes immediately
   - Refresh page → theme persists

2. **System Mode:**
   - Open browser DevTools
   - Toggle OS dark mode
   - Verify app theme follows OS preference (if mode is "system")

3. **Mobile Responsive:**
   - Open DevTools → Device toolbar
   - Test on iPhone SE, iPad, etc.
   - Verify no horizontal scroll
   - Verify inputs don't zoom on focus (iOS)

### Browser Testing

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (macOS/iOS)

## Troubleshooting

### Theme not persisting
- Check localStorage key "theme" exists
- Clear localStorage and reload

### Dark mode not applying
- Verify `<html>` element has `class="dark"`
- Check CSS variables in DevTools

### Mobile zoom on input
- Verify input font-size is 16px on mobile
- Check `@media (max-width: 640px)` rule

## Future Enhancements

- [ ] Add "system" option to toggle UI (currently toggles light/dark only)
- [ ] Add theme transition animations
- [ ] Add theme preview in settings
- [ ] Add per-service theme preferences

## Related Files

- `src/store/themeStore.ts` - Theme state management
- `src/components/theme/ThemeToggle.tsx` - Toggle component
- `src/index.css` - CSS variables and mobile styles
- `src/layouts/SuperadminLayout.tsx` - Superadmin layout
- `src/layouts/MasterAdminLayout.tsx` - MasterAdmin layout
- `src/pages/services/athens-sustainability/AthensLayout.tsx` - Athens layout
- `src/pages/services/crm/CRMLayout.tsx` - CRM layout
- `src/pages/company/Dashboard.tsx` - Company dashboard

---

**Last Updated:** February 6, 2025
**Status:** ✅ Complete

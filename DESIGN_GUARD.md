# Design Guard Checklist

**Purpose:** Ensure every new module/page maintains SAP-Python design composition parity.

---

## ✅ Layout Composition

### Canvas Layer
- [ ] Root layout wrapped in `bg-app-canvas`
- [ ] NO flat white backgrounds
- [ ] NO full-width content (use `max-w-7xl`)

### Sidebar (SAP-Python Exact Behavior)
- [ ] Fixed position: `fixed top-0 left-0 h-screen`
- [ ] Width: `w-64` (256px standard Tailwind)
- [ ] Border: `border-r border-border/40` (right only)
- [ ] Glass: `bg-background/70 backdrop-blur-xl`
- [ ] Shadow: `shadow-lg`
- [ ] NO rounded corners (edge-to-edge)
- [ ] NO margins (full height)
- [ ] 3-part layout: Brand Header + Navigation (scrollable) + Footer (fixed)
- [ ] Logo uses gradient text: `bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent`
- [ ] Desktop: Always visible (`lg:translate-x-0`)
- [ ] Mobile: Drawer with overlay

### Header (SAP-Python Exact Behavior)
- [ ] Sticky position: `sticky top-0`
- [ ] Full width (no margins)
- [ ] Fixed height: `h-16`
- [ ] Glass: `bg-background/70 backdrop-blur-xl`
- [ ] Border: `border-b border-border/40` (bottom only)
- [ ] NO rounded corners
- [ ] Status pills: `rounded-full bg-{color}/15 border border-{color}/20`
- [ ] Toggle button: Mobile only (`lg:hidden`)

### Navigation Items
- [ ] Active state: `bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25`
- [ ] Active indicator: Left accent bar (`absolute left-0 w-1 h-8 bg-primary-foreground rounded-r`)
- [ ] Inactive state: `text-muted-foreground hover:bg-muted/40`
- [ ] Icon container: `bg-white/20` (active) or `bg-primary/10` (inactive)
- [ ] Uses `transition-all duration-200` (not just `transition-colors`)
- [ ] Mobile: Auto-close on navigation (`onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}`)

### Mobile Behavior
- [ ] Sidebar: Drawer with `transform transition-transform`
- [ ] Overlay: `fixed inset-0 bg-black/50 lg:hidden`
- [ ] Close on overlay click
- [ ] Close on navigation
- [ ] Toggle button visible (`lg:hidden`)

### Content Area
- [ ] Fixed left margin: `lg:ml-64`
- [ ] Centered: `mx-auto max-w-7xl`
- [ ] Padding: `px-6 py-6`
- [ ] NO dynamic width changes

---

## ✅ KPI Cards

### Structure
- [ ] Uses `KPICard` component (not raw divs)
- [ ] Has gradient: `bg-gradient-to-br from-{color}/90 to-{color}`
- [ ] Has overlay: `absolute inset-0 bg-white/10`
- [ ] Has `shadow-xl` (not `shadow-lg`)
- [ ] Has `rounded-2xl` corners
- [ ] Icon wrapped in: `rounded-xl bg-white/20 backdrop-blur`

### Variants
- [ ] Primary: `from-primary/90 to-primary`
- [ ] Success: `from-emerald-500/90 to-emerald-600`
- [ ] Warning: `from-amber-500/90 to-amber-600`
- [ ] Purple: `from-purple-500/90 to-purple-600`

---

## ✅ Content Cards

### Standard Cards
- [ ] Uses `Card` component with proper padding
- [ ] Has `rounded-2xl` (not `rounded-lg`)
- [ ] Has subtle border: `border border-border/40`
- [ ] NO harsh shadows (use `shadow-sm` max)

### Data Tables
- [ ] Wrapped in Card component
- [ ] Row borders: `border-b border-border/40 last:border-0`
- [ ] Hover state: `hover:bg-muted/30`

---

## ✅ Typography & Spacing

### Headings
- [ ] Page title: `text-2xl font-bold text-foreground`
- [ ] Subtitle: `text-muted-foreground`
- [ ] Section title: `text-lg font-semibold text-foreground`

### Spacing
- [ ] Page content: `mx-auto max-w-7xl px-6 py-8`
- [ ] Section gaps: `space-y-6` or `gap-6`
- [ ] Card padding: `p-6` (default)
- [ ] NO dense layouts (breathing space required)

### Colors
- [ ] Primary text: `text-foreground`
- [ ] Secondary text: `text-muted-foreground`
- [ ] Active elements: `text-primary-foreground`
- [ ] NO pure black text (`#000`)

---

## ✅ Effects & Transitions

### Blur & Glass
- [ ] Sidebar: `backdrop-blur-xl`
- [ ] Header: `backdrop-blur-xl`
- [ ] Modals: `backdrop-blur-sm`
- [ ] Icon containers: `backdrop-blur`

### Shadows
- [ ] Sidebar: `shadow-lg`
- [ ] KPI cards: `shadow-xl`
- [ ] Standard cards: `shadow-sm`
- [ ] Active nav: `shadow-lg shadow-primary/25`

### Transitions
- [ ] Interactive elements: `transition-all duration-200`
- [ ] Hover states: `transition-colors`
- [ ] Sidebar toggle: `transition-transform duration-200`

---

## ✅ Responsive Behavior

### Breakpoints
- [ ] Mobile: Single column layouts
- [ ] Tablet (md): 2-column grids
- [ ] Desktop (lg): 4-column grids (KPIs)
- [ ] Sidebar: Hidden on mobile, toggle button visible

### Spacing
- [ ] Content padding adjusts: `px-4 md:px-6`
- [ ] Sidebar offset: `lg:pl-72` (when open)
- [ ] Header margin: `mx-6` (consistent)

---

## ❌ NEVER DO

### Forbidden Patterns
- ❌ `transform: scale()` for layout
- ❌ Flat white backgrounds (`bg-white`)
- ❌ Floating sidebars with margins (`inset-y-4 left-4`)
- ❌ Rounded sidebars (`rounded-2xl`)
- ❌ Floating headers with margins (`top-4 mx-6`)
- ❌ Rounded headers (`rounded-2xl`)
- ❌ Dynamic content padding based on sidebar state
- ❌ Pure black text
- ❌ Dense layouts without breathing space
- ❌ Cards without proper composition (gradient + overlay)
- ❌ Sharp borders (`border-border` without opacity)

### Anti-Patterns
- ❌ Mixing `Card` component with inline gradient styles
- ❌ Using `bg-card` for sidebar (use `bg-background/70`)
- ❌ Forgetting `backdrop-blur` on glass surfaces
- ❌ Using `shadow` without variant (`shadow-sm`, `shadow-lg`, etc.)
- ❌ Hardcoding colors (use CSS variables)

---

## 🎯 Component Checklist

### Before Creating New Page
1. [ ] Copy layout structure from existing page
2. [ ] Use `KPICard` for metrics
3. [ ] Use `Card` for content sections
4. [ ] Wrap content in `max-w-7xl`
5. [ ] Test on mobile, tablet, desktop
6. [ ] Verify glass effects render correctly
7. [ ] Check dark mode compatibility

### Before Committing
1. [ ] NO `transform: scale()` in code
2. [ ] NO flat backgrounds
3. [ ] All cards use proper composition
4. [ ] Sidebar is floating glass
5. [ ] Header is floating glass bar
6. [ ] Content is centered
7. [ ] Spacing feels premium (not dense)

---

## 📦 Reusable Primitives

### Available Components
- `KPICard` - Gradient metric cards with overlay
- `Card` - Standard content cards
- `ThemeToggle` - Theme switcher
- Status pills - `rounded-full bg-{color}/15 border border-{color}/20`

### Layout Wrappers
- Canvas: `min-h-screen bg-app-canvas`
- Sidebar: `fixed top-0 left-0 h-screen w-64 bg-background/70 backdrop-blur-xl border-r`
- Header: `sticky top-0 h-16 bg-background/70 backdrop-blur-xl border-b`
- Content: `lg:ml-64 mx-auto max-w-7xl px-6 py-6`
- Mobile overlay: `fixed inset-0 bg-black/50 lg:hidden`

---

## 🚀 Quick Reference

### SAP-Python Visual DNA
1. **Canvas** - Soft gradient background
2. **Glass** - Translucent surfaces with blur
3. **Depth** - Layered overlays, shadows, gradients
4. **Space** - Breathing room, centered content
5. **Glow** - Subtle shadows on active states
6. **Structure** - Fixed sidebar, sticky header, scrollable content

### Athens 2.0 Implementation
1. `bg-app-canvas` at root
2. `backdrop-blur-xl` on surfaces
3. Gradient + overlay on KPI cards
4. `max-w-7xl` for content
5. `shadow-lg shadow-primary/25` on active nav
6. Fixed sidebar (256px / w-64), sticky header, content offset

---

**Status:** ✅ Design Guard Active  
**Last Updated:** 2025-02-06  
**Enforced On:** All new modules, pages, and components

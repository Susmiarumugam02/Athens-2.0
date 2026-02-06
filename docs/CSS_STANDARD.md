# Athens 2.0 CSS Standard

## Design System: SAP-Python Unified Theme

Athens 2.0 uses a **unified SAP-Python design system** across all protected pages (Superadmin, MasterAdmin, App, Service) while maintaining the custom login page design.

---

## Architecture

### Single CSS Pipeline
- **Entry Point:** `src/main.tsx` imports only `src/index.css`
- **No Page-Specific CSS:** All pages use the same global theme
- **Tailwind Directives:** Base, components, and utilities layers

### CSS Variables (Design Tokens)
All colors use HSL-based CSS variables for light/dark mode support:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
}
```

---

## Typography

### Fonts
- **Sans-serif:** Inter (300-800 weights)
- **Monospace:** JetBrains Mono (400-600 weights)
- **Loading:** Google Fonts with preconnect optimization

### Font Sizes
- Desktop: 85% base (premium density)
- Mobile/Tablet: 100% base (default)

---

## Component Standards

### Layouts
All layouts (SuperadminLayout, MasterAdminLayout, etc.) use:
- `bg-background` for main container
- `bg-card` for sidebar/header
- `border-border` for all borders
- `text-foreground` for primary text
- `text-muted-foreground` for secondary text

### Cards
Use the Card component from `components/ui/Card.tsx`:
```tsx
<Card variant="default" padding="md">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Buttons
Use utility classes:
```tsx
className="btn btn-primary"
className="btn btn-secondary"
className="btn btn-destructive"
className="btn btn-ghost"
```

### Navigation
Active state: `bg-primary text-primary-foreground`
Hover state: `hover:bg-accent hover:text-accent-foreground`

---

## Color Usage

### Semantic Colors
- **Primary:** Brand actions, active states
- **Secondary:** Secondary actions, backgrounds
- **Destructive:** Delete, logout, errors
- **Muted:** Disabled states, placeholders
- **Accent:** Hover states, highlights

### Never Use
❌ Hardcoded colors: `bg-blue-500`, `text-gray-900`
✅ Design tokens: `bg-primary`, `text-foreground`

---

## Login Page Exception

**LoginPage.tsx is EXCLUDED from this standard.**
- Uses custom gradient backgrounds
- Custom glassmorphism effects
- Unique color palette
- Must remain untouched

---

## Build Configuration

### Tailwind Config
- Content paths: `["./index.html", "./src/**/*.{ts,tsx,js,jsx}"]`
- Dark mode: `class` strategy
- Extended theme with CSS variables

### Production Build
```bash
npm run build
npm run preview
```
Verify all design tokens are preserved in production bundle.

---

## Migration Checklist

When updating existing pages:
1. Replace `bg-white dark:bg-gray-800` → `bg-card`
2. Replace `text-gray-900 dark:text-white` → `text-foreground`
3. Replace `text-gray-600 dark:text-gray-400` → `text-muted-foreground`
4. Replace `border-gray-200 dark:border-gray-700` → `border-border`
5. Replace `bg-blue-600` → `bg-primary`
6. Replace `text-red-600` → `text-destructive`

---

## Maintenance

### Adding New Pages
1. Use existing layouts (SuperadminLayout, MasterAdminLayout)
2. Use Card component for containers
3. Use design tokens for all colors
4. Test in light and dark mode

### Updating Components
1. Never add page-specific CSS files
2. Use Tailwind utilities with design tokens
3. Add new tokens to `index.css` if needed
4. Update this document

---

**Last Updated:** 2025-02-06
**Status:** ✅ Unified across all protected pages

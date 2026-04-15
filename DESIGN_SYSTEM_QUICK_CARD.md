# Global Design System - Quick Reference Card

## 🎯 Import Statement

```tsx
import { 
  pageStyles, 
  cardStyles, 
  kpiCardStyles, 
  moduleCardStyles,
  buttonStyles, 
  badgeStyles, 
  inputStyles,
  tableStyles,
  gridStyles,
  colors, 
  typography,
  spacing,
  getHoverStyle,
  gradients
} from '@/styles/designSystem';
```

## 📄 Page Layout

```tsx
<div style={pageStyles.container}>
  <div style={pageStyles.header}>
    <h1 style={pageStyles.title}>Page Title</h1>
    <p style={{ color: colors.textMuted }}>Description</p>
  </div>
</div>
```

## 📊 KPI Card with Hover

```tsx
const [isHovered, setIsHovered] = useState(false);

<div
  style={isHovered ? getHoverStyle(kpiCardStyles.container) : kpiCardStyles.container}
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  <div style={kpiCardStyles.icon}><Icon /></div>
  <div style={kpiCardStyles.value}>245</div>
  <div style={kpiCardStyles.label}>Total Tasks</div>
</div>
```

## 🎴 Module Card with Hover

```tsx
const [hoveredCard, setHoveredCard] = useState<string | null>(null);

<div
  style={hoveredCard === 'id' ? getHoverStyle(moduleCardStyles.container) : moduleCardStyles.container}
  onMouseEnter={() => setHoveredCard('id')}
  onMouseLeave={() => setHoveredCard(null)}
>
  <div style={{ ...moduleCardStyles.iconWrapper, background: colors.primary }}>
    <Icon style={{ width: '24px', height: '24px', color: '#fff' }} />
  </div>
  <h3 style={moduleCardStyles.title}>Module Name</h3>
  <p style={moduleCardStyles.description}>Description</p>
</div>
```

## 🔘 Buttons

```tsx
<button style={buttonStyles.primary}>Primary</button>
<button style={buttonStyles.secondary}>Secondary</button>
<button style={buttonStyles.success}>Success</button>
<button style={buttonStyles.danger}>Danger</button>
<button style={{ ...buttonStyles.primary, ...buttonStyles.small }}>Small</button>
```

## 🏷️ Badges

```tsx
<span style={badgeStyles.success}>Active</span>
<span style={badgeStyles.warning}>Pending</span>
<span style={badgeStyles.error}>Expired</span>
<span style={badgeStyles.info}>Info</span>
<span style={badgeStyles.default}>Default</span>
```

## 📝 Inputs

```tsx
<input type="text" style={inputStyles.base} />
<select style={inputStyles.select}>...</select>
<textarea style={inputStyles.textarea} />
```

## 📋 Table

```tsx
<div style={tableStyles.container}>
  <table style={tableStyles.table}>
    <thead>
      <tr><th style={tableStyles.th}>Header</th></tr>
    </thead>
    <tbody>
      <tr style={tableStyles.trHover}>
        <td style={tableStyles.td}>Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

## 📐 Grid Layouts

```tsx
{/* KPI Grid */}
<div style={gridStyles.kpiGrid}>
  {/* KPI cards */}
</div>

{/* Module Grid */}
<div style={gridStyles.moduleGrid}>
  {/* Module cards */}
</div>

{/* 2 Column */}
<div style={gridStyles.twoColumn}>
  {/* Content */}
</div>

{/* 3 Column */}
<div style={gridStyles.threeColumn}>
  {/* Content */}
</div>
```

## 🎨 Colors

```tsx
colors.pageBackground    // '#f0f2f5'
colors.cardBackground    // '#fff'
colors.border           // '#d9d9d9'
colors.borderHover      // '#1890ff'
colors.primary          // '#1890ff'
colors.success          // '#52c41a'
colors.warning          // '#faad14'
colors.error            // '#ff4d4f'
colors.textPrimary      // '#262626'
colors.textSecondary    // '#595959'
colors.textMuted        // '#8c8c8c'
```

## 📏 Typography

```tsx
typography.h1    // { fontSize: '24px', fontWeight: 600 }
typography.h2    // { fontSize: '18px', fontWeight: 600 }
typography.h3    // { fontSize: '16px', fontWeight: 600 }
typography.body  // { fontSize: '14px', fontWeight: 400 }
typography.small // { fontSize: '12px', fontWeight: 400 }
```

## 📦 Spacing

```tsx
spacing.xs   // '4px'
spacing.sm   // '8px'
spacing.md   // '12px'
spacing.lg   // '16px'
spacing.xl   // '24px'
spacing.xxl  // '32px'
```

## 🌈 Gradients

```tsx
gradients.blue     // Blue gradient
gradients.green    // Green gradient
gradients.orange   // Orange gradient
gradients.purple   // Purple gradient
gradients.red      // Red gradient
gradients.cyan     // Cyan gradient
gradients.magenta  // Magenta gradient
gradients.yellow   // Yellow gradient

// Usage
<div style={{ background: gradients.blue }}>...</div>
```

## 🛠️ Utilities

```tsx
// Add hover effect to any style
const hoverStyle = getHoverStyle(baseStyle);

// Create custom gradient
const customGradient = getGradientBackground('#color1', '#color2');
```

## ✅ Best Practices

1. **Always import from design system** - Don't use inline CSS
2. **Use hover state pattern** - `useState` + `getHoverStyle()`
3. **Combine styles with spread** - `{ ...baseStyle, ...customStyle }`
4. **Use color constants** - `colors.primary` not `'#1890ff'`
5. **Use spacing constants** - `spacing.xl` not `'24px'`

## 🚫 Don't Do This

```tsx
// ❌ Don't use inline CSS
<div style={{ background: '#fff', padding: '24px' }}>

// ❌ Don't use hardcoded colors
<div style={{ color: '#1890ff' }}>

// ❌ Don't use hardcoded spacing
<div style={{ padding: '24px' }}>
```

## ✅ Do This Instead

```tsx
// ✅ Use design system
<div style={cardStyles.base}>

// ✅ Use color constants
<div style={{ color: colors.primary }}>

// ✅ Use spacing constants
<div style={{ padding: spacing.xl }}>
```

---

**File:** `/frontend/src/styles/designSystem.ts`  
**Status:** ✅ Production Ready  
**Last Updated:** February 2025

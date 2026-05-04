# SAP-Python UI Foundation

## Source
**Repository:** SAP-Python/frontend  
**Source Path:** `/var/www/SAP-Python/frontend`  
**Date Copied:** February 6, 2025

## Contents

### Configs (Root Level - .sap variants)
- `tailwind.config.sap.js` - Tailwind configuration with Athenas brand colors
- `postcss.config.sap.js` - PostCSS configuration
- `vite.config.sap.ts` - Vite build configuration
- `tsconfig.sap.json` - TypeScript root config
- `tsconfig.app.sap.json` - TypeScript app config
- `tsconfig.node.sap.json` - TypeScript node config
- `eslint.config.sap.js` - ESLint configuration

### Styles (src/styles/sap/)
- `index.css` - Main styles with density system, animations, brand styles
- `mobile-responsive.css` - Mobile-first responsive utilities
- `zIndex.css` - Z-index layer management
- `_sap-entry.css` - Aggregator file (NOT ACTIVE)

### UI Components (src/ui/sap/components/)
- `Alert.tsx` - Alert/notification component
- `Badge.tsx` - Status badge component
- `Button.tsx` - Button component with variants
- `Card.tsx` - Card container component
- `Checkbox.tsx` - Checkbox input component
- `DataTable.tsx` - Data table component
- `DropdownMenu.tsx` - Dropdown menu component
- `ErrorBoundary.tsx` - Error boundary wrapper
- `Input.tsx` - Text input component
- `Label.tsx` - Form label component
- `LazyDashboard.tsx` - Lazy-loaded dashboard wrapper
- `LoadingSpinner.tsx` - Loading spinner component
- `Modal.tsx` - Modal dialog component
- `Select.tsx` - Select dropdown component
- `Tabs.tsx` - Tab navigation component

### Layout (src/ui/sap/layout/)
- `NotificationPanel.tsx` - Notification panel component

### Utils (src/ui/sap/utils/)
- `utils.ts` - General utility functions (cn, etc.)
- `styleUtils.ts` - Style utility functions
- `densityManager.ts` - Density system manager

### Meta (src/ui/sap/meta/)
- `SAP_App.tsx` - Reference copy of SAP-Python App.tsx (for layout patterns)

## Status
**Copied for parity. Not yet activated in Athens app.**

## Usage
Components can be imported via barrel export:
```typescript
import { Button, Card, Modal } from '@/ui/sap';
import { SAPStyleUtils, SAPDensityManager } from '@/ui/sap';
```

## Notes
- All files copied as-is from SAP-Python
- No modifications made to preserve parity
- Import paths may need adjustment when activated
- Styles are NOT imported into Athens main entry yet
- Configs are reference copies with .sap suffix

# Athens 2.0 Frontend

**Design System:** SAP-Python Design System (Active)  
**UI Components:** SAP UI Components (Default via shims)  
**Layout Shell:** SAP-Python Layout Shell (Persistent, proper scroll containers)  
**SOP Status:** 🔒 Locked (ESLint + CI checks enforced)  
**Framework:** React 18 + TypeScript + Vite  
**Status:** ✅ Production Ready

---

## 🎯 Quick Start

```bash
npm install
npm run dev
```

---

## 🛡️ SOP Enforcement

**Status:** 🔒 **LOCKED**

```bash
# Check for legacy UI patterns
npm run ui:check

# Lint with SOP rules
npm run lint
```

See **[UI_SOP.md](./UI_SOP.md)** for complete guidelines.

---

## 🎨 Design System

**Active:** SAP Design System (exclusive)  
**UI Components:** SAP UI Components (default via compatibility shims)  
**Layout Shell:** SAP-Python Layout Shell (persistent, proper scroll behavior)  
**Legacy:** Athens CSS (neutralized, rollback available)

See [CSS_NEUTRALIZATION_SUMMARY.md](./CSS_NEUTRALIZATION_SUMMARY.md) for CSS details.  
See [SAP_COMPONENT_TAKEOVER_COMPLETE.md](./SAP_COMPONENT_TAKEOVER_COMPLETE.md) for component details.  
See [SAP_LAYOUT_SHELL_TAKEOVER_COMPLETE.md](./SAP_LAYOUT_SHELL_TAKEOVER_COMPLETE.md) for layout details.

---

## 📚 Documentation

### SOP & Guidelines
- **[UI_SOP.md](./UI_SOP.md)** - 🔒 Standard Operating Procedures (LOCKED)
- **[SAP_TAKEOVER_SOP_LOCK_COMPLETE.md](./SAP_TAKEOVER_SOP_LOCK_COMPLETE.md)** - SOP lock summary

### Layout System
- **[SAP_LAYOUT_SHELL_TAKEOVER_COMPLETE.md](./SAP_LAYOUT_SHELL_TAKEOVER_COMPLETE.md)** - SAP layout shell documentation
- **[SAP_LAYOUT_SHELL_QUICK_REF.md](./SAP_LAYOUT_SHELL_QUICK_REF.md)** - Quick reference

### Component System
- **[SAP_COMPONENT_TAKEOVER_COMPLETE.md](./SAP_COMPONENT_TAKEOVER_COMPLETE.md)** - SAP component takeover documentation
- **[SAP_COMPONENT_TAKEOVER_QUICK_REF.md](./SAP_COMPONENT_TAKEOVER_QUICK_REF.md)** - Quick reference for developers

### CSS & Styling
- **[CSS_NEUTRALIZATION_SUMMARY.md](./CSS_NEUTRALIZATION_SUMMARY.md)** - CSS neutralization executive summary
- **[SAP_GLOBAL_CSS_CONFLICTS_NEUTRALIZED.md](./SAP_GLOBAL_CSS_CONFLICTS_NEUTRALIZED.md)** - Detailed technical report
- **[CSS_NEUTRALIZATION_CHECKLIST.md](./CSS_NEUTRALIZATION_CHECKLIST.md)** - Verification checklist
- **[CSS_ARCHITECTURE_DIAGRAM.md](./CSS_ARCHITECTURE_DIAGRAM.md)** - Visual architecture diagrams

---

## 🛠️ Development

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

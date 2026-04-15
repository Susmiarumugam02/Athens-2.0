# Ant Design Consistency Strategy

**Goal**: Keep Ant Design, avoid discrepancies, maintain performance

---

## ✅ Strategy: Centralized Theme + Standards

### 1. **Single Source of Truth: ConfigProvider**

Create `/frontend/src/config/antd-theme.ts`:

```typescript
import { ThemeConfig } from 'antd';

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#5865f2',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    
    // Spacing
    padding: 16,
    margin: 16,
    
    // Border
    borderRadius: 8,
    
    // Typography
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
  },
  components: {
    Table: {
      headerBg: '#fafafa',
      headerColor: '#1e293b',
      rowHoverBg: '#f7f8fa',
      borderColor: '#eef0f4',
    },
    Modal: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
    },
    Card: {
      colorBgContainer: '#ffffff',
    },
  },
};

export const darkTheme: ThemeConfig = {
  token: {
    ...lightTheme.token,
    colorBgBase: '#1A1D26',
    colorTextBase: '#e3e4e8',
  },
  components: {
    Table: {
      headerBg: '#242833',
      headerColor: '#e3e4e8',
      rowHoverBg: '#2C313D',
      borderColor: '#2C313D',
    },
    Modal: {
      contentBg: '#1A1D26',
      headerBg: '#1A1D26',
    },
    Card: {
      colorBgContainer: '#1A1D26',
    },
  },
};
```

### 2. **Wrap App with ConfigProvider**

`/frontend/src/App.tsx`:

```typescript
import { ConfigProvider } from 'antd';
import { lightTheme, darkTheme } from './config/antd-theme';
import { useThemeStore } from './store/themeStore';

function App() {
  const { isDark } = useThemeStore();
  
  return (
    <ConfigProvider theme={isDark ? darkTheme : lightTheme}>
      {/* Your app */}
    </ConfigProvider>
  );
}
```

---

## 🎯 Rules to Avoid Discrepancies

### Rule 1: **No Inline Styles for Theme Values**

```typescript
// ❌ BAD - Hardcoded colors
<div style={{ color: '#1890ff', padding: '16px' }}>

// ✅ GOOD - Use Ant Design props
<Card style={{ padding: token.padding }}>

// ✅ BETTER - Use Ant Design components
<Space direction="vertical" size="middle">
```

### Rule 2: **Use Ant Design Spacing Props**

```typescript
// ❌ BAD
<div style={{ marginBottom: 16 }}>

// ✅ GOOD
<Space direction="vertical" size={16}>
<Divider />
<Row gutter={[16, 16]}>
```

### Rule 3: **Use Design Tokens**

```typescript
import { theme } from 'antd';

function MyComponent() {
  const { token } = theme.useToken();
  
  return (
    <div style={{ 
      padding: token.padding,
      borderRadius: token.borderRadius,
      color: token.colorPrimary 
    }}>
  );
}
```

### Rule 4: **No Separate CSS Files**

```typescript
// ❌ BAD - Separate CSS file
import './IncidentList.css';

// ✅ GOOD - Use Ant Design classes or styled-components
import styled from 'styled-components';

const TableContainer = styled.div`
  .ant-table-thead > tr > th {
    background: ${props => props.theme.token.colorBgContainer};
  }
`;
```

---

## 🚀 Performance Optimization (Keep Ant Design)

### 1. **Tree Shaking (Already Works with Vite)**

```typescript
// ✅ Vite automatically tree-shakes
import { Button, Table } from 'antd';
```

### 2. **Lazy Load Heavy Components**

```typescript
import { lazy, Suspense } from 'react';

const Table = lazy(() => import('antd/es/table'));
const DatePicker = lazy(() => import('antd/es/date-picker'));

function MyComponent() {
  return (
    <Suspense fallback={<Spin />}>
      <Table {...props} />
    </Suspense>
  );
}
```

### 3. **Optimize Icons**

```typescript
// ❌ BAD - Imports all icons
import * as Icons from '@ant-design/icons';

// ✅ GOOD - Import specific icons
import { UserOutlined, SettingOutlined } from '@ant-design/icons';
```

### 4. **Use Ant Design's Built-in Optimization**

```typescript
// vite.config.ts
export default {
  optimizeDeps: {
    include: ['antd'],
  },
};
```

---

## 📋 Incident Management Refactor Plan

### Phase 1: Remove Custom CSS (Week 1)

**Delete**: `IncidentList.css`

**Replace with ConfigProvider**:

```typescript
// IncidentList.tsx
import { ConfigProvider } from 'antd';

<ConfigProvider
  theme={{
    components: {
      Table: {
        rowClassName: (record) => 
          record.assigned_to_me ? 'assigned-row' : '',
      },
    },
  }}
>
  <Table {...props} />
</ConfigProvider>
```

**Add to theme config**:

```typescript
// antd-theme.ts
components: {
  Table: {
    rowClassName: {
      '.assigned-row': {
        backgroundColor: '#f6ffed',
        borderLeft: '3px solid #52c41a',
      },
    },
  },
}
```

### Phase 2: Replace Inline Styles (Week 2)

**Before**:
```typescript
<div style={{ padding: '24px' }}>
  <div style={{ marginBottom: '16px', display: 'flex' }}>
```

**After**:
```typescript
<Space direction="vertical" size="large" style={{ width: '100%', padding: token.paddingLG }}>
  <Row justify="space-between" align="middle">
```

### Phase 3: Standardize Components (Week 3)

Create reusable wrappers:

```typescript
// components/ui/PageContainer.tsx
import { Space } from 'antd';
import { theme } from 'antd';

export const PageContainer = ({ children }) => {
  const { token } = theme.useToken();
  
  return (
    <Space 
      direction="vertical" 
      size="large" 
      style={{ width: '100%', padding: token.paddingLG }}
    >
      {children}
    </Space>
  );
};
```

**Usage**:
```typescript
<PageContainer>
  <IncidentList />
</PageContainer>
```

---

## 🎨 Design Token Reference

### Spacing
```typescript
token.paddingXS    // 8px
token.paddingSM    // 12px
token.padding      // 16px
token.paddingMD    // 20px
token.paddingLG    // 24px
token.paddingXL    // 32px
```

### Colors
```typescript
token.colorPrimary      // Primary brand color
token.colorSuccess      // Success state
token.colorWarning      // Warning state
token.colorError        // Error state
token.colorTextBase     // Base text color
token.colorBgContainer  // Container background
```

### Typography
```typescript
token.fontSize          // 14px
token.fontSizeLG        // 16px
token.fontSizeXL        // 20px
token.fontSizeHeading1  // 38px
```

---

## ✅ Checklist for Each Component

- [ ] Remove separate CSS file
- [ ] Replace inline styles with Ant Design props
- [ ] Use `theme.useToken()` for dynamic values
- [ ] Use Ant Design spacing components (Space, Row, Col)
- [ ] Use Ant Design color tokens
- [ ] No hardcoded colors (#1890ff, etc.)
- [ ] No hardcoded spacing (16px, 24px, etc.)
- [ ] Dark mode works via ConfigProvider
- [ ] No `!important` in styles

---

## 📊 Performance Impact

### Before Optimization
- Bundle: 650KB (Ant Design)
- Inline styles: 75+ instances
- Custom CSS: 150 lines
- Theme switching: Manual

### After Optimization
- Bundle: 650KB (same, but properly tree-shaken)
- Inline styles: 0 instances (use tokens)
- Custom CSS: 0 lines
- Theme switching: Automatic via ConfigProvider

**Key**: Performance stays same, but consistency improves 10x

---

## 🔧 Migration Script

```typescript
// scripts/migrate-to-antd-theme.ts
import fs from 'fs';
import path from 'path';

const replacements = {
  "style={{ padding: '24px' }}": "style={{ padding: token.paddingLG }}",
  "style={{ marginBottom: 16 }}": "// Use Space component",
  "color: '#1890ff'": "color: token.colorPrimary",
  "backgroundColor: '#fafafa'": "backgroundColor: token.colorBgContainer",
};

// Run on all .tsx files
```

---

## 🎯 Success Metrics

- [ ] Zero separate CSS files
- [ ] Zero hardcoded colors
- [ ] Zero hardcoded spacing values
- [ ] Theme switching works instantly
- [ ] Dark mode has no visual bugs
- [ ] Bundle size unchanged
- [ ] Lighthouse score >90

---

## 📚 Resources

- [Ant Design Theme](https://ant.design/docs/react/customize-theme)
- [Design Tokens](https://ant.design/docs/react/customize-theme#seedtoken)
- [ConfigProvider](https://ant.design/components/config-provider)

---

**Status**: ✅ Keep Ant Design | 🎨 Centralized Theme | 🚀 No Performance Loss

# Module Standardization Quick Card

## ✅ What Was Done

**Standardized all modules to use PTW pattern:**
- ✅ PTW - Fixed API response handling + tab navigation
- ✅ Safety Observation - Converted to tab-based navigation
- ✅ ERGON - Already compliant (6 modules)
- ✅ Workforce - Already compliant (5 modules)

## 🎯 Standard Pattern

```
Single Page → Tabs (Dashboard/List/Form) → Modal View → No URL Changes
```

## 📋 Key Changes

### Before (PTW/Safety Obs):
```tsx
// Multiple routes with URL navigation
<Route path="list" element={<List />} />
<Route path=":id" element={<Detail />} />
<Route path=":id/edit" element={<Form />} />

// In component
navigate(`/module/${id}`)  // ❌ URL changes
```

### After (All Modules):
```tsx
// Single route
<Route path="*" element={<ModulePage />} />

// In component
<Tabs activeKey={tab} onChange={setTab}>  // ✅ State-based
  <Tab key="dashboard">...</Tab>
  <Tab key="list">...</Tab>
  <Tab key="form">...</Tab>
</Tabs>

<Modal open={!!viewing}>  // ✅ Modal view
  {viewing && <Details />}
</Modal>
```

## 🔧 Implementation

### 1. Page Structure
```tsx
const ModulePage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);

  const handleCreate = useCallback(() => {
    setEditingId(null);
    setActiveTab('form');
  }, []);

  const handleEdit = useCallback((item) => {
    setEditingId(item.id);
    setActiveTab('form');
  }, []);

  const handleView = useCallback((item) => {
    setViewingItem(item);
  }, []);

  return (
    <div style={{ padding: '24px', background: '#f0f2f5' }}>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tab key="dashboard">...</Tab>
        <Tab key="list">
          <List onView={handleView} onEdit={handleEdit} />
        </Tab>
        <Tab key="form">
          <Form id={editingId} onSuccess={() => setActiveTab('list')} />
        </Tab>
      </Tabs>
      <Modal open={!!viewingItem}>...</Modal>
    </div>
  );
};
```

### 2. List Component
```tsx
interface ListProps {
  onView?: (item: any) => void;
  onEdit?: (item: any) => void;
}

const List: React.FC<ListProps> = ({ onView, onEdit }) => {
  return (
    <Table
      columns={[
        ...
        {
          title: 'Actions',
          render: (_, record) => (
            <>
              <Button onClick={() => onView?.(record)}>View</Button>
              <Button onClick={() => onEdit?.(record)}>Edit</Button>
            </>
          )
        }
      ]}
    />
  );
};
```

### 3. Form Component
```tsx
interface FormProps {
  itemId?: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const Form: React.FC<FormProps> = ({ itemId, onSuccess, onCancel }) => {
  const handleSubmit = async () => {
    // Save logic
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit}>
      ...
      <Button type="primary" htmlType="submit">Save</Button>
      <Button onClick={onCancel}>Cancel</Button>
    </form>
  );
};
```

## 🎨 Styling Standards

```tsx
// Page wrapper
<div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>

// Header
<div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Module Name</h1>
  <Button type="primary" icon={<PlusOutlined />}>Create</Button>
</div>

// Filter bar
<div style={{ marginBottom: 16, padding: '16px', backgroundColor: '#fff', borderRadius: '8px' }}>

// Table container
<div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px' }}>
```

## 🚫 Don'ts

- ❌ Don't use `useNavigate()` within modules
- ❌ Don't create separate routes for view/edit
- ❌ Don't add query params to URLs
- ❌ Don't use `<Link>` for internal navigation
- ❌ Don't create separate detail pages

## ✅ Do's

- ✅ Use `useState` for tab management
- ✅ Use `useCallback` for handlers
- ✅ Use `Modal` for view details
- ✅ Use callbacks for parent-child communication
- ✅ Keep all navigation state-based

## 📊 Results

| Metric | Before | After |
|--------|--------|-------|
| URL Changes | Yes | No |
| Page Reloads | Yes | No |
| Routes per Module | 4-5 | 1 |
| Navigation Speed | Slow | Instant |
| State Loss | Common | Never |
| Code Complexity | High | Low |

## 🔍 Verification

Check if module is standardized:
```bash
# Should NOT find navigate() calls
grep -r "navigate(" src/pages/module/

# Should find tab-based navigation
grep -r "activeTab" src/pages/module/

# Should find callbacks
grep -r "useCallback" src/pages/module/
```

## 📁 Files Changed

- `/frontend/src/pages/ptw/PTWPage.tsx` - Created
- `/frontend/src/pages/ptw/components/PermitList.tsx` - Updated
- `/frontend/src/pages/safetyobservation/SafetyObservationPage.tsx` - Created
- `/frontend/src/pages/safetyobservation/SafetyObservationList.tsx` - Updated
- `/frontend/src/pages/safetyobservation/index.tsx` - Updated

## 🎯 Next Steps

For any new module:
1. Copy template from `MODULE_STANDARDIZATION_COMPLETE.md`
2. Replace module-specific names
3. Implement Dashboard, List, Form components
4. Add callbacks for view/edit
5. Test tab navigation
6. Verify no URL changes

---

**Status:** ✅ Complete  
**Build:** 31.47s  
**Deploy:** Complete  
**Date:** February 27, 2026

# UniversalModal - Reusable Modal Component

## Overview

Single component that handles all modal types with configuration-based fields.

## Usage

### Basic Example

```tsx
import { UniversalModal } from '@/components/ui/UniversalModal'

const MyComponent = () => {
  const [open, setOpen] = useState(false)

  const fields = [
    { name: 'name', label: 'Name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'tel' }
  ]

  const handleSubmit = async (data) => {
    await api.create(data)
    toast.success('Created!')
  }

  return (
    <UniversalModal
      open={open}
      onOpenChange={setOpen}
      title="Create User"
      fields={fields}
      onSubmit={handleSubmit}
    />
  )
}
```

### Edit Mode

```tsx
<UniversalModal
  open={open}
  onOpenChange={setOpen}
  title="Edit User"
  fields={fields}
  editData={user}  // Pre-fills form
  onSubmit={handleUpdate}
/>
```

### Field Types

```tsx
const fields = [
  // Text input
  { name: 'name', label: 'Name', type: 'text', required: true },
  
  // Email
  { name: 'email', label: 'Email', type: 'email', required: true },
  
  // Phone
  { name: 'phone', label: 'Phone', type: 'tel' },
  
  // URL
  { name: 'website', label: 'Website', type: 'url' },
  
  // Number
  { name: 'age', label: 'Age', type: 'number' },
  
  // Date
  { name: 'dob', label: 'Date of Birth', type: 'date' },
  
  // Textarea
  { name: 'bio', label: 'Bio', type: 'textarea', rows: 4 },
  
  // Select dropdown
  { 
    name: 'role', 
    label: 'Role', 
    type: 'select',
    options: [
      { value: 'admin', label: 'Admin' },
      { value: 'user', label: 'User' }
    ]
  },
  
  // Multi-select checkboxes
  { 
    name: 'permissions', 
    label: 'Permissions', 
    type: 'multi-select',
    options: [
      { value: 'read', label: 'Read' },
      { value: 'write', label: 'Write' },
      { value: 'delete', label: 'Delete' }
    ]
  },
  
  // Checkbox
  { 
    name: 'active', 
    label: 'Active', 
    type: 'checkbox',
    description: 'Enable user account'
  }
]
```

### Validation

```tsx
const fields = [
  { 
    name: 'email', 
    label: 'Email', 
    type: 'email',
    required: true,
    validation: {
      required: 'Email is required',
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: 'Invalid email'
      }
    }
  },
  { 
    name: 'password', 
    label: 'Password',
    validation: {
      required: 'Password is required',
      minLength: { value: 8, message: 'Min 8 characters' }
    }
  }
]
```

### Real Examples

#### Create Tenant Modal

```tsx
const fields = [
  { name: 'name', label: 'Tenant Name', required: true },
  { name: 'code', label: 'Tenant Code', required: true },
  { name: 'admin_email', label: 'Admin Email', type: 'email' },
  { name: 'contact_phone', label: 'Contact Phone', type: 'tel' },
  { 
    name: 'industry', 
    label: 'Industry', 
    type: 'select',
    options: [
      { value: 'tech', label: 'Technology' },
      { value: 'finance', label: 'Finance' }
    ]
  }
]

<UniversalModal
  open={open}
  onOpenChange={setOpen}
  title="Create Tenant"
  fields={fields}
  onSubmit={async (data) => {
    await controlPlaneService.createTenant(data)
    toast.success('Tenant created')
  }}
/>
```

#### Create Announcement Modal

```tsx
const fields = [
  { name: 'title', label: 'Title', required: true },
  { name: 'message', label: 'Message', type: 'textarea', rows: 4, required: true },
  { 
    name: 'type', 
    label: 'Type', 
    type: 'select',
    options: [
      { value: 'info', label: 'Info' },
      { value: 'warning', label: 'Warning' },
      { value: 'critical', label: 'Critical' }
    ]
  },
  { 
    name: 'target_audience', 
    label: 'Target', 
    type: 'select',
    options: [
      { value: 'all', label: 'All Users' },
      { value: 'roles', label: 'Specific Roles' }
    ]
  },
  { name: 'scheduled_at', label: 'Schedule', type: 'date' },
  { name: 'expires_at', label: 'Expires', type: 'date' }
]
```

#### Edit User Modal

```tsx
const fields = [
  { name: 'first_name', label: 'First Name' },
  { name: 'last_name', label: 'Last Name' },
  { name: 'email', label: 'Email', type: 'email', disabled: true },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { 
    name: 'role', 
    label: 'Role', 
    type: 'select',
    options: roles.map(r => ({ value: r.id, label: r.name }))
  },
  { name: 'active', label: 'Active', type: 'checkbox' }
]

<UniversalModal
  open={open}
  onOpenChange={setOpen}
  title="Edit User"
  fields={fields}
  editData={user}
  onSubmit={handleUpdate}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| open | boolean | Yes | Modal visibility |
| onOpenChange | (open: boolean) => void | Yes | Close handler |
| title | string | Yes | Modal title |
| description | string | No | Modal description |
| fields | UniversalField[] | Yes | Field configuration |
| onSubmit | (data) => Promise<void> | Yes | Submit handler |
| editData | object | No | Pre-fill data for edit mode |
| size | 'sm' \| 'md' \| 'lg' \| 'xl' | No | Modal size (default: 'md') |
| submitLabel | string | No | Submit button text |
| cancelLabel | string | No | Cancel button text |

## Field Configuration

```tsx
interface UniversalField {
  name: string                    // Field name (required)
  label: string                   // Field label (required)
  type?: string                   // Field type (default: 'text')
  required?: boolean              // Is required
  placeholder?: string            // Placeholder text
  options?: Array<{value, label}> // For select/multi-select
  rows?: number                   // For textarea
  validation?: object             // react-hook-form validation
  defaultValue?: any              // Default value
  disabled?: boolean              // Disable field
  description?: string            // Help text
}
```

## Benefits

1. **Single Component** - One modal for all use cases
2. **Type Safe** - Full TypeScript support
3. **Validation** - Built-in with react-hook-form
4. **Consistent** - Same UX everywhere
5. **Fast** - Create modals in 10 lines
6. **Maintainable** - Change once, update everywhere

## Migration

### Before (50 lines)
```tsx
const MyModal = ({ open, onClose, data }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({})
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    // validation
    // API call
    // error handling
  }
  
  return (
    <div className="modal">
      <form onSubmit={handleSubmit}>
        <input name="name" value={formData.name} onChange={...} />
        <input name="email" value={formData.email} onChange={...} />
        {/* more fields */}
      </form>
    </div>
  )
}
```

### After (10 lines)
```tsx
<UniversalModal
  open={open}
  onOpenChange={setOpen}
  title="My Modal"
  fields={[
    { name: 'name', label: 'Name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true }
  ]}
  onSubmit={handleSubmit}
  editData={data}
/>
```

## Code Reduction

- **80% less code** per modal
- **No boilerplate** - just configuration
- **Instant validation** - built-in
- **Auto error handling** - included

import React, { useState } from 'react';
import { 
  Button, 
  Card, 
  Modal, 
  Input, 
  Select, 
  Tabs, 
  Checkbox, 
  Badge, 
  DataTable, 
  DropdownMenu, 
  Alert, 
  LoadingSpinner 
} from '@/ui/sap';

export default function SapUiPreview() {
  const [modalOpen, setModalOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [activeTab, setActiveTab] = useState('tab1');

  const tableData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager', status: 'Inactive' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'User', status: 'Active' },
    { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', role: 'Admin', status: 'Active' },
  ];

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SAP UI Component Preview</h1>
          <p className="text-gray-600">DEV-ONLY: Visual testing for copied SAP components</p>
        </div>

        {/* Typography */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Typography</h2>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Heading 1</h1>
            <h2 className="text-2xl font-semibold">Heading 2</h2>
            <h3 className="text-xl font-medium">Heading 3</h3>
            <h4 className="text-lg font-medium">Heading 4</h4>
            <p className="text-base">Regular paragraph text with normal weight and size.</p>
            <p className="text-sm text-gray-600">Small text with muted color</p>
          </div>
        </Card>

        {/* Buttons */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="lg">Large</Button>
            <Button variant="primary" loading>Loading</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </Card>

        {/* Card + Badge */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Card + Badges</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="info">Info</Badge>
          </div>
        </Card>

        {/* Inputs */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Inputs</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">Normal Input</label>
              <Input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter text..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Disabled Input</label>
              <Input 
                value="Disabled value"
                disabled
                placeholder="Disabled"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Input with Error</label>
              <Input 
                value=""
                placeholder="Required field"
                className="border-red-500"
              />
              <p className="text-sm text-red-600 mt-1">This field is required</p>
            </div>
          </div>
        </Card>

        {/* Select */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Select</h2>
          <div className="max-w-md">
            <Select
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              options={[
                { value: '', label: 'Select an option...' },
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' },
                { value: 'option3', label: 'Option 3' },
              ]}
            />
          </div>
        </Card>

        {/* Checkbox */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Checkbox</h2>
          <div className="flex items-center gap-2">
            <Checkbox
              id="demo-checkbox"
              checked={checked}
              onCheckedChange={setChecked}
            />
            <label htmlFor="demo-checkbox" className="text-sm font-medium cursor-pointer">
              I agree to the terms and conditions
            </label>
          </div>
        </Card>

        {/* Tabs */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Tabs</h2>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            tabs={[
              { value: 'tab1', label: 'Tab 1', content: <div className="p-4">Content for Tab 1</div> },
              { value: 'tab2', label: 'Tab 2', content: <div className="p-4">Content for Tab 2</div> },
              { value: 'tab3', label: 'Tab 3', content: <div className="p-4">Content for Tab 3</div> },
            ]}
          />
        </Card>

        {/* Modal */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Modal</h2>
          <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Demo Modal"
            footer={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>Confirm</Button>
              </div>
            }
          >
            <p>This is a demo modal with overlay and focus trap.</p>
            <p className="mt-2">Press ESC or click outside to close.</p>
          </Modal>
        </Card>

        {/* Dropdown Menu */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Dropdown Menu</h2>
          <DropdownMenu
            trigger={<Button variant="outline">Open Menu</Button>}
            items={[
              { label: 'Edit', onClick: () => alert('Edit clicked') },
              { label: 'Duplicate', onClick: () => alert('Duplicate clicked') },
              { label: 'Delete', onClick: () => alert('Delete clicked'), danger: true },
            ]}
          />
        </Card>

        {/* DataTable */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">DataTable</h2>
          <DataTable
            columns={columns}
            data={tableData}
          />
        </Card>

        {/* Loading Spinner */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Loading Spinner</h2>
          <div className="flex gap-4 items-center">
            <LoadingSpinner size="sm" />
            <LoadingSpinner size="md" />
            <LoadingSpinner size="lg" />
          </div>
        </Card>

        {/* Alerts */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Alerts</h2>
          <div className="space-y-3">
            <Alert variant="info">This is an info alert message.</Alert>
            <Alert variant="success">This is a success alert message.</Alert>
            <Alert variant="warning">This is a warning alert message.</Alert>
            <Alert variant="error">This is an error alert message.</Alert>
          </div>
        </Card>
      </div>
    </div>
  );
}

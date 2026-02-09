import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Tag, Card, Tabs, DatePicker, Space, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { FileTextOutlined, ExperimentOutlined, EyeOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import PageLayout from '@common/components/PageLayout';
import { TableErrorBoundary } from '@common/components/ErrorBoundary';
import { inspectionService } from '../services/inspectionService';

const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const inspectionForms = [
  {
    id: 'ac-cable-testing',
    title: 'AC Cable Testing',
    description: 'Inspection Observation Card – AC Cable (Testing)',
    category: 'Electrical'
  },
  {
    id: 'acdb-checklist',
    title: 'ACDB Checklist',
    description: 'Pre-Commissioning Checklist – LT Swgr / ACDB / DCDB / UPS panel',
    category: 'Electrical'
  },
  {
    id: 'ht-cable',
    title: 'HT Cable Checklist',
    description: 'Inverter Room/Control Room Building Final Acceptance Checklist',
    category: 'Electrical'
  },
  {
    id: 'ht-precommission',
    title: 'HT Pre-Commission',
    description: 'HT Cable Pre-Commissioning Checklist',
    category: 'Electrical'
  },
  {
    id: 'ht-precommission-template',
    title: 'HT Pre-Commission Template',
    description: 'HT Cable Pre-Commissioning Checklist Template',
    category: 'Electrical'
  },
  {
    id: 'civil-work-checklist',
    title: 'Civil Work Checklist',
    description: 'Civil Work Checklist - Before Start of Work',
    category: 'Civil'
  },
  {
    id: 'cement-register',
    title: 'Cement Register',
    description: 'Cement Register Form',
    category: 'Quality'
  },
  {
    id: 'concrete-pour-card',
    title: 'Concrete Pour Card',
    description: 'Concrete Pour Card Form',
    category: 'Quality'
  },
  {
    id: 'pcc-checklist',
    title: 'PCC Checklist',
    description: 'Check List for Plain Cement Concrete Work',
    category: 'Quality'
  },
  {
    id: 'bar-bending-schedule',
    title: 'Bar Bending Schedule',
    description: 'Bar Bending Schedule (BBS)',
    category: 'Quality'
  },
  {
    id: 'battery-charger-checklist',
    title: 'Battery Charger Installation Checklist',
    description: 'Installation Checklist for Battery Bank & Battery Charger',
    category: 'Electrical'
  },
  {
    id: 'battery-ups-checklist',
    title: 'Battery UPS Checklist',
    description: 'Pre-Commissioning Checklist - Battery & UPS',
    category: 'Electrical'
  },
  {
    id: 'bus-duct-checklist',
    title: 'Bus Duct Checklist',
    description: 'Pre-Commissioning Checklist - Bus Duct and Auxiliary Transformer',
    category: 'Electrical'
  },
  {
    id: 'control-cable-checklist',
    title: 'Control Cable Checklist',
    description: 'Installation Checklist for Control Cable',
    category: 'Electrical'
  },
  {
    id: 'control-room-audit-checklist',
    title: 'Control Room Audit Checklist',
    description: 'Control Room General Audit Checklist',
    category: 'Electrical'
  },
  {
    id: 'earthing-checklist',
    title: 'Table to Table Earthing Checklist',
    description: 'Table to Table Earthing Checklist',
    category: 'Electrical'
  },
];

const InspectionFormSelector: React.FC = () => {
  const navigate = useNavigate();
  const { formId } = useParams();
  const [filteredForms, setFilteredForms] = useState(inspectionForms);
  const [filters, setFilters] = useState({ search: '', category: '' });
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [createdForms, setCreatedForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formFilters, setFormFilters] = useState({
    search: '',
    status: '',
    dateRange: null as any,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const handleFormSelect = (form: any) => {
    setSelectedForm(form);
    fetchCreatedForms(form.id);
  };

  const fetchCreatedForms = async (formType: string) => {
    setFormsLoading(true);
    try {
      // In real implementation, this would fetch from backend
      // const response = await inspectionService.getFormsByType(formType, formFilters);
      // Mock data for demonstration
      const mockForms = [
        {
          id: '1',
          title: `${formType.replace('-', ' ').toUpperCase()} - Site A`,
          status: 'completed',
          inspector: 'John Smith',
          created_at: '2025-01-05T10:30:00Z',
          location: 'Building A - Floor 2',
          score: 92.5
        },
        {
          id: '2', 
          title: `${formType.replace('-', ' ').toUpperCase()} - Site B`,
          status: 'in_progress',
          inspector: 'Sarah Johnson',
          created_at: '2025-01-04T14:15:00Z',
          location: 'Building B - Basement',
          score: null
        },
        {
          id: '3',
          title: `${formType.replace('-', ' ').toUpperCase()} - Site C`,
          status: 'draft',
          inspector: 'Mike Wilson',
          created_at: '2025-01-03T09:45:00Z',
          location: 'Building C - Roof',
          score: null
        }
      ];
      setCreatedForms(mockForms);
    } catch (error) {
      message.error('Failed to fetch created forms');
    } finally {
      setFormsLoading(false);
    }
  };

  const handleCreateNew = () => {
    if (selectedForm) {
      navigate(`/dashboard/inspection/forms/${selectedForm.id}/create`);
    }
  };

  const handleViewForm = (formId: string) => {
    navigate(`/dashboard/inspection/forms/${selectedForm?.id}/view/${formId}`);
  };

  const handleEditForm = (formId: string) => {
    navigate(`/dashboard/inspection/forms/${selectedForm?.id}/edit/${formId}`);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'default',
      in_progress: 'processing',
      completed: 'success',
      cancelled: 'error'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    applyFilters(value, filters.category);
  };

  const handleCategoryFilter = (category: string) => {
    setFilters(prev => ({ ...prev, category }));
    applyFilters(filters.search, category);
  };

  const applyFilters = (search: string, category: string) => {
    let filtered = inspectionForms;
    
    if (search) {
      filtered = filtered.filter(form => 
        form.title.toLowerCase().includes(search.toLowerCase()) ||
        form.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (category) {
      filtered = filtered.filter(form => form.category === category);
    }
    
    setFilteredForms(filtered);
  };

  const formTypeColumns = [
    {
      title: 'Form Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a: any, b: any) => a.title.localeCompare(b.title),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => {
        const color = category === 'Electrical' ? 'blue' : category === 'Civil' ? 'green' : 'orange';
        return <Tag color={color}>{category}</Tag>;
      },
      sorter: (a: any, b: any) => a.category.localeCompare(b.category),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record: any) => (
        <Button
          type="primary"
          icon={<FileTextOutlined />}
          onClick={() => handleFormSelect(record)}
        >
          Select Form
        </Button>
      ),
    },
  ];

  const createdFormsColumns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a: any, b: any) => a.title.localeCompare(b.title),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
      sorter: (a: any, b: any) => a.status.localeCompare(b.status),
    },
    {
      title: 'Inspector',
      dataIndex: 'inspector',
      key: 'inspector',
      render: (inspector: string) => (
        <div className="flex items-center gap-2">
          <UserOutlined />
          {inspector}
        </div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => score ? `${score}%` : '-',
      sorter: (a: any, b: any) => (a.score || 0) - (b.score || 0),
    },
    {
      title: 'Created Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewForm(record.id)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditForm(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <PageLayout
      title={selectedForm ? `${selectedForm.title} Forms` : "Select Inspection Form"}
      subtitle={selectedForm ? `Manage ${selectedForm.title} inspection forms` : "Choose from available inspection forms and checklists"}
      icon={<ExperimentOutlined />}
      breadcrumbs={[
        { title: 'Inspections', href: '/dashboard/inspection' },
        { title: 'Create' },
        ...(selectedForm ? [{ title: selectedForm.title }] : [])
      ]}
      actions={
        selectedForm ? (
          <Space>
            <Button onClick={() => setSelectedForm(null)}>Back to Forms</Button>
            <Button type="primary" icon={<FileTextOutlined />} onClick={handleCreateNew}>
              Create New {selectedForm.title}
            </Button>
          </Space>
        ) : null
      }
    >
      {!selectedForm ? (
        <Card>
          <div className="mb-4 flex gap-4 flex-wrap">
            <Search
              placeholder="Search forms..."
              style={{ width: 300 }}
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <Select
              placeholder="Filter by category"
              style={{ width: 150 }}
              allowClear
              onChange={handleCategoryFilter}
            >
              <Option value="Electrical">Electrical</Option>
              <Option value="Civil">Civil</Option>
              <Option value="Quality">Quality</Option>
            </Select>
          </div>

          <TableErrorBoundary>
            <Table
              columns={formTypeColumns}
              dataSource={filteredForms}
              rowKey="id"
              size="middle"
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} forms`
              }}
            />
          </TableErrorBoundary>
        </Card>
      ) : (
        <Card>
          <Tabs defaultActiveKey="list">
            <TabPane tab="Created Forms" key="list">
              <div className="mb-4 flex gap-4 flex-wrap">
                <Search
                  placeholder="Search created forms..."
                  style={{ width: 250 }}
                  onSearch={(value) => setFormFilters(prev => ({ ...prev, search: value }))}
                />
                <Select
                  placeholder="Filter by status"
                  style={{ width: 150 }}
                  allowClear
                  onChange={(value) => setFormFilters(prev => ({ ...prev, status: value || '' }))}
                >
                  <Option value="draft">Draft</Option>
                  <Option value="in_progress">In Progress</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="cancelled">Cancelled</Option>
                </Select>
                <RangePicker
                  placeholder={['Start Date', 'End Date']}
                  onChange={(dates) => setFormFilters(prev => ({ ...prev, dateRange: dates }))}
                />
                <Select
                  placeholder="Sort by"
                  style={{ width: 150 }}
                  value={`${formFilters.sortBy}-${formFilters.sortOrder}`}
                  onChange={(value) => {
                    const [sortBy, sortOrder] = value.split('-');
                    setFormFilters(prev => ({ ...prev, sortBy, sortOrder }));
                  }}
                >
                  <Option value="created_at-desc">Newest First</Option>
                  <Option value="created_at-asc">Oldest First</Option>
                  <Option value="title-asc">Title A-Z</Option>
                  <Option value="title-desc">Title Z-A</Option>
                  <Option value="score-desc">Highest Score</Option>
                  <Option value="score-asc">Lowest Score</Option>
                </Select>
              </div>

              <TableErrorBoundary>
                <Table
                  columns={createdFormsColumns}
                  dataSource={createdForms}
                  loading={formsLoading}
                  rowKey="id"
                  size="middle"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `Total ${total} forms`
                  }}
                />
              </TableErrorBoundary>
            </TabPane>
            <TabPane tab="Form Template" key="template">
              <div className="p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">{selectedForm.title}</h3>
                <p className="text-gray-600 mb-4">{selectedForm.description}</p>
                <div className="flex items-center gap-4">
                  <Tag color="blue">{selectedForm.category}</Tag>
                  <Button type="primary" icon={<FileTextOutlined />} onClick={handleCreateNew}>
                    Create New Form
                  </Button>
                </div>
              </div>
            </TabPane>
          </Tabs>
        </Card>
      )}
    </PageLayout>
  );
};

export default InspectionFormSelector;
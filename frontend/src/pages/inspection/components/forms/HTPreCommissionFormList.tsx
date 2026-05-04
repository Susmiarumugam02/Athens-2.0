import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, message, Input, Select, Row, Col } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../../services/inspectionService';
import PageLayout from '../../../../components/ui/PageLayout';
import { useAuthStore } from '../../../../store/authStore';

const { Search } = Input;
const { Option } = Select;

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  in_progress: 'processing',
  submitted: 'blue',
  completed: 'success',
  cancelled: 'error',
};

const HTPreCommissionFormList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { user } = useAuthStore();
  const usertype = (user as any)?.admin_type || (user as any)?.user_type || '';

  const fetchForms = async () => {
    setLoading(true);
    try {
      const response = await inspectionService.getHTPreCommissionForms?.();
      setForms(response?.data?.results ?? response?.data ?? []);
    } catch {
      message.error('Failed to fetch HT Pre-Commission forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchForms(); }, []);

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete Form',
      content: 'Are you sure you want to delete this form?',
      okType: 'danger',
      onOk: async () => {
        try {
          await inspectionService.deleteHTPreCommissionForm?.(id);
          message.success('Form deleted');
          fetchForms();
        } catch {
          message.error('Failed to delete form');
        }
      },
    });
  };

  const filtered = forms.filter(f => {
    const matchSearch = !search ||
      (f.project_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.location_area || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || (f.status || 'draft') === statusFilter;
    return matchSearch && matchStatus;
  });

  const canEdit = ['client', 'epc', 'contractor', 'masteradmin'].includes(usertype);

  const columns = [
    {
      title: 'Project',
      dataIndex: 'project_name',
      key: 'project_name',
      render: (v: string) => v || '—',
    },
    {
      title: 'Location / Area',
      dataIndex: 'location_area',
      key: 'location_area',
      render: (v: string) => v || '—',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: any) => {
        const st = record.status || 'draft';
        return (
          <Tag color={STATUS_COLOR[st] ?? 'default'}>
            {st.replace('_', ' ').toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Inspector',
      dataIndex: 'created_by_username',
      key: 'created_by_username',
      render: (v: string) => v || '—',
    },
    {
      title: 'Date',
      dataIndex: 'date_of_audit',
      key: 'date_of_audit',
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : '—'),
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/dashboard/inspection/forms/ht-precommission/view/${record.id}`)}
          />
          {canEdit && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dashboard/inspection/forms/ht-precommission/edit/${record.id}`)}
            />
          )}
          {canEdit && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageLayout
      title="HT Pre-Commission Forms"
      subtitle="High Tension Cable Pre-Commissioning Checklist"
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'HT Pre-Commission' },
      ]}
      actions={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/dashboard/inspection/forms/ht-precommission/create')}
        >
          Create New
        </Button>,
      ]}
    >
      <Row gutter={12} className="mb-4">
        <Col xs={24} md={12}>
          <Search
            placeholder="Search by project or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} md={6}>
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            className="w-full"
          >
            <Option value="draft">Draft</Option>
            <Option value="in_progress">In Progress</Option>
            <Option value="submitted">Submitted</Option>
            <Option value="completed">Completed</Option>
          </Select>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filtered}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true }}
        className="bg-white rounded-lg"
      />
    </PageLayout>
  );
};

export default HTPreCommissionFormList;

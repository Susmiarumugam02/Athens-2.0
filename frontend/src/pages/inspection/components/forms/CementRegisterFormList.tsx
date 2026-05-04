import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnType } from 'antd/es/table';
import PageLayout from '../../../../components/ui/PageLayout';
import { inspectionService } from '../../services/inspectionService';
import { useAuthStore } from '../../../../store/authStore';

interface CementRegisterFormData {
  id: string;
  project_name: string;
  project_location: string;
  vendor_contractor_name: string;
  last_updated_on: string;
  last_updated_by: string;
  created_at: string;
  created_by_username: string;
}

export default function CementRegisterFormList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userType = (user as any)?.admin_type || (user as any)?.user_type || '';
  const username = (user as any)?.email || '';
  const user_obj = { admin_type: userType, username };
  const [forms, setForms] = useState<CementRegisterFormData[]>([]);
  const [loading, setLoading] = useState(false);

  const canCreate = true; // All authenticated users can create
  const canEdit = (record: CementRegisterFormData) =>
    ['client', 'epc', 'contractor'].includes(userType || '') && record.created_by_username === username;
  const canDelete = (record: CementRegisterFormData) =>
    ['client', 'epc', 'contractor'].includes(userType || '') && record.created_by_username === username;

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getCementRegisterForms();
      setForms(response.data.results || []);
    } catch (error) {
      message.error('Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await inspectionService.deleteCementRegisterForm(id);
      message.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      message.error('Failed to delete form');
    }
  };

  const columns: ColumnType<CementRegisterFormData>[] = [
    {
      title: 'Project Name',
      dataIndex: 'project_name',
      key: 'project_name',
      render: (text) => text || '-'
    },
    {
      title: 'Location',
      dataIndex: 'project_location',
      key: 'project_location',
      render: (text) => text || '-'
    },
    {
      title: 'Vendor/Contractor',
      dataIndex: 'vendor_contractor_name',
      key: 'vendor_contractor_name',
      render: (text) => text || '-'
    },
    {
      title: 'Last Updated',
      dataIndex: 'last_updated_on',
      key: 'last_updated_on',
      render: (text) => text || '-'
    },
    {
      title: 'Created By',
      dataIndex: 'created_by_username',
      key: 'created_by_username',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/dashboard/inspection/forms/cement-register/view/${record.id}`)}
            title="View"
          />
          {canEdit(record) && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dashboard/inspection/forms/cement-register/edit/${record.id}`)}
              title="Edit"
            />
          )}
          {canDelete(record) && (
            <Popconfirm
              title="Are you sure you want to delete this form?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                title="Delete"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const breadcrumbs = [
    { title: 'Inspection', href: '/inspection' },
    { title: 'Cement Register Forms' }
  ];

  const headerActions = canCreate ? [
    <Button
      key="create"
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => navigate('/dashboard/inspection/forms/cement-register/create')}
    >
      New Form
    </Button>
  ] : [];

  return (
    <PageLayout
      title="Cement Register Forms"
      breadcrumbs={breadcrumbs}
      actions={headerActions}
    >
      <Table
        columns={columns}
        dataSource={forms}
        rowKey="id"
        loading={loading}
        pagination={{
          total: forms.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
        }}
      />
    </PageLayout>
  );
}
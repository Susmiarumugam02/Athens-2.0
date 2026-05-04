import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnType } from 'antd/es/table';
import PageLayout from '../../../../components/ui/PageLayout';
import { inspectionService } from '../../services/inspectionService';
import { useAuthStore } from '../../../../store/authStore';

interface ConcretePourCardFormData {
  id: string;
  project_name: string;
  project_location: string;
  date: string;
  vendor_contractor_name: string;
  location_of_pour: string;
  pour_no: string;
  created_at: string;
  created_by_username: string;
}

export default function ConcretePourCardFormList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userType = (user as any)?.admin_type || (user as any)?.user_type || '';
  const username = (user as any)?.email || '';
  const [forms, setForms] = useState<ConcretePourCardFormData[]>([]);
  const [loading, setLoading] = useState(false);

  const canCreate = true;
  const canEdit = (record: ConcretePourCardFormData) =>
    ['client', 'epc', 'contractor'].includes(userType || '') && record.created_by_username === username;
  const canDelete = (record: ConcretePourCardFormData) =>
    ['client', 'epc', 'contractor'].includes(userType || '') && record.created_by_username === username;

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getConcretePourCardForms();
      setForms(response.data.results || []);
    } catch (error) {
      message.error('Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await inspectionService.deleteConcretePourCardForm(id);
      message.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      message.error('Failed to delete form');
    }
  };

  const columns: ColumnType<ConcretePourCardFormData>[] = [
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
      title: 'Pour Location',
      dataIndex: 'location_of_pour',
      key: 'location_of_pour',
      render: (text) => text || '-'
    },
    {
      title: 'Pour No.',
      dataIndex: 'pour_no',
      key: 'pour_no',
      render: (text) => text || '-'
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => text ? new Date(text).toLocaleDateString() : '-'
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
            onClick={() => navigate(`/dashboard/inspection/forms/concrete-pour-card/view/${record.id}`)}
            title="View"
          />
          {canEdit(record) && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dashboard/inspection/forms/concrete-pour-card/edit/${record.id}`)}
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
    { title: 'Concrete Pour Card Forms' }
  ];

  const headerActions = canCreate ? [
    <Button
      key="create"
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => navigate('/dashboard/inspection/forms/concrete-pour-card/create')}
    >
      New Form
    </Button>
  ] : [];

  return (
    <PageLayout
      title="Concrete Pour Card Forms"
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
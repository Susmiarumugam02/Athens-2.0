import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../../services/inspectionService';
import PageLayout from '../../../../components/ui/PageLayout';
import { useAuthStore } from '../../../../store/authStore';

const ControlRoomAuditChecklistFormList: React.FC = () => {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const admin_type = (user as any)?.admin_type || (user as any)?.user_type || '';
  const username = (user as any)?.email || '';

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getControlRoomAuditChecklistForms();
      setForms(response.data.results || []);
    } catch (error) {
      message.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await inspectionService.deleteControlRoomAuditChecklistForm(id);
      message.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      message.error('Failed to delete form');
    }
  };

  const canEdit = (record: any) => {
    return ['client', 'epc', 'contractor'].includes(admin_type) && record.created_by_username === username;
  };

  const canDelete = (record: any) => {
    return ['client', 'epc', 'contractor'].includes(admin_type) && record.created_by_username === username;
  };

  const columns = [
    {
      title: 'Form ID',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => text.slice(0, 8),
    },
    {
      title: 'Created By',
      dataIndex: 'created_by_username',
      key: 'created_by_username',
    },
    {
      title: 'Created Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="green">Completed</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/dashboard/inspection/forms/control-room-audit-checklist/view/${record.id}`)}
          >
            View
          </Button>
          {canEdit(record) && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dashboard/inspection/forms/control-room-audit-checklist/edit/${record.id}`)}
            >
              Edit
            </Button>
          )}
          {canDelete(record) && (
            <Popconfirm
              title="Are you sure you want to delete this form?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const breadcrumbs = [
    { title: 'Inspection', href: '/inspection' },
    { title: 'Control Room Audit Checklist' }
  ];

  const canCreate = true;

  return (
    <PageLayout
      title="Control Room Audit Checklist Forms"
      breadcrumbs={breadcrumbs}
      actions={canCreate ? [
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/dashboard/inspection/forms/control-room-audit-checklist/create')}
        >
          New Form
        </Button>
      ] : []}
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
        }}
      />
    </PageLayout>
  );
};

export default ControlRoomAuditChecklistFormList;
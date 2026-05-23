import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, message, Modal } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../../services/inspectionService';
import { useAuthStore } from '../../../../store/authStore';
import PageLayout from '../../../../components/ui/PageLayout';

// Parse "status|remarks" stored in check_N fields to derive a form-level status
function deriveStatus(record: any): string {
  // If backend returns an explicit status field, use it
  if (record.status) return record.status;
  // Otherwise infer from checklist fields
  const checkKeys = Array.from({ length: 15 }, (_, i) => `check_${i}`);
  const filled = checkKeys.filter(k => record[k] && record[k] !== '|');
  if (!filled.length) return 'draft';
  const hasNotOk = checkKeys.some(k => (record[k] || '').startsWith('not_ok'));
  if (hasNotOk) return 'in_progress';
  return 'completed';
}

function deriveScore(record: any): number | null {
  const checkKeys = Array.from({ length: 15 }, (_, i) => `check_${i}`);
  const scoreable = checkKeys.filter(k => {
    const val = (record[k] || '').split('|')[0];
    return val === 'ok' || val === 'not_ok';
  });
  if (!scoreable.length) return null;
  const ok = scoreable.filter(k => (record[k] || '').startsWith('ok')).length;
  return Math.round((ok / scoreable.length) * 100);
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  in_progress: 'processing',
  submitted: 'blue',
  completed: 'success',
  cancelled: 'error',
};

const HTCableFormList: React.FC = () => {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const usertype = (user as any)?.admin_type || (user as any)?.user_type || '';
  const username = (user as any)?.email || '';

  const canCreateForm = usertype === 'epcuser';
  const canEditDelete = (form: any) => {
    const isProjectAdmin = ['client', 'epc', 'contractor'].includes(usertype || '');
    const isFormCreator = form.created_by_username === username;
    return isProjectAdmin && isFormCreator;
  };

  const fetchForms = async () => {
    setLoading(true);
    try {
      const response = await inspectionService.getHTCableForms();
      setForms(response.data.results ?? response.data ?? []);
    } catch {
      message.error('Failed to fetch forms');
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
          await inspectionService.deleteHTCableForm(id);
          message.success('Form deleted successfully');
          fetchForms();
        } catch {
          message.error('Failed to delete form');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Title',
      key: 'title',
      render: (_: any, record: any) =>
        `HT CABLE - ${record.location_area || record.project_name || '—'}`,
    },
    {
      title: 'Project',
      dataIndex: 'project_name',
      key: 'project_name',
    },
    {
      title: 'Location / Area',
      dataIndex: 'location_area',
      key: 'location_area',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: any) => {
        const st = deriveStatus(record);
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
      title: 'Score',
      key: 'score',
      render: (_: any, record: any) => {
        const s = deriveScore(record);
        if (s === null) return '—';
        const color = s >= 80 ? 'success' : s >= 50 ? 'warning' : 'error';
        return <Tag color={color}>{s}%</Tag>;
      },
    },
    {
      title: 'Date of Audit',
      dataIndex: 'date_of_audit',
      key: 'date_of_audit',
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : '—'),
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/dashboard/inspection/forms/ht-cable/view/${record.id}`)}
          />
          {canEditDelete(record) && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dashboard/inspection/forms/ht-cable/edit/${record.id}`)}
            />
          )}
          {canEditDelete(record) && (
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
      title="HT Cable Checklist Forms"
      subtitle="Inverter Room / Control Room Building Final Acceptance Checklist"
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'HT Cable Checklist' },
      ]}
      actions={
        canCreateForm
          ? [
              <Button
                key="create"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/dashboard/inspection/forms/ht-cable/create')}
              >
                Create New HT Cable Checklist
              </Button>,
            ]
          : []
      }
    >
      <Table
        columns={columns}
        dataSource={forms}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true }}
        className="bg-white rounded-lg"
      />
    </PageLayout>
  );
};

export default HTCableFormList;

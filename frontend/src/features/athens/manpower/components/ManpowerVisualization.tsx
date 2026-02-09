import React, { useEffect, useState } from 'react';
import {
  Card, Typography, Table, Space, Button, message, Tag, Alert, Popconfirm
} from 'antd';
import {
  ReloadOutlined, PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '@common/utils/axiosetup';
import PageLayout from '@common/components/PageLayout';
import useAuthStore from '@common/store/authStore';
import ManpowerView from './ManpowerView';
import ManpowerEdit from './ManpowerEdit';
import { usePermissionControl } from '../../../hooks/usePermissionControl';
import PermissionRequestModal from '../../../components/permissions/PermissionRequestModal';

const { Text } = Typography;

// Interfaces
interface ManpowerRecord {
  id: number;
  date: string;
  category: string;
  gender: string;
  count: number;
  work_type_details?: {
    id: number;
    name: string;
    color_code: string;
  };
  shift: string;
  hours_worked: number;
  overtime_hours: number;
  total_hours: number;
  attendance_status: string;
  notes?: string;
  created_by_name: string;
  created_at: string;
}

const ManpowerVisualization: React.FC = () => {
  const navigate = useNavigate();
  const { usertype, django_user_type } = useAuthStore();

  // State
  const [loading, setLoading] = useState(false);
  const [manpowerRecords, setManpowerRecords] = useState<ManpowerRecord[]>([]);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ManpowerRecord | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  // Permission control
  const { executeWithPermission, showPermissionModal, permissionRequest, closePermissionModal, onPermissionRequestSuccess } = usePermissionControl({
    onPermissionGranted: () => loadData()
  });

  // Permission check
  const canViewReports = ['clientuser', 'epcuser', 'contractoruser', 'adminuser'].includes(django_user_type || '') ||
    ['client', 'epc', 'contractor'].includes(usertype || '');

  // Load data
  useEffect(() => {
    if (canViewReports) {
      loadData();
    }
  }, [canViewReports]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('Loading manpower data...');
      
      // Directly call the individual endpoint which we know works
      const response = await api.get('/man/manpower/individual/');
      
      console.log('API Response:', {
        status: response.status,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        length: Array.isArray(response.data) ? response.data.length : 'N/A',
        firstItem: Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null
      });

      if (Array.isArray(response.data)) {
        setManpowerRecords(response.data);
        if (response.data.length > 0) {
          message.success(`Loaded ${response.data.length} manpower records`);
        } else {
          message.info('No manpower records found. Create some records using the "Add New Record" button.');
        }
      } else {
        console.error('Unexpected response format:', response.data);
        setManpowerRecords([]);
        message.warning('Received unexpected data format from server');
      }

    } catch (error: any) {
      console.error('Failed to load manpower data:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      if (error.response?.status === 401) {
        message.error('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        message.error('You do not have permission to view manpower data.');
      } else {
        message.error(`Failed to load manpower data: ${error.message}`);
      }
      setManpowerRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Action handlers
  const handleView = (record: ManpowerRecord) => {
    setSelectedRecord(record);
    setViewModalVisible(true);
  };

  const handleEdit = async (record: ManpowerRecord) => {
    if (!record.id) {
      return;
    }
    
    // For non-adminusers, open edit modal directly
    if (django_user_type !== 'adminuser') {
      setSelectedRecord(record);
      setEditModalVisible(true);
      return;
    }
    
    // For adminusers, use permission flow directly
    executeWithPermission(
      () => api.put(`/man/manpower/${record.id}/`, {}),
      'edit manpower record'
    ).then(() => {
      setSelectedRecord(record);
      setEditModalVisible(true);
    }).catch((error) => {
      if (error) {
      }
    });
  };

  const handleSaveEdit = (updatedRecord: ManpowerRecord) => {
    // Update the record in the local state
    setManpowerRecords(prev =>
      prev.map(record =>
        record.id === updatedRecord.id ? updatedRecord : record
      )
    );
    setEditModalVisible(false);
    setSelectedRecord(null);
  };

  const handleCancelEdit = () => {
    setEditModalVisible(false);
    setSelectedRecord(null);
  };

  const handleCloseView = () => {
    setViewModalVisible(false);
    setSelectedRecord(null);
  };

  const handleDelete = async (record: ManpowerRecord) => {
    if (!record.id) {
      return;
    }

    setDeleting(record.id);
    try {
      if (django_user_type === 'adminuser') {
        // Use permission flow for adminusers
        await executeWithPermission(
          () => api.delete(`/man/manpower/${record.id}/`),
          'delete manpower record'
        );
      } else {
        await api.delete(`/man/manpower/${record.id}/`);
      }
      
      message.success('Record deleted successfully');
      loadData(); // Reload the data
    } catch (error: any) {
      if (error) {
        message.error('Failed to delete record');
      }
    } finally {
      setDeleting(null);
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
      sorter: (a: ManpowerRecord, b: ManpowerRecord) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      filters: [...new Set(manpowerRecords.map(record => record.category).filter(Boolean))].map(category => ({
        text: category,
        value: category,
      })),
      onFilter: (value: any, record: ManpowerRecord) => record.category === value,
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender: string) => (
        <Tag color={gender === 'Male' ? 'blue' : gender === 'Female' ? 'pink' : 'default'}>
          {gender || '-'}
        </Tag>
      ),
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      sorter: (a: ManpowerRecord, b: ManpowerRecord) => a.count - b.count,
    },
    {
      title: 'Work Type',
      dataIndex: 'work_type_details',
      key: 'work_type',
      render: (workType: any) => workType ? (
        <Tag color={workType.color_code}>{workType.name}</Tag>
      ) : '-',
    },
    {
      title: 'Shift',
      dataIndex: 'shift',
      key: 'shift',
      render: (shift: string) => {
        if (!shift) return <Tag color="default">-</Tag>;
        return (
          <Tag color={shift === 'day' ? 'orange' : shift === 'night' ? 'purple' : 'default'}>
            {shift.charAt(0).toUpperCase() + shift.slice(1)}
          </Tag>
        );
      },
    },
    {
      title: 'Hours',
      dataIndex: 'hours_worked',
      key: 'hours_worked',
      render: (hours: number, record: ManpowerRecord) => (
        <span>
          {hours}h
          {record.overtime_hours > 0 && (
            <Text type="secondary"> (+{record.overtime_hours}h OT)</Text>
          )}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'attendance_status',
      key: 'attendance_status',
      render: (status: string) => {
        if (!status) return <Tag color="default">-</Tag>;

        const colors = {
          present: 'green',
          absent: 'red',
          late: 'orange',
          half_day: 'yellow'
        };
        return (
          <Tag color={colors[status as keyof typeof colors] || 'default'}>
            {status.replace('_', ' ').toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Created By',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 150,
      render: (_: any, record: ManpowerRecord) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            title="View Details"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Edit Record"
          />
          <Popconfirm
            title="Delete Record"
            description="Are you sure you want to delete this record?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              loading={deleting === record.id}
              danger
              title="Delete Record"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!canViewReports) {
    return (
      <PageLayout title="Access Denied">
        <Alert
          message="Permission Denied"
          description="You don't have permission to view manpower reports."
          type="error"
          showIcon
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Manpower Records"
      subtitle="View all manpower attendance records"
      actions={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/dashboard/manpower/add')}
          >
            Add New Record
          </Button>
        </Space>
      }
    >
      {/* Controls */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Text strong>Total Records: {manpowerRecords.length}</Text>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadData}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Records Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={manpowerRecords}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} records`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* View Modal */}
      <ManpowerView
        record={selectedRecord}
        open={viewModalVisible}
        onClose={handleCloseView}
      />

      {/* Edit Modal */}
      <ManpowerEdit
        record={selectedRecord}
        open={editModalVisible}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
      />
      
      {showPermissionModal && permissionRequest && (
        <PermissionRequestModal
          visible={showPermissionModal}
          onCancel={closePermissionModal}
          onSuccess={onPermissionRequestSuccess}
          permissionType={permissionRequest.permissionType}
          objectId={permissionRequest.objectId}
          contentType={permissionRequest.contentType}
          objectName={permissionRequest.objectName}
        />
      )}
    </PageLayout>
  );
};

export default ManpowerVisualization;
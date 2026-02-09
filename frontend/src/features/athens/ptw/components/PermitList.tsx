import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Input, DatePicker, Select, App, Popconfirm, Card, Typography } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined, DeleteOutlined, EditOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPermitsPaginated, deletePermit, exportPermitsExcel, bulkExportPDF, bulkExportExcel } from '../api';
import * as Types from '../types';
import useAuthStore from '../../../common/store/authStore';
import dayjs from 'dayjs';
import { usePermissionControl } from '../../../hooks/usePermissionControl';
import PermissionRequestModal from '../../../components/permissions/PermissionRequestModal';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title } = Typography;

const PermitList: React.FC = () => {
  const {message} = App.useApp();
  const [permits, setPermits] = useState<Types.Permit[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // Filters
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const usertype = useAuthStore((state) => state.usertype);
  const django_user_type = useAuthStore((state) => state.django_user_type);
  const grade = useAuthStore((state) => state.grade);
  const currentUserId = useAuthStore((state) => state.userId);
  const {
    requestPermission,
    hasPermission,
    isModalVisible,
    setIsModalVisible,
    currentRequest,
    isLoading: permissionLoading
  } = usePermissionControl();

  // Initialize filters from URL on mount
  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('page_size') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || null;
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    
    setCurrentPage(page);
    setPageSize(size);
    setSearchText(search);
    setStatusFilter(status);
    
    if (dateFrom && dateTo) {
      setDateRange([dayjs(dateFrom), dayjs(dateTo)]);
    }
  }, []);

  // Update URL when filters change
  const updateURL = (params: Record<string, any>) => {
    const newParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        newParams.set(key, String(value));
      }
    });
    setSearchParams(newParams, { replace: true });
  };

  const canCreatePermit = (): boolean => {
    if (!usertype || !django_user_type || !grade) return false;
    if (django_user_type === 'adminuser' && usertype === 'contractoruser') return true;
    if (django_user_type === 'adminuser' && (usertype === 'epcuser' || usertype === 'clientuser') && grade === 'C') return true;
    if (django_user_type === 'projectadmin') return true;
    return false;
  };

  const canDeletePermit = (permit: Types.Permit): boolean => {
    return permit.created_by === currentUserId;
  };

  const handleEditPermit = async (permit: Types.Permit) => {
    const hasEditPermission = await hasPermission(permit.id, 'edit', 'permit');
    if (hasEditPermission) {
      navigate(`/dashboard/ptw/edit/${permit.id}`);
    } else {
      await requestPermission(permit.id, 'edit', 'permit', `Edit permit: ${permit.permit_number}`);
    }
  };

  const handleDeletePermit = async (permitId: number, permitNumber: string) => {
    const hasDeletePermission = await hasPermission(permitId, 'delete', 'permit');
    if (!hasDeletePermission) {
      await requestPermission(permitId, 'delete', 'permit', `Delete permit: ${permitNumber}`);
      return;
    }

    try {
      await deletePermit(permitId);
      message.success(`Permit ${permitNumber} deleted successfully`);
      fetchPermits();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete permit');
    }
  };

  const handlePaginationChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const fetchPermits = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };

      if (searchText) params.search = searchText;
      if (statusFilter) params.status = statusFilter;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }

      // Update URL with current filters
      updateURL(params);

      const response = await getPermitsPaginated(params);
      
      setPermits(response.data.results || []);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      message.error('Failed to load permits');
      setPermits([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, statusFilter, dateRange]);

  useEffect(() => {
    fetchPermits();
  }, [currentPage, pageSize, searchText, statusFilter, dateRange]);

  const handleExportFiltered = async () => {
    try {
      const params: any = {};
      if (searchText) params.search = searchText;
      if (statusFilter) params.status = statusFilter;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await exportPermitsExcel(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `permits_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('Export completed');
    } catch (error: any) {
      message.error('Export failed');
    }
  };

  const handleBulkExport = async (format: 'pdf' | 'excel') => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select permits to export');
      return;
    }

    try {
      const permitIds = selectedRowKeys.map(k => Number(k));
      const response = format === 'pdf' 
        ? await bulkExportPDF({ permit_ids: permitIds })
        : await bulkExportExcel({ permit_ids: permitIds });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'pdf' ? 'zip' : 'xlsx';
      link.setAttribute('download', `permits_bulk_${dayjs().format('YYYYMMDD_HHmmss')}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success(`Bulk export (${format}) completed`);
    } catch (error: any) {
      message.error(`Bulk export failed`);
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending_verification', label: 'Pending Verification' },
    { value: 'verified', label: 'Verified' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'closed', label: 'Closed' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'cancelled', label: 'Cancelled' },
  ];
  
  const columns = [
    {
      title: 'Permit Number',
      dataIndex: 'permit_number',
      key: 'permit_number',
      render: (text: string, record: Types.Permit) => (
        <a onClick={() => navigate(`/dashboard/ptw/view/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'permit_type_details',
      key: 'permit_type',
      render: (type: any) => (
        <Tag color={type.color_code}>{type.name}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Types.PermitStatus) => {
        const statusColors: Record<string, string> = {
          draft: 'default',
          submitted: 'processing',
          under_review: 'warning',
          approved: 'success',
          active: 'success',
          suspended: 'warning',
          completed: 'purple',
          cancelled: 'default',
          expired: 'error',
          rejected: 'error'
        };
        return <Tag color={statusColors[status] || 'default'}>{status.replace('_', ' ').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Verifier',
      key: 'verifier',
      render: (_: any, record: Types.Permit) => 
        record.verifier_details ? 
          record.verifier_details.full_name || `${record.verifier_details.name || ''} ${record.verifier_details.surname || ''}`.trim() || record.verifier_details.username :
          '—',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Planned Start',
      dataIndex: 'planned_start_time',
      key: 'planned_start_time',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Planned End',
      dataIndex: 'planned_end_time',
      key: 'planned_end_time',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Types.Permit) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="primary"
            size="small"
            onClick={() => navigate(`/dashboard/ptw/view/${record.id}`)}
          >
            View
          </Button>
          <Button
            type="default"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/dashboard/ptw/edit/${record.id}`)}
          >
            Edit
          </Button>
          <Button
            type="default"
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => window.open(`/dashboard/ptw/print/${record.id}`, '_blank')}
          >
            Print
          </Button>
          {canDeletePermit(record) && (
            <Popconfirm
              title="Delete Permit"
              description={`Are you sure you want to delete permit ${record.permit_number}?`}
              onConfirm={() => handleDeletePermit(record.id, record.permit_number)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okType="danger"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                title="Delete Permit"
              >
                Delete
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Permits</Title>
          <Typography.Text type="secondary">View and manage all permits to work</Typography.Text>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedRowKeys.length > 0 && (
            <>
              <Button icon={<DownloadOutlined />} onClick={() => handleBulkExport('pdf')}>
                Export Selected (PDF)
              </Button>
              <Button icon={<DownloadOutlined />} onClick={() => handleBulkExport('excel')}>
                Export Selected (Excel)
              </Button>
            </>
          )}
          <Button icon={<DownloadOutlined />} onClick={handleExportFiltered}>
            Export Current View
          </Button>
          {canCreatePermit() && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/dashboard/ptw/create')}
            >
              Create New Permit
            </Button>
          )}
        </div>
      </div>
      <Card variant="borderless">
        <div style={{ marginBottom: 16, padding: '16px', backgroundColor: '#fff', borderRadius: '8px' }}>
          <Space wrap>
            <Input
              placeholder="Search permits"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
            />
            
            <Select
              placeholder="Filter by status"
              allowClear
              style={{ width: 180 }}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
            >
              {statusOptions.map(option => (
                <Option key={option.value} value={option.value}>{option.label}</Option>
              ))}
            </Select>
            
            <RangePicker 
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
            />
          </Space>
        </div>
        
        <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
          <Table
            columns={columns}
            dataSource={permits}
            rowKey="id"
            loading={loading}
            rowSelection={rowSelection}
            scroll={{ x: 'max-content', y: 'calc(100vh - 300px)' }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalCount,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} permits`,
              position: ['bottomRight'],
              onChange: handlePaginationChange,
              onShowSizeChange: handlePaginationChange,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
          />
        </div>
      </Card>
      <PermissionRequestModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        request={currentRequest}
      />
    </div>
  );
};

export default PermitList;

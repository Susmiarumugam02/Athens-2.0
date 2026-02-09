import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Space, Spin, Empty } from 'antd';
import {
  ReloadOutlined, ClockCircleOutlined, WarningOutlined,
  CheckCircleOutlined, FileTextOutlined, SafetyOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getKPIs } from '../api';

interface KPIData {
  as_of: string;
  counts: {
    total_open: number;
    draft: number;
    submitted: number;
    pending_verification: number;
    pending_approval: number;
    under_review: number;
    approved: number;
    active: number;
    suspended: number;
    completed_today: number;
    cancelled_today: number;
    expired: number;
    rejected: number;
  };
  overdue: {
    pending_verification: number;
    pending_approval: number;
    expiring_soon: number;
    isolation_pending: number;
    closeout_pending: number;
  };
  lists: {
    top_overdue: Array<{
      id: number;
      permit_number: string;
      title: string;
      status: string;
      age_hours: number;
      permit_type: { name: string; color_code: string };
      created_by?: { name: string };
    }>;
    expiring_soon: Array<{
      id: number;
      permit_number: string;
      title: string;
      status: string;
      hours_left: number;
      permit_type: { name: string; color_code: string };
    }>;
  };
}

const PTWKPIDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const response = await getKPIs();
      setKpiData(response.data);
    } catch (error) {
      console.error('Failed to fetch KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
    const interval = setInterval(fetchKPIs, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const totalOverdue = kpiData
    ? kpiData.overdue.pending_verification +
      kpiData.overdue.pending_approval +
      kpiData.overdue.isolation_pending +
      kpiData.overdue.closeout_pending
    : 0;

  const overdueColumns = [
    {
      title: 'Permit Number',
      dataIndex: 'permit_number',
      key: 'permit_number',
      render: (text: string, record: any) => (
        <a onClick={() => navigate(`/dashboard/ptw/view/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Type',
      dataIndex: 'permit_type',
      key: 'permit_type',
      render: (type: any) => (
        <Tag color={type.color_code}>{type.name}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'pending_verification' ? 'orange' : 'red'}>
          {status.replace(/_/g, ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Age (hours)',
      dataIndex: 'age_hours',
      key: 'age_hours',
      render: (hours: number) => (
        <span style={{ color: hours > 8 ? '#ff4d4f' : '#faad14' }}>
          {hours.toFixed(1)}
        </span>
      ),
      sorter: (a: any, b: any) => b.age_hours - a.age_hours,
    },
  ];

  const expiringColumns = [
    {
      title: 'Permit Number',
      dataIndex: 'permit_number',
      key: 'permit_number',
      render: (text: string, record: any) => (
        <a onClick={() => navigate(`/dashboard/ptw/view/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Type',
      dataIndex: 'permit_type',
      key: 'permit_type',
      render: (type: any) => (
        <Tag color={type.color_code}>{type.name}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color="gold">{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Hours Left',
      dataIndex: 'hours_left',
      key: 'hours_left',
      render: (hours: number) => (
        <span style={{ color: hours < 2 ? '#ff4d4f' : '#faad14' }}>
          {hours.toFixed(1)}
        </span>
      ),
      sorter: (a: any, b: any) => a.hours_left - b.hours_left,
    },
  ];

  if (loading && !kpiData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!kpiData) {
    return <Empty description="No data available" />;
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>PTW Dashboard</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchKPIs} loading={loading}>
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Total Open"
              value={kpiData.counts.total_open}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Pending Verification"
              value={kpiData.counts.pending_verification}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Pending Approval"
              value={kpiData.counts.pending_approval}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#ff7a45' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Overdue"
              value={totalOverdue}
              prefix={<WarningOutlined />}
              valueStyle={{ color: totalOverdue > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Expiring Soon"
              value={kpiData.overdue.expiring_soon}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: kpiData.overdue.expiring_soon > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Active Permits"
              value={kpiData.counts.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Isolation Pending"
              value={kpiData.overdue.isolation_pending}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: kpiData.overdue.isolation_pending > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Closeout Pending"
              value={kpiData.overdue.closeout_pending}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: kpiData.overdue.closeout_pending > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Overdue Permits Table */}
      {kpiData.lists.top_overdue.length > 0 && (
        <Card
          title={
            <Space>
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              <span>Overdue Permits</span>
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
          <Table
            dataSource={kpiData.lists.top_overdue}
            columns={overdueColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* Expiring Soon Table */}
      {kpiData.lists.expiring_soon.length > 0 && (
        <Card
          title={
            <Space>
              <ClockCircleOutlined style={{ color: '#faad14' }} />
              <span>Expiring Soon</span>
            </Space>
          }
        >
          <Table
            dataSource={kpiData.lists.expiring_soon}
            columns={expiringColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* Empty State */}
      {kpiData.lists.top_overdue.length === 0 && kpiData.lists.expiring_soon.length === 0 && (
        <Card>
          <Empty description="No overdue or expiring permits" />
        </Card>
      )}
    </div>
  );
};

export default PTWKPIDashboard;

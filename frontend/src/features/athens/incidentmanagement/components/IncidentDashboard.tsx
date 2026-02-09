import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Button,
  Space,
  Select,
  DatePicker,
  Alert,
  Spin,
} from 'antd';
import {
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  RiseOutlined,
  FileTextOutlined,
  TeamOutlined,
  CalendarOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useDashboardStats } from '../hooks/useIncidents';
import {
  SEVERITY_LEVELS,
  INCIDENT_STATUSES,
} from '../types';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface IncidentDashboardProps {
  onViewIncidents?: () => void;
}

const IncidentDashboard: React.FC<IncidentDashboardProps> = ({
  onViewIncidents,
}) => {
  const [dateRange, setDateRange] = useState<any>(null);
  
  const { stats, loading: statsLoading, refetch: refetchStats } = useDashboardStats();

  const handleRefresh = () => {
    refetchStats();
  };

  const getSeverityColor = (severity: string) => {
    const severityConfig = SEVERITY_LEVELS.find(s => s.value === severity);
    return severityConfig?.color || 'default';
  };

  const getStatusColor = (status: string) => {
    const statusConfig = INCIDENT_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'default';
  };

  // Prepare chart data
  const severityChartData = stats?.severity_distribution.map(item => ({
    type: SEVERITY_LEVELS.find(s => s.value === item.severity_level)?.label || item.severity_level,
    value: item.count,
  })) || [];

  const statusChartData = stats?.status_distribution.map(item => ({
    type: INCIDENT_STATUSES.find(s => s.value === item.status)?.label || item.status,
    value: item.count,
  })) || [];

  const monthlyTrendData = stats?.monthly_trends.map(item => ({
    month: item.month,
    incidents: item.count,
  })) || [];



  if (statsLoading) {
    return <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '50px' }} />;
  }

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <h2 style={{ margin: 0 }}>Incident Management Dashboard</h2>
          </Col>
          <Col>
            <Space>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder={['Start Date', 'End Date']}
              />
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Key Metrics */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Incidents"
              value={stats?.total_incidents || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Open Incidents"
              value={stats?.open_incidents || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Closed Incidents"
              value={stats?.closed_incidents || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Overdue Incidents"
              value={stats?.overdue_incidents || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Incidents by Severity" extra={<Button type="link" onClick={onViewIncidents}>View All</Button>}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              {severityChartData.length > 0 ? (
                <div>
                  {severityChartData.map((item, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <Tag color={getSeverityColor(item.type.toLowerCase())}>
                        {item.type}: {item.value}
                      </Tag>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert message="No data available" type="info" />
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Incidents by Status">
            <div style={{ padding: '20px', textAlign: 'center' }}>
              {statusChartData.length > 0 ? (
                <div>
                  {statusChartData.map((item, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <Tag color={getStatusColor(item.type.toLowerCase())}>
                        {item.type}: {item.value}
                      </Tag>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert message="No data available" type="info" />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Monthly Trend */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card title="Monthly Incident Trend" extra={<RiseOutlined />}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              {monthlyTrendData.length > 0 ? (
                <div>
                  {monthlyTrendData.map((item, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <Tag color="blue">
                        {item.month}: {item.incidents} incidents
                      </Tag>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert message="No trend data available" type="info" />
              )}
            </div>
          </Card>
        </Col>
      </Row>



      {/* Quick Actions */}
      <Card title="Quick Actions" style={{ marginTop: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<FileTextOutlined />} onClick={onViewIncidents}>
            View All Incidents
          </Button>

          <Button icon={<CalendarOutlined />}>
            Schedule Investigation
          </Button>
          <Button icon={<ExclamationCircleOutlined />}>
            Report New Incident
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default IncidentDashboard;

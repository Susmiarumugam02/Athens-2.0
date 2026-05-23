import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
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
  CalendarOutlined,
  ReloadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { IncidentAnalytics } from '../types';
import { useDashboardStats } from '../hooks/useIncidents';
import { incidentApi } from '../services/api';
import {
  SEVERITY_LEVELS,
  INCIDENT_STATUSES,
} from '../types';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface IncidentDashboardProps {
  onViewIncidents?: () => void;
  onCreateIncident?: () => void;
}

const IncidentDashboard: React.FC<IncidentDashboardProps> = ({
  onViewIncidents,
  onCreateIncident,
}) => {
  const [dateRange, setDateRange] = useState<any>(null);
  const [enhancedStats, setEnhancedStats] = useState<IncidentAnalytics | null>(null);
  const [loadingEnhanced, setLoadingEnhanced] = useState(false);
  const { stats, loading: statsLoading, refetch: refetchStats } = useDashboardStats();

  const handleRefresh = () => {
    refetchStats();
    setLoadingEnhanced(true);
    incidentApi
      .getAnalytics()
      .then(data => setEnhancedStats(data))
      .catch(() => {})
      .finally(() => setLoadingEnhanced(false));
  };

  useEffect(() => {
    setLoadingEnhanced(true);
    incidentApi
      .getAnalytics()
      .then(data => setEnhancedStats(data))
      .catch(() => {})
      .finally(() => setLoadingEnhanced(false));
  }, []);

  const getSeverityColor = (severity: string) => {
    const severityConfig = SEVERITY_LEVELS.find(s => s.value === severity);
    return severityConfig?.color || 'default';
  };

  const getStatusColor = (status: string) => {
    const statusConfig = INCIDENT_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'default';
  };

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

  const topDepartments = enhancedStats?.incidents_by_department?.slice(0, 4) || [];
  const topIncidentTypes = enhancedStats?.top_incident_types?.slice(0, 4) || [];
  const hazardDistribution = enhancedStats?.risk_distribution?.slice(0, 4) || [];

  if (statsLoading && loadingEnhanced) {
    return <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '50px' }} />;
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <h2 style={{ margin: 0 }}>Incident Management Dashboard</h2>
            <p style={{ margin: '4px 0 0', color: '#666' }}>Enterprise intelligence for incident reporting, risk and compliance.</p>
          </Col>
          <Col>
            <Space wrap>
              <RangePicker value={dateRange} onChange={setDateRange} placeholder={['Start Date', 'End Date']} />
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                Refresh
              </Button>
              <Button type="primary" icon={<FileTextOutlined />} onClick={onCreateIncident}>
                New Incident
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Incidents"
              value={stats?.total_incidents || 0}
              prefix={<FileTextOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Open Incidents"
              value={stats?.open_incidents || 0}
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Closed Incidents"
              value={stats?.closed_incidents || 0}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Overdue Incidents"
              value={stats?.overdue_incidents || 0}
              prefix={<WarningOutlined />}
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Card>
        </Col>
      </Row>

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

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <Card title="High-Risk Departments">
            {topDepartments.length > 0 ? (
              topDepartments.map(item => (
                <Tag key={item.department} color="volcano" style={{ marginBottom: 8 }}>
                  {item.department}: {item.count}
                </Tag>
              ))
            ) : (
              <Alert message="Analytics not available" type="warning" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Top Incident Types">
            {topIncidentTypes.length > 0 ? (
              topIncidentTypes.map(item => (
                <Tag key={item.incident_type} color="blue" style={{ marginBottom: 8 }}>
                  {item.incident_type}: {item.count}
                </Tag>
              ))
            ) : (
              <Alert message="Analytics not available" type="warning" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="AI Safety Pulse" extra={<SafetyCertificateOutlined />}>
            {hazardDistribution.length > 0 ? (
              hazardDistribution.map(item => (
                <Tag key={item.risk_level} color="gold" style={{ marginBottom: 8 }}>
                  {item.risk_level}: {item.count}
                </Tag>
              ))
            ) : (
              <p style={{ marginBottom: 0, color: '#666' }}>Live hazard intelligence not available yet.</p>
            )}
          </Card>
        </Col>
      </Row>

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

      <Card title="Quick Actions" style={{ marginTop: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<FileTextOutlined />} onClick={onViewIncidents}>
            View All Incidents
          </Button>
          <Button icon={<CalendarOutlined />}>
            Schedule Investigation
          </Button>
          <Button icon={<ExclamationCircleOutlined />} onClick={onCreateIncident}>
            Report New Incident
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default IncidentDashboard;

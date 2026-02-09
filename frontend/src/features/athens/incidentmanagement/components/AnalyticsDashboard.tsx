import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Select,
  DatePicker,
  Space,
  Typography,
  Tag,
  Spin,
  Alert,
} from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  WarningOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { IncidentAnalytics, INCIDENT_TYPES, SEVERITY_LEVELS } from '../types';
import api from '../services/api';
import RiskAssessmentMatrix from './RiskAssessmentMatrix';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Colors for charts
const COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96'];

interface AnalyticsDashboardProps {
  projectId?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ projectId }) => {
  const [analytics, setAnalytics] = useState<IncidentAnalytics | null>(null);
  const [riskMatrix, setRiskMatrix] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Load analytics data
  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsData, riskData] = await Promise.all([
        api.incidents.getAnalytics(),
        api.incidents.getRiskMatrix(),
      ]);
      setAnalytics(analyticsData);
      setRiskMatrix(riskData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [projectId, dateRange, selectedDepartment]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Alert
        message="No Data Available"
        description="Unable to load analytics data. Please try again later."
        type="warning"
        showIcon
      />
    );
  }

  // Calculate trends
  const totalIncidents = analytics.total_incidents;
  const openIncidents = analytics.open_incidents;
  const closedIncidents = analytics.closed_incidents;
  const overdueIncidents = analytics.overdue_incidents;
  const closureRate = totalIncidents > 0 ? (closedIncidents / totalIncidents) * 100 : 0;
  const overdueRate = totalIncidents > 0 ? (overdueIncidents / totalIncidents) * 100 : 0;

  return (
    <div>
      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Text strong>Filters:</Text>
          </Col>
          <Col>
            <RangePicker
              onChange={(dates) => {
                if (dates) {
                  setDateRange([dates[0]!.format('YYYY-MM-DD'), dates[1]!.format('YYYY-MM-DD')]);
                } else {
                  setDateRange(null);
                }
              }}
            />
          </Col>
          <Col>
            <Select
              style={{ width: 200 }}
              placeholder="Select Department"
              value={selectedDepartment}
              onChange={setSelectedDepartment}
            >
              <Option value="all">All Departments</Option>
              {analytics.incidents_by_department.map(dept => (
                <Option key={dept.department} value={dept.department}>
                  {dept.department} ({dept.count})
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Key Metrics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Incidents"
              value={totalIncidents}
              valueStyle={{ color: '#1890ff' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Open Incidents"
              value={openIncidents}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Closure Rate"
              value={closureRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: closureRate >= 80 ? '#52c41a' : '#faad14' }}
              prefix={closureRate >= 80 ? <RiseOutlined /> : <FallOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Cost"
              value={analytics.total_cost}
              precision={0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Performance Metrics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card title="Investigation Completion">
            <Progress
              type="circle"
              percent={Math.round(analytics.investigation_completion_rate * 100)}
              format={percent => `${percent}%`}
              strokeColor={analytics.investigation_completion_rate >= 0.8 ? '#52c41a' : '#faad14'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card title="CAPA Completion">
            <Progress
              type="circle"
              percent={Math.round(analytics.capa_completion_rate * 100)}
              format={percent => `${percent}%`}
              strokeColor={analytics.capa_completion_rate >= 0.8 ? '#52c41a' : '#faad14'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card title="Overdue Rate">
            <Progress
              type="circle"
              percent={Math.round(overdueRate)}
              format={percent => `${percent}%`}
              strokeColor={overdueRate <= 10 ? '#52c41a' : overdueRate <= 20 ? '#faad14' : '#ff4d4f'}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row 1 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Incidents by Severity">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.severity_distribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ severity_level, percentage }) => `${severity_level}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.severity_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Risk Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.risk_distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="risk_level" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Monthly Trends */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="Monthly Trends">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.monthly_trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="incidents" fill="#1890ff" name="Incidents" />
                <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#ff4d4f" name="Cost ($)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Risk Matrix */}
      {riskMatrix && (
        <Row style={{ marginBottom: 24 }}>
          <Col span={24}>
            <RiskAssessmentMatrix data={riskMatrix} />
          </Col>
        </Row>
      )}

      {/* Top Incident Types and Departments */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Top Incident Types">
            <Table
              dataSource={analytics.top_incident_types}
              columns={[
                {
                  title: 'Type',
                  dataIndex: 'incident_type',
                  key: 'incident_type',
                  render: (type: string) => {
                    const typeConfig = INCIDENT_TYPES.find(t => t.value === type);
                    return (
                      <Tag>
                        {typeConfig?.icon} {typeConfig?.label || type}
                      </Tag>
                    );
                  },
                },
                {
                  title: 'Count',
                  dataIndex: 'count',
                  key: 'count',
                },
                {
                  title: 'Percentage',
                  dataIndex: 'percentage',
                  key: 'percentage',
                  render: (percentage: number) => `${percentage.toFixed(1)}%`,
                },
              ]}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Incidents by Department">
            <Table
              dataSource={analytics.incidents_by_department}
              columns={[
                {
                  title: 'Department',
                  dataIndex: 'department',
                  key: 'department',
                },
                {
                  title: 'Count',
                  dataIndex: 'count',
                  key: 'count',
                },
                {
                  title: 'Percentage',
                  dataIndex: 'percentage',
                  key: 'percentage',
                  render: (percentage: number) => `${percentage.toFixed(1)}%`,
                },
              ]}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Key Performance Indicators */}
      <Row gutter={16}>
        <Col span={24}>
          <Card title="Key Performance Indicators">
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Average Time to Close"
                  value={analytics.average_time_to_close}
                  suffix="days"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Average Cost per Incident"
                  value={analytics.average_cost_per_incident}
                  precision={0}
                  prefix="$"
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Overdue Incidents"
                  value={overdueIncidents}
                  valueStyle={{ color: overdueIncidents > 0 ? '#ff4d4f' : '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalyticsDashboard;

import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Table, Select,
  DatePicker, Typography, Tag, Spin, Alert,
} from 'antd';
import {
  RiseOutlined, FallOutlined, WarningOutlined,
  WalletOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { INCIDENT_TYPES, SEVERITY_LEVELS } from '../types';
import RiskAssessmentMatrix from './RiskAssessmentMatrix';

interface IncidentAnalytics {
  total_incidents: number;
  open_incidents: number;
  closed_incidents: number;
  overdue_incidents: number;
  total_cost: number;
  investigation_completion_rate: number;
  capa_completion_rate: number;
  average_time_to_close: number;
  average_cost_per_incident: number;
  severity_distribution: Array<{ severity_level: string; count: number; percentage: number }>;
  risk_distribution: Array<{ risk_level: string; count: number; percentage?: number }>;
  top_incident_types: Array<{ incident_type: string; count: number; percentage: number }>;
  incidents_by_department: Array<{ department: string; count: number; percentage: number }>;
  monthly_trends: Array<{ month: string; incidents: number; cost: number }>;
}

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

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

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const mockAnalytics: IncidentAnalytics = {
        total_incidents: 156, open_incidents: 23, closed_incidents: 133,
        overdue_incidents: 5, total_cost: 245000,
        investigation_completion_rate: 0.87, capa_completion_rate: 0.92,
        average_time_to_close: 12.5, average_cost_per_incident: 1570,
        severity_distribution: [
          { severity_level: 'Critical', count: 8, percentage: 5.1 },
          { severity_level: 'High', count: 32, percentage: 20.5 },
          { severity_level: 'Medium', count: 78, percentage: 50.0 },
          { severity_level: 'Low', count: 38, percentage: 24.4 },
        ],
        risk_distribution: [
          { risk_level: 'Very High', count: 12 }, { risk_level: 'High', count: 35 },
          { risk_level: 'Medium', count: 67 }, { risk_level: 'Low', count: 42 },
        ],
        top_incident_types: [
          { incident_type: 'safety', count: 45, percentage: 28.8 },
          { incident_type: 'environmental', count: 38, percentage: 24.4 },
          { incident_type: 'quality', count: 32, percentage: 20.5 },
          { incident_type: 'security', count: 25, percentage: 16.0 },
          { incident_type: 'operational', count: 16, percentage: 10.3 },
        ],
        incidents_by_department: [
          { department: 'Operations', count: 52, percentage: 33.3 },
          { department: 'Production', count: 41, percentage: 26.3 },
          { department: 'Maintenance', count: 28, percentage: 17.9 },
          { department: 'Quality', count: 22, percentage: 14.1 },
          { department: 'Safety', count: 13, percentage: 8.3 },
        ],
        monthly_trends: [
          { month: 'Jan', incidents: 18, cost: 28500 }, { month: 'Feb', incidents: 15, cost: 23400 },
          { month: 'Mar', incidents: 22, cost: 34200 }, { month: 'Apr', incidents: 19, cost: 29800 },
          { month: 'May', incidents: 25, cost: 39100 }, { month: 'Jun', incidents: 21, cost: 32800 },
        ],
      };
      setAnalytics(mockAnalytics);
      setRiskMatrix({
        matrix_data: [[2,3,1,0,1],[4,5,3,2,1],[3,4,6,3,2],[1,2,4,5,3],[0,1,2,3,4]],
        incident_distribution: {1:5,2:8,3:12,4:15,5:18,6:10},
        risk_zones: {
          low: { range: [1,6], color: '#52c41a', label: 'Low Risk', count: 42 },
          medium: { range: [6,12], color: '#faad14', label: 'Medium Risk', count: 67 },
          high: { range: [12,25], color: '#ff4d4f', label: 'High Risk', count: 47 },
        },
      });
    } catch (error) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAnalytics(); }, [projectId, dateRange, selectedDepartment]);

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
      <Alert message="No Data Available" description="Unable to load analytics data." type="warning" showIcon />
    );
  }

  const { total_incidents, open_incidents, closed_incidents, overdue_incidents } = analytics;
  const closureRate = total_incidents > 0 ? (closed_incidents / total_incidents) * 100 : 0;
  const overdueRate = total_incidents > 0 ? (overdue_incidents / total_incidents) * 100 : 0;

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col><Text strong>Filters:</Text></Col>
          <Col>
            <RangePicker onChange={(dates) => {
              setDateRange(dates ? [dates[0]!.format('YYYY-MM-DD'), dates[1]!.format('YYYY-MM-DD')] : null);
            }} />
          </Col>
          <Col>
            <Select style={{ width: 200 }} value={selectedDepartment} onChange={setSelectedDepartment}>
              <Option value="all">All Departments</Option>
              {analytics.incidents_by_department.map(d => (
                <Option key={d.department} value={d.department}>{d.department} ({d.count})</Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Total Incidents" value={total_incidents} valueStyle={{ color: '#1890ff' }} prefix={<WarningOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Open Incidents" value={open_incidents} valueStyle={{ color: '#faad14' }} prefix={<ClockCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Closure Rate" value={closureRate} precision={1} suffix="%" valueStyle={{ color: closureRate >= 80 ? '#52c41a' : '#faad14' }}
              prefix={closureRate >= 80 ? <RiseOutlined /> : <FallOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Total Cost" value={analytics.total_cost} precision={0} valueStyle={{ color: '#ff4d4f' }} prefix={<WalletOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card title="Investigation Completion">
            <Progress type="circle" percent={Math.round(analytics.investigation_completion_rate * 100)}
              strokeColor={analytics.investigation_completion_rate >= 0.8 ? '#52c41a' : '#faad14'} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card title="CAPA Completion">
            <Progress type="circle" percent={Math.round(analytics.capa_completion_rate * 100)}
              strokeColor={analytics.capa_completion_rate >= 0.8 ? '#52c41a' : '#faad14'} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card title="Overdue Rate">
            <Progress type="circle" percent={Math.round(overdueRate)}
              strokeColor={overdueRate <= 10 ? '#52c41a' : overdueRate <= 20 ? '#faad14' : '#ff4d4f'} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Incidents by Severity">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={analytics.severity_distribution} cx="50%" cy="50%" labelLine={false}
                  label={({ severity_level, percentage }) => `${severity_level}: ${percentage}%`}
                  outerRadius={80} dataKey="count">
                  {analytics.severity_distribution.map((_, index) => (
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
                <XAxis dataKey="risk_level" /><YAxis /><Tooltip />
                <Bar dataKey="count" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="Monthly Trends">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.monthly_trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" />
                <Tooltip /><Legend />
                <Line yAxisId="left" type="monotone" dataKey="incidents" stroke="#1890ff" name="Incidents" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#ff4d4f" name="Cost ($)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {riskMatrix && (
        <Row style={{ marginBottom: 24 }}>
          <Col span={24}><RiskAssessmentMatrix data={riskMatrix} /></Col>
        </Row>
      )}

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Top Incident Types">
            <Table dataSource={analytics.top_incident_types} pagination={false} size="small"
              columns={[
                { title: 'Type', dataIndex: 'incident_type', key: 'incident_type',
                  render: (type: string) => { const t = INCIDENT_TYPES.find(x => x.value === type); return <Tag>{t?.icon} {t?.label || type}</Tag>; } },
                { title: 'Count', dataIndex: 'count', key: 'count' },
                { title: '%', dataIndex: 'percentage', key: 'percentage', render: (v: number) => `${v.toFixed(1)}%` },
              ]} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Incidents by Department">
            <Table dataSource={analytics.incidents_by_department} pagination={false} size="small"
              columns={[
                { title: 'Department', dataIndex: 'department', key: 'department' },
                { title: 'Count', dataIndex: 'count', key: 'count' },
                { title: '%', dataIndex: 'percentage', key: 'percentage', render: (v: number) => `${v.toFixed(1)}%` },
              ]} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Card title="Key Performance Indicators">
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Statistic title="Avg Time to Close" value={analytics.average_time_to_close} suffix="days" valueStyle={{ color: '#1890ff' }} />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic title="Avg Cost per Incident" value={analytics.average_cost_per_incident} precision={0} prefix="$" valueStyle={{ color: '#faad14' }} />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic title="Overdue Incidents" value={overdue_incidents} valueStyle={{ color: overdue_incidents > 0 ? '#ff4d4f' : '#52c41a' }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalyticsDashboard;

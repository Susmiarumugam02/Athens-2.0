import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Select, Tag, Button } from 'antd';
import { 
  ExperimentOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ExclamationCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import PageLayout from '@common/components/PageLayout';
import { inspectionService } from '../services/inspectionService';
import useAuthStore from '@common/store/authStore';

const { Option } = Select;

const InspectionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject } = useAuthStore();
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      totalInspections: 156,
      completedInspections: 142,
      pendingInspections: 14,
      complianceRate: 94.2,
      avgScore: 87.5,
      criticalFindings: 3
    },
    trends: {
      inspectionTrend: [
        { name: 'Mon', completed: 12, pending: 3, score: 89 },
        { name: 'Tue', completed: 15, pending: 2, score: 92 },
        { name: 'Wed', completed: 18, pending: 4, score: 87 },
        { name: 'Thu', completed: 14, pending: 1, score: 95 },
        { name: 'Fri', completed: 20, pending: 2, score: 91 },
        { name: 'Sat', completed: 8, pending: 1, score: 88 },
        { name: 'Sun', completed: 10, pending: 1, score: 90 }
      ],
      typeDistribution: [
        { name: 'Safety', value: 45, color: '#ff4d4f' },
        { name: 'Quality', value: 32, color: '#52c41a' },
        { name: 'Environmental', value: 28, color: '#1890ff' },
        { name: 'Equipment', value: 25, color: '#faad14' },
        { name: 'Electrical', value: 18, color: '#722ed1' },
        { name: 'Structural', value: 8, color: '#fa8c16' }
      ],
      complianceByType: [
        { type: 'Safety', compliant: 89, nonCompliant: 11 },
        { type: 'Quality', compliant: 95, nonCompliant: 5 },
        { type: 'Environmental', compliant: 92, nonCompliant: 8 },
        { type: 'Equipment', compliant: 88, nonCompliant: 12 },
        { type: 'Electrical', compliant: 94, nonCompliant: 6 },
        { type: 'Structural', compliant: 100, nonCompliant: 0 }
      ]
    }
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from the backend
      // const response = await inspectionService.getDashboardStats({ timeRange, project: selectedProject });
      // setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, selectedProject]);

  const getChangeColor = (value: number) => value >= 0 ? '#3f8600' : '#cf1322';
  const getChangeIcon = (value: number) => value >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />;

  return (
    <PageLayout
      title="Inspection Dashboard"
      subtitle="Monitor inspection activities, compliance rates, and performance metrics"
      icon={<ExperimentOutlined />}
      actions={
        <div className="flex gap-2">
          <Select value={timeRange} onChange={setTimeRange} style={{ width: 120 }}>
            <Option value="week">This Week</Option>
            <Option value="month">This Month</Option>
            <Option value="quarter">This Quarter</Option>
            <Option value="year">This Year</Option>
          </Select>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/dashboard/inspection/create')}
          >
            New Inspection
          </Button>
        </div>
      }
    >
      {/* KPI Cards Row */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="Total Inspections"
              value={dashboardData.kpis.totalInspections}
              prefix={<ExperimentOutlined />}
              suffix={
                <Tag color="blue" icon={getChangeIcon(8.5)}>
                  8.5%
                </Tag>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="Completed"
              value={dashboardData.kpis.completedInspections}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
              suffix={
                <Tag color="green" icon={getChangeIcon(12.3)}>
                  12.3%
                </Tag>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="Compliance Rate"
              value={dashboardData.kpis.complianceRate}
              precision={1}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: dashboardData.kpis.complianceRate >= 90 ? '#3f8600' : '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="Critical Findings"
              value={dashboardData.kpis.criticalFindings}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: dashboardData.kpis.criticalFindings > 5 ? '#cf1322' : '#3f8600' }}
              suffix={
                <Tag color={dashboardData.kpis.criticalFindings > 5 ? "red" : "green"}>
                  {dashboardData.kpis.criticalFindings > 5 ? "High" : "Low"}
                </Tag>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={16}>
          <Card title="Inspection Trends" className="h-full">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.trends.inspectionTrend}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#52c41a" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#52c41a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#faad14" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#faad14" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stackId="1"
                    stroke="#52c41a" 
                    fillOpacity={1} 
                    fill="url(#colorCompleted)" 
                    name="Completed"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pending" 
                    stackId="1"
                    stroke="#faad14" 
                    fillOpacity={1} 
                    fill="url(#colorPending)" 
                    name="Pending"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Inspection Types" className="h-full">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.trends.typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dashboardData.trends.typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {dashboardData.trends.typeDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Compliance Analysis */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Compliance Rate by Type">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.trends.complianceByType}>
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="compliant" fill="#52c41a" name="Compliant" />
                  <Bar dataKey="nonCompliant" fill="#ff4d4f" name="Non-Compliant" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Performance Metrics" className="h-full">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span>Average Score</span>
                  <span className="font-medium">{dashboardData.kpis.avgScore}%</span>
                </div>
                <Progress 
                  percent={dashboardData.kpis.avgScore} 
                  strokeColor={{
                    '0%': '#ff4d4f',
                    '50%': '#faad14',
                    '100%': '#52c41a',
                  }}
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span>Completion Rate</span>
                  <span className="font-medium">91.0%</span>
                </div>
                <Progress percent={91} status="active" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span>On-Time Completion</span>
                  <span className="font-medium">88.5%</span>
                </div>
                <Progress percent={88.5} strokeColor="#1890ff" />
              </div>
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">94.2%</div>
                  <div className="text-sm text-gray-600">Overall Compliance</div>
                  <Tag color="green" className="mt-2">Excellent</Tag>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </PageLayout>
  );
};

export default InspectionDashboard;
import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Table, Tag, DatePicker,
  Select, Button, Space, Alert, Tabs, Timeline, Badge,
  Typography, Divider, List, Avatar, Rate, Tooltip
} from 'antd';
import {
  SafetyOutlined, WarningOutlined, CheckCircleOutlined,
  ClockCircleOutlined, FileTextOutlined, TeamOutlined,
  RiseOutlined, AlertOutlined, DownloadOutlined,
  PrinterOutlined, ShareAltOutlined, FilterOutlined
} from '@ant-design/icons';
// Chart components would be imported from a charting library like @ant-design/plots
// For now, we'll use placeholder components
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

interface KPIData {
  totalPermits: number;
  activePermits: number;
  completedPermits: number;
  overduePermits: number;
  averageProcessingTime: number;
  complianceRate: number;
  incidentRate: number;
  riskScore: number;
}

interface PermitTrend {
  date: string;
  created: number;
  completed: number;
  overdue: number;
}

interface RiskAnalysis {
  category: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

const ComplianceDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedPermitType, setSelectedPermitType] = useState<string>('all');

  // Mock data - replace with API calls
  const [kpiData] = useState<KPIData>({
    totalPermits: 1247,
    activePermits: 89,
    completedPermits: 1158,
    overduePermits: 12,
    averageProcessingTime: 4.2,
    complianceRate: 96.8,
    incidentRate: 0.3,
    riskScore: 2.1
  });

  const [permitTrends] = useState<PermitTrend[]>([
    { date: '2025-01-01', created: 45, completed: 42, overdue: 3 },
    { date: '2025-01-02', created: 52, completed: 48, overdue: 4 },
    { date: '2025-01-03', created: 38, completed: 41, overdue: 2 },
    { date: '2025-01-04', created: 61, completed: 55, overdue: 6 },
    { date: '2025-01-05', created: 43, completed: 47, overdue: 1 },
    { date: '2025-01-06', created: 55, completed: 52, overdue: 3 },
    { date: '2025-01-07', created: 49, completed: 51, overdue: 2 }
  ]);

  const [riskAnalysis] = useState<RiskAnalysis[]>([
    { category: 'Electrical', count: 234, percentage: 18.8, trend: 'up' },
    { category: 'Hot Work', count: 312, percentage: 25.0, trend: 'down' },
    { category: 'Confined Space', count: 156, percentage: 12.5, trend: 'stable' },
    { category: 'Height Work', count: 289, percentage: 23.2, trend: 'up' },
    { category: 'Chemical', count: 256, percentage: 20.5, trend: 'stable' }
  ]);

  const [recentIncidents] = useState([
    {
      id: 1,
      permitNumber: 'PTW-2025-001',
      type: 'Hot Work',
      severity: 'Minor',
      date: '2025-01-06',
      description: 'Minor burn during welding operation',
      status: 'Investigated'
    },
    {
      id: 2,
      permitNumber: 'PTW-2025-045',
      type: 'Electrical',
      severity: 'Near Miss',
      date: '2025-01-05',
      description: 'Electrical arc flash near miss',
      status: 'Under Investigation'
    }
  ]);

  const [auditFindings] = useState([
    {
      id: 1,
      finding: 'Incomplete risk assessment documentation',
      severity: 'Medium',
      department: 'Maintenance',
      dueDate: '2025-01-15',
      status: 'Open'
    },
    {
      id: 2,
      finding: 'Missing PPE inspection records',
      severity: 'High',
      department: 'Operations',
      dueDate: '2025-01-12',
      status: 'In Progress'
    }
  ]);

  // Placeholder chart components
  const ChartPlaceholder = ({ title }: { title: string }) => (
    <div style={{ 
      height: 300, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      border: '1px dashed #d9d9d9',
      borderRadius: 6
    }}>
      <Text type="secondary">{title} Chart Placeholder</Text>
    </div>
  );

  const exportReport = (format: 'pdf' | 'excel') => {
    // Implementation for report export
  };

  const generateAuditReport = () => {
    // Implementation for audit report generation
  };

  return (
    <div style={{ padding: 24, backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>PTW Compliance Dashboard</Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          />
          <Select
            value={selectedDepartment}
            onChange={setSelectedDepartment}
            style={{ width: 150 }}
          >
            <Select.Option value="all">All Departments</Select.Option>
            <Select.Option value="maintenance">Maintenance</Select.Option>
            <Select.Option value="operations">Operations</Select.Option>
            <Select.Option value="construction">Construction</Select.Option>
          </Select>
          <Select
            value={selectedPermitType}
            onChange={setSelectedPermitType}
            style={{ width: 150 }}
          >
            <Select.Option value="all">All Types</Select.Option>
            <Select.Option value="hot_work">Hot Work</Select.Option>
            <Select.Option value="electrical">Electrical</Select.Option>
            <Select.Option value="confined_space">Confined Space</Select.Option>
          </Select>
          <Button type="primary" icon={<DownloadOutlined />} onClick={() => exportReport('pdf')}>
            Export PDF
          </Button>
          <Button icon={<PrinterOutlined />} onClick={() => exportReport('excel')}>
            Export Excel
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Permits"
              value={kpiData.totalPermits}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Permits"
              value={kpiData.activePermits}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Compliance Rate"
              value={kpiData.complianceRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress percent={kpiData.complianceRate} showInfo={false} strokeColor="#52c41a" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Overdue Permits"
              value={kpiData.overduePermits}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
            {kpiData.overduePermits > 10 && (
              <Alert message="High overdue count" type="warning" showIcon />
            )}
          </Card>
        </Col>
      </Row>

      {/* Secondary KPIs */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg Processing Time"
              value={kpiData.averageProcessingTime}
              suffix="hours"
              precision={1}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Incident Rate"
              value={kpiData.incidentRate}
              suffix="%"
              precision={1}
              valueStyle={{ color: kpiData.incidentRate > 1 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Risk Score"
              value={kpiData.riskScore}
              suffix="/5"
              precision={1}
              valueStyle={{ color: kpiData.riskScore > 3 ? '#ff4d4f' : '#52c41a' }}
            />
            <Rate disabled value={kpiData.riskScore} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed Today"
              value={42}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Tabs defaultActiveKey="1">
        <TabPane tab="Trends & Analytics" key="1">
          <Row gutter={16}>
            <Col span={16}>
              <Card title="Permit Trends" extra={<Button icon={<RiseOutlined />}>View Details</Button>}>
                <ChartPlaceholder title="Permit Trends" />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="Risk Distribution">
                <ChartPlaceholder title="Risk Distribution" />
              </Card>
            </Col>
          </Row>
          
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="Compliance Rate Trend">
                <ChartPlaceholder title="Compliance Rate Trend" />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Risk Analysis" key="2">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Risk Categories">
                <Table
                  dataSource={riskAnalysis}
                  columns={[
                    { title: 'Category', dataIndex: 'category', key: 'category' },
                    { title: 'Count', dataIndex: 'count', key: 'count' },
                    { title: 'Percentage', dataIndex: 'percentage', key: 'percentage', render: (val) => `${val}%` },
                    { 
                      title: 'Trend', 
                      dataIndex: 'trend', 
                      key: 'trend',
                      render: (trend) => (
                        <Tag color={trend === 'up' ? 'red' : trend === 'down' ? 'green' : 'blue'}>
                          {trend.toUpperCase()}
                        </Tag>
                      )
                    }
                  ]}
                  pagination={false}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Recent Incidents">
                <List
                  dataSource={recentIncidents}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<AlertOutlined />} style={{ backgroundColor: '#ff4d4f' }} />}
                        title={`${item.permitNumber} - ${item.type}`}
                        description={
                          <div>
                            <div>{item.description}</div>
                            <Space>
                              <Tag color={item.severity === 'Minor' ? 'orange' : 'red'}>{item.severity}</Tag>
                              <Text type="secondary">{item.date}</Text>
                              <Badge status={item.status === 'Investigated' ? 'success' : 'processing'} text={item.status} />
                            </Space>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Audit & Compliance" key="3">
          <Row gutter={16}>
            <Col span={24}>
              <Card 
                title="Audit Findings" 
                extra={
                  <Button type="primary" onClick={generateAuditReport}>
                    Generate Audit Report
                  </Button>
                }
              >
                <Table
                  dataSource={auditFindings}
                  columns={[
                    { title: 'Finding', dataIndex: 'finding', key: 'finding' },
                    { 
                      title: 'Severity', 
                      dataIndex: 'severity', 
                      key: 'severity',
                      render: (severity) => (
                        <Tag color={severity === 'High' ? 'red' : severity === 'Medium' ? 'orange' : 'green'}>
                          {severity}
                        </Tag>
                      )
                    },
                    { title: 'Department', dataIndex: 'department', key: 'department' },
                    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate' },
                    { 
                      title: 'Status', 
                      dataIndex: 'status', 
                      key: 'status',
                      render: (status) => (
                        <Badge 
                          status={status === 'Open' ? 'error' : status === 'In Progress' ? 'processing' : 'success'} 
                          text={status} 
                        />
                      )
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Card title="Compliance Timeline">
                <Timeline>
                  <Timeline.Item color="green">
                    <p>Q4 2024 Audit Completed</p>
                    <p style={{ color: '#999' }}>December 15, 2024</p>
                  </Timeline.Item>
                  <Timeline.Item color="blue">
                    <p>Safety Training Updated</p>
                    <p style={{ color: '#999' }}>January 3, 2025</p>
                  </Timeline.Item>
                  <Timeline.Item color="red">
                    <p>Non-compliance Issue Identified</p>
                    <p style={{ color: '#999' }}>January 5, 2025</p>
                  </Timeline.Item>
                  <Timeline.Item>
                    <p>Corrective Actions Due</p>
                    <p style={{ color: '#999' }}>January 15, 2025</p>
                  </Timeline.Item>
                </Timeline>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Compliance Metrics">
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Documentation Completeness</Text>
                  <Progress percent={94} status="active" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Training Compliance</Text>
                  <Progress percent={87} status="active" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Audit Readiness</Text>
                  <Progress percent={91} status="active" />
                </div>
                <div>
                  <Text strong>Regulatory Compliance</Text>
                  <Progress percent={98} status="active" />
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Performance Metrics" key="4">
          <Row gutter={16}>
            <Col span={8}>
              <Card title="Department Performance">
                <List
                  dataSource={[
                    { name: 'Maintenance', score: 94, permits: 234 },
                    { name: 'Operations', score: 87, permits: 189 },
                    { name: 'Construction', score: 91, permits: 156 },
                    { name: 'Utilities', score: 96, permits: 98 }
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text strong>{item.name}</Text>
                          <Text>{item.score}%</Text>
                        </div>
                        <Progress percent={item.score} showInfo={false} size="small" />
                        <Text type="secondary">{item.permits} permits</Text>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="Processing Time Analysis">
                <div style={{ marginBottom: 16 }}>
                  <Text>Average: 4.2 hours</Text>
                  <Progress percent={75} showInfo={false} strokeColor="#52c41a" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>Fastest: 1.5 hours</Text>
                  <Progress percent={100} showInfo={false} strokeColor="#1890ff" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>Slowest: 12.3 hours</Text>
                  <Progress percent={25} showInfo={false} strokeColor="#ff4d4f" />
                </div>
                <div>
                  <Text>Target: &lt; 6 hours</Text>
                  <Progress percent={85} showInfo={false} strokeColor="#faad14" />
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="Quality Indicators">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text>Risk Assessment Quality</Text>
                    <Rate disabled value={4.2} allowHalf />
                  </div>
                  <div>
                    <Text>Documentation Quality</Text>
                    <Rate disabled value={3.8} allowHalf />
                  </div>
                  <div>
                    <Text>Approval Process</Text>
                    <Rate disabled value={4.5} allowHalf />
                  </div>
                  <div>
                    <Text>Overall Satisfaction</Text>
                    <Rate disabled value={4.1} allowHalf />
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ComplianceDashboard;
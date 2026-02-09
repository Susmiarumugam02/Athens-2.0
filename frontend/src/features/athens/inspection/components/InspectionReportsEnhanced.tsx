import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, DatePicker, Select, Input, message, Card, Row, Col, Statistic, Progress, Tabs } from 'antd';
import { FileTextOutlined, DownloadOutlined, EyeOutlined, BarChartOutlined, TrendingUpOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { inspectionService } from '../services/inspectionService';
import type { InspectionReport } from '../types';
import PageLayout from '@common/components/PageLayout';
import { TableErrorBoundary } from '@common/components/ErrorBoundary';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, BarChart, Bar, ComposedChart } from 'recharts';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;
const { TabPane } = Tabs;

const InspectionReportsEnhanced: React.FC = () => {
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredReports, setFilteredReports] = useState<InspectionReport[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateRange: null as any,
    type: ''
  });
  const [analytics, setAnalytics] = useState({
    totalReports: 156,
    completedReports: 142,
    avgScore: 87.5,
    complianceRate: 94.2,
    trendData: [
      { month: 'Jan', reports: 45, avgScore: 85.2, compliance: 92.1 },
      { month: 'Feb', reports: 52, avgScore: 87.8, compliance: 93.5 },
      { month: 'Mar', reports: 48, avgScore: 89.1, compliance: 94.8 },
      { month: 'Apr', reports: 61, avgScore: 86.7, compliance: 93.2 },
      { month: 'May', reports: 58, avgScore: 88.9, compliance: 95.1 },
      { month: 'Jun', reports: 67, avgScore: 90.2, compliance: 96.3 }
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
      { type: 'Equipment', compliant: 88, nonCompliant: 12 }
    ]
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await inspectionService.getInspectionReports();
      const data = response.data.results || [];
      setReports(data);
      setFilteredReports(data);
    } catch (error) {
      message.error('Failed to fetch inspection reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReports = () => {
    message.info('Exporting reports to Excel...');
  };

  const handleBulkDownload = () => {
    message.info('Preparing bulk download...');
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    let filtered = reports;
    
    if (filters.status) {
      filtered = filtered.filter(report => report.status === filters.status);
    }
    
    if (filters.type) {
      filtered = filtered.filter(report => report.type === filters.type);
    }
    
    if (filters.search) {
      filtered = filtered.filter(report => 
        report.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
        report.id?.toString().includes(filters.search)
      );
    }
    
    if (filters.dateRange && filters.dateRange.length === 2) {
      const [start, end] = filters.dateRange;
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.created_at);
        return reportDate >= start.toDate() && reportDate <= end.toDate();
      });
    }
    
    setFilteredReports(filtered);
  }, [reports, filters]);

  const handleViewReport = (id: string) => {
    message.info(`Viewing report ${id}`);
  };

  const handleDownloadReport = (id: string) => {
    message.info(`Downloading report ${id}`);
  };

  const columns = [
    {
      title: 'Report ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      sorter: (a: any, b: any) => a.id - b.id,
      render: (id: string) => id.slice(0, 8)
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a: any, b: any) => (a.title || '').localeCompare(b.title || ''),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const color = type === 'safety' ? 'red' : type === 'quality' ? 'green' : 'blue';
        return <Tag color={color}>{type}</Tag>;
      },
      sorter: (a: any, b: any) => (a.type || '').localeCompare(b.type || ''),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'completed' ? 'green' : status === 'in_progress' ? 'orange' : 'red';
        return <Tag color={color}>{status?.replace('_', ' ').toUpperCase()}</Tag>;
      },
      sorter: (a: any, b: any) => (a.status || '').localeCompare(b.status || ''),
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => {
        if (!score) return '-';
        const color = score >= 90 ? '#52c41a' : score >= 70 ? '#faad14' : '#ff4d4f';
        return <span style={{ color, fontWeight: 'bold' }}>{score}%</span>;
      },
      sorter: (a: any, b: any) => (a.score || 0) - (b.score || 0),
    },
    {
      title: 'Created Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: InspectionReport) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => handleViewReport(record.id)}
          >
            View
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            size="small"
            onClick={() => handleDownloadReport(record.id)}
          >
            Download
          </Button>
        </Space>
      )
    }
  ];

  return (
    <PageLayout
      title="Inspection Reports & Analytics"
      subtitle="Comprehensive reporting, analytics, and insights for inspection activities"
      icon={<BarChartOutlined />}
      breadcrumbs={[
        { title: 'Inspections', href: '/dashboard/inspection' },
        { title: 'Reports' }
      ]}
      actions={
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExportReports}>
            Export Reports
          </Button>
          <Button type="primary" icon={<FileTextOutlined />} onClick={handleBulkDownload}>
            Bulk Download
          </Button>
        </Space>
      }
    >
      <Tabs defaultActiveKey="analytics">
        <TabPane tab="Analytics Dashboard" key="analytics">
          {/* KPI Cards */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Reports"
                  value={analytics.totalReports}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Completed"
                  value={analytics.completedReports}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Average Score"
                  value={analytics.avgScore}
                  precision={1}
                  suffix="%"
                  prefix={<TrendingUpOutlined />}
                  valueStyle={{ color: analytics.avgScore >= 85 ? '#52c41a' : '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Compliance Rate"
                  value={analytics.complianceRate}
                  precision={1}
                  suffix="%"
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: analytics.complianceRate >= 90 ? '#52c41a' : '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Charts Row */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} lg={16}>
              <Card title="Reports Trend Analysis">
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analytics.trendData}>
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="reports" fill="#1890ff" name="Reports Count" />
                      <Line yAxisId="right" type="monotone" dataKey="avgScore" stroke="#52c41a" strokeWidth={2} name="Avg Score" />
                      <Line yAxisId="right" type="monotone" dataKey="compliance" stroke="#faad14" strokeWidth={2} name="Compliance %" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="Reports by Type">
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.typeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analytics.typeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {analytics.typeDistribution.map((item, index) => (
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
          <Card title="Compliance Analysis by Type">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.complianceByType}>
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="compliant" fill="#52c41a" name="Compliant" />
                  <Bar dataKey="nonCompliant" fill="#ff4d4f" name="Non-Compliant" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabPane>

        <TabPane tab="Reports List" key="reports">
          <Card>
            <div className="mb-4 flex gap-4 flex-wrap">
              <Search
                placeholder="Search reports..."
                style={{ width: 200 }}
                onSearch={(value) => setFilters(prev => ({ ...prev, search: value }))}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              <Select
                placeholder="Filter by status"
                style={{ width: 150 }}
                allowClear
                onChange={(value) => setFilters(prev => ({ ...prev, status: value || '' }))}
              >
                <Option value="completed">Completed</Option>
                <Option value="in_progress">In Progress</Option>
                <Option value="pending">Pending</Option>
              </Select>
              <Select
                placeholder="Filter by type"
                style={{ width: 150 }}
                allowClear
                onChange={(value) => setFilters(prev => ({ ...prev, type: value || '' }))}
              >
                <Option value="safety">Safety</Option>
                <Option value="quality">Quality</Option>
                <Option value="environmental">Environmental</Option>
                <Option value="equipment">Equipment</Option>
              </Select>
              <RangePicker
                placeholder={['Start Date', 'End Date']}
                onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
              />
            </div>

            <TableErrorBoundary>
              <Table
                columns={columns}
                dataSource={filteredReports}
                loading={loading}
                rowKey="id"
                size="middle"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `Total ${total} reports`
                }}
              />
            </TableErrorBoundary>
          </Card>
        </TabPane>
      </Tabs>
    </PageLayout>
  );
};

export default InspectionReportsEnhanced;
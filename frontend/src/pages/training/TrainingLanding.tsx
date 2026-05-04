import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Select, Spin, Tag, List as AntList, Button } from 'antd';
import { SafetyOutlined, ClockCircleOutlined, CheckCircleOutlined, TeamOutlined, CalendarOutlined } from '@ant-design/icons';

const { Option } = Select;

const TrainingLanding: React.FC = () => {
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('30');
  const [typeFilter, setTypeFilter] = useState('all');

  const mockData = {
    total: 45,
    induction: 28,
    job: 17,
    completed: 38,
    upcoming: 7,
    totalAttendees: 342
  };

  const metrics = useMemo(() => mockData, []);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ margin: 0, color: '#8c8c8c' }}>Track induction and job-specific training sessions</p>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Period:</span>
            <Select value={dateRange} onChange={setDateRange} style={{ width: 150 }}>
              <Option value="7">Last 7 days</Option>
              <Option value="30">Last 30 days</Option>
              <Option value="90">Last 90 days</Option>
            </Select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Type:</span>
            <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 150 }}>
              <Option value="all">All</Option>
              <Option value="induction">Induction</Option>
              <Option value="job">Job Training</Option>
            </Select>
          </div>
          
          {typeFilter !== 'all' && (
            <Button type="link" onClick={() => setTypeFilter('all')}>Clear Filters</Button>
          )}
        </div>
      </Card>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Trainings"
              value={metrics.total}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Induction"
              value={metrics.induction}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Job Training"
              value={metrics.job}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={metrics.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Upcoming"
              value={metrics.upcoming}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Attendees"
              value={metrics.totalAttendees}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Empty State */}
      {trainings.length === 0 && !loading && (
        <Card style={{ textAlign: 'center', marginTop: '24px' }}>
          <SafetyOutlined style={{ fontSize: '64px', color: '#8c8c8c', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>No Trainings Yet</h3>
          <p style={{ color: '#8c8c8c', marginBottom: '24px' }}>Get started by creating your first training session</p>
        </Card>
      )}
    </div>
  );
};

export default TrainingLanding;

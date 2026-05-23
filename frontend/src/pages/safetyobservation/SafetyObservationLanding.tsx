import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Select, Spin, Tag, List as AntList, Button } from 'antd';
import { SafetyOutlined, ClockCircleOutlined, CheckCircleOutlined, WarningOutlined, AlertOutlined } from '@ant-design/icons';
import { safetyObservationApi } from './api';
import toast from 'react-hot-toast';

const { Option } = Select;

const SafetyObservationLanding: React.FC = () => {
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, [dateRange, statusFilter, severityFilter, slaFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (slaFilter === 'overdue') params.append('overdue', 'true');
      if (slaFilter === 'due_soon') params.append('due_soon', 'true');
      
      const response = await safetyObservationApi.getAll();
      setObservations(response.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const filtered = observations.filter(obs => {
      const matchStatus = statusFilter === 'all' || obs.observationStatus === statusFilter;
      const matchSeverity = severityFilter === 'all' || obs.severity === severityFilter;
      return matchStatus && matchSeverity;
    });

    const total = filtered.length;
    const open = filtered.filter(o => o.observationStatus !== 'closed').length;
    const overdue = filtered.filter(o => o.is_overdue).length;
    const dueSoon = filtered.filter(o => o.is_due_soon).length;
    const closed = filtered.filter(o => o.observationStatus === 'closed').length;
    const closureRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    const locationMap = new Map<string, { count: number; overdue: number }>();
    filtered.forEach(obs => {
      const loc = obs.workLocation || 'Unknown';
      const existing = locationMap.get(loc) || { count: 0, overdue: 0 };
      locationMap.set(loc, {
        count: existing.count + 1,
        overdue: existing.overdue + (obs.is_overdue ? 1 : 0)
      });
    });
    const topLocations = Array.from(locationMap.entries())
      .map(([location, data]) => ({ location, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recent = [...filtered]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);

    return { total, open, overdue, dueSoon, closed, closureRate, topLocations, recent };
  }, [observations, statusFilter, severityFilter]);

  const getSeverityColor = (severity: string) => {
    const colors: any = {
      low: 'blue',
      medium: 'gold',
      high: 'orange',
      critical: 'red'
    };
    return colors[severity] || 'default';
  };

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
        <p style={{ margin: 0, color: '#8c8c8c' }}>Daily visibility into safety risks, SLA, and closure performance</p>
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
            <span>Status:</span>
            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 150 }}>
              <Option value="all">All</Option>
              <Option value="draft">Draft</Option>
              <Option value="submitted">Submitted</Option>
              <Option value="closed">Closed</Option>
            </Select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Severity:</span>
            <Select value={severityFilter} onChange={setSeverityFilter} style={{ width: 150 }}>
              <Option value="all">All</Option>
              <Option value="low">Low</Option>
              <Option value="medium">Medium</Option>
              <Option value="high">High</Option>
              <Option value="critical">Critical</Option>
            </Select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>SLA:</span>
            <Select value={slaFilter} onChange={setSlaFilter} style={{ width: 150 }}>
              <Option value="all">All</Option>
              <Option value="overdue">Overdue</Option>
              <Option value="due_soon">Due Soon</Option>
            </Select>
          </div>
          
          {(statusFilter !== 'all' || severityFilter !== 'all' || slaFilter !== 'all') && (
            <Button type="link" onClick={() => { setStatusFilter('all'); setSeverityFilter('all'); setSlaFilter('all'); }}>Clear Filters</Button>
          )}
        </div>
      </Card>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Observations"
              value={metrics.total}
              prefix={<SafetyOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Open"
              value={metrics.open}
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Overdue"
              value={metrics.overdue}
              prefix={<WarningOutlined />}
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Due Soon"
              value={metrics.dueSoon}
              prefix={<AlertOutlined />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Closed"
              value={metrics.closed}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Closure Rate"
              value={`${metrics.closureRate}%`}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Insights Section */}
      <Row gutter={16}>
        {/* Top Risk Locations */}
        <Col xs={24} lg={12}>
          <Card title="Top Risk Locations" style={{ marginBottom: '16px' }}>
            {metrics.topLocations.length > 0 ? (
              <AntList
                dataSource={metrics.topLocations}
                renderItem={(loc: any) => (
                  <AntList.Item
                    extra={loc.overdue > 0 && <Tag color="error">{loc.overdue} overdue</Tag>}
                  >
                    <AntList.Item.Meta
                      title={loc.location}
                      description={`${loc.count} observation${loc.count !== 1 ? 's' : ''}`}
                    />
                  </AntList.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: '#8c8c8c' }}>No data available</div>
            )}
          </Card>
        </Col>

        {/* Recent Activity */}
        <Col xs={24} lg={12}>
          <Card title="Recent Activity" style={{ marginBottom: '16px' }}>
            {metrics.recent.length > 0 ? (
              <AntList
                dataSource={metrics.recent}
                renderItem={(obs: any) => (
                  <AntList.Item
                    extra={obs.is_overdue && <Tag color="error">Overdue</Tag>}
                  >
                    <AntList.Item.Meta
                      avatar={<Tag color={getSeverityColor(obs.severity)}>{obs.severity}</Tag>}
                      title={obs.workLocation}
                      description={obs.typeOfObservation}
                    />
                  </AntList.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: '#8c8c8c' }}>No recent activity</div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Empty State */}
      {observations.length === 0 && !loading && (
        <Card style={{ textAlign: 'center', marginTop: '24px' }}>
          <SafetyOutlined style={{ fontSize: '64px', color: '#8c8c8c', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>No Safety Observations Yet</h3>
          <p style={{ color: '#8c8c8c', marginBottom: '24px' }}>Get started by creating your first safety observation</p>
        </Card>
      )}
    </div>
  );
};

export default SafetyObservationLanding;

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Select, Spin, Tag, List as AntList } from 'antd';
import { FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { getPermits } from './api';

const { Option } = Select;

const PTWLandingPage: React.FC = () => {
  const [permits, setPermits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, [dateRange, statusFilter, typeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await getPermits();
      setPermits(response.data || []);
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const filtered = permits.filter(permit => {
      const matchStatus = statusFilter === 'all' || permit.status === statusFilter;
      const matchType = typeFilter === 'all' || permit.permit_type?.name === typeFilter;
      return matchStatus && matchType;
    });

    const total = filtered.length;
    const active = filtered.filter(p => p.status === 'active').length;
    const pending = filtered.filter(p => p.status === 'pending').length;
    const now = new Date();
    const expiringSoon = filtered.filter(p => {
      if (p.status !== 'active') return false;
      const endTime = new Date(p.planned_end_time);
      const hoursUntilEnd = (endTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilEnd > 0 && hoursUntilEnd <= 24;
    }).length;
    const expired = filtered.filter(p => p.status === 'expired').length;
    const completed = filtered.filter(p => p.status === 'completed').length;
    const approvalRate = total > 0 ? Math.round(((active + completed) / total) * 100) : 0;

    const typeMap = new Map<string, { count: number; active: number }>();
    filtered.forEach(permit => {
      const typeName = permit.permit_type?.name || 'Unknown';
      const existing = typeMap.get(typeName) || { count: 0, active: 0 };
      typeMap.set(typeName, {
        count: existing.count + 1,
        active: existing.active + (permit.status === 'active' ? 1 : 0)
      });
    });
    const topTypes = Array.from(typeMap.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recent = [...filtered]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);

    return { total, active, pending, expiringSoon, expired, completed, approvalRate, topTypes, recent };
  }, [permits, statusFilter, typeFilter]);

  const handleKPIClick = (filter: { status?: string }) => {
    // Tab navigation will be handled by parent component
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      active: '#52c41a',
      pending: '#faad14',
      expired: '#ff4d4f',
      completed: '#1890ff',
      draft: '#8c8c8c'
    };
    return colors[status] || '#8c8c8c';
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
        <p style={{ margin: 0, color: '#8c8c8c' }}>Real-time permit tracking, compliance monitoring, and safety oversight</p>
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
              <Option value="active">Active</Option>
              <Option value="pending">Pending</Option>
              <Option value="completed">Completed</Option>
              <Option value="expired">Expired</Option>
            </Select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Type:</span>
            <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 150 }}>
              <Option value="all">All</Option>
              <Option value="Hot Work">Hot Work</Option>
              <Option value="Confined Space">Confined Space</Option>
              <Option value="Working at Height">Working at Height</Option>
              <Option value="Electrical">Electrical</Option>
            </Select>
          </div>
          
          {(statusFilter !== 'all' || typeFilter !== 'all') && (
            <Button type="link" onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}>Clear Filters</Button>
          )}
        </div>
      </Card>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Permits"
              value={metrics.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Permits"
              value={metrics.active}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending Approval"
              value={metrics.pending}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Expired"
              value={metrics.expired}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Insights Section */}
      <Row gutter={16}>
        {/* Top Permit Types */}
        <Col xs={24} lg={12}>
          <Card title="Top Permit Types" style={{ marginBottom: '16px' }}>
            {metrics.topTypes.length > 0 ? (
              <AntList
                dataSource={metrics.topTypes}
                renderItem={(type: any) => (
                  <AntList.Item
                    style={{ cursor: 'pointer' }}
                    extra={type.active > 0 && <Tag color="success">{type.active} active</Tag>}
                  >
                    <AntList.Item.Meta
                      title={type.type}
                      description={`${type.count} permit${type.count !== 1 ? 's' : ''}`}
                    />
                  </AntList.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: '#8c8c8c' }}>No data available</div>
            )}
          </Card>
        </Col>

        {/* Recent Permits */}
        <Col xs={24} lg={12}>
          <Card title="Recent Permits" style={{ marginBottom: '16px' }}>
            {metrics.recent.length > 0 ? (
              <AntList
                dataSource={metrics.recent}
                renderItem={(permit: any) => {
                  const now = new Date();
                  const endTime = new Date(permit.planned_end_time);
                  const hoursUntilEnd = (endTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                  const isExpiring = permit.status === 'active' && hoursUntilEnd > 0 && hoursUntilEnd <= 24;
                  
                  return (
                    <AntList.Item
                      style={{ cursor: 'pointer' }}
                      extra={isExpiring && <Tag color="warning">Expiring</Tag>}
                    >
                      <AntList.Item.Meta
                        avatar={<Tag color={getStatusColor(permit.status)}>{permit.status}</Tag>}
                        title={permit.title}
                        description={permit.location}
                      />
                    </AntList.Item>
                  );
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: '#8c8c8c' }}>No recent permits</div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Empty State */}
      {permits.length === 0 && !loading && (
        <Card style={{ textAlign: 'center', marginTop: '24px' }}>
          <FileTextOutlined style={{ fontSize: '64px', color: '#8c8c8c', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>No Permits Yet</h3>
          <p style={{ color: '#8c8c8c', marginBottom: '24px' }}>Get started by creating your first permit to work</p>
        </Card>
      )}
    </div>
  );
};

export default PTWLandingPage;

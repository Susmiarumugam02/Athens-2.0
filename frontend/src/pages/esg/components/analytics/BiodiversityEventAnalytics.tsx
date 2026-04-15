import React from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { 
  BugOutlined, 
  EnvironmentOutlined, 
  AlertOutlined,
  FallOutlined 
} from '@ant-design/icons';
import { BiodiversityEvent } from '../../types';
import dayjs from 'dayjs';

interface BiodiversityEventAnalyticsProps {
  data: BiodiversityEvent[];
}

const BiodiversityEventAnalytics: React.FC<BiodiversityEventAnalyticsProps> = ({ data }) => {
  const totalEvents = data.length;
  const eventsBySpecies = data.reduce((acc, event) => {
    acc[event.species] = (acc[event.species] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const eventsBySeverity = data.reduce((acc, event) => {
    acc[event.severity] = (acc[event.severity] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const monthlyEvents = data.filter(event => 
    dayjs(event.date).isSame(dayjs(), 'month')
  ).length;

  const highSeverityEvents = data.filter(event => event.severity >= 3).length;
  const mitigationRate = totalEvents > 0 ? ((totalEvents - highSeverityEvents) / totalEvents) * 100 : 0;

  const getSpeciesColor = (species: string) => {
    if (species.toLowerCase().includes('bird')) return '#1890ff';
    if (species.toLowerCase().includes('bat')) return '#722ed1';
    if (species.toLowerCase().includes('wildlife')) return '#52c41a';
    return '#fa8c16';
  };

  const getSeverityColor = (severity: number) => {
    const colors = { 1: '#52c41a', 2: '#faad14', 3: '#fa8c16', 4: '#f5222d' };
    return colors[severity as keyof typeof colors] || '#d9d9d9';
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Events"
              value={totalEvents}
              prefix={<BugOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="This Month"
              value={monthlyEvents}
              prefix={<EnvironmentOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="High Severity"
              value={highSeverityEvents}
              prefix={<AlertOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Mitigation Rate"
              value={mitigationRate}
              precision={1}
              suffix="%"
              prefix={<FallOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Events by Species" size="small">
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {Object.entries(eventsBySpecies).map(([species, count]) => (
                <div key={species} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{species}</span>
                    <span style={{ fontWeight: 'bold' }}>{count}</span>
                  </div>
                  <Progress
                    percent={(count / totalEvents) * 100}
                    strokeColor={getSpeciesColor(species)}
                    showInfo={false}
                    size="small"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Impact Assessment" size="small">
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {[1, 2, 3, 4].map(severity => {
                const count = eventsBySeverity[severity] || 0;
                const percentage = totalEvents > 0 ? (count / totalEvents) * 100 : 0;
                const severityLabels = { 1: 'Low Impact', 2: 'Medium Impact', 3: 'High Impact', 4: 'Critical Impact' };
                
                return (
                  <div key={severity} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>{severityLabels[severity as keyof typeof severityLabels]}</span>
                      <span style={{ fontWeight: 'bold' }}>{count}</span>
                    </div>
                    <Progress
                      percent={percentage}
                      strokeColor={getSeverityColor(severity)}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                );
              })}
              
              <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f6ffed', borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Habitat Protection</span>
                  <span style={{ fontWeight: 'bold', color: '#52c41a' }}>94.2%</span>
                </div>
                <Progress percent={94.2} strokeColor="#52c41a" showInfo={false} size="small" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BiodiversityEventAnalytics;
import React from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { 
  EnvironmentOutlined, 
  ExclamationCircleOutlined, 
  CheckCircleOutlined,
  RiseOutlined 
} from '@ant-design/icons';
import { EnvironmentAspect } from '../../types';

interface EnvironmentAspectAnalyticsProps {
  data: EnvironmentAspect[];
}

const EnvironmentAspectAnalytics: React.FC<EnvironmentAspectAnalyticsProps> = ({ data }) => {
  const totalAspects = data.length;
  const aspectsByType = data.reduce((acc, aspect) => {
    acc[aspect.aspect_type] = (acc[aspect.aspect_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const severityDistribution = data.reduce((acc, aspect) => {
    acc[aspect.severity] = (acc[aspect.severity] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const highRiskAspects = data.filter(aspect => aspect.severity >= 3).length;
  const riskPercentage = totalAspects > 0 ? (highRiskAspects / totalAspects) * 100 : 0;

  const getAspectTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      energy: '#52c41a', water: '#1890ff', waste: '#fa8c16', 
      emissions: '#f5222d', biodiversity: '#722ed1', noise: '#faad14', land_use: '#13c2c2'
    };
    return colors[type] || '#d9d9d9';
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Aspects"
              value={totalAspects}
              prefix={<EnvironmentOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="High Risk Aspects"
              value={highRiskAspects}
              prefix={<ExclamationCircleOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Risk Coverage"
              value={riskPercentage}
              precision={1}
              suffix="%"
              prefix={<RiseOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Compliance Score"
              value={85.4}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Aspect Type Distribution" size="small">
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {Object.entries(aspectsByType).map(([type, count]) => (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ textTransform: 'capitalize' }}>{type.replace('_', ' ')}</span>
                    <span style={{ fontWeight: 'bold' }}>{count}</span>
                  </div>
                  <Progress
                    percent={(count / totalAspects) * 100}
                    strokeColor={getAspectTypeColor(type)}
                    showInfo={false}
                    size="small"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Risk Severity Analysis" size="small">
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {[1, 2, 3, 4].map(severity => {
                const count = severityDistribution[severity] || 0;
                const percentage = totalAspects > 0 ? (count / totalAspects) * 100 : 0;
                const severityLabels = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };
                const colors = { 1: '#52c41a', 2: '#faad14', 3: '#fa8c16', 4: '#f5222d' };
                
                return (
                  <div key={severity} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>{severityLabels[severity as keyof typeof severityLabels]} Risk</span>
                      <span style={{ fontWeight: 'bold' }}>{count}</span>
                    </div>
                    <Progress
                      percent={percentage}
                      strokeColor={colors[severity as keyof typeof colors]}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EnvironmentAspectAnalytics;
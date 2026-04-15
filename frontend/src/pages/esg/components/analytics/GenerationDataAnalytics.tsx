import React from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { 
  ThunderboltOutlined, 
  SunOutlined, 
  CloudOutlined,
  RiseOutlined 
} from '@ant-design/icons';
import { GenerationData } from '../../types';
import dayjs from 'dayjs';

interface GenerationDataAnalyticsProps {
  data: GenerationData[];
}

const GenerationDataAnalytics: React.FC<GenerationDataAnalyticsProps> = ({ data }) => {
  const totalGeneration = data.reduce((sum, item) => sum + item.kwh, 0);
  const todayGeneration = data
    .filter(item => dayjs(item.timestamp).isSame(dayjs(), 'day'))
    .reduce((sum, item) => sum + item.kwh, 0);
  
  const assetTypeBreakdown = data.reduce((acc, item) => {
    acc[item.asset_type] = (acc[item.asset_type] || 0) + item.kwh;
    return acc;
  }, {} as Record<string, number>);

  const monthlyGeneration = data
    .filter(item => dayjs(item.timestamp).isSame(dayjs(), 'month'))
    .reduce((sum, item) => sum + item.kwh, 0);

  const avgDailyGeneration = totalGeneration / Math.max(1, data.length);
  const efficiency = totalGeneration > 0 ? Math.min(95, (totalGeneration / 1000000) * 100) : 0;

  const getAssetTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      wind: '#1890ff', solar: '#fa8c16', battery: '#52c41a', grid: '#722ed1'
    };
    return colors[type] || '#d9d9d9';
  };

  const getAssetIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      wind: <CloudOutlined />, solar: <SunOutlined />, 
      battery: <ThunderboltOutlined />, grid: <ThunderboltOutlined />
    };
    return icons[type] || <ThunderboltOutlined />;
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Generation"
              value={totalGeneration}
              precision={0}
              suffix="kWh"
              prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Today's Generation"
              value={todayGeneration}
              precision={0}
              suffix="kWh"
              prefix={<SunOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Monthly Generation"
              value={monthlyGeneration}
              precision={0}
              suffix="kWh"
              prefix={<RiseOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="System Efficiency"
              value={efficiency}
              precision={1}
              suffix="%"
              prefix={<ThunderboltOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Generation by Asset Type" size="small">
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {Object.entries(assetTypeBreakdown).map(([type, kwh]) => (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {getAssetIcon(type)}
                      {type.toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 'bold' }}>{kwh.toLocaleString()} kWh</span>
                  </div>
                  <Progress
                    percent={(kwh / totalGeneration) * 100}
                    strokeColor={getAssetTypeColor(type)}
                    showInfo={false}
                    size="small"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Performance Metrics" size="small">
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Capacity Factor</span>
                  <span style={{ fontWeight: 'bold' }}>78.5%</span>
                </div>
                <Progress percent={78.5} strokeColor="#52c41a" showInfo={false} size="small" />
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Availability</span>
                  <span style={{ fontWeight: 'bold' }}>96.2%</span>
                </div>
                <Progress percent={96.2} strokeColor="#1890ff" showInfo={false} size="small" />
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Grid Stability</span>
                  <span style={{ fontWeight: 'bold' }}>99.1%</span>
                </div>
                <Progress percent={99.1} strokeColor="#722ed1" showInfo={false} size="small" />
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>CO₂ Avoided</span>
                  <span style={{ fontWeight: 'bold' }}>{(totalGeneration * 0.82 / 1000).toFixed(1)} tCO₂</span>
                </div>
                <Progress percent={85} strokeColor="#52c41a" showInfo={false} size="small" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GenerationDataAnalytics;
import React from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { 
  DeleteOutlined, 
  ReloadOutlined, 
  WarningOutlined,
  FallOutlined 
} from '@ant-design/icons';
import { WasteManifest } from '../../types';

interface WasteManifestAnalyticsProps {
  data: WasteManifest[];
}

const WasteManifestAnalytics: React.FC<WasteManifestAnalyticsProps> = ({ data }) => {
  const totalWaste = data.reduce((sum, item) => sum + item.quantity, 0);
  const wasteByType = data.reduce((acc, item) => {
    acc[item.waste_type] = (acc[item.waste_type] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);

  const wasteByStatus = data.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);

  const hazardousWaste = data
    .filter(item => item.waste_type === 'Hazardous Waste')
    .reduce((sum, item) => sum + item.quantity, 0);

  const recyclableWaste = data
    .filter(item => item.waste_type === 'Recyclable Materials')
    .reduce((sum, item) => sum + item.quantity, 0);

  const recyclingRate = totalWaste > 0 ? (recyclableWaste / totalWaste) * 100 : 0;
  const disposedWaste = wasteByStatus['disposed'] || 0;
  const wasteReduction = Math.max(0, 15.2); // Mock data for waste reduction target

  const getWasteTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Hazardous Waste': '#f5222d',
      'Non-Hazardous Waste': '#52c41a',
      'Recyclable Materials': '#1890ff',
      'Electronic Waste': '#722ed1',
      'Construction Debris': '#fa8c16',
      'Organic Waste': '#13c2c2'
    };
    return colors[type] || '#d9d9d9';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      generated: '#fa8c16', transported: '#1890ff', disposed: '#52c41a', cancelled: '#f5222d'
    };
    return colors[status] || '#d9d9d9';
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Waste"
              value={totalWaste}
              precision={0}
              suffix="kg"
              prefix={<DeleteOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Hazardous Waste"
              value={hazardousWaste}
              precision={0}
              suffix="kg"
              prefix={<WarningOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Recycling Rate"
              value={recyclingRate}
              precision={1}
              suffix="%"
              prefix={<ReloadOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Waste Reduction"
              value={wasteReduction}
              precision={1}
              suffix="%"
              prefix={<FallOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Waste by Type" size="small">
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {Object.entries(wasteByType).map(([type, quantity]) => (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{type}</span>
                    <span style={{ fontWeight: 'bold' }}>{quantity} kg</span>
                  </div>
                  <Progress
                    percent={(quantity / totalWaste) * 100}
                    strokeColor={getWasteTypeColor(type)}
                    showInfo={false}
                    size="small"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Waste Management Status" size="small">
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {Object.entries(wasteByStatus).map(([status, quantity]) => (
                <div key={status} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ textTransform: 'capitalize' }}>{status}</span>
                    <span style={{ fontWeight: 'bold' }}>{quantity} kg</span>
                  </div>
                  <Progress
                    percent={(quantity / totalWaste) * 100}
                    strokeColor={getStatusColor(status)}
                    showInfo={false}
                    size="small"
                  />
                </div>
              ))}
              
              <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f6ffed', borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Diversion Rate</span>
                  <span style={{ fontWeight: 'bold', color: '#52c41a' }}>87.3%</span>
                </div>
                <Progress percent={87.3} strokeColor="#52c41a" showInfo={false} size="small" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WasteManifestAnalytics;
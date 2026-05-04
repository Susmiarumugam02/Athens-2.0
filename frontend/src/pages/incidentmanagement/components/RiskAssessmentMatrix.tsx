import React from 'react';
import { Card, Row, Col, Typography, Space, Tag, Tooltip } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface RiskMatrixData {
  matrix_data: number[][];
  incident_distribution: { [key: number]: number };
  risk_zones: {
    low: { range: [number, number]; color: string; label: string; count: number };
    medium: { range: [number, number]; color: string; label: string; count: number };
    high: { range: [number, number]; color: string; label: string; count: number };
  };
}

interface SelectedIncident {
  probability_score: number;
  impact_score: number;
  risk_score: number;
}

interface RiskAssessmentMatrixProps {
  data: RiskMatrixData;
  selectedIncident?: SelectedIncident;
}

const RiskAssessmentMatrix: React.FC<RiskAssessmentMatrixProps> = ({
  data,
  selectedIncident
}) => {
  const renderMatrixCell = (row: number, col: number) => {
    const score = data.matrix_data[row][col];
    const incidentCount = data.incident_distribution[score] || 0;
    
    // Determine risk zone
    let riskZone = 'low';
    let backgroundColor = '#52c41a';
    
    if (score >= data.risk_zones.high.range[0]) {
      riskZone = 'high';
      backgroundColor = data.risk_zones.high.color;
    } else if (score >= data.risk_zones.medium.range[0]) {
      riskZone = 'medium';
      backgroundColor = data.risk_zones.medium.color;
    }
    
    // Check if this is the selected incident's position
    const isSelected = selectedIncident && 
      selectedIncident.probability_score === col + 1 && 
      selectedIncident.impact_score === row + 1;
    
    return (
      <Tooltip
        key={`${row}-${col}`}
        title={`Risk Score: ${score} | Incidents: ${incidentCount} | Zone: ${riskZone.toUpperCase()}`}
      >
        <div
          style={{
            width: 60,
            height: 60,
            backgroundColor,
            border: isSelected ? '3px solid #1890ff' : '1px solid #d9d9d9',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: 4,
            margin: 2,
            boxShadow: isSelected ? '0 0 10px rgba(24, 144, 255, 0.5)' : 'none',
          }}
        >
          <Text strong style={{ color: 'white', fontSize: 16 }}>
            {score}
          </Text>
          <Text style={{ color: 'white', fontSize: 10 }}>
            ({incidentCount})
          </Text>
        </div>
      </Tooltip>
    );
  };

  return (
    <Card title="Risk Assessment Matrix" style={{ marginBottom: 24 }}>
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ marginRight: 16 }}>
              <Title level={5} style={{ margin: 0, transform: 'rotate(-90deg)', width: 80 }}>
                Impact →
              </Title>
            </div>
            <div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[4, 3, 2, 1, 0].map(row => (
                  <div key={row} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 20, textAlign: 'center', marginRight: 8 }}>
                      <Text strong>{row + 1}</Text>
                    </div>
                    <div style={{ display: 'flex' }}>
                      {[0, 1, 2, 3, 4].map(col => renderMatrixCell(row, col))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Title level={5} style={{ margin: 0 }}>
                  ← Probability
                </Title>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <div key={num} style={{ width: 64, textAlign: 'center' }}>
                      <Text strong>{num}</Text>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Col>
        
        <Col xs={24} lg={8}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={5}>Risk Zones</Title>
            
            <div style={{ marginBottom: 16 }}>
              <Tag color={data.risk_zones.low.color} style={{ marginBottom: 8, padding: '4px 8px' }}>
                {data.risk_zones.low.label} (1-{data.risk_zones.medium.range[0] - 1})
              </Tag>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {data.risk_zones.low.count} incidents
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Tag color={data.risk_zones.medium.color} style={{ marginBottom: 8, padding: '4px 8px' }}>
                {data.risk_zones.medium.label} ({data.risk_zones.medium.range[0]}-{data.risk_zones.high.range[0] - 1})
              </Tag>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {data.risk_zones.medium.count} incidents
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Tag color={data.risk_zones.high.color} style={{ marginBottom: 8, padding: '4px 8px' }}>
                {data.risk_zones.high.label} ({data.risk_zones.high.range[0]}+)
              </Tag>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {data.risk_zones.high.count} incidents
              </div>
            </div>

            {selectedIncident && (
              <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f0f2f5', borderRadius: 8 }}>
                <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                  <WarningOutlined /> Current Incident
                </Title>
                <Space direction="vertical" size="small">
                  <div>
                    <Text strong>Probability:</Text> {selectedIncident.probability_score}
                  </div>
                  <div>
                    <Text strong>Impact:</Text> {selectedIncident.impact_score}
                  </div>
                  <div>
                    <Text strong>Risk Score:</Text>{' '}
                    <Tag color={
                      selectedIncident.risk_score >= data.risk_zones.high.range[0] ? data.risk_zones.high.color :
                      selectedIncident.risk_score >= data.risk_zones.medium.range[0] ? data.risk_zones.medium.color :
                      data.risk_zones.low.color
                    }>
                      {selectedIncident.risk_score}
                    </Tag>
                  </div>
                </Space>
              </div>
            )}
          </Space>
        </Col>
      </Row>

      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <Title level={5}>Assessment Guide</Title>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Card size="small" title="Probability Scale">
                <div style={{ fontSize: '12px' }}>
                  <div><strong>1 - Very Unlikely:</strong> May occur in exceptional circumstances</div>
                  <div><strong>2 - Unlikely:</strong> Could occur at some time</div>
                  <div><strong>3 - Possible:</strong> Might occur at some time</div>
                  <div><strong>4 - Likely:</strong> Will probably occur in most circumstances</div>
                  <div><strong>5 - Very Likely:</strong> Expected to occur in most circumstances</div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card size="small" title="Impact Scale">
                <div style={{ fontSize: '12px' }}>
                  <div><strong>1 - Negligible:</strong> No injuries, minimal financial loss</div>
                  <div><strong>2 - Minor:</strong> First aid treatment, low financial impact</div>
                  <div><strong>3 - Moderate:</strong> Medical treatment, moderate financial loss</div>
                  <div><strong>4 - Major:</strong> Extensive injuries, high financial impact</div>
                  <div><strong>5 - Catastrophic:</strong> Death, extreme financial loss</div>
                </div>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Card>
  );
};

export default RiskAssessmentMatrix;

import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import { 
  AuditOutlined, 
  SafetyOutlined
} from '@ant-design/icons';
import PageLayout from '../../../components/ui/PageLayout';
import ESGPolicyList from '../components/ESGPolicyList';
import GrievanceList from '../components/GrievanceList';

const { Text } = Typography;

const GovernancePage: React.FC = () => {
  return (
    <PageLayout
      title="Governance Management"
      subtitle="Policy management, compliance monitoring and grievance handling"
      breadcrumbs={[
        { title: 'ESG Management' },
        { title: 'Governance' }
      ]}
    >
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100%' }}>
        <Row gutter={[16, 16]}>
          {/* ESG Policies Section */}
          <Col xs={24}>
            <Card>
              <ESGPolicyList />
            </Card>
          </Col>

          {/* Grievance Management Section */}
          <Col xs={24}>
            <Card>
              <GrievanceList />
            </Card>
          </Col>

          {/* Compliance Monitoring */}
          <Col xs={24}>
            <Card 
              title={
                <span>
                  <AuditOutlined style={{ marginRight: 8 }} />
                  Compliance Monitoring
                </span>
              }
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Card size="small">
                    <div style={{ textAlign: 'center' }}>
                      <SafetyOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                      <div style={{ marginTop: 8 }}>
                        <Text strong>ISO 14001</Text>
                        <div>Environmental Management</div>
                        <Text type="success">Compliant</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} sm={8}>
                  <Card size="small">
                    <div style={{ textAlign: 'center' }}>
                      <SafetyOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                      <div style={{ marginTop: 8 }}>
                        <Text strong>ISO 45001</Text>
                        <div>Occupational Health & Safety</div>
                        <Text type="success">Compliant</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} sm={8}>
                  <Card size="small">
                    <div style={{ textAlign: 'center' }}>
                      <SafetyOutlined style={{ fontSize: '24px', color: '#faad14' }} />
                      <div style={{ marginTop: 8 }}>
                        <Text strong>BRSR</Text>
                        <div>Business Responsibility Report</div>
                        <Text type="warning">In Progress</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    </PageLayout>
  );
};

export default GovernancePage;
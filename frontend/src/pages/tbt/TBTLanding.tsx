import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { CommentOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined, CalendarOutlined, FileTextOutlined } from '@ant-design/icons';

const TBTLanding: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total TBTs"
              value={156}
              prefix={<CommentOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={142}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Scheduled"
              value={14}
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Attendees"
              value={2847}
              prefix={<TeamOutlined />}
              styles={{ content: { color: '#722ed1' } }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="This Month"
              value={23}
              prefix={<CalendarOutlined />}
              styles={{ content: { color: '#13c2c2' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Topics Covered"
              value={87}
              prefix={<FileTextOutlined />}
              styles={{ content: { color: '#eb2f96' } }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TBTLanding;

import React from 'react';
import { Tabs, Typography } from 'antd';
import {
  BarChartOutlined,
  BugOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import QualityFindingsFixingsSystem from './components/QualityFindingsFixingsSystem';
import DefectManagement from './components/DefectManagement';
import QualityDashboard from './components/QualityDashboard';
import RootCauseAnalysis from './components/RootCauseAnalysis';

const { Text, Title } = Typography;

const QualityModulePage: React.FC = () => (
  <div style={{ padding: 24 }}>
    <div style={{ marginBottom: 16 }}>
      <Title level={3} style={{ marginBottom: 4 }}>Quality Management</Title>
      <Text type="secondary">
        Quality findings, fixings, NCR, CAPA, root cause analysis, audit logs and analytics.
      </Text>
    </div>

    <Tabs
      defaultActiveKey="findings-fixings"
      destroyOnHidden={false}
      items={[
        {
          key: 'findings-fixings',
          label: (
            <span>
              <SafetyCertificateOutlined /> Findings & Fixings
            </span>
          ),
          children: <QualityFindingsFixingsSystem />,
        },
        {
          key: 'defects',
          label: (
            <span>
              <BugOutlined /> Defect Management
            </span>
          ),
          children: <DefectManagement />,
        },
        {
          key: 'rca',
          label: (
            <span>
              <AuditOutlined /> Root Cause Analysis
            </span>
          ),
          children: <RootCauseAnalysis />,
        },
        {
          key: 'analytics',
          label: (
            <span>
              <BarChartOutlined /> Quality Analytics
            </span>
          ),
          children: <QualityDashboard />,
        },
      ]}
    />
  </div>
);

export default QualityModulePage;

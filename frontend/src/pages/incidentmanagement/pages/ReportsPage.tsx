import React from 'react';
import { Breadcrumb } from 'antd';
import IncidentReports from '../components/IncidentReports';

const ReportsPage: React.FC = () => {
  const getBreadcrumbItems = () => {
    return [
      { title: 'Home' },
      { title: 'Incident Management' },
      { title: 'Reports' }
    ];
  };

  return (
    <div style={{ padding: '24px' }}>
      <Breadcrumb 
        style={{ marginBottom: '16px' }}
        items={getBreadcrumbItems()}
      />
      
      <IncidentReports />
    </div>
  );
};

export default ReportsPage;

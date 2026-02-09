import React from 'react';
import WorkerList from '../components/WorkerList';
import PageLayout from '@common/components/PageLayout';
import { TeamOutlined } from '@ant-design/icons';

const WorkerPage: React.FC = () => {
  return (
    <PageLayout
      title="Worker Management"
      subtitle="Manage and view worker information"
      breadcrumbs={[
        { title: 'Workers' }
      ]}
      icon={<TeamOutlined />}
    >
      <WorkerList />
    </PageLayout>
  );
};

export default WorkerPage;
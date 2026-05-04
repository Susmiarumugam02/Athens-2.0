import React from 'react';
import { Outlet } from 'react-router-dom';
import PageLayout from '../../../common/components/PageLayout';

const PTWLayout: React.FC = () => {
  return (
    <PageLayout
      title="Permit to Work"
      breadcrumbs={[
        { title: 'PTW Management' }
      ]}
    >
      <Outlet />
    </PageLayout>
  );
};

export default PTWLayout;








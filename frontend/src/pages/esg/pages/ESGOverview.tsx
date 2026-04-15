import React from 'react';
import PageLayout from '../../../components/ui/PageLayout';
import ESGOverviewDashboard from '../components/ESGOverviewDashboard';

const ESGOverview: React.FC = () => {
  return (
    <PageLayout
      title="ESG Overview"
      subtitle="Environmental, Social & Governance performance dashboard"
      breadcrumbs={[
        { title: 'ESG Management' },
        { title: 'ESG Overview' }
      ]}
    >
      <ESGOverviewDashboard />
    </PageLayout>
  );
};

export default ESGOverview;
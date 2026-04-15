import React from 'react';
import SafetyObservationForm from './SafetyObservationForm';
import PageLayout from '@common/components/PageLayout';

const SafetyObservationFormPage: React.FC = () => {
  return (
    <PageLayout
      title="Safety Observation Form"
      subtitle="Create and manage safety observations"
    >
      <div className="bg-color-ui-base p-6 rounded-lg border border-color-border shadow-sm">
        <SafetyObservationForm />
      </div>
    </PageLayout>
  );
};

export default SafetyObservationFormPage;

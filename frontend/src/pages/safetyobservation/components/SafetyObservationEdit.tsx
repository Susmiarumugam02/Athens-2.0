import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, message, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import SafetyObservationForm from './SafetyObservationForm';
import PageLayout from '@common/components/PageLayout';
import api from '@common/utils/axiosetup';

interface SafetyObservationEditProps {}

const SafetyObservationEdit: React.FC<SafetyObservationEditProps> = () => {
  const { observationID } = useParams<{ observationID: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [observationData, setObservationData] = useState<any>(null);

  useEffect(() => {
    if (observationID) {
      fetchObservationData();
    }
  }, [observationID]);

  const fetchObservationData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/safetyobservation/${observationID}/`);
      setObservationData(response.data);
    } catch (error) {
      message.error('Failed to fetch observation data');
      navigate('/dashboard/safetyobservation/list');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSuccess = () => {
    message.success('Safety observation updated successfully!');
    navigate('/dashboard/safetyobservation/list');
  };

  const handleBack = () => {
    navigate('/dashboard/safetyobservation/list');
  };

  if (loading) {
    return (
      <PageLayout title="Loading..." subtitle="Please wait">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`Edit Safety Observation - ${observationID}`}
      subtitle="Update safety observation details"
    >
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
        >
          Back to List
        </Button>
      </div>

      <Card>
        <SafetyObservationForm
          observationID={observationID}
          initialData={observationData}
          onSuccess={handleUpdateSuccess}
          isEditMode={true}
        />
      </Card>
    </PageLayout>
  );
};

export default SafetyObservationEdit;

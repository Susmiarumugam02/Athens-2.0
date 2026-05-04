import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import PageLayout from '@common/components/PageLayout';
import ReviewApprovalModal from './ReviewApprovalModal';

const SafetyObservationReview: React.FC = () => {
  const { observationID } = useParams<{ observationID: string }>();
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    // Automatically open the review modal when page loads
    if (observationID) {
      setModalVisible(true);
    }
  }, [observationID]);

  const handleSuccess = () => {
    setModalVisible(false);
    message.success('Action completed successfully!');
    // Navigate back to list
    navigate('/dashboard/safetyobservation/list');
  };

  const handleCancel = () => {
    setModalVisible(false);
    // Navigate back to list
    navigate('/dashboard/safetyobservation/list');
  };

  return (
    <PageLayout title="Safety Observation Review">
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/dashboard/safetyobservation/list')}
          >
            Back to List
          </Button>
        </div>
      </Card>

      {observationID && (
        <ReviewApprovalModal
          visible={modalVisible}
          onCancel={handleCancel}
          onSuccess={handleSuccess}
          observationID={observationID}
        />
      )}
    </PageLayout>
  );
};

export default SafetyObservationReview;

import React, { useState } from 'react';
import { Modal, Button, message, Card, Image, Space, Input, Row, Col } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import api from '@common/utils/axiosetup';

interface ApprovalModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  observationID: string;
  observationData: any;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  observationID,
  observationData
}) => {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleApprove = async () => {
    try {
      setLoading(true);
      
      await api.post(`/api/v1/safetyobservation/${observationID}/approve_observation/`, {
        approved: true,
        feedback: feedback
      });

      message.success('Observation approved and closed successfully!');
      onSuccess();
      
    } catch (error) {
      message.error('Failed to approve observation');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      
      await api.post(`/api/v1/safetyobservation/${observationID}/approve_observation/`, {
        approved: false,
        feedback: feedback
      });

      message.success('Observation sent back for revision');
      onSuccess();
      
    } catch (error) {
      message.error('Failed to reject observation');
    } finally {
      setLoading(false);
    }
  };

  const beforePhotos = observationData?.files?.filter((file: any) => 
    file.file_name?.toLowerCase().includes('before') || 
    file.file_name?.toLowerCase().includes('original')
  ) || [];

  const afterPhotos = observationData?.files?.filter((file: any) => 
    file.file_name?.toLowerCase().includes('after') || 
    file.file_name?.toLowerCase().includes('fixed') ||
    file.file_name?.toLowerCase().includes('completed')
  ) || [];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircleOutlined />
          <span>Review & Approve - {observationID}</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      style={{ top: 20 }}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Observation Summary */}
        <Card title="Observation Summary" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <p><strong>Type:</strong> {observationData?.typeOfObservation?.replace('_', ' ')}</p>
              <p><strong>Location:</strong> {observationData?.workLocation}</p>
              <p><strong>Assigned To:</strong> {observationData?.correctiveActionAssignedTo}</p>
            </Col>
            <Col span={12}>
              <p><strong>Severity:</strong> {observationData?.severity}</p>
              <p><strong>Status:</strong> {observationData?.observationStatus?.replace('_', ' ')}</p>
              <p><strong>Commitment Date:</strong> {observationData?.commitmentDate}</p>
            </Col>
          </Row>
          <p><strong>Description:</strong> {observationData?.safetyObservationFound}</p>
          <p><strong>Corrective Action:</strong> {observationData?.correctivePreventiveAction}</p>
        </Card>

        {/* Before Photos */}
        {beforePhotos.length > 0 && (
          <Card title="Before Photos" size="small" style={{ marginBottom: 16 }}>
            <Space wrap>
              {beforePhotos.map((file: any, index: number) => (
                <div key={index} style={{ textAlign: 'center' }}>
                  <Image
                    width={150}
                    height={150}
                    src={file.file}
                    alt={`Before photo ${index + 1}`}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    preview={{
                      mask: <EyeOutlined />
                    }}
                  />
                  <p style={{ fontSize: 12, marginTop: 4 }}>{file.file_name}</p>
                </div>
              ))}
            </Space>
          </Card>
        )}

        {/* After Photos */}
        {afterPhotos.length > 0 && (
          <Card title="After Photos (Fixed)" size="small" style={{ marginBottom: 16 }}>
            <Space wrap>
              {afterPhotos.map((file: any, index: number) => (
                <div key={index} style={{ textAlign: 'center' }}>
                  <Image
                    width={150}
                    height={150}
                    src={file.file}
                    alt={`After photo ${index + 1}`}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    preview={{
                      mask: <EyeOutlined />
                    }}
                  />
                  <p style={{ fontSize: 12, marginTop: 4 }}>{file.file_name}</p>
                </div>
              ))}
            </Space>
          </Card>
        )}

        {/* Feedback Section */}
        <Card title="Approval Feedback" size="small" style={{ marginBottom: 16 }}>
          <Input.TextArea
            rows={3}
            placeholder="Provide feedback for approval/rejection..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </Card>

        {/* Action Buttons */}
        <div style={{ textAlign: 'right', borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <Space>
            <Button onClick={onCancel}>
              Cancel
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={handleReject}
              loading={loading}
            >
              Request Revision
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleApprove}
              loading={loading}
            >
              Approve & Close
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default ApprovalModal;

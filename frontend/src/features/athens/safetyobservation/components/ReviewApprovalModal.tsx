import React, { useState } from 'react';
import { Modal, Button, message, Card, Image, Space, Input, Row, Col, Form } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import api from '@common/utils/axiosetup';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface ReviewApprovalModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  observationID: string;
  observationData: any;
}

const ReviewApprovalModal: React.FC<ReviewApprovalModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  observationID,
  observationData
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = async () => {
    try {
      setLoading(true);
      
      await api.post(`/api/v1/safetyobservation/${observationID}/approve_observation/`, {
        approved: true,
        feedback: ''
      });

      message.success('Observation approved and closed successfully!');
      onSuccess();
      
    } catch (error: any) {
      console.error('Approval error:', error);
      message.error('Failed to approve observation');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (values: any) => {
    if (!values.rejectionDescription) {
      message.error('Rejection description is required');
      return;
    }

    try {
      setLoading(true);
      
      await api.post(`/api/v1/safetyobservation/${observationID}/approve_observation/`, {
        approved: false,
        feedback: values.rejectionDescription
      });

      message.success('Observation rejected and sent back for revision');
      form.resetFields();
      setActionType(null);
      onSuccess();
      
    } catch (error: any) {
      console.error('Rejection error:', error);
      message.error('Failed to reject observation');
    } finally {
      setLoading(false);
    }
  };

  const showRejectForm = () => {
    setActionType('reject');
  };

  const showApproveConfirm = () => {
    setActionType('approve');
  };

  const cancelAction = () => {
    setActionType(null);
    form.resetFields();
  };

  // Filter photos by type
  const beforePhotos = observationData?.files?.filter((file: any) => 
    !file.file_name?.toLowerCase().includes('fixed') && 
    !file.file_name?.toLowerCase().includes('evidence') &&
    !file.file_name?.toLowerCase().includes('after')
  ) || [];

  const evidencePhotos = observationData?.files?.filter((file: any) => 
    file.file_name?.toLowerCase().includes('fixed') || 
    file.file_name?.toLowerCase().includes('evidence') ||
    file.file_name?.toLowerCase().includes('after')
  ) || [];

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 1: return 'Low';
      case 2: return 'Medium';
      case 3: return 'High';
      case 4: return 'Critical';
      default: return 'Unknown';
    }
  };

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return 'green';
      case 2: return 'orange';
      case 3: return 'red';
      case 4: return 'purple';
      default: return 'default';
    }
  };

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
              <p><strong>Reported By:</strong> {observationData?.reportedBy}</p>
            </Col>
            <Col span={12}>
              <p><strong>Severity:</strong> 
                <span style={{ 
                  marginLeft: 8, 
                  padding: '2px 8px', 
                  borderRadius: 4, 
                  backgroundColor: getSeverityColor(observationData?.severity) === 'green' ? '#f6ffed' : 
                                   getSeverityColor(observationData?.severity) === 'orange' ? '#fff7e6' :
                                   getSeverityColor(observationData?.severity) === 'red' ? '#fff2f0' : '#f9f0ff',
                  color: getSeverityColor(observationData?.severity) === 'green' ? '#52c41a' : 
                         getSeverityColor(observationData?.severity) === 'orange' ? '#fa8c16' :
                         getSeverityColor(observationData?.severity) === 'red' ? '#f5222d' : '#722ed1',
                  border: `1px solid ${getSeverityColor(observationData?.severity) === 'green' ? '#b7eb8f' : 
                                       getSeverityColor(observationData?.severity) === 'orange' ? '#ffd591' :
                                       getSeverityColor(observationData?.severity) === 'red' ? '#ffa39e' : '#d3adf7'}`
                }}>
                  {getSeverityText(observationData?.severity)}
                </span>
              </p>
              <p><strong>Status:</strong> {observationData?.observationStatus?.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Commitment Date:</strong> {observationData?.commitmentDate ? dayjs(observationData.commitmentDate).format('DD/MM/YYYY') : 'Not set'}</p>
              <p><strong>Date Created:</strong> {dayjs(observationData?.created_at).format('DD/MM/YYYY')}</p>
            </Col>
          </Row>
          
          <div style={{ marginTop: 12 }}>
            <p><strong>Observation Description:</strong></p>
            <div style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 6, marginBottom: 12 }}>
              {observationData?.safetyObservationFound}
            </div>
            
            <p><strong>Required Corrective Action:</strong></p>
            <div style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 6 }}>
              {observationData?.correctivePreventiveAction}
            </div>
          </div>
        </Card>

        {/* Response Details */}
        {observationData?.remarks && (
          <Card title="Response Details" size="small" style={{ marginBottom: 16 }}>
            <div style={{ backgroundColor: '#e6f7ff', padding: 12, borderRadius: 6, border: '1px solid #91d5ff' }}>
              <p style={{ margin: 0, color: '#0050b3' }}>
                <strong>Assigned Person's Response:</strong><br />
                {observationData.remarks}
              </p>
            </div>
          </Card>
        )}

        {/* Before Photos */}
        {beforePhotos.length > 0 && (
          <Card title="Original Observation Photos" size="small" style={{ marginBottom: 16 }}>
            <Space wrap>
              {beforePhotos.map((file: any, index: number) => (
                <div key={index} style={{ textAlign: 'center' }}>
                  <Image
                    width={150}
                    height={150}
                    src={file.file}
                    alt={`Original photo ${index + 1}`}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    preview={{
                      mask: <EyeOutlined />
                    }}
                  />
                  <p style={{ fontSize: 12, marginTop: 4, maxWidth: 150, wordBreak: 'break-all' }}>
                    {file.file_name}
                  </p>
                  <p style={{ fontSize: 10, color: '#999' }}>
                    {dayjs(file.uploaded_at).format('DD/MM/YYYY HH:mm')}
                  </p>
                </div>
              ))}
            </Space>
          </Card>
        )}

        {/* Evidence Photos */}
        {evidencePhotos.length > 0 && (
          <Card title="Evidence Photos (Corrective Action Completed)" size="small" style={{ marginBottom: 16 }}>
            <Space wrap>
              {evidencePhotos.map((file: any, index: number) => (
                <div key={index} style={{ textAlign: 'center' }}>
                  <Image
                    width={150}
                    height={150}
                    src={file.file}
                    alt={`Evidence photo ${index + 1}`}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    preview={{
                      mask: <EyeOutlined />
                    }}
                  />
                  <p style={{ fontSize: 12, marginTop: 4, maxWidth: 150, wordBreak: 'break-all' }}>
                    {file.file_name}
                  </p>
                  <p style={{ fontSize: 10, color: '#999' }}>
                    {dayjs(file.uploaded_at).format('DD/MM/YYYY HH:mm')}
                  </p>
                </div>
              ))}
            </Space>
          </Card>
        )}

        {/* Action Selection */}
        {!actionType && (
          <Card title="Review Decision" size="small" style={{ marginBottom: 16 }}>
            <p style={{ marginBottom: 16, color: '#666' }}>
              Please review the observation details, response, and evidence photos above. 
              Choose whether to approve and close the observation or reject it for revision.
            </p>
            <div style={{ textAlign: 'center' }}>
              <Space size="large">
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={showApproveConfirm}
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', minWidth: 150 }}
                >
                  Approve & Close
                </Button>
                <Button
                  danger
                  size="large"
                  icon={<CloseCircleOutlined />}
                  onClick={showRejectForm}
                  style={{ minWidth: 150 }}
                >
                  Reject for Revision
                </Button>
              </Space>
            </div>
          </Card>
        )}

        {/* Approve Confirmation */}
        {actionType === 'approve' && (
          <Card title="Approve Observation" size="small" style={{ marginBottom: 16 }}>
            <div style={{ backgroundColor: '#f6ffed', padding: 16, borderRadius: 6, border: '1px solid #b7eb8f', textAlign: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
              <p style={{ fontSize: 16, marginBottom: 16, color: '#389e0d' }}>
                <strong>Are you sure you want to approve this observation?</strong>
              </p>
              <p style={{ marginBottom: 16, color: '#666' }}>
                This will mark the observation as <strong>CLOSED</strong> and complete the workflow.
              </p>
              <Space>
                <Button onClick={cancelAction}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  loading={loading}
                  onClick={handleApprove}
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                  {loading ? 'Approving...' : 'Confirm Approval'}
                </Button>
              </Space>
            </div>
          </Card>
        )}

        {/* Reject Form */}
        {actionType === 'reject' && (
          <Card title="Reject Observation" size="small" style={{ marginBottom: 16 }}>
            <div style={{ backgroundColor: '#fff2f0', padding: 16, borderRadius: 6, border: '1px solid #ffa39e' }}>
              <Form form={form} onFinish={handleReject} layout="vertical">
                <p style={{ marginBottom: 16, color: '#cf1322' }}>
                  <strong>Rejection Reason Required</strong>
                </p>
                <p style={{ marginBottom: 16, color: '#666' }}>
                  Please provide a detailed explanation of why this observation is being rejected. 
                  This will help the assigned person understand what needs to be corrected.
                </p>
                
                <Form.Item
                  name="rejectionDescription"
                  label="Rejection Description"
                  rules={[
                    { required: true, message: 'Rejection description is required' },
                    { min: 10, message: 'Please provide a detailed explanation (at least 10 characters)' }
                  ]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Explain what needs to be corrected or improved..."
                  />
                </Form.Item>

                <div style={{ textAlign: 'right' }}>
                  <Space>
                    <Button onClick={cancelAction}>
                      Cancel
                    </Button>
                    <Button
                      danger
                      htmlType="submit"
                      loading={loading}
                      icon={<CloseCircleOutlined />}
                    >
                      {loading ? 'Rejecting...' : 'Submit Rejection'}
                    </Button>
                  </Space>
                </div>
              </Form>
            </div>
          </Card>
        )}

        {/* Close button when no action is selected */}
        {!actionType && (
          <div style={{ textAlign: 'right', borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Button onClick={onCancel}>
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ReviewApprovalModal;
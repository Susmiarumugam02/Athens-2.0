import React, { useState } from 'react';
import { Modal, Form, Select, Button, message, Card, Input, Upload, Image, Space } from 'antd';
import { MessageOutlined, UploadOutlined, CameraOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import api from '@common/utils/axiosetup';

const { Option } = Select;
const { TextArea } = Input;

interface ResponseModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  observationID: string;
  observationData: any;
}

const ResponseModal: React.FC<ResponseModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  observationID,
  observationData
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    // Reset file list when status changes
    if (value !== 'closed') {
      setFileList([]);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      if (values.status === 'closed') {
        // For closing, we need description and evidence photos
        if (!values.description) {
          message.error('Description is required when closing the observation');
          return;
        }
        if (fileList.length === 0) {
          message.error('Evidence photos are required when closing the observation');
          return;
        }

        // Upload photos and close the observation
        const formData = new FormData();
        
        // Add evidence photos
        fileList.forEach((file) => {
          if (file.originFileObj) {
            formData.append('beforePictures', file.originFileObj);
          }
        });

        // Add description as remarks
        formData.append('remarks', values.description);

        // Use the existing upload_fixed_photos endpoint which handles status change
        await api.post(`/api/v1/safetyobservation/${observationID}/upload_fixed_photos/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        message.success('Response submitted successfully! Observation sent for approval.');
      } else {
        // For other status updates, just update the status
        await api.patch(`/api/v1/safetyobservation/${observationID}/`, {
          observationStatus: values.status === 'open' ? 'open' : 'in_progress'
        });

        message.success('Observation status updated successfully!');
      }

      form.resetFields();
      setFileList([]);
      setSelectedStatus('');
      onSuccess();
      
    } catch (error: any) {
      console.error('Response submission error:', error);
      
      let errorMessage = 'Failed to submit response';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const beforeUpload = (file: any) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }

    const newFile: UploadFile = {
      uid: `evidence_${Date.now()}_${Math.random()}`,
      name: `evidence_${file.name}`,
      status: 'done',
      originFileObj: file as any,
      url: URL.createObjectURL(file),
    };

    setFileList(prev => [...prev, newFile]);
    return false; // Prevent automatic upload
  };

  const handleRemove = (file: UploadFile) => {
    setFileList(fileList.filter(item => item.uid !== file.uid));
  };

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 1: return 'Low';
      case 2: return 'Medium';
      case 3: return 'High';
      case 4: return 'Critical';
      default: return 'Unknown';
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageOutlined />
          <span>Response - {observationID}</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      style={{ top: 20 }}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Observation Summary */}
        <Card title="Observation Details" size="small" style={{ marginBottom: 16 }}>
          <p><strong>Type:</strong> {observationData?.typeOfObservation?.replace('_', ' ')}</p>
          <p><strong>Severity:</strong> {getSeverityText(observationData?.severity)}</p>
          <p><strong>Location:</strong> {observationData?.workLocation}</p>
          <p><strong>Current Status:</strong> {observationData?.observationStatus?.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Description:</strong> {observationData?.safetyObservationFound}</p>
          <p><strong>Required Action:</strong> {observationData?.correctivePreventiveAction}</p>
          
          {/* Show rejection feedback if observation was rejected */}
          {observationData?.observationStatus === 'open' && observationData?.remarks && 
           observationData?.remarks.includes('Rejection Feedback:') && (
            <div style={{ marginTop: 12, padding: 12, backgroundColor: '#fff2e8', borderRadius: 6, border: '1px solid #ffb366' }}>
              <p><strong>Previous Rejection Feedback:</strong></p>
              <p style={{ color: '#d46b08', fontStyle: 'italic' }}>
                {observationData.remarks.split('Rejection Feedback:')[1]?.trim()}
              </p>
            </div>
          )}
        </Card>

        {/* Response Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            status: observationData?.observationStatus === 'open' ? 'open' : 'in_progress'
          }}
        >
          <Card title="Update Status" size="small" style={{ marginBottom: 16 }}>
            <Form.Item
              name="status"
              label="Observation Status"
              rules={[{ required: true, message: 'Please select a status' }]}
            >
              <Select
                placeholder="Select status"
                onChange={handleStatusChange}
                size="large"
              >
                <Option value="open">Open</Option>
                <Option value="in_progress">In Progress</Option>
                <Option value="closed">Close</Option>
              </Select>
            </Form.Item>
          </Card>

          {/* Additional fields when closing */}
          {selectedStatus === 'closed' && (
            <>
              <Card title="Closure Details" size="small" style={{ marginBottom: 16 }}>
                <Form.Item
                  name="description"
                  label="Description (Required)"
                  rules={[
                    { required: true, message: 'Description is required when closing the observation' },
                    { min: 10, message: 'Description must be at least 10 characters long' }
                  ]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Describe what actions were taken to resolve the safety observation..."
                  />
                </Form.Item>
              </Card>

              <Card title="Evidence Photos (Required)" size="small" style={{ marginBottom: 16 }}>
                <Upload
                  beforeUpload={beforeUpload}
                  showUploadList={false}
                  multiple
                  accept="image/*"
                >
                  <Button icon={<UploadOutlined />} size="large" block>
                    Select Evidence Photos (Max 5MB each)
                  </Button>
                </Upload>

                {fileList.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <h4>Evidence Photos Preview:</h4>
                    <Space wrap>
                      {fileList.map((file) => (
                        <div key={file.uid} style={{ position: 'relative', textAlign: 'center' }}>
                          <Image
                            width={120}
                            height={120}
                            src={file.url}
                            alt={file.name}
                            style={{ objectFit: 'cover', borderRadius: 8 }}
                            preview={{
                              mask: <EyeOutlined />
                            }}
                          />
                          <Button
                            type="primary"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            style={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              padding: 0
                            }}
                            onClick={() => handleRemove(file)}
                          />
                          <p style={{ fontSize: 12, marginTop: 4, maxWidth: 120, wordBreak: 'break-all' }}>
                            {file.name}
                          </p>
                        </div>
                      ))}
                    </Space>
                  </div>
                )}

                {selectedStatus === 'closed' && fileList.length === 0 && (
                  <div style={{ marginTop: 12, padding: 12, backgroundColor: '#fff1f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
                    <p style={{ color: '#cf1322', margin: 0 }}>
                      <strong>Required:</strong> Please upload at least one evidence photo showing the completed corrective action.
                    </p>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* Action Buttons */}
          <div style={{ textAlign: 'right', borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Space>
              <Button onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<MessageOutlined />}
              >
                {loading ? 'Submitting...' : 'Submit Response'}
              </Button>
            </Space>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default ResponseModal;
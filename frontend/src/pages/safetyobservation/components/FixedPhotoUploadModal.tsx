import React, { useState } from 'react';
import { Modal, Upload, Button, message, Card, Image, Space, Input } from 'antd';
import { UploadOutlined, CameraOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import api from '@common/utils/axiosetup';

interface FixedPhotoUploadModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  observationID: string;
  observationDetails: {
    typeOfObservation: string;
    severity: number;
    workLocation: string;
    safetyObservationFound: string;
    correctivePreventiveAction: string;
  };
}

const FixedPhotoUploadModal: React.FC<FixedPhotoUploadModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  observationID,
  observationDetails
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('Please upload at least one fixed photo');
      return;
    }

    try {
      setLoading(true);

      // Step 1: Upload fixed photos using dedicated endpoint
      const formData = new FormData();

      // Add fixed photos
      fileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append('beforePictures', file.originFileObj);
        }
      });

      // Add completion notes if provided
      if (completionNotes) {
        formData.append('remarks', completionNotes);
      }

      // Upload fixed photos using dedicated endpoint (includes status change and notification)
      await api.post(`/api/v1/safetyobservation/${observationID}/upload_fixed_photos/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      message.success('Fixed photos uploaded and approval requested successfully!');
      setFileList([]);
      setCompletionNotes('');
      onSuccess();

    } catch (error: any) {

      // Show detailed error message
      let errorMessage = 'Failed to upload fixed photos';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else {
          // Show validation errors
          const errors = Object.entries(error.response.data)
            .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          errorMessage = `Validation errors: ${errors}`;
        }
      }

      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (file: UploadFile) => {
    setFileList(fileList.filter(item => item.uid !== file.uid));
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

    // Create a new file with "fixed_" prefix
    const newFile: UploadFile = {
      uid: `fixed_${Date.now()}_${Math.random()}`,
      name: `fixed_${file.name}`,
      status: 'done',
      originFileObj: file as any,
      url: URL.createObjectURL(file),
    };

    setFileList(prev => [...prev, newFile]);
    return false; // Prevent automatic upload
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
          <CameraOutlined />
          <span>Upload Fixed Photos - {observationID}</span>
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
        <Card title="Observation Summary" size="small" style={{ marginBottom: 16 }}>
          <p><strong>Type:</strong> {observationDetails.typeOfObservation?.replace('_', ' ')}</p>
          <p><strong>Severity:</strong> {getSeverityText(observationDetails.severity)}</p>
          <p><strong>Location:</strong> {observationDetails.workLocation}</p>
          <p><strong>Issue:</strong> {observationDetails.safetyObservationFound}</p>
          <p><strong>Action Taken:</strong> {observationDetails.correctivePreventiveAction}</p>
        </Card>

        {/* Photo Upload Section */}
        <Card title="Upload Fixed Photos" size="small" style={{ marginBottom: 16 }}>
          <Upload
            beforeUpload={beforeUpload}
            showUploadList={false}
            multiple
            accept="image/*"
          >
            <Button icon={<UploadOutlined />} size="large" block>
              Select Fixed Photos (Max 5MB each)
            </Button>
          </Upload>

          {/* Preview uploaded photos */}
          {fileList.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4>Fixed Photos Preview:</h4>
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
        </Card>

        {/* Completion Notes */}
        <Card title="Completion Notes (Optional)" size="small" style={{ marginBottom: 16 }}>
          <Input.TextArea
            rows={3}
            placeholder="Describe what was fixed and any additional notes..."
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
          />
        </Card>

        {/* Action Buttons */}
        <div style={{ textAlign: 'right', borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <Space>
            <Button onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<CameraOutlined />}
              onClick={handleUpload}
              loading={loading}
              disabled={fileList.length === 0}
            >
              {loading ? 'Uploading...' : 'Upload & Request Approval'}
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default FixedPhotoUploadModal;

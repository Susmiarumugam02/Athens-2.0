import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  Upload,
  Space,
  Steps,
  Row,
  Col,
  message,
  Switch,
  Tag,
  Typography,
  Alert,
} from 'antd';
import {
  CameraOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
  AudioOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { IncidentFormData, INCIDENT_TYPES, SEVERITY_LEVELS } from '../types';
import api from '../services/api';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface MobileReportPageProps {
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

const MobileReportPage: React.FC<MobileReportPageProps> = ({
  onSubmitSuccess,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<IncidentFormData>>({});
  const [photos, setPhotos] = useState<any[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [useOfflineMode, setUseOfflineMode] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const steps = [
    {
      title: 'Basic Info',
      icon: <ExclamationCircleOutlined />,
      description: 'What happened?',
    },
    {
      title: 'Details',
      icon: <EnvironmentOutlined />,
      description: 'When & where?',
    },
    {
      title: 'Evidence',
      icon: <CameraOutlined />,
      description: 'Photos & witnesses',
    },
    {
      title: 'Submit',
      icon: <SendOutlined />,
      description: 'Review & send',
    },
  ];

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          message.success('Location captured successfully');
        },
        (error) => {
          message.error('Failed to get location: ' + error.message);
        }
      );
    } else {
      message.error('Geolocation is not supported by this browser');
    }
  };

  // Handle photo upload
  const handlePhotoUpload = (info: any) => {
    if (info.file.status === 'done') {
      setPhotos([...photos, info.file]);
      message.success('Photo uploaded successfully');
    } else if (info.file.status === 'error') {
      message.error('Photo upload failed');
    }
  };

  // Handle form submission
  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const reportData = {
        ...formData,
        ...values,
        location: location ? `${location.lat},${location.lng}` : undefined,
        photos: photos.map(photo => photo.response?.url || photo.url),
        audio_note: audioBlob ? await convertBlobToBase64(audioBlob) : undefined,
        reported_via: 'mobile',
        occurred_at: values.occurred_at?.toISOString(),
      };

      if (useOfflineMode) {
        // Store in localStorage for offline sync
        const offlineReports = JSON.parse(localStorage.getItem('offlineIncidentReports') || '[]');
        offlineReports.push({
          ...reportData,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem('offlineIncidentReports', JSON.stringify(offlineReports));
        message.success('Report saved offline. Will sync when connection is restored.');
      } else {
        await api.incidents.quickMobileReport(reportData);
        message.success('Incident reported successfully');
      }

      form.resetFields();
      setPhotos([]);
      setAudioBlob(null);
      setLocation(null);
      onSubmitSuccess?.();
    } catch (error) {
      message.error('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return (
    <Card
      title="Mobile Incident Report"
      style={{ margin: 16 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          severity_level: 'medium',
        }}
      >
        {/* Offline Mode Toggle */}
        <Row style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Space>
              <Switch
                checked={useOfflineMode}
                onChange={setUseOfflineMode}
              />
              <span>Offline Mode</span>
              {useOfflineMode && (
                <Tag color="orange">Report will be saved locally</Tag>
              )}
            </Space>
          </Col>
        </Row>

        {/* Basic Information */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="title"
              label="Incident Title"
              rules={[{ required: true, message: 'Please enter incident title' }]}
            >
              <Input
                placeholder="Brief description of what happened"
                maxLength={200}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="incident_type"
              label="Incident Type"
              rules={[{ required: true, message: 'Please select incident type' }]}
            >
              <Select placeholder="Select type">
                {INCIDENT_TYPES.map(type => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="severity_level"
              label="Severity Level"
              rules={[{ required: true, message: 'Please select severity' }]}
            >
              <Select placeholder="Select severity">
                {SEVERITY_LEVELS.map(level => (
                  <Option key={level.value} value={level.value}>
                    {level.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: 'Please describe the incident' }]}
            >
              <TextArea
                rows={4}
                placeholder="Describe what happened in detail..."
                maxLength={1000}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Location and Time */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="location"
              label="Location"
              rules={[{ required: true, message: 'Please enter location' }]}
            >
              <Input
                placeholder="Where did this happen?"
                suffix={
                  <Button
                    type="text"
                    icon={<EnvironmentOutlined />}
                    onClick={getCurrentLocation}
                    size="small"
                  />
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="occurred_at"
              label="When did it happen?"
              rules={[{ required: true, message: 'Please select date and time' }]}
            >
              <DatePicker
                showTime
                style={{ width: '100%' }}
                placeholder="Select date and time"
                defaultValue={dayjs()}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Location Status */}
        {location && (
          <Alert
            message="Location Captured"
            description={`Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`}
            type="success"
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Photo Upload */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Photos (Optional)">
              <Upload
                listType="picture-card"
                fileList={photos}
                onChange={handlePhotoUpload}
                beforeUpload={() => false} // Prevent auto upload
                accept="image/*"
                capture="environment" // Use rear camera on mobile
              >
                {photos.length < 5 && (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>Upload Photo</div>
                  </div>
                )}
              </Upload>
            </Form.Item>
          </Col>
        </Row>

        {/* Witnesses */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="witnesses"
              label="Witnesses (Optional)"
            >
              <TextArea
                rows={2}
                placeholder="Names and contact details of any witnesses..."
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Immediate Actions */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="immediate_actions"
              label="Immediate Actions Taken"
            >
              <TextArea
                rows={3}
                placeholder="What immediate actions were taken to secure the area or help injured persons?"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Submit Button */}
        <Row>
          <Col span={24} style={{ textAlign: 'center' }}>
            <Space>
              {onCancel && (
                <Button onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<SendOutlined />}
                size="large"
              >
                {useOfflineMode ? 'Save Offline' : 'Submit Report'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default MobileReportPage;

import React, { useState } from 'react';
import { Form, Input, Select, DatePicker, TimePicker, Button, Card, Row, Col, App } from 'antd';
import { BugOutlined, SaveOutlined } from '@ant-design/icons';
import { createBiodiversityEvent } from '../services/esgAPI';
import { useAuthStore } from '../../../store/authStore';

const { Option } = Select;
const { TextArea } = Input;

interface BiodiversityEventFormProps {
  onSuccess?: () => void;
  initialData?: BiodiversityEvent | null;
}

const BiodiversityEventForm: React.FC<BiodiversityEventFormProps> = ({ onSuccess, initialData }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const eventTypes = [
    'Bird Strike',
    'Bat Strike',
    'Wildlife Sighting',
    'Habitat Disturbance',
    'Vegetation Impact',
    'Noise Impact',
    'Other'
  ];

  const severityLevels = [
    'Low',
    'Medium',
    'High',
    'Critical'
  ];

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const { projectId } = useAuthStore.getState();
      const formData = {
        species: values.species || values.event_type,
        date: values.event_date?.format('YYYY-MM-DD'),
        time: values.event_time?.format('HH:mm:ss'),
        location_geo: values.location,
        severity: severityLevels.indexOf(values.severity) + 1,
        actions_taken: values.mitigation_actions || values.description,
        site: projectId!
      };
      
      await createBiodiversityEvent(formData);
      message.success('Biodiversity event recorded successfully');
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      message.error('Failed to record biodiversity event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={<><BugOutlined /> Report Biodiversity Event</>}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="event_type"
              label="Event Type"
              rules={[{ required: true, message: 'Please select event type' }]}
            >
              <Select placeholder="Select event type">
                {eventTypes.map(type => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="severity"
              label="Severity Level"
              rules={[{ required: true, message: 'Please select severity level' }]}
            >
              <Select placeholder="Select severity level">
                {severityLevels.map(level => (
                  <Option key={level} value={level}>{level}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="event_date"
              label="Event Date"
              rules={[{ required: true, message: 'Please select event date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="event_time"
              label="Event Time"
              rules={[{ required: true, message: 'Please select event time' }]}
            >
              <TimePicker style={{ width: '100%' }} format="HH:mm" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="location"
              label="Location"
              rules={[{ required: true, message: 'Please enter location' }]}
            >
              <Input placeholder="Enter specific location (e.g., Turbine T-15, Access Road)" />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="species"
              label="Species"
              rules={[{ required: true, message: 'Please enter species or event type' }]}
            >
              <Input placeholder="Enter species name or event type" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Event Description"
          rules={[{ required: true, message: 'Please provide event description' }]}
        >
          <TextArea
            rows={4}
            placeholder="Describe the biodiversity event in detail, including circumstances, weather conditions, and any immediate actions taken"
          />
        </Form.Item>

        <Form.Item
          name="mitigation_actions"
          label="Mitigation Actions Taken"
        >
          <TextArea
            rows={3}
            placeholder="Describe any immediate mitigation actions taken or planned"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
          >
            Record Biodiversity Event
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default BiodiversityEventForm;
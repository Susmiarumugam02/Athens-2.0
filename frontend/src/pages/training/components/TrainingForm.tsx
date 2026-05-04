import React, { useState } from 'react';
import { Form, Input, Select, DatePicker, Button, Card, Row, Col, Radio, Space, message } from 'antd';
import { apiClient } from '../../../lib/api';

const { Option } = Select;
const { TextArea } = Input;

interface TrainingFormProps {
  trainingId?: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TrainingForm: React.FC<TrainingFormProps> = ({ trainingId, onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [trainingType, setTrainingType] = useState('induction');

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        training_date: values.training_date?.format('YYYY-MM-DD'),
        // Map frontend fields to TBT API fields
        title: values.title,
        conducted_by: values.trainer,
        location: values.location,
        date: values.training_date?.format('YYYY-MM-DD'),
        // status is not included - backend will apply default='planned'
      };
      if (trainingId) {
        await apiClient.patch(`/api/tbt/update/${trainingId}/`, payload);
        message.success('Training updated successfully');
      } else {
        await apiClient.post('/api/tbt/create/', payload);
        message.success('Training created successfully');
      }
      form.resetFields();
      onSuccess?.();
    } catch (error: any) {
      const data = error?.response?.data;
      const msg = typeof data === 'object'
        ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        : 'Failed to save training.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ training_type: 'induction' }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="training_type"
              label="Training Type"
              rules={[{ required: true, message: 'Please select training type' }]}
            >
              <Radio.Group onChange={(e) => setTrainingType(e.target.value)}>
                <Radio.Button value="induction">Induction Training</Radio.Button>
                <Radio.Button value="job">Job Training</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="title"
              label="Training Title"
              rules={[{ required: true, message: 'Please enter title' }]}
            >
              <Input placeholder="Enter training title" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="training_date"
              label="Training Date"
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="trainer"
              label="Trainer"
              rules={[{ required: true, message: 'Please enter trainer name' }]}
            >
              <Input placeholder="Enter trainer name" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="location"
              label="Location"
              rules={[{ required: true, message: 'Please enter location' }]}
            >
              <Input placeholder="Enter location" />
            </Form.Item>
          </Col>
        </Row>

        {trainingType === 'job' && (
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="job_role"
                label="Job Role"
                rules={[{ required: true, message: 'Please enter job role' }]}
              >
                <Input placeholder="Enter job role" />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea rows={4} placeholder="Enter training description" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {trainingId ? 'Update' : 'Create'} Training
            </Button>
            <Button onClick={onCancel}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TrainingForm;

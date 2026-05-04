import React, { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Button, Card, Row, Col, Checkbox, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import TextArea from 'antd/es/input/TextArea';
import { useAuthStore } from '../../../store/authStore';
import { createPermit, updatePermit, getPermitTypes, getPermit } from '../api';

const { Option } = Select;

const SimplePermitForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const [loading, setLoading] = useState(false);
  const [permitTypes, setPermitTypes] = useState<any[]>([]);

  useEffect(() => {
    loadPermitTypes();
    if (isEditing && id) {
      loadPermit(parseInt(id));
    } else {
      form.setFieldsValue({ 
        permit_number: `PTW-${Date.now()}`,
        work_nature: 'day'
      });
    }
  }, [id]);

  const loadPermitTypes = async () => {
    try {
      const response = await getPermitTypes();
      setPermitTypes(response.data?.results || response.data || []);
    } catch (error) {
      setPermitTypes([
        { id: 1, name: 'Hot Work' },
        { id: 5, name: 'Confined Space' },
        { id: 7, name: 'Electrical Work' },
        { id: 10, name: 'Work at Height' }
      ]);
    }
  };

  const loadPermit = async (permitId: number) => {
    try {
      const response = await getPermit(permitId);
      const permit = response.data;
      form.setFieldsValue({
        ...permit,
        planned_start_time: permit.planned_start_time ? dayjs(permit.planned_start_time) : null,
        planned_end_time: permit.planned_end_time ? dayjs(permit.planned_end_time) : null,
      });
    } catch (error) {
      message.error('Failed to load permit');
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const submitData = {
        ...values,
        permit_type: Number(values.permit_type),
        planned_start_time: values.planned_start_time?.toISOString(),
        planned_end_time: values.planned_end_time?.toISOString(),
        probability: Number(values.probability) || 1,
        severity: Number(values.severity) || 1,
        ppe_requirements: values.ppe_requirements || [],
        safety_checklist: values.safety_checklist || {},
      };

      if (isEditing) {
        await updatePermit(parseInt(id!), submitData);
        message.success('Permit updated successfully');
      } else {
        await createPermit(submitData);
        message.success('Permit created successfully');
      }
      
      setTimeout(() => navigate('/app/ptw'), 1000);
    } catch (error: any) {
      message.error(error?.response?.data?.detail || 'Failed to save permit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEditing ? 'Edit' : 'Create'} Permit to Work</h1>
      
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Card title="Basic Information" className="mb-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="permit_number" label="Permit Number" rules={[{ required: true }]}>
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="permit_type" label="Permit Type" rules={[{ required: true }]}>
                <Select placeholder="Select permit type">
                  {permitTypes.map(type => (
                    <Option key={type.id} value={type.id}>{type.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Work Description" rules={[{ required: true, min: 10 }]}>
            <TextArea rows={3} placeholder="Describe the work to be performed" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="location" label="Location" rules={[{ required: true }]}>
                <Input placeholder="Work location" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="work_nature" label="Work Nature" rules={[{ required: true }]}>
                <Select>
                  <Option value="day">Day Work</Option>
                  <Option value="night">Night Work</Option>
                  <Option value="both">Day & Night</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="planned_start_time" label="Start Time" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="planned_end_time" label="End Time" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Risk Assessment" className="mb-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="probability" label="Probability (1-5)" rules={[{ required: true }]}>
                <Select>
                  <Option value={1}>1 - Rare</Option>
                  <Option value={2}>2 - Unlikely</Option>
                  <Option value={3}>3 - Possible</Option>
                  <Option value={4}>4 - Likely</Option>
                  <Option value={5}>5 - Almost Certain</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="severity" label="Severity (1-5)" rules={[{ required: true }]}>
                <Select>
                  <Option value={1}>1 - Insignificant</Option>
                  <Option value={2}>2 - Minor</Option>
                  <Option value={3}>3 - Moderate</Option>
                  <Option value={4}>4 - Major</Option>
                  <Option value={5}>5 - Catastrophic</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="control_measures" label="Control Measures" rules={[{ required: true, min: 10 }]}>
            <TextArea rows={3} placeholder="Describe control measures" />
          </Form.Item>
        </Card>

        <Card title="Safety Requirements" className="mb-4">
          <Form.Item name="ppe_requirements" label="PPE Requirements" rules={[{ required: true }]}>
            <Select mode="tags" placeholder="Select or add PPE">
              <Option value="helmet">Safety Helmet</Option>
              <Option value="gloves">Safety Gloves</Option>
              <Option value="shoes">Safety Shoes</Option>
              <Option value="goggles">Safety Goggles</Option>
              <Option value="harness">Fall Protection</Option>
            </Select>
          </Form.Item>
          <Form.Item name="special_instructions" label="Special Instructions">
            <TextArea rows={2} placeholder="Any special safety instructions" />
          </Form.Item>
        </Card>

        <div className="flex justify-end gap-2">
          <Button onClick={() => navigate('/app/ptw')}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEditing ? 'Update' : 'Create'} Permit
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default SimplePermitForm;

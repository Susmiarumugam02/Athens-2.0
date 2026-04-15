import React, { useState } from 'react';
import { Form, Input, Select, DatePicker, TimePicker, Button, Card, Checkbox, message, Space, Row, Col } from 'antd';
import { SaveOutlined, ClearOutlined, EnvironmentOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;

interface EnhancedSafetyObservationFormProps {
  onSuccess?: () => void;
}

const SafetyObservationFormEnhanced: React.FC<EnhancedSafetyObservationFormProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isEnvironmental, setIsEnvironmental] = useState(false);

  const environmentalIncidentTypes = [
    { value: 'spill', label: 'Spill' },
    { value: 'emission_exceedance', label: 'Emission Exceedance' },
    { value: 'bird_strike', label: 'Bird Strike' },
    { value: 'waste_violation', label: 'Waste Violation' },
    { value: 'water_contamination', label: 'Water Contamination' },
    { value: 'noise_violation', label: 'Noise Violation' },
  ];

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const formData = {
        ...values,
        is_environmental: isEnvironmental,
        env_incident_type: isEnvironmental ? values.env_incident_type : null,
      };

      // Call your existing safety observation API
      // await createSafetyObservation(formData);
      
      message.success('Safety observation created successfully');
      form.resetFields();
      setIsEnvironmental(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating safety observation:', error);
      message.error('Failed to create safety observation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      title="Enhanced Safety Observation Form" 
      extra={isEnvironmental && <EnvironmentOutlined style={{ color: '#52c41a' }} />}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="reportedBy"
              label="Reported By"
              rules={[{ required: true, message: 'Please enter reporter name' }]}
            >
              <Input placeholder="Enter reporter name" />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="department"
              label="Department"
              rules={[{ required: true, message: 'Please enter department' }]}
            >
              <Input placeholder="Enter department" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="workLocation"
              label="Work Location"
              rules={[{ required: true, message: 'Please enter work location' }]}
            >
              <Input placeholder="Enter work location" />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="activityPerforming"
              label="Activity Performing"
              rules={[{ required: true, message: 'Please enter activity' }]}
            >
              <Input placeholder="Enter activity being performed" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="safetyObservationFound"
          label="Safety Observation Description"
          rules={[{ required: true, message: 'Please describe the observation' }]}
        >
          <TextArea 
            rows={4} 
            placeholder="Describe the safety observation in detail"
          />
        </Form.Item>

        {/* Environmental Section */}
        <Card 
          size="small" 
          title="Environmental Assessment" 
          style={{ marginBottom: 16, backgroundColor: isEnvironmental ? '#f6ffed' : '#fafafa' }}
        >
          <Form.Item name="is_environmental" valuePropName="checked">
            <Checkbox 
              onChange={(e) => setIsEnvironmental(e.target.checked)}
              style={{ fontWeight: 'bold' }}
            >
              <EnvironmentOutlined style={{ marginRight: 4 }} />
              This is an Environmental Observation
            </Checkbox>
          </Form.Item>

          {isEnvironmental && (
            <Form.Item
              name="env_incident_type"
              label="Environmental Incident Type"
              rules={[{ required: true, message: 'Please select environmental incident type' }]}
            >
              <Select placeholder="Select environmental incident type">
                {environmentalIncidentTypes.map(type => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Card>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="severity"
              label="Severity"
              rules={[{ required: true, message: 'Please select severity' }]}
            >
              <Select placeholder="Select severity">
                <Option value={1}>Low</Option>
                <Option value={2}>Medium</Option>
                <Option value={3}>High</Option>
                <Option value={4}>Critical</Option>
              </Select>
            </Form.Item>
          </Col>
          
          <Col span={8}>
            <Form.Item
              name="likelihood"
              label="Likelihood"
              rules={[{ required: true, message: 'Please select likelihood' }]}
            >
              <Select placeholder="Select likelihood">
                <Option value={1}>Rare</Option>
                <Option value={2}>Possible</Option>
                <Option value={3}>Likely</Option>
                <Option value={4}>Certain</Option>
              </Select>
            </Form.Item>
          </Col>
          
          <Col span={8}>
            <Form.Item
              name="typeOfObservation"
              label="Observation Type"
              rules={[{ required: true, message: 'Please select observation type' }]}
            >
              <Select placeholder="Select type">
                <Option value="unsafe_act">Unsafe Act</Option>
                <Option value="unsafe_condition">Unsafe Condition</Option>
                <Option value="safe_act">Safe Act</Option>
                <Option value="near_miss">Near Miss</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="correctivePreventiveAction"
          label="Corrective/Preventive Action"
          rules={[{ required: true, message: 'Please enter corrective action' }]}
        >
          <TextArea 
            rows={3} 
            placeholder="Describe the corrective or preventive action required"
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<SaveOutlined />}
            >
              Submit Observation
            </Button>
            <Button 
              onClick={() => {
                form.resetFields();
                setIsEnvironmental(false);
              }}
              icon={<ClearOutlined />}
            >
              Reset
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SafetyObservationFormEnhanced;
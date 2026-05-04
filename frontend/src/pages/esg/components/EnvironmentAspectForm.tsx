import React, { useState } from 'react';
import { Form, Input, Select, InputNumber, Button, Card, Space, App } from 'antd';
import { SaveOutlined, ClearOutlined } from '@ant-design/icons';
import { EnvironmentAspect } from '../types';
import { createEnvironmentAspect, updateEnvironmentAspect } from '../services/esgAPI';
import { useAuthStore } from '../../../store/authStore';

const { TextArea } = Input;
const { Option } = Select;

interface EnvironmentAspectFormProps {
  onSuccess?: () => void;
  initialData?: EnvironmentAspect | null;
}

const EnvironmentAspectForm: React.FC<EnvironmentAspectFormProps> = ({ onSuccess, initialData }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Set initial values when initialData changes
  React.useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        aspect_type: initialData.aspect_type,
        description: initialData.description,
        severity: initialData.severity,
        likelihood: initialData.likelihood,
        controls: initialData.controls?.join('\n') || ''
      });
    } else {
      form.resetFields();
    }
  }, [initialData, form]);

  const aspectTypes = [
    { value: 'energy', label: 'Energy Consumption' },
    { value: 'water', label: 'Water Usage' },
    { value: 'waste', label: 'Waste Generation' },
    { value: 'emissions', label: 'Air Emissions' },
    { value: 'biodiversity', label: 'Biodiversity Impact' },
    { value: 'noise', label: 'Noise Pollution' },
    { value: 'land_use', label: 'Land Use' },
  ];

  const severityOptions = [
    { value: 1, label: 'Low' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'High' },
    { value: 4, label: 'Critical' },
  ];

  const likelihoodOptions = [
    { value: 1, label: 'Rare' },
    { value: 2, label: 'Possible' },
    { value: 3, label: 'Likely' },
    { value: 4, label: 'Certain' },
  ];

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const { projectId } = useAuthStore.getState();
      
      const aspectData: EnvironmentAspect = {
        aspect_type: values.aspect_type,
        description: values.description,
        severity: values.severity,
        likelihood: values.likelihood,
        controls: values.controls ? values.controls.split('\n').filter((c: string) => c.trim()) : [],
        site: projectId!,
      };

      if (initialData?.id) {
        await updateEnvironmentAspect(initialData.id, aspectData);
        message.success('Environment aspect updated successfully');
      } else {
        await createEnvironmentAspect(aspectData);
        message.success('Environment aspect created successfully');
      }
      
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      message.error('Failed to save environment aspect');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
  };

  return (
    <Card title="Environment Aspect Assessment">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          name="aspect_type"
          label="Aspect Type"
          rules={[{ required: true, message: 'Please select aspect type' }]}
        >
          <Select placeholder="Select aspect type">
            {aspectTypes.map(type => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: 'Please enter description' }]}
        >
          <TextArea 
            rows={3} 
            placeholder="Describe the environmental aspect in detail"
          />
        </Form.Item>

        <Form.Item
          name="severity"
          label="Severity"
          rules={[{ required: true, message: 'Please select severity' }]}
        >
          <Select placeholder="Select severity level">
            {severityOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="likelihood"
          label="Likelihood"
          rules={[{ required: true, message: 'Please select likelihood' }]}
        >
          <Select placeholder="Select likelihood">
            {likelihoodOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="controls"
          label="Control Measures"
          help="Enter each control measure on a new line"
        >
          <TextArea 
            rows={4} 
            placeholder="List control measures (one per line)"
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
              {initialData ? 'Update Aspect' : 'Save Aspect'}
            </Button>
            <Button 
              onClick={handleReset}
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

export default EnvironmentAspectForm;
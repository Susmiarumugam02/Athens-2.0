import React, { useState } from 'react';
import { Form, Input, Select, InputNumber, DatePicker, Button, Card, Space, App } from 'antd';
import { SaveOutlined, ClearOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { GenerationData } from '../types';
import { createGenerationData } from '../services/esgAPI';
import { useAuthStore } from '../../../store/authStore';

const { Option } = Select;

interface GenerationDataFormProps {
  onSuccess?: () => void;
  initialData?: GenerationData | null;
}

const GenerationDataForm: React.FC<GenerationDataFormProps> = ({ onSuccess, initialData }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const assetTypes = [
    { value: 'wind', label: 'Wind Turbine' },
    { value: 'solar', label: 'Solar Panel' },
    { value: 'battery', label: 'Battery Storage' },
    { value: 'grid', label: 'Grid Connection' },
  ];

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const { projectId } = useAuthStore.getState();
      
      const generationData: GenerationData = {
        asset_id: values.asset_id,
        asset_type: values.asset_type,
        timestamp: values.timestamp.toISOString(),
        kwh: values.kwh,
        source_tag: values.source_tag || '',
        imported_via: 'manual',
        site: projectId!,
      };

      await createGenerationData(generationData);
      message.success('Generation data recorded successfully');
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      message.error('Failed to record generation data');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
  };

  return (
    <Card 
      title={
        <span>
          <ThunderboltOutlined style={{ marginRight: 8 }} />
          Energy Generation Data
        </span>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        initialValues={initialData ? {
          asset_id: initialData.asset_id,
          asset_type: initialData.asset_type,
          timestamp: dayjs(initialData.timestamp),
          kwh: initialData.kwh,
          source_tag: initialData.source_tag
        } : {
          timestamp: dayjs(),
        }}
      >
        <Form.Item
          name="asset_id"
          label="Asset ID"
          rules={[{ required: true, message: 'Please enter asset ID' }]}
        >
          <Input placeholder="e.g., WTG-01, Solar-Block-A" />
        </Form.Item>

        <Form.Item
          name="asset_type"
          label="Asset Type"
          rules={[{ required: true, message: 'Please select asset type' }]}
        >
          <Select placeholder="Select asset type">
            {assetTypes.map(type => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="timestamp"
          label="Date & Time"
          rules={[{ required: true, message: 'Please select date and time' }]}
        >
          <DatePicker 
            showTime 
            style={{ width: '100%' }}
            format="YYYY-MM-DD HH:mm:ss"
          />
        </Form.Item>

        <Form.Item
          name="kwh"
          label="Energy Generated (kWh)"
          rules={[
            { required: true, message: 'Please enter energy generated' },
            { type: 'number', min: 0, message: 'Value must be positive' }
          ]}
        >
          <InputNumber 
            style={{ width: '100%' }}
            placeholder="Enter kWh generated"
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          name="source_tag"
          label="Source Tag (Optional)"
        >
          <Input placeholder="SCADA tag or meter reference" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<SaveOutlined />}
            >
              Record Data
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

export default GenerationDataForm;
import React, { useState } from 'react';
import { Form, Input, Select, Switch, Upload, Button, Card, Space, App, Row, Col } from 'antd';
import { SaveOutlined, ClearOutlined, UploadOutlined } from '@ant-design/icons';
import { Grievance } from '../types';
import { createGrievance } from '../services/esgAPI';
import { useAuthStore } from '../../../store/authStore';

const { TextArea } = Input;
const { Option } = Select;

interface GrievanceFormProps {
  onSuccess?: () => void;
  initialData?: Grievance | null;
}

const GrievanceForm: React.FC<GrievanceFormProps> = ({ onSuccess, initialData }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const sourceOptions = [
    { value: 'employee', label: 'Employee' },
    { value: 'contractor', label: 'Contractor' },
    { value: 'community', label: 'Community Member' },
    { value: 'customer', label: 'Customer' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'anonymous', label: 'Anonymous' },
  ];

  const typeOptions = [
    { value: 'workplace_safety', label: 'Workplace Safety' },
    { value: 'environmental', label: 'Environmental' },
    { value: 'discrimination', label: 'Discrimination' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'corruption', label: 'Corruption' },
    { value: 'human_rights', label: 'Human Rights' },
    { value: 'labor_practices', label: 'Labor Practices' },
    { value: 'other', label: 'Other' },
  ];

  React.useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        source: initialData.source,
        type: initialData.type,
        description: initialData.description,
        anonymous_flag: initialData.anonymous_flag
      });
    } else {
      form.resetFields();
    }
  }, [initialData, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const { projectId } = useAuthStore.getState();
      
      const grievanceData: Grievance = {
        source: values.source,
        type: values.type,
        description: values.description,
        anonymous_flag: values.anonymous_flag || false,
        status: 'open',
        evidence_ids: [], // Handle file uploads separately if needed
        site: projectId!,
      };

      await createGrievance(grievanceData);
      message.success('Grievance reported successfully');
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating grievance:', error);
      message.error('Failed to report grievance');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
  };

  return (
    <Card title="Report Grievance">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="source"
              label="Reporter Type"
              rules={[{ required: true, message: 'Please select reporter type' }]}
            >
              <Select placeholder="Select reporter type">
                {sourceOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="type"
              label="Grievance Type"
              rules={[{ required: true, message: 'Please select grievance type' }]}
            >
              <Select placeholder="Select grievance type">
                {typeOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Grievance Description"
          rules={[
            { required: true, message: 'Please provide grievance description' },
            { min: 20, message: 'Description must be at least 20 characters' }
          ]}
        >
          <TextArea
            rows={6}
            placeholder="Please provide detailed description of the grievance including date, time, location, people involved, and specific concerns..."
          />
        </Form.Item>

        <Form.Item
          name="anonymous_flag"
          label="Anonymous Report"
          valuePropName="checked"
        >
          <Switch 
            checkedChildren="Anonymous" 
            unCheckedChildren="Identified"
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
            Enable this if you want to report anonymously
          </div>
        </Form.Item>

        <Form.Item
          name="evidence"
          label="Supporting Evidence"
          help="Upload any supporting documents, photos, or files (Optional)"
        >
          <Upload
            beforeUpload={() => false}
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            maxCount={5}
          >
            <Button icon={<UploadOutlined />}>Select Files</Button>
          </Upload>
        </Form.Item>

        <div style={{ 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f', 
          borderRadius: 6, 
          padding: 12, 
          marginBottom: 16 
        }}>
          <strong>Confidentiality Notice:</strong> All grievances are treated with strict confidentiality. 
          We are committed to investigating all reports fairly and taking appropriate action to address concerns.
        </div>

        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<SaveOutlined />}
            >
              {initialData ? 'Update Grievance' : 'Submit Grievance'}
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

export default GrievanceForm;
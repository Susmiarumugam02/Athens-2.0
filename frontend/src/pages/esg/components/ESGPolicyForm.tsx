import React, { useState } from 'react';
import { Form, Input, Select, DatePicker, Upload, Button, Card, Space, App, Row, Col } from 'antd';
import { SaveOutlined, ClearOutlined, UploadOutlined } from '@ant-design/icons';
import { ESGPolicy } from '../types';
import { createESGPolicy } from '../services/esgAPI';
import { useAuthStore } from '../../../store/authStore';

const { TextArea } = Input;
const { Option } = Select;

interface ESGPolicyFormProps {
  onSuccess?: () => void;
  initialData?: ESGPolicy | null;
}

const ESGPolicyForm: React.FC<ESGPolicyFormProps> = ({ onSuccess, initialData }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'archived', label: 'Archived' },
  ];

  const isoClauseOptions = [
    'ISO 14001:2015 - 4.1 Understanding the organization',
    'ISO 14001:2015 - 4.2 Understanding stakeholder needs',
    'ISO 14001:2015 - 5.1 Leadership and commitment',
    'ISO 14001:2015 - 6.1 Actions to address risks',
    'ISO 45001:2018 - 5.1 Leadership and commitment',
    'ISO 45001:2018 - 6.1 Actions to address risks',
    'BRSR - Principle 1: Ethics and Transparency',
    'BRSR - Principle 2: Product Lifecycle Sustainability',
    'BRSR - Principle 6: Environment',
  ];

  React.useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        title: initialData.title,
        version: initialData.version,
        status: initialData.status,
        effective_date: initialData.effective_date,
        mapped_iso_clauses: initialData.mapped_iso_clauses
      });
    } else {
      form.resetFields();
    }
  }, [initialData, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('version', values.version);
      formData.append('status', values.status);
      formData.append('effective_date', values.effective_date.format('YYYY-MM-DD'));
      formData.append('mapped_iso_clauses', JSON.stringify(values.mapped_iso_clauses || []));
      
      if (values.document && values.document.fileList.length > 0) {
        formData.append('document', values.document.fileList[0].originFileObj);
      }

      await createESGPolicy(formData);
      message.success('ESG policy created successfully');
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating ESG policy:', error);
      message.error('Failed to create ESG policy');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
  };

  return (
    <Card title="ESG Policy Information">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="title"
              label="Policy Title"
              rules={[{ required: true, message: 'Please enter policy title' }]}
            >
              <Input placeholder="e.g., Environmental Management Policy" />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="version"
              label="Version"
              rules={[{ required: true, message: 'Please enter version' }]}
            >
              <Input placeholder="e.g., v1.0" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select placeholder="Select policy status">
                {statusOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="effective_date"
              label="Effective Date"
              rules={[{ required: true, message: 'Please select effective date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="mapped_iso_clauses"
          label="Mapped ISO Clauses"
          help="Select applicable ISO standards and clauses"
        >
          <Select
            mode="multiple"
            placeholder="Select ISO clauses"
            style={{ width: '100%' }}
          >
            {isoClauseOptions.map(clause => (
              <Option key={clause} value={clause}>
                {clause}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="document"
          label="Policy Document"
          help="Upload policy document (PDF, DOC, DOCX)"
        >
          <Upload
            beforeUpload={() => false}
            accept=".pdf,.doc,.docx"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<SaveOutlined />}
            >
              {initialData ? 'Update Policy' : 'Create Policy'}
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

export default ESGPolicyForm;
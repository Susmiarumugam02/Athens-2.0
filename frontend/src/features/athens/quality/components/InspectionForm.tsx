import React, { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Button, Card, Row, Col, InputNumber, Radio, Checkbox, App } from 'antd';
import { SaveOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getQualityTemplates, createQualityInspection, startInspection, completeInspection } from '../api';
import PageLayout from '@common/components/PageLayout';

interface InspectionFormProps {
  inspectionId?: number;
  mode?: 'create' | 'conduct';
}

const InspectionForm: React.FC<InspectionFormProps> = ({ inspectionId, mode = 'create' }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checklistResults, setChecklistResults] = useState<any>({});

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await getQualityTemplates();
      setTemplates(response.data.results || response.data);
    } catch (error) {
      message.error('UpatePro: Failed to load templates');
    }
  };

  const handleTemplateChange = (templateId: number) => {
    const template = templates.find((t: any) => t.id === templateId);
    setSelectedTemplate(template);
    
    // Initialize checklist results
    const initialResults: any = {};
    template?.checklist_items.forEach((item: any, index: number) => {
      initialResults[index] = { value: '', status: 'pending', notes: '' };
    });
    setChecklistResults(initialResults);
  };

  const handleChecklistChange = (itemIndex: number, field: string, value: any) => {
    setChecklistResults((prev: any) => ({
      ...prev,
      [itemIndex]: {
        ...prev[itemIndex],
        [field]: value
      }
    }));
  };

  const validateChecklistItem = (item: any, value: any) => {
    if (item.type === 'number' && item.tolerance) {
      const numValue = parseFloat(value);
      if (numValue < item.tolerance.min || numValue > item.tolerance.max) {
        return 'fail';
      }
    }
    if (item.type === 'select' && item.required && !value) {
      return 'fail';
    }
    return 'pass';
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (mode === 'create') {
        await createQualityInspection({
          ...values,
          template: selectedTemplate?.id,
          scheduled_date: values.scheduled_date.toISOString(),
          inspector: 1 // Current user ID
        });
        message.success('UpatePro: Quality inspection created successfully');
      } else {
        // Calculate overall result
        const failedItems = Object.values(checklistResults).filter((result: any) => result.status === 'fail');
        const overallResult = failedItems.length === 0 ? 'pass' : 'fail';
        
        await completeInspection(inspectionId!, {
          checklist_results: checklistResults,
          overall_result: overallResult
        });
        message.success('UpatePro: Quality inspection completed successfully');
      }
      form.resetFields();
    } catch (error) {
      message.error('UpatePro: Failed to save inspection');
    } finally {
      setLoading(false);
    }
  };

  const renderChecklistItem = (item: any, index: number) => {
    const result = checklistResults[index] || { value: '', status: 'pending', notes: '' };
    
    const handleValueChange = (value: any) => {
      const status = validateChecklistItem(item, value);
      handleChecklistChange(index, 'value', value);
      handleChecklistChange(index, 'status', status);
    };

    return (
      <Card key={index} size="small" className="mb-4">
        <Row gutter={16} align="middle">
          <Col span={8}>
            <strong>{item.name}</strong>
            {item.required && <span className="text-red-500 ml-1">*</span>}
            {item.tolerance && (
              <div className="text-xs text-gray-500">
                Range: {item.tolerance.min} - {item.tolerance.max}
              </div>
            )}
          </Col>
          <Col span={8}>
            {item.type === 'number' && (
              <InputNumber
                value={result.value}
                onChange={handleValueChange}
                placeholder="Enter value"
                style={{ width: '100%' }}
              />
            )}
            {item.type === 'select' && (
              <Select
                value={result.value}
                onChange={handleValueChange}
                placeholder="Select option"
                style={{ width: '100%' }}
                options={item.options?.map((opt: string) => ({ label: opt, value: opt }))}
              />
            )}
            {item.type === 'text' && (
              <Input
                value={result.value}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder="Enter text"
              />
            )}
          </Col>
          <Col span={4}>
            <div className={`text-center p-2 rounded ${
              result.status === 'pass' ? 'bg-green-100 text-green-800' :
              result.status === 'fail' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {result.status.toUpperCase()}
            </div>
          </Col>
          <Col span={4}>
            <Input.TextArea
              value={result.notes}
              onChange={(e) => handleChecklistChange(index, 'notes', e.target.value)}
              placeholder="Notes"
              rows={1}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <PageLayout
      title={mode === 'create' ? 'Create Quality Inspection' : 'Conduct Inspection'}
      subtitle={mode === 'create' ? 'Schedule a new quality inspection' : 'Complete inspection checklist'}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {mode === 'create' && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Industry" name="industry" rules={[{ required: true }]}>
                  <Select placeholder="Select industry">
                    <Select.Option value="solar">Solar</Select.Option>
                    <Select.Option value="wind">Wind</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Inspection Template" name="template" rules={[{ required: true }]}>
                  <Select 
                    placeholder="Select template"
                    onChange={handleTemplateChange}
                    options={templates.map((t: any) => ({ 
                      label: `${t.name} (${t.inspection_type})`, 
                      value: t.id 
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Reference Number" name="reference_number" rules={[{ required: true }]}>
                  <Input placeholder="PO/GRN/WO Number" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Component Type" name="component_type" rules={[{ required: true }]}>
                  <Input placeholder="e.g., Solar Module, Wind Blade" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Quantity" name="quantity" rules={[{ required: true }]}>
                  <InputNumber min={1} placeholder="Quantity" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Scheduled Date" name="scheduled_date" rules={[{ required: true }]}>
                  <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Batch Number" name="batch_number">
                  <Input placeholder="Batch/Lot Number" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {selectedTemplate && mode === 'conduct' && (
          <Card title="Inspection Checklist" className="mb-6">
            <div className="mb-4">
              <strong>Template:</strong> {selectedTemplate.name}
              <br />
              <strong>Industry:</strong> {selectedTemplate.industry.toUpperCase()}
              <br />
              <strong>Type:</strong> {selectedTemplate.inspection_type.replace('_', ' ').toUpperCase()}
            </div>
            
            {selectedTemplate.checklist_items.map((item: any, index: number) => 
              renderChecklistItem(item, index)
            )}
          </Card>
        )}

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={mode === 'create' ? <SaveOutlined /> : <CheckCircleOutlined />}
            size="large"
          >
            {mode === 'create' ? 'Create Inspection' : 'Complete Inspection'}
          </Button>
        </Form.Item>
      </Form>
    </PageLayout>
  );
};

export default InspectionForm;
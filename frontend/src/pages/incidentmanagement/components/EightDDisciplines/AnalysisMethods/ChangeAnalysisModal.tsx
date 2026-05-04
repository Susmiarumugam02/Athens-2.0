import React from 'react';
import { Modal, Form, Input, Button, Space, DatePicker } from 'antd';

const { TextArea } = Input;

interface ChangeAnalysisModalProps {
  visible: boolean;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const ChangeAnalysisModal: React.FC<ChangeAnalysisModalProps> = ({
  visible,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    onSubmit({
      method_type: 'change_analysis',
      method_data: values,
    });
  };

  return (
    <Modal
      title="Change Analysis"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="recent_changes"
          label="Recent Changes (What changed before the incident?)"
          rules={[{ required: true, message: 'Please identify recent changes' }]}
        >
          <TextArea 
            rows={3} 
            placeholder="Personnel, procedures, equipment, materials, environment..." 
          />
        </Form.Item>

        <Form.Item
          name="change_timeline"
          label="Change Timeline"
          rules={[{ required: true, message: 'Please provide change timeline' }]}
        >
          <TextArea 
            rows={2} 
            placeholder="When did these changes occur? Timeline of changes..." 
          />
        </Form.Item>

        <Form.Item
          name="change_impact"
          label="Impact of Changes"
          rules={[{ required: true, message: 'Please assess change impact' }]}
        >
          <TextArea 
            rows={3} 
            placeholder="How might these changes have contributed to the incident?" 
          />
        </Form.Item>

        <Form.Item
          name="change_management"
          label="Change Management Process"
        >
          <TextArea 
            rows={2} 
            placeholder="Was proper change management followed? What was missed?" 
          />
        </Form.Item>

        <Form.Item>
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Analysis
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ChangeAnalysisModal;
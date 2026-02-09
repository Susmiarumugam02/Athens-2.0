import React from 'react';
import { Modal, Form, Input, Button, Space } from 'antd';

const { TextArea } = Input;

interface BarrierAnalysisModalProps {
  visible: boolean;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const BarrierAnalysisModal: React.FC<BarrierAnalysisModalProps> = ({
  visible,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    onSubmit({
      method_type: 'barrier_analysis',
      method_data: values,
    });
  };

  return (
    <Modal
      title="Barrier Analysis"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="physical_barriers"
          label="Physical Barriers (Failed or Missing)"
          rules={[{ required: true, message: 'Please identify physical barriers' }]}
        >
          <TextArea 
            rows={3} 
            placeholder="Guards, fences, locks, safety equipment, containment systems..." 
          />
        </Form.Item>

        <Form.Item
          name="administrative_barriers"
          label="Administrative Barriers (Failed or Missing)"
          rules={[{ required: true, message: 'Please identify administrative barriers' }]}
        >
          <TextArea 
            rows={3} 
            placeholder="Procedures, policies, training, permits, inspections..." 
          />
        </Form.Item>

        <Form.Item
          name="human_barriers"
          label="Human Barriers (Failed or Missing)"
          rules={[{ required: true, message: 'Please identify human barriers' }]}
        >
          <TextArea 
            rows={3} 
            placeholder="Skills, awareness, decision-making, communication..." 
          />
        </Form.Item>

        <Form.Item
          name="barrier_effectiveness"
          label="Barrier Effectiveness Assessment"
        >
          <TextArea 
            rows={2} 
            placeholder="Which barriers were most critical? Why did they fail?" 
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

export default BarrierAnalysisModal;
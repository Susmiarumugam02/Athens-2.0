import React from 'react';
import { Modal, Form, Input, Button, Space } from 'antd';

const { TextArea } = Input;

interface FiveWhysModalProps {
  visible: boolean;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const FiveWhysModal: React.FC<FiveWhysModalProps> = ({
  visible,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    onSubmit({
      method_type: '5_whys',
      method_data: values,
    });
  };

  return (
    <Modal
      title="5 Whys Analysis"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="why1"
          label="Why 1: Why did the problem occur?"
          rules={[{ required: true, message: 'Please answer the first why' }]}
        >
          <TextArea rows={2} placeholder="First level cause..." />
        </Form.Item>

        <Form.Item
          name="why2"
          label="Why 2: Why did that happen?"
          rules={[{ required: true, message: 'Please answer the second why' }]}
        >
          <TextArea rows={2} placeholder="Second level cause..." />
        </Form.Item>

        <Form.Item
          name="why3"
          label="Why 3: Why did that happen?"
          rules={[{ required: true, message: 'Please answer the third why' }]}
        >
          <TextArea rows={2} placeholder="Third level cause..." />
        </Form.Item>

        <Form.Item
          name="why4"
          label="Why 4: Why did that happen?"
          rules={[{ required: true, message: 'Please answer the fourth why' }]}
        >
          <TextArea rows={2} placeholder="Fourth level cause..." />
        </Form.Item>

        <Form.Item
          name="why5"
          label="Why 5: Why did that happen?"
          rules={[{ required: true, message: 'Please answer the fifth why' }]}
        >
          <TextArea rows={2} placeholder="Root cause..." />
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

export default FiveWhysModal;
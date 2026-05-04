import React from 'react';
import { Modal, Form, Input, Button, Space, Row, Col } from 'antd';

const { TextArea } = Input;

interface FishboneModalProps {
  visible: boolean;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const FishboneModal: React.FC<FishboneModalProps> = ({
  visible,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    onSubmit({
      method_type: 'fishbone',
      method_data: values,
    });
  };

  return (
    <Modal
      title="Fishbone Diagram Analysis"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="people"
              label="People (Human Factors)"
              rules={[{ required: true, message: 'Please identify people-related causes' }]}
            >
              <TextArea rows={3} placeholder="Training, fatigue, skills, communication..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="process"
              label="Process (Procedures)"
              rules={[{ required: true, message: 'Please identify process-related causes' }]}
            >
              <TextArea rows={3} placeholder="Procedures, standards, workflow..." />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="equipment"
              label="Equipment (Machinery)"
              rules={[{ required: true, message: 'Please identify equipment-related causes' }]}
            >
              <TextArea rows={3} placeholder="Tools, machinery, technology..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="environment"
              label="Environment (Conditions)"
              rules={[{ required: true, message: 'Please identify environmental causes' }]}
            >
              <TextArea rows={3} placeholder="Weather, lighting, noise, workspace..." />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="materials"
              label="Materials (Resources)"
              rules={[{ required: true, message: 'Please identify material-related causes' }]}
            >
              <TextArea rows={3} placeholder="Quality, availability, specifications..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="methods"
              label="Methods (Techniques)"
              rules={[{ required: true, message: 'Please identify method-related causes' }]}
            >
              <TextArea rows={3} placeholder="Techniques, approaches, methodologies..." />
            </Form.Item>
          </Col>
        </Row>

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

export default FishboneModal;
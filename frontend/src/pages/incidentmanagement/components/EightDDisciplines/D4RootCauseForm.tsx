import React from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  InputNumber,
} from 'antd';

const { TextArea } = Input;
const { Option } = Select;

interface D4RootCauseFormProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  loading: boolean;
  initialValues?: any;
  isEditing?: boolean;
}

const D4RootCauseForm: React.FC<D4RootCauseFormProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading,
  initialValues,
  isEditing = false,
}) => {
  const [form] = Form.useForm();

  // Set initial values when editing
  React.useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue(initialValues);
    } else if (visible && !initialValues) {
      form.resetFields();
    }
  }, [visible, initialValues, form]);

  const handleSubmit = (values: any) => {
    onSubmit(values);
    if (!isEditing) {
      form.resetFields();
    }
  };

  return (
    <Modal
      title={isEditing ? "Edit Root Cause" : "Add Root Cause"}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="cause_description"
          label="Root Cause Description"
          rules={[{ required: true, message: 'Please describe the root cause' }]}
        >
          <TextArea rows={3} placeholder="Describe the identified root cause..." />
        </Form.Item>

        <Form.Item
          name="cause_type"
          label="Cause Type"
          rules={[{ required: true, message: 'Please select cause type' }]}
        >
          <Select placeholder="Select cause type">
            <Option value="immediate">Immediate Cause</Option>
            <Option value="contributing">Contributing Cause</Option>
            <Option value="root">Root Cause</Option>
            <Option value="systemic">Systemic Cause</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="analysis_method"
          label="Analysis Method"
          rules={[{ required: true, message: 'Please select analysis method' }]}
        >
          <Select placeholder="Select analysis method">
            <Option value="5_whys">5 Whys</Option>
            <Option value="fishbone">Fishbone Diagram</Option>
            <Option value="fault_tree">Fault Tree Analysis</Option>
            <Option value="barrier_analysis">Barrier Analysis</Option>
            <Option value="change_analysis">Change Analysis</Option>
            <Option value="timeline">Timeline Analysis</Option>
            <Option value="other">Other Method</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="supporting_evidence"
          label="Supporting Evidence"
          rules={[{ required: true, message: 'Please provide supporting evidence' }]}
        >
          <TextArea rows={3} placeholder="Evidence that supports this cause identification..." />
        </Form.Item>

        <Form.Item
          name="verification_method"
          label="Verification Method"
          rules={[{ required: true, message: 'Please describe verification method' }]}
        >
          <TextArea rows={2} placeholder="How this cause was verified..." />
        </Form.Item>

        <Form.Item
          name="impact_assessment"
          label="Impact Assessment"
        >
          <TextArea rows={2} placeholder="Assessment of this cause's impact on the problem..." />
        </Form.Item>

        <Form.Item
          name="likelihood_score"
          label="Likelihood Score (1-5)"
        >
          <InputNumber min={1} max={5} placeholder="Rate likelihood (1-5)" />
        </Form.Item>

        <Form.Item>
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEditing ? 'Update Root Cause' : 'Add Root Cause'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default D4RootCauseForm;
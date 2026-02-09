import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Alert,
  Typography,
  Row,
  Col,
  message,
} from 'antd';
import {
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useAuthStore from '../../../common/store/authStore';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface EightDProcessFormProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (data: {
    problem_statement: string;
    champion: string;
    target_completion_date?: string;
  }) => Promise<void>;
  loading?: boolean;
  incidentTitle?: string;
}

const EightDProcessForm: React.FC<EightDProcessFormProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
  incidentTitle,
}) => {
  const [form] = Form.useForm();
  const { userId, username } = useAuthStore();

  const handleSubmit = async (values: any) => {
    try {
      await onSubmit({
        problem_statement: values.problem_statement,
        champion: values.champion,
        target_completion_date: values.target_completion_date?.format('YYYY-MM-DD'),
      });
      form.resetFields();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  return (
    <Modal
      title={
        <Space>
          <TeamOutlined style={{ color: '#1890ff' }} />
          <span>Start 8D Problem Solving Process</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
      destroyOnHidden
    >
      <Alert
        message="8D Methodology"
        description="The 8D (Eight Disciplines) methodology is a structured problem-solving approach used to identify, correct, and eliminate recurring problems. It provides a systematic approach to problem resolution."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {incidentTitle && (
        <Alert
          message={`Incident: ${incidentTitle}`}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          champion: userId,
        }}
      >
        <Title level={5}>
          <FileTextOutlined /> Problem Definition
        </Title>
        
        <Form.Item
          name="problem_statement"
          label="Problem Statement"
          rules={[
            { required: true, message: 'Please provide a clear problem statement' },
            { min: 20, message: 'Problem statement must be at least 20 characters' },
            { max: 1000, message: 'Problem statement cannot exceed 1000 characters' },
          ]}
          help="Define the problem in measurable terms. Be specific about what, when, where, and how much."
        >
          <TextArea
            rows={4}
            placeholder="Describe the problem in measurable terms. Include what happened, when it occurred, where it happened, and the extent of the problem..."
            showCount
            maxLength={1000}
          />
        </Form.Item>

        <Title level={5}>
          <TeamOutlined /> Team Leadership
        </Title>

        <Form.Item
          name="champion"
          label="8D Champion"
          rules={[{ required: true, message: 'Please select an 8D Champion' }]}
          help="The 8D Champion leads the process and ensures all disciplines are completed effectively."
        >
          <Select placeholder="Select 8D Champion">
            <Option value={userId}>
              {username} (You)
            </Option>
            {/* TODO: Add other users from API */}
          </Select>
        </Form.Item>

        <Title level={5}>
          <CalendarOutlined /> Timeline
        </Title>

        <Form.Item
          name="target_completion_date"
          label="Target Completion Date"
          help="Optional: Set a target date for completing all 8 disciplines."
        >
          <DatePicker
            style={{ width: '100%' }}
            disabledDate={(current) => current && current < dayjs().startOf('day')}
            placeholder="Select target completion date"
          />
        </Form.Item>

        <Alert
          message="8D Process Overview"
          description={
            <div>
              <p><strong>The 8 Disciplines:</strong></p>
              <ol style={{ marginBottom: 0 }}>
                <li><strong>D1:</strong> Establish the Team</li>
                <li><strong>D2:</strong> Describe the Problem</li>
                <li><strong>D3:</strong> Develop Interim Containment Actions</li>
                <li><strong>D4:</strong> Determine Root Causes</li>
                <li><strong>D5:</strong> Choose Permanent Corrective Actions</li>
                <li><strong>D6:</strong> Implement Permanent Corrective Actions</li>
                <li><strong>D7:</strong> Prevent Recurrence</li>
                <li><strong>D8:</strong> Recognize the Team</li>
              </ol>
            </div>
          }
          type="info"
          style={{ marginBottom: 24 }}
        />

        <Row justify="end">
          <Space>
            <Button onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<TeamOutlined />}
            >
              Start 8D Process
            </Button>
          </Space>
        </Row>
      </Form>
    </Modal>
  );
};

export default EightDProcessForm;

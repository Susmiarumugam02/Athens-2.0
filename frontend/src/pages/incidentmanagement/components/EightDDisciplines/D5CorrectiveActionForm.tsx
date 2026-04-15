import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Avatar,
} from 'antd';
import api from '../../../../common/utils/axiosetup';

const { TextArea } = Input;
const { Option } = Select;

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  admin_type: string;
  grade: string;
  department: string;
  company_name: string;
  phone_number: string;
}

interface D5CorrectiveActionFormProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  loading: boolean;
  rootCauses: any[];
}

const D5CorrectiveActionForm: React.FC<D5CorrectiveActionFormProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading,
  rootCauses,
}) => {
  const [form] = Form.useForm();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserType, setSelectedUserType] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');

  // Load users by type and grade
  const loadUsersByTypeAndGrade = async (userType: string, grade?: string) => {
    try {
      const params = new URLSearchParams({ user_type: userType });
      if (grade) {
        params.append('grade', grade);
      }
      const response = await api.get(`/authentication/api/team-members/get_users_by_type_and_grade/?${params}`);
      setAvailableUsers(response.data.users || []);
    } catch (error) {
    }
  };

  // Handle user type change
  const handleUserTypeChange = (userType: string) => {
    setSelectedUserType(userType);
    setSelectedGrade('');
    setAvailableUsers([]);
    form.setFieldsValue({ grade: undefined, responsible_person: undefined });
  };

  // Handle grade change
  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
    form.setFieldsValue({ responsible_person: undefined });
    if (selectedUserType) {
      loadUsersByTypeAndGrade(selectedUserType, grade);
    }
  };

  const handleSubmit = (values: any) => {
    onSubmit(values);
    form.resetFields();
    setSelectedUserType('');
    setSelectedGrade('');
    setAvailableUsers([]);
  };

  return (
    <Modal
      title="Add Corrective Action"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="root_cause"
          label="Root Cause"
          rules={[{ required: true, message: 'Please select a root cause' }]}
        >
          <Select placeholder="Select the root cause this action addresses">
            {rootCauses.map((cause) => (
              <Option key={cause.id} value={cause.id}>
                {cause.cause_description} ({cause.cause_type})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="action_description"
          label="Corrective Action Description"
          rules={[{ required: true, message: 'Please describe the corrective action' }]}
        >
          <TextArea rows={3} placeholder="Detailed description of the corrective action..." />
        </Form.Item>

        <Form.Item
          name="action_type"
          label="Action Type"
          rules={[{ required: true, message: 'Please select action type' }]}
        >
          <Select placeholder="Select action type">
            <Option value="eliminate">Eliminate Root Cause</Option>
            <Option value="control">Control Root Cause</Option>
            <Option value="detect">Improve Detection</Option>
            <Option value="prevent">Prevent Occurrence</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="rationale"
          label="Rationale"
          rules={[{ required: true, message: 'Please provide rationale' }]}
        >
          <TextArea rows={2} placeholder="Why this corrective action was chosen..." />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="user_type"
              label="User Type"
              rules={[{ required: true, message: 'Please select user type' }]}
            >
              <Select
                placeholder="Select user type"
                onChange={handleUserTypeChange}
              >
                <Option value="adminuser">Admin User</Option>
                <Option value="clientuser">Client User</Option>
                <Option value="epcuser">EPC User</Option>
                <Option value="contractoruser">Contractor User</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="grade"
              label="Grade"
              rules={[{ required: true, message: 'Please select grade' }]}
            >
              <Select
                placeholder="Select grade"
                onChange={handleGradeChange}
                disabled={!selectedUserType}
              >
                <Option value="A">Grade A</Option>
                <Option value="B">Grade B</Option>
                <Option value="C">Grade C</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="responsible_person"
          label="Responsible Person"
          rules={[{ required: true, message: 'Please select responsible person' }]}
        >
          <Select
            placeholder="Select responsible person"
            disabled={!selectedUserType || !selectedGrade}
            showSearch
            filterOption={(input, option) =>
              String(option?.children || '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {availableUsers.map(user => (
              <Option key={user.id} value={user.id}>
                <Space>
                  <Avatar size="small">{user.full_name?.[0] || 'U'}</Avatar>
                  <div>
                    <div>{user.full_name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {user.company_name || user.department} - {user.email}
                    </div>
                  </div>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="target_date"
          label="Target Implementation Date"
          rules={[{ required: true, message: 'Please select target date' }]}
        >
          <DatePicker 
            style={{ width: '100%' }} 
            disabledDate={(current) => current && current.isBefore(new Date(), 'day')}
          />
        </Form.Item>

        <Form.Item
          name="estimated_cost"
          label="Estimated Cost"
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="Estimated implementation cost"
            min={0}
            precision={2}
          />
        </Form.Item>

        <Form.Item
          name="verification_method"
          label="Verification Method"
        >
          <TextArea rows={2} placeholder="How effectiveness will be verified..." />
        </Form.Item>

        <Form.Item>
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Add Corrective Action
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default D5CorrectiveActionForm;
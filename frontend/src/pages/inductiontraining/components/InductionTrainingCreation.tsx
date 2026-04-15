import React, { useState, useEffect, useCallback, useRef } from 'react'; // <--- FIXED HERE
import { Form, Input, DatePicker, Select, Button, InputNumber, Row, Col, Spin, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import useAuthStore from '@common/store/authStore';
import api from '@common/utils/axiosetup';
import moment from 'moment';

const { Option } = Select;

// --- Interface Definitions ---
interface InductionTrainingCreationProps {
  onFinish: (values: any) => void;
}

interface UserData {
  id: number;
  username: string;
  name?: string;
  email?: string;
}

// --- Styled Components for Themed UI ---

const FormContainer = styled.div`
  /* This component is usually in a modal, which provides the background. */
  /* We just control the padding and layout. */
  padding: 8px;
`;

const FormActionsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
`;

const SelectOptionWrapper = styled.div`
  display: flex;
  align-items: center;

  .option-username {
    color: var(--color-text-base);
  }
  .option-realname {
    color: var(--color-text-muted);
    margin-left: 8px;
  }
`;

// --- Component Definition ---

const InductionTrainingCreation: React.FC<InductionTrainingCreationProps> = ({ onFinish }) => {
  // --- State and Hooks ---
  const [form] = Form.useForm();
  const userId = useAuthStore((state) => state.userId);
  const userName = useAuthStore((state) => state.username);
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Ref to store the timeout to prevent state updates on unmounted component
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Effects ---
  useEffect(() => {
    // Fetch initial list of users for client-side fallback
    const fetchUsers = async () => {
      try {
        const response = await api.get('/tbt/users/list/');
        if (Array.isArray(response.data)) {
          setUsers(response.data);
        }
      } catch (error) {
      }
    };
    fetchUsers();

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // --- Handlers (Memoized) ---
  const handleUserSearch = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!value) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await api.get(`/tbt/users/search/?q=${value}`);
        setSearchResults(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        // Fallback to client-side filtering on API error
        const filtered = users.filter(user =>
          user.username.toLowerCase().includes(value.toLowerCase()) ||
          user.name?.toLowerCase().includes(value.toLowerCase())
        );
        setSearchResults(filtered);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [users]);

  const handleSubmit = useCallback((values: any) => {
    const formattedValues = {
      ...values,
      date: values.date.format('YYYY-MM-DD'),
      created_by: userId,
      status: values.status || 'planned',
    };
    onFinish(formattedValues);
    form.resetFields(); // Reset form after successful submission
  }, [userId, onFinish, form]);

  const handleReset = useCallback(() => {
    form.resetFields();
  }, [form]);

  // --- Render ---
  return (
    <FormContainer>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          conducted_by: userName || '',
          status: 'planned',
          duration: 30,
          duration_unit: 'minutes',
          date: moment(),
        }}
      >
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Please enter the title' }]}
        >
          <Input placeholder="e.g., Site Safety & Emergency Procedures" />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Please select a date' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            {/* Using a single Form.Item with Input.Group for better layout and validation */}
            <Form.Item label="Duration" required>
              <Input.Group compact>
                <Form.Item name="duration" noStyle rules={[{ required: true, message: 'Duration required' }]}>
                  <InputNumber min={1} max={480} placeholder="e.g., 30" style={{ width: '50%' }} />
                </Form.Item>
                <Form.Item name="duration_unit" noStyle rules={[{ required: true, message: 'Unit required' }]}>
                  <Select placeholder="Unit" style={{ width: '50%' }}>
                    <Option value="minutes">Minutes</Option>
                    <Option value="hours">Hours</Option>
                  </Select>
                </Form.Item>
              </Input.Group>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="location" label="Location" rules={[{ required: true, message: 'Please enter the location' }]}>
          <Input placeholder="e.g., Site Office Conference Room" />
        </Form.Item>

        <Form.Item name="conducted_by" label="Conducted By" rules={[{ required: true, message: 'Please assign a conductor' }]}>
          <Select
            showSearch
            placeholder="Search by username or name"
            defaultActiveFirstOption={false}
            showArrow={false}
            filterOption={false}
            onSearch={handleUserSearch}
            notFoundContent={searching ? <Spin size="small" /> : null}
          >
            {searchResults.map(user => (
              <Option key={user.id} value={user.username}>
                <SelectOptionWrapper>
                  <UserOutlined style={{ marginRight: 8, color: 'var(--color-text-muted)' }} />
                  <span className="option-username">{user.username}</span>
                  {user.name && <span className="option-realname">({user.name})</span>}
                </SelectOptionWrapper>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Please select a status' }]}>
          <Select>
            <Option value="planned">Planned</Option>
            <Option value="completed">Completed</Option>
            <Option value="cancelled">Cancelled</Option>
          </Select>
        </Form.Item>

        <FormActionsContainer>
          <Button onClick={handleReset}>Reset</Button>
          <Button type="primary" htmlType="submit">
            Create Induction Training
          </Button>
        </FormActionsContainer>
      </Form>
    </FormContainer>
  );
};

export default InductionTrainingCreation;
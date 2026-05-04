import React, { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Select, Button, InputNumber, Row, Col, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import useAuthStore from '@common/store/authStore';
import api from '@common/utils/axiosetup';
import moment from 'moment';

const { Option } = Select;

interface JobTrainingCreationProps {
  onFinish: (values: any) => void;
}

interface UserData {
  id: number;
  username: string;
  name: string;
  email: string;
}

const JobTrainingCreation: React.FC<JobTrainingCreationProps> = ({ onFinish }) => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Get current user from auth store
  const userId = useAuthStore((state) => state.userId);
  const userName = useAuthStore((state) => state.username);

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/jobtraining/users/list/');
        if (Array.isArray(response.data)) {
          setUsers(response.data);
        }
      } catch (error) {
      }
    };
    
    fetchUsers();
  }, []);

  const handleUserSearch = (value: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (!value) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    
    // Debounce search to avoid too many requests
    const timeout = setTimeout(async () => {
      try {
        // Use the API endpoint for searching users
        const response = await api.get(`/jobtraining/users/search/?q=${value}`);
        if (Array.isArray(response.data)) {
          setSearchResults(response.data);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        // Fallback to client-side filtering if API fails
        const filteredUsers = users.filter(user => 
          user.username.toLowerCase().includes(value.toLowerCase()) ||
          (user.name && user.name.toLowerCase().includes(value.toLowerCase())) ||
          (user.email && user.email.toLowerCase().includes(value.toLowerCase()))
        );
        
        setSearchResults(filteredUsers);
      } finally {
        setSearching(false);
      }
    }, 300);
    
    setSearchTimeout(timeout);
  };

  const handleSubmit = (values: any) => {
    const formattedValues = {
      ...values,
      date: values.date.format('YYYY-MM-DD'),
      created_by: userId,
      status: values.status || 'planned', // Default to planned if not specified
    };

    onFinish(formattedValues);
  };

  const handleReset = () => {
    form.resetFields();
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        conducted_by: userName || '',
        status: 'planned',
        duration: 30,
        duration_unit: 'minutes',
        date: moment(), // Set current date as default
      }}
    >
      <Form.Item
        name="title"
        label="Title"
        rules={[{ required: true, message: 'Please enter the title' }]}
      >
        <Input placeholder="Enter title" />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Duration"
            style={{ marginBottom: 0 }}
            required
          >
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item
                  name="duration"
                  noStyle
                  rules={[{ required: true, message: 'Please enter duration' }]}
                >
                  <InputNumber 
                    min={1} 
                    max={480} 
                    style={{ width: '100%' }} 
                    placeholder="Duration"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="duration_unit"
                  noStyle
                  rules={[{ required: true, message: 'Please select unit' }]}
                >
                  <Select placeholder="Unit">
                    <Option value="minutes">Minutes</Option>
                    <Option value="hours">Hours</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="location"
        label="Location"
        rules={[{ required: true, message: 'Please enter the location' }]}
      >
        <Input placeholder="Enter location" />
      </Form.Item>

      <Form.Item
        name="conducted_by"
        label="Conducted By"
        rules={[{ required: true, message: 'Please enter who will conduct this training' }]}
      >
        <Select
          showSearch
          placeholder="Search for a user"
          defaultActiveFirstOption={false}
          showArrow={false}
          filterOption={false}
          onSearch={handleUserSearch}
          notFoundContent={searching ? <Spin size="small" /> : null}
          style={{ width: '100%' }}
        >
          {searchResults.map(user => (
            <Option key={user.id} value={user.username}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <UserOutlined style={{ marginRight: 8 }} />
                <span>{user.username}</span>
                {user.name && <span style={{ color: '#999', marginLeft: 8 }}>({user.name})</span>}
              </div>
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="status"
        label="Status"
        rules={[{ required: true, message: 'Please select a status' }]}
      >
        <Select placeholder="Select status">
          <Option value="planned">Planned</Option>
          <Option value="completed">Completed</Option>
          <Option value="cancelled">Cancelled</Option>
        </Select>
      </Form.Item>

      <Form.Item>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button onClick={handleReset}>Reset</Button>
          <Button type="primary" htmlType="submit">
            Create Job Training
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
};

export default JobTrainingCreation;

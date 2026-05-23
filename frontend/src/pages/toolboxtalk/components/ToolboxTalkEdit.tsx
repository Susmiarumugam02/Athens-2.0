import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Select, Button, App, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { ToolboxTalkData } from '../types';
import moment from 'moment';
import api from '@common/utils/axiosetup';


const { Option } = Select;

interface ToolboxTalkEditProps {
  toolboxTalk: ToolboxTalkData;
  visible: boolean;
  onSave: (updatedTBT: ToolboxTalkData) => void;
  onCancel: () => void;
}

interface UserData {
  id: number;
  username: string;
  name: string;
  email: string;
}

const ToolboxTalkEdit: React.FC<ToolboxTalkEditProps> = ({ 

  toolboxTalk, 
  visible, 
  onSave, 
  onCancel 
}) => {
  const {message} = App.useApp();
  const [form] = Form.useForm();
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch users on component mount
  useEffect(() => {
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
        const response = await api.get(`/tbt/users/search/?q=${value}`);
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

  const handleSubmit = () => {
    form.validateFields()
      .then(values => {
        const updatedTBT: ToolboxTalkData = {
          ...toolboxTalk,
          title: values.title,
          date: values.date.format('YYYY-MM-DD'),
          location: values.location,
          conducted_by: values.conducted_by,
          status: values.status,
        };
        onSave(updatedTBT);
      })
      .catch(info => {
        message.error('Validation failed. Please check the form fields.');
      });
  };

  return (
    <Modal
      open={visible}
      title="Edit Toolbox Talk"
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          Save Changes
        </Button>,
      ]}
      width={700}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          title: toolboxTalk.title,
          date: toolboxTalk.date ? moment(toolboxTalk.date) : null,
          location: toolboxTalk.location,
          conducted_by: toolboxTalk.conducted_by,
          status: toolboxTalk.status,
        }}
        preserve={false}
      >
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Please enter the title' }]}
        >
          <Input placeholder="Enter title" />
        </Form.Item>

        <Form.Item
          name="date"
          label="Date"
          rules={[{ required: true, message: 'Please select a date' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

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
          rules={[{ required: true, message: 'Please enter who will conduct this talk' }]}
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
      </Form>
    </Modal>
  );
};

export default ToolboxTalkEdit;

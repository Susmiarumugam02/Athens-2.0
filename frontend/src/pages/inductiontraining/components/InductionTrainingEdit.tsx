import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Form, Input, DatePicker, Select, Button, InputNumber, Row, Col, App, Spin, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { InductionTrainingData } from '../types';
import moment from 'moment';
import api from '@common/utils/axiosetup';

const { Option } = Select;
const { Title } = Typography;
;
// --- Interface Definitions ---
interface InductionTrainingEditProps {
  inductionTraining: InductionTrainingData;
  visible: boolean;
  onSave: (updatedIT: InductionTrainingData) => void;
  onCancel: () => void;
}

interface UserData {
  id: number;
  username: string;
  name?: string;
  email?: string;
}

// --- Styled Components for Themed UI ---
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
const InductionTrainingEdit: React.FC<InductionTrainingEditProps> = ({
  inductionTraining,
  visible,
  onSave,
  onCancel,
}) => {
  const {message} = App.useApp();
  // --- State and Hooks ---
  const [form] = Form.useForm();
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Effects ---
  useEffect(() => {
    // Fetch initial user list for client-side fallback
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

  // Effect to populate the form when the modal becomes visible with new data
  useEffect(() => {
    if (visible && inductionTraining) {
      form.setFieldsValue({
        ...inductionTraining,
        date: inductionTraining.date ? moment(inductionTraining.date) : null,
      });
    }
  }, [visible, inductionTraining, form]);

  // --- Handlers (Memoized) ---
  const handleUserSearch = useCallback((value: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!value) return setSearchResults([]);

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await api.get(`/tbt/users/search/?q=${value}`);
        setSearchResults(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        const filtered = users.filter(u => u.username.toLowerCase().includes(value.toLowerCase()) || u.name?.toLowerCase().includes(value.toLowerCase()));
        setSearchResults(filtered);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [users]);

  const handleSave = useCallback(() => {
    form.validateFields()
      .then(values => {
        const updatedIT: InductionTrainingData = {
          ...inductionTraining,
          ...values,
          date: values.date.format('YYYY-MM-DD'),
        };
        onSave(updatedIT);
      })
      .catch(info => {
        message.error('Validation failed. Please check the form fields.');
      });
  }, [form, inductionTraining, onSave]);

  // --- Render ---
  return (
    <Modal
      open={visible}
      title={<Title level={4} style={{color: 'var(--color-text-base)'}}>Edit Induction Training</Title>}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button key="submit" type="primary" onClick={handleSave}>Save Changes</Button>,
      ]}
      width={700}
      destroyOnHidden // Ensures form is reset when modal is closed
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
            ...inductionTraining,
            date: inductionTraining.date ? moment(inductionTraining.date) : null,
        }}
      >
        <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please enter the title' }]}>
          <Input placeholder="e.g., Site Safety & Emergency Procedures" />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Please select a date' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
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
            {/* Show the currently selected user if they are not in the search results */}
            {form.getFieldValue('conducted_by') && !searchResults.some(u => u.username === form.getFieldValue('conducted_by')) &&
              <Option key={form.getFieldValue('conducted_by')} value={form.getFieldValue('conducted_by')}>
                <SelectOptionWrapper>
                    <UserOutlined style={{ marginRight: 8, color: 'var(--color-text-muted)' }} />
                    <span className="option-username">{form.getFieldValue('conducted_by')}</span>
                </SelectOptionWrapper>
              </Option>
            }
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
      </Form>
    </Modal>
  );
};

export default InductionTrainingEdit;
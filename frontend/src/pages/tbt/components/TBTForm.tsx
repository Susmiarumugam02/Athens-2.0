import React, { useEffect } from 'react';
import { Form, Input, DatePicker, Button, Card, Space, InputNumber, Select } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

interface TBTFormProps {
  tbtId: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const TBTForm: React.FC<TBTFormProps> = ({ tbtId, onSuccess, onCancel }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (tbtId) {
      fetchTBT();
    } else {
      form.resetFields();
    }
  }, [tbtId]);

  const fetchTBT = async () => {
    try {
      const response = await axios.get(`/api/tbt/${tbtId}/`);
      const data = response.data;
      form.setFieldsValue({
        ...data,
        date: data.date ? dayjs(data.date) : null,
      });
    } catch (error) {
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        ...values,
        date: values.date ? values.date.format('YYYY-MM-DD') : null,
      };

      if (tbtId) {
        await axios.put(`/api/tbt/${tbtId}/`, payload);
      } else {
        await axios.post('/api/tbt/', payload);
      }
      onSuccess();
    } catch (error) {
    }
  };

  return (
    <Card>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Topic"
          name="topic"
          rules={[{ required: true, message: 'Please enter topic' }]}
        >
          <Input placeholder="Enter TBT topic" />
        </Form.Item>

        <Form.Item
          label="Date"
          name="date"
          rules={[{ required: true, message: 'Please select date' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="Conductor"
          name="conductor"
          rules={[{ required: true, message: 'Please enter conductor name' }]}
        >
          <Input placeholder="Enter conductor name" />
        </Form.Item>

        <Form.Item
          label="Number of Attendees"
          name="attendees"
          rules={[{ required: true, message: 'Please enter number of attendees' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} placeholder="Enter number of attendees" />
        </Form.Item>

        <Form.Item
          label="Status"
          name="status"
          rules={[{ required: true, message: 'Please select status' }]}
        >
          <Select placeholder="Select status">
            <Select.Option value="scheduled">Scheduled</Select.Option>
            <Select.Option value="completed">Completed</Select.Option>
            <Select.Option value="cancelled">Cancelled</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
        >
          <Input.TextArea rows={4} placeholder="Enter description" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              {tbtId ? 'Update' : 'Create'}
            </Button>
            <Button onClick={onCancel} icon={<CloseOutlined />}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TBTForm;

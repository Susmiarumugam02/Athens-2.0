import React, { useState, useEffect } from 'react';
import {
  Modal, Form, Input, InputNumber, Select, DatePicker, Button, Space, message, Tag, Card, Row, Col
} from 'antd';
import {
  SaveOutlined, TeamOutlined, CalendarOutlined, ClockCircleOutlined, ToolOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '@common/utils/axiosetup';

const { Option } = Select;
const { TextArea } = Input;

// Interfaces - Updated to match DailyAttendanceForm structure
interface ManpowerRecord {
  id: number;
  date: string;
  category: string;
  gender: string;
  count: number;
  work_type_details?: {
    id: number;
    name: string;
    color_code: string;
  };
  shift: string;
  hours_worked: number;
  overtime_hours: number;
  total_hours: number;
  attendance_status: string;
  notes?: string;
  created_by_name: string;
  created_at: string;
  // Additional fields that might come from DailyAttendanceForm
  categories?: Record<string, Record<string, number>>; // For grouped data
  work_description?: string;
}

interface WorkType {
  id: number;
  name: string;
  description: string;
  color_code: string;
  is_active: boolean;
}

interface ManpowerEditProps {
  record: ManpowerRecord | null;
  open: boolean;
  onSave: (updatedRecord: ManpowerRecord) => void;
  onCancel: () => void;
}

const ManpowerEdit: React.FC<ManpowerEditProps> = ({ record, open, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);

  // Constants - Matching DailyAttendanceForm exactly
  const workerCategories = [
    { key: 'Managers', label: 'Managers', icon: '👔', color: '#722ed1' },
    { key: 'Engineers', label: 'Engineers', icon: '⚙️', color: '#1890ff' },
    { key: 'Supervisors', label: 'Supervisors', icon: '👷', color: '#52c41a' },
    { key: 'Technicians', label: 'Technicians', icon: '🔧', color: '#fa8c16' },
    { key: 'Operators', label: 'Operators', icon: '🏭', color: '#eb2f96' },
    { key: 'Helpers', label: 'Helpers', icon: '🤝', color: '#13c2c2' },
    { key: 'Laborers', label: 'Laborers', icon: '💪', color: '#f5222d' }
  ];

  const genders = ['Male', 'Female', 'Others'];

  const workShifts = [
    { value: 'day', label: 'Day Shift (6 AM - 6 PM)', color: '#52c41a' },
    { value: 'night', label: 'Night Shift (6 PM - 6 AM)', color: '#722ed1' },
    { value: 'general', label: 'General Shift', color: '#1890ff' }
  ];

  const attendanceStatuses = [
    { value: 'present', label: 'Present', color: 'green' },
    { value: 'absent', label: 'Absent', color: 'red' },
    { value: 'late', label: 'Late', color: 'orange' },
    { value: 'half_day', label: 'Half Day', color: 'yellow' }
  ];

  // Load work types
  useEffect(() => {
    if (open) {
      loadWorkTypes();
    }
  }, [open]);

  // Populate form when record changes
  useEffect(() => {
    if (record && open) {
      // Extract work description from notes if it exists
      let workDescription = record.work_description || '';
      let additionalNotes = record.notes || '';

      // If work_description is not separate, try to extract from notes
      if (!workDescription && record.notes) {
        const workDescMatch = record.notes.match(/Work Description: (.*?)(?:\n|$)/);
        if (workDescMatch) {
          workDescription = workDescMatch[1];
          // Remove work description from notes to avoid duplication
          additionalNotes = record.notes.replace(/Work Description: .*?(?:\n|$)/, '').trim();
        }
      }

      form.setFieldsValue({
        date: dayjs(record.date),
        category: record.category,
        gender: record.gender,
        count: record.count,
        work_type_id: record.work_type_details?.id,
        shift: record.shift,
        hours_worked: record.hours_worked,
        overtime_hours: record.overtime_hours,
        attendance_status: record.attendance_status,
        work_description: workDescription,
        notes: additionalNotes
      });
    }
  }, [record, open, form]);

  const loadWorkTypes = async () => {
    try {
      const response = await api.get('/man/work-types/');
      setWorkTypes(response.data);
    } catch (error) {
      message.error('Failed to load work types');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Calculate total hours
      const totalHours = (values.hours_worked || 0) + (values.overtime_hours || 0);

      // Combine work description and notes like DailyAttendanceForm does
      const combinedNotes = [
        values.work_description ? `Work Description: ${values.work_description}` : '',
        values.notes ? `Additional Notes: ${values.notes}` : '',
        `Updated by: ${record?.created_by_name || 'Unknown'}`,
        `Updated on: ${new Date().toISOString()}`
      ].filter(Boolean).join('\n');

      const payload = {
        date: values.date.format('YYYY-MM-DD'),
        category: values.category,
        gender: values.gender,
        count: values.count,
        work_type_id: values.work_type_id || null,
        shift: values.shift,
        hours_worked: values.hours_worked,
        overtime_hours: values.overtime_hours,
        total_hours: totalHours,
        attendance_status: values.attendance_status,
        notes: combinedNotes
      };


      const response = await api.put(`/man/manpower/${record!.id}/`, payload);
      
      message.success('Record updated successfully');
      
      // Call the onSave callback with updated record
      onSave(response.data);
      
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to update record');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // Calculate total hours when regular or overtime hours change
  const handleHoursChange = () => {
    const values = form.getFieldsValue(['hours_worked', 'overtime_hours']);
    const totalHours = (values.hours_worked || 0) + (values.overtime_hours || 0);
    form.setFieldsValue({ total_hours: totalHours });
  };

  if (!record) return null;

  return (
    <Modal
      title={
        <Space>
          <TeamOutlined />
          <span>Edit Manpower Record</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      width={800}
      centered
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={loading}
          onClick={handleSave}
        >
          Save Changes
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ maxHeight: '60vh', overflowY: 'auto' }}
      >
        {/* Basic Information */}
        <Card title={<Space><CalendarOutlined />Basic Information</Space>} style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                label="Date"
                name="date"
                rules={[{ required: true, message: 'Please select a date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Worker Category"
                name="category"
                rules={[{ required: true, message: 'Please select a category' }]}
              >
                <Select placeholder="Select category">
                  {workerCategories.map(category => (
                    <Option key={category.key} value={category.key}>
                      <Space>
                        <span>{category.icon}</span>
                        <span style={{ color: category.color }}>{category.label}</span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Gender"
                name="gender"
                rules={[{ required: true, message: 'Please select gender' }]}
              >
                <Select placeholder="Select gender">
                  {genders.map(gender => (
                    <Option key={gender} value={gender}>{gender}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Worker Count"
                name="count"
                rules={[
                  { required: true, message: 'Please enter worker count' },
                  { type: 'number', min: 1, message: 'Count must be at least 1' }
                ]}
              >
                <InputNumber
                  min={1}
                  max={999}
                  style={{ width: '100%' }}
                  placeholder="Enter number of workers"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Work Details */}
        <Card title={<Space><ToolOutlined />Work Details</Space>} style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item label="Work Type" name="work_type_id">
                <Select placeholder="Select work type" allowClear>
                  {workTypes.map(wt => (
                    <Option key={wt.id} value={wt.id}>
                      <Tag color={wt.color_code}>{wt.name}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Shift"
                name="shift"
                rules={[{ required: true, message: 'Please select a shift' }]}
              >
                <Select placeholder="Select shift">
                  {workShifts.map(shift => (
                    <Option key={shift.value} value={shift.value}>
                      <Tag color={shift.color}>{shift.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Attendance Status"
                name="attendance_status"
                rules={[{ required: true, message: 'Please select attendance status' }]}
              >
                <Select placeholder="Select status">
                  {attendanceStatuses.map(status => (
                    <Option key={status.value} value={status.value}>
                      <Tag color={status.color}>{status.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Time Details */}
        <Card title={<Space><ClockCircleOutlined />Time Details</Space>} style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Form.Item
                label="Regular Hours"
                name="hours_worked"
                rules={[
                  { required: true, message: 'Please enter hours worked' },
                  { type: 'number', min: 0, max: 24, message: 'Hours must be between 0-24' }
                ]}
              >
                <InputNumber
                  min={0}
                  max={24}
                  step={0.5}
                  style={{ width: '100%' }}
                  placeholder="8.0"
                  onChange={handleHoursChange}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Overtime Hours"
                name="overtime_hours"
                rules={[
                  { type: 'number', min: 0, max: 12, message: 'Overtime must be between 0-12' }
                ]}
              >
                <InputNumber
                  min={0}
                  max={12}
                  step={0.5}
                  style={{ width: '100%' }}
                  placeholder="0.0"
                  onChange={handleHoursChange}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Total Hours" name="total_hours">
                <InputNumber
                  style={{ width: '100%' }}
                  disabled
                  placeholder="Auto calculated"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Work Description - Key field from DailyAttendanceForm */}
        <Form.Item
          label="Work Description"
          name="work_description"
          rules={[{ required: true, message: 'Please describe the work done' }]}
        >
          <TextArea
            rows={3}
            placeholder="Describe the work activities (e.g., Construction of foundation, Electrical installation, Safety inspection, etc.)"
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* Additional Notes */}
        <Form.Item label="Additional Notes" name="notes">
          <TextArea
            rows={3}
            placeholder="Add any additional notes about this record..."
            maxLength={1000}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ManpowerEdit;

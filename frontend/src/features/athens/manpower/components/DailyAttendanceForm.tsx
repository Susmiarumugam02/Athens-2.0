import React, { useState, useEffect, useMemo } from 'react';
import {
  Form, InputNumber, Button, Typography, Row, Col, Card,
  Space, Select, DatePicker, Input, Tag, Statistic, Alert,
  Divider, Tooltip, Badge, message, Modal
} from 'antd';
import {
  CalendarOutlined, TeamOutlined, ToolOutlined, SaveOutlined,
  UserOutlined, ClockCircleOutlined, CheckCircleOutlined,
  BarChartOutlined, PlusOutlined, InfoCircleOutlined, EyeOutlined,
  TableOutlined, EditOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import api from '@common/utils/axiosetup';
import PageLayout from '@common/components/PageLayout';
import useAuthStore from '@common/store/authStore';
import styled from 'styled-components';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Styled Components
const AttendanceCard = styled(Card)`
  border-radius: 12px;
  border: 2px solid #f0f0f0;
  transition: all 0.3s ease;
  margin-bottom: 16px;

  &:hover {
    border-color: #1890ff;
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
  }

  .ant-card-head {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 10px 10px 0 0;
    border-bottom: none;
  }

  .ant-card-head-title {
    color: white;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

const CategoryCard = styled(Card)`
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  transition: all 0.2s ease;
  height: 100%;

  &:hover {
    border-color: #1890ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .ant-card-body {
    padding: 16px;
  }
`;

const SummaryCard = styled(Card)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: white;

  .ant-statistic-title {
    color: rgba(255, 255, 255, 0.8) !important;
  }

  .ant-statistic-content {
    color: white !important;
  }
`;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 12px;
    overflow: hidden;
  }

  .ant-modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-bottom: none;
    padding: 20px 24px;

    .ant-modal-title {
      color: white;
      font-weight: 600;
      font-size: 16px;
    }
  }

  .ant-modal-close {
    color: white;

    &:hover {
      color: rgba(255, 255, 255, 0.8);
    }
  }

  .ant-modal-body {
    padding: 24px;
  }

  .ant-modal-footer {
    border-top: 1px solid #f0f0f0;
    padding: 16px 24px;
  }
`;

// Interfaces
interface WorkType {
  id: number;
  name: string;
  description: string;
  color_code: string;
  is_active: boolean;
}

// Constants
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

interface DailyAttendanceFormProps {
  onSuccess?: () => void;
}

const DailyAttendanceForm: React.FC<DailyAttendanceFormProps> = ({ onSuccess }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { usertype, django_user_type, username } = useAuthStore();

  // State
  const [loading, setLoading] = useState(false);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [selectedDate, setSelectedDate] = useState(moment());
  const [selectedWorkType, setSelectedWorkType] = useState<number | null>(null);
  const [selectedShift, setSelectedShift] = useState('day');
  const [workDescription, setWorkDescription] = useState('');
  const [todaysSummary, setTodaysSummary] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [workTypeModalVisible, setWorkTypeModalVisible] = useState(false);
  const [newWorkTypeName, setNewWorkTypeName] = useState('');
  const [newWorkTypeDescription, setNewWorkTypeDescription] = useState('');
  const [addingWorkType, setAddingWorkType] = useState(false);

  // Permission check
  const canAddManpower = django_user_type === 'adminuser' &&
    ['clientuser', 'epcuser', 'contractoruser'].includes(usertype || '');

  // Initial form values
  const initialFormValues = useMemo(() => {
    return workerCategories.reduce((acc, category) => {
      acc[category.key] = { Male: 0, Female: 0, Others: 0 };
      return acc;
    }, {} as Record<string, Record<string, number>>);
  }, []);

  // Load work types on component mount (only once)
  useEffect(() => {
    if (canAddManpower) {
      loadWorkTypes();
    }
  }, [canAddManpower]);

  // Load today's summary when date changes
  useEffect(() => {
    if (canAddManpower) {
      loadTodaysSummary();
    }
  }, [canAddManpower, selectedDate]);

  const loadWorkTypes = async () => {
    try {
      const response = await api.get('/man/work-types/');
      setWorkTypes(response.data);
    } catch (error) {
    }
  };

  const resetWorkTypeModal = () => {
    setNewWorkTypeName('');
    setNewWorkTypeDescription('');
    setWorkTypeModalVisible(false);
  };

  const handleAddWorkType = async () => {
    if (!newWorkTypeName.trim()) {
      messageApi.error('Please enter a work type name');
      return;
    }

    try {
      setAddingWorkType(true);
      const payload = {
        name: newWorkTypeName.trim(),
        description: newWorkTypeDescription.trim() || '',
        color_code: '#1890ff', // Default blue color
        is_active: true
      };

      const response = await api.post('/man/work-types/', payload);

      // Add to local state
      setWorkTypes(prev => {
        const updated = [...prev, response.data];
        return updated;
      });

      // Select the newly created work type
      setSelectedWorkType(response.data.id);

      // Reset form and close modal
      resetWorkTypeModal();

      messageApi.success('Work type added successfully!');
    } catch (error: any) {
      messageApi.error(error.response?.data?.error || 'Failed to add work type');
    } finally {
      setAddingWorkType(false);
    }
  };

  const loadTodaysSummary = async () => {
    try {
      const response = await api.get(`/man/daily-summary/?start_date=${selectedDate.format('YYYY-MM-DD')}&end_date=${selectedDate.format('YYYY-MM-DD')}`);
      if (response.data.summaries && response.data.summaries.length > 0) {
        setTodaysSummary(response.data.summaries[0]);
      } else {
        setTodaysSummary(null);
      }
    } catch (error) {
    }
  };

  const onFinish = async (values: any) => {
    try {
      setLoading(true);

      // Calculate total workers
      const totalWorkers = workerCategories.reduce((sum, category) => {
        const categoryData = values[category.key] || { Male: 0, Female: 0, Others: 0 };
        return sum + (categoryData.Male || 0) + (categoryData.Female || 0) + (categoryData.Others || 0);
      }, 0);

      if (totalWorkers === 0) {
        messageApi.warning('Please enter the number of workers for at least one category.');
        return;
      }

      if (!workDescription.trim()) {
        messageApi.warning('Please describe what work was done today.');
        return;
      }

      const payload = {
        date: selectedDate.format('YYYY-MM-DD'),
        categories: workerCategories.reduce((acc, category) => {
          acc[category.key] = values[category.key] || { Male: 0, Female: 0, Others: 0 };
          return acc;
        }, {} as Record<string, Record<string, number>>),
        work_type_id: selectedWorkType || null,
        shift: selectedShift || 'general',
        hours_worked: 8.0,
        overtime_hours: 0.0,
        attendance_status: 'present',
        notes: `Work Description: ${workDescription}\nCreated by: ${username}\nShift: ${selectedShift}\nDate: ${selectedDate.format('YYYY-MM-DD')}`
      };


      const response = await api.post('/man/manpower/', payload);
      messageApi.success({
        content: `✅ Attendance recorded successfully! Total workers: ${totalWorkers}`,
        duration: 5,
      });

      // Reload summary and reset form
      loadTodaysSummary();
      form.resetFields();
      setWorkDescription('');
      setRefreshKey(prev => prev + 1);

      // Call success callback if provided (for modal usage)
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error: any) {
      messageApi.error(error.response?.data?.error || 'Failed to record attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate current totals with real-time updates
  const [formValues, setFormValues] = useState<any>({});

  const calculateTotals = () => {
    const values = form.getFieldsValue();
    let totalWorkers = 0;
    const categoryTotals: Record<string, number> = {};

    workerCategories.forEach(category => {
      const categoryData = values[category.key] || { Male: 0, Female: 0, Others: 0 };
      const categoryTotal = (categoryData.Male || 0) + (categoryData.Female || 0) + (categoryData.Others || 0);
      totalWorkers += categoryTotal;
      categoryTotals[category.key] = categoryTotal;
    });

    return { totalWorkers, categoryTotals };
  };

  const { totalWorkers, categoryTotals } = calculateTotals();

  // Watch form changes for real-time updates
  const handleFormChange = () => {
    const newValues = form.getFieldsValue();
    setFormValues(newValues);
  };

  if (!canAddManpower) {
    return (
      <PageLayout title="Access Denied">
        <Alert
          message="Permission Denied"
          description="Only admin users can record daily attendance."
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          }
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Daily Workforce Attendance"
      subtitle={`Record who came to work today - ${selectedDate.format('MMMM DD, YYYY')}`}
      extra={
        <Space>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => navigate('/dashboard/manpower')}
          >
            Back to List
          </Button>
        </Space>
      }
    >
      {contextHolder}
      {/* Today's Summary (if exists) */}
      {todaysSummary && (
        <Alert
          message="Today's Attendance Already Recorded"
          description={
            <div>
              <Text>Total Workers: <strong>{todaysSummary.total_workers}</strong> | </Text>
              <Text>Present: <strong>{todaysSummary.present_count}</strong> | </Text>
              <Text>Total Hours: <strong>{todaysSummary.total_hours}</strong></Text>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" onClick={() => setTodaysSummary(null)}>
              Add More
            </Button>
          }
        />
      )}

      {/* Configuration Section */}
      <AttendanceCard title={
        <span>
          <CalendarOutlined />
          Attendance Configuration
        </span>
      }>
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text strong>Date</Text>
              <DatePicker
                value={selectedDate}
                onChange={(date) => setSelectedDate(date || moment())}
                style={{ width: '100%', marginTop: 8 }}
                format="YYYY-MM-DD"
                disabledDate={(current) => {
                  // Disable dates more than 30 days in the future or past
                  const today = moment();
                  return current && (
                    current.isAfter(today.add(30, 'days')) ||
                    current.isBefore(today.subtract(60, 'days'))
                  );
                }}
                showToday={true}
                allowClear={false}
                placeholder="Select date"
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong>Work Type</Text>
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setWorkTypeModalVisible(true)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  Add New
                </Button>
              </div>
              <Select
                value={selectedWorkType}
                onChange={setSelectedWorkType}
                placeholder={workTypes.length === 0 ? "No work types - Click 'Add New'" : "Select work type"}
                style={{ width: '100%' }}
                allowClear
                notFoundContent={
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{ marginBottom: 8 }}>No work types found</div>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setWorkTypeModalVisible(true)}
                    >
                      Add Work Type
                    </Button>
                  </div>
                }
              >
                {workTypes.map(wt => (
                  <Option key={wt.id} value={wt.id}>
                    <Tag color={wt.color_code}>{wt.name}</Tag>
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text strong>Shift</Text>
              <Select
                value={selectedShift}
                onChange={setSelectedShift}
                style={{ width: '100%', marginTop: 8 }}
              >
                {workShifts.map(shift => (
                  <Option key={shift.value} value={shift.value}>
                    <Tag color={shift.color}>{shift.label}</Tag>
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text strong>Recorded By</Text>
              <div style={{ marginTop: 8 }}>
                <Tag color="blue" icon={<UserOutlined />}>
                  {username}
                </Tag>
              </div>
            </div>
          </Col>
        </Row>
        
        <Divider />
        
        <Row>
          <Col span={24}>
            <div>
              <Text strong>Work Description <span style={{ color: '#ff4d4f' }}>*</span></Text>
              <Tooltip title="Describe what work was done today">
                <InfoCircleOutlined style={{ marginLeft: 4, color: '#1890ff' }} />
              </Tooltip>
              <TextArea
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                placeholder="Describe the work activities for today (e.g., Construction of foundation, Electrical installation, Safety inspection, etc.)"
                rows={3}
                style={{ marginTop: 8 }}
                maxLength={500}
                showCount
              />
            </div>
          </Col>
        </Row>
      </AttendanceCard>

      {/* Current Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <SummaryCard>
            <Statistic
              title="Total Workers Today"
              value={totalWorkers}
              prefix={<TeamOutlined />}
            />
          </SummaryCard>
        </Col>
        <Col xs={24} sm={8}>
          <SummaryCard>
            <Statistic
              title="Total Hours"
              value={totalWorkers * 8}
              suffix="hrs"
              prefix={<ClockCircleOutlined />}
            />
          </SummaryCard>
        </Col>
        <Col xs={24} sm={8}>
          <SummaryCard>
            <Statistic
              title="Categories Filled"
              value={Object.values(categoryTotals).filter(total => total > 0).length}
              suffix={`/ ${workerCategories.length}`}
              prefix={<CheckCircleOutlined />}
            />
          </SummaryCard>
        </Col>
      </Row>

      {/* Attendance Form */}
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={initialFormValues}
        onValuesChange={handleFormChange}
      >
        <AttendanceCard title={
          <span>
            <TeamOutlined />
            Worker Attendance by Category
          </span>
        }>
          <Row gutter={[16, 16]}>
            {workerCategories.map((category) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={category.key}>
                <CategoryCard>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: '24px', marginBottom: 8 }}>
                      {category.icon}
                    </div>
                    <Title level={5} style={{ margin: 0, color: category.color }}>
                      {category.label}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Total: {categoryTotals[category.key] || 0}
                    </Text>
                  </div>

                  {genders.map((gender) => (
                    <Form.Item
                      key={`${category.key}-${gender}`}
                      name={[category.key, gender]}
                      label={
                        <span style={{ fontSize: 12, fontWeight: 500 }}>
                          {gender === 'Male' ? '👨' : gender === 'Female' ? '👩' : '👤'} {gender}
                        </span>
                      }
                      style={{ marginBottom: 12 }}
                    >
                      <InputNumber
                        min={0}
                        max={999}
                        placeholder="0"
                        style={{ width: '100%' }}
                        size="small"
                      />
                    </Form.Item>
                  ))}

                  <div style={{
                    background: categoryTotals[category.key] > 0 ? '#f6ffed' : '#f5f5f5',
                    border: `1px solid ${categoryTotals[category.key] > 0 ? '#b7eb8f' : '#d9d9d9'}`,
                    borderRadius: 4,
                    padding: '4px 8px',
                    textAlign: 'center',
                    marginTop: 8
                  }}>
                    <Text style={{
                      color: categoryTotals[category.key] > 0 ? '#52c41a' : '#8c8c8c',
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      {categoryTotals[category.key] > 0 ? '✓' : '○'} {categoryTotals[category.key] || 0} workers
                    </Text>
                  </div>
                </CategoryCard>
              </Col>
            ))}
          </Row>
        </AttendanceCard>

        {/* Submit Section */}
        <Card style={{ textAlign: 'center', marginTop: 24 }}>
          <Space direction="vertical" size="large">
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Ready to Submit Attendance?
              </Title>
              <Paragraph type="secondary">
                Total Workers: <strong>{totalWorkers}</strong> |
                Work Type: <strong>{workTypes.find(wt => wt.id === selectedWorkType)?.name || 'General'}</strong> |
                Shift: <strong>{workShifts.find(s => s.value === selectedShift)?.label}</strong>
              </Paragraph>
            </div>

            <Space size="large">
              <Button
                size="large"
                onClick={() => {
                  form.resetFields();
                  setWorkDescription('');
                  setRefreshKey(prev => prev + 1);
                }}
                disabled={loading}
              >
                Reset Form
              </Button>
              <Button
                size="large"
                onClick={() => {
                  const values = form.getFieldsValue();
                  alert(`Debug Info:\nTotal Workers: ${totalWorkers}\nWork Description: "${workDescription}"\nForm Values: ${JSON.stringify(values, null, 2)}`);
                }}
                disabled={loading}
              >
                Debug Info
              </Button>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={loading}
                icon={<SaveOutlined />}
                disabled={totalWorkers <= 0 || !workDescription.trim()}
                style={{ minWidth: 200 }}
              >
                Record Today's Attendance ({totalWorkers} workers)
              </Button>
            </Space>

            {totalWorkers <= 0 && (
              <Alert
                message={`Please add at least one worker to submit attendance. Current total: ${totalWorkers}`}
                description="Fill in the number of workers in any category above."
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}

            {!workDescription.trim() && totalWorkers > 0 && (
              <Alert
                message="Please describe what work was done today"
                description="Add a description of the work activities in the 'Work Description' field above."
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Space>
        </Card>
      </Form>

      {/* Navigation Card - Only show when not in modal */}
      {!onSuccess && (
        <Card
          title={
            <Space>
              <TableOutlined />
              <span>Manage Attendance Records</span>
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <div style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<TableOutlined />}
              onClick={() => navigate('/dashboard/manpower')}
              style={{ minWidth: 250 }}
            >
              Go to Manpower Management
            </Button>
          </div>
        </Card>
      )}

      {/* Add Work Type Modal */}
      <StyledModal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusOutlined />
            <span>Add New Work Type</span>
          </div>
        }
        open={workTypeModalVisible}
        onCancel={resetWorkTypeModal}
        width={500}
        centered
        destroyOnHidden
        maskClosable={false}
        zIndex={1050}
        style={{ top: 20 }}
        footer={[
          <Button
            key="cancel"
            onClick={resetWorkTypeModal}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={addingWorkType}
            onClick={handleAddWorkType}
            disabled={!newWorkTypeName.trim()}
          >
            Add Work Type
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item
            label="Work Type Name"
            required
            help="Enter a descriptive name for this work type (e.g., 'Concrete Work', 'Steel Fixing')"
          >
            <Input
              value={newWorkTypeName}
              onChange={(e) => setNewWorkTypeName(e.target.value)}
              placeholder="Enter work type name"
              maxLength={100}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="Description (Optional)"
            help="Add more details about this work type"
          >
            <Input.TextArea
              value={newWorkTypeDescription}
              onChange={(e) => setNewWorkTypeDescription(e.target.value)}
              placeholder="Describe what this work type involves..."
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </StyledModal>
    </PageLayout>
  );
};

export default DailyAttendanceForm;

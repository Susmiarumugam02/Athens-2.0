import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  DatePicker,
  Select,
  Upload,
  App,
  Card,
  Divider,
  Row,
  Col,
  Tooltip,
  Modal,
  Tag,
  Spin,
  Alert
} from 'antd';
import {
  UploadOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  SendOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useIncidents } from '../hooks/useIncidents';
import {
  IncidentFormData,
  INCIDENT_TYPES,
  SEVERITY_LEVELS,
  RISK_LEVELS,
  BUSINESS_IMPACT_LEVELS,
  REGULATORY_FRAMEWORKS,
  COST_CATEGORIES,
  Incident,
  UserPermissions
} from '../types';
import useAuthStore from '../../../common/store/authStore';
import api from '../../../common/utils/axiosetup';

const { TextArea } = Input;
const { Option } = Select;

// Department options - these could be fetched from an API
const departmentOptions = [
  'Production',
  'HR',
  'Maintenance',
  'Safety',
  'Operations',
  'Engineering',
  'Quality Control',
  'Logistics',
  'Administration'
];

interface IncidentFormProps {
  mode?: 'create' | 'edit';
  initialData?: Partial<Incident>;
  onSubmit?: (data: IncidentFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}
// Add this helper function inside your IncidentForm component
const getBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const IncidentForm: React.FC<IncidentFormProps> = ({
  mode = 'create',
  initialData,
  onSubmit,
  onCancel,
  loading: externalLoading = false
}) => {
  // Always call hooks in the same order
  const { message,modal } = App.useApp();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  // ADD THIS LINE
  const severityLevel = Form.useWatch('severity_level', form);

  // Always call these hooks regardless of mode
  const { createIncident, updateIncident, loading: hookLoading } = useIncidents({ autoFetch: false });
  const { username } = useAuthStore();

  const isLoading = externalLoading || hookLoading || submitting;

  // Fetch current user's name for reporter field
  useEffect(() => {
    const fetchCurrentUserName = async () => {
      try {
        const response = await api.get('/authentication/admin/me/');
        const userData = response.data;
        const fullName = userData.name || username || 'Unknown User';
        setCurrentUserName(fullName);

        // Auto-populate reporter_name field if in create mode
        if (mode === 'create') {
          form.setFieldValue('reporter_name', fullName);
        }
      } catch (error) {
        // Fallback to username if API call fails
        const fallbackName = username || 'Unknown User';
        setCurrentUserName(fallbackName);
        if (mode === 'create') {
          form.setFieldValue('reporter_name', fallbackName);
        }
      }
    };

    if (username) {
      fetchCurrentUserName();
    }
  }, [username, mode, form]);

  // Initialize form with existing data in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      form.setFieldsValue({
        title: initialData.title,
        description: initialData.description,
        incident_type: initialData.incident_type,
        severity_level: initialData.severity_level,
        location: initialData.location,
        department: initialData.department,
        date_time_incident: initialData.date_time_incident ? dayjs(initialData.date_time_incident) : null,
        reporter_name: initialData.reporter_name,
        immediate_action_taken: initialData.immediate_action_taken,
        potential_causes: initialData.potential_causes,

        // Commercial grade fields
        probability_score: initialData.probability_score,
        impact_score: initialData.impact_score,
        estimated_cost: initialData.estimated_cost,
        cost_category: initialData.cost_category,
        regulatory_framework: initialData.regulatory_framework,
        regulatory_reportable: initialData.regulatory_reportable,
        business_impact: initialData.business_impact,
        production_impact_hours: initialData.production_impact_hours,
        personnel_affected_count: initialData.personnel_affected_count,
        weather_conditions: initialData.weather_conditions,
        environmental_factors: initialData.environmental_factors,
        equipment_involved: initialData.equipment_involved,
        equipment_serial_numbers: initialData.equipment_serial_numbers,
        work_process: initialData.work_process,
        work_permit_number: initialData.work_permit_number,
        safety_procedures_followed: initialData.safety_procedures_followed,
        family_notified: initialData.family_notified,
        media_attention: initialData.media_attention,
      });
    
    }
  }, [mode, initialData, form]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);

    try {
      // Validate required fields
      if (!values.date_time_incident) {
        message.error('Please select the date and time of incident');
        setSubmitting(false);
        return;
      }

      // Prepare form data
      const formData: IncidentFormData = {
        title: values.title,
        description: values.description,
        incident_type: values.incident_type,
        severity_level: values.severity_level,
        location: values.location,
        department: values.department,
        date_time_incident: values.date_time_incident.toISOString(),
        reporter_name: values.reporter_name,
        immediate_action_taken: values.immediate_action_taken || '',
        potential_causes: values.potential_causes || '',
        attachments: fileList.map(file => file.originFileObj).filter(Boolean),
        
        // Commercial grade fields
        probability_score: values.probability_score,
        impact_score: values.impact_score,
        estimated_cost: values.estimated_cost,
        cost_category: values.cost_category,
        regulatory_framework: values.regulatory_framework,
        regulatory_reportable: values.regulatory_reportable,
        business_impact: values.business_impact,
        production_impact_hours: values.production_impact_hours,
        personnel_affected_count: values.personnel_affected_count,
        weather_conditions: values.weather_conditions,
        environmental_factors: values.environmental_factors,
        equipment_involved: values.equipment_involved,
        equipment_serial_numbers: values.equipment_serial_numbers,
        work_process: values.work_process,
        work_permit_number: values.work_permit_number,
        safety_procedures_followed: values.safety_procedures_followed,
        family_notified: values.family_notified,
        media_attention: values.media_attention,
      };

      let result;
      if (onSubmit) {
        result = await onSubmit(formData);
      } else if (mode === 'create') {
        result = await createIncident(formData);
        // Reset form after successful creation
        form.resetFields();
        setFileList([]);
      } else if (mode === 'edit' && initialData?.id) {
        result = await updateIncident(initialData.id, formData);
      }

      // Only show success message if we reach this point (no errors thrown)
      message.success(`Incident ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      
    } catch (error: any) {
      // Clear any existing success messages
      message.destroy();
      
      // Handle different types of errors
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 400 && data) {
          // Validation errors
          const errorMessages = [];
          for (const [field, messages] of Object.entries(data)) {
            const fieldErrors = Array.isArray(messages) ? messages : [messages];
            errorMessages.push(`${field}: ${fieldErrors.join(', ')}`);
          }
          message.error(`Validation Error: ${errorMessages.join('; ')}`);
        } else if (status === 500) {
          message.error('Server Error: Please check your data and try again. If the problem persists, contact support.');
        } else {
          message.error(`Error ${status}: ${data.detail || data.message || 'An unexpected error occurred'}`);
        }
      } else if (error.request) {
        // Network error
        message.error('Network Error: Unable to connect to server. Please check your connection and try again.');
      } else {
        // Other errors
        message.error(`Error: ${error.message || 'An unexpected error occurred'}`);
      }
    } finally {
      setSubmitting(false);
    }
  };
const onFinish = (values: any) => {

  // USE THE FIXED MODAL
  modal.confirm({
    title: `Confirm ${mode === 'create' ? 'Submission' : 'Update'}`,
    icon: <ExclamationCircleOutlined />,
    content: `Are you sure you want to ${mode === 'create' ? 'submit this incident report' : 'update this incident'}?`,
    okText: 'Yes',
    cancelText: 'No',
    onOk: () => {
      handleSubmit(values);
    },
    onCancel: () => {
    }
  });
};
  const onFinishFailed = (errorInfo: any) => {
    message.error('Please fill in all required fields correctly');
  };

  const disabledTime = (current: dayjs.Dayjs) => {
    if (!current) {
      return {};
    }
    const now = dayjs();
    if (current.isSame(now, 'day')) {
      return {
        disabledHours: () => {
          const hours = [];
          for (let i = now.hour() + 1; i < 24; i++) {
            hours.push(i);
          }
          return hours;
        },
        disabledMinutes: (hour: number) => {
          if (hour === now.hour()) {
            const minutes = [];
            for (let i = now.minute() + 1; i < 60; i++) {
              minutes.push(i);
            }
            return minutes;
          }
          return [];
        },
        disabledSeconds: (hour: number, minute: number) => {
          if (hour === now.hour() && minute === now.minute()) {
            const seconds = [];
            for (let i = now.second() + 1; i < 60; i++) {
              seconds.push(i);
            }
            return seconds;
          }
          return [];
        },
      };
    }
    return {};
  };

  const beforeUpload = (file: any) => {
    const isAllowedType = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'video/mp4'
    ].includes(file.type);

    if (!isAllowedType) {
      message.error('You can only upload JPG/PNG/GIF/PDF/DOC/DOCX/MP4 files!');
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('File must be smaller than 5MB!');
      return false;
    }

    return false; // Prevent auto upload, we'll handle it manually
  };

 
  const getSeverityColor = (severity: string) => {
    const severityConfig = SEVERITY_LEVELS.find(s => s.value === severity);
    return severityConfig?.color || 'default';
  };

  // Find your handleUploadChange function
const handleUploadChange = (info: any) => {
    // ... your existing code to limit to 5 files is fine ...

    // THIS IS THE NEW LOGIC
    // We manually add a preview to each new file
    info.fileList.forEach(async (file: any) => {
        // If the file doesn't have a thumbUrl and has its originFileObj, it's a new file
        if (!file.thumbUrl && file.originFileObj) {
            try {
                // Generate a preview and assign it to the file object
                file.thumbUrl = await getBase64(file.originFileObj);
            } catch (e) {
            }
        }
    });

    // Now, update the state with the file list that includes the previews
    setFileList([...info.fileList]);
};

  return (
    <Spin spinning={isLoading}>
      <Card
        title={`${mode === 'create' ? 'Create' : 'Edit'} Incident Report`}
        variant="borderless"
        style={{ maxWidth: 1000, margin: 'auto' }}
        extra={
          onCancel && (
            <Button onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )
        }
      >
        {mode === 'edit' && initialData && (
          <Alert
            message={`Editing Incident: ${initialData.incident_id}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          size="large"
          disabled={isLoading}
        >
          <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
            Basic Information
          </Divider>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Incident Title"
                name="title"
                rules={[
                  { required: true, message: 'Please enter incident title', whitespace: true },
                  { min: 5, message: 'Title must be at least 5 characters' },
                  { max: 255, message: 'Title cannot exceed 255 characters' }
                ]}
              >
                <Input
                  placeholder="Brief description of the incident"
                  size="large"
                  maxLength={255}
                  showCount
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Date and Time of Incident&nbsp;
                    <Tooltip title="Select the date and time when the incident occurred. Future dates are not allowed.">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="date_time_incident"
                rules={[
                  { required: true, message: 'Please select date and time of incident' },
                  {
                    validator: (_, value) =>
                      value && value.isAfter(dayjs())
                        ? Promise.reject(new Error('Date/time cannot be in the future'))
                        : Promise.resolve(),
                  },
                ]}
              >
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  disabledDate={current => current && current > dayjs().endOf('day')}
                  disabledTime={disabledTime}
                  style={{ width: '100%' }}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Location"
              name="location"
              rules={[
                { required: true, message: 'Please enter location' },
                { max: 255, message: 'Maximum 255 characters' },
              ]}
            >
              <Input
                placeholder="Specific location where incident occurred"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={
                <>
                  Department&nbsp;
                  <Tooltip title="Select the department where the incident occurred.">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              name="department"
              rules={[{ required: true, message: 'Please select department' }]}
            >
              <Select placeholder="Select department" size="large">
                {departmentOptions.map(dep => (
                  <Option key={dep} value={dep}>
                    {dep}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              label={
                <>
                  Reporter Name&nbsp;
                  {mode === 'create' && (
                    <Tooltip title="Automatically filled with your name">
                      <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                  )}
                </>
              }
              name="reporter_name"
              rules={[
                { required: true, message: 'Please enter reporter name' },
                { min: 2, message: 'Name must be at least 2 characters' },
                { max: 100, message: 'Name cannot exceed 100 characters' }
              ]}
            >
              <Input
                placeholder={mode === 'create' ? 'Auto-filled with your name' : 'Name of person reporting the incident'}
                size="large"
                disabled={mode === 'create'}
                style={mode === 'create' ? { backgroundColor: '#f5f5f5', color: '#1890ff', fontWeight: 'bold' } : {}}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={
                <>
                  Type of Incident&nbsp;
                  <Tooltip title="Select the type of incident that occurred.">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              name="incident_type"
              rules={[{ required: true, message: 'Please select type of incident' }]}
            >
              <Select placeholder="Select type of incident" size="large">
                {INCIDENT_TYPES.map(type => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
                label={
    <>
      Severity Level 
      <Tooltip title="Select the severity level of the incident.">
        <InfoCircleOutlined />
      </Tooltip>
    </>
  }
  name="severity_level"
  rules={[{ required: true, message: 'Please select severity level' }]}
>
  <Select placeholder="Select severity level" size="large">
    {SEVERITY_LEVELS.map(level => (
      <Option key={level.value} value={level.value}>
        <Tag color={level.color}>{level.label}</Tag>
      </Option>
    ))}
  </Select>
            </Form.Item>
            {severityLevel && (
              <Tag
                color={getSeverityColor(severityLevel)}
                style={{ marginTop: 8, fontSize: 16, padding: '4px 12px' }}
              >
                {SEVERITY_LEVELS.find(s => s.value === severityLevel)?.label}
              </Tag>
            )}
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={
                <>
                  Description&nbsp;
                  <Tooltip title="Provide a detailed description of the incident (10-1000 characters).">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              name="description"
              rules={[
                { required: true, message: 'Please enter incident description' },
                { min: 10, message: 'Description must be at least 10 characters' },
                { max: 1000, message: 'Description cannot exceed 1000 characters' }
              ]}
            >
              <TextArea
                rows={4}
                placeholder="Detailed description of what happened..."
                showCount
                maxLength={1000}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
          Additional Information
        </Divider>

        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Immediate Action Taken"
              name="immediate_action_taken"
              rules={[
                { max: 500, message: 'Maximum 500 characters' }
              ]}
            >
              <TextArea
                rows={3}
                placeholder="Describe any immediate actions taken after the incident..."
                showCount
                maxLength={500}
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Potential Causes"
              name="potential_causes"
              rules={[
                { max: 500, message: 'Maximum 500 characters' }
              ]}
            >
              <TextArea
                rows={3}
                placeholder="Initial assessment of potential causes..."
                showCount
                maxLength={500}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* === COMMERCIAL GRADE ENHANCEMENTS === */}

        <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
          Risk Assessment
        </Divider>

        <Row gutter={24}>
          <Col xs={24} sm={8}>
            <Form.Item
              label={
                <>
                  Probability Score&nbsp;
                  <Tooltip title="Rate the likelihood of this incident recurring (1=Very Unlikely, 5=Almost Certain)">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              name="probability_score"
            >
              <Select placeholder="Select probability (1-5)" size="large">
                {[1, 2, 3, 4, 5].map(score => (
                  <Option key={score} value={score}>
                    {score} - {score === 1 ? 'Very Unlikely' : score === 2 ? 'Unlikely' : score === 3 ? 'Possible' : score === 4 ? 'Likely' : 'Almost Certain'}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              label={
                <>
                  Impact Score&nbsp;
                  <Tooltip title="Rate the severity of impact (1=Negligible, 5=Catastrophic)">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              name="impact_score"
            >
              <Select placeholder="Select impact (1-5)" size="large">
                {[1, 2, 3, 4, 5].map(score => (
                  <Option key={score} value={score}>
                    {score} - {score === 1 ? 'Negligible' : score === 2 ? 'Minor' : score === 3 ? 'Moderate' : score === 4 ? 'Major' : 'Catastrophic'}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              label={
                <>
                  Business Impact&nbsp;
                  <Tooltip title="Overall impact on business operations">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              name="business_impact"
            >
              <Select placeholder="Select business impact" size="large">
                {BUSINESS_IMPACT_LEVELS.map(level => (
                  <Option key={level.value} value={level.value}>
                    <Tag color={level.color}>{level.label}</Tag>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              label={
                <>
                  Production Impact (Hours)&nbsp;
                  <Tooltip title="Number of production hours lost due to this incident">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              name="production_impact_hours"
            >
              <Input
                type="number"
                min={0}
                step={0.5}
                placeholder="Hours of production lost"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={
                <>
                  Personnel Affected&nbsp;
                  <Tooltip title="Number of people affected by this incident">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              name="personnel_affected_count"
            >
              <Input
                type="number"
                min={0}
                placeholder="Number of people affected"
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
          Financial Impact
        </Divider>

        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              label={
                <>
                  Estimated Cost&nbsp;
                  <Tooltip title="Estimated financial impact of this incident">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              name="estimated_cost"
            >
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="Estimated cost (USD)"
                size="large"
                prefix="$"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={
                <>
                  Cost Category&nbsp;
                  <Tooltip title="Primary category of cost associated with this incident">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              name="cost_category"
            >
              <Select placeholder="Select cost category" size="large">
                {COST_CATEGORIES.map(category => (
                  <Option key={category.value} value={category.value}>
                    {category.icon} {category.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
          Regulatory & Compliance
        </Divider>

        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              label={
                <>
                  Regulatory Framework&nbsp;
                  <Tooltip title="Applicable regulatory framework for this incident">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              name="regulatory_framework"
            >
              <Select placeholder="Select regulatory framework" size="large">
                {REGULATORY_FRAMEWORKS.map(framework => (
                  <Option key={framework.value} value={framework.value}>
                    {framework.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={
                <>
                  Regulatory Reportable&nbsp;
                  <Tooltip title="Must this incident be reported to regulatory authorities?">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              name="regulatory_reportable"
              valuePropName="checked"
            >
              <Select placeholder="Regulatory reportable?" size="large">
                <Option value={true}>Yes - Must be reported</Option>
                <Option value={false}>No - Internal only</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
          Environmental & Work Context
        </Divider>

        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Weather Conditions"
              name="weather_conditions"
            >
              <Input
                placeholder="Weather conditions at time of incident"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Work Process"
              name="work_process"
            >
              <Input
                placeholder="Specific work process being performed"
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Work Permit Number"
              name="work_permit_number"
            >
              <Input
                placeholder="Work permit or authorization number"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={
                <>
                  Safety Procedures Followed&nbsp;
                  <Tooltip title="Were proper safety procedures followed?">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              name="safety_procedures_followed"
            >
              <Select placeholder="Safety procedures followed?" size="large">
                <Option value={true}>✅ Yes - Procedures followed</Option>
                <Option value={false}>❌ No - Procedures not followed</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24}>
            <Form.Item
              label="Equipment Involved"
              name="equipment_involved"
            >
              <TextArea
                rows={2}
                placeholder="Equipment, tools, or machinery involved in the incident..."
                showCount
                maxLength={500}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Equipment Serial Numbers"
              name="equipment_serial_numbers"
            >
              <Input
                placeholder="Serial numbers of equipment involved"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Environmental Factors"
              name="environmental_factors"
            >
              <Input
                placeholder="Environmental conditions that contributed"
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
          Communication & Notifications
        </Divider>

        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Family Notified"
              name="family_notified"
              valuePropName="checked"
            >
              <Select placeholder="Was family notified?" size="large">
                <Option value={true}>Yes - Family notified</Option>
                <Option value={false}>No - Family not notified</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Media Attention"
              name="media_attention"
              valuePropName="checked"
            >
              <Select placeholder="Media attention?" size="large">
                <Option value={true}>Yes - Media involved</Option>
                <Option value={false}>No - No media attention</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
          Attachments
        </Divider>

        <Form.Item
          label={
            <>
              Upload Supporting Files&nbsp;
              <Tooltip title="Upload images, documents, or videos related to the incident. Maximum 5 files, 5MB each.">
                <InfoCircleOutlined />
              </Tooltip>
            </>
          }
          name="attachments"
          valuePropName="fileList"
          getValueFromEvent={() => fileList}
        >
          <Upload.Dragger
            beforeUpload={beforeUpload}
            onChange={handleUploadChange}
            multiple
            fileList={fileList}
            maxCount={5}
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.mp4"
            listType="picture"
            showUploadList={{
              showPreviewIcon: true,
              showRemoveIcon: true,
              showDownloadIcon: false
            }}
            style={{ fontSize: 16 }}
          >
            <p className="ant-upload-drag-icon" style={{ fontSize: 24 }}>
              <UploadOutlined />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 18 }}>
              Click or drag files to this area to upload
            </p>
            <p className="ant-upload-hint" style={{ fontSize: 14 }}>
              Support for JPG, PNG, GIF, PDF, DOC, DOCX, MP4 files. Maximum 5 files, 5MB each.
            </p>
          </Upload.Dragger>
        </Form.Item>

        <Divider />

        <Form.Item style={{ textAlign: 'center', marginTop: 32 }}>
          <Row gutter={16} justify="center">
            {onCancel && (
              <Col>
                <Button
                  size="large"
                  onClick={onCancel}
                  disabled={isLoading}
                  style={{ minWidth: 120 }}
                >
                  Cancel
                </Button>
              </Col>
            )}
            <Col>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={isLoading}
                icon={mode === 'create' ? <SendOutlined /> : <SaveOutlined />}
                style={{ minWidth: 200, height: 48, fontSize: 16 }}
                onClick={() => {
                }}
              >
                {mode === 'create' ? 'Submit Incident Report' : 'Update Incident'}
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Card>
    </Spin>
  );
};

export default IncidentForm;

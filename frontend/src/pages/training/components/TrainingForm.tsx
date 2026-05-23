import React, { useEffect, useState } from 'react';
import { Avatar, Button, Card, Checkbox, Col, DatePicker, Divider, Form, Input, Row, Select, Space, Typography, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { apiClient } from '../../../lib/api';
import dayjs from 'dayjs';
import { DEFAULT_TRAINING_TYPE, TRAINING_TYPES } from '../trainingTypes';
import { useConsideringParameters } from '../../../hooks/useConsideringParameters';
import ConsideringParametersPanel from '../../../components/ConsideringParametersPanel';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface EmployeeOption {
  id: number;
  email: string;
  name: string;
  employee_code?: string;
  department?: string;
  designation?: string;
  profile_photo?: string | null;
  status?: string;
}

const participantRequiredTypes = [
  'induction_training',
  'safety_training',
  'ptw_training',
  'toolbox_training',
  'inspection_training',
];

const trainingTypeAliases: Record<string, string> = {
  'Induction Training': 'induction_training',
  'Safety Training': 'safety_training',
  'Inspection Training': 'inspection_training',
  'PTW Training': 'ptw_training',
  'Toolbox Training': 'toolbox_training',
  'Toolbox Talk': 'toolbox_training',
  'Job Training': 'job_training',
};

const normalizeTrainingType = (value: string) => trainingTypeAliases[value] || value;

const normalizeParticipantIds = (participants: any[] = []) => {
  const ids = participants
    .map(participant => {
      if (participant && typeof participant === 'object') {
        return Number(participant.value ?? participant.id);
      }
      return Number(participant);
    })
    .filter(id => Number.isInteger(id) && id > 0);

  return Array.from(new Set(ids));
};

interface TrainingFormProps {
  trainingId?: number | null;
  initialTraining?: any | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TrainingForm: React.FC<TrainingFormProps> = ({ trainingId, initialTraining, onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [trainingType, setTrainingType] = useState<string>(DEFAULT_TRAINING_TYPE);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // ─── Considering Parameters ───────────────────────────────────────────────
  const {
    parameters: cpParams,
    setParameters: setCpParams,
    resetParameters: resetCpParams,
    saveAsDefaults: saveCpDefaults,
    options: cpOptions,
    autoFillResult,
    autoFillLoading,
  } = useConsideringParameters('training');

  // Sync parameters into form + department filter
  useEffect(() => {
    if (cpParams.department) {
      setDepartmentFilter(cpParams.department);
      if (!form.getFieldValue('location') && cpParams.work_area) {
        form.setFieldValue('location', cpParams.work_area);
      }
    }
    if (cpParams.training_type && !form.getFieldValue('training_type')) {
      const normalized = cpParams.training_type.toLowerCase().replace(/\s+/g, '_');
      form.setFieldValue('training_type', normalized);
      setTrainingType(normalized);
    }
    if (autoFillResult.training_type && !form.getFieldValue('training_type')) {
      form.setFieldValue('training_type', autoFillResult.training_type);
      setTrainingType(autoFillResult.training_type);
    }
  }, [cpParams, autoFillResult, form]);

  useEffect(() => {
    if (!initialTraining) {
      form.resetFields();
      setTrainingType(DEFAULT_TRAINING_TYPE);
      return;
    }

    const selectedType = normalizeTrainingType(initialTraining.trainingType || initialTraining.training_type || DEFAULT_TRAINING_TYPE);
    setTrainingType(selectedType);
    form.setFieldsValue({
      training_type: selectedType,
      title: initialTraining.title,
      training_date: initialTraining.training_date ? dayjs(initialTraining.training_date) : null,
      trainer: initialTraining.trainer || initialTraining.conducted_by,
      location: initialTraining.location,
      description: initialTraining.description,
      job_role: initialTraining.job_role,
      assigned_user_ids: initialTraining.assigned_user_ids || [],
    });
    console.log('[TrainingForm] edit loaded training type:', selectedType, initialTraining);
  }, [form, initialTraining]);

  useEffect(() => {
    setEmployeeLoading(true);
    apiClient.get('/api/training/project-users/')
      .then(res => setEmployees(Array.isArray(res.data) ? res.data : []))
      .catch(() => setEmployees([]))
      .finally(() => setEmployeeLoading(false));
  }, []);

  const departments = Array.from(new Set(employees.map(employee => employee.department).filter(Boolean))).sort();
  const filteredEmployees = departmentFilter === 'all'
    ? employees
    : employees.filter(employee => employee.department === departmentFilter);
  const selectedParticipantIds: number[] = Form.useWatch('assigned_user_ids', form) || [];
  const selectedEmployees = employees.filter(employee => selectedParticipantIds.includes(employee.id));
  const participantRequired = participantRequiredTypes.includes(trainingType);

  const selectAllFiltered = () => {
    const next = Array.from(new Set([...selectedParticipantIds, ...filteredEmployees.map(employee => employee.id)]));
    form.setFieldValue('assigned_user_ids', next);
  };

  const clearParticipants = () => {
    form.setFieldValue('assigned_user_ids', []);
  };

  const handleSubmit = async (values: any) => {
    if (loading) return;
    setLoading(true);
    const hideSaving = message.loading('Saving training...', 0);
    try {
      const selectedTrainingType = normalizeTrainingType(values.training_type);
      const assignedUserIds = normalizeParticipantIds(values.assigned_user_ids);
      const payload = {
        training_type: selectedTrainingType,
        mode: values.mode || 'offline',
        title: values.title,
        trainer: values.trainer,
        location: values.location,
        training_date: values.training_date?.format('YYYY-MM-DD'),
        description: values.description || '',
        status: 'scheduled',
        job_role: values.job_role,
        assigned_user_ids: assignedUserIds,
        participant_ids: assignedUserIds,
      };
      console.log('[TrainingForm] selected training type:', selectedTrainingType);
      console.log('[TrainingForm] submitted payload:', payload);
      console.log('[TrainingForm] API request body:', JSON.stringify(payload));
      if (trainingId) {
        await apiClient.patch(`/api/training/trainings/${trainingId}/`, payload);
        hideSaving();
        message.success('Training updated successfully');
      } else {
        await apiClient.post('/api/training/create/', payload);
        hideSaving();
        message.success('Training created successfully');
      }
      form.resetFields();
      onSuccess?.();
    } catch (error: any) {
      hideSaving();
      const data = error?.response?.data;
      const status = error?.response?.status;
      const msg = typeof data === 'object'
        ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        : data || error?.message || 'Failed to save training.';
      console.error('[TrainingForm] save failed:', { status, data, error });
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      {/* ── Considering Parameters ── */}
      <ConsideringParametersPanel
        parameters={cpParams}
        options={cpOptions}
        autoFillResult={autoFillResult}
        autoFillLoading={autoFillLoading}
        onChange={setCpParams}
        onReset={resetCpParams}
        onSaveDefaults={saveCpDefaults}
        visibleParams={['department', 'work_area', 'site', 'training_type', 'shift', 'contractor']}
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ training_type: DEFAULT_TRAINING_TYPE }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="training_type"
              label="Training Type"
              rules={[{ required: true, message: 'Please select training type' }]}
            >
              <Select
                placeholder="Select training type"
                onChange={(value) => {
                  setTrainingType(normalizeTrainingType(value));
                  console.log('[TrainingForm] selected dropdown value:', value);
                }}
              >
                {TRAINING_TYPES.map(type => (
                  <Option key={type.value} value={type.value}>{type.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="mode"
              label="Mode"
              initialValue="offline"
              rules={[{ required: true, message: 'Please select mode' }]}
            >
              <Select placeholder="Select mode">
                <Option value="offline">Offline (Admin marks attendance)</Option>
                <Option value="online">Online (User self-completes)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="title"
              label="Training Title"
              rules={[{ required: true, message: 'Please enter title' }]}
            >
              <Input placeholder="Enter training title" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="training_date"
              label="Training Date"
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="trainer"
              label="Trainer"
              rules={[{ required: true, message: 'Please enter trainer name' }]}
            >
              <Input placeholder="Enter trainer name" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="location"
              label="Location"
              rules={[{ required: true, message: 'Please enter location' }]}
            >
              <Input placeholder="Enter location" />
            </Form.Item>
          </Col>
        </Row>

        <Card size="small" title="Training Participants" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} md={8}>
              <Text strong>Department Filter</Text>
              <Select
                value={departmentFilter}
                onChange={setDepartmentFilter}
                style={{ width: '100%', marginTop: 8 }}
              >
                <Option value="all">All Departments</Option>
                {departments.map(department => (
                  <Option key={department} value={department}>{department}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} md={16}>
              <Text strong>
                Participants / Assigned Employees <Text type="danger">*</Text>
              </Text>
              <Form.Item
                name="assigned_user_ids"
                style={{ marginTop: 8, marginBottom: 0 }}
                rules={[
                  {
                    validator: (_, value) => {
                      if (!participantRequired || (Array.isArray(value) && value.length > 0)) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Please assign at least one employee.'));
                    },
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  showSearch
                  loading={employeeLoading}
                  placeholder="Search and assign employees..."
                  optionFilterProp="label"
                  maxTagCount="responsive"
                  popupRender={menu => (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 12px' }}>
                        <Checkbox
                          checked={filteredEmployees.length > 0 && filteredEmployees.every(employee => selectedParticipantIds.includes(employee.id))}
                          indeterminate={filteredEmployees.some(employee => selectedParticipantIds.includes(employee.id)) && !filteredEmployees.every(employee => selectedParticipantIds.includes(employee.id))}
                          onChange={(event) => {
                            if (event.target.checked) selectAllFiltered();
                            else form.setFieldValue('assigned_user_ids', selectedParticipantIds.filter(id => !filteredEmployees.some(employee => employee.id === id)));
                          }}
                        >
                          Select all visible
                        </Checkbox>
                        <Button type="link" size="small" onClick={clearParticipants}>Clear</Button>
                      </div>
                      <Divider style={{ margin: 0 }} />
                      {menu}
                    </>
                  )}
                >
                  {filteredEmployees.map(employee => {
                    const label = `${employee.name} ${employee.employee_code || ''} ${employee.department || ''} ${employee.designation || ''} ${employee.email}`;
                    return (
                      <Option key={employee.id} value={employee.id} label={label}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar size="small" src={employee.profile_photo || undefined} icon={<UserOutlined />} />
                          <div>
                            <div>
                              <strong>{employee.name}</strong>
                              {employee.employee_code ? ` (${employee.employee_code})` : ''}
                              {employee.department ? ` - ${employee.department}` : ''}
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {[employee.designation, employee.email].filter(Boolean).join(' · ')}
                            </Text>
                          </div>
                        </div>
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginTop: 12 }}>
            <Text type="secondary">
              {selectedParticipantIds.length} employee{selectedParticipantIds.length === 1 ? '' : 's'} selected
              {filteredEmployees.length ? ` · ${filteredEmployees.length} visible` : ''}
            </Text>
            {selectedEmployees.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {selectedEmployees.slice(0, 12).map(employee => (
                  <span
                    key={employee.id}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #d9d9d9', borderRadius: 16, padding: '4px 10px', background: '#fafafa' }}
                  >
                    <Avatar size={18} src={employee.profile_photo || undefined} icon={<UserOutlined />} />
                    {employee.name}{employee.employee_code ? ` (${employee.employee_code})` : ''}
                  </span>
                ))}
                {selectedEmployees.length > 12 && <Text type="secondary">+{selectedEmployees.length - 12} more</Text>}
              </div>
            )}
          </div>
        </Card>

        {trainingType === 'job_training' && (
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="job_role"
                label="Job Role"
                rules={[{ required: true, message: 'Please enter job role' }]}
              >
                <Input placeholder="Enter job role" />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea rows={4} placeholder="Enter training description" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {trainingId ? 'Update' : 'Create'} Training
            </Button>
            <Button onClick={onCancel}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TrainingForm;

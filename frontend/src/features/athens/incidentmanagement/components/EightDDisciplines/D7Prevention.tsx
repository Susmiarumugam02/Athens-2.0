import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Alert,
  DatePicker,
  Checkbox,
  Divider,
  List,
  Row,
  Col,
  Avatar,
  App,
} from 'antd';
import {
  StopOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ShareAltOutlined,
  FileProtectOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { EightDPreventionAction } from '../../types';
import { eightDPreventionApi } from '../../services/api';
import useAuthStore from '../../../../common/store/authStore';
import api from '../../../../common/utils/axiosetup';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

// User interface for selection
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

interface D7PreventionProps {
  processId: string;
  onComplete: () => void;
  isCompleted: boolean;
}

const D7Prevention: React.FC<D7PreventionProps> = ({
  processId,
  onComplete,
  isCompleted,
}) => {
  const [actions, setActions] = useState<EightDPreventionAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAction, setEditingAction] = useState<EightDPreventionAction | null>(null);
  const [showRolloutModal, setShowRolloutModal] = useState<EightDPreventionAction | null>(null);
  const [form] = Form.useForm();
  const [rolloutForm] = Form.useForm();
  const { user } = useAuthStore();
  const { modal } = App.useApp();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // User selection states
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserType, setSelectedUserType] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [eightDProcess, setEightDProcess] = useState<any>(null);
  const [reporterId, setReporterId] = useState<string | null>(null);

  useEffect(() => {
    loadPreventionActions();
    loadProcessInfo();
  }, [processId]);

  // Load 8D process and incident info for notifications
  const loadProcessInfo = async () => {
    try {
      // Load current user info
      const userResponse = await api.get('/authentication/api/team-members/get_team_candidates/');
      setCurrentUser(userResponse.data.current_user);
      
      const processResponse = await api.get(`/api/v1/incidentmanagement/8d-processes/?incident=${processId}`);
      const processes = processResponse.data.results || processResponse.data;
      
      if (processes && processes.length > 0) {
        const currentProcess = processes[0];
        setEightDProcess(currentProcess);
        
        // Get incident details to find reporter
        const incidentResponse = await api.get(`/api/v1/incidentmanagement/incidents/${currentProcess.incident}/`);
        setReporterId(incidentResponse.data.reported_by);
      }
    } catch (error) {
    }
  };

  // Set form values when editing
  useEffect(() => {
    if (editingAction) {
      
      if (editingAction.responsible_person_details) {
        const responsiblePerson = editingAction.responsible_person_details;
        const userType = responsiblePerson.admin_type;
        const grade = responsiblePerson.grade;
        
        
        // Set the user selection states
        setSelectedUserType(userType);
        setSelectedGrade(grade);
        
        // Load users for this type and grade
        if (userType && grade) {
          loadUsersByTypeAndGrade(userType, grade);
        }
        
        // Set form values
        form.setFieldsValue({
          ...editingAction,
          user_type: userType,
          grade: grade,
          target_date: editingAction.target_date ? dayjs(editingAction.target_date) : undefined
        });
      } else {
      }
    }
  }, [editingAction, form]);

  // Load users by type and grade
  const loadUsersByTypeAndGrade = async (userType: string, grade?: string) => {
    try {
      const params = new URLSearchParams({ user_type: userType });
      if (grade) {
        params.append('grade', grade);
      }
      const response = await api.get(`/authentication/api/team-members/get_users_by_type_and_grade/?${params}`);
      setAvailableUsers(response.data.users);
    } catch (error) {
      message.error('Failed to load users');
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

  const getUserTypeColor = (adminType: string): string => {
    const colors: { [key: string]: string } = {
      adminuser: 'blue',
      clientuser: 'green',
      epcuser: 'orange',
      contractoruser: 'purple',
    };
    return colors[adminType] || 'default';
  };

  const getUserTypeLabel = (adminType: string): string => {
    const labels: { [key: string]: string } = {
      adminuser: 'Admin',
      clientuser: 'Client',
      epcuser: 'EPC',
      contractoruser: 'Contractor',
    };
    return labels[adminType] || adminType;
  };

  const loadPreventionActions = async () => {
    setLoading(true);
    try {
      const data = await eightDPreventionApi.getPreventionActions(processId);
      setActions(data);
    } catch (error) {
      message.error('Failed to load prevention actions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAction = async (values: any) => {
    try {
      if (editingAction) {
        // Update existing action
        await eightDPreventionApi.updatePreventionAction(editingAction.id, {
          prevention_description: values.prevention_description,
          prevention_type: values.prevention_type,
          scope_of_application: values.scope_of_application,
          responsible_person: values.responsible_person,
          target_date: values.target_date?.format('YYYY-MM-DD'),
          verification_method: values.verification_method,
          similar_processes: values.similar_processes,
          rollout_plan: values.rollout_plan,
        });
        message.success('Prevention action updated successfully');
      } else {
        // Create new action
        await eightDPreventionApi.createPreventionAction({
          eight_d_process: processId,
          prevention_description: values.prevention_description,
          prevention_type: values.prevention_type,
          scope_of_application: values.scope_of_application,
          responsible_person: values.responsible_person,
          target_date: values.target_date?.format('YYYY-MM-DD'),
          verification_method: values.verification_method,
          similar_processes: values.similar_processes,
          rollout_plan: values.rollout_plan,
        });
        
        // Send notification to responsible person
        if (eightDProcess) {
          try {
            await api.post('/authentication/notifications/create/', {
              user_id: values.responsible_person,
              title: 'D7 Prevention Action Assignment',
              message: `You have been assigned a prevention action for incident ${eightDProcess.eight_d_id}.\n\nAction Description: ${values.prevention_description}\n\nScope: ${values.scope_of_application}\n\nPlease review and implement this prevention action by ${values.target_date?.format('YYYY-MM-DD')}.`
            });
          } catch (notificationError) {
          }
        }
        
        message.success('Prevention action added successfully');
      }
      setShowAddModal(false);
      setEditingAction(null);
      form.resetFields();
      loadPreventionActions();
    } catch (error) {
      message.error(editingAction ? 'Failed to update prevention action' : 'Failed to add prevention action');
    }
  };

  const handleImplementAction = async (actionId: string) => {
    if (!eightDProcess) return;
    
    setLoading(true);
    
    try {
      const response = await api.patch(`/api/v1/incidentmanagement/8d-prevention-actions/${actionId}/`, {
        status: 'implemented'
      });
      
      // Send notification to reporter
      if (reporterId) {
        try {
          await api.post('/authentication/notifications/create/', {
            user_id: reporterId,
            title: 'D7 Prevention Action Implemented',
            message: `A prevention action for incident ${eightDProcess.eight_d_id} has been implemented. The action is now ready for verification.`
          });
        } catch (notificationError) {
        }
      }
      
      message.success('Prevention action implemented successfully');
      await loadPreventionActions();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to implement prevention action';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEffectiveness = async (values: any) => {
    if (!showRolloutModal) return;

    try {
      await eightDPreventionApi.verifyEffectiveness(
        showRolloutModal.id,
        values.effectiveness_notes
      );
      
      // Send notification to responsible person
      if (eightDProcess && showRolloutModal.responsible_person) {
        try {
          await api.post('/authentication/notifications/create/', {
            user_id: showRolloutModal.responsible_person,
            title: 'D7 Prevention Action Verified',
            message: `Your prevention action for incident ${eightDProcess.eight_d_id} has been verified as effective.\n\nVerification Notes: ${values.effectiveness_notes}`
          });
        } catch (notificationError) {
        }
      }
      
      message.success('Prevention action effectiveness verified');
      setShowRolloutModal(null);
      rolloutForm.resetFields();
      loadPreventionActions();
    } catch (error) {
      message.error('Failed to verify effectiveness');
    }
  };

  const handleDeleteAction = (actionId: string) => {
    
    modal.confirm({
      title: 'Delete Prevention Action',
      content: 'Are you sure you want to delete this prevention action?',
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      okType: 'danger',
      onOk: async () => {
        try {
          await eightDPreventionApi.deletePreventionAction(actionId);
          message.success('Prevention action deleted successfully');
          await loadPreventionActions();
        } catch (error: any) {
          message.error(`Failed to delete prevention action: ${error.response?.data?.error || error.message}`);
        }
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'blue';
      case 'implemented': return 'orange';
      case 'verified': return 'green';
      case 'effective': return 'purple';
      default: return 'default';
    }
  };

  const getPreventionTypeIcon = (type: string) => {
    switch (type) {
      case 'process_change': return '🔄';
      case 'system_update': return '💻';
      case 'training': return '📚';
      case 'procedure_update': return '📋';
      case 'design_change': return '🎨';
      case 'control_enhancement': return '🛡️';
      case 'monitoring': return '📊';
      default: return '❓';
    }
  };

  const columns = [
    {
      title: 'Prevention Action',
      dataIndex: 'prevention_description',
      key: 'prevention_description',
      width: 250,
      render: (text: string) => (
        <div style={{ wordBreak: 'break-word' }}>{text}</div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'prevention_type',
      key: 'prevention_type',
      render: (type: string) => (
        <Tag>
          {getPreventionTypeIcon(type)} {type.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Scope',
      dataIndex: 'scope_of_application',
      key: 'scope_of_application',
      width: 150,
      render: (text: string) => (
        <div style={{ wordBreak: 'break-word' }}>{text}</div>
      ),
    },
    {
      title: 'Responsible Person',
      dataIndex: 'responsible_person_details',
      key: 'responsible_person',
      render: (person: any) => (
        <Space>
          <Avatar size="small">{person?.full_name?.[0] || 'U'}</Avatar>
          <span>{person?.full_name || person?.username || 'Unassigned'}</span>
        </Space>
      ),
    },
    {
      title: 'Target Date',
      dataIndex: 'target_date',
      key: 'target_date',
      render: (date: string) => date ? dayjs(date).format('MMM DD, YYYY') : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: EightDPreventionAction) => (
        <Space>
          {record.status === 'planned' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleImplementAction(record.id)}
              disabled={isCompleted || (currentUser?.id !== record.responsible_person)}
              loading={loading}
            >
              Implement
            </Button>
          )}
          {record.status === 'implemented' && (
            <Button
              size="small"
              type="primary"
              icon={<FileProtectOutlined />}
              onClick={() => setShowRolloutModal(record)}
              disabled={currentUser?.id !== reporterId}
            >
              Verify
            </Button>
          )}
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingAction(record);
              setShowAddModal(true);
            }}
            disabled={isCompleted}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteAction(record.id);
            }}
            disabled={isCompleted}
          />
        </Space>
      ),
    },
  ];

  const hasVerifiedActions = () => {
    return actions.length > 0 && actions.some(action => 
      action.status === 'verified' || action.status === 'effective'
    );
  };

  return (
    <Card
      title={
        <Space>
          <StopOutlined />
          <span>D7: Prevent Recurrence</span>
          {isCompleted && <Tag color="green">Completed</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowAddModal(true)}
            disabled={isCompleted}
          >
            Add Prevention Action
          </Button>
          {!isCompleted && hasVerifiedActions() && (
            <Button type="primary" onClick={onComplete}>
              Complete D7
            </Button>
          )}
        </Space>
      }
    >
      <Alert
        message="D7 Objective"
        description="Modify systems, processes, procedures, and practices to prevent recurrence of this and similar problems. Ensure lessons learned are applied broadly."
        type="info"
        showIcon
        style={{ marginBottom: 16, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}
      />

      {!hasVerifiedActions() && !isCompleted && (
        <Alert
          message="Completion Requirements"
          description="You need at least one verified prevention action to complete this discipline."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        columns={columns}
        dataSource={actions}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Verification Method:</strong>
                <div>{record.verification_method}</div>
              </div>
              {record.similar_processes && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Similar Processes:</strong>
                  <div>{record.similar_processes}</div>
                </div>
              )}
              {record.rollout_plan && (
                <div>
                  <strong>Rollout Plan:</strong>
                  <div>{record.rollout_plan}</div>
                </div>
              )}
            </div>
          ),
        }}
      />

      {/* Add/Edit Prevention Action Modal */}
      <Modal
        title={editingAction ? 'Edit Prevention Action' : 'Add Prevention Action'}
        open={showAddModal || !!editingAction}
        onCancel={() => {
          setShowAddModal(false);
          setEditingAction(null);
          form.resetFields();
          setSelectedUserType('');
          setSelectedGrade('');
          setAvailableUsers([]);
        }}
        footer={null}
        width={700}
        destroyOnHidden
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddAction}
          initialValues={editingAction ? {
            ...editingAction,
            user_type: editingAction.responsible_person_details?.admin_type,
            grade: editingAction.responsible_person_details?.grade,
            target_date: editingAction.target_date ? dayjs(editingAction.target_date) : undefined
          } : {}}
        >
          <Form.Item
            name="prevention_description"
            label="Prevention Action Description"
            rules={[
              { required: true, message: 'Please describe the prevention action' },
              { min: 10, message: 'Description must be at least 10 characters' },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Describe the specific action to prevent recurrence..."
            />
          </Form.Item>

          <Form.Item
            name="prevention_type"
            label="Prevention Type"
            rules={[{ required: true, message: 'Please select prevention type' }]}
          >
            <Select placeholder="Select prevention type">
              <Option value="process_change">🔄 Process Change</Option>
              <Option value="system_update">💻 System Update</Option>
              <Option value="training">📚 Training</Option>
              <Option value="procedure_update">📋 Procedure Update</Option>
              <Option value="design_change">🎨 Design Change</Option>
              <Option value="control_enhancement">🛡️ Control Enhancement</Option>
              <Option value="monitoring">📊 Monitoring</Option>
              <Option value="other">❓ Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="scope_of_application"
            label="Scope of Application"
            rules={[{ required: true, message: 'Please define the scope' }]}
          >
            <TextArea
              rows={2}
              placeholder="Define where this prevention action will be applied..."
            />
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
            rules={[{ required: true, message: 'Please assign a responsible person' }]}
          >
            <Select
              placeholder="Select responsible person"
              disabled={!selectedUserType || !selectedGrade}
              showSearch
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableUsers.map(availableUser => (
                <Option key={availableUser.id} value={availableUser.id}>
                  <Space>
                    <Avatar size="small">{availableUser.full_name?.[0] || 'U'}</Avatar>
                    <div>
                      <div>{availableUser.full_name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {availableUser.company_name || availableUser.department} - {availableUser.email}
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
            rules={[{ required: true, message: 'Please set target date' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item
            name="verification_method"
            label="Verification Method"
            rules={[{ required: true, message: 'Please describe verification method' }]}
          >
            <TextArea
              rows={2}
              placeholder="How will you verify the effectiveness of this prevention action?"
            />
          </Form.Item>

          <Form.Item
            name="similar_processes"
            label="Similar Processes"
          >
            <TextArea
              rows={2}
              placeholder="List similar processes where this prevention action could be applied..."
            />
          </Form.Item>

          <Form.Item
            name="rollout_plan"
            label="Rollout Plan"
          >
            <TextArea
              rows={3}
              placeholder="Describe the plan for rolling out this prevention action to other areas..."
            />
          </Form.Item>

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                setShowAddModal(false);
                setEditingAction(null);
                form.resetFields();
                setSelectedUserType('');
                setSelectedGrade('');
                setAvailableUsers([]);
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              {editingAction ? 'Update' : 'Add'} Prevention Action
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Verify Effectiveness Modal */}
      <Modal
        title="Verify Prevention Action Effectiveness"
        open={!!showRolloutModal}
        onCancel={() => {
          setShowRolloutModal(null);
          rolloutForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={rolloutForm}
          layout="vertical"
          onFinish={handleVerifyEffectiveness}
        >
          <Alert
            message={`Verifying: ${showRolloutModal?.prevention_description}`}
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="effectiveness_notes"
            label="Effectiveness Verification"
            rules={[{ required: true, message: 'Please provide effectiveness verification' }]}
          >
            <TextArea
              rows={4}
              placeholder="Describe the evidence that this prevention action is effective and preventing recurrence..."
            />
          </Form.Item>

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                setShowRolloutModal(null);
                rolloutForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Verify Effectiveness
            </Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
};

export default D7Prevention;

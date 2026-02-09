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
  Rate,
  Row,
  Col,
  Avatar,
  App,
} from 'antd';
import {
  SafetyOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { EightDContainmentAction } from '../../types'; // Assuming this type is defined
import api from '../../../../common/utils/axiosetup';
import useAuthStore from '../../../../common/store/authStore';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

// Define the structure of an 8D Process object
interface EightDProcess {
  id: string;
  eight_d_id: string;
  // Add other fields from your 8D Process model as needed
}

// Define the structure of a User from your API
interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  company_name?: string;
  department?: string;
}

interface D3ContainmentActionsProps {
  processId: string; // This is the INCIDENT ID
  onComplete: () => void;
  isCompleted: boolean;
}

const D3ContainmentActions: React.FC<D3ContainmentActionsProps> = ({
  processId,
  onComplete,
  isCompleted,
}) => {
  const [actions, setActions] = useState<EightDContainmentAction[]>([]);
  const [eightDProcess, setEightDProcess] = useState<EightDProcess | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAction, setEditingAction] = useState<EightDContainmentAction | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState<EightDContainmentAction | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserType, setSelectedUserType] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [form] = Form.useForm();
  const [verifyForm] = Form.useForm();
  const { userId } = useAuthStore();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [investigatorId, setInvestigatorId] = useState<string | null>(null);
  const [reporterId, setReporterId] = useState<string | null>(null);
  const { modal } = App.useApp();

  // Fetches initial data: the 8D Process and its containment actions
  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Step 1: Get the 8D process using the Incident ID (processId)
      const processResponse = await api.get(`/api/v1/incidentmanagement/8d-processes/?incident=${processId}`);
      const processes = processResponse.data.results || processResponse.data;
      
      if (processes && processes.length > 0) {
        const currentProcess = processes[0];
        setEightDProcess(currentProcess); // Store the process object in state

        // Step 2: Use the found 8D Process ID to load its containment actions
        await refreshActions(currentProcess.id);
      } else {
        message.error("Could not find an 8D Process for this incident.");
      }
    } catch (error) {
      message.error('Failed to load containment actions.');
    } finally {
      setLoading(false);
    }
  };
  
  // Reusable function to refresh the actions list
  const refreshActions = async (currentProcessId: string) => {
      setLoading(true);
      try {
          const response = await api.get(`/api/v1/incidentmanagement/8d-containment-actions/?eight_d_process=${currentProcessId}`);
          setActions(response.data.results || response.data);
      } catch (error) {
          message.error('Could not refresh the list of actions.');
      } finally {
          setLoading(false);
      }
  };

  // Load current user and investigator info
  const loadUserInfo = async () => {
    try {
      const userResponse = await api.get('/authentication/api/team-members/get_team_candidates/');
      setCurrentUser(userResponse.data.current_user);
      
      // Get 8D process first, then get incident details
      const processResponse = await api.get(`/api/v1/incidentmanagement/8d-processes/?incident=${processId}`);
      const processes = processResponse.data.results || processResponse.data;
      
      if (processes && processes.length > 0) {
        const currentProcess = processes[0];
        // Get incident details using the incident ID from 8D process
        const incidentResponse = await api.get(`/api/v1/incidentmanagement/incidents/${currentProcess.incident}/`);
        setInvestigatorId(incidentResponse.data.assigned_investigator);
        setReporterId(incidentResponse.data.reported_by);
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    if (processId) {
      loadInitialData();
      loadUserInfo();
    }
  }, [processId]);

  // Adds a new containment action
  const handleAddAction = async (values: any) => {
    if (!eightDProcess) {
      message.error('8D Process not loaded. Cannot add action.');
      return;
    }
    
    setLoading(true);
    try {
      const actionData = {
        eight_d_process: eightDProcess.id,
        action_description: values.action_description,
        rationale: values.rationale,
        responsible_person: values.responsible_person,
      };

      await api.post('/api/v1/incidentmanagement/8d-containment-actions/', actionData);
      
      // Send notification to responsible person
      try {
        await api.post('/authentication/notifications/create/', {
          user_id: values.responsible_person,
          title: 'D3 Containment Action Assignment',
          message: `You have been assigned a containment action for incident ${eightDProcess.eight_d_id}.

Action Description: ${values.action_description}

Rationale: ${values.rationale}

Please review and implement this containment action as soon as possible.`
        });
      } catch (notificationError) {
      }
      
      message.success('Containment action added successfully');
      setShowAddModal(false);
      form.resetFields();
      await refreshActions(eightDProcess.id);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to add containment action.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Verifies the effectiveness of an action
  const handleVerifyEffectiveness = async (values: any) => {
    if (!showVerifyModal || !eightDProcess) return;

    setLoading(true);
    try {
      await api.post(`/api/v1/incidentmanagement/8d-containment-actions/${showVerifyModal.id}/verify-effectiveness/`, {
        effectiveness_rating: values.effectiveness_rating,
        verification_notes: values.verification_notes,
      });
      
      // Send notification to responsible person
      if (showVerifyModal.responsible_person) {
        try {
          await api.post('/authentication/notifications/create/', {
            user_id: showVerifyModal.responsible_person,
            title: 'D3 Containment Action Verified',
            message: `Your containment action for incident ${eightDProcess.eight_d_id} has been verified with effectiveness rating: ${values.effectiveness_rating}/5 stars.`
          });
        } catch (notificationError) {
        }
      }
      
      message.success('Effectiveness verified successfully');
      setShowVerifyModal(null);
      verifyForm.resetFields();
      await refreshActions(eightDProcess.id);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to verify effectiveness.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Implements an action (changes status from planned to implemented)
  const handleImplementAction = async (actionId: string) => {
    if (!eightDProcess) return;
    
    setLoading(true);
    try {
      const response = await api.patch(`/api/v1/incidentmanagement/8d-containment-actions/${actionId}/`, {
        status: 'implemented'
      });
      
      // Send notification to reporter
      if (reporterId) {
        try {
          await api.post('/authentication/notifications/create/', {
            user_id: reporterId,
            title: 'D3 Containment Action Implemented',
            message: `A containment action for incident ${eightDProcess.eight_d_id} has been implemented. The action is now ready for verification.`
          });
        } catch (notificationError) {
        }
      }
      
      message.success('Action marked as implemented');
      await refreshActions(eightDProcess.id);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to implement action';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Deletes an action
  const handleDeleteAction = (actionId: string) => {
    if (!eightDProcess) {
      return;
    }
    
    modal.confirm({
      title: 'Delete Containment Action',
      content: 'Are you sure you want to delete this containment action?',
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      okType: 'danger',
      onOk: async () => {
        setLoading(true);
        try {
          await api.delete(`/api/v1/incidentmanagement/8d-containment-actions/${actionId}/`);
          message.success('Containment action deleted successfully');
          await refreshActions(eightDProcess.id);
        } catch (error) {
          message.error('Failed to delete containment action');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Fetches a list of users based on type and grade for the modal dropdown
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

  const handleUserTypeChange = (userType: string) => {
    setSelectedUserType(userType);
    setSelectedGrade('');
    setAvailableUsers([]);
    form.setFieldsValue({ grade: undefined, responsible_person: undefined });
  };

  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
    form.setFieldsValue({ responsible_person: undefined });
    if (selectedUserType) {
      loadUsersByTypeAndGrade(selectedUserType, grade);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'blue';
      case 'implemented': return 'orange';
      case 'verified': return 'green';
      case 'ineffective': return 'red';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Action Description',
      dataIndex: 'action_description',
      key: 'action_description',
      width: '35%',
    },
    {
      title: 'Rationale',
      dataIndex: 'rationale',
      key: 'rationale',
      width: '25%',
    },
    {
      title: 'Responsible Person',
      dataIndex: 'responsible_person_details',
      key: 'responsible_person',
      render: (person: any) => person?.full_name || person?.username || 'Unassigned',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status ? status.replace('_', ' ').toUpperCase() : ''}
        </Tag>
      ),
    },
    {
      title: 'Effectiveness',
      dataIndex: 'effectiveness_rating',
      key: 'effectiveness_rating',
      render: (rating: number) => rating ? <Rate disabled defaultValue={rating} count={5} /> : <Text type="secondary">N/A</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: EightDContainmentAction) => (
        <Space>
          {record.status === 'planned' && (
            <Button
              size="small"
              type="primary"
              onClick={() => handleImplementAction(record.id)}
              disabled={isCompleted || (currentUser?.id !== record.responsible_person)}
            >
              Implement
            </Button>
          )}
          {record.status === 'implemented' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => setShowVerifyModal(record)}
              disabled={currentUser?.id !== investigatorId}
            >
              Verify
            </Button>
          )}
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditingAction(record)}
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
    return actions.length > 0 && actions.some(action => action.status === 'verified');
  };

  return (
    <Card
      title={
        <Space>
          <SafetyOutlined />
          <span>D3: Develop Interim Containment Actions</span>
          {isCompleted && <Tag color="green">Completed</Tag>}
        </Space>
      }
      extra={
        !isCompleted && (
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowAddModal(true)}
            >
              Add Action
            </Button>
            {hasVerifiedActions() && (
              <Button type="primary" onClick={onComplete} style={{ backgroundColor: '#52c41a' }}>
                Complete D3
              </Button>
            )}
          </Space>
        )
      }
    >
      <Alert
        message="D3 Objective"
        description="Define and implement interim containment actions to isolate the problem from any customer until permanent corrective actions are implemented."
        type="info"
        showIcon
        style={{ marginBottom: 16, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}
      />

      {!hasVerifiedActions() && !isCompleted && (
        <Alert
          message="Completion Requirements"
          description="You need at least one verified containment action to complete this discipline."
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
      />

      {/* Add/Edit Action Modal */}
      <Modal
        title={editingAction ? 'Edit Containment Action' : 'Add Containment Action'}
        open={showAddModal || !!editingAction}
        onCancel={() => {
          setShowAddModal(false);
          setEditingAction(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddAction}
          initialValues={editingAction || {}}
        >
          <Form.Item
            name="action_description"
            label="Action Description"
            rules={[{ required: true, message: 'Please describe the action' }]}
          >
            <TextArea rows={4} placeholder="Describe the specific containment action..." />
          </Form.Item>
          <Form.Item
            name="rationale"
            label="Rationale"
            rules={[{ required: true, message: 'Please provide rationale' }]}
          >
            <TextArea rows={3} placeholder="Explain why this action is necessary..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="User Type" rules={[{ required: true }]}>
                <Select placeholder="Select user type" onChange={handleUserTypeChange}>
                  <Option value="adminuser">Admin</Option>
                  <Option value="clientuser">Client</Option>
                  <Option value="epcuser">EPC</Option>
                  <Option value="contractoruser">Contractor</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Grade" rules={[{ required: true }]}>
                <Select placeholder="Select grade" onChange={handleGradeChange} disabled={!selectedUserType}>
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
            rules={[{ required: true, message: 'Please assign a person' }]}
          >
            <Select
              placeholder="Select responsible person"
              disabled={!selectedUserType || !selectedGrade}
              showSearch
              filterOption={(input, option) =>
                String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableUsers.map(user => (
                <Option key={user.id} value={user.id}>
                  <Space>
                    <Avatar size="small">{user.full_name?.[0] || 'U'}</Avatar>
                    <div>{user.full_name}</div>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingAction ? 'Update Action' : 'Add Action'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Verify Effectiveness Modal */}
      <Modal
        title="Verify Containment Action Effectiveness"
        open={!!showVerifyModal}
        onCancel={() => setShowVerifyModal(null)}
        footer={null}
        width={500}
        destroyOnHidden
      >
        <Form form={verifyForm} layout="vertical" onFinish={handleVerifyEffectiveness}>
          <Form.Item
            name="effectiveness_rating"
            label="Effectiveness Rating"
            rules={[{ required: true, message: 'Please rate the effectiveness' }]}
          >
            <Rate count={5} />
          </Form.Item>
          <Form.Item
            name="verification_notes"
            label="Verification Notes"
            rules={[{ required: true, message: 'Please provide verification notes' }]}
          >
            <TextArea rows={4} placeholder="Describe how effectiveness was verified..." />
          </Form.Item>
          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowVerifyModal(null)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Verify Effectiveness
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default D3ContainmentActions;
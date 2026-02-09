import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Alert, 
  Table, 
  Modal, 
  Form, 
  Select, 
  Input, 
  Tag, 
  Avatar, 
  message,
  Row,
  Col 
} from 'antd';
import { TeamOutlined, UserAddOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../../../common/utils/axiosetup';
import useAuthStore from '../../../../common/store/authStore';

const { Option } = Select;
const { TextArea } = Input;

// Define the structure of an 8D Process object
interface EightDProcess {
  id: string;
  eight_d_id: string;
  // Add other fields from your 8D Process model as needed
}

// Define the structure of a Team Member from your API
interface TeamMember {
  id: string;
  user: string;
  user_details: {
    id: string;
    username: string;
    full_name: string;
    email: string;
    admin_type: string;
    grade: string;
    department: string;
    company_name: string;
  };
  role: string;
  expertise_area: string;
  responsibilities: string;
  is_active: boolean;
}

// Define the structure of a User from your API
interface User {
  id:string;
  username: string;
  full_name: string;
  email: string;
  admin_type: string;
  grade: string;
  department: string;
  company_name: string;
  phone_number: string;
}

interface D1TeamManagementProps {
  processId: string; // This is the INCIDENT ID
  onComplete: () => void;
  isCompleted: boolean;
}

const D1TeamManagement: React.FC<D1TeamManagementProps> = ({
  processId,
  onComplete,
  isCompleted,
}) => {
  const [form] = Form.useForm();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [eightDProcess, setEightDProcess] = useState<EightDProcess | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null); // Champion
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserType, setSelectedUserType] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const { userId } = useAuthStore();

  // Fetches initial data: the 8D Process and its team members
  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Step 1: Get the 8D process using the Incident ID (processId)
      const processResponse = await api.get(`/api/v1/incidentmanagement/8d-processes/?incident=${processId}`);
      const processes = processResponse.data.results || processResponse.data;
      
      if (processes && processes.length > 0) {
        const currentProcess = processes[0];
        setEightDProcess(currentProcess); // Store the entire process object in state

        // Step 2: Use the found 8D Process ID to load the associated team members
        const teamResponse = await api.get(`/api/v1/incidentmanagement/8d-teams/?eight_d_process=${currentProcess.id}`);
        setTeamMembers(teamResponse.data.results || teamResponse.data);
      } else {
        message.error("Could not find an 8D Process for this incident. It may not have been initiated yet.");
      }
    } catch (error) {
      message.error('Failed to load team data.');
    } finally {
      setLoading(false);
    }
  };

  // Fetches user data required for the form
  const loadTeamCandidates = async () => {
    try {
      const response = await api.get('/authentication/api/team-members/get_team_candidates/');
      setCurrentUser(response.data.current_user);
    } catch (error) {
      message.error('Failed to load team candidates');
    }
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

  // Load all initial data when the component mounts or the incident ID changes
  useEffect(() => {
    if (processId) {
      loadInitialData();
      loadTeamCandidates();
    }
  }, [processId]);

  // Handle user type change in the modal form
  const handleUserTypeChange = (userType: string) => {
    setSelectedUserType(userType);
    setSelectedGrade('');
    setAvailableUsers([]);
    form.setFieldsValue({ grade: undefined, user: undefined });
  };

  // Handle grade change in the modal form
  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
    form.setFieldsValue({ user: undefined });
    if (selectedUserType) {
      loadUsersByTypeAndGrade(selectedUserType, grade);
    }
  };

  // Add a new team member
  const handleAddMember = async (values: any) => {
    if (!eightDProcess) {
      message.error('8D Process not loaded. Cannot add team member.');
      return;
    }

    // Check if user is already a team member
    const existingMember = teamMembers.find(member => member.user === values.user);
    if (existingMember) {
      message.error('This user is already a team member.');
      return;
    }

    setLoading(true);
    try {
      const memberData = {
        eight_d_process: eightDProcess.id, // Use the stored 8D Process ID
        user: values.user,
        role: values.role,
        expertise_area: values.expertise_area || '',
        responsibilities: values.responsibilities || ''
      };

      await api.post('/api/v1/incidentmanagement/8d-teams/', memberData);
      
      // Send notification to the selected team member
      const selectedUser = availableUsers.find(user => user.id === values.user);
      if (selectedUser) {
        try {
          await api.post('/authentication/notifications/create/', {
            user_id: values.user,
            title: '8D Team Assignment',
            message: `You have been added to the 8D team for incident ${eightDProcess.eight_d_id} as ${values.role}. Please review your responsibilities and participate in the problem-solving process.`
          });
        } catch (notificationError) {
        }
      }
      
      message.success('Team member added successfully');
      setShowAddModal(false);
      form.resetFields();
      
      // Refresh the team member list after adding
      const teamResponse = await api.get(`/api/v1/incidentmanagement/8d-teams/?eight_d_process=${eightDProcess.id}`);
      setTeamMembers(teamResponse.data.results || teamResponse.data);

    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'An unexpected error occurred while adding the team member.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Remove a team member
  const handleRemoveMember = async (memberId: string) => {
    if (!eightDProcess) {
      message.error('8D Process not loaded. Cannot remove team member.');
      return;
    }
    
    try {
      await api.delete(`/api/v1/incidentmanagement/8d-teams/${memberId}/`);
      message.success('Team member removed successfully');
      // Refresh list after deletion
      const teamResponse = await api.get(`/api/v1/incidentmanagement/8d-teams/?eight_d_process=${eightDProcess.id}`);
      setTeamMembers(teamResponse.data.results || teamResponse.data);
    } catch (error) {
      message.error('Failed to remove team member');
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

  const columns = [
    {
      title: 'Member',
      key: 'member',
      render: (_: any, record: TeamMember) => (
        <Space>
          <Avatar size="small">{record.user_details?.full_name?.[0] || 'U'}</Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.user_details?.full_name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.user_details?.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Type & Grade',
      key: 'type_grade',
      render: (_: any, record: TeamMember) => (
        <Space direction="vertical" size="small">
          <Tag color={getUserTypeColor(record.user_details?.admin_type)}>
            {getUserTypeLabel(record.user_details?.admin_type)}
          </Tag>
          <Tag color="cyan">Grade {record.user_details?.grade}</Tag>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag color="blue">{role}</Tag>,
    },
    {
      title: 'Expertise',
      dataIndex: 'expertise_area',
      key: 'expertise_area',
    },
    {
      title: 'Company',
      key: 'company',
      render: (_: any, record: TeamMember) => record.user_details?.company_name || record.user_details?.department,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: TeamMember) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveMember(record.id)}
          disabled={isCompleted}
        />
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <TeamOutlined />
          D1: Establish the Team
        </Space>
      }
      extra={
        !isCompleted && (
          <Space>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setShowAddModal(true)}
            >
              Add Team Member
            </Button>
            <Button
              type="primary"
              onClick={onComplete}
              style={{ backgroundColor: '#52c41a' }}
            >
              Complete D1
            </Button>
          </Space>
        )
      }
    >
      <Alert
        message="D1 Objective"
        description="Form a cross-functional team with the knowledge, authority, and skills to solve the problem."
        type="info"
        showIcon
        style={{ marginBottom: 16, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}
      />

      {/* 8D Champion Display */}
      {currentUser && (
        <Card size="small" title="8D Champion" style={{ marginBottom: 16 }}>
          <Space>
            <Avatar>{currentUser.full_name?.[0] || 'C'}</Avatar>
            <div>
              <div style={{ fontWeight: 'bold' }}>{currentUser.full_name}</div>
              <Tag color="gold">Champion</Tag>
              <Tag color={getUserTypeColor(currentUser.admin_type)}>
                {getUserTypeLabel(currentUser.admin_type)}
              </Tag>
            </div>
          </Space>
        </Card>
      )}

      {/* Team Members Table */}
      <Table
        columns={columns}
        dataSource={teamMembers}
        loading={loading}
        rowKey="id"
        pagination={false}
        size="small"
      />

      {/* Add Member Modal */}
      <Modal
        title="Add Team Member"
        open={showAddModal}
        onCancel={() => {
          setShowAddModal(false);
          form.resetFields();
          setSelectedUserType('');
          setSelectedGrade('');
          setAvailableUsers([]);
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddMember}
        >
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
            name="user"
            label="Team Member"
            rules={[{ required: true, message: 'Please select a team member' }]}
          >
            <Select
              placeholder="Select team member"
              disabled={!selectedUserType || !selectedGrade}
              showSearch
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableUsers.map(user => (
                <Option key={user.id} value={user.id}>
                  <Space>
                    <Avatar size="small">{user.full_name?.[0] || 'U'}</Avatar>
                    <div>
                      <div>{user.full_name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {user.company_name || user.department} - {user.email}
                      </div>
                    </div>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="role"
            label="Role in Team"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select placeholder="Select role">
              <Option value="team_leader">Team Leader</Option>
              <Option value="subject_expert">Subject Matter Expert</Option>
              <Option value="process_owner">Process Owner</Option>
              <Option value="quality_rep">Quality Representative</Option>
              <Option value="technical_expert">Technical Expert</Option>
              <Option value="member">Team Member</Option>
              <Option value="sponsor">Sponsor (Site In-charge)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="expertise_area"
            label="Expertise Area"
          >
            <Input placeholder="e.g., Safety, Quality, Operations" />
          </Form.Item>

          <Form.Item
            name="responsibilities"
            label="Responsibilities"
          >
            <TextArea
              rows={3}
              placeholder="Specific responsibilities within the 8D process"
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Add Member
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {isCompleted && (
        <Alert
          message="D1 Completed"
          description="The cross-functional team has been established."
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default D1TeamManagement;
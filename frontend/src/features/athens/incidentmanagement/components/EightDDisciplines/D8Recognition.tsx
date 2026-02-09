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
  Avatar,
  Rate,
  Timeline,
  Statistic,
  Row,
  Col,
  Badge,
} from 'antd';
import {
  TrophyOutlined,
  StarOutlined,
  TeamOutlined,
  GiftOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { EightDTeam, TEAM_ROLES } from '../../types';
import { eightDTeamApi } from '../../services/api';
import useAuthStore from '../../../../common/store/authStore';
import api from '../../../../common/utils/axiosetup';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface D8RecognitionProps {
  processId: string;
  onComplete: () => void;
  isCompleted: boolean;
}

const D8Recognition: React.FC<D8RecognitionProps> = ({
  processId,
  onComplete,
  isCompleted,
}) => {
  const [teamMembers, setTeamMembers] = useState<EightDTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRecognitionModal, setShowRecognitionModal] = useState<EightDTeam | null>(null);
  const [recognitionForm] = Form.useForm();
  const { user } = useAuthStore();
  const [eightDProcess, setEightDProcess] = useState<any>(null);

  useEffect(() => {
    loadTeamMembers();
    loadProcessInfo();
  }, [processId]);

  useEffect(() => {
    if (isCompleted && showRecognitionModal) {
      setShowRecognitionModal(null);
      recognitionForm.resetFields();
    }
  }, [isCompleted]);

  // Load 8D process info for notifications
  const loadProcessInfo = async () => {
    try {
      const processResponse = await api.get(`/api/v1/incidentmanagement/8d-processes/${processId}/`);
      setEightDProcess(processResponse.data);
    } catch (error) {
    }
  };

  const loadTeamMembers = async () => {
    setLoading(true);
    try {
      const members = await eightDTeamApi.getTeamMembers(processId);
      setTeamMembers(members);
    } catch (error) {
      message.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleRecognizeTeamMember = async (values: any) => {
    if (!showRecognitionModal) return;

    try {
      await eightDTeamApi.recognizeTeamMember(
        showRecognitionModal.id,
        values.recognition_notes
      );
      
      // Send recognition notification to the team member
      if (eightDProcess && showRecognitionModal.user) {
        try {
          await api.post('/authentication/notifications/create/', {
            user_id: showRecognitionModal.user,
            title: 'D8 Team Recognition',
            message: `Congratulations! You have been recognized for your outstanding contribution to the 8D problem-solving process for incident ${eightDProcess.eight_d_id}.\n\nRecognition Message: "${values.recognition_notes}"\n\nThank you for your dedication and expertise in helping resolve this incident successfully.`
          });
        } catch (notificationError) {
        }
      }
      
      message.success('Team member recognized successfully');
      setShowRecognitionModal(null);
      recognitionForm.resetFields();
      loadTeamMembers();
    } catch (error) {
      message.error('Failed to recognize team member');
    }
  };

  const handleRecognizeAllTeam = async () => {
    Modal.confirm({
      title: 'Recognize Entire Team',
      content: 'This will recognize all team members for their contribution to the 8D process. Continue?',
      onOk: async () => {
        try {
          const unrecognizedMembers = teamMembers.filter(member => !member.is_recognized);
          const recognitionMessage = 'Recognized for outstanding contribution to the 8D problem-solving process and successful resolution of the incident.';
          
          for (const member of unrecognizedMembers) {
            await eightDTeamApi.recognizeTeamMember(
              member.id,
              recognitionMessage
            );
            
            // Send recognition notification to each team member
            if (eightDProcess && member.user) {
              try {
                await api.post('/authentication/notifications/create/', {
                  user_id: member.user,
                  title: 'D8 Team Recognition',
                  message: `Congratulations! You have been recognized for your outstanding contribution to the 8D problem-solving process for incident ${eightDProcess.eight_d_id}.\n\nRecognition Message: "${recognitionMessage}"\n\nThank you for your dedication and expertise in helping resolve this incident successfully.`
                });
              } catch (notificationError) {
              }
            }
          }
          
          message.success('All team members recognized successfully');
          loadTeamMembers();
        } catch (error) {
          message.error('Failed to recognize team members');
        }
      },
    });
  };

  const getRoleIcon = (role: string) => {
    const roleInfo = TEAM_ROLES.find(r => r.value === role);
    return roleInfo?.icon || '👤';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'champion': return 'gold';
      case 'team_leader': return 'blue';
      case 'subject_expert': return 'green';
      case 'process_owner': return 'purple';
      case 'quality_rep': return 'orange';
      case 'technical_expert': return 'cyan';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Team Member',
      dataIndex: 'user_details',
      key: 'user',
      render: (user: any, record: EightDTeam) => (
        <Space>
          <Badge dot={record.is_recognized} color="gold">
            <Avatar icon={<UserOutlined />} />
          </Badge>
          <div>
            <div style={{ fontWeight: 500 }}>
              {user?.full_name || user?.username}
              {record.is_recognized && <StarOutlined style={{ color: '#faad14', marginLeft: 8 }} />}
            </div>
            <Text type="secondary">{user?.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleInfo = TEAM_ROLES.find(r => r.value === role);
        return (
          <Tag color={getRoleColor(role)}>
            {getRoleIcon(role)} {roleInfo?.label}
          </Tag>
        );
      },
    },
    {
      title: 'Expertise Area',
      dataIndex: 'expertise_area',
      key: 'expertise_area',
      render: (text: string) => text || '-',
    },
    {
      title: 'Recognition Status',
      dataIndex: 'is_recognized',
      key: 'is_recognized',
      render: (recognized: boolean, record: EightDTeam) => (
        <Space direction="vertical" size="small">
          <Tag color={recognized ? 'green' : 'orange'}>
            {recognized ? 'Recognized' : 'Pending'}
          </Tag>
          {recognized && record.recognized_date && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {dayjs(record.recognized_date).format('MMM DD, YYYY')}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: EightDTeam) => (
        <Space>
          {!record.is_recognized && !isCompleted && (
            <Button
              size="small"
              type="primary"
              icon={<TrophyOutlined />}
              onClick={() => setShowRecognitionModal(record)}
            >
              Recognize
            </Button>
          )}
          {record.is_recognized && (
            <Button
              size="small"
              icon={<StarOutlined />}
              disabled
            >
              Recognized
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const getRecognitionStats = () => {
    const total = teamMembers.length;
    const recognized = teamMembers.filter(member => member.is_recognized).length;
    return { total, recognized, percentage: total > 0 ? Math.round((recognized / total) * 100) : 0 };
  };

  const allMembersRecognized = () => {
    return teamMembers.length > 0 && teamMembers.every(member => member.is_recognized);
  };

  const stats = getRecognitionStats();

  return (
    <Card
      title={
        <Space>
          <TrophyOutlined />
          <span>D8: Recognize the Team</span>
          {isCompleted && <Tag color="green">Completed</Tag>}
        </Space>
      }
      extra={
        !isCompleted && (
          <Space>
            {teamMembers.length > 0 && (
              <Button
                type="primary"
                icon={<GiftOutlined />}
                onClick={handleRecognizeAllTeam}
                disabled={allMembersRecognized()}
              >
                Recognize All Team
              </Button>
            )}
            {allMembersRecognized() && (
              <Button type="primary" onClick={onComplete}>
                Complete D8
              </Button>
            )}
          </Space>
        )
      }
    >
      <Alert
        message="D8 Objective"
        description="Recognize the collective efforts of the team. Acknowledge individual and team contributions to the successful resolution of the problem."
        type="info"
        showIcon
        style={{ marginBottom: 16, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}
      />

      {!allMembersRecognized() && !isCompleted && (
        <Alert
          message="Completion Requirements"
          description="All team members must be recognized for their contributions to complete this discipline."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Recognition Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Team Members"
              value={stats.total}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Recognized"
              value={stats.recognized}
              prefix={<StarOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Recognition Progress"
              value={stats.percentage}
              suffix="%"
              prefix={<TrophyOutlined style={{ color: stats.percentage === 100 ? '#52c41a' : '#1890ff' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={teamMembers}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Responsibilities:</strong>
                <div>{record.responsibilities || 'No specific responsibilities defined'}</div>
              </div>
              {record.is_recognized && record.recognition_notes && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Recognition Notes:</strong>
                  <div style={{ 
                    padding: '8px 12px', 
                    backgroundColor: '#fff7e6', 
                    border: '1px solid #ffd591',
                    borderRadius: '4px',
                    fontStyle: 'italic'
                  }}>
                    "{record.recognition_notes}"
                  </div>
                </div>
              )}
              {record.is_recognized && record.recognized_by_details && (
                <div>
                  <strong>Recognized by:</strong>
                  <div>{record.recognized_by_details.full_name || record.recognized_by_details.username}</div>
                </div>
              )}
            </div>
          ),
        }}
      />

      {/* Team Recognition Timeline */}
      {teamMembers.some(member => member.is_recognized) && (
        <Card title="Recognition Timeline" style={{ marginTop: 24 }}>
          <Timeline>
            {teamMembers
              .filter(member => member.is_recognized)
              .sort((a, b) => dayjs(a.recognized_date).valueOf() - dayjs(b.recognized_date).valueOf())
              .map(member => (
                <Timeline.Item
                  key={member.id}
                  color="gold"
                  dot={<StarOutlined style={{ color: '#faad14' }} />}
                >
                  <Space direction="vertical" size="small">
                    <Text strong>
                      {member.user_details?.full_name || member.user_details?.username} recognized
                    </Text>
                    <Text type="secondary">
                      {dayjs(member.recognized_date).format('MMM DD, YYYY HH:mm')}
                    </Text>
                    {member.recognition_notes && (
                      <Text italic>"{member.recognition_notes}"</Text>
                    )}
                  </Space>
                </Timeline.Item>
              ))}
          </Timeline>
        </Card>
      )}

      {/* Recognition Modal */}
      <Modal
        title="Recognize Team Member"
        open={!!showRecognitionModal && !isCompleted}
        onCancel={() => {
          setShowRecognitionModal(null);
          recognitionForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={recognitionForm}
          layout="vertical"
          onFinish={handleRecognizeTeamMember}
        >
          <Alert
            message={`Recognizing: ${showRecognitionModal?.user_details?.full_name || showRecognitionModal?.user_details?.username}`}
            description={`Role: ${TEAM_ROLES.find(r => r.value === showRecognitionModal?.role)?.label}`}
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="recognition_notes"
            label="Recognition Message"
            rules={[
              { required: true, message: 'Please provide recognition message' },
              { min: 10, message: 'Recognition message must be at least 10 characters' },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Write a personalized recognition message acknowledging their specific contributions to the 8D process..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Alert
            message="Recognition Guidelines"
            description="Be specific about their contributions, highlight their expertise, and acknowledge how their efforts helped solve the problem."
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                setShowRecognitionModal(null);
                recognitionForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" icon={<TrophyOutlined />}>
              Recognize Team Member
            </Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
};

export default D8Recognition;

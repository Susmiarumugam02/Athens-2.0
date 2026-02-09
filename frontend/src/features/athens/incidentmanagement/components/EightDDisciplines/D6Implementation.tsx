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
  Progress,
  DatePicker,
  Upload,
  Timeline,
  Divider,
} from 'antd';
import {
  SettingOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  UploadOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { EightDCorrectiveAction } from '../../types';
import { eightDCorrectiveApi } from '../../services/api';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface D6ImplementationProps {
  processId: string;
  onComplete: () => void;
  isCompleted: boolean;
}

const D6Implementation: React.FC<D6ImplementationProps> = ({
  processId,
  onComplete,
  isCompleted,
}) => {
  const [actions, setActions] = useState<EightDCorrectiveAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImplementModal, setShowImplementModal] = useState<EightDCorrectiveAction | null>(null);
  const [showProgressModal, setShowProgressModal] = useState<EightDCorrectiveAction | null>(null);
  const [implementForm] = Form.useForm();
  const [progressForm] = Form.useForm();

  useEffect(() => {
    loadCorrectiveActions();
  }, [processId]);

  const loadCorrectiveActions = async () => {
    setLoading(true);
    try {
      const data = await eightDCorrectiveApi.getCorrectiveActions(processId);
      // Filter actions ready for implementation (planned, validated, in_progress, or completed)
      const filteredActions = data.filter(action => ['planned', 'validated', 'in_progress', 'completed'].includes(action.status));
      setActions(filteredActions);
    } catch (error) {
      message.error('Failed to load corrective actions');
    } finally {
      setLoading(false);
    }
  };

  const handleStartImplementation = async (values: any) => {
    if (!showImplementModal) return;

    try {
      await eightDCorrectiveApi.startImplementation(
        showImplementModal.id,
        values.implementation_plan,
        values.start_date?.format('YYYY-MM-DD'),
        values.resources_required
      );
      message.success('Implementation started successfully');
      setShowImplementModal(null);
      implementForm.resetFields();
      loadCorrectiveActions();
    } catch (error) {
      message.error('Failed to start implementation');
    }
  };

  const handleUpdateProgress = async (values: any) => {
    if (!showProgressModal) return;

    try {
      await eightDCorrectiveApi.updateProgress(
        showProgressModal.id,
        values.progress_percentage,
        values.progress_notes,
        values.completion_evidence
      );
      message.success('Progress updated successfully');
      setShowProgressModal(null);
      progressForm.resetFields();
      loadCorrectiveActions();
    } catch (error) {
      message.error('Failed to update progress');
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (showProgressModal) {
      progressForm.setFieldsValue({
        progress_percentage: showProgressModal.implementation_progress || 0,
        progress_notes: showProgressModal.progress_notes || '',
        completion_evidence: showProgressModal.completion_evidence || ''
      });
    }
  }, [showProgressModal, progressForm]);

  const handleCompleteImplementation = async (actionId: string) => {
    
    try {
      const result = await eightDCorrectiveApi.completeImplementation(actionId);
      message.success('Implementation completed successfully');
      await loadCorrectiveActions();
    } catch (error: any) {
      message.error(`Failed to complete implementation: ${error.response?.data?.error || error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'blue';
      case 'validated': return 'cyan';
      case 'in_progress': return 'orange';
      case 'completed': return 'green';
      default: return 'default';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'success';
    if (progress >= 75) return 'normal';
    if (progress >= 50) return 'active';
    return 'exception';
  };

  const columns = [
    {
      title: 'Action Description',
      dataIndex: 'action_description',
      key: 'action_description',
      width: 250,
      render: (text: string) => (
        <div style={{ wordBreak: 'break-word' }}>{text}</div>
      ),
    },
    {
      title: 'Responsible Person',
      dataIndex: 'responsible_person_details',
      key: 'responsible_person',
      render: (person: any) => person?.full_name || person?.username || 'Unassigned',
    },
    {
      title: 'Target Date',
      dataIndex: 'target_date',
      key: 'target_date',
      render: (date: string) => {
        if (!date) return '-';
        const targetDate = dayjs(date);
        const isOverdue = targetDate.isBefore(dayjs()) && targetDate.format('YYYY-MM-DD') !== dayjs().format('YYYY-MM-DD');
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
            {targetDate.format('MMM DD, YYYY')}
            {isOverdue && ' (Overdue)'}
          </span>
        );
      },
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
      title: 'Progress',
      dataIndex: 'implementation_progress',
      key: 'implementation_progress',
      render: (progress: number) => (
        <Progress
          percent={progress || 0}
          size="small"
          status={getProgressColor(progress || 0)}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: EightDCorrectiveAction) => {
        console.log('Action render debug:', {
          id: record.id,
          status: record.status,
          progress: record.implementation_progress,
          shouldShowComplete: record.status === 'in_progress' && (record.implementation_progress || 0) >= 100
        });
        
        return (
          <Space>
            {(record.status === 'planned' || record.status === 'validated') && (
              <Button
                size="small"
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => setShowImplementModal(record)}
              >
                Start
              </Button>
            )}
            {record.status === 'in_progress' && (
              <>
                <Button
                  size="small"
                  icon={<FileTextOutlined />}
                  onClick={() => setShowProgressModal(record)}
                >
                  Update
                </Button>
                {(record.implementation_progress || 0) >= 100 && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => {
                      handleCompleteImplementation(record.id);
                    }}
                  >
                    Complete
                  </Button>
                )}
              </>
            )}
          </Space>
        );
      },
    },
  ];

  const allActionsCompleted = () => {
    return actions.length > 0 && actions.every(action => action.status === 'completed');
  };

  return (
    <Card
      title={
        <Space>
          <SettingOutlined />
          <span>D6: Implement Permanent Corrective Actions</span>
          {isCompleted && <Tag color="green">Completed</Tag>}
        </Space>
      }
      extra={
        !isCompleted && allActionsCompleted() && (
          <Button type="primary" onClick={onComplete}>
            Complete D6
          </Button>
        )
      }
    >
      <Alert
        message="D6 Objective"
        description="Implement the permanent corrective actions chosen in D5. Monitor progress and ensure successful completion of all actions."
        type="info"
        showIcon
        style={{ marginBottom: 16, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}
      />

      {!allActionsCompleted() && !isCompleted && (
        <Alert
          message="Completion Requirements"
          description="All corrective actions must be implemented and completed to finish this discipline."
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
              {record.implementation_plan && (
                <div style={{ marginBottom: 12 }}>
                  <strong>Implementation Plan:</strong>
                  <div>{record.implementation_plan}</div>
                </div>
              )}
              {record.resources_required && (
                <div style={{ marginBottom: 12 }}>
                  <strong>Resources Required:</strong>
                  <div>{record.resources_required}</div>
                </div>
              )}
              {record.progress_notes && (
                <div style={{ marginBottom: 12 }}>
                  <strong>Latest Progress Notes:</strong>
                  <div>{record.progress_notes}</div>
                </div>
              )}
              {record.implementation_start_date && (
                <div>
                  <strong>Started:</strong> {dayjs(record.implementation_start_date).format('MMM DD, YYYY')}
                </div>
              )}
            </div>
          ),
        }}
      />

      {/* Start Implementation Modal */}
      <Modal
        title="Start Implementation"
        open={!!showImplementModal}
        onCancel={() => {
          setShowImplementModal(null);
          implementForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={implementForm}
          layout="vertical"
          onFinish={handleStartImplementation}
        >
          <Alert
            message={`Starting implementation: ${showImplementModal?.action_description}`}
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="implementation_plan"
            label="Implementation Plan"
            rules={[{ required: true, message: 'Please provide implementation plan' }]}
          >
            <TextArea
              rows={4}
              placeholder="Describe the detailed plan for implementing this corrective action..."
            />
          </Form.Item>

          <Form.Item
            name="start_date"
            label="Start Date"
            rules={[{ required: true, message: 'Please select start date' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              defaultValue={dayjs()}
            />
          </Form.Item>

          <Form.Item
            name="resources_required"
            label="Resources Required"
          >
            <TextArea
              rows={3}
              placeholder="List the resources, personnel, and materials needed..."
            />
          </Form.Item>

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                setShowImplementModal(null);
                implementForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Start Implementation
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Update Progress Modal */}
      <Modal
        title="Update Implementation Progress"
        open={!!showProgressModal}
        onCancel={() => {
          setShowProgressModal(null);
          progressForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={progressForm}
          layout="vertical"
          onFinish={handleUpdateProgress}
          initialValues={{
            progress_percentage: showProgressModal?.implementation_progress || 0,
            progress_notes: showProgressModal?.progress_notes || '',
            completion_evidence: showProgressModal?.completion_evidence || ''
          }}
        >
          <Alert
            message={`Updating: ${showProgressModal?.action_description}`}
            type="info"
            style={{ marginBottom: 16 }}
          />

          {showProgressModal?.implementation_plan && (
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
              <strong>Implementation Plan:</strong>
              <div style={{ marginTop: 4 }}>{showProgressModal.implementation_plan}</div>
            </div>
          )}

          {showProgressModal?.resources_required && (
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
              <strong>Resources Required:</strong>
              <div style={{ marginTop: 4 }}>{showProgressModal.resources_required}</div>
            </div>
          )}

          <Form.Item
            name="progress_percentage"
            label="Progress Percentage"
            rules={[{ required: true, message: 'Please set progress percentage' }]}
          >
            <Select placeholder="Select progress percentage">
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(value => (
                <Option key={value} value={value}>{value}%</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="progress_notes"
            label="Progress Notes"
            rules={[{ required: true, message: 'Please provide progress notes' }]}
          >
            <TextArea
              rows={4}
              placeholder="Describe the current progress, milestones achieved, and any issues..."
            />
          </Form.Item>

          <Form.Item
            name="completion_evidence"
            label="Evidence/Documentation"
          >
            <TextArea
              rows={2}
              placeholder="Describe any evidence or documentation of progress..."
            />
          </Form.Item>

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                setShowProgressModal(null);
                progressForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Update Progress
            </Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
};

export default D6Implementation;

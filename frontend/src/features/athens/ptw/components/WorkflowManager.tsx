import React, { useState, useEffect } from 'react';
import { Card, Steps, Button, Select, Modal, Form, Input, message, Tag, Space, Divider } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, UserOutlined } from '@ant-design/icons';
import useAuthStore from '@common/store/authStore';
import ptwAPI from '../../../services/ptwAPI';
import type { Permit, AdminUser, WorkflowStep } from '../types';
import {
  buildWorkflowParams,
  getUserAdminType,
  getUserDisplayName,
  getUserGrade,
  isAllowedApprover,
  isAllowedVerifier,
  normalizeAdminType,
  normalizeGrade,
} from '../utils/workflowGuards';

const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;

interface WorkflowManagerProps {
  permit: Permit;
  onWorkflowUpdate: () => void;
}

interface WorkflowStatus {
  current_stage: number;
  status: string;
  current_step: string | null;
  assignee: string | null;
  steps: WorkflowStep[];
}

const WorkflowManager: React.FC<WorkflowManagerProps> = ({ permit, onWorkflowUpdate }) => {
  const { username, usertype, userId, grade } = useAuthStore();
  const user = { username, usertype, userId, full_name: username, id: userId };
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [availableVerifiers, setAvailableVerifiers] = useState<AdminUser[]>([]);
  const [availableApprovers, setAvailableApprovers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [verifierModalVisible, setVerifierModalVisible] = useState(false);
  const [approverModalVisible, setApproverModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'verify' | 'approve'>('verify');
  
  const [form] = Form.useForm();

  useEffect(() => {
    fetchWorkflowStatus();
  }, [permit.id]);

  const fetchWorkflowStatus = async () => {
    try {
      const response = await ptwAPI.getWorkflowStatus(permit.id);
      setWorkflowStatus(response.data.workflow_status);
    } catch (error) {
    }
  };

  const requestorType = normalizeAdminType(usertype);
  const requestorGrade = normalizeGrade(grade);

  const fetchAvailableUsers = async (type: 'verifiers' | 'approvers') => {
    try {
      const params = buildWorkflowParams(requestorType, requestorGrade);
      const response = type === 'verifiers' 
        ? await ptwAPI.getAvailableVerifiers(params)
        : await ptwAPI.getAvailableApprovers(params);
      
      if (type === 'verifiers') {
        const candidates = response.data.verifiers || [];
        const filtered = candidates.filter((verifier: AdminUser) =>
          isAllowedVerifier(requestorType, requestorGrade, verifier)
        );
        setAvailableVerifiers(filtered);
      } else {
        const candidates = response.data.approvers || [];
        const filtered = candidates.filter((approver: AdminUser) =>
          isAllowedApprover(requestorType, requestorGrade, approver)
        );
        setAvailableApprovers(filtered);
      }
    } catch (error) {
      message.error(`Failed to fetch ${type}`);
    }
  };

  const initiateWorkflow = async () => {
    setLoading(true);
    try {
      await ptwAPI.initiateWorkflow(permit.id);
      message.success('Workflow initiated successfully');
      fetchWorkflowStatus();
      onWorkflowUpdate();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to initiate workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignVerifier = async (values: any) => {
    setLoading(true);
    try {
      await ptwAPI.assignVerifier(permit.id, { verifier_id: values.verifier_id });
      message.success('Verifier assigned successfully');
      setVerifierModalVisible(false);
      fetchWorkflowStatus();
      onWorkflowUpdate();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to assign verifier');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignApprover = async (values: any) => {
    setLoading(true);
    try {
      await ptwAPI.assignApprover(permit.id, { approver_id: values.approver_id });
      message.success('Approver assigned successfully');
      setApproverModalVisible(false);
      fetchWorkflowStatus();
      onWorkflowUpdate();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to assign approver');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowAction = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        action: values.action,
        comments: values.comments || '',
        ...(actionType === 'verify' && values.approver_id && { approver_id: values.approver_id })
      };

      if (actionType === 'verify') {
        await ptwAPI.verifyPermit(permit.id, payload);
        message.success(`Permit ${values.action}d successfully`);
      } else {
        await ptwAPI.approvePermit(permit.id, payload);
        message.success(`Permit ${values.action}d successfully`);
      }

      setActionModalVisible(false);
      form.resetFields();
      fetchWorkflowStatus();
      onWorkflowUpdate();
    } catch (error: any) {
      message.error(error.response?.data?.error || `Failed to ${values.action} permit`);
    } finally {
      setLoading(false);
    }
  };

  const openVerifierModal = () => {
    fetchAvailableUsers('verifiers');
    setVerifierModalVisible(true);
  };

  const openApproverModal = () => {
    fetchAvailableUsers('approvers');
    setApproverModalVisible(true);
  };

  const openActionModal = (type: 'verify' | 'approve') => {
    setActionType(type);
    if (type === 'verify') {
      fetchAvailableUsers('approvers');
    }
    setActionModalVisible(true);
  };

  const getStepStatus = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
      case 'approved':
        return 'finish';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'process';
      default:
        return 'wait';
    }
  };

  const getStepIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
      case 'approved':
        return <CheckCircleOutlined />;
      case 'rejected':
        return <ExclamationCircleOutlined />;
      case 'pending':
        return <ClockCircleOutlined />;
      default:
        return <UserOutlined />;
    }
  };

  const canInitiateWorkflow = permit.status === 'draft' && permit.created_by === user?.id;
  const canAssignVerifier = permit.status === 'submitted' && permit.created_by === user?.id;
  const canVerify = workflowStatus?.steps?.some(step => 
    step.step_type === 'verification' && step.assignee === user?.full_name && step.status === 'pending'
  );
  const canAssignApprover = workflowStatus?.steps?.some(step => 
    step.step_type === 'verification' && step.assignee === user?.full_name && step.status === 'approved'
  );
  const canApprove = workflowStatus?.steps?.some(step => 
    step.step_type === 'approval' && step.assignee === user?.full_name && step.status === 'pending'
  );

  return (
    <Card title="Workflow Management" className="workflow-manager">
      {/* Workflow Status */}
      {workflowStatus && workflowStatus.status !== 'no_workflow' && (
        <div style={{ marginBottom: 24 }}>
          <Steps current={workflowStatus.current_stage - 1} size="small">
            <Step 
              title="Created" 
              status="finish"
              icon={<CheckCircleOutlined />}
            />
            <Step 
              title="Verification" 
              status={workflowStatus.current_stage >= 1 ? 'process' : 'wait'}
              icon={workflowStatus.current_stage >= 1 ? <ClockCircleOutlined /> : <UserOutlined />}
            />
            <Step 
              title="Approval" 
              status={workflowStatus.current_stage >= 2 ? 'process' : 'wait'}
              icon={workflowStatus.current_stage >= 2 ? <ClockCircleOutlined /> : <UserOutlined />}
            />
            <Step 
              title="Approved" 
              status={workflowStatus.status === 'completed' ? 'finish' : 'wait'}
              icon={workflowStatus.status === 'completed' ? <CheckCircleOutlined /> : <UserOutlined />}
            />
          </Steps>
        </div>
      )}

      {/* Current Status */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Tag color="blue">Status: {permit.status.replace('_', ' ').toUpperCase()}</Tag>
          {workflowStatus?.current_step && (
            <Tag color="orange">Current Step: {workflowStatus.current_step}</Tag>
          )}
          {workflowStatus?.assignee && (
            <Tag color="green">Assignee: {workflowStatus.assignee}</Tag>
          )}
        </Space>
      </div>

      {/* Workflow Steps Details */}
      {workflowStatus?.steps && workflowStatus.steps.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Divider orientation="left">Workflow Steps</Divider>
          {workflowStatus.steps.map((step, index) => (
            <div key={index} style={{ marginBottom: 12, padding: 12, border: '1px solid #f0f0f0', borderRadius: 6 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  {getStepIcon(step.status)}
                  <strong>{step.name}</strong>
                  <Tag color={step.status === 'approved' ? 'green' : step.status === 'rejected' ? 'red' : 'orange'}>
                    {step.status.toUpperCase()}
                  </Tag>
                </Space>
                {step.assignee && <div>Assignee: {step.assignee}</div>}
                {step.completed_at && <div>Completed: {new Date(step.completed_at).toLocaleString()}</div>}
                {step.comments && <div>Comments: {step.comments}</div>}
              </Space>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <Space wrap>
        {canInitiateWorkflow && (
          <Button type="primary" onClick={initiateWorkflow} loading={loading}>
            Initiate Workflow
          </Button>
        )}

        {canAssignVerifier && (
          <Button onClick={openVerifierModal}>
            Assign Verifier
          </Button>
        )}

        {canVerify && (
          <Button type="primary" onClick={() => openActionModal('verify')}>
            Verify Permit
          </Button>
        )}

        {canAssignApprover && (
          <Button onClick={openApproverModal}>
            Assign Approver
          </Button>
        )}

        {canApprove && (
          <Button type="primary" onClick={() => openActionModal('approve')}>
            Approve Permit
          </Button>
        )}
      </Space>

      {/* Assign Verifier Modal */}
      <Modal
        title="Assign Verifier"
        open={verifierModalVisible}
        onCancel={() => setVerifierModalVisible(false)}
        footer={null}
      >
        <Form onFinish={handleAssignVerifier} layout="vertical">
          <Form.Item 
            label="Verifier" 
            name="verifier_id" 
            rules={[{ required: true, message: 'Please select a verifier' }]}
          >
            <Select placeholder="Select verifier" showSearch optionFilterProp="children">
              {availableVerifiers.map(verifier => (
                <Option key={verifier.id} value={verifier.id}>
                  {getUserDisplayName(verifier)} ({(getUserAdminType(verifier) || 'user').toUpperCase()} - Grade {(getUserGrade(verifier) || '').toUpperCase()})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Assign Verifier
              </Button>
              <Button onClick={() => setVerifierModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Approver Modal */}
      <Modal
        title="Assign Approver"
        open={approverModalVisible}
        onCancel={() => setApproverModalVisible(false)}
        footer={null}
      >
        <Form onFinish={handleAssignApprover} layout="vertical">
          <Form.Item 
            label="Approver" 
            name="approver_id" 
            rules={[{ required: true, message: 'Please select an approver' }]}
          >
            <Select placeholder="Select approver" showSearch optionFilterProp="children">
              {availableApprovers.map(approver => (
                <Option key={approver.id} value={approver.id}>
                  {getUserDisplayName(approver)} ({(getUserAdminType(approver) || 'user').toUpperCase()} - Grade {(getUserGrade(approver) || '').toUpperCase()})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Assign Approver
              </Button>
              <Button onClick={() => setApproverModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Action Modal (Verify/Approve) */}
      <Modal
        title={`${actionType === 'verify' ? 'Verify' : 'Approve'} Permit`}
        open={actionModalVisible}
        onCancel={() => setActionModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleWorkflowAction} layout="vertical">
          <Form.Item 
            label="Action" 
            name="action" 
            rules={[{ required: true, message: 'Please select an action' }]}
          >
            <Select placeholder="Select action">
              <Option value="approve">Approve</Option>
              <Option value="reject">Reject</Option>
            </Select>
          </Form.Item>

          {actionType === 'verify' && (
            <Form.Item
              label="Select Approver"
              name="approver_id"
              dependencies={['action']}
              rules={[
                ({ getFieldValue }) => ({
                  required: getFieldValue('action') === 'approve',
                  message: 'Please select an approver for approval',
                }),
              ]}
            >
              <Select placeholder="Select approver for next stage" showSearch optionFilterProp="children">
                {availableApprovers.map(approver => (
                  <Option key={approver.id} value={approver.id}>
                    {getUserDisplayName(approver)} ({(getUserAdminType(approver) || 'user').toUpperCase()} - Grade {(getUserGrade(approver) || '').toUpperCase()})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item label="Comments" name="comments">
            <TextArea rows={4} placeholder="Enter comments (optional)" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Submit
              </Button>
              <Button onClick={() => setActionModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default WorkflowManager;

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Alert, Table, Tag, message } from 'antd';
import { ToolOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import D5CorrectiveActionForm from './D5CorrectiveActionForm';
import api from '../../services/api';
import { EightDCorrectiveAction, EightDRootCause } from '../../types';

interface D5CorrectiveActionsProps {
  processId: string;
  onComplete: () => void;
  isCompleted: boolean;
}

const D5CorrectiveActions: React.FC<D5CorrectiveActionsProps> = ({
  processId,
  onComplete,
  isCompleted,
}) => {
  const [showCorrectiveActionForm, setShowCorrectiveActionForm] = useState(false);
  const [correctiveActions, setCorrectiveActions] = useState<EightDCorrectiveAction[]>([]);
  const [rootCauses, setRootCauses] = useState<EightDRootCause[]>([]);
  const [loading, setLoading] = useState(false);

  // Load corrective actions and root causes
  const loadData = async () => {
    try {
      const [actionsData, causesData] = await Promise.all([
        api.eightDCorrective.getCorrectiveActions(processId),
        api.eightDRootCause.getRootCauses(processId)
      ]);
      setCorrectiveActions(actionsData);
      setRootCauses(causesData.filter((cause: EightDRootCause) => cause.is_verified));
    } catch (error) {
    }
  };

  useEffect(() => {
    loadData();
  }, [processId]);

  // Add corrective action
  const handleAddCorrectiveAction = async (values: any) => {
    setLoading(true);
    try {
      const formData = {
        eight_d_process: processId,
        ...values,
        target_date: values.target_date ? values.target_date.format('YYYY-MM-DD') : null,
      };
      await api.eightDCorrective.createCorrectiveAction(formData);
      message.success('Corrective action added successfully');
      setShowCorrectiveActionForm(false);
      await loadData();
    } catch (error) {
      message.error('Failed to add corrective action');
    } finally {
      setLoading(false);
    }
  };

  // Delete corrective action
  const handleDeleteCorrectiveAction = async (id: string) => {
    try {
      await api.eightDCorrective.deleteCorrectiveAction(id);
      message.success('Corrective action deleted successfully');
      await loadData();
    } catch (error) {
      message.error('Failed to delete corrective action');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      planned: 'blue',
      approved: 'cyan',
      in_progress: 'orange',
      implemented: 'green',
      verified: 'purple',
      effective: 'green',
      ineffective: 'red'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const columns = [
    {
      title: 'Action Description',
      dataIndex: 'action_description',
      key: 'action_description',
      width: '30%',
    },
    {
      title: 'Action Type',
      dataIndex: 'action_type',
      key: 'action_type',
      render: (type: string) => type.replace('_', ' ').toUpperCase(),
    },
    {
      title: 'Responsible Person',
      dataIndex: 'responsible_person_details',
      key: 'responsible_person',
      render: (person: any) => person?.full_name || 'Not assigned',
    },
    {
      title: 'Target Date',
      dataIndex: 'target_date',
      key: 'target_date',
      render: (date: string) => new Date(date).toLocaleDateString(),
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
      render: (record: EightDCorrectiveAction) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            disabled={isCompleted}
            title="Edit corrective action"
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteCorrectiveAction(record.id)}
            disabled={isCompleted}
            title="Delete corrective action"
          />
        </Space>
      ),
    },
  ];

  const hasCorrectiveActions = () => {
    return correctiveActions.length > 0;
  };

  return (
    <Card
      title={
        <Space>
          <ToolOutlined />
          D5: Choose Permanent Corrective Actions
        </Space>
      }
      extra={
        !isCompleted && (
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCorrectiveActionForm(true)}
              disabled={rootCauses.length === 0}
            >
              Add Corrective Action
            </Button>
            {hasCorrectiveActions() && (
              <Button
                type="primary"
                onClick={onComplete}
                style={{ backgroundColor: '#52c41a' }}
              >
                Complete D5
              </Button>
            )}
          </Space>
        )
      }
    >
      <Alert
        message="D5: Choose Permanent Corrective Actions"
        description="Choose and verify permanent corrective actions that will eliminate the root cause and prevent recurrence."
        type="info"
        showIcon
        style={{ marginBottom: 16, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}
      />

      {rootCauses.length === 0 && (
        <Alert
          message="No Verified Root Causes"
          description="You need verified root causes from D4 before creating corrective actions."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {!hasCorrectiveActions() && !isCompleted && rootCauses.length > 0 && (
        <Alert
          message="Completion Requirements"
          description="You need at least one corrective action to complete this discipline."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        columns={columns}
        dataSource={correctiveActions}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
      />

      <D5CorrectiveActionForm
        visible={showCorrectiveActionForm}
        onCancel={() => setShowCorrectiveActionForm(false)}
        onSubmit={handleAddCorrectiveAction}
        loading={loading}
        rootCauses={rootCauses}
      />

      {isCompleted && (
        <Alert
          message="D5 Completed"
          description="Permanent corrective actions have been chosen and documented. These will be implemented in D6."
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default D5CorrectiveActions;
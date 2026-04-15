import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Alert, Table, Tag, message, Select } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ExperimentOutlined } from '@ant-design/icons';
import D4RootCauseForm from './D4RootCauseForm';
import FiveWhysModal from './AnalysisMethods/FiveWhysModal';
import FishboneModal from './AnalysisMethods/FishboneModal';
import BarrierAnalysisModal from './AnalysisMethods/BarrierAnalysisModal';
import TimelineModal from './AnalysisMethods/TimelineModal';
import ChangeAnalysisModal from './AnalysisMethods/ChangeAnalysisModal';
import FaultTreeModal from './AnalysisMethods/FaultTreeModal';
import api from '../../../../common/utils/axiosetup';
import { EightDRootCause } from '../../types';

const { Option } = Select;

interface D4RootCauseAnalysisProps {
  processId: string;
  incidentId: string; // Add incidentId prop
  assignedInvestigatorId?: string;
  onComplete: () => void;
  isCompleted: boolean;
}

const D4RootCauseAnalysis: React.FC<D4RootCauseAnalysisProps> = ({
  processId,
  incidentId,
  assignedInvestigatorId,
  onComplete,
  isCompleted,
}) => {
  const [showRootCauseForm, setShowRootCauseForm] = useState(false);
  const [editingRootCause, setEditingRootCause] = useState<EightDRootCause | null>(null);
  const [rootCauses, setRootCauses] = useState<EightDRootCause[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [currentRootCause, setCurrentRootCause] = useState<EightDRootCause | null>(null);

  // Load root causes
  const loadRootCauses = async () => {
    try {
      const response = await api.get(`/api/v1/incidentmanagement/8d-root-causes/?eight_d_process=${processId}`);
      setRootCauses(response.data.results || response.data);
    } catch (error) {
    }
  };

  useEffect(() => {
    loadRootCauses();
  }, [processId]);

  // Add root cause
  const handleAddRootCause = async (values: any) => {
    setLoading(true);
    try {
      if (editingRootCause) {
        await api.patch(`/api/v1/incidentmanagement/8d-root-causes/${editingRootCause.id}/`, values);
        message.success('Root cause updated successfully');
      } else {
        await api.post('/api/v1/incidentmanagement/8d-root-causes/', {
          eight_d_process: processId,
          identified_by: assignedInvestigatorId,
          ...values,
        });
        message.success('Root cause added successfully');
      }
      setShowRootCauseForm(false);
      setEditingRootCause(null);
      await loadRootCauses();
    } catch (error) {
      message.error('Failed to save root cause');
    } finally {
      setLoading(false);
    }
  };

  // Handle analysis method selection
  const handleMethodSelect = (method: string, rootCause: EightDRootCause) => {
    setSelectedMethod(method);
    setCurrentRootCause(rootCause);
    setShowMethodModal(true);
  };

  // Save analysis method data
  const handleMethodSubmit = async (data: any) => {
    if (!currentRootCause) return;
    
    setLoading(true);
    try {
      await api.post('/api/v1/incidentmanagement/8d-analysis-methods/', {
        root_cause: currentRootCause.id,
        method_type: data.method_type,
        method_data: data.method_data,
      });
      message.success('Analysis method saved successfully');
      setShowMethodModal(false);
      setSelectedMethod('');
      setCurrentRootCause(null);
    } catch (error) {
      message.error('Failed to save analysis method');
    } finally {
      setLoading(false);
    }
  };

  // Edit root cause
  const handleEditRootCause = (rootCause: EightDRootCause) => {
    setEditingRootCause(rootCause);
    setShowRootCauseForm(true);
  };

  // Verify root cause
  const handleVerifyRootCause = async (id: string) => {
    try {
      await api.patch(`/api/v1/incidentmanagement/8d-root-causes/${id}/`, {
        is_verified: true,
        verification_method: 'Verified by investigator'
      });
      message.success('Root cause verified successfully');
      await loadRootCauses();
    } catch (error) {
      message.error('Failed to verify root cause');
    }
  };

  // Delete root cause
  const handleDeleteRootCause = async (id: string) => {
    try {
      await api.delete(`/api/v1/incidentmanagement/8d-root-causes/${id}/`);
      message.success('Root cause deleted successfully');
      await loadRootCauses();
    } catch (error) {
      message.error('Failed to delete root cause');
    }
  };

  const getCauseTypeColor = (type: string) => {
    const colors = {
      immediate: 'red',
      contributing: 'orange', 
      root: 'green',
      systemic: 'purple'
    };
    return colors[type as keyof typeof colors] || 'default';
  };

  const columns = [
    {
      title: 'Cause Description',
      dataIndex: 'cause_description',
      key: 'cause_description',
      width: '30%',
    },
    {
      title: 'Type',
      dataIndex: 'cause_type',
      key: 'cause_type',
      render: (type: string) => (
        <Tag color={getCauseTypeColor(type)}>
          {type.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Analysis Method',
      dataIndex: 'analysis_method',
      key: 'analysis_method',
      render: (method: string, record: EightDRootCause) => (
        <Space>
          <span>{method.replace('_', ' ').toUpperCase()}</span>
          {!isCompleted && (
            <Select
              placeholder="Add Analysis"
              style={{ width: 120 }}
              size="small"
              onChange={(value) => handleMethodSelect(value, record)}
            >
              <Option value="5_whys">5 Whys</Option>
              <Option value="fishbone">Fishbone</Option>
              <Option value="fault_tree">Fault Tree</Option>
              <Option value="barrier_analysis">Barrier</Option>
              <Option value="change_analysis">Change</Option>
              <Option value="timeline">Timeline</Option>
            </Select>
          )}
        </Space>
      ),
    },
    {
      title: 'Verified',
      dataIndex: 'is_verified',
      key: 'is_verified',
      render: (verified: boolean) => (
        <Tag color={verified ? 'green' : 'orange'}>
          {verified ? 'Verified' : 'Pending'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: EightDRootCause) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditRootCause(record)}
            disabled={isCompleted}
            title="Edit root cause"
          />
          {!record.is_verified && (
            <Button
              size="small"
              type="primary"
              onClick={() => handleVerifyRootCause(record.id)}
              disabled={isCompleted}
              title="Verify root cause"
            >
              Verify
            </Button>
          )}
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteRootCause(record.id)}
            disabled={isCompleted}
            title="Delete root cause"
          />
        </Space>
      ),
    },
  ];

  const hasVerifiedRootCauses = () => {
    return rootCauses.some((cause: EightDRootCause) => cause.is_verified);
  };

  // Debug logs

  return (
    <Card
      title={
        <Space>
          <SearchOutlined />
          D4: Determine Root Causes
        </Space>
      }
      extra={
        !isCompleted && (
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowRootCauseForm(true)}
            >
              Add Root Cause
            </Button>
            {hasVerifiedRootCauses() && (
              <Button
                type="primary"
                onClick={onComplete}
                style={{ backgroundColor: '#52c41a' }}
              >
                Complete D4
              </Button>
            )}
          </Space>
        )
      }
    >
      <Alert
        message="D4: Determine Root Causes"
        description="Identify and verify the root cause(s) of the problem using systematic investigation methods."
        type="info"
        showIcon
        style={{ marginBottom: 16, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}
      />

      {!hasVerifiedRootCauses() && !isCompleted && (
        <Alert
          message="Completion Requirements"
          description="You need at least one verified root cause to complete this discipline."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        columns={columns}
        dataSource={rootCauses}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
      />

      <D4RootCauseForm
        visible={showRootCauseForm}
        onCancel={() => {
          setShowRootCauseForm(false);
          setEditingRootCause(null);
        }}
        onSubmit={handleAddRootCause}
        loading={loading}
        initialValues={editingRootCause}
        isEditing={!!editingRootCause}
      />

      {/* Analysis Method Modals */}
      {selectedMethod === '5_whys' && (
        <FiveWhysModal
          visible={showMethodModal}
          onSubmit={handleMethodSubmit}
          onCancel={() => {
            setShowMethodModal(false);
          }}
          loading={loading}
        />
      )}
      
      {selectedMethod === 'fishbone' && (
        <FishboneModal
          visible={showMethodModal}
          onSubmit={handleMethodSubmit}
          onCancel={() => setShowMethodModal(false)}
          loading={loading}
        />
      )}
      
      {selectedMethod === 'barrier_analysis' && (
        <BarrierAnalysisModal
          visible={showMethodModal}
          onSubmit={handleMethodSubmit}
          onCancel={() => setShowMethodModal(false)}
          loading={loading}
        />
      )}
      
      {selectedMethod === 'timeline' && (
        <TimelineModal
          visible={showMethodModal}
          onSubmit={handleMethodSubmit}
          onCancel={() => setShowMethodModal(false)}
          loading={loading}
        />
      )}
      
      {selectedMethod === 'change_analysis' && (
        <ChangeAnalysisModal
          visible={showMethodModal}
          onSubmit={handleMethodSubmit}
          onCancel={() => setShowMethodModal(false)}
          loading={loading}
        />
      )}
      
      {selectedMethod === 'fault_tree' && (
        <FaultTreeModal
          visible={showMethodModal}
          onSubmit={handleMethodSubmit}
          onCancel={() => setShowMethodModal(false)}
          loading={loading}
        />
      )}

      {isCompleted && (
        <Alert
          message="D4 Completed"
          description="Root cause analysis has been completed. The investigation findings will be used in the next disciplines."
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default D4RootCauseAnalysis;
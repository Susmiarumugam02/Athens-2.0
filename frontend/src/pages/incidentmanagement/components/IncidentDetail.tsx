import React, { useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Tabs,
  Timeline,
  Image,
  List,
  Tooltip,
  Modal,
  Progress,
  Row,
  Col,
  Alert,
  Divider,
  message,
  Steps,
} from 'antd';

import EightDProcess from './EightDProcess';
import CostTrackingPanel from './CostTrackingPanel';
import LessonsLearnedPanel from './LessonsLearnedPanel';
import RiskAssessmentMatrix from './RiskAssessmentMatrix';
import {
  EditOutlined,
  UserAddOutlined,
  CloseOutlined,
  FileTextOutlined,

  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useIncident } from '../hooks/useIncidents';

import {
  INCIDENT_TYPES,
  SEVERITY_LEVELS,
  INCIDENT_STATUSES,
} from '../types';



interface IncidentDetailProps {
  incidentId: string;
  onEdit?: () => void;

  onClose?: () => void;
}

const IncidentDetail: React.FC<IncidentDetailProps> = ({
  incidentId,
  onEdit,

  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('details');


  const { incident, loading, closeIncident, updateStatus } = useIncident(incidentId);


  if (loading) {
    return <Card loading />;
  }

  if (!incident) {
    return (
      <Card>
        <Alert message="Incident not found" type="error" />
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    const severityConfig = SEVERITY_LEVELS.find(s => s.value === severity);
    return severityConfig?.color || 'default';
  };

  const getStatusColor = (status: string) => {
    const statusConfig = INCIDENT_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'default';
  };

  const getIncidentTypeLabel = (type: string) => {
    const typeConfig = INCIDENT_TYPES.find(t => t.value === type);
    return typeConfig?.label || type;
  };

  const getSeverityLabel = (severity: string) => {
    const severityConfig = SEVERITY_LEVELS.find(s => s.value === severity);
    return severityConfig?.label || severity;
  };

  const getStatusLabel = (status: string) => {
    const statusConfig = INCIDENT_STATUSES.find(s => s.value === status);
    return statusConfig?.label || status;
  };



  const handleCloseIncident = () => {
    Modal.confirm({
      title: 'Close Incident',
      content: 'Are you sure you want to close this incident?',
      okText: 'Close',
      cancelText: 'Cancel',
      onOk: async () => {
        await closeIncident();
        if (onClose) {
          onClose();
        }
      },
    });
  };

  const getNextStatusActions = () => {
    const actions = [];

    switch (incident?.status) {
      case 'reported':
        if (incident.assigned_investigator) {
          actions.push({
            key: '8d_initiated',
            label: 'Start 8D Process',
            icon: <ExperimentOutlined />,
            color: 'orange'
          });
        }
        break;
      case '8d_initiated':
      case '8d_in_progress':
        // 8D process is active - status updated automatically
        break;
      case '8d_completed':
        actions.push({
          key: 'closed',
          label: 'Close Incident',
          icon: <CheckCircleOutlined />,
          color: 'green'
        });
        break;
    }

    return actions;
  };

  const getWorkflowProgress = () => {
    const steps = [
      { title: 'Reported', status: 'reported' },
      { title: '8D Initiated', status: '8d_initiated' },
      { title: '8D In Progress', status: '8d_in_progress' },
      { title: '8D Completed', status: '8d_completed' },
      { title: 'Closed', status: 'closed' },
    ];

    const currentIndex = steps.findIndex(step => step.status === incident?.status);

    return (
      <Card title="Workflow Progress" style={{ marginBottom: 16 }}>
        <Steps
          current={currentIndex}
          size="small"
          items={steps.map((step, index) => ({
            title: step.title,
            status: index < currentIndex ? 'finish' :
                   index === currentIndex ? 'process' : 'wait'
          }))}
        />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Progress
            percent={Math.round(((currentIndex + 1) / steps.length) * 100)}
            size="small"
            status={incident?.status === 'closed' ? 'success' : 'active'}
          />
        </div>
      </Card>
    );
  };

  const renderIncidentDetails = () => (
    <Card title="Incident Information">
      <Descriptions bordered column={2}>
        <Descriptions.Item label="Incident ID" span={1}>
          <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
            {incident.incident_id}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="Status" span={1}>
          <Tag color={getStatusColor(incident.status)}>
            {getStatusLabel(incident.status)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Title" span={2}>
          {incident.title}
        </Descriptions.Item>
        <Descriptions.Item label="Type" span={1}>
          <Tag>{getIncidentTypeLabel(incident.incident_type)}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Severity" span={1}>
          <Tag color={getSeverityColor(incident.severity_level)}>
            {getSeverityLabel(incident.severity_level)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Date & Time" span={1}>
          {dayjs(incident.date_time_incident).format('YYYY-MM-DD HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label="Days Since Reported" span={1}>
          <Tag color={incident.days_since_reported! > 7 ? 'red' : incident.days_since_reported! > 3 ? 'orange' : 'green'}>
            {incident.days_since_reported} days
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Location" span={1}>
          {incident.location}
        </Descriptions.Item>
        <Descriptions.Item label="Department" span={1}>
          {incident.department}
        </Descriptions.Item>
        <Descriptions.Item label="Reporter" span={1}>
          {incident.reporter_name}
        </Descriptions.Item>
        <Descriptions.Item label="Reported By" span={1}>
          {incident.reported_by_details?.full_name || 'Unknown'}
        </Descriptions.Item>
        <Descriptions.Item label="Assigned Investigator" span={2}>
          {incident.assigned_investigator_details ? (
            <Tag color="blue">{incident.assigned_investigator_details.full_name}</Tag>
          ) : (
            <Tag color="orange">Not Assigned</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Description" span={2}>
          {incident.description}
        </Descriptions.Item>
        {incident.immediate_action_taken && (
          <Descriptions.Item label="Immediate Action Taken" span={2}>
            {incident.immediate_action_taken}
          </Descriptions.Item>
        )}
        {incident.potential_causes && (
          <Descriptions.Item label="Potential Causes" span={2}>
            {incident.potential_causes}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Completion" span={2}>
          <Progress 
            percent={incident.completion_percentage} 
            status={incident.status === 'closed' ? 'success' : 'active'}
          />
        </Descriptions.Item>
      </Descriptions>

      {incident.attachments && incident.attachments.length > 0 && (
        <>
          <Divider orientation="left">Attachments</Divider>
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
            dataSource={incident.attachments}
            renderItem={(attachment) => (
              <List.Item>
                <Card
                  size="small"
                  cover={
                    attachment.file_type.startsWith('image/') ? (
                      <Image
                        src={attachment.file_url}
                        alt={attachment.filename}
                        style={{ height: 120, objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ 
                        height: 120, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: '#f5f5f5'
                      }}>
                        <FileTextOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                      </div>
                    )
                  }
                  actions={[
                    <Tooltip title="Download">
                      <Button 
                        type="text" 
                        icon={<DownloadOutlined />}
                        href={attachment.file_url}
                        target="_blank"
                      />
                    </Tooltip>
                  ]}
                >
                  <Card.Meta
                    title={attachment.filename}
                    description={attachment.description}
                  />
                </Card>
              </List.Item>
            )}
          />
        </>
      )}
    </Card>
  );







  const renderAuditLog = () => (
    <Card title="Audit Trail">
      {incident.audit_logs && incident.audit_logs.length > 0 ? (
        <Timeline
          items={incident.audit_logs.map((log) => ({
            key: log.id,
            dot: <ClockCircleOutlined />,
            color: 'blue',
            children: (
              <div>
                <strong>{log.action.replace('_', ' ').toUpperCase()}</strong>
                <br />
                {log.description}
                <br />
                <small>
                  By {log.performed_by_details?.full_name || 'System'} on{' '}
                  {dayjs(log.timestamp).format('YYYY-MM-DD HH:mm')}
                </small>
              </div>
            )
          }))}
        />
      ) : (
        <Alert
          message="No Audit Logs"
          description="No audit trail available for this incident."
          type="info"
          showIcon
        />
      )}
    </Card>
  );

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <h2 style={{ margin: 0 }}>
                Incident {incident.incident_id}
              </h2>
              <Tag color={getStatusColor(incident.status)}>
                {getStatusLabel(incident.status)}
              </Tag>
              {incident.is_overdue && (
                <Tag color="red" icon={<WarningOutlined />}>
                  Overdue
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              {incident.status !== 'closed' && (
                <>
                  <Button icon={<EditOutlined />} onClick={onEdit}>
                    Edit
                  </Button>


                  {/* Status Transition Buttons */}
                  {getNextStatusActions().map(action => (
                    <Button
                      key={action.key}
                      type="primary"
                      icon={action.icon}
                      onClick={async () => {
                        const success = await updateStatus(action.key, `Status updated to ${action.label}`);
                        if (success) {
                          message.success(`Status updated to ${action.label}`);
                        }
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}

                  <Button
                    icon={<CloseOutlined />}
                    onClick={handleCloseIncident}
                    danger
                  >
                    Close Incident
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Workflow Progress */}
      {getWorkflowProgress()}

      {/* Content Tabs */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'details',
            label: 'Details',
            children: renderIncidentDetails()
          },
          {
            key: 'eightd',
            label: '8D Investigation Process',
            children: (
              <EightDProcess
                incidentId={incidentId}
                onProcessUpdate={(process) => {
                  // Handle 8D process updates if needed
                }}
              />
            )
          },
          {
            key: 'costs',
            label: 'Cost Tracking',
            children: (
              <CostTrackingPanel
                incidentId={incidentId}
                canManageFinancials={true}
                canApprove={true}
              />
            )
          },
          {
            key: 'risk',
            label: 'Risk Assessment',
            children: (
              <RiskAssessmentMatrix
                data={{
                  matrix_data: [
                    [1, 2, 3, 4, 5],
                    [2, 4, 6, 8, 10],
                    [3, 6, 9, 12, 15],
                    [4, 8, 12, 16, 20],
                    [5, 10, 15, 20, 25]
                  ],
                  incident_distribution: { 1: 5, 2: 8, 3: 12, 4: 6, 5: 3, 6: 4, 8: 2, 9: 1, 10: 1, 12: 2, 15: 1, 16: 1, 20: 1, 25: 1 },
                  risk_zones: {
                    low: { range: [1, 3], color: '#52c41a', label: 'Low Risk', count: 15 },
                    medium: { range: [4, 9], color: '#faad14', label: 'Medium Risk', count: 25 },
                    high: { range: [10, 25], color: '#ff4d4f', label: 'High Risk', count: 8 }
                  }
                }}
                selectedIncident={incident ? {
                  probability_score: incident.probability_score || 3,
                  impact_score: incident.impact_score || 3,
                  risk_score: (incident.probability_score || 3) * (incident.impact_score || 3)
                } : undefined}
              />
            )
          },
          {
            key: 'lessons',
            label: 'Lessons Learned',
            children: (
              <LessonsLearnedPanel
                incidentId={incidentId}
                canManage={true}
              />
            )
          },
          {
            key: 'audit',
            label: 'Audit Log',
            children: renderAuditLog()
          }
        ]}
      />
    </div>
  );
};

export default IncidentDetail;

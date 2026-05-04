import React, { useState, useEffect } from 'react';
import {
  Card,
  Steps,
  Row,
  Col,
  Progress,
  Tag,
  Button,
  Space,
  Typography,
  Statistic,
  Timeline,
  Avatar,
  Tooltip,
  Alert,
  Spin,
  message,
} from 'antd';
import EightDProcessForm from './EightDProcessForm';
import D1TeamManagement from './EightDDisciplines/D1TeamManagement';
import D2ProblemDescription from './EightDDisciplines/D2ProblemDescription';
import D3ContainmentActions from './EightDDisciplines/D3ContainmentActions';
import D4RootCauseAnalysis from './EightDDisciplines/D4RootCauseAnalysis';
import D5CorrectiveActions from './EightDDisciplines/D5CorrectiveActions';
import D6Implementation from './EightDDisciplines/D6Implementation';
import D7Prevention from './EightDDisciplines/D7Prevention';
import D8Recognition from './EightDDisciplines/D8Recognition';
import {
  TeamOutlined,
  FileTextOutlined,
  SafetyOutlined,
  SearchOutlined,
  ToolOutlined,
  SettingOutlined,
  StopOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  EightDProcess as EightDProcessType,
  EIGHT_D_DISCIPLINES,
  EIGHT_D_STATUSES,
} from '../types';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface EightDProcessProps {
  incidentId: string;
  onProcessUpdate?: (process: EightDProcessType) => void;
}

const EightDProcess: React.FC<EightDProcessProps> = ({
  incidentId,
  onProcessUpdate,
}) => {
  const [process, setProcess] = useState<EightDProcessType | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Load 8D process data
  const loadProcess = async () => {
    setLoading(true);
    try {
      const data = await api.eightD.getProcessByIncident(incidentId);
      setProcess(data);
      if (data) {
        // Set current step based on current discipline (D1=0, D2=1, D3=2, etc.)
        // When process is completed, all steps are completed (step 7 = D8)
        const isCompleted = data.status === 'completed' && data.overall_progress === 100;
        setCurrentStep(isCompleted ? 7 : data.current_discipline - 1);
        onProcessUpdate?.(data);
      }
    } catch (error) {
      message.error('Failed to load 8D process');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcess();
  }, [incidentId]);

  // Create new 8D process
  const createEightDProcess = async (data: {
    problem_statement: string;
    champion: string;
    target_completion_date?: string;
  }) => {
    setLoading(true);
    try {
      const newProcess = await api.eightD.createProcess({
        incident: incidentId,
        problem_statement: data.problem_statement,
        champion: data.champion,
        target_completion_date: data.target_completion_date,
      });
      setProcess(newProcess);
      setCurrentStep(0);
      onProcessUpdate?.(newProcess);
      setShowCreateForm(false);
      message.success('8D Process created successfully');
    } catch (error) {
      message.error('Failed to create 8D process');
    } finally {
      setLoading(false);
    }
  };

  // Complete discipline
  const completeDiscipline = async (disciplineNumber: number) => {
    if (!process) return;

    setLoading(true);
    
    try {
      const result = await api.eightD.completeDiscipline(process.id, disciplineNumber);
      
      if (disciplineNumber === 8) {
        message.success('🎉 8D Process completed successfully! All disciplines are now finished.');
      } else {
        message.success(`D${disciplineNumber} completed successfully`);
      }
      
      // Force reload to get updated data
      await loadProcess();
    } catch (error: any) {
      
      if (error.response?.status === 403) {
        message.error(`Permission denied: Only the 8D Champion or authorized users can complete D${disciplineNumber}. Please contact the process champion.`);
      } else {
        message.error(`Failed to complete D${disciplineNumber}: ${error.response?.data?.detail || error.response?.data?.error || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Get step status
  const getStepStatus = (stepNumber: number) => {
    if (!process) return 'wait';
    
    // Check if process is completed (all disciplines done)
    const isProcessCompleted = process.status === 'completed' && process.overall_progress === 100;
    
    if (isProcessCompleted) {
      return 'finish';
    }
    
    if (stepNumber < process.current_discipline) {
      return 'finish';
    } else if (stepNumber === process.current_discipline) {
      return 'process';
    } else {
      return 'wait';
    }
  };

  // Get discipline icon
  const getDisciplineIcon = (disciplineNumber: number) => {
    const icons = [
      <TeamOutlined />,
      <FileTextOutlined />,
      <SafetyOutlined />,
      <SearchOutlined />,
      <ToolOutlined />,
      <SettingOutlined />,
      <StopOutlined />,
      <TrophyOutlined />,
    ];
    return icons[disciplineNumber - 1] || <FileTextOutlined />;
  };

  // Get current discipline title
  const getCurrentDisciplineTitle = () => {
    if (!process) return 'Problem Statement';
    
    if (process.status === 'completed' && process.overall_progress === 100) {
      return '8D Process Completed';
    }
    
    const disciplineTitles = {
      1: 'D1: Establish the Team',
      2: 'D2: Describe the Problem',
      3: 'D3: Develop Interim Containment Actions',
      4: 'D4: Determine Root Causes',
      5: 'D5: Choose Permanent Corrective Actions',
      6: 'D6: Implement Permanent Corrective Actions',
      7: 'D7: Prevent Recurrence',
      8: 'D8: Recognize the Team'
    };
    
    return disciplineTitles[process.current_discipline as keyof typeof disciplineTitles] || 'D1: Establish the Team';
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading 8D Process...</div>
        </div>
      </Card>
    );
  }

  if (!process) {
    return (
      <div>
        <Card>
          <Alert
            message="No 8D Process Found"
            description="No 8D problem-solving process has been initiated for this incident. Start the 8D methodology to systematically solve this problem."
            type="info"
            showIcon
            action={
              <Button
                type="primary"
                icon={<TeamOutlined />}
                onClick={() => setShowCreateForm(true)}
              >
                Start 8D Process
              </Button>
            }
          />
        </Card>

        <EightDProcessForm
          visible={showCreateForm}
          onCancel={() => setShowCreateForm(false)}
          onSubmit={createEightDProcess}
          loading={loading}
        />
      </div>
    );
  }

  const statusConfig = EIGHT_D_STATUSES.find(s => s.value === process.status);

  return (
    <div>
      {/* 8D Process Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" size="small">
              <Title level={4} style={{ margin: 0 }}>
                {process.eight_d_id}
              </Title>
              <Text type="secondary">8D Problem Solving Process</Text>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Statistic
              title="Overall Progress"
              value={process.overall_progress}
              suffix="%"
              prefix={<Progress type="circle" percent={process.overall_progress} size={60} />}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space direction="vertical" size="small">
              <Text strong>Status</Text>
              <Tag color={statusConfig?.color} icon={statusConfig?.icon}>
                {statusConfig?.label}
              </Tag>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space direction="vertical" size="small">
              <Text strong>Champion</Text>
              <Space>
                <Avatar size="small">
                  {process.champion_details?.name?.[0]}
                </Avatar>
                <Text>{process.champion_details?.name} {process.champion_details?.surname}</Text>
                <Tooltip title="Only the Champion can complete disciplines">
                  <Tag color="gold">Champion</Tag>
                </Tooltip>
              </Space>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space direction="vertical" size="small">
              <Text strong>Days Active</Text>
              <Statistic
                value={process.days_since_initiated}
                suffix="days"
                valueStyle={{ fontSize: 16 }}
                prefix={process.is_overdue ? <WarningOutlined style={{ color: '#ff4d4f' }} /> : <ClockCircleOutlined />}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Current Discipline Header */}
      <Card title={getCurrentDisciplineTitle()} style={{ marginBottom: 24 }}>
        <Alert
          message="Problem Statement"
          description={process.problem_statement}
          type="info"
          showIcon
          style={{ marginBottom: 16, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}
        />
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Text strong>Incident: </Text>
            <Text>{process.incident_details?.incident_id}</Text>
          </Col>
          <Col xs={24} sm={8}>
            <Text strong>Severity: </Text>
            <Tag color={process.incident_details?.severity_level === 'high' ? 'red' : 'orange'}>
              {process.incident_details?.severity_level?.toUpperCase()}
            </Tag>
          </Col>
          <Col xs={24} sm={8}>
            <Text strong>Target Completion: </Text>
            <Text>{new Date(process.target_completion_date || '').toLocaleDateString()}</Text>
          </Col>
        </Row>
      </Card>

      {/* 8D Steps Progress */}
      <Card title="8D Methodology Progress" style={{ marginBottom: 24 }}>
        <Steps
          current={currentStep}
          direction="horizontal"
          size="small"
        >
          {EIGHT_D_DISCIPLINES.map((discipline, index) => (
            <Step
              key={discipline.number}
              title={`D${discipline.number}`}
              description={discipline.name}
              status={getStepStatus(discipline.number)}
              icon={
                getStepStatus(discipline.number) === 'finish' ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : getStepStatus(discipline.number) === 'process' ? (
                  <ClockCircleOutlined style={{ color: '#1890ff' }} />
                ) : undefined
              }
            />
          ))}
        </Steps>
      </Card>

      {/* Discipline Components */}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* D1: Team Management */}
        <D1TeamManagement
          processId={process.id}
          onComplete={() => completeDiscipline(1)}
          isCompleted={process.current_discipline > 1}
        />

        {/* D2: Problem Description */}
        {process.current_discipline >= 2 && (
          <D2ProblemDescription
            processId={process.id}
            onComplete={() => completeDiscipline(2)}
            isCompleted={process.current_discipline > 2}
          />
        )}

        {/* D3: Containment Actions */}
        {process.current_discipline >= 3 && (
          <D3ContainmentActions
            processId={process.id}
            onComplete={() => completeDiscipline(3)}
            isCompleted={process.current_discipline > 3}
          />
        )}

        {/* D4: Root Cause Analysis */}
        {process.current_discipline >= 4 && (
          <D4RootCauseAnalysis
            processId={process.id}
            incidentId={incidentId}
            assignedInvestigatorId={process.champion}
            onComplete={() => completeDiscipline(4)}
            isCompleted={process.current_discipline > 4}
          />
        )}

        {/* D5: Choose Permanent Corrective Actions */}
        {process.current_discipline >= 5 && (
          <D5CorrectiveActions
            processId={process.id}
            onComplete={() => completeDiscipline(5)}
            isCompleted={process.current_discipline > 5}
          />
        )}

        {/* D6: Implement Permanent Corrective Actions */}
        {process.current_discipline >= 6 && (
          <D6Implementation
            processId={process.id}
            onComplete={() => completeDiscipline(6)}
            isCompleted={process.current_discipline > 6}
          />
        )}

        {/* D7: Prevent Recurrence */}
        {process.current_discipline >= 7 && (
          <D7Prevention
            processId={process.id}
            onComplete={() => completeDiscipline(7)}
            isCompleted={process.current_discipline > 7}
          />
        )}

        {/* D8: Recognize the Team */}
        {process.current_discipline >= 8 && (
          <D8Recognition
            processId={process.id}
            onComplete={() => completeDiscipline(8)}
            isCompleted={process.status === 'completed' && process.overall_progress === 100}
          />
        )}
      </Space>


    </div>
  );
};

export default EightDProcess;

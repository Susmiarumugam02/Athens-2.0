import React, { useState, useEffect } from 'react';
import { Breadcrumb, Card, Row, Col, Button, Table, Tag, Progress, Space, Typography, Modal, Statistic, message } from 'antd';
import { PlusOutlined, TeamOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import EightDProcess from '../components/EightDProcess';

const { Title, Text } = Typography;

interface EightDProcessItem {
  id: string;
  eight_d_id: string;
  incident_id: string;
  incident_title: string;
  status: 'active' | 'completed' | 'on_hold';
  overall_progress: number;
  current_step: number;
  team_leader: string;
  created_date: string;
  target_completion: string;
}

const EightDPage: React.FC = () => {
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getBreadcrumbItems = () => {
    return [
      { title: 'Home' },
      { title: 'Incident Management' },
      { title: '8D Process' }
    ];
  };

  // Load 8D processes from API
  const [processes, setProcesses] = useState<EightDProcessItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to get all 8D processes
      // const data = await api.eightD.getAllProcesses();
      // setProcesses(data);
      setProcesses([]); // For now, empty array
    } catch (error) {
      message.error('Failed to load 8D processes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'active': return 'blue';
      case 'on_hold': return 'orange';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'active': return 'Active';
      case 'on_hold': return 'On Hold';
      default: return status;
    }
  };

  const columns = [
    {
      title: '8D ID',
      dataIndex: 'eight_d_id',
      key: 'eight_d_id',
      render: (text: string) => <Text strong style={{ color: '#1890ff' }}>{text}</Text>
    },
    {
      title: 'Incident',
      key: 'incident',
      render: (record: EightDProcessItem) => (
        <div>
          <Text strong>{record.incident_id}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.incident_title}
          </Text>
        </div>
      )
    },
    {
      title: 'Team Leader',
      dataIndex: 'team_leader',
      key: 'team_leader',
      render: (text: string) => (
        <Space>
          <TeamOutlined />
          <Text>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (record: EightDProcessItem) => (
        <div>
          <Progress percent={record.overall_progress} size="small" />
          <Text style={{ fontSize: '12px' }}>
            Step {record.current_step} of 8
          </Text>
        </div>
      )
    },
    {
      title: 'Timeline',
      key: 'timeline',
      render: (record: EightDProcessItem) => (
        <div>
          <Text style={{ fontSize: '12px' }}>
            Created: {record.created_date}
          </Text>
          <br />
          <Text style={{ fontSize: '12px' }}>
            Target: {record.target_completion}
          </Text>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: EightDProcessItem) => (
        <Button
          type="primary"
          size="small"
          onClick={() => setSelectedProcess(record.id)}
        >
          View Process
        </Button>
      )
    }
  ];

  // Statistics
  const totalProcesses = processes.length;
  const activeProcesses = processes.filter(p => p.status === 'active').length;
  const completedProcesses = processes.filter(p => p.status === 'completed').length;
  const avgProgress = totalProcesses > 0 ? Math.round(processes.reduce((sum, p) => sum + p.overall_progress, 0) / totalProcesses) : 0;

  if (selectedProcess) {
    return (
      <div style={{ padding: '24px' }}>
        <Breadcrumb style={{ marginBottom: '16px' }}>
          {getBreadcrumbItems().map((item, index) => (
            <BreadcrumbItem key={index}>{item.title}</BreadcrumbItem>
          ))}
          <BreadcrumbItem>Process Details</BreadcrumbItem>
        </Breadcrumb>

        <Button
          style={{ marginBottom: '16px' }}
          onClick={() => setSelectedProcess(null)}
        >
          ← Back to 8D Processes
        </Button>

        <EightDProcess incidentId={selectedProcess} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        {getBreadcrumbItems().map((item, index) => (
          <BreadcrumbItem key={index}>{item.title}</BreadcrumbItem>
        ))}
      </Breadcrumb>

      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>8D Problem Solving Process</Title>
        <Text type="secondary">
          Systematic approach to problem solving using the 8 Disciplines methodology
        </Text>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Processes"
              value={totalProcesses}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active"
              value={activeProcesses}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={completedProcesses}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Avg Progress"
              value={avgProgress}
              suffix="%"
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Actions */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>8D Processes</Title>
            <Text type="secondary">Manage your 8D problem solving processes</Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
            >
              Start New 8D Process
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 8D Processes Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={processes}
        loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} processes`
          }}
        />
      </Card>

      {/* Create Modal */}
      <Modal
        title="Start New 8D Process"
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
        width={600}
      >
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h3>Create New 8D Process</h3>
          <p>8D process creation form will be implemented here.</p>
          <p>This will include incident selection, team formation, and initial setup.</p>
          <Space>
            <Button onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="primary">Create Process</Button>
          </Space>
        </div>
      </Modal>
    </div>
  );
};

export default EightDPage;

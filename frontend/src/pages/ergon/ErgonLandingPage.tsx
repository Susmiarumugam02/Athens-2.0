import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic } from 'antd';
import { CheckSquareOutlined, CalendarOutlined, BellOutlined, FileTextOutlined, TeamOutlined, BankOutlined, ClockCircleOutlined, AlertOutlined, WalletOutlined } from '@ant-design/icons';

const ERGON_COMPONENTS = [
  { code: 'ergon_tasks', name: 'Task Management', description: 'Create and manage tasks', icon: CheckSquareOutlined, href: '/app/ergon/tasks', color: '#1890ff' },
  { code: 'ergon_planner', name: 'Daily Planner', description: 'Daily task execution with SLA tracking', icon: CalendarOutlined, href: '/app/ergon/planner', color: '#722ed1' },
  { code: 'ergon_followups', name: 'Follow-ups', description: 'Track follow-ups and reminders', icon: BellOutlined, href: '/app/ergon/followups', color: '#fa8c16' },
  { code: 'ergon_advance', name: 'Advance/Expenses', description: 'Manage advances and expenses', icon: FileTextOutlined, href: '/app/ergon/advance', color: '#52c41a' },
  { code: 'ergon_manpower', name: 'Manpower/Machinery', description: 'Resource allocation', icon: TeamOutlined, href: '/app/ergon/manpower', color: '#13c2c2' },
  { code: 'ergon_ledger', name: 'Financial Ledger', description: 'Financial tracking', icon: BankOutlined, href: '/app/ergon/ledger', color: '#eb2f96' },
];

const mockData = {
  kpis: {
    totalTasks: 245,
    activeTasks: 89,
    completedTasks: 156,
    overdueTask: 12,
    totalExpenses: 485000,
    pendingApprovals: 8,
    resourceUtilization: 78,
    budgetUtilization: 65
  }
};

export default function ErgonLandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ margin: 0, color: '#8c8c8c' }}>Operations & Finance Management - Real-time tracking and analytics</p>
      </div>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Tasks"
              value={mockData.kpis.totalTasks}
              prefix={<CheckSquareOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Tasks"
              value={mockData.kpis.activeTasks}
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={mockData.kpis.completedTasks}
              prefix={<CheckSquareOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Overdue"
              value={mockData.kpis.overdueTask}
              prefix={<AlertOutlined />}
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Expenses"
              value={`₹${(mockData.kpis.totalExpenses / 1000).toFixed(0)}K`}
              prefix={<WalletOutlined />}
              styles={{ content: { color: '#722ed1' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending Approvals"
              value={mockData.kpis.pendingApprovals}
              prefix={<BellOutlined />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Resource Util."
              value={`${mockData.kpis.resourceUtilization}%`}
              prefix={<TeamOutlined />}
              styles={{ content: { color: '#13c2c2' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Budget Util."
              value={`${mockData.kpis.budgetUtilization}%`}
              prefix={<BankOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* ERGON Modules */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>ERGON Modules</h2>
        <Row gutter={16}>
          {ERGON_COMPONENTS.map((component) => {
            const Icon = component.icon;
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={component.code}>
                <Card
                  hoverable
                  onClick={() => navigate(component.href)}
                  style={{ marginBottom: '16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '8px', 
                      background: component.color, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginRight: '12px'
                    }}>
                      <Icon style={{ fontSize: '24px', color: '#fff' }} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{component.name}</h3>
                  </div>
                  <p style={{ margin: 0, color: '#8c8c8c', fontSize: '14px' }}>{component.description}</p>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic } from 'antd';
import { TeamOutlined, CalendarOutlined, FileTextOutlined, BankOutlined, WalletOutlined, CheckCircleOutlined, RiseOutlined } from '@ant-design/icons';

const WORKFORCE_COMPONENTS = [
  { code: 'workforce_profile', name: 'Profile Management', description: 'Employee profiles and information', icon: TeamOutlined, href: '/app/workforce/profiles', color: '#1890ff' },
  { code: 'workforce_attendance', name: 'Attendance', description: 'Track employee attendance', icon: CalendarOutlined, href: '/app/workforce/attendance', color: '#52c41a' },
  { code: 'workforce_leave', name: 'Leave Management', description: 'Leave requests and approvals', icon: FileTextOutlined, href: '/app/workforce/leave', color: '#722ed1' },
  { code: 'workforce_employee', name: 'Employee Management', description: 'Comprehensive employee data', icon: BankOutlined, href: '/app/workforce/employees', color: '#13c2c2' },
  { code: 'workforce_payroll', name: 'Payroll & Wages', description: 'Salary and wage processing', icon: WalletOutlined, href: '/app/workforce/payroll', color: '#eb2f96' },
];

const mockMetrics = {
  totalEmployees: 156,
  activeEmployees: 142,
  onLeave: 8,
  pendingLeaves: 12,
  presentToday: 138,
  avgAttendance: 92,
  monthlyPayroll: 4850000,
  departments: 8
};

export default function WorkforceLandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ margin: 0, color: '#8c8c8c' }}>HR, Attendance & Leave Management - Real-time tracking and analytics</p>
      </div>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Employees"
              value={mockMetrics.totalEmployees}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active"
              value={mockMetrics.activeEmployees}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="On Leave"
              value={mockMetrics.onLeave}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending Leaves"
              value={mockMetrics.pendingLeaves}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#ff7a45' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Present Today"
              value={mockMetrics.presentToday}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Avg Attendance"
              value={`${mockMetrics.avgAttendance}%`}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Monthly Payroll"
              value={`₹${(mockMetrics.monthlyPayroll / 100000).toFixed(1)}L`}
              prefix={<WalletOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Departments"
              value={mockMetrics.departments}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Workforce Modules */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Workforce Modules</h2>
        <Row gutter={16}>
          {WORKFORCE_COMPONENTS.map((component) => {
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

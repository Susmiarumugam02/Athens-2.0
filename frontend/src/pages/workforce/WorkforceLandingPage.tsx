import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import { TeamOutlined, CalendarOutlined, FileTextOutlined, BankOutlined, WalletOutlined, CheckCircleOutlined, RiseOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../lib/api';

const ALL_WORKFORCE_COMPONENTS = [
  { code: 'workforce_profile', name: 'Profile Management', description: 'Employee profiles and information', icon: TeamOutlined, href: '/app/workforce/profiles', color: '#1890ff', adminOnly: true },
  { code: 'workforce_attendance', name: 'Attendance', description: 'Track employee attendance', icon: CalendarOutlined, href: '/app/workforce/attendance', color: '#52c41a', adminOnly: false },
  { code: 'workforce_leave', name: 'Leave Management', description: 'Leave requests and approvals', icon: FileTextOutlined, href: '/app/workforce/leave', color: '#722ed1', adminOnly: false },
  { code: 'workforce_employee', name: 'Employee Management', description: 'Comprehensive employee data', icon: BankOutlined, href: '/app/workforce/employees', color: '#13c2c2', adminOnly: true },
  { code: 'workforce_payroll', name: 'Payroll & Wages', description: 'Salary and wage processing', icon: WalletOutlined, href: '/app/workforce/payroll', color: '#eb2f96', adminOnly: true },
];

interface WorkforceStats {
  total_employees: number
  active_employees: number
  on_leave: number
  pending_leaves: number
  present_today: number
  avg_attendance: number
  monthly_payroll: number
  departments: number
}

const EMPTY_STATS: WorkforceStats = {
  total_employees: 0, active_employees: 0, on_leave: 0, pending_leaves: 0,
  present_today: 0, avg_attendance: 0, monthly_payroll: 0, departments: 0,
}

export default function WorkforceLandingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isUser = (user as any)?.role_type === 'user';
  const WORKFORCE_COMPONENTS = isUser
    ? ALL_WORKFORCE_COMPONENTS.filter(c => !c.adminOnly)
    : ALL_WORKFORCE_COMPONENTS;

  const [stats, setStats] = useState<WorkforceStats>(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatsLoading(true);
      try {
        const res = await apiClient.get('/api/workforce/stats/');
        if (!cancelled) setStats(res.data);
      } catch {
        // silently fall back to zeros — no toast spam on dashboard
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const fmtPayroll = (n: number) => {
    if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ margin: 0, color: '#8c8c8c' }}>HR, Attendance & Leave Management - Real-time tracking and analytics</p>
      </div>

      {/* KPI Cards */}
      <Spin spinning={statsLoading}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic title="Total Employees" value={stats.total_employees}
                prefix={<TeamOutlined />} styles={{ content: { color: '#1890ff' } }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic title="Active" value={stats.active_employees}
                prefix={<CheckCircleOutlined />} styles={{ content: { color: '#52c41a' } }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic title="On Leave" value={stats.on_leave}
                prefix={<CalendarOutlined />} styles={{ content: { color: '#faad14' } }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic title="Pending Leaves" value={stats.pending_leaves}
                prefix={<FileTextOutlined />} styles={{ content: { color: '#ff7a45' } }} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic title="Present Today" value={stats.present_today}
                prefix={<CheckCircleOutlined />} styles={{ content: { color: '#52c41a' } }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic title="Avg Attendance" value={`${stats.avg_attendance}%`}
                prefix={<RiseOutlined />} styles={{ content: { color: '#1890ff' } }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic title="Monthly Payroll" value={fmtPayroll(stats.monthly_payroll)}
                prefix={<WalletOutlined />} styles={{ content: { color: '#52c41a' } }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic title="Departments" value={stats.departments}
                prefix={<BankOutlined />} styles={{ content: { color: '#722ed1' } }} />
            </Card>
          </Col>
        </Row>
      </Spin>

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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Tag, Col, App } from 'antd';
import { PlusOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { safetyObservationApi } from './api';
import tokenManager from '../../lib/tokenManager';
import { ModuleTableContainer, ModulePageLayout, ModuleFilterBar } from '@/components/shared';
import dayjs from 'dayjs';

const { Option } = Select;

interface SafetyObservationListProps {
  onView?: (observation: any) => void;
  onEdit?: (observation: any) => void;
}

const SafetyObservationList: React.FC<SafetyObservationListProps> = ({ onView, onEdit }) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');
  
  useEffect(() => {
    loadObservations();
  }, [slaFilter]);
  
  const loadObservations = async () => {
    try {
      const params = new URLSearchParams();
      if (slaFilter === 'overdue') params.append('overdue', 'true');
      if (slaFilter === 'due_soon') params.append('due_soon', 'true');
      
      const response = await safetyObservationApi.getAll();
      setObservations(response.data);
    } catch (error: any) {
      message.error('Failed to load observations');
    } finally {
      setLoading(false);
    }
  };
  
  const handleExport = () => {
    try {
      const params = new URLSearchParams();
      if (slaFilter === 'overdue') params.append('overdue', 'true');
      if (slaFilter === 'due_soon') params.append('due_soon', 'true');
      
      const token = tokenManager.getAccessToken();
      if (!token) {
        message.error('Session expired. Please login again.');
        return;
      }
      const exportUrl = `/api/safety-observation/export/?${params.toString()}`;
      
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8004'}${exportUrl}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `safety_observations_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('Export started');
      })
      .catch(() => message.error('Export failed'));
    } catch (error) {
      message.error('Export failed');
    }
  };
  
  const filtered = observations.filter(obs => {
    const matchSearch = search === '' || 
      obs.workLocation?.toLowerCase().includes(search.toLowerCase()) ||
      obs.typeOfObservation?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || obs.observationStatus === statusFilter;
    const matchSeverity = severityFilter === 'all' || obs.severity === severityFilter;
    return matchSearch && matchStatus && matchSeverity;
  });
  
  const columns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Location',
      dataIndex: 'workLocation',
      key: 'workLocation',
    },
    {
      title: 'Type',
      dataIndex: 'typeOfObservation',
      key: 'typeOfObservation',
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => {
        const colors: any = {
          low: 'blue',
          medium: 'gold',
          high: 'orange',
          critical: 'red'
        };
        return <Tag color={colors[severity] || 'default'}>{severity ? String(severity).toUpperCase() : 'N/A'}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'observationStatus',
      key: 'observationStatus',
      render: (status: string) => <Tag>{status ? String(status) : 'N/A'}</Tag>,
    },
    {
      title: 'SLA',
      key: 'sla',
      render: (_: any, record: any) => {
        if (record.is_overdue) {
          return <Tag color="red">Overdue {Math.abs(record.days_until_due)}d</Tag>;
        }
        if (record.is_due_soon) {
          return <Tag color="gold">Due in {record.days_until_due}d</Tag>;
        }
        if (record.target_close_date) {
          return <span>{record.days_until_due}d left</span>;
        }
        return <span>-</span>;
      },
    },
    {
      title: 'Assigned To',
      dataIndex: 'correctiveActionAssignedTo',
      key: 'correctiveActionAssignedTo',
      render: (text: string) => text || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="link"
            size="small"
            onClick={() => onView?.(record)}
          >
            View
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => onEdit?.(record)}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];
  
  return (
    <ModulePageLayout
      breadcrumbs={[
        { title: 'Home' },
        { title: 'Safety Observations' },
      ]}
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/app/safety-observation/new')}
          >
            New Observation
          </Button>
        </div>
      }
    >
      <ModuleFilterBar>
        <Col xs={24} sm={8} md={6}>
          <Input
            placeholder="Search location or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: '100%' }}
          />
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Select
            placeholder="All Status"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            style={{ width: '100%' }}
          >
            <Option value="all">All Status</Option>
            <Option value="draft">Draft</Option>
            <Option value="submitted">Submitted</Option>
            <Option value="closed">Closed</Option>
          </Select>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Select
            placeholder="All Severity"
            value={severityFilter}
            onChange={(value) => setSeverityFilter(value)}
            style={{ width: '100%' }}
          >
            <Option value="all">All Severity</Option>
            <Option value="low">Low</Option>
            <Option value="medium">Medium</Option>
            <Option value="high">High</Option>
            <Option value="critical">Critical</Option>
          </Select>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Select
            placeholder="All SLA"
            value={slaFilter}
            onChange={(value) => setSlaFilter(value)}
            style={{ width: '100%' }}
          >
            <Option value="all">All SLA</Option>
            <Option value="overdue">Overdue</Option>
            <Option value="due_soon">Due Soon (≤7d)</Option>
          </Select>
        </Col>
      </ModuleFilterBar>
      
      <ModuleTableContainer
        columns={columns}
        dataSource={filtered}
        rowKey="observationID"
        loading={loading}
        highlightRowCondition={(record) => record.is_overdue || record.is_due_soon}
      />
    </ModulePageLayout>
  );
};

export default SafetyObservationList;

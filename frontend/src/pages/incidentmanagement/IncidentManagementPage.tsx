import React, { useState } from 'react';
import { Tabs, Button, Space } from 'antd';
import { PlusOutlined, DashboardOutlined, UnorderedListOutlined } from '@ant-design/icons';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import IncidentList from './components/IncidentList';
import IncidentForm from './components/IncidentForm';
import { IncidentListItem } from './types';

const IncidentManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingIncident, setEditingIncident] = useState<IncidentListItem | null>(null);

  const handleCreateIncident = () => {
    setEditingIncident(null);
    setActiveTab('form');
  };

  const handleEditIncident = (incident: IncidentListItem) => {
    setEditingIncident(incident);
    setActiveTab('form');
  };

  const handleViewIncident = (incident: IncidentListItem) => {
    setEditingIncident(incident);
    setActiveTab('form');
  };

  const handleFormSuccess = () => {
    setEditingIncident(null);
    setActiveTab('list');
  };

  const handleFormCancel = () => {
    setEditingIncident(null);
    setActiveTab('list');
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Incident Management</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateIncident}>
          Create Incident
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'dashboard',
            label: (
              <span>
                <DashboardOutlined />
                Dashboard
              </span>
            ),
            children: <AnalyticsDashboard />
          },
          {
            key: 'list',
            label: (
              <span>
                <UnorderedListOutlined />
                All Incidents
              </span>
            ),
            children: (
              <IncidentList
                onCreateIncident={handleCreateIncident}
                onViewIncident={handleViewIncident}
                onEditIncident={handleEditIncident}
              />
            )
          },
          {
            key: 'form',
            label: editingIncident ? 'Edit Incident' : 'Create Incident',
            children: (
              <IncidentForm
                incident={editingIncident}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            ),
            style: { display: activeTab === 'form' ? 'block' : 'none' }
          }
        ]}
      />
    </div>
  );
};

export default IncidentManagementPage;

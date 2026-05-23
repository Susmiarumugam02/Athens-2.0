import React, { useState, useCallback } from 'react';
import { Tabs, Button, Modal, App } from 'antd';
import { PlusOutlined, DashboardOutlined, UnorderedListOutlined } from '@ant-design/icons';
import SafetyObservationLanding from './SafetyObservationLanding';
import SafetyObservationList from './SafetyObservationList';
import SafetyObservationForm from './components/SafetyObservationForm';

const SafetyObservationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingObservation, setViewingObservation] = useState<any>(null);

  const handleCreate = useCallback(() => {
    setEditingId(null);
    setActiveTab('form');
  }, []);

  const handleEdit = useCallback((observation: any) => {
    setEditingId(observation.observationID);
    setActiveTab('form');
  }, []);

  const handleView = useCallback((observation: any) => {
    setViewingObservation(observation);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setEditingId(null);
    setActiveTab('list');
  }, []);

  const handleFormCancel = useCallback(() => {
    setEditingId(null);
    setActiveTab('list');
  }, []);

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Safety Observations</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          New Observation
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
            children: <SafetyObservationLanding />
          },
          {
            key: 'list',
            label: (
              <span>
                <UnorderedListOutlined />
                All Observations
              </span>
            ),
            children: <SafetyObservationList onView={handleView} onEdit={handleEdit} />
          },
          {
            key: 'form',
            label: editingId ? 'Edit Observation' : 'Create Observation',
            children: (
              <App>
                <SafetyObservationForm
                  observationID={editingId ? String(editingId) : undefined}
                  isEditMode={!!editingId}
                  onSuccess={handleFormSuccess}
                />
              </App>
            )
          }
        ]}
      />

      <Modal
        title={`Observation: ${viewingObservation?.workLocation}`}
        open={!!viewingObservation}
        onCancel={() => setViewingObservation(null)}
        footer={[
          <Button key="close" onClick={() => setViewingObservation(null)}>Close</Button>,
          <Button key="edit" type="primary" onClick={() => {
            if (viewingObservation) {
              handleEdit(viewingObservation);
              setViewingObservation(null);
            }
          }}>Edit</Button>
        ]}
        width={800}
      >
        {viewingObservation && (
          <div>
            <p><strong>Type:</strong> {viewingObservation.typeOfObservation}</p>
            <p><strong>Severity:</strong> {viewingObservation.severity}</p>
            <p><strong>Status:</strong> {viewingObservation.observationStatus}</p>
            <p><strong>Location:</strong> {viewingObservation.workLocation}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SafetyObservationPage;

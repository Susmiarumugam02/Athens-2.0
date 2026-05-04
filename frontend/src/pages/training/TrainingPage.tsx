import React, { useState, useCallback } from 'react';
import { Tabs, Button, Modal } from 'antd';
import { PlusOutlined, DashboardOutlined, UnorderedListOutlined } from '@ant-design/icons';
import TrainingLanding from './TrainingLanding';
import TrainingList from './components/TrainingList';
import TrainingForm from './components/TrainingForm';

const TrainingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingTraining, setViewingTraining] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreate = useCallback(() => {
    setEditingId(null);
    setActiveTab('form');
  }, []);

  const handleEdit = useCallback((training: any) => {
    setEditingId(training.id);
    setActiveTab('form');
  }, []);

  const handleView = useCallback((training: any) => {
    setViewingTraining(training);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setEditingId(null);
    setActiveTab('list');
    // Increment refreshKey to trigger TrainingList to refetch
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleFormCancel = useCallback(() => {
    setEditingId(null);
    setActiveTab('list');
  }, []);

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Training Management</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          New Training
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
            children: <TrainingLanding />
          },
          {
            key: 'list',
            label: (
              <span>
                <UnorderedListOutlined />
                All Trainings
              </span>
            ),
            children: <TrainingList onView={handleView} onEdit={handleEdit} refreshKey={refreshKey} />
          },
          {
            key: 'form',
            label: editingId ? 'Edit Training' : 'Create Training',
            children: (
              <TrainingForm
                trainingId={editingId}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            )
          }
        ]}
      />

      <Modal
        title={`Training: ${viewingTraining?.title}`}
        open={!!viewingTraining}
        onCancel={() => setViewingTraining(null)}
        footer={[
          <Button key="close" onClick={() => setViewingTraining(null)}>Close</Button>,
          <Button key="edit" type="primary" onClick={() => {
            if (viewingTraining) {
              handleEdit(viewingTraining);
              setViewingTraining(null);
            }
          }}>Edit</Button>
        ]}
        width={800}
      >
        {viewingTraining && (
          <div>
            <p><strong>Type:</strong> {viewingTraining.training_type}</p>
            <p><strong>Date:</strong> {viewingTraining.training_date}</p>
            <p><strong>Trainer:</strong> {viewingTraining.trainer}</p>
            <p><strong>Location:</strong> {viewingTraining.location}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TrainingPage;

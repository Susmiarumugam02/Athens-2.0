import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Tabs, Button, Modal } from 'antd';
import { PlusOutlined, DashboardOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import TrainingLanding from './TrainingLanding';
import TrainingList from './components/TrainingList';
import TrainingForm from './components/TrainingForm';
import { getTrainingTypeMeta } from './trainingTypes';
import { useAuthStore } from '../../store/authStore';
import UserTrainingDashboard from './UserTrainingDashboard';

const TrainingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTraining, setEditingTraining] = useState<any>(null);
  const [viewingTraining, setViewingTraining] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const basePath = useMemo(
    () => (location.pathname.startsWith('/master-admin/training') ? '/master-admin/training' : '/app/training'),
    [location.pathname],
  );
  const canManageTraining = (user as any)?.role_type !== 'user';

  useEffect(() => {
    if (!canManageTraining && location.pathname.endsWith('/create')) {
      navigate(basePath, { replace: true });
      setActiveTab('dashboard');
      return;
    }
    if (location.pathname.endsWith('/create')) {
      setActiveTab('form');
      return;
    }
    if (location.pathname.endsWith('/all')) {
      setActiveTab('list');
      return;
    }
    setActiveTab('dashboard');
  }, [basePath, canManageTraining, location.pathname, navigate]);

  const handleCreate = useCallback(() => {
    if (!canManageTraining) {
      navigate(basePath);
      return;
    }
    setEditingId(null);
    setEditingTraining(null);
    setActiveTab('form');
    navigate(`${basePath}/create`);
  }, [basePath, canManageTraining, navigate]);

  const handleEdit = useCallback((training: any) => {
    if (!canManageTraining) return;
    setEditingId(training.id);
    setEditingTraining(training);
    setActiveTab('form');
    navigate(`${basePath}/create`);
  }, [basePath, canManageTraining, navigate]);

  const handleView = useCallback((training: any) => {
    setViewingTraining(training);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setEditingId(null);
    setEditingTraining(null);
    setActiveTab('list');
    navigate(`${basePath}/all`);
    // Increment refreshKey to trigger TrainingList to refetch
    setRefreshKey(prev => prev + 1);
  }, [basePath, navigate]);

  const handleFormCancel = useCallback(() => {
    setEditingId(null);
    setEditingTraining(null);
    setActiveTab('list');
    navigate(`${basePath}/all`);
  }, [basePath, navigate]);

  const handleTabChange = useCallback((key: string) => {
    if (key === 'form' && !canManageTraining) {
      navigate(basePath);
      return;
    }
    setActiveTab(key);
    if (key === 'form') {
      setEditingId(null);
      setEditingTraining(null);
      navigate(`${basePath}/create`);
      return;
    }
    if (key === 'list') {
      navigate(`${basePath}/all`);
      return;
    }
    navigate(basePath);
  }, [basePath, canManageTraining, navigate]);

  const tabItems = [
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
      children: <TrainingList onView={handleView} onEdit={handleEdit} refreshKey={refreshKey} readOnly={!canManageTraining} />
    },
    ...(canManageTraining ? [{
      key: 'form',
      label: editingId ? 'Edit Training' : 'Create Training',
      children: (
        <TrainingForm
          trainingId={editingId}
          initialTraining={editingTraining}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )
    }] : [])
  ];

  if (!canManageTraining) {
    return <UserTrainingDashboard />;
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Training Management</h1>
        {canManageTraining && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New Training
          </Button>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
      />

      <Modal
        title={`Training: ${viewingTraining?.title}`}
        open={!!viewingTraining}
        onCancel={() => setViewingTraining(null)}
        footer={[
          <Button key="close" onClick={() => setViewingTraining(null)}>Close</Button>,
          canManageTraining && <Button key="edit" type="primary" onClick={() => {
            if (viewingTraining) {
              handleEdit(viewingTraining);
              setViewingTraining(null);
            }
          }}>Edit</Button>
        ].filter(Boolean)}
        width={800}
      >
        {viewingTraining && (
          <div>
            <p><strong>Type:</strong> {getTrainingTypeMeta(viewingTraining.training_type).label}</p>
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

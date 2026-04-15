import React, { useState, useCallback } from 'react';
import { Tabs, Button, Modal } from 'antd';
import { PlusOutlined, DashboardOutlined, UnorderedListOutlined } from '@ant-design/icons';
import TBTLanding from './TBTLanding';
import TBTList from './components/TBTList';
import TBTForm from './components/TBTForm';

const TBTPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingTBT, setViewingTBT] = useState<any>(null);

  const handleCreate = useCallback(() => {
    setEditingId(null);
    setActiveTab('form');
  }, []);

  const handleEdit = useCallback((tbt: any) => {
    setEditingId(tbt.id);
    setActiveTab('form');
  }, []);

  const handleView = useCallback((tbt: any) => {
    setViewingTBT(tbt);
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
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Toolbox Talk (TBT)</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          New TBT
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
            children: <TBTLanding />
          },
          {
            key: 'list',
            label: (
              <span>
                <UnorderedListOutlined />
                All TBTs
              </span>
            ),
            children: <TBTList onView={handleView} onEdit={handleEdit} />
          },
          {
            key: 'form',
            label: editingId ? 'Edit TBT' : 'Create TBT',
            children: (
              <TBTForm
                tbtId={editingId}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            )
          }
        ]}
      />

      <Modal
        title={`TBT: ${viewingTBT?.topic}`}
        open={!!viewingTBT}
        onCancel={() => setViewingTBT(null)}
        footer={[
          <Button key="close" onClick={() => setViewingTBT(null)}>Close</Button>,
          <Button key="edit" type="primary" onClick={() => {
            if (viewingTBT) {
              handleEdit(viewingTBT);
              setViewingTBT(null);
            }
          }}>Edit</Button>
        ]}
        width={800}
      >
        {viewingTBT && (
          <div>
            <p><strong>Topic:</strong> {viewingTBT.topic}</p>
            <p><strong>Date:</strong> {viewingTBT.date}</p>
            <p><strong>Conductor:</strong> {viewingTBT.conductor}</p>
            <p><strong>Attendees:</strong> {viewingTBT.attendees}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TBTPage;

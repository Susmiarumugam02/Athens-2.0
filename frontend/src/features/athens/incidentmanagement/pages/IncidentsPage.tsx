import React, { useState, useEffect } from 'react';
import { Breadcrumb, Modal, message, Button, Space, Badge } from 'antd';
import { PlusOutlined, UserOutlined, UnorderedListOutlined } from '@ant-design/icons';
import IncidentList from '../components/IncidentList';
import IncidentForm from '../components/IncidentForm';
import IncidentDetail from '../components/IncidentDetail';

import { IncidentListItem, IncidentFormData } from '../types';
import { useIncidents } from '../hooks/useIncidents';
import { incidentApi } from '../services/api';
import useAuthStore from '../../../common/store/authStore';

interface ModalState {
  type: 'create-incident' | 'edit-incident' | 'view-incident' | null;
  data?: any;
}

const IncidentsPage: React.FC = () => {
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [showMyAssignments, setShowMyAssignments] = useState<boolean>(false);

  // Get current user information
  const { username, userId } = useAuthStore();

  // Add useIncidents hook to get createIncident and refetch functions
  const { createIncident, refetch } = useIncidents({ autoFetch: false });

  // Debug modal state changes
  useEffect(() => {
  }, [modal]);

  // Debug current user and filter state
  useEffect(() => {
  }, [username, userId, showMyAssignments]);

  // Toggle My Assignments filter
  const handleToggleMyAssignments = () => {
    setShowMyAssignments(!showMyAssignments);
  };

  // Get assignment count for badge (we'll get this from IncidentList via callback)
  const [myAssignmentCount, setMyAssignmentCount] = useState<number>(0);

  const handleCreateIncident = () => {
    setModal({ type: 'create-incident' });
  };

  const handleEditIncident = (incident: IncidentListItem) => {
    setModal({ type: 'edit-incident', data: incident });
  };

  const handleViewIncident = (incident: IncidentListItem) => {
    setModal({ type: 'view-incident', data: incident });
  };

  const handleCloseModal = () => {
    setModal({ type: null });
  };



  const handleIncidentSubmit = async (data: IncidentFormData) => {
    try {

      // Actually create the incident using the API
      await createIncident(data);

      message.success('Incident submitted successfully');
      handleCloseModal();

      // Trigger refresh of IncidentList component
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      message.error('Failed to submit incident');
    }
  };

  const getBreadcrumbItems = () => {
    return [
      { title: 'Home' },
      { title: 'Incident Management' },
      { title: 'Incidents' }
    ];
  };

  const getModalTitle = () => {
    switch (modal.type) {
      case 'create-incident':
        return 'Create New Incident';
      case 'edit-incident':
        return 'Edit Incident';
      case 'view-incident':
        return 'Incident Details';

      default:
        return '';
    }
  };

  const getModalWidth = () => {
    switch (modal.type) {
      case 'view-incident':
        return 1200;
      case 'create-incident':
      case 'edit-incident':
        return 1000;
      default:
        return 800;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }} items={getBreadcrumbItems()} />

      {/* Filter Controls */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button
            type={showMyAssignments ? 'primary' : 'default'}
            icon={<UserOutlined />}
            onClick={handleToggleMyAssignments}
          >
            <Badge
              count={myAssignmentCount}
              size="small"
              offset={[10, 0]}
              className="assignment-count-badge"
            >
              My Assignments
            </Badge>
          </Button>
          <Button
            type={!showMyAssignments ? 'primary' : 'default'}
            icon={<UnorderedListOutlined />}
            onClick={handleToggleMyAssignments}
          >
            All Incidents
          </Button>
        </Space>
      </div>

      <IncidentList
        onCreateIncident={handleCreateIncident}
        onEditIncident={handleEditIncident}
        onViewIncident={handleViewIncident}

        refreshTrigger={refreshTrigger}
        showMyAssignments={showMyAssignments}
        currentUserId={userId}
        currentUsername={username}
        onAssignmentCountChange={setMyAssignmentCount}
      />

      {/* Modals */}
      <Modal
        title={getModalTitle()}
        open={modal.type !== null}
        onCancel={handleCloseModal}
        footer={null}
        width={getModalWidth()}
        destroyOnHidden
      >
        {modal.type === 'create-incident' && (
          <IncidentForm
            mode="create"
            onSubmit={handleIncidentSubmit}
            onCancel={handleCloseModal}
          />
        )}
        {modal.type === 'edit-incident' && modal.data && (
          <IncidentForm
            mode="edit"
            initialData={modal.data}
            onSubmit={handleIncidentSubmit}
            onCancel={handleCloseModal}
          />
        )}
        {modal.type === 'view-incident' && modal.data && (
          <IncidentDetail
            incidentId={modal.data.id}
            onEdit={() => {
              setModal({ type: 'edit-incident', data: modal.data });
            }}

            onClose={handleCloseModal}
          />
        )}
      </Modal>


    </div>
  );
};

export default IncidentsPage;

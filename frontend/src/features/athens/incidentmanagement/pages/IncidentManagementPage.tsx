import React, { useState } from 'react';
import { Layout, Breadcrumb, Modal, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import IncidentDashboard from '../components/IncidentDashboard';
import IncidentForm from '../components/IncidentForm';
import IncidentDetail from '../components/IncidentDetail';
import { IncidentListItem, IncidentFormData } from '../types';
import { useNavigate } from 'react-router-dom';

const { Content } = Layout;

interface ModalState {
  type: 'create-incident' | 'edit-incident' | 'view-incident' | null;
  data?: any;
}

const IncidentManagementPage: React.FC = () => {
  const [modal, setModal] = useState<ModalState>({ type: null });
  const navigate = useNavigate();

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
      // The form component handles the API call
      message.success('Incident submitted successfully');
      handleCloseModal();
    } catch (error) {
      message.error('Failed to submit incident');
    }
  };

  const getBreadcrumbItems = () => {
    return [
      { title: 'Home' },
      { title: 'Incident Management' },
      { title: 'Dashboard' }
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

      <IncidentDashboard
        onViewIncidents={() => navigate('/dashboard/incidentmanagement/incidents')}
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

export default IncidentManagementPage;

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Button, Space, Modal, App, Tag, Tooltip, Typography, Tabs } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, TeamOutlined, StopOutlined, UserOutlined, QrcodeOutlined, DeleteOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import api from '@common/utils/axiosetup';
import useAuthStore from '@common/store/authStore';
import { usePermissionControl } from '../../../hooks/usePermissionControl';
import PermissionRequestModal from '../../../components/permissions/PermissionRequestModal';
import type { InductionTrainingData } from '../types';
import { InductionTrainingView, InductionTrainingEdit, InductionTrainingCreation, InductionTrainingAttendance, InductionTrainedPersonnelList } from '..';
import PageLayout from '@common/components/PageLayout';
import TrainingPrintPreview from '../../training/components/TrainingPrintPreview';
import TrainingCheckInModal from '../../training/components/TrainingCheckInModal';

const { Title, Text } = Typography;

// --- Styled Components for a Themed UI ---

const PageContainer = styled.div`
  width: 100%;
`;

const ListCard = styled.div`
  background-color: var(--color-ui-base);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-md);
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const PermissionDeniedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 200px);
  background-color: var(--color-ui-base);
  border-radius: var(--border-radius-lg);
  text-align: center;
  padding: 40px;
`;

// --- Component Definition ---
const InductionTrainingList: React.FC = () => {
  const { message, modal } = App.useApp();
  // --- State and Hooks ---
  const [inductionTrainings, setInductionTrainings] = useState<InductionTrainingData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewingIT, setViewingIT] = useState<InductionTrainingData | null>(null);
  const [editingIT, setEditingIT] = useState<InductionTrainingData | null>(null);
  const [addingIT, setAddingIT] = useState<boolean>(false);
  const [conductingIT, setConductingIT] = useState<InductionTrainingData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('trainings');
  const [checkInIT, setCheckInIT] = useState<InductionTrainingData | null>(null);
  
  const { usertype, userId, django_user_type, department } = useAuthStore();
  const hasPermission = ['clientuser', 'epcuser', 'contractoruser'].includes(usertype || '');
  // Only EPC Safety Department users can access induction training
  const isEpcSafetyUser = usertype === 'epcuser' && department && department.toLowerCase().includes('safety');
  
  // Helper function to check if user can edit/delete
  const canModifyRecord = useCallback((record: InductionTrainingData) => {
    console.log('Induction canModifyRecord check:', {
      django_user_type,
      userId,
      record_created_by: record.created_by,
      record_status: record.status,
      isProjectAdmin: django_user_type === 'projectadmin',
      isCreator: record.created_by === userId,
      result: django_user_type === 'projectadmin' || (record.created_by != null && userId != null && record.created_by === userId)
    });
    
    // Project admin can always modify
    if (django_user_type === 'projectadmin') {
      return true;
    }
    // Creator can modify their own records (ensure both values exist and match)
    return record.created_by != null && userId != null && record.created_by === userId;
  }, [django_user_type, userId]);
  
  // Debug logging
  console.log('Auth Store Values:', { usertype, department, isEpcSafetyUser });
  
  // Permission control
  const { executeWithPermission, showPermissionModal, permissionRequest, closePermissionModal, onPermissionRequestSuccess } = usePermissionControl({
    onPermissionGranted: () => fetchInductionTrainings()
  });

  // --- Auto-Navigation Logic ---
  const handlePaginationChange = useCallback((page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  }, []);


  // --- Data Fetching and Handlers (Memoized) ---
  const fetchInductionTrainings = useCallback(async (navigateToNewItem = false) => {
    setLoading(true);
    try {
      const endpoint = hasPermission && isEpcSafetyUser ? `/induction/manage/?created_by=${userId}` : '/induction/manage/';
      const response = await api.get(endpoint);
      console.log('Induction Training API Response:', response.data);
      
      // Handle both paginated and non-paginated responses
      let newData = [];
      if (Array.isArray(response.data)) {
        newData = response.data.map((it: any) => ({ ...it, key: String(it.id) }));
      } else if (Array.isArray(response.data.results)) {
        newData = response.data.results.map((it: any) => ({ ...it, key: String(it.id) }));
      }

      // If navigateToNewItem is true, move to the page containing the newest item
      if (navigateToNewItem && newData.length > inductionTrainings.length) {
        const newItemPage = Math.ceil(newData.length / pageSize);
        setCurrentPage(newItemPage);
        message.success(`New induction training added and moved to page ${newItemPage}.`);
      }

      setInductionTrainings(newData);
    } catch (error) {
      message.error('Failed to fetch induction trainings');
    } finally {
      setLoading(false);
    }
  }, [hasPermission, isEpcSafetyUser, userId, message, inductionTrainings.length, pageSize]);

  useEffect(() => {
    if (hasPermission && isEpcSafetyUser) {
      fetchInductionTrainings();
    }
  }, [fetchInductionTrainings, hasPermission, isEpcSafetyUser]);
  
  const handleCancelModals = useCallback(() => {
    setViewingIT(null);
    setEditingIT(null);
    setAddingIT(false);
    setConductingIT(null);
    setCheckInIT(null);
  }, []);

  const handleActualDelete = useCallback(async (id: number, title: string) => {
    try {
      if (django_user_type === 'adminuser') {
        // Check if user has active permission
        try {
          const response = await api.get('/api/v1/permissions/check/', {
            params: {
              permission_type: 'delete',
              object_id: id,
              app_label: 'inductiontraining',
              model: 'inductiontraining'
            }
          });
          
          if (response.data.has_permission) {
            // User has permission, delete directly
            await api.delete(`/induction/manage/${id}/`);
          } else {
            // No permission, use permission flow
            await executeWithPermission(
              () => api.delete(`/induction/manage/${id}/`),
              'delete induction training'
            );
          }
        } catch (permError) {
          // Fallback to permission flow
          await executeWithPermission(
            () => api.delete(`/induction/manage/${id}/`),
            'delete induction training'
          );
        }
      } else {
        await api.delete(`/induction/manage/${id}/`);
      }

      // Update the state to remove the deleted item
      setInductionTrainings(prev => {
        const filtered = prev.filter(it => it.id !== id);
        const newDataLength = filtered.length;
        const maxPage = Math.ceil(newDataLength / pageSize) || 1;
        if (currentPage > maxPage && maxPage > 0) {
          setCurrentPage(maxPage);
        }
        return filtered;
      });

      message.success('Training deleted successfully');
      await fetchInductionTrainings();
    } catch (error: any) {
      if (error) {
        const errorMessage = error.response?.data?.detail ||
                            error.response?.data?.error ||
                            error.message ||
                            'Failed to delete training';
        message.error(errorMessage);
      }
    }
  }, [inductionTrainings.length, pageSize, currentPage, message, fetchInductionTrainings, django_user_type, executeWithPermission]);

  const handleDelete = useCallback((id: number, title: string) => {
    modal.confirm({
      title: 'Delete Induction Training?',
      content: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      maskClosable: false,
      onOk() {
        return handleActualDelete(id, title);
      }
    });
  }, [handleActualDelete, modal]);

  const handleSaveNewIT = useCallback(async (newIT: any) => {
    try {
      const response = await api.post('/induction/manage/', newIT);
      console.log('Create Induction Training Response:', response.data);

      // Calculate which page the new induction training will be on (new items are added at the beginning)
      setCurrentPage(1); // New items go to first page since they're prepended

      setInductionTrainings(prev => [{ ...response.data, key: String(response.data.id) }, ...prev]);
      message.success('Induction training created successfully and moved to page 1.');
      setAddingIT(false);
    } catch (error) {
      message.error('Failed to create induction training');
    }
  }, []);

  const handleEdit = useCallback(async (it: InductionTrainingData) => {
    // For non-adminusers, open edit modal directly
    if (django_user_type !== 'adminuser') {
      setEditingIT(it);
      return;
    }
    
    try {
      // Check if user has active permission
      const response = await api.get('/api/v1/permissions/check/', {
        params: {
          permission_type: 'edit',
          object_id: it.id,
          app_label: 'inductiontraining',
          model: 'inductiontraining'
        }
      });
      
      if (response.data.has_permission) {
        // User has permission, open edit modal directly
        setEditingIT(it);
      } else {
        // No permission, trigger permission request flow
        executeWithPermission(
          () => api.patch(`/induction/manage/${it.id}/`, {}),
          'edit induction training'
        ).then(() => {
          setEditingIT(it);
        }).catch((error) => {
          if (error) {
          }
        });
      }
    } catch (error) {
      // Fallback to permission request flow
      executeWithPermission(
        () => api.patch(`/induction/manage/${it.id}/`, {}),
        'edit induction training'
      ).then(() => {
        setEditingIT(it);
      }).catch((error) => {
        if (error) {
        }
      });
    }
  }, [django_user_type, executeWithPermission]);

  const handleSaveEditedIT = useCallback(async (updatedIT: InductionTrainingData) => {
    try {
      const response = await api.put(`/induction/manage/${updatedIT.id}/`, updatedIT);
      setInductionTrainings(prev => prev.map(it => it.id === updatedIT.id ? { ...response.data, key: String(response.data.id) } : it));
      message.success('Training updated successfully');
      setEditingIT(null);
      // Stay on current page after update
    } catch (error) {
      message.error('Failed to update training');
    }
  }, []);

  const getStatusTag = useCallback((status: string) => {
    switch (status?.toLowerCase()) {
      case 'planned': return <Tag color="blue">Planned</Tag>;
      case 'completed': return <Tag color="success">Completed</Tag>;
      case 'cancelled': return <Tag color="error">Cancelled</Tag>;
      default: return <Tag>{status || 'Unknown'}</Tag>;
    }
  }, []);

  // --- Table Column Definition (Memoized) ---
  const columns = useMemo(() => [
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 120 },
    { title: 'Location', dataIndex: 'location', key: 'location', ellipsis: true },
    { title: 'Conducted By', dataIndex: 'conducted_by', key: 'conducted_by', width: 150 },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: getStatusTag },
    {
      title: 'Actions', key: 'actions', align: 'center' as const, width: 180,
      render: (_: any, record: InductionTrainingData) => (
        <Space size="small">
          <Tooltip title="View Details"><Button shape="circle" icon={<EyeOutlined />} onClick={() => setViewingIT(record)} /></Tooltip>
          
          {record.status?.toLowerCase() !== 'completed' && (
            <Tooltip title="Show Check-in Codes">
              <Button
                shape="circle"
                icon={<QrcodeOutlined />}
                onClick={() => setCheckInIT(record)}
                disabled={record.status === 'cancelled'}
              />
            </Tooltip>
          )}
          
          {record.status !== 'completed' && (
            <Tooltip title="Conduct & Take Attendance">
              <Button shape="circle" type="primary" icon={<TeamOutlined />} onClick={() => setConductingIT(record)} disabled={record.status === 'cancelled'} />
            </Tooltip>
          )}
          
          {record.status === 'planned' && canModifyRecord(record) && (
            <Tooltip title="Edit"><Button shape="circle" icon={<EditOutlined />} onClick={() => handleEdit(record)} /></Tooltip>
          )}
          
          {record.status === 'planned' && canModifyRecord(record) && (
            <Tooltip title="Delete"><Button shape="circle" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id, record.title)} /></Tooltip>
          )}
        </Space>
      ),
    },
  ], [getStatusTag, handleDelete, handleEdit, canModifyRecord]);

  // --- Render Logic ---
  if (!hasPermission || !isEpcSafetyUser) {
    return (
      <PageLayout title="Induction Training" subtitle="Access denied">
        <PermissionDeniedContainer>
          <StopOutlined style={{ fontSize: '48px', color: 'var(--color-text-muted)', marginBottom: '24px' }} />
          <Title level={4} style={{ color: 'var(--color-text-base)', marginBottom: '8px' }}>Access Denied</Title>
          <Text type="secondary">
            {!hasPermission 
              ? 'Your user role does not have permission to view this page.' 
              : 'Permission Denied. Your user role does not have permission to view this page.'}
          </Text>
        </PermissionDeniedContainer>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Induction Training Management"
      subtitle="Manage induction training sessions and attendance"
      breadcrumbs={[
        { title: 'Training' },
        { title: 'Induction Training' }
      ]}
      actions={
        activeTab === 'trainings' ? (
          <Space>
            <TrainingPrintPreview />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddingIT(true)}>
              Add Training
            </Button>
          </Space>
        ) : null
      }
    >
      <PageContainer>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'trainings',
              label: (
                <span>
                  <TeamOutlined />
                  Training Sessions
                </span>
              ),
              children: (
                <ListCard>
                  <Table
                    columns={columns}
                    dataSource={inductionTrainings}
                    loading={loading}
                    rowKey="key"
                    pagination={{
                      current: currentPage,
                      pageSize: pageSize,
                      total: inductionTrainings.length,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} induction trainings`,
                      position: ['bottomRight'],
                      onChange: handlePaginationChange,
                      onShowSizeChange: handlePaginationChange,
                      pageSizeOptions: ['10', '20', '50', '100'],
                    }}
                    scroll={{ x: 'max-content' }}
                  />
                </ListCard>
              ),
            },
            {
              key: 'personnel',
              label: (
                <span>
                  <UserOutlined />
                  Trained Personnel
                </span>
              ),
              children: <InductionTrainedPersonnelList />,
            },
          ]}
        />

      {/* --- Modals --- */}
      {viewingIT && <InductionTrainingView inductionTraining={viewingIT} visible={!!viewingIT} onClose={handleCancelModals} />}
      {editingIT && <InductionTrainingEdit inductionTraining={editingIT} visible={!!editingIT} onSave={handleSaveEditedIT} onCancel={handleCancelModals} />}
      {conductingIT && <InductionTrainingAttendance inductionTraining={conductingIT} visible={!!conductingIT} onClose={() => { handleCancelModals(); fetchInductionTrainings(); }} />}
      {checkInIT && (
        <TrainingCheckInModal
          open={!!checkInIT}
          trainingId={checkInIT.id}
          trainingType="INDUCTION"
          trainingTitle={checkInIT.title}
          onClose={handleCancelModals}
        />
      )}
      <Modal open={addingIT} title={<Title level={4} style={{color: 'var(--color-text-base)'}}>Add New Induction Training</Title>} footer={null} onCancel={handleCancelModals} destroyOnHidden width={700}>
        <InductionTrainingCreation onFinish={handleSaveNewIT} />
      </Modal>
    </PageContainer>
      
      {showPermissionModal && permissionRequest && (
        <PermissionRequestModal
          visible={showPermissionModal}
          onCancel={closePermissionModal}
          onSuccess={onPermissionRequestSuccess}
          permissionType={permissionRequest.permissionType}
          objectId={permissionRequest.objectId}
          contentType={permissionRequest.contentType}
          objectName={permissionRequest.objectName}
        />
      )}
    </PageLayout>
  );
};

export default InductionTrainingList;

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, message, Popconfirm, Tag, Card, Input, Image, Row, Col, Divider } from 'antd';
import { EditOutlined, EyeOutlined, DeleteOutlined, SearchOutlined, MessageOutlined, CheckCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@common/utils/axiosetup';
import PageLayout from '@common/components/PageLayout';
import useAuthStore from '@common/store/authStore';
import ResponseModal from './ResponseModal';
import ReviewApprovalModal from './ReviewApprovalModal';
import dayjs from 'dayjs';
import { safeString, safeNumber, safeArray, safeApiCall, getDefaultTableData, antdSafe } from '../../../utils/defensiveUtils';
import { TableErrorBoundary } from '@common/components/ErrorBoundary';

const { Search } = Input;

interface SafetyObservation {
  id: number;
  observationID: string;
  date: string;
  time: string;
  reportedBy: string;
  department: string;
  workLocation: string;
  typeOfObservation: string;
  classification: string[];
  severity: number;
  likelihood: number;
  riskScore: number;
  observationStatus: string;
  correctiveActionAssignedTo: string;
  commitmentDate: string;
  safetyObservationFound: string;
  correctivePreventiveAction: string;
  remarks: string;
  created_at: string;
  created_by: any | null;
  created_by_username?: string;
  files: any[];
}

const SafetyObservationList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [observations, setObservations] = useState<SafetyObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState<SafetyObservation | null>(null);

  // Workflow modals
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [workflowObservation, setWorkflowObservation] = useState<SafetyObservation | null>(null);

  const navigate = useNavigate();
  const { user, username } = useAuthStore();

  useEffect(() => {
    fetchObservations();
  }, []);

  // Handle view parameter from URL (for notifications)
  useEffect(() => {
    const viewObservationId = searchParams.get('view');
    if (viewObservationId && observations.length > 0) {
      const observationToView = observations.find(obs => obs.observationID === viewObservationId);
      if (observationToView) {
        handleView(observationToView);
        // Remove the view parameter from URL
        setSearchParams({});
      }
    }
  }, [observations, searchParams]);

  const fetchObservations = async () => {
    setLoading(true);
    try {
      const result = await safeApiCall(
        () => api.get('/api/v1/safetyobservation/'),
        getDefaultTableData(),
        'Failed to fetch safety observations'
      );
      
      if (result.success) {
        const data = result.data.results || result.data;
        // Filter out any null or invalid records with defensive checks
        const validObservations = safeArray(data).filter(obs => 
          obs && 
          (obs.id || obs.observationID) && 
          typeof obs === 'object'
        );
        setObservations(validObservations);
      } else {
        setObservations([]);
      }
    } catch (error) {
      console.error('Fetch observations error:', error);
      setObservations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (record: SafetyObservation) => {
    const observationId = safeString(record?.observationID);
    if (!observationId) {
      message.error('Invalid observation ID');
      return;
    }
    
    try {
      const result = await safeApiCall(
        () => api.get(`/api/v1/safetyobservation/${observationId}/`),
        null,
        'Failed to load observation details'
      );
      
      if (result.success && result.data) {
        setSelectedObservation(result.data);
        setViewModalVisible(true);
      }
    } catch (error: any) {
      console.error('View error:', error);
      console.error('Observation ID:', observationId);
    }
  };

  const handleEdit = (record: SafetyObservation) => {
    if (!record.observationID) {
      message.error('Invalid observation ID');
      return;
    }
    navigate(`/dashboard/safetyobservation/edit/${record.observationID}`);
  };

  const handleDelete = async (record: SafetyObservation) => {
    if (!record.observationID) {
      message.error('Invalid observation ID');
      return;
    }
    
    try {
      await api.delete(`/api/v1/safetyobservation/${record.observationID}/`);
      message.success('Safety observation deleted successfully');
      fetchObservations();
    } catch (error: any) {
      console.error('Delete error:', error);
      console.error('Observation ID:', record.observationID);
      console.error('Full record:', record);
      message.error(`Failed to delete safety observation: ${error.response?.status || 'Unknown error'}`);
    }
  };

  // Workflow handlers
  const handleResponse = (record: SafetyObservation) => {
    setWorkflowObservation(record);
    setResponseModalVisible(true);
  };

  const handleApproval = (record: SafetyObservation) => {
    setWorkflowObservation(record);
    setApprovalModalVisible(true);
  };

  const handlePrint = (record: SafetyObservation) => {
    // TODO: Implement print functionality
    message.info('Print functionality will be implemented');
  };

  const handleWorkflowSuccess = () => {
    setResponseModalVisible(false);
    setApprovalModalVisible(false);
    setWorkflowObservation(null);
    fetchObservations();
  };

  // Role-based permission checks as per requirements
  const isCreator = (record: SafetyObservation | null) => {
    if (!record || !username) return false;
    
    // Extract username from email if needed
    const currentUsername = username.includes('@') ? username.split('@')[0] : username;
    
    // Check multiple ways to identify creator
    if (record.created_by_username === currentUsername) return true;
    if (record.created_by_username === username) return true;
    if (record.created_by && typeof record.created_by === 'object' && record.created_by.username === currentUsername) return true;
    if (typeof record.created_by === 'string' && record.created_by === currentUsername) return true;
    if (record.reportedBy === username) return true;
    if (record.reportedBy === currentUsername) return true;
    
    return false;
  };

  const isAssignedUser = (record: SafetyObservation | null) => {
    if (!record || !username) return false;
    
    // Extract username from email if needed
    const currentUsername = username.includes('@') ? username.split('@')[0] : username;
    
    return record.correctiveActionAssignedTo === currentUsername || record.correctiveActionAssignedTo === username;
  };

  const canShowResponse = (record: SafetyObservation | null) => {
    if (!record || !username) return false;
    // Assigned user can respond when status is open or in_progress
    return isAssignedUser(record) && 
           (record.observationStatus === 'open' || record.observationStatus === 'in_progress');
  };

  const canShowApprove = (record: SafetyObservation | null) => {
    if (!record || !username) return false;
    // Creator can approve when status is pending_verification (after assigned user closes)
    return isCreator(record) && record.observationStatus === 'pending_verification';
  };

  const canShowPrint = (record: SafetyObservation | null) => {
    if (!record || !username) return false;
    // Print is available for closed observations
    return record.observationStatus === 'closed';
  };

  const canShowEdit = (record: SafetyObservation | null) => {
    if (!record || !username) return false;
    // Creator can edit when status is not closed
    return isCreator(record) && record.observationStatus !== 'closed';
  };

  const canShowDelete = (record: SafetyObservation | null) => {
    if (!record || !username) return false;
    // Creator can always delete (except when closed, they can still delete but also have print)
    return isCreator(record);
  };

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return 'green';
      case 2: return 'orange';
      case 3: return 'red';
      case 4: return 'purple';
      default: return 'default';
    }
  };

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 1: return 'Low';
      case 2: return 'Medium';
      case 3: return 'High';
      case 4: return 'Critical';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'red';
      case 'in_progress': return 'orange';
      case 'pending_verification': return 'blue';
      case 'closed': return 'green';
      case 'rejected': return 'gray';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Observation ID',
      dataIndex: 'observationID',
      key: 'observationID',
      width: 150,
      render: (value: any) => safeString(value, 'N/A'),
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value: any, record: SafetyObservation) => {
        if (!record) return false;
        const searchValue = safeString(value).toLowerCase();
        return safeString(record.observationID).toLowerCase().includes(searchValue) ||
               safeString(record.reportedBy).toLowerCase().includes(searchValue) ||
               safeString(record.department).toLowerCase().includes(searchValue);
      },
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 100,
      render: (date: string) => {
        try {
          return date ? dayjs(date).format('DD/MM/YYYY') : '-';
        } catch {
          return safeString(date, '-');
        }
      },
    },
    {
      title: 'Reported By',
      dataIndex: 'reportedBy',
      key: 'reportedBy',
      width: 120,
      render: (value: any) => safeString(value, 'N/A'),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 100,
      render: (value: any) => safeString(value, 'N/A'),
    },
    {
      title: 'Type',
      dataIndex: 'typeOfObservation',
      key: 'typeOfObservation',
      width: 120,
      render: (type: string) => {
        const safeType = safeString(type, 'unknown');
        return safeType.replace('_', ' ').toUpperCase();
      },
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 80,
      render: (severity: number) => {
        const safeSeverity = safeNumber(severity, 1);
        return (
          <Tag color={getSeverityColor(safeSeverity)}>
            {getSeverityText(safeSeverity)}
          </Tag>
        );
      },
    },
    {
      title: 'Risk Score',
      dataIndex: 'riskScore',
      key: 'riskScore',
      width: 80,
      render: (score: number) => {
        const safeScore = safeNumber(score, 0);
        return (
          <Tag color={safeScore <= 3 ? 'green' : safeScore <= 6 ? 'orange' : safeScore <= 9 ? 'red' : 'purple'}>
            {safeScore}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'observationStatus',
      key: 'observationStatus',
      width: 120,
      render: (status: string) => {
        const safeStatus = safeString(status, 'unknown');
        return (
          <Tag color={getStatusColor(safeStatus)}>
            {safeStatus.replace('_', ' ').toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Commitment Date',
      dataIndex: 'commitmentDate',
      key: 'commitmentDate',
      width: 120,
      render: (date: string) => {
        try {
          return date ? dayjs(date).format('DD/MM/YYYY') : '-';
        } catch {
          return safeString(date, '-');
        }
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 300,
      render: (_: any, record: SafetyObservation) => {
        if (!record) {
          return <span>-</span>;
        }
        
        const actions = [];
        
        // View button - always visible for all users
        actions.push(
          <Button
            key="view"
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleView(record)}
            title="View"
          />
        );

        // Role-based buttons as per requirements
        if (isCreator(record)) {
          // Creator: Edit, Delete, Approve (when pending_verification)
          if (canShowEdit(record)) {
            actions.push(
              <Button key="edit" type="default" icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} style={{ backgroundColor: '#1890ff', color: 'white' }}>Edit</Button>
            );
          }
          if (canShowDelete(record)) {
            actions.push(
              <Popconfirm key="delete" title="Delete this observation?" onConfirm={() => handleDelete(record)}>
                <Button type="primary" danger icon={<DeleteOutlined />} size="small">Delete</Button>
              </Popconfirm>
            );
          }
          if (canShowApprove(record)) {
            actions.push(
              <Button key="approve" type="default" icon={<CheckCircleOutlined />} size="small" onClick={() => handleApproval(record)} style={{ backgroundColor: '#52c41a', color: 'white' }}>Approve</Button>
            );
          }
        }
        
        if (isAssignedUser(record)) {
          // Assigned User: Response (when open/in_progress)
          if (canShowResponse(record)) {
            actions.push(
              <Button key="response" type="default" icon={<MessageOutlined />} size="small" onClick={() => handleResponse(record)} style={{ backgroundColor: '#fa8c16', color: 'white' }}>Response</Button>
            );
          }
        }

        // Print button for closed observations (available to all)
        if (canShowPrint(record)) {
          actions.push(
            <Button
              key="print"
              type="default"
              icon={<PrinterOutlined />}
              size="small"
              onClick={() => handlePrint(record)}
              title="Print"
            />
          );
        }

        return (
          <Space size="small" wrap>
            {actions}
          </Space>
        );
      },
    },
  ];

  return (
    <PageLayout
      title="Safety Observations List"
      subtitle="View and manage all safety observations"
    >
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Search
              placeholder="Search observations..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={setSearchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            <Button
              type="primary"
              onClick={() => navigate('/dashboard/safetyobservation/form')}
            >
              Create New Observation
            </Button>
          </Space>
        </div>

        <TableErrorBoundary>
          <Table
            columns={columns}
            dataSource={observations}
            loading={loading}
            rowKey={(record) => antdSafe.rowKey(record, observations.indexOf(record))}
            scroll={{ x: 1200 }}
            pagination={{
              ...antdSafe.pagination(observations.length, 1, 10),
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${safeNumber(range?.[0], 0)}-${safeNumber(range?.[1], 0)} of ${safeNumber(total, 0)} observations`,
            }}
          />
        </TableErrorBoundary>
      </Card>

      {/* View Modal */}
      <Modal
        title={`Safety Observation Details - ${selectedObservation?.observationID}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>,
          // Show approval buttons if observation is pending verification and user is creator
          ...(selectedObservation?.observationStatus === 'pending_verification' &&
              isCreator(selectedObservation) ? [
            <Button
              key="approve"
              type="primary"
              onClick={() => {
                setViewModalVisible(false);
                if (selectedObservation) {
                  setWorkflowObservation(selectedObservation);
                  setApprovalModalVisible(true);
                }
              }}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Approve
            </Button>
          ] : selectedObservation?.observationStatus !== 'closed' && isCreator(selectedObservation) ? [
            <Button
              key="edit"
              type="primary"
              onClick={() => {
                setViewModalVisible(false);
                if (selectedObservation) {
                  handleEdit(selectedObservation);
                }
              }}
            >
              Edit
            </Button>
          ] : [])
        ]}
        width={900}
        style={{ top: 20 }}
      >
        {selectedObservation && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Basic Information */}
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>Date:</strong> {dayjs(selectedObservation.date).format('DD/MM/YYYY')}</p>
                <p><strong>Time:</strong> {selectedObservation.time}</p>
                <p><strong>Reported By:</strong> {selectedObservation.reportedBy}</p>
                <p><strong>Department:</strong> {selectedObservation.department}</p>
                <p><strong>Work Location:</strong> {selectedObservation.workLocation}</p>
              </Col>
              <Col span={12}>
                <p><strong>Type:</strong> {selectedObservation.typeOfObservation.replace('_', ' ')}</p>
                <p><strong>Classification:</strong> {selectedObservation.classification.join(', ')}</p>
                <p><strong>Severity:</strong> <Tag color={getSeverityColor(selectedObservation.severity)}>{getSeverityText(selectedObservation.severity)}</Tag></p>
                <p><strong>Risk Score:</strong> <Tag>{selectedObservation.riskScore}</Tag></p>
                <p><strong>Status:</strong> <Tag color={getStatusColor(selectedObservation.observationStatus)}>{selectedObservation.observationStatus.replace('_', ' ')}</Tag></p>
              </Col>
            </Row>

            <Divider />

            {/* Observation Details */}
            <p><strong>Observation Description:</strong></p>
            <p style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 6 }}>
              {selectedObservation.safetyObservationFound}
            </p>

            <p><strong>Corrective Action:</strong></p>
            <p style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 6 }}>
              {selectedObservation.correctivePreventiveAction}
            </p>

            <Row gutter={16}>
              <Col span={12}>
                <p><strong>Assigned To:</strong> {selectedObservation.correctiveActionAssignedTo}</p>
              </Col>
              <Col span={12}>
                <p><strong>Commitment Date:</strong> {selectedObservation.commitmentDate ? dayjs(selectedObservation.commitmentDate).format('DD/MM/YYYY') : 'Not set'}</p>
              </Col>
            </Row>

            <p><strong>Created:</strong> {dayjs(selectedObservation.created_at).format('DD/MM/YYYY HH:mm')}</p>

            {/* Debug Information Section */}
            <Divider orientation="left">System Information</Divider>
            <div style={{ backgroundColor: '#f9f9f9', padding: 12, borderRadius: 6, fontSize: '12px' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <p><strong>Current User:</strong> {username}</p>
                  <p><strong>Creator Username:</strong> {selectedObservation.created_by_username || 'N/A'}</p>
                  <p><strong>Reported By:</strong> {selectedObservation.reportedBy}</p>
                </Col>
                <Col span={12}>
                  <p><strong>Assigned To:</strong> {selectedObservation.correctiveActionAssignedTo}</p>
                  <p><strong>Is Creator:</strong> {isCreator(selectedObservation) ? 'YES' : 'NO'}</p>
                  <p><strong>Is Assigned User:</strong> {isAssignedUser(selectedObservation) ? 'YES' : 'NO'}</p>
                </Col>
              </Row>
            </div>

            {/* Photos Section */}
            {selectedObservation.files && selectedObservation.files.length > 0 && (
              <>
                <Divider orientation="left">Uploaded Photos</Divider>
                <Row gutter={16}>
                  {selectedObservation.files.map((file: any, index: number) => (
                    <Col key={index} span={8} style={{ marginBottom: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <Image
                          width={200}
                          height={150}
                          src={file.file}
                          alt={`Photo ${index + 1}`}
                          style={{ objectFit: 'cover', borderRadius: 8 }}
                          preview={{
                            mask: <EyeOutlined />
                          }}
                        />
                        <p style={{ fontSize: 12, marginTop: 8, color: '#666' }}>
                          {file.file_name}
                        </p>
                        <p style={{ fontSize: 10, color: '#999' }}>
                          Uploaded: {dayjs(file.uploaded_at).format('DD/MM/YYYY HH:mm')}
                        </p>
                      </div>
                    </Col>
                  ))}
                </Row>
              </>
            )}

            {selectedObservation.remarks && (
              <>
                <Divider />
                <p><strong>Remarks:</strong></p>
                <p style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 6 }}>
                  {selectedObservation.remarks}
                </p>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Response Modal */}
      {workflowObservation && (
        <ResponseModal
          visible={responseModalVisible}
          onCancel={() => setResponseModalVisible(false)}
          onSuccess={handleWorkflowSuccess}
          observationID={workflowObservation.observationID}
          observationData={workflowObservation}
        />
      )}

      {/* Review & Approval Modal */}
      {workflowObservation && (
        <ReviewApprovalModal
          visible={approvalModalVisible}
          onCancel={() => setApprovalModalVisible(false)}
          onSuccess={handleWorkflowSuccess}
          observationID={workflowObservation.observationID}
          observationData={workflowObservation}
        />
      )}
    </PageLayout>
  );
};

export default SafetyObservationList;

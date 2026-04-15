import React, { useState, useEffect } from 'react';
import { 
  Card, Descriptions, Tag, Button, Space, Tabs, Table, Alert,
  Timeline, Modal, Form, Input, App, Spin, Tooltip,
  Typography, Divider, DatePicker, Image, message, Select, Upload, Checkbox
} from 'antd';
import { QrcodeOutlined, PrinterOutlined } from '@ant-design/icons';
import { 
  CheckCircleOutlined, CloseCircleOutlined, 
  ExclamationCircleOutlined, ClockCircleOutlined,
  FileTextOutlined, HistoryOutlined,
  TeamOutlined, ToolOutlined, SafetyOutlined, EditOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getPermit, approvePermit, rejectPermit, startWork,
  completeWork, closePermit, requestExtension,
  rejectVerification, getAvailableApprovers,
  getPermitCloseout, updatePermitCloseout, completePermitCloseout,
  getPermitIsolation, assignPermitIsolation, updatePermitIsolation, listIsolationPoints,
  getPermitTbt, updatePermitTbt, acknowledgePermitTbt, addPermitSignature
} from '../api';
import * as Types from '../types';
import dayjs from 'dayjs';
import { useNotificationsContext } from '@common/contexts/NotificationsContext';
import { useAuthStore } from '../../../store/authStore';
import api from '@common/utils/axiosetup';
import {
  buildWorkflowParams,
  getUserAdminType,
  getUserDisplayName,
  getUserGrade,
  isAllowedApprover,
  normalizeAdminType,
  normalizeGrade,
} from '../utils/workflowGuards';
import ReadinessPanel from './ReadinessPanel';
import PersonnelSelect from './PersonnelSelect';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { confirm } = Modal;


const PermitDetail: React.FC = () => {
  const {message} = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [permit, setPermit] = useState<Types.Permit | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modals
  const [approvalModal, setApprovalModal] = useState(false);
  const [rejectionModal, setRejectionModal] = useState(false);
  const [extensionModal, setExtensionModal] = useState(false);
  const [verificationModal, setVerificationModal] = useState(false);
  const [verificationRejectionModal, setVerificationRejectionModal] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrMobileUrl, setQrMobileUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [availableApprovers, setAvailableApprovers] = useState<any[]>([]);
  const [loadingApprovers, setLoadingApprovers] = useState(false);
  const [availableVerifiers, setAvailableVerifiers] = useState<any[]>([]);
  const [loadingVerifiers, setLoadingVerifiers] = useState(false);

  // Closeout state
  const [closeout, setCloseout] = useState<Types.PermitCloseout | null>(null);
  const [closeoutLoading, setCloseoutLoading] = useState(false);
  const [closeoutChecklist, setCloseoutChecklist] = useState<Record<string, Types.CloseoutChecklistItemStatus>>({});
  const [closeoutRemarks, setCloseoutRemarks] = useState('');

  // Isolation state
  const [isolation, setIsolation] = useState<Types.PermitIsolationResponse | null>(null);
  const [isolationLoading, setIsolationLoading] = useState(false);
  const [isolationUnavailable, setIsolationUnavailable] = useState(false);
  const [libraryPoints, setLibraryPoints] = useState<Types.IsolationPointLibrary[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryUnavailable, setLibraryUnavailable] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('1');
  const [readinessRefresh, setReadinessRefresh] = useState(0);
  const [tbt, setTbt] = useState<Types.PermitToolboxTalk | null>(null);
  const [tbtAttendance, setTbtAttendance] = useState<Types.PermitToolboxTalkAttendance[]>([]);
  const [tbtLoading, setTbtLoading] = useState(false);
  const [tbtUpdating, setTbtUpdating] = useState(false);
  const [tbtFile, setTbtFile] = useState<File | null>(null);
  const [signatureSaving, setSignatureSaving] = useState(false);

  // Forms
  const [approvalForm] = Form.useForm();
  const [rejectionForm] = Form.useForm();
  const [extensionForm] = Form.useForm();
  const [verificationForm] = Form.useForm();
  const [verificationRejectionForm] = Form.useForm();
  const [tbtForm] = Form.useForm();
  
  const handleGenerateQR = async () => {
    if (!id || id === 'new' || !permit?.id || typeof permit.id !== 'number') {
      message.error('Permit must be saved before generating QR code');
      return;
    }
    
    setQrLoading(true);
    try {
      const response = await api.get(`/api/v1/ptw/permits/${id}/generate_qr_code/`);
      setQrImage(response.data.qr_image);
      setQrMobileUrl(response.data.mobile_url || null);
      setQrModal(true);
      message.success('QR Code generated successfully');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || 'Failed to generate QR code';
      message.error(String(errorMsg));
    } finally {
      setQrLoading(false);
    }
  };

  const getDisplayName = (user: any) => {
    if (!user) return 'Unknown';
    if (user.full_name) return user.full_name;
    const parts = [user.name, user.surname].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    return user.username || user.email || 'Unknown';
  };

  const handleAddSignature = async (signatureType: 'requestor' | 'verifier' | 'approver') => {
    if (!id) return;
    
    // Check if already signed
    const signatureMap = permit?.signatures_by_type || {};
    const existingSignature = signatureMap[signatureType];
    
    if (existingSignature) {
      message.warning(`This permit has already been signed as ${signatureType}. Duplicate signatures are not allowed.`);
      return;
    }
    
    setSignatureSaving(true);
    try {
      // Backend will generate the proper signed document signature automatically
      const response = await addPermitSignature(parseInt(id), {
        signature_type: signatureType
      });
      
      // Handle successful response - ensure we only pass strings to message
      if (response.data) {
        const successMessage = response.data.message || 'Signature captured successfully';
        message.success(String(successMessage));
        fetchPermit();
        refreshReadiness();
      }
    } catch (error: any) {
      let errorMsg = 'Failed to capture signature';
      
      if (error.response?.status === 404) {
        errorMsg = 'No signature template found. Please create one in your profile.';
      } else if (error?.response?.data?.error) {
        // Handle structured error response - extract message from nested object
        const errorData = error.response.data.error;
        if (typeof errorData === 'object') {
          if (errorData.message) {
            errorMsg = String(errorData.message);
          } else if (errorData.code) {
            errorMsg = String(errorData.code);
          } else {
            errorMsg = 'Signature error occurred';
          }
        } else if (typeof errorData === 'string') {
          errorMsg = String(errorData);
        }
      } else if (error?.response?.data?.message) {
        errorMsg = String(error.response.data.message);
      } else if (error?.message) {
        errorMsg = String(error.message);
      }
      
      // Ensure we only pass strings to message.error
      message.error(String(errorMsg));
    } finally {
      setSignatureSaving(false);
    }
  };
  
  // Add notification context
  const { sendNotification } = useNotificationsContext();
  
  const refreshReadiness = () => setReadinessRefresh(prev => prev + 1);

  const fetchPermit = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await getPermit(parseInt(id));
      setPermit(response.data);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        message.error('Authentication expired. Please login again.');
      } else if (error?.response?.status === 403) {
        message.error('You do not have permission to view this permit');
      } else {
        message.error('Failed to load permit details');
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPermit();
    fetchCloseout();
    fetchTbt();
    fetchIsolation();
    fetchLibraryPoints();
  }, [id]);
  
  const fetchCloseout = async () => {
    if (!id) return;
    
    setCloseoutLoading(true);
    try {
      const response = await getPermitCloseout(parseInt(id));
      setCloseout(response.data);
      setCloseoutChecklist(response.data.checklist || {});
      setCloseoutRemarks(response.data.remarks || '');
    } catch (error: any) {
      // Closeout may not exist yet, that's okay
    } finally {
      setCloseoutLoading(false);
    }
  };

  const fetchTbt = async () => {
    if (!id) return;

    setTbtLoading(true);
    try {
      const response = await getPermitTbt(parseInt(id));
      setTbt(response.data.tbt);
      setTbtAttendance(response.data.attendance || []);
      if (response.data.tbt) {
        tbtForm.setFieldsValue({
          title: response.data.tbt.title || '',
          conducted_at: response.data.tbt.conducted_at ? dayjs(response.data.tbt.conducted_at) : null,
          conducted_by: response.data.tbt.conducted_by || undefined,
          url: response.data.tbt.url || '',
          notes: response.data.tbt.notes || ''
        });
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setTbt(null);
        setTbtAttendance([]);
      }
    } finally {
      setTbtLoading(false);
    }
  };

  const handleUpdateTbt = async () => {
    if (!id) return;

    setTbtUpdating(true);
    try {
      const values = tbtForm.getFieldsValue();
      const conductedAt = values.conducted_at ? values.conducted_at.toISOString() : null;

      if (tbtFile) {
        const formData = new FormData();
        if (values.title) formData.append('title', values.title);
        if (conductedAt) formData.append('conducted_at', conductedAt);
        if (values.conducted_by) formData.append('conducted_by', String(values.conducted_by));
        if (values.url) formData.append('url', values.url);
        if (values.notes) formData.append('notes', values.notes);
        formData.append('document', tbtFile);
        const response = await updatePermitTbt(parseInt(id), formData);
        setTbt(response.data.tbt);
        setTbtAttendance(response.data.attendance || []);
      } else {
        const payload: Record<string, any> = {
          title: values.title || '',
          conducted_at: conductedAt,
          conducted_by: values.conducted_by || null,
          url: values.url || '',
          notes: values.notes || ''
        };
        const response = await updatePermitTbt(parseInt(id), payload);
        setTbt(response.data.tbt);
        setTbtAttendance(response.data.attendance || []);
      }
      message.success('Toolbox Talk updated');
      setTbtFile(null);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || 'Failed to update Toolbox Talk';
      message.error(String(errorMsg));
    } finally {
      setTbtUpdating(false);
    }
  };

  const handleTbtAck = async (permitWorkerId: number, acknowledged: boolean) => {
    if (!id) return;
    if (!tbt?.id) {
      message.error('Create Toolbox Talk before acknowledging attendance.');
      return;
    }

    try {
      const response = await acknowledgePermitTbt(parseInt(id), {
        permit_worker_id: permitWorkerId,
        acknowledged
      });
      setTbtAttendance(prev => {
        const updated = prev.filter(item => item.permit_worker !== permitWorkerId);
        return [...updated, response.data];
      });
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || 'Failed to update attendance';
      message.error(String(errorMsg));
    }
  };
  
  const handleApprove = async () => {
    if (!id) return;
    
    try {
      await approvalForm.validateFields();
      const values = approvalForm.getFieldsValue();
      
      setActionLoading(true);
      await approvePermit(parseInt(id), values.comments);
      message.success('Permit approved successfully');
      refreshReadiness();
      
      // Send notification to permit creator
      if (permit?.created_by) {
        sendNotification(permit.created_by, {
          title: 'Permit Approved',
          message: `Your permit ${permit.permit_number} has been approved`,
          type: 'approval',
          data: {
            permitId: permit.id,
            permitNumber: permit.permit_number,
            action: 'approved'
          },
          link: `/dashboard/ptw/view/${permit.id}`
        });
      }
      
      setApprovalModal(false);
      fetchPermit();
    } catch (error: any) {
      if (error?.response?.data?.signature) {
        const signatureMessage = error.response.data.signature.message || 'Signature required';
        message.error(String(signatureMessage));
        // Auto-open signature modal if signature missing
        if (error.response.data.signature.missing?.includes('approver')) {
          message.info('Please provide your digital signature before approval.');
        }
        setApprovalModal(false);
      } else if (error?.response?.data?.isolation) {
        const isolationMessage = error.response.data.isolation || 'Isolation requirements not met';
        message.error(String(isolationMessage));
        setActiveTabKey('isolation');
        setApprovalModal(false);
      } else {
        message.error('Failed to approve permit');
      }
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleReject = async () => {
    if (!id) return;
    
    try {
      await rejectionForm.validateFields();
      const values = rejectionForm.getFieldsValue();
      
      setActionLoading(true);
      await rejectPermit(parseInt(id), values.comments);
      message.success('Permit rejected');
      refreshReadiness();
      
      // Send notification to permit creator
      if (permit?.created_by) {
        sendNotification(permit.created_by, {
          title: 'Permit Rejected',
          message: `Your permit ${permit.permit_number} has been rejected`,
          type: 'general',
          data: {
            permitId: permit.id,
            permitNumber: permit.permit_number,
            action: 'rejected',
            reason: values.comments
          },
          link: `/dashboard/ptw/view/${permit.id}`
        });
      }
      
      setRejectionModal(false);
      fetchPermit();
    } catch (error) {
      message.error('Failed to reject permit');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleStartWork = async () => {
    if (!id) return;
    
    confirm({
      title: 'Start Work',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to start work on this permit?',
      onOk: async () => {
        setActionLoading(true);
        try {
          await startWork(parseInt(id));
          message.success('Work started successfully');
          refreshReadiness();
          
          // Notify relevant stakeholders
          if (permit?.assigned_workers) {
            permit.assigned_workers.forEach(worker => {
              if (worker.worker_details?.id) {
                sendNotification(worker.worker_details.id, {
                  title: 'Work Started',
                  message: `Work has started for permit ${permit.permit_number}`,
                  type: 'general',
                  data: {
                    permitId: permit.id,
                    permitNumber: permit.permit_number,
                    action: 'started'
                  },
                  link: `/dashboard/ptw/view/${permit.id}`
                });
              }
            });
          }
          
          fetchPermit();
        } catch (error) {
          message.error('Failed to start work');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };
  
  const handleCompleteWork = async () => {
    if (!id) return;
    
    confirm({
      title: 'Complete Work',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to mark this work as completed?',
      onOk: async () => {
        setActionLoading(true);
        try {
          await completeWork(parseInt(id));
          message.success('Work completed successfully');
          refreshReadiness();
          fetchPermit();
        } catch (error: any) {
          // Check if error is due to incomplete closeout or isolation
          if (error?.response?.data?.closeout) {
            const closeoutMessage = error.response.data.closeout || 'Closeout requirements not met';
            message.error(String(closeoutMessage));
            setActiveTabKey('closeout');
          } else if (error?.response?.data?.isolation) {
            const isolationMessage = error.response.data.isolation || 'Isolation requirements not met';
            message.error(String(isolationMessage));
            setActiveTabKey('isolation');
          } else {
            message.error('Failed to complete work');
          }
        } finally {
          setActionLoading(false);
        }
      }
    });
  };
  
  const handleClosePermit = async () => {
    if (!id) return;
    
    confirm({
      title: 'Close Permit',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to close this permit?',
      onOk: async () => {
        setActionLoading(true);
        try {
          await closePermit(parseInt(id));
          message.success('Permit closed successfully');
          fetchPermit();
        } catch (error: any) {
          // Check if error is due to incomplete closeout or isolation
          if (error?.response?.data?.closeout) {
            const closeoutMessage = error.response.data.closeout || 'Closeout requirements not met';
            message.error(String(closeoutMessage));
            setActiveTabKey('closeout');
          } else if (error?.response?.data?.isolation) {
            const isolationMessage = error.response.data.isolation || 'Isolation requirements not met';
            message.error(String(isolationMessage));
            setActiveTabKey('isolation');
          } else {
            message.error('Failed to close permit');
          }
        } finally {
          setActionLoading(false);
        }
      }
    });
  };
  
  const handleRequestExtension = async () => {
    if (!id) return;

    try {
      await extensionForm.validateFields();
      const values = extensionForm.getFieldsValue();

      setActionLoading(true);
      await requestExtension({
        permit: parseInt(id),
        new_end_time: values.new_end_time.toISOString(),
        reason: values.reason
      });
      message.success('Extension requested successfully');
      setExtensionModal(false);
      fetchPermit();
    } catch (error) {
      message.error('Failed to request extension');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchAvailableVerifiers = async () => {
    setLoadingVerifiers(true);
    try {
      const response = await api.get('/api/v1/ptw/workflow/verifiers/');
      setAvailableVerifiers(response.data.verifiers || []);
    } catch (error) {
      message.error('Failed to load verifiers');
    } finally {
      setLoadingVerifiers(false);
    }
  };

  const fetchAvailableApprovers = async () => {
    setLoadingApprovers(true);
    try {
      const authState = useAuthStore.getState();
      const verifierType = normalizeAdminType(authState.usertype);
      const verifierGrade = normalizeGrade(authState.grade);
      const response = await getAvailableApprovers({
        user_type: verifierType || undefined,
        grade: verifierGrade || undefined
      });
      const candidates = response.data.approvers || [];
      const filtered = candidates.filter((approver: any) =>
        isAllowedApprover(verifierType, verifierGrade, approver)
      );
      setAvailableApprovers(filtered);
    } catch (error) {
      message.error('Failed to load approvers');
    } finally {
      setLoadingApprovers(false);
    }
  };

  const handleVerify = async () => {
    if (!id) return;

    try {
      await verificationForm.validateFields();
      const values = verificationForm.getFieldsValue();

      setActionLoading(true);
      
      // Call API with selected user type and grade
      const response = await api.post(`/api/v1/ptw/permits/${id}/verify/`, {
        action: 'approve',
        comments: values.comments || '',
        selected_approver_id: values.approver_id
      });

      message.success('Permit verified and sent for approval');
      refreshReadiness();
      
      // Send notification to all users of selected grade
      const selectedApprover = availableApprovers.find((user) => user.id === values.approver_id);
      if (selectedApprover) {
        sendNotification(selectedApprover.id, {
          title: 'PTW Approval Required',
          message: `Permit ${permit?.permit_number} requires your approval`,
          type: 'ptw_approval',
          data: {
            permitId: permit?.id,
            permitNumber: permit?.permit_number,
            action: 'approval_required'
          },
          link: `/dashboard/ptw/view/${permit?.id}`
        });
      }

      // Send notification to permit creator
      if (permit?.created_by) {
        sendNotification(permit.created_by, {
          title: 'Permit Verified',
          message: `Your permit ${permit.permit_number} has been verified and sent for approval`,
          type: 'ptw_verification',
          data: {
            permitId: permit.id,
            permitNumber: permit.permit_number,
            action: 'verified'
          },
          link: `/dashboard/ptw/view/${permit.id}`
        });
      }

      setVerificationModal(false);
      fetchPermit();
    } catch (error: any) {
      if (error?.response?.data?.signature) {
        const signatureMessage = error.response.data.signature.message || 'Signature required';
        message.error(String(signatureMessage));
        // Auto-open signature modal if signature missing
        if (error.response.data.signature.missing?.includes('verifier')) {
          message.info('Please provide your digital signature before verification.');
        }
      } else {
        message.error('Failed to verify permit');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectVerification = async () => {
    if (!id) return;

    try {
      await verificationRejectionForm.validateFields();
      const values = verificationRejectionForm.getFieldsValue();

      setActionLoading(true);
      await rejectVerification(parseInt(id), values.comments);
      message.success('Permit verification rejected');

      // Send notification to permit creator
      if (permit?.created_by) {
        sendNotification(permit.created_by, {
          title: 'Permit Verification Rejected',
          message: `Your permit ${permit.permit_number} verification has been rejected`,
          type: 'verification',
          data: {
            permitId: permit.id,
            permitNumber: permit.permit_number,
            action: 'verification_rejected',
            reason: values.comments
          },
          link: `/dashboard/ptw/view/${permit.id}`
        });
      }

      setVerificationRejectionModal(false);
      fetchPermit();
    } catch (error) {
      message.error('Failed to reject verification');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleSaveCloseout = async () => {
    if (!id) return;
    
    setCloseoutLoading(true);
    try {
      await updatePermitCloseout(parseInt(id), {
        checklist: closeoutChecklist,
        remarks: closeoutRemarks
      });
      message.success('Closeout checklist saved');
      fetchCloseout();
    } catch (error) {
      message.error('Failed to save closeout checklist');
    } finally {
      setCloseoutLoading(false);
    }
  };
  
  const handleCompleteCloseout = async () => {
    if (!id) return;
    
    setCloseoutLoading(true);
    try {
      await completePermitCloseout(parseInt(id));
      message.success('Closeout marked as complete');
      fetchCloseout();
    } catch (error: any) {
      if (error?.response?.data?.error) {
        const errorData = error.response.data.error;
        let errorMsg = 'Failed to complete closeout';
        if (typeof errorData === 'object') {
          errorMsg = errorData.message || errorData.code || errorMsg;
        } else {
          errorMsg = String(errorData);
        }
        message.error(String(errorMsg));
      } else {
        message.error('Failed to complete closeout');
      }
    } finally {
      setCloseoutLoading(false);
    }
  };
  
  const handleChecklistItemChange = (key: string, done: boolean) => {
    setCloseoutChecklist(prev => ({
      ...prev,
      [key]: { ...prev[key], done }
    }));
  };
  
  // Isolation functions
  const fetchIsolation = async () => {
    if (!id) return;
    setIsolationLoading(true);
    setIsolationUnavailable(false);
    try {
      const response = await getPermitIsolation(parseInt(id));
      setIsolation(response.data);
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404) {
        setIsolation(null);
        setIsolationUnavailable(true);
        return;
      }
      console.error('Failed to fetch isolation points:', error);
    } finally {
      setIsolationLoading(false);
    }
  };

  const fetchLibraryPoints = async () => {
    setLibraryLoading(true);
    setLibraryUnavailable(false);
    try {
      const response = await listIsolationPoints();
      setLibraryPoints(response.data.results || response.data);
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404) {
        setLibraryPoints([]);
        setLibraryUnavailable(true);
        return;
      }
      console.error('Failed to fetch library points:', error);
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleAssignLibraryPoint = async (pointId: number) => {
    if (!id) return;
    setIsolationLoading(true);
    try {
      await assignPermitIsolation(parseInt(id), { point_id: pointId, required: true });
      message.success('Isolation point assigned');
      fetchIsolation();
    } catch (error: any) {
      let errorMsg = 'Failed to assign point';
      if (error?.response?.data?.error) {
        const errorData = error.response.data.error;
        if (typeof errorData === 'object') {
          errorMsg = errorData.message || errorData.code || errorMsg;
        } else {
          errorMsg = String(errorData);
        }
      }
      message.error(String(errorMsg));
    } finally {
      setIsolationLoading(false);
    }
  };

  const handleAddCustomPoint = async (values: any) => {
    if (!id) return;
    setIsolationLoading(true);
    try {
      await assignPermitIsolation(parseInt(id), {
        custom_point_name: values.custom_point_name,
        custom_point_details: values.custom_point_details,
        required: true,
        lock_count: values.lock_count || 1
      });
      message.success('Custom isolation point added');
      setShowCustomForm(false);
      fetchIsolation();
    } catch (error: any) {
      let errorMsg = 'Failed to add custom point';
      if (error?.response?.data?.error) {
        const errorData = error.response.data.error;
        if (typeof errorData === 'object') {
          errorMsg = errorData.message || errorData.code || errorMsg;
        } else {
          errorMsg = String(errorData);
        }
      }
      message.error(String(errorMsg));
    } finally {
      setIsolationLoading(false);
    }
  };

  const handleIsolationAction = async (pointId: number, action: 'isolate' | 'verify' | 'deisolate', data: any) => {
    if (!id) return;
    setIsolationLoading(true);
    try {
      await updatePermitIsolation(parseInt(id), { point_id: pointId, action, ...data });
      message.success(`Point ${action}d successfully`);
      fetchIsolation();
    } catch (error: any) {
      let errorMsg = `Failed to ${action} point`;
      if (error?.response?.data?.error) {
        const errorData = error.response.data.error;
        if (typeof errorData === 'object') {
          errorMsg = errorData.message || errorData.code || errorMsg;
        } else {
          errorMsg = String(errorData);
        }
      }
      message.error(String(errorMsg));
    } finally {
      setIsolationLoading(false);
    }
  };
  
  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string, icon: React.ReactNode, label?: string }> = {
      draft: { color: 'default', icon: <FileTextOutlined /> },
      submitted: { color: 'processing', icon: <ClockCircleOutlined /> },
      under_review: { color: 'processing', icon: <ClockCircleOutlined />, label: 'PENDING APPROVAL' },
      pending_approval: { color: 'orange', icon: <ClockCircleOutlined /> },
      approved: { color: 'green', icon: <CheckCircleOutlined /> },
      rejected: { color: 'red', icon: <CloseCircleOutlined /> },
      active: { color: 'blue', icon: <ToolOutlined /> },
      suspended: { color: 'purple', icon: <ExclamationCircleOutlined /> },
      completed: { color: 'cyan', icon: <CheckCircleOutlined /> },
      closed: { color: 'black', icon: <CheckCircleOutlined /> },
      cancelled: { color: 'magenta', icon: <CloseCircleOutlined /> },
      expired: { color: 'red', icon: <CloseCircleOutlined /> }
    };
    
    const config = statusConfig[status] || { color: 'default', icon: null };
    const displayText = config.label || status.replace('_', ' ').toUpperCase();
    
    return (
      <Tag color={config.color} icon={config.icon}>
        {displayText}
      </Tag>
    );
  };
  
  // Check if current user can verify this permit
  const canVerifyPermit = (permit: any) => {
    const authState = useAuthStore.getState();
    const { usertype, grade } = authState;

    if (!permit || !permit.created_by_details) {
      return false;
    }

    // EPC C grade can verify contractor permits
    if (usertype === 'epcuser' && grade === 'C' &&
        permit.created_by_details.admin_type === 'contractoruser') {
      return true;
    }

    // EPC B grade can verify EPC C grade permits
    if (usertype === 'epcuser' && grade === 'B' &&
        permit.created_by_details.admin_type === 'epcuser' &&
        permit.created_by_details.grade === 'C') {
      return true;
    }

    // Client B grade can verify Client C grade permits
    if (usertype === 'clientuser' && grade === 'B' &&
        permit.created_by_details.admin_type === 'clientuser' &&
        permit.created_by_details.grade === 'C') {
      return true;
    }

    return false;
  };

  // Check if current user can approve this permit
  const canApprovePermit = (permit: any) => {
    const authState = useAuthStore.getState();
    const { usertype, grade } = authState;

    if (!permit || !permit.created_by_details) {
      return false;
    }

    // Client C grade can approve contractor permits (verified by EPC)
    if (usertype === 'clientuser' && grade === 'C' &&
        permit.created_by_details.admin_type === 'contractoruser') {
      return true;
    }

    // Client B grade can approve Client C grade permits
    if (usertype === 'clientuser' && grade === 'B' &&
        permit.created_by_details.admin_type === 'clientuser' &&
        permit.created_by_details.grade === 'C') {
      return true;
    }

    // EPC B grade can approve EPC C grade permits
    if (usertype === 'epcuser' && grade === 'B' &&
        permit.created_by_details.admin_type === 'epcuser' &&
        permit.created_by_details.grade === 'C') {
      return true;
    }

    return false;
  };

  const renderActionButtons = () => {
    if (!permit) return null;

    const { status } = permit;

    return (
      <Space size="small">
        {status === 'draft' && (
          <Tooltip title="Edit Permit">
            <Button 
              shape="circle" 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={() => navigate(`/dashboard/ptw/edit/${id}`)}
            />
          </Tooltip>
        )}

        {status === 'submitted' && canVerifyPermit(permit) && (
          <>
            {!permit.signatures_by_type?.verifier ? (
              <Tooltip title="Sign as Verifier">
                <Button 
                  shape="circle" 
                  type="primary" 
                  icon={<CheckCircleOutlined />} 
                  onClick={() => handleAddSignature('verifier')}
                  loading={signatureSaving}
                />
              </Tooltip>
            ) : !permit.approved_by && !permit.approver ? (
              <Tooltip title="Select Approver">
                <Button 
                  shape="circle" 
                  type="primary" 
                  icon={<TeamOutlined />} 
                  onClick={() => {
                    fetchAvailableApprovers();
                    setVerificationModal(true);
                  }}
                />
              </Tooltip>
            ) : (
              <Tooltip title="Awaiting Approval">
                <Button shape="circle" disabled icon={<ClockCircleOutlined />} />
              </Tooltip>
            )}
            <Tooltip title="Reject Verification">
              <Button 
                shape="circle" 
                danger 
                icon={<CloseCircleOutlined />} 
                onClick={() => setVerificationRejectionModal(true)}
              />
            </Tooltip>
          </>
        )}

        {['pending_approval', 'under_review'].includes(status) && canApprovePermit(permit) && (
          <>
            {!permit.signatures_by_type?.approver ? (
              <Tooltip title="Sign as Approver">
                <Button 
                  shape="circle" 
                  type="primary" 
                  icon={<CheckCircleOutlined />} 
                  onClick={() => handleAddSignature('approver')}
                  loading={signatureSaving}
                />
              </Tooltip>
            ) : (
              <Tooltip title="Approve Permit">
                <Button 
                  shape="circle" 
                  type="primary" 
                  icon={<CheckCircleOutlined />} 
                  onClick={() => setApprovalModal(true)}
                />
              </Tooltip>
            )}
            <Tooltip title="Reject Permit">
              <Button 
                shape="circle" 
                danger 
                icon={<CloseCircleOutlined />} 
                onClick={() => setRejectionModal(true)}
              />
            </Tooltip>
          </>
        )}

        {(status === 'draft' || status === 'submitted') &&
          permit.created_by === useAuthStore.getState().userId && (
          <Tooltip title={permit.verifier ? 'Change Verifier' : 'Assign Verifier'}>
            <Button 
              shape="circle" 
              icon={<TeamOutlined />} 
              onClick={() => {
                fetchAvailableVerifiers();
                Modal.confirm({
                  title: permit.verifier ? 'Change Verifier' : 'Assign Verifier',
                  content: (
                    <div>
                      {permit.verifier ? (
                        <div>
                          <p>Current verifier: <strong>{getDisplayName(permit.verifier_details)}</strong></p>
                          <p>Select a new verifier:</p>
                        </div>
                      ) : (
                        <p>Select a verifier for this permit:</p>
                      )}
                      <Select
                        placeholder="Select verifier"
                        style={{ width: '100%' }}
                        showSearch
                        loading={loadingVerifiers}
                        optionFilterProp="children"
                        onChange={(verifierId) => {
                          (window as any).selectedVerifierId = verifierId;
                        }}
                      >
                        {availableVerifiers.map(verifier => (
                          <Select.Option key={verifier.id} value={verifier.id}>
                            {getUserDisplayName(verifier)} ({(getUserAdminType(verifier) || 'user').toUpperCase()} - Grade {(getUserGrade(verifier) || '').toUpperCase()})
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                  ),
                  onOk: async () => {
                    const verifierId = (window as any).selectedVerifierId;
                    if (verifierId) {
                      try {
                        await api.post(`/api/v1/ptw/permits/${id}/workflow/assign-verifier/`, {
                          verifier_id: verifierId
                        });
                        message.success(permit.verifier ? 'Verifier updated successfully' : 'Verifier assigned successfully');
                        fetchPermit();
                      } catch (error: any) {
                        message.error(permit.verifier ? 'Failed to update verifier' : 'Failed to assign verifier');
                      }
                    } else {
                      message.warning('Please select a verifier');
                    }
                  }
                });
              }}
            />
          </Tooltip>
        )}

        {status === 'submitted' && !canVerifyPermit(permit) && (
          <Tooltip title="Awaiting Verification">
            <Button shape="circle" disabled icon={<ClockCircleOutlined />} />
          </Tooltip>
        )}

        {status === 'approved' && (
          <Tooltip title="Start Work">
            <Button 
              shape="circle" 
              type="primary" 
              icon={<ToolOutlined />} 
              onClick={handleStartWork}
            />
          </Tooltip>
        )}

        {status === 'active' && (
          <>
            <Tooltip title="Complete Work">
              <Button 
                shape="circle" 
                type="primary" 
                icon={<CheckCircleOutlined />} 
                onClick={handleCompleteWork}
              />
            </Tooltip>
            <Tooltip title="Request Extension">
              <Button 
                shape="circle" 
                icon={<ClockCircleOutlined />} 
                onClick={() => setExtensionModal(true)}
              />
            </Tooltip>
          </>
        )}

        {status === 'completed' && (
          <Tooltip title="Close Permit">
            <Button 
              shape="circle" 
              type="primary" 
              icon={<CheckCircleOutlined />} 
              onClick={handleClosePermit}
            />
          </Tooltip>
        )}

        <Tooltip title="Back to List">
          <Button 
            shape="circle" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/dashboard/ptw')}
          />
        </Tooltip>
      </Space>
    );
  };
  
  if (loading) {
    return <Spin size="large" />;
  }
  
  if (!permit) {
    return <div>Permit not found</div>;
  }
  
  return (
    <div style={{ height: '100%' }}>
      {/* Header with Actions */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Permit: {permit.permit_number}</Title>
          <Typography.Text type="secondary">{permit.permit_type_details?.name}</Typography.Text>
        </div>
        <Space size="small">
          {getStatusTag(permit.status)}
          <Tooltip title={!permit?.id || typeof permit.id !== 'number' || id === 'new' ? 'Save permit first to generate QR code' : 'Generate QR code for mobile access'}>
            <Button 
              shape="circle"
              icon={<QrcodeOutlined />} 
              onClick={handleGenerateQR}
              loading={qrLoading}
              disabled={!permit?.id || typeof permit.id !== 'number' || id === 'new'}
            />
          </Tooltip>
          <Tooltip title="Print Permit">
            <Button
              shape="circle"
              icon={<PrinterOutlined />}
              onClick={() => window.open(`/dashboard/ptw/print/${permit.id}`, '_blank')}
            />
          </Tooltip>
        </Space>
      </div>
      <Card style={{ height: '100%' }}>
        
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Permit Type">
            <Tag color={permit.permit_type_details?.color_code}>
              {permit.permit_type_details?.name}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Risk Level">
            {permit.permit_type_details?.risk_level.toUpperCase()}
          </Descriptions.Item>
          
          <Descriptions.Item label="Location">
            {permit.location}
          </Descriptions.Item>
          <Descriptions.Item label="Department">
            {permit.project?.department || 'N/A'}
          </Descriptions.Item>
          
          <Descriptions.Item label="Planned Start">
            {dayjs(permit.planned_start_time).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Planned End">
            {dayjs(permit.planned_end_time).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          
          <Descriptions.Item label="Actual Start" span={2}>
            {permit.actual_start_time 
              ? dayjs(permit.actual_start_time).format('YYYY-MM-DD HH:mm')
              : 'Not started yet'}
          </Descriptions.Item>
          
          <Descriptions.Item label="Actual End" span={2}>
            {permit.actual_end_time 
              ? dayjs(permit.actual_end_time).format('YYYY-MM-DD HH:mm')
              : 'Not completed yet'}
          </Descriptions.Item>
          
          <Descriptions.Item label="Created By" span={2}>
            {permit.created_by_details?.name || 'Unknown'}
          </Descriptions.Item>

          {permit.verifier && (
            <Descriptions.Item label="Verified By" span={2}>
              {permit.verifier_details?.name || 'Unknown'}
              {permit.verified_at && ` on ${dayjs(permit.verified_at).format('YYYY-MM-DD HH:mm')}`}
            </Descriptions.Item>
          )}

          {permit.verification_comments && (
            <Descriptions.Item label="Verification Comments" span={2}>
              {permit.verification_comments}
            </Descriptions.Item>
          )}

          {permit.approved_by && (
            <Descriptions.Item label="Approved By" span={2}>
              {permit.approved_by_details?.name || 'Unknown'}
              {permit.approved_at && ` on ${dayjs(permit.approved_at).format('YYYY-MM-DD HH:mm')}`}
            </Descriptions.Item>
          )}

          {permit.approval_comments && (
            <Descriptions.Item label="Approval Comments" span={2}>
              {permit.approval_comments}
            </Descriptions.Item>
          )}

          <Descriptions.Item label="Description" span={2}>
            {permit.description}
          </Descriptions.Item>
        </Descriptions>
        
        <Divider />
        
        <Tabs activeKey={activeTabKey} onChange={setActiveTabKey}>
          <TabPane 
            tab={<span><SafetyOutlined />Risk Assessment</span>}
            key="1"
          >
            <Descriptions bordered column={1}>
  
              
              <Descriptions.Item label="Control Measures">
                {permit.control_measures}
              </Descriptions.Item>
              
              <Descriptions.Item label="PPE Requirements">
                {Array.isArray(permit.ppe_requirements)
                  ? permit.ppe_requirements.join(', ')
                  : permit.ppe_requirements}
              </Descriptions.Item>
              
              <Descriptions.Item label="Emergency Procedures">
                {permit.emergency_procedures}
              </Descriptions.Item>
              
              <Descriptions.Item label="Risk Assessment Completed">
                {permit.risk_assessment_completed ? 'Yes' : 'No'}
              </Descriptions.Item>
            </Descriptions>
          </TabPane>
          
          <TabPane 
            tab={<span><TeamOutlined />Workers</span>}
            key="2"
          >
            <Table 
              dataSource={permit.assigned_workers || []}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Name',
                  dataIndex: ['worker_details', 'name'],
                  key: 'name',
                },
                {
                  title: 'Employee ID',
                  dataIndex: ['worker_details', 'employee_id'],
                  key: 'employee_id',
                },
                {
                  title: 'Position',
                  dataIndex: ['worker_details', 'position'],
                  key: 'position',
                },
                {
                  title: 'Assigned On',
                  dataIndex: 'assigned_at',
                  key: 'assigned_at',
                  render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
                }
              ]}
            />
          </TabPane>

          <TabPane
            tab={<span><ToolOutlined />Toolbox Talk</span>}
            key="tbt"
          >
            <Card title="Toolbox Talk Details" size="small" style={{ marginBottom: 16 }}>
              <Form form={tbtForm} layout="vertical">
                <Form.Item name="title" label="TBT Title">
                  <Input placeholder="Toolbox talk topic" />
                </Form.Item>
                <Form.Item name="conducted_at" label="Conducted At">
                  <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="conducted_by" label="Conducted By">
                  <Select
                    placeholder="Select conductor"
                    options={[
                      permit.created_by ? { value: permit.created_by, label: getDisplayName(permit.created_by_details) } : null,
                      permit.verifier ? { value: permit.verifier, label: getDisplayName(permit.verifier_details) } : null,
                      permit.approved_by ? { value: permit.approved_by, label: getDisplayName(permit.approved_by_details) } : null,
                    ].filter(Boolean) as { value: number; label: string }[]}
                  />
                </Form.Item>
                <Form.Item name="url" label="TBT Link">
                  <Input placeholder="https://..." />
                </Form.Item>
                <Form.Item label="TBT Document">
                  <input
                    type="file"
                    onChange={(event) => setTbtFile(event.target.files?.[0] || null)}
                  />
                  {tbt?.document && (
                    <div style={{ marginTop: 8 }}>
                      <a href={tbt.document} target="_blank" rel="noreferrer">
                        View existing document
                      </a>
                    </div>
                  )}
                </Form.Item>
                <Form.Item name="notes" label="Notes">
                  <TextArea rows={3} placeholder="Additional notes" />
                </Form.Item>
                <Button type="primary" onClick={handleUpdateTbt} loading={tbtUpdating}>
                  Save Toolbox Talk
                </Button>
              </Form>
            </Card>

            <Card title="Work Team Attendance" size="small">
              {tbtLoading ? (
                <Spin />
              ) : (
                <Table
                  dataSource={(permit.assigned_workers || []).map(worker => {
                    const attendance = (tbtAttendance || []).find(item => item.permit_worker === worker.id);
                    return {
                      key: worker.id,
                      worker,
                      attendance
                    };
                  })}
                  pagination={false}
                  columns={[
                    {
                      title: 'Name',
                      key: 'name',
                      render: (_, record) => record.worker?.worker_details
                        ? `${record.worker.worker_details.name} ${record.worker.worker_details.surname || ''}`.trim()
                        : 'Unknown'
                    },
                    {
                      title: 'Designation',
                      key: 'designation',
                      render: (_, record) => record.worker?.worker_details?.designation || '-'
                    },
                    {
                      title: 'Company',
                      key: 'company',
                      render: (_, record) => record.worker?.worker_details?.company || '-'
                    },
                    {
                      title: 'TBT Acknowledged',
                      key: 'acknowledged',
                      render: (_, record) => (
                        <Checkbox
                          checked={Boolean(record.attendance?.acknowledged)}
                          onChange={(event) => handleTbtAck(record.worker.id, event.target.checked)}
                        />
                      )
                    },
                    {
                      title: 'Ack Time',
                      key: 'ack_time',
                      render: (_, record) => record.attendance?.acknowledged_at
                        ? dayjs(record.attendance.acknowledged_at).format('YYYY-MM-DD HH:mm')
                        : '-'
                    }
                  ]}
                />
              )}
            </Card>
          </TabPane>
          
          <TabPane 
            tab={<span><HistoryOutlined />Audit Trail</span>}
            key="3"
          >
            <Timeline mode="left">
              {permit.audit_trail?.map((audit: Types.PermitAudit) => (
                <Timeline.Item 
                  key={audit.id}
                  color={audit.action.includes('approved') ? 'green' : 
                         audit.action.includes('rejected') ? 'red' : 'blue'}
                >
                  <p>
                    <strong>{audit.action}</strong> by {audit.user_details?.name || 'System'}
                  </p>
                  <p>{dayjs(audit.timestamp).format('YYYY-MM-DD HH:mm:ss')}</p>
                  {audit.comments && <p>Comments: {audit.comments}</p>}
                </Timeline.Item>
              ))}
            </Timeline>
          </TabPane>
          
          <TabPane 
            tab={<span><ToolOutlined />Isolation</span>}
            key="isolation"
          >
            {isolationLoading ? (
              <Spin />
            ) : (
              <div>
                {isolationUnavailable && (
                  <Alert
                    message="Isolation details not available"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}
                {libraryUnavailable && (
                  <Alert
                    message="Isolation library not available"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}
                {isolation?.summary && (
                  <Card size="small" style={{ marginBottom: 16, background: '#f0f5ff' }}>
                    <Space size="large">
                      <Text>Total: <strong>{isolation.summary.total}</strong></Text>
                      <Text>Required: <strong>{isolation.summary.required}</strong></Text>
                      <Text type="success">Verified: <strong>{isolation.summary.verified}</strong></Text>
                      <Text type="warning">Pending: <strong>{isolation.summary.pending_verification}</strong></Text>
                      <Text>De-isolated: <strong>{isolation.summary.deisolated}</strong></Text>
                    </Space>
                  </Card>
                )}

                <Card title="Assign Isolation Points" size="small" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Select
                      showSearch
                      placeholder="Search and select library point"
                      style={{ width: '100%' }}
                      loading={libraryLoading}
                      onSelect={handleAssignLibraryPoint}
                      filterOption={(input, option: any) =>
                        option?.children?.toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {libraryPoints.map(point => (
                        <Select.Option key={point.id} value={point.id}>
                          {point.point_code} - {point.point_type} ({point.energy_type}) - {point.location}
                        </Select.Option>
                      ))}
                    </Select>

                    <Button onClick={() => setShowCustomForm(!showCustomForm)}>
                      {showCustomForm ? 'Hide' : 'Add Custom Point'}
                    </Button>

                    {showCustomForm && (
                      <Form onFinish={handleAddCustomPoint} layout="vertical">
                        <Form.Item name="custom_point_name" label="Point Name" rules={[{ required: true }]}>
                          <Input placeholder="e.g., Temporary Disconnect" />
                        </Form.Item>
                        <Form.Item name="custom_point_details" label="Details">
                          <TextArea rows={2} placeholder="Additional details" />
                        </Form.Item>
                        <Form.Item name="lock_count" label="Lock Count" initialValue={1}>
                          <Input type="number" min={0} />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" loading={isolationLoading}>
                          Add Custom Point
                        </Button>
                      </Form>
                    )}
                  </Space>
                </Card>

                <Table
                  dataSource={isolation?.points || []}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: 'Point',
                      key: 'point',
                      render: (_, record) => (
                        <div>
                          <Text strong>
                            {record.point_details?.point_code || record.custom_point_name}
                          </Text>
                          {record.point_details && (
                            <div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {record.point_details.location}
                              </Text>
                            </div>
                          )}
                        </div>
                      )
                    },
                    {
                      title: 'Type',
                      key: 'type',
                      render: (_, record) => (
                        <Space direction="vertical" size="small">
                          <Tag>{record.point_details?.point_type || 'Custom'}</Tag>
                          <Tag color="blue">{record.point_details?.energy_type || 'N/A'}</Tag>
                        </Space>
                      )
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status) => {
                        const colors: Record<string, string> = {
                          assigned: 'default',
                          isolated: 'orange',
                          verified: 'green',
                          deisolated: 'blue',
                          cancelled: 'red'
                        };
                        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
                      }
                    },
                    {
                      title: 'Lock Info',
                      key: 'lock',
                      render: (_, record) => (
                        <div>
                          {record.lock_applied && (
                            <div>
                              <Text>Count: {record.lock_count}</Text>
                              {record.lock_ids.length > 0 && (
                                <div>
                                  {record.lock_ids.map((id, idx) => (
                                    <Tag key={idx} style={{ marginTop: 4 }}>{id}</Tag>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_, record) => (
                        <Space direction="vertical" size="small">
                          {record.status === 'assigned' && (
                            <Button
                              size="small"
                              onClick={() => {
                                Modal.confirm({
                                  title: 'Mark as Isolated',
                                  content: (
                                    <Form
                                      id="isolate-form"
                                      onFinish={(values) => {
                                        handleIsolationAction(record.id, 'isolate', {
                                          lock_applied: true,
                                          lock_count: values.lock_count || record.lock_count,
                                          lock_ids: values.lock_ids?.split(',').map((s: string) => s.trim()) || []
                                        });
                                        Modal.destroyAll();
                                      }}
                                    >
                                      <Form.Item name="lock_count" label="Lock Count" initialValue={record.lock_count}>
                                        <Input type="number" min={0} />
                                      </Form.Item>
                                      <Form.Item name="lock_ids" label="Lock IDs (comma-separated)">
                                        <Input placeholder="LOCK-001, LOCK-002" />
                                      </Form.Item>
                                    </Form>
                                  ),
                                  onOk: () => {
                                    const form = document.getElementById('isolate-form') as HTMLFormElement;
                                    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                  }
                                });
                              }}
                            >
                              Mark Isolated
                            </Button>
                          )}
                          {record.status === 'isolated' && (
                            <Button
                              size="small"
                              type="primary"
                              onClick={() => {
                                Modal.confirm({
                                  title: 'Verify Isolation',
                                  content: (
                                    <Form
                                      id="verify-form"
                                      onFinish={(values) => {
                                        handleIsolationAction(record.id, 'verify', {
                                          verification_notes: values.verification_notes
                                        });
                                        Modal.destroyAll();
                                      }}
                                    >
                                      <Form.Item name="verification_notes" label="Verification Notes">
                                        <TextArea rows={3} placeholder="Zero energy confirmed..." />
                                      </Form.Item>
                                    </Form>
                                  ),
                                  onOk: () => {
                                    const form = document.getElementById('verify-form') as HTMLFormElement;
                                    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                  }
                                });
                              }}
                            >
                              Verify
                            </Button>
                          )}
                          {record.status === 'verified' && (
                            <Button
                              size="small"
                              onClick={() => {
                                Modal.confirm({
                                  title: 'De-isolate Point',
                                  content: (
                                    <Form
                                      id="deisolate-form"
                                      onFinish={(values) => {
                                        handleIsolationAction(record.id, 'deisolate', {
                                          deisolated_notes: values.deisolated_notes
                                        });
                                        Modal.destroyAll();
                                      }}
                                    >
                                      <Form.Item name="deisolated_notes" label="De-isolation Notes">
                                        <TextArea rows={3} placeholder="System restored to normal..." />
                                      </Form.Item>
                                    </Form>
                                  ),
                                  onOk: () => {
                                    const form = document.getElementById('deisolate-form') as HTMLFormElement;
                                    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                  }
                                });
                              }}
                            >
                              De-isolate
                            </Button>
                          )}
                        </Space>
                      )
                    }
                  ]}
                />

                {(!isolation?.points || isolation.points.length === 0) && (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <Text type="secondary">No isolation points assigned. Select from library or add custom point above.</Text>
                  </div>
                )}
              </div>
            )}
          </TabPane>
          
          <TabPane 
            tab={<span><CheckCircleOutlined />Closeout</span>}
            key="closeout"
          >
            {closeoutLoading ? (
              <Spin />
            ) : !closeout?.template_details ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text type="secondary">No closeout checklist configured for this permit type.</Text>
              </div>
            ) : (
              <div>
                {closeout.completed && (
                  <div style={{ marginBottom: 16 }}>
                    <Tag color="success" icon={<CheckCircleOutlined />}>Closeout Completed</Tag>
                    <Text type="secondary">
                      {' '}by {closeout.completed_by_details?.full_name || 'Unknown'} on{' '}
                      {closeout.completed_at ? dayjs(closeout.completed_at).format('YYYY-MM-DD HH:mm') : 'Unknown'}
                    </Text>
                  </div>
                )}
                
                <div style={{ marginBottom: 16 }}>
                  {closeout.template_details.items.map((item) => (
                    <div key={item.key} style={{ marginBottom: 12, padding: 12, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                      <Space>
                        <input
                          type="checkbox"
                          checked={closeoutChecklist[item.key]?.done || false}
                          onChange={(e) => handleChecklistItemChange(item.key, e.target.checked)}
                          disabled={closeout.completed}
                          style={{ cursor: closeout.completed ? 'not-allowed' : 'pointer' }}
                        />
                        <Text strong={item.required}>{item.label}</Text>
                        {item.required && <Tag color="red">Required</Tag>}
                      </Space>
                    </div>
                  ))}
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Remarks:</Text>
                  <TextArea
                    rows={3}
                    value={closeoutRemarks}
                    onChange={(e) => setCloseoutRemarks(e.target.value)}
                    placeholder="Add any closeout remarks or notes"
                    disabled={closeout.completed}
                    style={{ marginTop: 8 }}
                  />
                </div>
                
                {!closeout.completed && (
                  <Space>
                    <Button 
                      onClick={handleSaveCloseout}
                      loading={closeoutLoading}
                    >
                      Save Progress
                    </Button>
                    <Button 
                      type="primary"
                      onClick={handleCompleteCloseout}
                      loading={closeoutLoading}
                      disabled={!closeout.is_complete}
                      icon={<CheckCircleOutlined />}
                    >
                      Mark Closeout Complete
                    </Button>
                  </Space>
                )}
                
                {closeout.missing_items && closeout.missing_items.length > 0 && (
                  <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4 }}>
                    <Text type="warning" strong>Missing Required Items:</Text>
                    <ul style={{ marginTop: 8, marginBottom: 0 }}>
                      {closeout.missing_items.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabPane>
          
          <TabPane 
            tab={<span><CheckCircleOutlined /> Readiness</span>} 
            key="6"
          >
            <ReadinessPanel 
              permitId={permit.id} 
              refreshTrigger={readinessRefresh}
            />
          </TabPane>

          <TabPane
            tab={<span><FileTextOutlined />Signatures</span>}
            key="signatures"
          >
            <Card size="small" title="Digital Signatures">
              {(() => {
                const signatureMap = permit.signatures_by_type || {};
                const currentUserId = useAuthStore.getState().userId;
                const canSignRequestor = Number(currentUserId) === Number(permit.created_by);
                const canSignVerifier = Number(currentUserId) === Number(permit.verifier) && permit.verifier;
                const canSignApprover = Number(currentUserId) === Number(permit.approver || permit.approved_by);

                const renderSignatureCard = (
                  label: string,
                  signature: Types.DigitalSignature | null | undefined,
                  canSign: boolean,
                  signatureType: 'requestor' | 'verifier' | 'approver',
                  fallbackName: string
                ) => {
                  const isAlreadySigned = Boolean(signature);
                  const shouldShowButton = canSign && !isAlreadySigned;
                  
                  return (
                    <Card size="small" style={{ flex: 1, minWidth: 220 }}>
                      <Title level={5} style={{ marginTop: 0 }}>{label}</Title>
                      <div><Text strong>Name:</Text> {getDisplayName(signature?.signatory_details) || fallbackName}</div>
                      <div><Text strong>Date:</Text> {signature?.signed_at ? dayjs(signature.signed_at).format('YYYY-MM-DD HH:mm') : 'Pending'}</div>
                      <div style={{ marginTop: 8, minHeight: 60, borderBottom: '1px solid #ddd' }}>
                        {signature?.signature_payload ? (
                          <div className="signature-json-display">
                            <svg 
                              viewBox="0 0 300 100" 
                              style={{ width: '100%', maxHeight: '60px', border: '1px solid #ddd' }}
                              preserveAspectRatio="xMidYMid meet"
                            >
                              {signature.signature_payload.strokes?.map((stroke: any, index: number) => {
                                if (!stroke.points || !Array.isArray(stroke.points)) return null;
                                
                                const pathData = stroke.points.reduce((path: string, point: any, i: number) => {
                                  const x = point.x || 0;
                                  const y = point.y || 0;
                                  return path + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
                                }, '');

                                return (
                                  <path
                                    key={index}
                                    d={pathData}
                                    stroke={stroke.color || '#000'}
                                    strokeWidth={stroke.width || 2}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                );
                              })}
                            </svg>
                          </div>
                        ) : (
                          <Text type="secondary">Signature: __________________</Text>
                        )}
                      </div>
                      {shouldShowButton && (
                        <Button
                          type="primary"
                          onClick={() => handleAddSignature(signatureType)}
                          loading={signatureSaving}
                          style={{ marginTop: 12 }}
                        >
                          Sign as {label}
                        </Button>
                      )}
                      {isAlreadySigned && (
                        <div style={{ marginTop: 12 }}>
                          <Tag color="green" icon={<CheckCircleOutlined />}>Signed</Tag>
                        </div>
                      )}
                    </Card>
                  );
                };

                return (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {renderSignatureCard(
                      'Requestor',
                      signatureMap.requestor,
                      canSignRequestor,
                      'requestor',
                      getDisplayName(permit.created_by_details)
                    )}
                    {renderSignatureCard(
                      'Verifier',
                      signatureMap.verifier,
                      canSignVerifier,
                      'verifier',
                      getDisplayName(permit.verifier_details)
                    )}
                    {renderSignatureCard(
                      'Approver',
                      signatureMap.approver,
                      canSignApprover,
                      'approver',
                      getDisplayName(permit.approved_by_details)
                    )}
                  </div>
                );
              })()}
            </Card>
          </TabPane>
        </Tabs>
        
        <Divider />
        
        <div className="permit-actions">
          {renderActionButtons()}
        </div>
      </Card>
      
      {/* Approval Modal */}
      <Modal
        title="Approve Permit"
        open={approvalModal}
        onOk={handleApprove}
        onCancel={() => setApprovalModal(false)}
        confirmLoading={actionLoading}
      >
        <Form form={approvalForm} layout="vertical">
          <Form.Item
            name="comments"
            label="Comments (Optional)"
          >
            <TextArea rows={4} placeholder="Add any comments or conditions" />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Rejection Modal */}
      <Modal
        title="Reject Permit"
        open={rejectionModal}
        onOk={handleReject}
        onCancel={() => setRejectionModal(false)}
        confirmLoading={actionLoading}
      >
        <Form form={rejectionForm} layout="vertical">
          <Form.Item
            name="comments"
            label="Reason for Rejection"
            rules={[{ required: true, message: 'Please provide a reason for rejection' }]}
          >
            <TextArea rows={4} placeholder="Explain why this permit is being rejected" />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Extension Request Modal */}
      <Modal
        title="Request Time Extension"
        open={extensionModal}
        onOk={handleRequestExtension}
        onCancel={() => setExtensionModal(false)}
        confirmLoading={actionLoading}
      >
        <Form form={extensionForm} layout="vertical">
          <Form.Item
            name="new_end_time"
            label="New End Time"
            rules={[{ required: true, message: 'Please select new end time' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              disabledDate={(current) => {
                // Can't select days before today
                return current && current < dayjs().startOf('day');
              }}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason for Extension"
            rules={[{ required: true, message: 'Please provide a reason for extension' }]}
          >
            <TextArea rows={4} placeholder="Explain why an extension is needed" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Verification Modal */}
      <Modal
        title="Verify Permit"
        open={verificationModal}
        onOk={handleVerify}
        onCancel={() => {
          setVerificationModal(false);
          setAvailableApprovers([]);
          verificationForm.resetFields();
        }}
        confirmLoading={actionLoading}
        width={600}
        destroyOnClose
      >
        <Form form={verificationForm} layout="vertical">
          <Form.Item
            name="approver_id"
            label="Select Approver"
            rules={[{ required: true, message: 'Please select an approver' }]}
          >
            <Select
              placeholder="Select approver for next stage"
              loading={loadingApprovers}
              showSearch
              optionFilterProp="children"
              notFoundContent={loadingApprovers ? 'Loading...' : 'No approvers available'}
            >
              {availableApprovers.map(approver => (
                <Select.Option key={approver.id} value={approver.id}>
                  {getUserDisplayName(approver)} ({(getUserAdminType(approver) || 'user').toUpperCase()} - Grade {(getUserGrade(approver) || '').toUpperCase()})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          
          <Form.Item
            name="comments"
            label="Verification Comments (Optional)"
          >
            <TextArea rows={4} placeholder="Add any verification comments or conditions" />
          </Form.Item>
        </Form>
        {availableApprovers.length === 0 && !loadingApprovers && (
          <div style={{ marginBottom: 16, padding: 8, backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4 }}>
            <Text type="warning">No approvers available. Please contact your administrator.</Text>
          </div>
        )}
      </Modal>

      {/* Verification Rejection Modal */}
      <Modal
        title="Reject Verification"
        open={verificationRejectionModal}
        onOk={handleRejectVerification}
        onCancel={() => setVerificationRejectionModal(false)}
        confirmLoading={actionLoading}
      >
        <Form form={verificationRejectionForm} layout="vertical">
          <Form.Item
            name="comments"
            label="Reason for Rejection"
            rules={[{ required: true, message: 'Please provide a reason for rejection' }]}
          >
            <TextArea rows={4} placeholder="Explain why this permit verification is being rejected" />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* QR Code Modal */}
      <Modal
        title="QR Code for Mobile Access"
        open={qrModal}
        onCancel={() => setQrModal(false)}
        footer={[
          <Button key="close" onClick={() => setQrModal(false)}>
            Close
          </Button>
        ]}
        width={400}
      >
        <div style={{ textAlign: 'center' }}>
          {qrImage && (
            <>
              <Image
                src={qrImage}
                alt="Permit QR Code"
                style={{ maxWidth: '300px', marginBottom: '16px' }}
              />
              <div>
                <Typography.Text type="secondary">
                  Scan this QR code with your mobile device to access permit details
                </Typography.Text>
              </div>
              {qrMobileUrl && (
                <div style={{ marginTop: 8 }}>
                  <Typography.Text type="secondary">Mobile Access:</Typography.Text>{' '}
                  <Typography.Link href={qrMobileUrl} target="_blank" rel="noreferrer">
                    {qrMobileUrl}
                  </Typography.Link>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PermitDetail;

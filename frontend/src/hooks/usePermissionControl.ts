import { useState, useCallback } from 'react';
import { message } from 'antd';
import api from '../common/utils/axiosetup';

interface UsePermissionControlProps {
  onPermissionGranted?: () => void;
}

export const usePermissionControl = ({ onPermissionGranted }: UsePermissionControlProps = {}) => {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionRequest, setPermissionRequest] = useState<{
    permissionType: 'edit' | 'delete';
    objectId: number;
    contentType: string;
    objectName: string;
  } | null>(null);

  const handleApiError = useCallback((error: any, operation: string) => {
    if (error.response?.status === 403 && error.response?.data?.action === 'request_permission') {
      const errorData = error.response.data;
      setPermissionRequest({
        permissionType: errorData.permission_type,
        objectId: errorData.object_id,
        contentType: errorData.content_type,
        objectName: `Item #${errorData.object_id}`
      });
      setShowPermissionModal(true);
      return true; // Handled
    }
    
    message.error(error.response?.data?.error || `Failed to ${operation}`);
    return false; // Not handled
  }, []);

  const executeWithPermission = useCallback(async (
    apiCall: () => Promise<any>,
    operation: string = 'perform operation'
  ) => {
    try {
      const result = await apiCall();
      onPermissionGranted?.();
      return result;
    } catch (error: any) {
      const handled = handleApiError(error, operation);
      if (!handled) {
        throw error;
      }
    }
  }, [handleApiError, onPermissionGranted]);

  const closePermissionModal = useCallback(() => {
    setShowPermissionModal(false);
    setPermissionRequest(null);
  }, []);

  const onPermissionRequestSuccess = useCallback(() => {
    closePermissionModal();
    message.info('Permission request sent. You will be notified when approved.');
  }, [closePermissionModal]);

  return {
    showPermissionModal,
    permissionRequest,
    executeWithPermission,
    closePermissionModal,
    onPermissionRequestSuccess
  };
};
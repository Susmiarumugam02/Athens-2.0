import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import api from '@common/utils/axiosetup';
import { 
  QueueItem, SyncStatusInfo, SyncPayload, SyncResponse, 
  SyncEntity, SyncOperation 
} from '../types/offlineSync';

const STORAGE_KEY = 'ptw_offline_queue';
const DEVICE_ID_KEY = 'ptw_device_id';

const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const useOfflineSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    conflictCount: 0,
    lastSync: null,
    syncProgress: 0
  });

  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setQueue(data);
        updateSyncStatus(data);
      } catch (error) {
        console.error('Failed to load offline queue', error);
      }
    }
  }, []);

  const updateSyncStatus = (queueData: QueueItem[]) => {
    setSyncStatus(prev => ({
      ...prev,
      pendingCount: queueData.filter(item => item.status === 'pending').length,
      conflictCount: queueData.filter(item => item.status === 'conflict').length
    }));
  };

  const saveQueue = useCallback((queueData: QueueItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queueData));
      setQueue(queueData);
      updateSyncStatus(queueData);
    } catch (error) {
      message.error('Failed to save offline queue');
    }
  }, []);

  const addToQueue = useCallback((
    entity: SyncEntity,
    op: SyncOperation,
    payload: any,
    server_id?: number,
    client_version?: number
  ): string => {
    const offline_id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newItem: QueueItem = {
      id: offline_id,
      entity,
      op,
      offline_id,
      server_id,
      client_version,
      payload,
      status: 'pending',
      created_at: new Date().toISOString(),
      attempts: 0
    };

    const updatedQueue = [...queue, newItem];
    saveQueue(updatedQueue);
    
    if (!syncStatus.isOnline) {
      message.info('Saved offline - will sync when connection restored');
    }
    
    return offline_id;
  }, [queue, saveQueue, syncStatus.isOnline]);

  const syncNow = useCallback(async () => {
    if (!syncStatus.isOnline || syncStatus.isSyncing) {
      return;
    }

    const pendingItems = queue.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) {
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncProgress: 0 }));

    try {
      const payload: SyncPayload = {
        device_id: getDeviceId(),
        client_time: new Date().toISOString(),
        changes: pendingItems.map(item => ({
          entity: item.entity,
          op: item.op,
          offline_id: item.offline_id,
          server_id: item.server_id,
          client_version: item.client_version,
          data: item.payload
        }))
      };

      const response = await api.post<SyncResponse>('/api/v1/ptw/sync-offline-data/', payload);
      const { applied, conflicts, rejected } = response.data;

      let updatedQueue = [...queue];

      // Mark applied items as synced
      applied.forEach(appliedItem => {
        const idx = updatedQueue.findIndex(q => q.offline_id === appliedItem.offline_id);
        if (idx !== -1) {
          updatedQueue[idx] = {
            ...updatedQueue[idx],
            status: 'synced',
            server_id: appliedItem.server_id,
            client_version: appliedItem.new_version
          };
        }
      });

      // Mark conflicts
      conflicts.forEach(conflict => {
        const idx = updatedQueue.findIndex(q => q.offline_id === conflict.offline_id);
        if (idx !== -1) {
          updatedQueue[idx] = {
            ...updatedQueue[idx],
            status: 'conflict',
            conflict,
            attempts: updatedQueue[idx].attempts + 1
          };
        }
      });

      // Mark rejected as failed
      rejected.forEach(rejectedItem => {
        const idx = updatedQueue.findIndex(q => q.offline_id === rejectedItem.offline_id);
        if (idx !== -1) {
          updatedQueue[idx] = {
            ...updatedQueue[idx],
            status: 'failed',
            error: rejectedItem.reason,
            attempts: updatedQueue[idx].attempts + 1
          };
        }
      });

      saveQueue(updatedQueue);

      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date().toISOString(),
        syncProgress: 100
      }));

      if (applied.length > 0) {
        message.success(`Synced ${applied.length} items`);
      }
      if (conflicts.length > 0) {
        message.warning(`${conflicts.length} conflicts need resolution`);
      }
      if (rejected.length > 0) {
        message.error(`${rejected.length} items failed`);
      }

      // Clean up old synced items (older than 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      updatedQueue = updatedQueue.filter(item => 
        item.status !== 'synced' || new Date(item.created_at) > sevenDaysAgo
      );
      saveQueue(updatedQueue);

    } catch (error: any) {
      setSyncStatus(prev => ({ ...prev, isSyncing: false, syncProgress: 0 }));
      message.error('Sync failed: ' + (error.response?.data?.error || error.message));
    }
  }, [syncStatus.isOnline, syncStatus.isSyncing, queue, saveQueue]);

  const resolveConflict = useCallback((
    offline_id: string,
    resolution: 'keep_mine' | 'use_server' | 'merge',
    mergedData?: any
  ) => {
    const item = queue.find(q => q.offline_id === offline_id);
    if (!item || !item.conflict) return;

    let updatedQueue = [...queue];
    const idx = updatedQueue.findIndex(q => q.offline_id === offline_id);

    if (resolution === 'use_server') {
      // Mark as synced with server state
      updatedQueue[idx] = {
        ...updatedQueue[idx],
        status: 'synced',
        server_id: item.conflict.server_id,
        client_version: item.conflict.server_version
      };
      message.success('Using server version');
    } else if (resolution === 'keep_mine') {
      // Retry with force flag or updated version
      updatedQueue[idx] = {
        ...updatedQueue[idx],
        status: 'pending',
        client_version: item.conflict.server_version,
        conflict: undefined,
        attempts: 0
      };
      message.info('Will retry with your changes');
    } else if (resolution === 'merge' && mergedData) {
      // Apply merged data
      updatedQueue[idx] = {
        ...updatedQueue[idx],
        status: 'pending',
        payload: mergedData,
        client_version: item.conflict.server_version,
        conflict: undefined,
        attempts: 0
      };
      message.info('Will sync merged version');
    }

    saveQueue(updatedQueue);
  }, [queue, saveQueue]);

  const removeFromQueue = useCallback((offline_id: string) => {
    const updatedQueue = queue.filter(q => q.offline_id !== offline_id);
    saveQueue(updatedQueue);
    message.success('Item removed from queue');
  }, [queue, saveQueue]);

  const clearSynced = useCallback(() => {
    const updatedQueue = queue.filter(q => q.status !== 'synced');
    saveQueue(updatedQueue);
    message.success('Cleared synced items');
  }, [queue, saveQueue]);

  const getConflicts = useCallback(() => {
    return queue.filter(item => item.status === 'conflict');
  }, [queue]);

  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      if (queue.some(item => item.status === 'pending')) {
        setTimeout(() => syncNow(), 1000);
      }
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queue, syncNow]);

  // Auto-sync every 5 minutes if online
  useEffect(() => {
    if (!syncStatus.isOnline) return;

    const interval = setInterval(() => {
      if (queue.some(item => item.status === 'pending')) {
        syncNow();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [syncStatus.isOnline, queue, syncNow]);

  return {
    syncStatus,
    queue,
    addToQueue,
    syncNow,
    resolveConflict,
    removeFromQueue,
    clearSynced,
    getConflicts
  };
};

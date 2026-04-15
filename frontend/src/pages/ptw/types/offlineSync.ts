export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';

export type SyncOperation = 'create' | 'update' | 'update_status' | 'append';

export type SyncEntity = 'permit' | 'permit_photo' | 'gas_reading' | 'isolation_point' | 'closeout' | 'signature';

export interface QueueItem {
  id: string;
  entity: SyncEntity;
  op: SyncOperation;
  offline_id: string;
  server_id?: number;
  client_version?: number;
  payload: any;
  status: SyncStatus;
  error?: string;
  conflict?: ConflictDetail;
  created_at: string;
  last_attempt_at?: string;
  attempts: number;
}

export interface ConflictDetail {
  entity: SyncEntity;
  offline_id: string;
  server_id: number;
  reason: 'stale_version' | 'invalid_transition' | 'permission_denied' | 'validation_error' | 'missing_client_version';
  client_version?: number;
  server_version?: number;
  fields?: Record<string, FieldConflict>;
  detail?: string;
  server_state?: any;
}

export interface FieldConflict {
  client: any;
  server: any;
  merge_hint: 'last_write_wins' | 'set_merge' | 'true_wins';
}

export interface SyncPayload {
  device_id: string;
  client_time: string;
  changes: SyncChange[];
}

export interface SyncChange {
  entity: SyncEntity;
  op: SyncOperation;
  offline_id: string;
  server_id?: number;
  client_version?: number;
  data: any;
}

export interface SyncResponse {
  applied: AppliedChange[];
  conflicts: ConflictDetail[];
  rejected: RejectedChange[];
  summary: {
    total: number;
    applied: number;
    conflicts: number;
    rejected: number;
  };
}

export interface AppliedChange {
  entity: SyncEntity;
  offline_id: string;
  server_id: number;
  new_version?: number;
  status?: string;
}

export interface RejectedChange {
  entity: SyncEntity;
  offline_id: string;
  reason: string;
  detail?: any;
}

export interface SyncStatusInfo {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  conflictCount: number;
  lastSync: string | null;
  syncProgress: number;
}

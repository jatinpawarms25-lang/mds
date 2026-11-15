export type CollectionName =
  | 'settings'
  | 'daily_routines'
  | 'plan_weeks'
  | 'subjects'
  | 'mocks'
  | 'errors'
  | 'shaky_cards'
  | 'omfs_checklist'
  | 'hidden_rules'
  | 'master_checklists'
  | 'shortlist'
  | 'counselling'
  | 'documents'
  | 'notices_inbox'
  | 'image_drills'
  | 'daily_quizzes'
  | 'user_images';

export type SyncStatusKind =
  | 'saved_locally'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'conflict'
  | 'error';

export interface UserRecord<T = unknown> {
  collection: CollectionName;
  id: string;
  data: T;
  hlc: string;
  deleted: boolean;
  device_id: string;
  seq: number;
  server_updated_at?: string;
}

export interface OutboxOp {
  opId: string;
  kind: 'record' | 'event';
  table: 'user_records' | 'attempts' | 'study_sessions' | 'review_logs';
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  nextRetryAt: number;
}

export interface SyncConflict {
  conflictId: string;
  collection: CollectionName;
  recordId: string;
  title: string;
  winnerSide: 'local' | 'remote';
  winningHlc: string;
  losingHlc: string;
  losingData: unknown;
  losingDevice: string;
  timestamp: string;
}

export interface ImmutableEvent {
  id: string;
  table: 'attempts' | 'study_sessions' | 'review_logs';
  payload: Record<string, unknown>;
  created_at: string;
  device_id: string;
}

export interface SyncSnapshotInfo {
  status: SyncStatusKind;
  statusMessage: string;
  pendingCount: number;
  conflictCount: number;
  lastSyncedAt: string | null;
  seqCursor: number;
  userEmail: string | null;
  userId: string | null;
  deviceId: string;
  deviceName: string;
  isConfigured: boolean;
  usingAdvancedOverride: boolean;
  storageUsageBytes: number;
  storageQuotaBytes: number;
  storagePersisted: boolean;
}

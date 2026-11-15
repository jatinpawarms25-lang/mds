import { createClient, type RealtimeChannel, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
  addConflict,
  clearAllRecordsAndEvents,
  enqueueOutbox,
  getAllEvents,
  getAllRecords,
  getConflicts,
  getMeta,
  getOutboxOps,
  getRecord,
  getRecordsByCollection,
  putImmutableEvent,
  putRecord,
  removeConflict,
  removeOutboxOp,
  requestStoragePersistence,
  setMeta
} from './db';
import { packHlc, receiveHlc, tickHlc, type HlcState } from './hlc';
import { isExpiredTombstone, mergeRecordSets, TOMBSTONE_RETENTION_MS } from './merge';
import type {
  CollectionName,
  ImmutableEvent,
  OutboxOp,
  SyncConflict,
  SyncSnapshotInfo,
  SyncStatusKind,
  UserRecord
} from './types';

const ADVANCED_OVERRIDE_KEY = 'mds_advanced_supabase_override';
const LEGACY_LOCALSTORAGE_KEY = 'mds_user_progress_doc';
const LEGACY_BUILD_A_KEY = 'mds_build_a_static_state';

function detectDefaultDeviceName(): string {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return 'Android phone';
  if (/Macintosh|Mac OS X/.test(ua)) return 'MacBook Air';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'Browser Device';
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatTimeHHMM(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return 'now';
  }
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  usingOverride: boolean;
}

export class CloudSyncEngine {
  private client: SupabaseClient | null = null;
  private user: User | null = null;
  private session: Session | null = null;
  private status: SyncStatusKind = 'saved_locally';
  private statusMessage = 'Saved locally';
  private lastSyncedAt: string | null = null;
  private seqCursor = 0;
  private deviceId = '';
  private deviceName = detectDefaultDeviceName();
  private hlcState: HlcState = { ms: Date.now(), counter: 0, nodeId: 'init' };
  private realtimeChannel: RealtimeChannel | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = false;
  private storagePersisted = false;
  private storageUsageBytes = 0;
  private storageQuotaBytes = 0;
  private listeners = new Set<(info: SyncSnapshotInfo) => void>();
  private dataListeners = new Set<() => void>();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    let storedDeviceId = await getMeta<string>('deviceId');
    if (!storedDeviceId) {
      storedDeviceId = generateUuid();
      await setMeta('deviceId', storedDeviceId);
    }
    this.deviceId = storedDeviceId;

    const storedName = await getMeta<string>('deviceName');
    if (storedName) this.deviceName = storedName;

    const storedHlc = await getMeta<HlcState>('hlcState');
    if (storedHlc) {
      this.hlcState = storedHlc;
    } else {
      this.hlcState = { ms: Date.now(), counter: 0, nodeId: this.deviceId.slice(0, 8) };
      await setMeta('hlcState', this.hlcState);
    }

    this.seqCursor = (await getMeta<number>('seqCursor')) || 0;
    this.lastSyncedAt = (await getMeta<string>('lastSyncedAt')) || null;

    const storageStats = await requestStoragePersistence();
    this.storagePersisted = storageStats.persisted;
    this.storageUsageBytes = storageStats.usage;
    this.storageQuotaBytes = storageStats.quota;

    await this.migrateLegacyLocalStorageIfNeeded();
    this.setupBroadcastChannel();
    this.setupBrowserListeners();
    this.initSupabaseClient();
    await this.refreshStatus();
  }

  getConfig(): SupabaseConfig {
    let override: { url?: string; anonKey?: string } = {};
    try {
      const raw = localStorage.getItem(ADVANCED_OVERRIDE_KEY);
      if (raw) override = JSON.parse(raw);
    } catch {
      // ignore
    }

    if (override.url && override.anonKey) {
      return {
        url: override.url.trim().replace(/\/+$/, ''),
        anonKey: override.anonKey.trim(),
        usingOverride: true
      };
    }

    const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    return {
      url: envUrl,
      anonKey: envKey,
      usingOverride: false
    };
  }

  saveAdvancedOverride(url: string, anonKey: string): void {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const cleanKey = anonKey.trim();
    if (!cleanUrl || !cleanKey) {
      localStorage.removeItem(ADVANCED_OVERRIDE_KEY);
    } else {
      localStorage.setItem(ADVANCED_OVERRIDE_KEY, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
    }
    this.teardownRealtime();
    this.initSupabaseClient();
    void this.refreshStatus();
  }

  clearAdvancedOverride(): void {
    localStorage.removeItem(ADVANCED_OVERRIDE_KEY);
    this.teardownRealtime();
    this.initSupabaseClient();
    void this.refreshStatus();
  }

  private initSupabaseClient(): void {
    const cfg = this.getConfig();
    if (!cfg.url || !cfg.anonKey || cfg.url.includes('YOUR_PROJECT_ID')) {
      this.client = null;
      this.user = null;
      this.session = null;
      return;
    }

    this.client = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    this.client.auth.onAuthStateChange((_event, session) => {
      this.session = session;
      this.user = session?.user ?? null;
      if (this.user) {
        this.setupRealtime();
        this.startFallbackPolling();
        void this.syncNow();
      } else {
        this.teardownRealtime();
        this.stopFallbackPolling();
        void this.refreshStatus();
      }
    });

    void this.client.auth.getSession().then(({ data: { session } }) => {
      this.session = session;
      this.user = session?.user ?? null;
      if (this.user) {
        this.setupRealtime();
        this.startFallbackPolling();
        void this.syncNow();
      } else {
        void this.refreshStatus();
      }
    });
  }

  private setupRealtime(): void {
    if (!this.client || !this.user) return;
    this.teardownRealtime();

    // Realtime is a wake-up hint only: triggers delta pull by seq cursor
    this.realtimeChannel = this.client
      .channel(`user_records:${this.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_records',
          filter: `user_id=eq.${this.user.id}`
        },
        (payload) => {
          const newRec = payload.new as { device_id?: string } | undefined;
          if (newRec && newRec.device_id === this.deviceId) return;
          this.scheduleSync(300);
        }
      )
      .subscribe();
  }

  private teardownRealtime(): void {
    if (this.realtimeChannel && this.client) {
      void this.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  private startFallbackPolling(): void {
    this.stopFallbackPolling();
    // 45s fallback polling when websockets are blocked on hospital Wi-Fi
    this.pollingInterval = setInterval(() => {
      if (this.user && typeof navigator !== 'undefined' && navigator.onLine) {
        void this.syncNow();
      }
    }, 45000);
  }

  private stopFallbackPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private setupBroadcastChannel(): void {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      this.broadcastChannel = new BroadcastChannel('mds_os_idb_sync');
      this.broadcastChannel.onmessage = () => {
        this.notifyDataChanged();
        void this.refreshStatus();
      };
    } catch {
      // ignore
    }
  }

  private setupBrowserListeners(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => {
      if (this.user) {
        void this.syncNow();
      } else {
        void this.refreshStatus();
      }
    });
    window.addEventListener('offline', () => {
      void this.refreshStatus();
    });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.user && navigator.onLine) {
          void this.syncNow();
        }
      });
    }
  }

  subscribe(fn: (info: SyncSnapshotInfo) => void): () => void {
    this.listeners.add(fn);
    void this.getSnapshotInfo().then(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  subscribeData(fn: () => void): () => void {
    this.dataListeners.add(fn);
    return () => {
      this.dataListeners.delete(fn);
    };
  }

  private notifyDataChanged(): void {
    this.dataListeners.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore
      }
    });
  }

  async getSnapshotInfo(): Promise<SyncSnapshotInfo> {
    const ops = await getOutboxOps();
    const conflicts = await getConflicts();
    const cfg = this.getConfig();
    const storageStats = await requestStoragePersistence();
    this.storagePersisted = storageStats.persisted;
    this.storageUsageBytes = storageStats.usage;
    this.storageQuotaBytes = storageStats.quota;

    return {
      status: this.status,
      statusMessage: this.statusMessage,
      pendingCount: ops.length,
      conflictCount: conflicts.length,
      lastSyncedAt: this.lastSyncedAt,
      seqCursor: this.seqCursor,
      userEmail: this.user?.email ?? null,
      userId: this.user?.id ?? null,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      isConfigured: Boolean(cfg.url && cfg.anonKey && !cfg.url.includes('YOUR_PROJECT_ID')),
      usingAdvancedOverride: cfg.usingOverride,
      storageUsageBytes: this.storageUsageBytes,
      storageQuotaBytes: this.storageQuotaBytes,
      storagePersisted: this.storagePersisted
    };
  }

  private async refreshStatus(overrideError?: string): Promise<void> {
    const ops = await getOutboxOps();
    const conflicts = await getConflicts();

    if (overrideError) {
      this.status = 'error';
      this.statusMessage = `Error: ${overrideError}`;
    } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.status = 'offline';
      this.statusMessage = ops.length > 0 ? `Offline (${ops.length} pending)` : 'Offline';
    } else if (conflicts.length > 0) {
      this.status = 'conflict';
      this.statusMessage = `Conflict (${conflicts.length})`;
    } else if (!this.user) {
      this.status = 'saved_locally';
      this.statusMessage = 'Saved locally';
    } else if (this.isSyncing) {
      this.status = 'syncing';
      this.statusMessage = 'Syncing';
    } else if (ops.length > 0) {
      this.status = 'saved_locally';
      this.statusMessage = `Saved locally (${ops.length} pending)`;
    } else if (this.lastSyncedAt) {
      this.status = 'synced';
      this.statusMessage = `Synced ${formatTimeHHMM(this.lastSyncedAt)}`;
    } else {
      this.status = 'saved_locally';
      this.statusMessage = 'Saved locally';
    }

    const info = await this.getSnapshotInfo();
    this.listeners.forEach((fn) => {
      try {
        fn(info);
      } catch {
        // ignore
      }
    });
  }

  async setDeviceName(name: string): Promise<void> {
    this.deviceName = name.trim() || detectDefaultDeviceName();
    await setMeta('deviceName', this.deviceName);
    await this.refreshStatus();
  }

  // ==========================================================================
  // LOCAL-FIRST WRITE API (Mutable Records + Immutable Events)
  // ==========================================================================

  async putRecordLocal<T = unknown>(
    collection: CollectionName,
    id: string,
    data: T,
    deleted = false
  ): Promise<UserRecord<T>> {
    this.hlcState = tickHlc(this.hlcState, Date.now());
    await setMeta('hlcState', this.hlcState);

    const rec: UserRecord<T> = {
      collection,
      id,
      data,
      hlc: packHlc(this.hlcState),
      deleted,
      device_id: this.deviceId,
      seq: 0
    };

    await putRecord(rec);
    await enqueueOutbox({
      opId: `rec:${collection}:${id}`,
      kind: 'record',
      table: 'user_records',
      payload: {
        collection: rec.collection,
        id: rec.id,
        data: rec.data,
        hlc: rec.hlc,
        deleted: rec.deleted,
        device_id: rec.device_id
      },
      createdAt: Date.now(),
      attempts: 0,
      nextRetryAt: 0
    });

    this.broadcastChannel?.postMessage({ type: 'UPDATED' });
    this.notifyDataChanged();
    await this.refreshStatus();
    this.scheduleSync(1500);
    return rec;
  }

  async deleteRecordLocal(collection: CollectionName, id: string): Promise<void> {
    const existing = await getRecord(collection, id);
    await this.putRecordLocal(collection, id, existing ? existing.data : {}, true);
  }

  async logImmutableEvent(
    table: 'attempts' | 'study_sessions' | 'review_logs',
    payload: Record<string, unknown>
  ): Promise<ImmutableEvent> {
    const id = generateUuid();
    const ev: ImmutableEvent = {
      id,
      table,
      payload,
      created_at: new Date().toISOString(),
      device_id: this.deviceId
    };
    await putImmutableEvent(ev);
    await enqueueOutbox({
      opId: `ev:${table}:${id}`,
      kind: 'event',
      table,
      payload: { id, ...payload, device_id: this.deviceId },
      createdAt: Date.now(),
      attempts: 0,
      nextRetryAt: 0
    });

    this.broadcastChannel?.postMessage({ type: 'UPDATED' });
    this.notifyDataChanged();
    await this.refreshStatus();
    this.scheduleSync(1500);
    return ev;
  }

  async getCollection<T = unknown>(collection: CollectionName): Promise<UserRecord<T>[]> {
    return getRecordsByCollection<T>(collection, false);
  }

  async getAllConflicts(): Promise<SyncConflict[]> {
    return getConflicts();
  }

  async restoreConflict(conflictId: string): Promise<boolean> {
    const list = await getConflicts();
    const target = list.find((c) => c.conflictId === conflictId);
    if (!target) return false;
    await this.putRecordLocal(target.collection, target.recordId, target.losingData, false);
    await removeConflict(conflictId);
    await this.refreshStatus();
    return true;
  }

  async dismissConflict(conflictId: string): Promise<void> {
    await removeConflict(conflictId);
    await this.refreshStatus();
  }

  // ==========================================================================
  // SYNC ENGINE: PULL DELTAS (seq + 2-min overlap) -> HLC MERGE -> PUSH OUTBOX
  // ==========================================================================

  private scheduleSync(delayMs = 1500): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      void this.syncNow();
    }, delayMs);
  }

  async syncNow(forceFullPull = false): Promise<{ success: boolean; error?: string }> {
    if (!this.client || !this.user) {
      await this.refreshStatus();
      return { success: false, error: 'Not signed in' };
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await this.refreshStatus();
      return { success: false, error: 'Offline' };
    }
    if (this.isSyncing) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.isSyncing = true;
    await this.refreshStatus();

    try {
      const nowMs = Date.now();
      const lastSyncMs = this.lastSyncedAt ? new Date(this.lastSyncedAt).getTime() : 0;
      const offlineTooLong = lastSyncMs > 0 && nowMs - lastSyncMs > TOMBSTONE_RETENTION_MS;

      // 1. Pull deltas by seq cursor (or full pull if offline > 90 days or forced)
      let remoteRows: UserRecord[] = [];
      if (forceFullPull || offlineTooLong || this.seqCursor === 0) {
        const { data, error } = await this.client
          .from('user_records')
          .select('collection,id,data,hlc,deleted,device_id,seq,server_updated_at')
          .eq('user_id', this.user.id)
          .order('seq', { ascending: true });
        if (error) throw new Error(error.message);
        remoteRows = (data || []) as UserRecord[];
      } else {
        // Re-read with 2-minute overlap OR seq >= seqCursor
        const overlapIso = new Date(Math.max(0, lastSyncMs - 120_000)).toISOString();
        const { data, error } = await this.client
          .from('user_records')
          .select('collection,id,data,hlc,deleted,device_id,seq,server_updated_at')
          .eq('user_id', this.user.id)
          .or(`seq.gt.${this.seqCursor},server_updated_at.gte.${overlapIso}`)
          .order('seq', { ascending: true });
        if (error) throw new Error(error.message);
        remoteRows = (data || []) as UserRecord[];
      }

      // Advance HLC and merge remote deltas deterministically
      for (const r of remoteRows) {
        this.hlcState = receiveHlc(this.hlcState, r.hlc, Date.now());
      }
      await setMeta('hlcState', this.hlcState);

      const localAll = await getAllRecords(true);
      const { records: mergedMap, conflicts } = mergeRecordSets(localAll, remoteRows, Date.now());

      for (const rec of mergedMap.values()) {
        await putRecord(rec);
      }
      for (const c of conflicts) {
        await addConflict(c);
      }

      let maxSeq = this.seqCursor;
      for (const r of remoteRows) {
        if (r.seq > maxSeq) maxSeq = r.seq;
      }

      // 2. Push persistent outbox operations with exponential backoff check
      const outbox = await getOutboxOps();
      const dueOps = outbox.filter((op) => op.nextRetryAt <= Date.now());

      const recordOps = dueOps.filter((op) => op.kind === 'record');
      const eventOps = dueOps.filter((op) => op.kind === 'event');

      if (recordOps.length > 0) {
        const payloadArray = recordOps.map((op) => op.payload);
        const { data: rpcRes, error: rpcErr } = await this.client.rpc('upsert_user_records', {
          records: payloadArray
        });
        if (rpcErr) {
          await this.scheduleBackoffForOps(recordOps);
          throw new Error(rpcErr.message);
        }

        const resObj = (rpcRes || {}) as {
          conflicts?: Array<{
            collection: CollectionName;
            id: string;
            winner: string;
            winning_hlc: string;
            losing_hlc: string;
            losing_data: unknown;
            losing_device: string;
          }>;
          rejected?: Array<{ collection: string; id: string; reason: string }>;
        };

        if (Array.isArray(resObj.conflicts)) {
          for (const rc of resObj.conflicts) {
            await addConflict({
              conflictId: `conf_${rc.collection}_${rc.id}_${rc.losing_hlc}`,
              collection: rc.collection,
              recordId: rc.id,
              title: `${rc.collection}:${rc.id}`,
              winnerSide: rc.winner === 'incoming' ? 'local' : 'remote',
              winningHlc: rc.winning_hlc,
              losingHlc: rc.losing_hlc,
              losingData: rc.losing_data,
              losingDevice: rc.losing_device,
              timestamp: new Date().toISOString()
            });
          }
        }

        if (Array.isArray(resObj.rejected) && resObj.rejected.length > 0) {
          const firstReason = resObj.rejected[0].reason;
          if (firstReason === 'clock_more_than_5_minutes_ahead') {
            throw new Error('Device clock is more than 5 minutes ahead of server time.');
          }
        }

        for (const op of recordOps) {
          await removeOutboxOp(op.opId);
        }

        // Pull newly assigned seq values for our own pushed records
        const { data: postPushRows } = await this.client
          .from('user_records')
          .select('collection,id,data,hlc,deleted,device_id,seq,server_updated_at')
          .eq('user_id', this.user.id)
          .gt('seq', maxSeq)
          .order('seq', { ascending: true });
        if (postPushRows) {
          for (const r of postPushRows as UserRecord[]) {
            if (r.seq > maxSeq) maxSeq = r.seq;
            await putRecord(r);
          }
        }

        // Trigger server-side deduplicated snapshot (last 3)
        void this.client.rpc('create_snapshot_if_changed', { p_device_name: this.deviceName });
      }

      // 3. Push immutable insert-only events (ON CONFLICT DO NOTHING)
      for (const evOp of eventOps) {
        const row = { user_id: this.user.id, ...evOp.payload };
        const { error: evErr } = await this.client
          .from(evOp.table)
          .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
        if (evErr) {
          await this.scheduleBackoffForOps([evOp]);
          throw new Error(evErr.message);
        }
        await removeOutboxOp(evOp.opId);
      }

      this.seqCursor = maxSeq;
      this.lastSyncedAt = new Date().toISOString();
      await setMeta('seqCursor', this.seqCursor);
      await setMeta('lastSyncedAt', this.lastSyncedAt);

      this.isSyncing = false;
      this.notifyDataChanged();
      await this.refreshStatus();
      return { success: true };
    } catch (err) {
      this.isSyncing = false;
      const msg = err instanceof Error ? err.message : String(err);
      await this.refreshStatus(msg);
      return { success: false, error: msg };
    }
  }

  private async scheduleBackoffForOps(ops: OutboxOp[]): Promise<void> {
    const now = Date.now();
    for (const op of ops) {
      const nextAttempts = op.attempts + 1;
      const delayMs = Math.min(60_000, 1000 * Math.pow(2, nextAttempts));
      await enqueueOutbox({
        ...op,
        attempts: nextAttempts,
        nextRetryAt: now + delayMs
      });
    }
  }

  // ==========================================================================
  // AUTH: MAGIC LINK, 6-DIGIT OTP CODE, PASSWORD FALLBACK
  // ==========================================================================

  async sendMagicLinkOrOtp(email: string): Promise<void> {
    if (!this.client) throw new Error('Supabase URL and Anon Key are not configured.');
    const { error } = await this.client.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.href.split('#')[0] : undefined
      }
    });
    if (error) throw error;
  }

  async verifySixDigitCode(email: string, token: string): Promise<void> {
    if (!this.client) throw new Error('Supabase URL and Anon Key are not configured.');
    const { data, error } = await this.client.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email'
    });
    if (error) throw error;
    this.session = data.session;
    this.user = data.user;
    this.setupRealtime();
    this.startFallbackPolling();
    await this.syncNow();
  }

  async signInWithPassword(email: string, password: string): Promise<void> {
    if (!this.client) throw new Error('Supabase URL and Anon Key are not configured.');
    const { data, error } = await this.client.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) throw error;
    this.session = data.session;
    this.user = data.user;
    this.setupRealtime();
    this.startFallbackPolling();
    await this.syncNow();
  }

  async signUpWithPassword(email: string, password: string): Promise<void> {
    if (!this.client) throw new Error('Supabase URL and Anon Key are not configured.');
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password
    });
    if (error) throw error;
    if (data.session) {
      this.session = data.session;
      this.user = data.user;
      this.setupRealtime();
      this.startFallbackPolling();
      await this.syncNow();
    }
  }

  async signOut(): Promise<void> {
    this.teardownRealtime();
    this.stopFallbackPolling();
    if (this.client) {
      await this.client.auth.signOut();
    }
    this.user = null;
    this.session = null;
    await this.refreshStatus();
  }

  async deleteCloudData(): Promise<void> {
    if (!this.client || !this.user) throw new Error('Not signed in');
    await this.client.from('user_progress_snapshots').delete().eq('user_id', this.user.id);
    const { error } = await this.client.from('user_records').delete().eq('user_id', this.user.id);
    if (error) throw error;
    this.seqCursor = 0;
    await setMeta('seqCursor', 0);
    await this.refreshStatus();
  }

  async resetLocalDatabase(): Promise<void> {
    await clearAllRecordsAndEvents();
    await setMeta('seqCursor', 0);
    await setMeta('lastSyncedAt', null);
    this.seqCursor = 0;
    this.lastSyncedAt = null;
    this.notifyDataChanged();
    await this.refreshStatus();
  }

  // ==========================================================================
  // LEGACY MIGRATION (Phase 0 localStorage / Build A -> IndexedDB)
  // ==========================================================================

  private async migrateLegacyLocalStorageIfNeeded(): Promise<void> {
    const alreadyMigrated = await getMeta<boolean>('migratedFromLocalStorage');
    if (alreadyMigrated) return;

    try {
      const rawV2 = typeof localStorage !== 'undefined' ? localStorage.getItem(LEGACY_LOCALSTORAGE_KEY) : null;
      if (rawV2) {
        const doc = JSON.parse(rawV2) as Record<string, unknown>;
        if (doc && typeof doc === 'object') {
          await this.importLegacyV2Doc(doc);
        }
      }
      const rawBuildA = typeof localStorage !== 'undefined' ? localStorage.getItem(LEGACY_BUILD_A_KEY) : null;
      if (rawBuildA) {
        const buildA = JSON.parse(rawBuildA) as Record<string, unknown>;
        if (buildA && typeof buildA === 'object') {
          await this.importBuildABackup(buildA);
        }
      }
    } catch {
      // ignore corrupt legacy storage
    }
    await setMeta('migratedFromLocalStorage', true);
  }

  async importLegacyV2Doc(doc: Record<string, unknown>): Promise<void> {
    const settings = (doc.userSettings || {}) as Record<string, { value?: unknown } | unknown>;
    for (const [k, rawVal] of Object.entries(settings)) {
      const val = rawVal && typeof rawVal === 'object' && 'value' in rawVal ? (rawVal as { value: unknown }).value : rawVal;
      await this.putRecordLocal('settings', k, { value: val }, false);
    }

    const mocks = Array.isArray(doc.mockScores) ? doc.mockScores : [];
    for (const m of mocks) {
      if (m && typeof m === 'object' && 'id' in m) {
        const rec = m as { id: string; deletedAt?: string | null };
        await this.putRecordLocal('mocks', String(rec.id), rec, Boolean(rec.deletedAt));
      }
    }

    const errors = Array.isArray(doc.errorLog) ? doc.errorLog : [];
    for (const e of errors) {
      if (e && typeof e === 'object' && 'id' in e) {
        const rec = e as { id: string; deletedAt?: string | null };
        await this.putRecordLocal('errors', String(rec.id), rec, Boolean(rec.deletedAt));
      }
    }

    const shortlist = Array.isArray(doc.collegeShortlist) ? doc.collegeShortlist : [];
    for (const c of shortlist) {
      if (c && typeof c === 'object' && 'id' in c) {
        const rec = c as { id: string; deletedAt?: string | null };
        await this.putRecordLocal('shortlist', String(rec.id), rec, Boolean(rec.deletedAt));
      }
    }

    const mapPairs: Array<[string, CollectionName]> = [
      ['planChecklist', 'plan_weeks'],
      ['subjectProgress', 'subjects'],
      ['shakyCards', 'shaky_cards'],
      ['omfsChecklist', 'omfs_checklist'],
      ['hiddenRulesChecked', 'hidden_rules'],
      ['masterChecklistsChecked', 'master_checklists'],
      ['counsellingTracker', 'counselling'],
      ['documentsChecklist', 'documents']
    ];
    for (const [docKey, col] of mapPairs) {
      const mapObj = (doc[docKey] || {}) as Record<string, unknown>;
      for (const [id, val] of Object.entries(mapObj)) {
        await this.putRecordLocal(col, id, val, false);
      }
    }
  }

  async importBuildABackup(d: Record<string, unknown>): Promise<void> {
    if (d.targetBranch) {
      await this.putRecordLocal('settings', 'targetBranch', { value: String(d.targetBranch) }, false);
    }
    const sq = (d.stateQuota || {}) as Record<string, string>;
    if (sq.state) await this.putRecordLocal('settings', 'stateName', { value: sq.state }, false);
    if (sq.portal) await this.putRecordLocal('settings', 'statePortalUrl', { value: sq.portal }, false);
    if (sq.domicile) await this.putRecordLocal('settings', 'stateDomicileBasis', { value: sq.domicile }, false);

    if (Array.isArray(d.mocks)) {
      for (let i = 0; i < d.mocks.length; i++) {
        const m = d.mocks[i] as Record<string, unknown>;
        const aC = Number(m.aC ?? m.partA_C ?? 0);
        const aW = Number(m.aW ?? m.partA_W ?? 0);
        const aU = Number(m.aS ?? m.partA_U ?? Math.max(0, 100 - aC - aW));
        const bC = Number(m.bC ?? m.partB_C ?? 0);
        const bW = Number(m.bW ?? m.partB_W ?? 0);
        const bU = Number(m.bS ?? m.partB_U ?? Math.max(0, 140 - bC - bW));
        const totalScore = m.totalScore !== undefined ? Number(m.totalScore) : Number(m.score ?? (aC + bC) * 4 - (aW + bW));
        const att = aC + bC + aW + bW;
        const accuracy = m.accuracy !== undefined ? Number(m.accuracy) : Number(m.acc ?? (att ? Math.round(((aC + bC) / att) * 1000) / 10 : 0));
        const id = String(m.id || `build_a_mock_${i}`);
        await this.putRecordLocal(
          'mocks',
          id,
          {
            id,
            date: String(m.date || d.exported || new Date().toISOString().slice(0, 10)),
            source: String(m.source || m.label || `Build A Mock ${i + 1}`),
            partA_C: aC,
            partA_W: aW,
            partA_U: aU,
            partB_C: bC,
            partB_W: bW,
            partB_U: bU,
            totalScore,
            accuracy
          },
          false
        );
      }
    }

    if (Array.isArray(d.errors)) {
      for (let i = 0; i < d.errors.length; i++) {
        const e = d.errors[i] as Record<string, unknown>;
        const id = String(e.id || `build_a_err_${i}`);
        await this.putRecordLocal(
          'errors',
          id,
          {
            id,
            subject: String(e.subject || 'General'),
            topic: String(e.topic || 'Imported error'),
            whatWentWrong: String(e.whatWentWrong || e.topic || ''),
            reason: String(e.reason || 'Concept Gap'),
            correctFact: String(e.correctFact || e.topic || ''),
            reference: String(e.reference || 'Imported from Build A'),
            reviewDate: String(e.review || e.reviewDate || ''),
            reviewDay: Number(e.reviewDay || 2),
            revised: Boolean(e.revised),
            isVolatile: Boolean(e.isVolatile),
            date: String(e.date || d.exported || new Date().toISOString().slice(0, 10))
          },
          false
        );
      }
    }

    if (Array.isArray(d.shortlist)) {
      for (let i = 0; i < d.shortlist.length; i++) {
        const item = d.shortlist[i];
        if (typeof item === 'string') {
          const id = `build_a_col_${item.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
          await this.putRecordLocal(
            'shortlist',
            id,
            {
              id,
              name: item,
              priority: i + 1,
              notes: `Imported from Build A shortlist (Choice #${i + 1})`
            },
            false
          );
        } else if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          const id = String(obj.id || `col_${i}`);
          await this.putRecordLocal('shortlist', id, { id, ...obj }, Boolean(obj.deletedAt));
        }
      }
    }

    if (Array.isArray(d.counselling)) {
      const roundKeys = [
        'r1',
        'r1_choices',
        'r1_exit',
        'r2_choices',
        'r2',
        'r3_reg',
        'r3',
        'stray_elig',
        'stray',
        'refund',
        'cross_check',
        'state_reg'
      ];
      for (let i = 0; i < d.counselling.length; i++) {
        const key = roundKeys[i] || `step_${i + 1}`;
        await this.putRecordLocal('counselling', key, { value: Boolean(d.counselling[i]) }, false);
      }
    }
  }

  async exportFullBackupJson(): Promise<string> {
    const records = await getAllRecords(false);
    const events = await getAllEvents();
    return JSON.stringify(
      {
        format: 'mds-os-v2',
        exportedAt: new Date().toISOString(),
        records,
        events
      },
      null,
      2
    );
  }

  async importJsonBackup(rawText: string): Promise<void> {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (parsed.format === 'mds-os-v2' && Array.isArray(parsed.records)) {
      for (const r of parsed.records as UserRecord[]) {
        await this.putRecordLocal(r.collection, r.id, r.data, Boolean(r.deleted));
      }
      return;
    }
    if (parsed.userProgress && typeof parsed.userProgress === 'object') {
      await this.importLegacyV2Doc(parsed.userProgress as Record<string, unknown>);
      return;
    }
    if (Array.isArray(parsed.mocks) || Array.isArray(parsed.shortlist) || Array.isArray(parsed.errors)) {
      await this.importBuildABackup(parsed);
      return;
    }
    throw new Error('Unrecognized JSON backup format.');
  }
}

export const syncEngine = new CloudSyncEngine();

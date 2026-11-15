import { compareHlc, isClockTooFarAhead, packHlc, receiveHlc, tickHlc, type HlcState } from './hlc';
import type { CollectionName, SyncConflict, UserRecord } from './types';

// 90-day tombstone retention (Phase 1.6 & Rule R9)
export const TOMBSTONE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export interface MergeOutcome {
  records: Map<string, UserRecord>;
  conflicts: SyncConflict[];
}

export function recordKey(collection: CollectionName, id: string): string {
  return `${collection}::${id}`;
}

export function isExpiredTombstone(rec: UserRecord, nowMs: number = Date.now()): boolean {
  if (!rec.deleted) return false;
  const hlcMs = Number(rec.hlc.split(':')[0]);
  if (!Number.isFinite(hlcMs)) return false;
  return nowMs - hlcMs > TOMBSTONE_RETENTION_MS;
}

/**
 * Pure deterministic record-level merge function.
 * Properties: commutative, associative, idempotent; higher HLC wins regardless of arrival order.
 */
export function mergeRecordSets(
  localRecords: UserRecord[],
  remoteRecords: UserRecord[],
  nowMs: number = Date.now()
): MergeOutcome {
  const map = new Map<string, UserRecord>();
  const conflicts: SyncConflict[] = [];

  for (const r of localRecords) {
    if (!isExpiredTombstone(r, nowMs)) {
      map.set(recordKey(r.collection, r.id), r);
    }
  }

  for (const remote of remoteRecords) {
    if (isClockTooFarAhead(remote.hlc, nowMs)) {
      continue;
    }
    const key = recordKey(remote.collection, remote.id);
    const local = map.get(key);

    if (!local) {
      if (!isExpiredTombstone(remote, nowMs)) {
        map.set(key, remote);
      }
      continue;
    }

    const cmp = compareHlc(remote.hlc, local.hlc);
    if (cmp === 0) {
      // Exact same HLC: keep whichever has higher seq
      if (remote.seq > local.seq) {
        map.set(key, remote);
      }
      continue;
    }

    if (cmp > 0) {
      // Remote wins
      if (
        !local.deleted &&
        !remote.deleted &&
        local.device_id !== remote.device_id &&
        JSON.stringify(local.data) !== JSON.stringify(remote.data)
      ) {
        conflicts.push({
          conflictId: `conf_${remote.collection}_${remote.id}_${local.hlc}`,
          collection: remote.collection,
          recordId: remote.id,
          title: extractTitle(remote.data, local.data, remote.id),
          winnerSide: 'remote',
          winningHlc: remote.hlc,
          losingHlc: local.hlc,
          losingData: local.data,
          losingDevice: local.device_id,
          timestamp: new Date(nowMs).toISOString()
        });
      }
      if (isExpiredTombstone(remote, nowMs)) {
        map.delete(key);
      } else {
        map.set(key, remote);
      }
    } else {
      // Local wins
      if (
        !local.deleted &&
        !remote.deleted &&
        local.device_id !== remote.device_id &&
        JSON.stringify(local.data) !== JSON.stringify(remote.data)
      ) {
        conflicts.push({
          conflictId: `conf_${local.collection}_${local.id}_${remote.hlc}`,
          collection: local.collection,
          recordId: local.id,
          title: extractTitle(local.data, remote.data, local.id),
          winnerSide: 'local',
          winningHlc: local.hlc,
          losingHlc: remote.hlc,
          losingData: remote.data,
          losingDevice: remote.device_id,
          timestamp: new Date(nowMs).toISOString()
        });
      }
    }
  }

  return { records: map, conflicts };
}

function extractTitle(a: unknown, b: unknown, fallback: string): string {
  const objA = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
  const objB = (b && typeof b === 'object' ? b : {}) as Record<string, unknown>;
  const candidate =
    objA.source ||
    objA.topic ||
    objA.name ||
    objA.title ||
    objB.source ||
    objB.topic ||
    objB.name ||
    objB.title;
  return candidate ? String(candidate) : fallback;
}

export class InMemorySyncNode {
  public hlcState: HlcState;
  public records: Map<string, UserRecord> = new Map();
  public conflicts: SyncConflict[] = [];

  constructor(public readonly deviceId: string) {
    this.hlcState = { ms: 0, counter: 0, nodeId: deviceId };
  }

  upsert(collection: CollectionName, id: string, data: unknown, nowMs: number, deleted = false): UserRecord {
    this.hlcState = tickHlc(this.hlcState, nowMs);
    const rec: UserRecord = {
      collection,
      id,
      data,
      hlc: packHlc(this.hlcState),
      deleted,
      device_id: this.deviceId,
      seq: 0
    };
    this.records.set(recordKey(collection, id), rec);
    return rec;
  }

  applyRemote(remoteRecords: UserRecord[], nowMs: number): void {
    for (const r of remoteRecords) {
      this.hlcState = receiveHlc(this.hlcState, r.hlc, nowMs);
    }
    const { records, conflicts } = mergeRecordSets(
      Array.from(this.records.values()),
      remoteRecords,
      nowMs
    );
    this.records = records;
    this.conflicts.push(...conflicts);
  }
}

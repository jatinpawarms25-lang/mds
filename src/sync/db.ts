import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CollectionName, ImmutableEvent, OutboxOp, SyncConflict, UserRecord } from './types';

interface MdsOsDbSchema extends DBSchema {
  records: {
    key: [CollectionName, string];
    value: UserRecord;
    indexes: {
      'by-collection': CollectionName;
      'by-seq': number;
    };
  };
  events: {
    key: string;
    value: ImmutableEvent;
    indexes: {
      'by-table': string;
    };
  };
  outbox: {
    key: string;
    value: OutboxOp;
    indexes: {
      'by-created': number;
    };
  };
  conflicts: {
    key: string;
    value: SyncConflict;
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

const DB_NAME = 'mds_os_idb_v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MdsOsDbSchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<MdsOsDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<MdsOsDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('records')) {
          const store = db.createObjectStore('records', { keyPath: ['collection', 'id'] });
          store.createIndex('by-collection', 'collection');
          store.createIndex('by-seq', 'seq');
        }
        if (!db.objectStoreNames.contains('events')) {
          const evStore = db.createObjectStore('events', { keyPath: 'id' });
          evStore.createIndex('by-table', 'table');
        }
        if (!db.objectStoreNames.contains('outbox')) {
          const obStore = db.createObjectStore('outbox', { keyPath: 'opId' });
          obStore.createIndex('by-created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('conflicts')) {
          db.createObjectStore('conflicts', { keyPath: 'conflictId' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      }
    });
  }
  return dbPromise;
}

export async function getMeta<T = unknown>(key: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.get('meta', key);
  return row ? (row.value as T) : null;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put('meta', { key, value });
}

export async function getRecord<T = unknown>(
  collection: CollectionName,
  id: string
): Promise<UserRecord<T> | undefined> {
  const db = await getDb();
  return (await db.get('records', [collection, id])) as UserRecord<T> | undefined;
}

export async function getRecordsByCollection<T = unknown>(
  collection: CollectionName,
  includeDeleted = false
): Promise<UserRecord<T>[]> {
  const db = await getDb();
  const all = (await db.getAllFromIndex('records', 'by-collection', collection)) as UserRecord<T>[];
  return includeDeleted ? all : all.filter(r => !r.deleted);
}

export async function getAllRecords(includeDeleted = true): Promise<UserRecord[]> {
  const db = await getDb();
  const all = await db.getAll('records');
  return includeDeleted ? all : all.filter(r => !r.deleted);
}

export async function putRecord(rec: UserRecord): Promise<void> {
  const db = await getDb();
  await db.put('records', rec);
}

export async function deleteRecordPermanently(collection: CollectionName, id: string): Promise<void> {
  const db = await getDb();
  await db.delete('records', [collection, id]);
}

export async function putImmutableEvent(ev: ImmutableEvent): Promise<void> {
  const db = await getDb();
  await db.put('events', ev);
}

export async function getAllEvents(): Promise<ImmutableEvent[]> {
  const db = await getDb();
  return db.getAll('events');
}

export async function enqueueOutbox(op: OutboxOp): Promise<void> {
  const db = await getDb();
  await db.put('outbox', op);
}

export async function getOutboxOps(): Promise<OutboxOp[]> {
  const db = await getDb();
  return db.getAllFromIndex('outbox', 'by-created');
}

export async function removeOutboxOp(opId: string): Promise<void> {
  const db = await getDb();
  await db.delete('outbox', opId);
}

export async function addConflict(conflict: SyncConflict): Promise<void> {
  const db = await getDb();
  await db.put('conflicts', conflict);
}

export async function getConflicts(): Promise<SyncConflict[]> {
  const db = await getDb();
  return db.getAll('conflicts');
}

export async function removeConflict(conflictId: string): Promise<void> {
  const db = await getDb();
  await db.delete('conflicts', conflictId);
}

export async function clearAllRecordsAndEvents(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['records', 'events', 'outbox', 'conflicts'], 'readwrite');
  await Promise.all([
    tx.objectStore('records').clear(),
    tx.objectStore('events').clear(),
    tx.objectStore('outbox').clear(),
    tx.objectStore('conflicts').clear(),
    tx.done
  ]);
}

export async function requestStoragePersistence(): Promise<{
  persisted: boolean;
  usage: number;
  quota: number;
}> {
  let persisted = false;
  let usage = 0;
  let quota = 0;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.persisted) {
        persisted = await navigator.storage.persisted();
      }
      if (!persisted && navigator.storage.persist) {
        persisted = await navigator.storage.persist();
      }
      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        usage = est.usage || 0;
        quota = est.quota || 0;
      }
    } catch {
      // Ignore unsupported browser APIs
    }
  }

  return { persisted, usage, quota };
}

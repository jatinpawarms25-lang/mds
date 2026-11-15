import { useCallback, useEffect, useState } from 'react';
import { syncEngine } from '../sync/syncEngine';
import type { CollectionName, SyncConflict, SyncSnapshotInfo, UserRecord } from '../sync/types';

export function useSyncStatus(): SyncSnapshotInfo | null {
  const [info, setInfo] = useState<SyncSnapshotInfo | null>(null);

  useEffect(() => {
    void syncEngine.init().then(() => {
      void syncEngine.getSnapshotInfo().then(setInfo);
    });
    return syncEngine.subscribe(setInfo);
  }, []);

  return info;
}

export function useSyncCollection<T = unknown>(collection: CollectionName): {
  items: UserRecord<T>[];
  loading: boolean;
  putItem: (id: string, data: T) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  reload: () => Promise<void>;
} {
  const [items, setItems] = useState<UserRecord<T>[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    await syncEngine.init();
    const rows = await syncEngine.getCollection<T>(collection);
    setItems(rows);
    setLoading(false);
  }, [collection]);

  useEffect(() => {
    void reload();
    return syncEngine.subscribeData(() => {
      void reload();
    });
  }, [reload]);

  const putItem = useCallback(
    async (id: string, data: T) => {
      await syncEngine.putRecordLocal(collection, id, data, false);
    },
    [collection]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await syncEngine.deleteRecordLocal(collection, id);
    },
    [collection]
  );

  return { items, loading, putItem, deleteItem, reload };
}

export function useSyncConflicts(): {
  conflicts: SyncConflict[];
  restore: (conflictId: string) => Promise<boolean>;
  dismiss: (conflictId: string) => Promise<void>;
} {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  const reload = useCallback(async () => {
    await syncEngine.init();
    setConflicts(await syncEngine.getAllConflicts());
  }, []);

  useEffect(() => {
    void reload();
    return syncEngine.subscribe(() => {
      void reload();
    });
  }, [reload]);

  return {
    conflicts,
    restore: (id: string) => syncEngine.restoreConflict(id),
    dismiss: (id: string) => syncEngine.dismissConflict(id)
  };
}

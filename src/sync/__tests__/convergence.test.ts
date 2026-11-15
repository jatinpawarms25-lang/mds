import { describe, expect, it } from 'vitest';
import { InMemorySyncNode, mergeRecordSets, recordKey } from '../merge';
import type { CollectionName, UserRecord } from '../types';

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Phase 1 Convergence & Conflict Properties', () => {
  it('converges across 3 devices with 10,000 randomized operations, partitions, duplicates, and out-of-order delivery', () => {
    const rng = mulberry32(20261115);
    const nodes = [
      new InMemorySyncNode('mac_air'),
      new InMemorySyncNode('android_phone'),
      new InMemorySyncNode('backup_browser')
    ];
    const collections: CollectionName[] = ['mocks', 'errors', 'shortlist', 'subjects', 'settings'];
    const baseTime = 1794760000000; // 2026-11-15
    const allGeneratedOps: UserRecord[] = [];

    for (let i = 0; i < 10000; i++) {
      const node = nodes[Math.floor(rng() * nodes.length)];
      const col = collections[Math.floor(rng() * collections.length)];
      const id = `rec_${Math.floor(rng() * 120)}`; // High contention on 120 keys
      const opTime = baseTime + i * 10 + Math.floor(rng() * 5);
      const isDelete = rng() < 0.22;
      const rec = node.upsert(
        col,
        id,
        { val: i, device: node.deviceId, score: Math.floor(rng() * 960) },
        opTime,
        isDelete
      );
      allGeneratedOps.push(rec);
    }

    // Deliver shuffled & duplicated subsets to each device in different orders
    for (const node of nodes) {
      const copy = [...allGeneratedOps];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
      }
      // Deliver in chunks + duplicates
      const chunkSize = 1000;
      for (let start = 0; start < copy.length; start += chunkSize) {
        const chunk = copy.slice(start, start + chunkSize);
        node.applyRemote(chunk, baseTime + 200000);
        // Re-deliver a subset to prove idempotency
        node.applyRemote(chunk.slice(0, 100), baseTime + 200000);
      }
    }

    // Assert exact convergence across all 3 devices
    const keys0 = Array.from(nodes[0].records.keys()).sort();
    const keys1 = Array.from(nodes[1].records.keys()).sort();
    const keys2 = Array.from(nodes[2].records.keys()).sort();
    expect(keys0).toEqual(keys1);
    expect(keys1).toEqual(keys2);
    expect(keys0.length).toBeGreaterThan(0);

    for (const k of keys0) {
      const r0 = nodes[0].records.get(k)!;
      const r1 = nodes[1].records.get(k)!;
      const r2 = nodes[2].records.get(k)!;
      expect(r0.hlc).toBe(r1.hlc);
      expect(r1.hlc).toBe(r2.hlc);
      expect(r0.deleted).toBe(r1.deleted);
      expect(r1.deleted).toBe(r2.deleted);
      expect(r0.data).toEqual(r1.data);
      expect(r1.data).toEqual(r2.data);
    }
  });

  it('captures losing concurrent same-record edit in restorable syncConflicts', () => {
    const mac = new InMemorySyncNode('mac');
    const phone = new InMemorySyncNode('phone');
    const t0 = 1794760000000;

    const rMac = mac.upsert('errors', 'err_1', { topic: 'Lidocaine', fact: '4.4 mg/kg plain' }, t0 + 100);
    const rPhone = phone.upsert('errors', 'err_1', { topic: 'Lidocaine', fact: '7.0 mg/kg with adrenaline' }, t0 + 200);

    const { records, conflicts } = mergeRecordSets([rMac], [rPhone], t0 + 300);
    const winner = records.get(recordKey('errors', 'err_1'))!;
    expect((winner.data as { fact: string }).fact).toBe('7.0 mg/kg with adrenaline');
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].losingData).toEqual({ topic: 'Lidocaine', fact: '4.4 mg/kg plain' });
  });

  it('never resurrects a deleted record within 90 days', () => {
    const mac = new InMemorySyncNode('mac');
    const phone = new InMemorySyncNode('phone');
    const t0 = 1794760000000;

    const livePhone = phone.upsert('shortlist', 'c1', { name: 'KGMU' }, t0 + 100, false);
    const deletedMac = mac.upsert('shortlist', 'c1', { name: 'KGMU' }, t0 + 200, true);

    const { records } = mergeRecordSets([livePhone], [deletedMac], t0 + 300);
    const merged = records.get(recordKey('shortlist', 'c1'))!;
    expect(merged.deleted).toBe(true);
  });
});
